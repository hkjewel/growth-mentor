import "server-only";
import { randomInt } from "node:crypto";
import { check, currentViewer, db, DataError } from "./db";
import { logAudit } from "./audit";

export type Invite = { id: string; code: string; revoked: boolean; created_at: string };
export type Mentorship = {
  id: string;
  mentor_id: string;
  student_id: string;
  mentor_email: string | null;
  student_email: string | null;
  created_at: string;
};

/** Team features need a signed-in user and migration 0004. */
async function requireViewer() {
  const viewer = await currentViewer();
  if (!viewer) throw new DataError("Sign in to use teams.");
  return viewer;
}

function isMissingTable(error: { code?: string; message: string } | null) {
  return !!error && (error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist/i.test(error.message));
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function newCode() {
  return Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export type TeamOverview =
  | { available: false }
  | { available: true; invites: Invite[]; students: Mentorship[]; mentors: Mentorship[] };

export async function getTeamOverview(): Promise<TeamOverview> {
  const viewer = await requireViewer();
  const supabase = await db();
  const [inv, rel] = await Promise.all([
    supabase.from("mentor_invites").select("id, code, revoked, created_at").eq("mentor_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("mentorships").select("*").order("created_at", { ascending: true }),
  ]);
  if (isMissingTable(inv.error) || isMissingTable(rel.error)) return { available: false };
  const invites = check(inv, "load invites") as Invite[];
  const all = check(rel, "load team") as Mentorship[];
  return {
    available: true,
    invites: invites.filter((i) => !i.revoked),
    students: all.filter((m) => m.mentor_id === viewer.id),
    mentors: all.filter((m) => m.student_id === viewer.id),
  };
}

export async function createInvite(): Promise<Invite> {
  const viewer = await requireViewer();
  const supabase = await db();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("mentor_invites")
      .insert({ mentor_id: viewer.id, mentor_email: viewer.email, code: newCode() })
      .select("id, code, revoked, created_at")
      .single();
    if (!error) {
      await logAudit("team.invite_created", "mentor_invites", data.id);
      return data as Invite;
    }
    if (error.code !== "23505") check({ data, error }, "create invite code");
  }
  throw new DataError("Could not create invite code — please try again.");
}

export async function revokeInvite(id: string): Promise<void> {
  const viewer = await requireViewer();
  const supabase = await db();
  check(
    await supabase.from("mentor_invites").update({ revoked: true }).eq("id", id).eq("mentor_id", viewer.id),
    "revoke invite code",
  );
  await logAudit("team.invite_revoked", "mentor_invites", id);
}

export async function acceptInvite(code: string): Promise<Mentorship> {
  await requireViewer();
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(clean)) throw new DataError("That invite code is not valid.");
  const supabase = await db();
  const { data, error } = await supabase.rpc("accept_mentor_invite", { invite_code: clean });
  if (error) {
    if (/not valid|own team|Sign in/i.test(error.message)) throw new DataError(error.message);
    check({ data, error }, "join team");
  }
  const m = data as Mentorship;
  await logAudit("team.joined", "mentorships", m.id, { mentor: m.mentor_email });
  return m;
}

/** Either side can end a mentorship (RLS allows mentor or student to delete). */
export async function endMentorship(id: string): Promise<void> {
  const viewer = await requireViewer();
  const supabase = await db();
  const rel = check(await supabase.from("mentorships").select("*").eq("id", id).maybeSingle(), "load team") as Mentorship | null;
  if (!rel) throw new DataError("That team connection no longer exists.");
  check(await supabase.from("mentorships").delete().eq("id", id), "update team");
  await logAudit(rel.mentor_id === viewer.id ? "team.student_removed" : "team.left", "mentorships", id);
}

/** The mentorship linking the viewer (as mentor) to this student, if any. */
export async function getStudent(studentId: string): Promise<Mentorship | null> {
  const viewer = await requireViewer();
  const supabase = await db();
  const { data, error } = await supabase
    .from("mentorships")
    .select("*")
    .eq("mentor_id", viewer.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (isMissingTable(error)) return null;
  return (check({ data, error }, "load student") as Mentorship) ?? null;
}
