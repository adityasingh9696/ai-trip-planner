import { clerkMiddleware } from "@clerk/nextjs/server";
import arcjet, { shield, fixedWindow } from "@arcjet/next";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const aj = arcjet({
  key: process.env.ARCJET_KEY || "", 
  rules: [
    shield({ mode: "DRY_RUN" }),
    fixedWindow({
      mode: "LIVE",
      window: "1h",
      max: 100, 
    }),
  ],
});

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Apply Arcjet rate limiting to the generate itinerary API route
  if (req.nextUrl.pathname.startsWith('/api/generate-itinerary') && process.env.ARCJET_KEY) {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
