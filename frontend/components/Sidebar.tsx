"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Vendors", href: "/vendors" },
  { label: "Assets", href: "/assets" },
  { label: "Assessments", href: "/assessments" },
  { label: "Templates", href: "/assessments/templates", indent: true },
  { label: "Risks", href: "/risks" },
  { label: "Audit Logs", href: "/audit-logs" },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname.startsWith("/public")) return null;

  return (
    <aside
      className="flex flex-col min-h-screen shrink-0"
      style={{
        width: 220,
        background: "#0f1117",
        borderRight: "0.5px solid #1e2433",
      }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: "0.5px solid #1e2433" }}
      >
        <span className="text-base font-semibold tracking-tight text-text-primary">
          TPRM Hub
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center py-2 text-sm font-medium transition-colors"
              style={{
                borderRadius: 8,
                background: active ? "#1e1b4b" : "transparent",
                color: active ? "#818cf8" : "#64748b",
                paddingLeft: item.indent ? 28 : 12,
                paddingRight: 12,
                fontSize: item.indent ? 12 : undefined,
              }}
            >
              {item.indent && <span style={{ marginRight: 4, opacity: 0.5 }}>↳</span>}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
