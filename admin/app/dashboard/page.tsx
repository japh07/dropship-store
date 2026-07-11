import Link from 'next/link';

const sections = [
  { href: '/dashboard/billboards', label: 'Billboards', description: 'Big banners shown on the storefront home and category pages.' },
  { href: '/dashboard/categories', label: 'Categories', description: 'Product categories, each attached to a billboard.' },
  { href: '/dashboard/sizes', label: 'Sizes', description: 'Size options products can be tagged with.' },
  { href: '/dashboard/colors', label: 'Colors', description: 'Color options products can be tagged with.' },
  { href: '/dashboard/products', label: 'Products', description: 'Catalog items shown in the storefront.' },
];

export default function DashboardHomePage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="rounded-lg border p-4 hover:border-black"
        >
          <h2 className="font-semibold">{section.label}</h2>
          <p className="mt-1 text-sm text-neutral-500">{section.description}</p>
        </Link>
      ))}
    </div>
  );
}
