import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { assetUploadSchema, startUpload } from "@/lib/server/assets";

// Step one of an upload: record the asset and return a presigned R2 URL for the bytes.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Sign in to upload" }, { status: 401 });

    const parsed = assetUploadSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid upload" }, { status: 400 });

    const url = await startUpload(userId, parsed.data);
    if (!url) return NextResponse.json({ success: false, error: "Asset id in use" }, { status: 409 });
    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    console.error("[assets]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
