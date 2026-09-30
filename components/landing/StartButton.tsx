"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { loadZine } from "@/lib/editor/persist";
import { cn } from "@/lib/utils";

// Someone who already started a zine in this browser picks up where they left off.
export function StartButton() {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    void loadZine().then((draft) => setHasDraft(draft !== null));
  }, []);

  return (
    <Link href="/new" className={cn(buttonVariants({ size: "lg" }), "group gap-2")}>
      {hasDraft ? "Continue your zine" : "Start a zine"}
      <ArrowRight className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
    </Link>
  );
}
