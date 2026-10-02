import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminRoute, assetKey } from "@/lib/server/admin";
import { presignGet } from "@/lib/server/r2";

// A short-lived URL for any user's image or font, for the admin viewer. GET only; everyone who
// isn't an admin gets a 404 as if the route didn't exist.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/assets/[id]">) {
  try {
    const guard = await adminRoute();
    if (guard instanceof NextResponse) return guard;
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const key = await assetKey(id);
    if (!key) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { url: await presignGet(key) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[admin-assets]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
