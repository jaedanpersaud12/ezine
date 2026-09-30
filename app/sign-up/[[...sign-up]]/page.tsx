import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Link href="/" aria-label="Zine Builder home" className="flex size-9 items-center justify-center rounded-lg bg-primary font-heading text-base font-bold text-primary-foreground">
        z
      </Link>
      <SignUp />
    </main>
  );
}
