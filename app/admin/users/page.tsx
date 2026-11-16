"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Search, ShieldCheck, ShieldOff, Trash2, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDate, initials, timeAgo } from "@/lib/format";
import type { UserRow } from "@/lib/types";
import { EmptyState, Skeleton } from "@/components/ui";
import { Modal, useFeedback } from "@/components/Feedback";

export default function UsersManagement() {
  const { user: me } = useAuth();
  const { toast, confirm } = useFeedback();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [resetPw, setResetPw] = useState("");

  useEffect(() => {
    api<UserRow[]>("/api/users")
      .then(setUsers)
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const visible = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return term ? users.filter((u) => `${u.email} ${u.fullName}`.toLocaleLowerCase("tr").includes(term)) : users;
  }, [users, q]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return setFormError("Geçerli bir e-posta adresi girin.");
    }
    if (password.length < 8) return setFormError("Şifre en az 8 karakter olmalı.");
    setSaving(true);
    try {
      const created = await api<UserRow>("/api/users", { method: "POST", body: { email: normalized, password, role, fullName } });
      setUsers((list) => [created, ...list]);
      toast(`${created.email} eklendi.`);
      setCreateOpen(false);
      setEmail(""); setFullName(""); setPassword(""); setRole("user");
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const patch = async (u: UserRow, body: Record<string, unknown>, success: string) => {
    try {
      const updated = await api<UserRow>(`/api/users/${u.id}`, { method: "PATCH", body });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      toast(success);
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    }
  };

  const toggleRole = async (u: UserRow) => {
    const toAdmin = u.role !== "admin";
    const ok = await confirm({
      title: toAdmin ? "Yönetici yapılsın mı?" : "Yönetici yetkisi kaldırılsın mı?",
      description: toAdmin ? `${u.email} tüm cihaz, talep ve kullanıcıları yönetebilecek.` : `${u.email} standart personel hesabına dönüşecek.`,
      confirmLabel: toAdmin ? "Yönetici yap" : "Yetkiyi kaldır",
      tone: toAdmin ? "default" : "danger",
    });
    if (ok) await patch(u, { role: toAdmin ? "admin" : "user" }, "Rol güncellendi.");
  };

  const remove = async (u: UserRow) => {
    const ok = await confirm({
      title: "Kullanıcı silinsin mi?",
      description: `${u.email} ve bu kullanıcıya ait tüm talepler kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: "Kalıcı olarak sil",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api(`/api/users/${u.id}`, { method: "DELETE" });
      setUsers((list) => list.filter((x) => x.id !== u.id));
      toast("Kullanıcı silindi.");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    if (resetPw.length < 8) return toast("Şifre en az 8 karakter olmalı.", "error");
    if (await patch(resetFor, { password: resetPw }, "Şifre sıfırlandı; kullanıcının açık oturumları kapatıldı.")) {
      setResetFor(null);
      setResetPw("");
    }
  };

  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <header className="row">
        <div>
          <span className="eyebrow">Ekip</span>
          <h1 className="display h2" style={{ marginTop: 10 }}>Kullanıcılar</h1>
        </div>
        <div className="spacer" />
        <button className="btn btn--primary" onClick={() => { setFormError(""); setCreateOpen(true); }}>
          <UserPlus size={18} aria-hidden="true" /> Kullanıcı ekle
        </button>
      </header>

      <label className="input-wrap">
        <span className="sr-only">Kullanıcı ara</span>
        <Search size={18} aria-hidden="true" />
        <input className="input" type="search" placeholder="Ad veya e-posta ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {loading ? (
        <div className="list" aria-hidden="true">{[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 76, borderRadius: 18 }} />)}</div>
      ) : visible.length === 0 ? (
        <div className="glass"><EmptyState icon={<Users size={32} />} title="Kullanıcı bulunamadı" /></div>
      ) : (
        <ul className="list" role="list">
          <AnimatePresence initial={false}>
            {visible.map((u, i) => {
              const isMe = u.id === me?.id;
              return (
                <motion.li
                  key={u.id}
                  layout
                  className="list-item"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}
                  exit={{ opacity: 0, x: -30 }}
                >
                  <span className="avatar" aria-hidden="true">{initials(u.email, u.fullName)}</span>
                  <div className="list-item__main">
                    <div className="list-item__title">
                      {u.fullName || u.email.split("@")[0]} {isMe && <span className="dim" style={{ fontWeight: 500 }}>(siz)</span>}
                    </div>
                    <div className="list-item__meta">
                      <span>{u.email}</span>
                      <span>Katılım: {formatDate(u.createdAt)}</span>
                      <span>Son giriş: {timeAgo(u.lastLoginAt)}</span>
                    </div>
                  </div>
                  <span className={`badge ${u.role === "admin" ? "badge--admin" : ""}`}>{u.role === "admin" ? "Yönetici" : "Personel"}</span>
                  <div className="row" style={{ ["--gap" as string]: "6px" }}>
                    <button className="btn btn--ghost btn--icon btn--sm" onClick={() => toggleRole(u)} disabled={isMe} aria-label={u.role === "admin" ? `${u.email} yönetici yetkisini kaldır` : `${u.email} yönetici yap`} title={u.role === "admin" ? "Yetkiyi kaldır" : "Yönetici yap"}>
                      {u.role === "admin" ? <ShieldOff size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                    </button>
                    <button className="btn btn--ghost btn--icon btn--sm" onClick={() => { setResetPw(""); setResetFor(u); }} aria-label={`${u.email} şifresini sıfırla`} title="Şifre sıfırla">
                      <KeyRound size={16} aria-hidden="true" />
                    </button>
                    <button className="btn btn--danger btn--icon btn--sm" onClick={() => remove(u)} disabled={isMe} aria-label={`${u.email} sil`} title="Sil">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Kullanıcı ekle">
        <form className="stack" onSubmit={create} noValidate>
          <label className="field">
            <span className="field__label">Ad soyad</span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" maxLength={80} />
          </label>
          <label className="field">
            <span className="field__label">E-posta</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad.soyad@sirket.com" autoComplete="off" required />
          </label>
          <label className="field">
            <span className="field__label">Geçici şifre</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required aria-describedby="new-pw-hint" />
            <span id="new-pw-hint" className="field__hint">En az 8 karakter. Kullanıcı ilk girişten sonra değiştirebilir.</span>
          </label>
          <fieldset className="field" style={{ border: 0 }}>
            <legend className="field__label" style={{ marginBottom: 8 }}>Rol</legend>
            <div className="row" style={{ ["--gap" as string]: "6px" }}>
              {(["user", "admin"] as const).map((r) => (
                <button key={r} type="button" className="chip" aria-pressed={role === r} onClick={() => setRole(r)} style={{ flex: 1 }}>
                  {role === r && <span className="chip__bg" />}
                  <span className="chip__label">{r === "admin" ? "Yönetici" : "Personel"}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {formError && <p className="field__error" role="alert">{formError}</p>}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setCreateOpen(false)}>Vazgeç</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Ekleniyor…" : "Kullanıcıyı ekle"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetFor} onClose={() => setResetFor(null)} title="Şifre sıfırla">
        <form className="stack" onSubmit={submitReset} noValidate>
          <p className="muted">{resetFor?.email} için yeni bir şifre belirleyin. Kullanıcının açık oturumları kapatılır.</p>
          <label className="field">
            <span className="field__label">Yeni şifre</span>
            <input className="input" type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setResetFor(null)}>Vazgeç</button>
            <button type="submit" className="btn btn--primary">Şifreyi sıfırla</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
