import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/data/db";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  if (await currentViewer()) redirect(next);

  return (
    <div className="mx-auto max-w-md py-4 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Make it yours</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Sign in to keep a private vision, goals and scorecard history that only you (and mentors you invite) can see.
      </p>
      {params.error === "link" && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          That confirmation link is invalid or expired. Sign in, or create your account again to get a new link.
        </p>
      )}
      <div className="mt-6">
        <AuthForm next={next} initialMode={params.mode === "signup" ? "signup" : "signin"} />
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Just looking?{" "}
        <Link href="/" className="font-medium text-brand-700 hover:underline">
          Keep exploring the demo
        </Link>
      </p>
    </div>
  );
}
