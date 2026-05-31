import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Forward the request to the new Python FastAPI Orchestrator
    const fastApiUrl = `${process.env.BACKEND_API_URL || "http://127.0.0.1:8000"}/api/generate-trip`;
    
    const response = await fetch(fastApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error("FastAPI Backend failed to process the request");
    }

    const itineraryJson = await response.json();
    return NextResponse.json(itineraryJson);

  } catch (error: any) {
    console.error("Error generating itinerary via FastAPI:", error);
    return NextResponse.json({ error: error.message || "Failed to generate itinerary" }, { status: 500 });
  }
}
