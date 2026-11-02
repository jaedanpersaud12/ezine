import { NextResponse, type NextRequest } from "next/server";
import { readLocalBookImage } from "@/lib/server/book";

// Serves the /book reader's pictures from the developer's disk. Development only.
export async function GET(_req: NextRequest, ctx: RouteContext<"/book/images/[file]">) {
  const { file } = await ctx.params;
  const image = await readLocalBookImage(file);
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(image.body), {
    headers: { "Content-Type": image.type, "Cache-Control": "private, no-store" },
  });
}
