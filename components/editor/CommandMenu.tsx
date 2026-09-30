"use client";

import { useMemo } from "react";
import { CommandPalette, type CommandItem } from "@/components/interior/command-palette";
import { commands } from "@/lib/editor/commands";
import { useEditorStore } from "@/stores/editor";

export function CommandMenu() {
  const open = useEditorStore((s) => s.commandOpen);
  const setOpen = useEditorStore((s) => s.setCommandOpen);
  const all = useMemo(() => commands(), []);
  const items: CommandItem[] = useMemo(
    () => all.map(({ id, label, keywords, shortcut }) => ({ id, label, keywords, shortcut })),
    [all],
  );

  return (
    <CommandPalette
      open={open}
      autoFocus
      items={items}
      maxRows={8}
      placeholder="Do anything…"
      label="Commands"
      onDismiss={() => setOpen(false)}
      onSelect={(item) => {
        setOpen(false);
        all.find((c) => c.id === item.id)?.run();
      }}
    />
  );
}
