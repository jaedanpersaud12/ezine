import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-muted p-4">
      <SignIn />
    </main>
  );
}
