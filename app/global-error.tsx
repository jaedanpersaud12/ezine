"use client";

import { useEffect } from "react";
import { Geist } from "next/font/google";
import { StatusScreen } from "@/components/status/StatusScreen";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

// The root layout itself failed, so this draws its own document (and can't rely on Clerk or
// anything else the layout would have provided).
export default function GlobalError({ error, retry }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>Something went wrong · Zine Builder</title>
        <StatusScreen
          title="Something went wrong."
          message="Zine Builder couldn't start. Anything saved before it happened is still there."
        >
          <Button onClick={() => retry()}>Try again</Button>
        </StatusScreen>
      </body>
    </html>
  );
}
