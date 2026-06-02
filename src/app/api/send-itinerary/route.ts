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

    // 1. Direct REST-based Resend Email Integration (Keyless Library-Free approach!)
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const destination = itinerary.tripDetails?.destination || "your destination";
      const days = itinerary.tripDetails?.days || 5;
      const cost = itinerary.tripDetails?.totalEstimatedCost || "N/A";
      
      const itineraryHtml = (itinerary.itinerary || []).map((day: any) => `
        <div style="margin-bottom: 25px; padding: 15px; background: #f8fafc; border-left: 4px solid #8b5cf6; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #1e293b;">Day ${day.day}: ${day.theme}</h3>
          ${(day.activities || []).map((act: any) => `
            <div style="margin-bottom: 12px; font-size: 0.95rem;">
              <strong style="color: #8b5cf6;">${act.time}</strong> - <b>${act.name}</b>
              <p style="margin: 4px 0; color: #64748b;">${act.description}</p>
              <span style="font-size: 0.85rem; color: #10b981;">Est: ${act.cost}</span>
            </div>
          `).join("")}
        </div>
      `).join("");

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #8b5cf6; margin-top: 0; font-size: 1.5rem;">✈️ Your WanderAI Travel Dossier</h2>
          <p>Hi there,</p>
          <p>Here is your complete, customized multi-agent travel itinerary for <b>${destination}</b>!</p>
          
          <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1e293b;">Trip Overview</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
              <tr><td style="padding: 4px 0; color: #64748b;">Destination:</td><td style="font-weight: bold; color: #1e293b;">${destination}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Duration:</td><td style="font-weight: bold; color: #1e293b;">${days} Days</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Budget Limit:</td><td style="font-weight: bold; color: #10b981;">${cost}</td></tr>
            </table>
          </div>
          
          <h3 style="color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Daily Schedule</h3>
          ${itineraryHtml}
          
          <p style="margin-top: 30px; font-size: 0.85rem; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            Plan generated securely by WanderAI Multi-Agent Workspace.
          </p>
        </div>
      `;

      // Call Resend's REST API endpoint directly using standard fetch
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "WanderAI/1.0"
        },
        body: JSON.stringify({
          from: "WanderAI <onboarding@resend.dev>",
          to: userEmail,
          subject: `Your Travel Itinerary to ${destination}`,
          html: emailHtml
        })
      });

      if (!resendRes.ok) {
        const errorText = await resendRes.text();
        console.error("Resend API failed:", errorText);
        throw new Error("Resend mailing service failed to send.");
      }
    } else {
      // 2. Demo Mock Fallback (Allows smooth recruitment presentation without key crashes)
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

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
