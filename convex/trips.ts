import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTrip = mutation({
  args: {
    userId: v.id("users"),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    budget: v.string(),
    itineraryData: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trips", {
      userId: args.userId,
      destination: args.destination,
      startDate: args.startDate,
      endDate: args.endDate,
      budget: args.budget,
      itineraryData: args.itineraryData,
      createdAt: Date.now(),
    });
  },
});

export const getUserTrips = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trips")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
