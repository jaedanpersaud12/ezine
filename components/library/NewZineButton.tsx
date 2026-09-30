"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createZineAction } from "@/actions/zines";

export function NewZineButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function create(): void {
    startTransition(async () => {
      try {
        const result = await createZineAction();
        if (result.success && result.id) router.push(`/zines/${result.id}`);
        else console.error("Could not create zine", result.error);
      } catch (error) {
        console.error("Could not create zine", error);
      }
    });
  }

  return (
    <Button onClick={create} disabled={pending} className="gap-1.5">
      <Plus /> {pending ? "Creating…" : "New zine"}
    </Button>
  );
}
