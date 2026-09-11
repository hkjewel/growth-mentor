import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TimeZoneSync } from "@/components/TimeZoneSync";
import { TZ_COOKIE } from "@/lib/dates";

export const metadata: Metadata = {
  title: { default: "Growth Mentor", template: "%s · Growth Mentor" },
  description:
    "Anchor your growth to a 10-year vision, set goals across health, soft skills and education, and score your progress every week.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tz = (await cookies()).get(TZ_COOKIE)?.value ?? null;
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <TimeZoneSync current={tz ? decodeURIComponent(tz) : null} />
        <Sidebar />
        <div className="lg:pl-64">
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
