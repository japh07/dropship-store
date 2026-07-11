import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  billboards: defineTable({
    label: v.string(),
    imageUrl: v.string(),
  }),

  categories: defineTable({
    name: v.string(),
    billboardId: v.id("billboards"),
  }).index("by_billboard", ["billboardId"]),

  sizes: defineTable({
    name: v.string(),
    value: v.string(),
  }),

  colors: defineTable({
    name: v.string(),
    value: v.string(),
  }),

  products: defineTable({
    name: v.string(),
    price: v.string(),
    isFeatured: v.boolean(),
    isArchived: v.boolean(),
    categoryId: v.id("categories"),
    sizeId: v.id("sizes"),
    colorId: v.id("colors"),
    images: v.array(v.object({ url: v.string() })),
  })
    .index("by_category", ["categoryId"])
    .index("by_size", ["sizeId"])
    .index("by_color", ["colorId"])
    .index("by_featured", ["isFeatured"]),
});
