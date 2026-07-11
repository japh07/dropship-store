import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib";

export function serializeBillboard(billboard: Doc<"billboards">) {
  return {
    id: billboard._id,
    label: billboard.label,
    imageUrl: billboard.imageUrl,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const billboards = await ctx.db.query("billboards").order("desc").collect();
    return billboards.map(serializeBillboard);
  },
});

export const get = query({
  args: { id: v.id("billboards") },
  handler: async (ctx, { id }) => {
    const billboard = await ctx.db.get(id);
    return billboard ? serializeBillboard(billboard) : null;
  },
});

export const create = mutation({
  args: { label: v.string(), imageUrl: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("billboards", args);
  },
});

export const update = mutation({
  args: { id: v.id("billboards"), label: v.string(), imageUrl: v.string() },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("billboards") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const inUse = await ctx.db
      .query("categories")
      .withIndex("by_billboard", (q) => q.eq("billboardId", id))
      .first();
    if (inUse) {
      throw new Error("Remove all categories using this billboard first.");
    }
    await ctx.db.delete(id);
  },
});
