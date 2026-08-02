import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Agent Dashboard",
  description: "Standalone dashboard shell for the Multi-Step Research Agent.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!publishableKey) {
    return document;
  }

  return (
    <ClerkProvider signInUrl="/signin" signUpUrl="/signup" afterSignOutUrl="/signin">
      {document}
    </ClerkProvider>
  );
}
