import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib";

export function serializeSize(size: Doc<"sizes">) {
  return { id: size._id, name: size.name, value: size.value };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const sizes = await ctx.db.query("sizes").order("desc").collect();
    return sizes.map(serializeSize);
  },
});

export const get = query({
  args: { id: v.id("sizes") },
  handler: async (ctx, { id }) => {
    const size = await ctx.db.get(id);
    return size ? serializeSize(size) : null;
  },
});

export const create = mutation({
  args: { name: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("sizes", args);
  },
});

export const update = mutation({
  args: { id: v.id("sizes"), name: v.string(), value: v.string() },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("sizes") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const inUse = await ctx.db
      .query("products")
      .withIndex("by_size", (q) => q.eq("sizeId", id))
      .first();
    if (inUse) {
      throw new Error("Remove all products using this size first.");
    }
    await ctx.db.delete(id);
  },
});
