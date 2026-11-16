"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Brand } from "@/components/TopBar";

const WORDS = ["iPhone", "MacBook", "iPad", "Apple Watch", "AirPods"];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: "inline-grid", verticalAlign: "bottom" }}>
      <motion.span
        key={WORDS[i]}
        initial={{ y: "60%", opacity: 0, filter: "blur(8px)" }}
        animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="gradient-text"
        style={{ gridArea: "1 / 1", paddingBottom: "0.08em" }}
      >
        {WORDS[i]}
      </motion.span>
    </span>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, login } = useAuth();

  const next = (() => {
    const n = params.get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
  })();

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [user, loading, router, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith("@artitroy.com") && normalized !== "mthnay@outlook.com") {
      setError("Sadece @artitroy.com e-posta adresleri giriş yapabilir.");
      return;
    }
    setSubmitting(true);
    try {
      await login(normalized, password);
      router.replace(next);
    } catch (err) {
      setError((err as Error).message || "Giriş yapılamadı.");
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="glass glow-border auth__card"
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.15 }}
    >
      <div className="stack" style={{ ["--gap" as string]: "6px", marginBottom: 28 }}>
        <h2 className="display h2">Hoş geldin</h2>
        <p className="muted">Kurumsal hesabınla giriş yap.</p>
      </div>

      <form className="stack" style={{ ["--gap" as string]: "18px" }} onSubmit={handleLogin} noValidate>
        <label className="field">
          <span className="field__label">E-posta</span>
          <span className="input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input
              className="input"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="ad.soyad@artitroy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              required
              autoFocus
            />
          </span>
        </label>

        <label className="field">
          <span className="field__label">Şifre</span>
          <span className="input-wrap">
            <Lock size={18} aria-hidden="true" />
            <input
              className="input"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              required
              style={{ paddingRight: 48 }}
            />
            <button
              type="button"
              className="input-wrap__action"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
              aria-pressed={show}
            >
              {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </span>
          {caps && <span className="field__hint" role="status">Caps Lock açık.</span>}
        </label>

        {error && (
          <motion.p
            id="login-error"
            role="alert"
            className="field__error"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
            transition={{ duration: 0.4 }}
          >
            {error}
          </motion.p>
        )}

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting || !email || !password}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" /> Giriş yapılıyor…
            </>
          ) : (
            <>
              Giriş yap <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="dim" style={{ fontSize: 13, marginTop: 22, textAlign: "center" }}>
        Hesabın yok mu? Yöneticinden hesap açmasını iste.
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  const hero = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 120, damping: 20 } },
  };

  return (
    <main id="main" className="auth">
      <section className="auth__hero" aria-labelledby="hero-title">
        <Brand />

        <motion.div variants={hero} initial="hidden" animate="show" className="stack" style={{ ["--gap" as string]: "24px", margin: "48px 0" }}>
          <motion.span variants={item} className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" /> Personel ayrıcalığı
          </motion.span>
          <motion.h1 variants={item} id="hero-title" className="display h1">
            Teşhirden çıkan
            <br />
            <RotatingWord />
            <br />
            senin olsun.
          </motion.h1>
          <motion.p variants={item} className="lead">
            Demo ve teşhir cihazlarını personele özel fiyatlarla incele, tek dokunuşla talep et, süreci anlık takip et.
          </motion.p>
        </motion.div>

        <div className="auth__ticker" aria-hidden="true">
          {["Kondisyon garantili", "Pil sağlığı şeffaf", "Anında talep"].map((t) => (
            <span key={t} className="badge">{t}</span>
          ))}
        </div>

        <motion.div
          className="floaty"
          aria-hidden="true"
          style={{ width: 120, height: 120, right: "8%", top: "16%" }}
          animate={{ y: [0, -18, 0], rotate: [8, 14, 8] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="floaty"
          aria-hidden="true"
          style={{ width: 70, height: 70, right: "26%", bottom: "18%", borderRadius: 20 }}
          animate={{ y: [0, 14, 0], rotate: [-10, -2, -10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </section>

      <section className="auth__form-side" aria-label="Giriş formu">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
