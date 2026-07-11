import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib";
import { serializeBillboard } from "./billboards";

async function serializeCategory(ctx: QueryCtx, category: Doc<"categories">) {
  const billboard = await ctx.db.get(category.billboardId);
  return {
    id: category._id,
    name: category.name,
    billboard: billboard ? serializeBillboard(billboard) : null,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").order("desc").collect();
    return Promise.all(categories.map((c) => serializeCategory(ctx, c)));
  },
});

export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const category = await ctx.db.get(id);
    return category ? serializeCategory(ctx, category) : null;
  },
});

export const create = mutation({
  args: { name: v.string(), billboardId: v.id("billboards") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("categories", args);
  },
});

export const update = mutation({
  args: { id: v.id("categories"), name: v.string(), billboardId: v.id("billboards") },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const inUse = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", id as Id<"categories">))
      .first();
    if (inUse) {
      throw new Error("Remove all products in this category first.");
    }
    await ctx.db.delete(id);
  },
});
