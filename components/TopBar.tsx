"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, KeyRound, LayoutGrid, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/format";
import { api } from "@/lib/api";
import { Modal, useFeedback } from "./Feedback";

export function Brand({ sub = true }: { sub?: boolean }) {
  return (
    <span className="brand">
      <span className="brand__mark" aria-hidden="true">T</span>
      <span>
        Troy <span className="brand__sub">{sub ? "Demo" : ""}</span>
      </span>
    </span>
  );
}

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }> };

function NavLinks({ id, links, isActive }: { id: string; links: NavItem[]; isActive: (href: string) => boolean }) {
  return (
    <>
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="nav__link" aria-current={isActive(href) ? "page" : undefined}>
          {isActive(href) && (
            <motion.span layoutId={`nav-pill-${id}`} className="nav__pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
          )}
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </>
  );
}

export default function TopBar() {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        (menuRef.current?.querySelector("[aria-haspopup]") as HTMLElement | null)?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const links: NavItem[] = [
    { href: "/", label: "Katalog", icon: LayoutGrid },
    { href: "/requests", label: "Taleplerim", icon: ClipboardList },
    ...(role === "admin" ? [{ href: "/admin", label: "Yönetim", icon: ShieldCheck }] : []),
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/device") : pathname.startsWith(href));

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <header className="topbar" data-scrolled={scrolled}>
        <div className="container topbar__inner">
          <Link href="/" aria-label="Troy Demo — ana sayfa">
            <Brand />
          </Link>
          <div className="spacer" />
          <nav className="nav" aria-label="Ana menü">
            <NavLinks id="top" links={links} isActive={isActive} />
          </nav>
          {user && (
            <div className="menu" ref={menuRef}>
              <button
                className="avatar"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Hesap menüsü: ${user.email}`}
                onClick={() => setMenuOpen((o) => !o)}
              >
                {initials(user.email, user.fullName)}
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    className="menu__panel"
                    role="menu"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    style={{ transformOrigin: "top right" }}
                  >
                    <div className="menu__header">
                      <div style={{ fontWeight: 650 }}>{user.fullName || user.email.split("@")[0]}</div>
                      <div className="dim" style={{ fontSize: 13, wordBreak: "break-all" }}>{user.email}</div>
                      {role === "admin" && <span className="badge badge--admin" style={{ marginTop: 8 }}>Yönetici</span>}
                    </div>
                    <button role="menuitem" className="menu__item" onClick={() => { setMenuOpen(false); setPwOpen(true); }} autoFocus>
                      <KeyRound size={17} aria-hidden="true" /> Şifremi değiştir
                    </button>
                    <button role="menuitem" className="menu__item menu__item--danger" onClick={handleLogout}>
                      <LogOut size={17} aria-hidden="true" /> Çıkış yap
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Alt menü">
        <NavLinks id="bottom" links={links} isActive={isActive} />
      </nav>

      <PasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}

function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useFeedback();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setCurrent(""); setNext(""); setAgain(""); setError("");
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 8) return setError("Yeni şifre en az 8 karakter olmalı.");
    if (next !== again) return setError("Yeni şifreler eşleşmiyor.");
    setBusy(true);
    try {
      await api("/api/auth/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      toast("Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.");
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Şifremi değiştir">
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">Mevcut şifre</span>
          <input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field__label">Yeni şifre</span>
          <input className="input" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-hint" required />
          <span id="pw-hint" className="field__hint">En az 8 karakter.</span>
        </label>
        <label className="field">
          <span className="field__label">Yeni şifre (tekrar)</span>
          <input className="input" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
        </label>
        {error && <p className="field__error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" className="btn btn--ghost" onClick={close}>Vazgeç</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
