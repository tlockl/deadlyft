"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  HistoryIcon,
  ProfileIcon,
  DumbbellIcon,
} from "@/components/icons";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/exercises", label: "Exercises", Icon: DumbbellIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // A workout detail page is reached from History, so keep that tab lit.
  if (href === "/history") {
    return pathname.startsWith("/history") || pathname.startsWith("/workout");
  }
  return pathname.startsWith(href);
}

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="ios-material fixed inset-x-0 bottom-0 z-40 border-t border-separator"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-md">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[49px] flex-col items-center justify-center gap-[3px] ${
                  active ? "text-accent" : "text-label2"
                }`}
              >
                <Icon className="h-[26px] w-[26px]" strokeWidth={active ? 2 : 1.75} />
                <span className="text-[10px] leading-none font-medium">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
