import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib";
import { serializeSize } from "./sizes";
import { serializeColor } from "./colors";
import { serializeBillboard } from "./billboards";

async function serializeProduct(ctx: QueryCtx, product: Doc<"products">) {
  const [category, size, color] = await Promise.all([
    ctx.db.get(product.categoryId),
    ctx.db.get(product.sizeId),
    ctx.db.get(product.colorId),
  ]);
  const billboard = category ? await ctx.db.get(category.billboardId) : null;

  return {
    id: product._id,
    name: product.name,
    price: product.price,
    isFeatured: product.isFeatured,
    isArchived: product.isArchived,
    category: category
      ? {
          id: category._id,
          name: category.name,
          billboard: billboard ? serializeBillboard(billboard) : null,
        }
      : null,
    size: size ? serializeSize(size) : null,
    color: color ? serializeColor(color) : null,
    images: product.images.map((image, index) => ({
      id: `${product._id}-${index}`,
      url: image.url,
    })),
  };
}

export const list = query({
  args: {
    categoryId: v.optional(v.string()),
    colorId: v.optional(v.string()),
    sizeId: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db.query("products").order("desc").collect();

    if (!args.includeArchived) {
      products = products.filter((p) => !p.isArchived);
    }
    if (args.categoryId) {
      products = products.filter((p) => p.categoryId === (args.categoryId as Id<"categories">));
    }
    if (args.colorId) {
      products = products.filter((p) => p.colorId === (args.colorId as Id<"colors">));
    }
    if (args.sizeId) {
      products = products.filter((p) => p.sizeId === (args.sizeId as Id<"sizes">));
    }
    if (args.isFeatured !== undefined) {
      products = products.filter((p) => p.isFeatured === args.isFeatured);
    }

    return Promise.all(products.map((p) => serializeProduct(ctx, p)));
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    return product ? serializeProduct(ctx, product) : null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    price: v.string(),
    categoryId: v.id("categories"),
    sizeId: v.id("sizes"),
    colorId: v.id("colors"),
    images: v.array(v.object({ url: v.string() })),
    isFeatured: v.boolean(),
    isArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("products", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    price: v.string(),
    categoryId: v.id("categories"),
    sizeId: v.id("sizes"),
    colorId: v.id("colors"),
    images: v.array(v.object({ url: v.string() })),
    isFeatured: v.boolean(),
    isArchived: v.boolean(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
