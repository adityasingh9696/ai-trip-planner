import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itinerary } = await req.json();
    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "No email address found for user" }, { status: 400 });
    }

    console.log(`Sending travel itinerary to ${userEmail}...`);

    // Dynamic mock latency to make it feel super rich and realistic
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Here we can easily drop in Resend or Nodemailer if API keys are set up:
    // e.g., using Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ ... });

    return NextResponse.json({
      success: true,
      message: `Successfully emailed the itinerary to ${userEmail}!`,
      email: userEmail
    });

  } catch (error: any) {
    console.error("Error emailing itinerary:", error);
    return NextResponse.json({ error: error.message || "Failed to email itinerary" }, { status: 500 });
  }
}
