"use client";

// Drop-in replacement for next/link's <Link> anywhere a destination MIGHT
// be a premium tool (protectedSections.ts) — used for cross-links FROM
// otherwise-public pages INTO those tools: "back to hub" links on the
// public comparison/budget detail pages, RelatedContent's cross-links,
// ProvincialSeoTemplate's "View full Workshop"/"Rankings" links, etc.
//
// Behaves exactly like next/link's <Link> when `href` isn't protected (the
// common case — most of these destinations are public), so it's always
// safe to use here instead of <Link>. When `href` IS protected and the
// visitor is signed out, it intercepts the click and shows the same
// GuestAccessModal Sidebar.tsx/MobileNav.tsx/ProvincialQuickAccess.tsx
// already use, rather than letting proxy.ts's server-side redirect be the
// only thing standing between a guest and the login wall (which works, but
// skips the in-app modal UX every other entry point gets).

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { isProtectedPath } from "@/lib/protectedSections";
import GuestAccessModal from "@/components/GuestAccessModal";

// Forwards everything <Link> itself accepts (style, data-* attributes,
// aria-*, etc.) except href/onClick, which this component owns — so it's a
// true drop-in: swapping <Link ...props> for <ProtectedLink ...props>
// never silently drops a prop the caller was relying on.
type Props = Omit<React.ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
};

export default function ProtectedLink({ href, children, ...rest }: Props) {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isProtectedPath(href)) return;
    if (loading || user) return;
    e.preventDefault();
    setModalOpen(true);
  }

  return (
    <>
      <Link href={href} onClick={handleClick} {...rest}>
        {children}
      </Link>
      <GuestAccessModal open={modalOpen} onClose={() => setModalOpen(false)} destination={href} />
    </>
  );
}
