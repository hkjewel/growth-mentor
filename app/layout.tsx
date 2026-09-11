import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TimeZoneSync } from "@/components/TimeZoneSync";
import { AccountBox } from "@/components/AccountBox";
import { TZ_COOKIE } from "@/lib/dates";
import { currentViewer } from "@/lib/data/db";

export const metadata: Metadata = {
  title: { default: "Growth Mentor", template: "%s · Growth Mentor" },
  description:
    "Anchor your growth to a 10-year vision, set goals across health, soft skills and education, and score your progress every week.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [tz, viewer] = await Promise.all([
    cookies().then((c) => c.get(TZ_COOKIE)?.value ?? null),
    currentViewer(),
  ]);
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <TimeZoneSync current={tz ? decodeURIComponent(tz) : null} />
        <Sidebar footer={<AccountBox viewer={viewer} />} signedIn={!!viewer} />
        <div className="lg:pl-64">
          {!viewer && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 sm:text-sm">
              <strong>Demo mode:</strong> you&apos;re editing shared sample data.{" "}
              <Link href="/login?mode=signup" className="font-semibold underline hover:no-underline">
                Create a free account
              </Link>{" "}
              to keep a private vision and scorecard history.
            </div>
          )}
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
