import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib";

export function serializeColor(color: Doc<"colors">) {
  return { id: color._id, name: color.name, value: color.value };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const colors = await ctx.db.query("colors").order("desc").collect();
    return colors.map(serializeColor);
  },
});

export const get = query({
  args: { id: v.id("colors") },
  handler: async (ctx, { id }) => {
    const color = await ctx.db.get(id);
    return color ? serializeColor(color) : null;
  },
});

export const create = mutation({
  args: { name: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("colors", args);
  },
});

export const update = mutation({
  args: { id: v.id("colors"), name: v.string(), value: v.string() },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("colors") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const inUse = await ctx.db
      .query("products")
      .withIndex("by_color", (q) => q.eq("colorId", id))
      .first();
    if (inUse) {
      throw new Error("Remove all products using this color first.");
    }
    await ctx.db.delete(id);
  },
});
