"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  hasSeller: boolean;
  isSuperAdmin: boolean;
};

export default function AdminBottomNav({ hasSeller, isSuperAdmin }: Props) {
  const pathname = usePathname();

  const tabs: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
    match: (p: string) => boolean;
    visible: boolean;
  }> = [
    {
      href: "/admin",
      label: "New",
      icon: <PlusIcon />,
      match: (p: string) => p === "/admin",
      visible: hasSeller,
    },
    {
      href: "/admin/orders",
      label: "Orders",
      icon: <ListIcon />,
      match: (p: string) => p.startsWith("/admin/orders"),
      visible: hasSeller,
    },
    {
      href: "/admin/waitlist",
      label: "Waitlist",
      icon: <InboxIcon />,
      match: (p: string) => p.startsWith("/admin/waitlist"),
      visible: isSuperAdmin,
    },
  ].filter((t) => t.visible);

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-paper/92 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 items-stretch">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 transition ${
                  active
                    ? "text-ink"
                    : "text-ink-3 hover:text-ink"
                }`}
              >
                <span
                  className={`relative flex h-6 w-6 items-center justify-center ${
                    active ? "text-mangrove" : ""
                  }`}
                >
                  {tab.icon}
                  {active ? (
                    <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-terracotta" />
                  ) : null}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="18" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M4 13l2-7a2 2 0 0 1 2-1.5h8a2 2 0 0 1 2 1.5l2 7M4 13h5l1 2h4l1-2h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
