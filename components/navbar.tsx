import Link from "next/link";

import MainNav from "@/components/main-nav";
import Container from "@/components/ui/container";
import NavbarActions from "@/components/navbar-actions";
import getCategories from "@/actions/get-categories";

interface NavbarProps {
  storeName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

const Navbar = async ({ storeName, logoUrl, primaryColor }: NavbarProps) => {
  const categories = await getCategories();
  const name = storeName || "STORE";

  return (
    <div className="border-b" style={primaryColor ? { borderColor: primaryColor } : undefined}>
      <Container>
        <div className="relative px-4 sm:px-6 lg:px-8 flex h-16 items-center">
          <Link href="/" className="ml-4 flex lg:ml-0 gap-x-2 items-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={name} className="h-8 w-auto" />
            ) : null}
            <p className="font-bold text-xl" style={primaryColor ? { color: primaryColor } : undefined}>
              {name}
            </p>
          </Link>
          <MainNav data={categories} />
          <NavbarActions />
        </div>
      </Container>
    </div>
  );
};

export default Navbar;
