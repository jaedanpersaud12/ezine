import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { authEnabled } from "@/lib/auth";

// Optimistic gate only: pages and route handlers still check auth() themselves.
// "/" stays public: signed out it's the local, on-device editor.
const isPrivate = createRouteMatcher(["/zines(.*)"]);

export default authEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (isPrivate(req)) await auth.protect();
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|glb|gltf|hdr)).*)",
    "/(api|trpc)(.*)",
  ],
};
