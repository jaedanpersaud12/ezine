import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { downloadUrl } from "@/lib/server/assets";

// Returns a short-lived R2 URL rather than redirecting: a same-origin request that redirects
// cross-origin sends `Origin: null`, which R2's CORS rules would reject.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/assets/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;

    const url = await downloadUrl(userId, id);
    if (!url) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { url } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[assets]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
