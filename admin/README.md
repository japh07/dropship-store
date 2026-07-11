# Dropship Admin

Admin/CMS backend for the [dropship-store](../) storefront, built with:

- **Next.js 16** (App Router) — dashboard UI
- **Convex** — database, server functions, and the public HTTP API the storefront reads from
- **WorkOS AuthKit** — admin sign-in / session management

Everything the storefront's `actions/*.tsx` fetchers expect (`/categories`, `/categories/:id`,
`/colors`, `/sizes`, `/products`, `/products/:id`, `/billboards/:id`) is served by
[`convex/http.ts`](./convex/http.ts), matching the exact JSON shapes in
[`../types.ts`](../types.ts). Point the storefront's `NEXT_PUBLIC_API_URL` at your Convex HTTP
Actions URL (see step 5) once this is running.

## Prerequisites

You'll need your own accounts for:

- [Convex](https://convex.dev) (free tier is fine)
- [WorkOS](https://workos.com) (free tier is fine — this uses AuthKit / User Management)

Both require an interactive browser login, so the steps below must be run from **your own
machine's terminal**, not from a headless/remote session — `npx convex dev` opens a browser tab
to authenticate, which won't work in a container that isn't running on your local network.

## Setup

1. **Install dependencies**

   ```bash
   cd admin
   npm install
   ```

2. **Create a WorkOS account and AuthKit app**
   - Sign up at [dashboard.workos.com](https://dashboard.workos.com)
   - Enable **User Management** (AuthKit) for your project if not already on
   - Under **Redirects**, note this down — you'll fill in the exact URLs in step 4 once you know
     your local port (default `http://localhost:3000`)
   - Copy your **Client ID** and **API Key** (Secret) from the dashboard

3. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in:
   - `WORKOS_CLIENT_ID` — from the WorkOS dashboard
   - `WORKOS_API_KEY` — from the WorkOS dashboard
   - `WORKOS_COOKIE_PASSWORD` — any random string ≥32 characters (e.g. `openssl rand -base64 24`)
   - `NEXT_PUBLIC_WORKOS_REDIRECT_URI` — `http://localhost:3000/callback` for local dev

4. **In the WorkOS dashboard**, under **Redirects**:
   - Add `http://localhost:3000/callback` as a **Redirect URI**
   - Set the **Sign-in endpoint** to `http://localhost:3000/sign-in`
   - Set a default **Logout URI** (e.g. `http://localhost:3000`) so `signOut()` works

5. **Set up Convex**

   ```bash
   npx convex dev
   ```

   This opens a browser to log in, creates/links a Convex project, deploys the functions in
   `convex/`, and writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local` automatically. Leave it
   running — it watches `convex/` for changes.

   Then, in a **separate terminal**, wire up WorkOS as the auth provider:

   ```bash
   npx convex env set WORKOS_CLIENT_ID <your-client-id>
   ```

   (`convex/auth.config.ts` in this repo already contains the WorkOS `customJwt` provider config —
   you only need to set the `WORKOS_CLIENT_ID` environment variable on your Convex deployment for
   it to take effect.)

   Once `npx convex dev` is running, your public HTTP API lives at your deployment's
   `.convex.site` URL, e.g. `https://happy-animal-123.convex.site`. Run `npx convex dashboard` or
   check the terminal output from `npx convex dev` to find it.

6. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign in, and start adding billboards,
   categories, sizes, colors, and products.

7. **Connect the storefront**

   In `../` (the `dropship-store` root), set in its `.env`:

   ```
   NEXT_PUBLIC_API_URL=https://<your-deployment>.convex.site
   ```

   The storefront's data fetchers already handle a missing/unreachable API gracefully (see the
   crash-fix in PR #1), so once this points at a real deployment with data in it, the storefront
   will render real content instead of "No results found."

## Notes on this scaffold

- I (Claude) could not complete steps 2 and 5 myself — both require an interactive browser login
  tied to your personal account, which isn't possible from this remote session. Everything else
  (schema, CRUD functions, HTTP API, auth wiring, dashboard UI) is written and has been verified
  with `tsc --noEmit`, `eslint`, and `next build` against stub Convex types. The real
  `convex/_generated/` types will be created automatically the first time you run `npx convex dev`
  — nothing further needs to change for that.
- Mutations are gated with `requireAdmin()` (`convex/lib.ts`), which checks
  `ctx.auth.getUserIdentity()` — only signed-in WorkOS users can create/edit/delete. Reads
  (queries and the public HTTP API) are open, matching the storefront's public-catalog use case.
- Deleting a billboard/category/size/color that's still referenced by a category/product is
  blocked with an error, to avoid orphaned references.
