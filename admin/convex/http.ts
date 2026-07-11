import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function idFromPath(request: Request) {
  const { pathname } = new URL(request.url);
  return decodeURIComponent(pathname.split("/").filter(Boolean).pop() ?? "");
}

// GET /billboards/:id
http.route({
  pathPrefix: "/billboards/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const id = idFromPath(request) as Id<"billboards">;
    const billboard = await ctx.runQuery(api.billboards.get, { id });
    if (!billboard) return json({ error: "Not found" }, 404);
    return json(billboard);
  }),
});

// GET /categories
http.route({
  path: "/categories",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const categories = await ctx.runQuery(api.categories.list, {});
    return json(categories);
  }),
});

// GET /categories/:id
http.route({
  pathPrefix: "/categories/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const id = idFromPath(request) as Id<"categories">;
    const category = await ctx.runQuery(api.categories.get, { id });
    if (!category) return json({ error: "Not found" }, 404);
    return json(category);
  }),
});

// GET /colors
http.route({
  path: "/colors",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const colors = await ctx.runQuery(api.colors.list, {});
    return json(colors);
  }),
});

// GET /sizes
http.route({
  path: "/sizes",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const sizes = await ctx.runQuery(api.sizes.list, {});
    return json(sizes);
  }),
});

// GET /products?categoryId=&colorId=&sizeId=&isFeatured=
http.route({
  path: "/products",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const params = new URL(request.url).searchParams;
    const isFeaturedParam = params.get("isFeatured");

    const products = await ctx.runQuery(api.products.list, {
      categoryId: params.get("categoryId") ?? undefined,
      colorId: params.get("colorId") ?? undefined,
      sizeId: params.get("sizeId") ?? undefined,
      isFeatured: isFeaturedParam === null ? undefined : isFeaturedParam === "true",
    });
    return json(products);
  }),
});

// GET /products/:id
http.route({
  pathPrefix: "/products/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const id = idFromPath(request) as Id<"products">;
    const product = await ctx.runQuery(api.products.get, { id });
    if (!product) return json({ error: "Not found" }, 404);
    return json(product);
  }),
});

export default http;
