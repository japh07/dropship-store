import { headers } from "next/headers";

import getBillboard from "@/actions/get-billboard";
import getProducts from "@/actions/get-products";
import ProductList from "@/components/product-list";
import Billboard from "@/components/ui/billboard";
import Container from "@/components/ui/container";
import { resolveStorefront, Storefront } from "@/lib/tenant";
import { Billboard as BillboardType } from "@/types";

export const revalidate = 0;

// A billboard is optional per-category decoration (unlike getCategory/getProduct,
// which 404 when missing) — a missing billboard should not fail the whole home
// page, so we fall back to an empty placeholder mirroring mapCategory's pattern.
const EMPTY_BILLBOARD: BillboardType = { id: "", label: "", imageUrl: "" };

const TEMPLATE_HERO: Record<Storefront["template"], { heading: string; accentClass: string }> = {
  general: { heading: "Discover great deals, curated for you", accentClass: "text-gray-900" },
  liquor: { heading: "Premium spirits, delivered to your door", accentClass: "text-amber-800" },
  electronics: { heading: "The latest tech, right here", accentClass: "text-blue-800" },
};

const HomePage = async () => {
  const host = headers().get("host") || "";
  const storefront = await resolveStorefront(host);

  const products = await getProducts({ isFeatured: true });
  const billboard = (await getBillboard("778f48bb-8836-4fe3-82d6-fc8d4c66ffa3")) ?? EMPTY_BILLBOARD;

  const template = storefront?.template ?? "general";
  const hero = TEMPLATE_HERO[template] ?? TEMPLATE_HERO.general;

  return (
    <Container>
      <div className="space-y-10 pb-10">
        {storefront?.banner_url ? (
          <div
            className="mx-4 mt-4 sm:mx-6 lg:mx-8 rounded-xl relative aspect-square md:aspect-[2.4/1] overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url(${storefront.banner_url})` }}
          >
            <div className="h-full w-full flex flex-col justify-center items-center text-center gap-y-4 px-4">
              {storefront.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storefront.logo_url} alt={storefront.store_name} className="h-12 w-auto" />
              ) : null}
              <div className={`font-bold text-3xl sm:text-5xl lg:text-6xl max-w-xl bg-white/85 rounded-lg px-4 py-2 ${hero.accentClass}`}>
                {storefront.store_name}
              </div>
              <p className={`text-lg sm:text-xl bg-white/85 rounded-lg px-4 py-1 ${hero.accentClass}`}>{hero.heading}</p>
            </div>
          </div>
        ) : (
          <Billboard data={billboard} />
        )}
        <div className="flex flex-col gap-y-8 px-4 sm:px-6 lg:px-8">
          <ProductList title="Featured Products" items={products} />
        </div>
      </div>
    </Container>
  )
};

export default HomePage;
