"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { createZine, deleteZine } from "@/lib/server/zines";

export async function createZineAction(): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Sign in first" };
    const id = await createZine(userId);
    revalidatePath("/");
    return { success: true, id };
  } catch (error) {
    console.error("[actions/zines]", error);
    return { success: false, error: "Could not create a zine" };
  }
}

export async function deleteZineAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Sign in first" };
    const deleted = await deleteZine(userId, id);
    if (!deleted) return { success: false, error: "Zine not found" };
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[actions/zines]", error);
    return { success: false, error: "Could not delete the zine" };
  }
}
