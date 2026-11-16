"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, LayoutDashboard, LogOut, ShoppingBag, Smartphone, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Brand } from "@/components/TopBar";

const LINKS = [
  { href: "/admin", label: "Pano", icon: LayoutDashboard },
  { href: "/admin/devices", label: "Cihazlar", icon: Smartphone },
  { href: "/admin/requests", label: "Talepler", icon: ShoppingBag },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) router.replace(user ? "/" : "/login");
  }, [user, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    api<unknown[]>("/api/requests?status=pending")
      .then((r) => setPending(r.length))
      .catch(() => {});
  }, [role, pathname]);

  if (loading || role !== "admin") return null;

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="container admin">
      <aside className="glass sidebar" aria-label="Yönetim menüsü">
        <Link href="/admin" className="sidebar__brand" aria-label="Yönetim panosu">
          <Brand sub={false} />
          <div className="dim" style={{ fontSize: 12, marginTop: 6, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Yönetim</div>
        </Link>
        <nav className="sidebar__nav">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="sidebar__link" aria-current={isActive(href) ? "page" : undefined}>
              {isActive(href) && <motion.span layoutId="side-pill" className="sidebar__pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {href === "/admin/requests" && pending > 0 && (
                <span className="sidebar__count" aria-label={`${pending} bekleyen talep`}>{pending}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar__footer stack" style={{ marginTop: "auto", ["--gap" as string]: "6px" }}>
          <Link href="/" className="sidebar__link">
            <ArrowUpRight size={19} aria-hidden="true" /> <span>Kataloğa git</span>
          </Link>
          <button
            className="sidebar__link"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
          >
            <LogOut size={19} aria-hidden="true" /> <span>Çıkış yap</span>
          </button>
          <div className="dim" style={{ fontSize: 12, padding: "8px 14px", wordBreak: "break-all" }}>{user?.email}</div>
        </div>
      </aside>

      <main id="main">
        <motion.div key={pathname} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 22 }}>
          {children}
        </motion.div>
      </main>
    </div>
  );
}
