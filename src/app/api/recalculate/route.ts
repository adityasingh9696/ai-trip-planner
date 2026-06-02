import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export const maxDuration = 60; // Set Vercel serverless timeout limit to 60 seconds

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Forward the request to Python FastAPI Recalculator
    const fastApiUrl = `${process.env.BACKEND_API_URL || "http://127.0.0.1:8000"}/api/recalculate-trip`;
    
    const response = await fetch(fastApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error("FastAPI Backend failed to process recalculation");
    }

    const updatedJson = await response.json();
    return NextResponse.json(updatedJson);

  } catch (error: any) {
    console.error("Error recalculating itinerary:", error);
    return NextResponse.json({ error: error.message || "Failed to recalculate itinerary" }, { status: 500 });
  }
}
