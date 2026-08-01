import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Agent Dashboard",
  description: "Standalone dashboard shell for the Multi-Step Research Agent.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ClerkProvider signInUrl="/signin" signUpUrl="/signup" afterSignOutUrl="/signin">
      <html lang="en">
      <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
