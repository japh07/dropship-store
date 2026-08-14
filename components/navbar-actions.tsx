"use client";

import { useEffect, useState } from "react";

// Cart/checkout is out of scope for browsing-only v1.
// The cart icon/link below is intentionally hidden; the underlying cart
// store (useCart) and /cart route remain in place, unused, for a future
// checkout sub-project.

const NavbarActions = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="ml-auto flex items-center gap-x-4">
    </div>
  );
}
 
export default NavbarActions;