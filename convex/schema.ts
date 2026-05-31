import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    subscriptionTier: v.string(), // "Free" or "Pro"
  }).index("by_clerkId", ["clerkId"]),
  
  trips: defineTable({
    userId: v.id("users"),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    budget: v.string(),
    itineraryData: v.any(), // JSON blob from AI
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
