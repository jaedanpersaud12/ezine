import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-muted p-4">
      <SignUp />
    </main>
  );
}
