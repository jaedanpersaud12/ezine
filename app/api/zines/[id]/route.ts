import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { zineSchema } from "@/lib/zine/schema";
import { saveZine } from "@/lib/server/zines";

// Autosave target: the editor PUTs the whole document here after each burst of edits.
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/zines/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Sign in to save" }, { status: 401 });
    const { id } = await ctx.params;

    const parsed = zineSchema.safeParse(await req.json());
    if (!parsed.success || parsed.data.id !== id) {
      return NextResponse.json({ success: false, error: "Invalid zine" }, { status: 400 });
    }
    const saved = await saveZine(userId, parsed.data);
    if (!saved) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[zines]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
