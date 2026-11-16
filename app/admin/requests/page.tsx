"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Check, Inbox, MessageSquare, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatPrice, STATUS_LABEL, timeAgo } from "@/lib/format";
import type { PurchaseRequest } from "@/lib/types";
import { EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";

const TABS = ["pending", "approved", "rejected", "cancelled", "all"] as const;

export default function AdminRequests() {
  const { toast, confirm } = useFeedback();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<PurchaseRequest[]>("/api/requests")
      .then(setRequests)
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  const visible = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return requests.filter(
      (r) =>
        (tab === "all" || r.status === tab) &&
        (!term || `${r.deviceName} ${r.userEmail}`.toLocaleLowerCase("tr").includes(term))
    );
  }, [requests, tab, q]);

  const decide = async (r: PurchaseRequest, status: "approved" | "rejected") => {
    const ok = await confirm({
      title: status === "approved" ? "Talep onaylansın mı?" : "Talep reddedilsin mi?",
      description:
        status === "approved"
          ? `${r.userEmail} kullanıcısının ${r.deviceName} talebi onaylanacak.`
          : `${r.deviceName} talebi reddedilecek ve 1 adet stoğa geri eklenecek.`,
      confirmLabel: status === "approved" ? "Onayla" : "Reddet",
      tone: status === "rejected" ? "danger" : "default",
    });
    if (!ok) return;
    setBusy(r.id);
    try {
      await api(`/api/requests/${r.id}`, { method: "PATCH", body: { status } });
      setRequests((list) => list.map((x) => (x.id === r.id ? { ...x, status, decidedAt: new Date().toISOString() } : x)));
      toast(status === "approved" ? "Talep onaylandı." : "Talep reddedildi, stok geri eklendi.");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <header>
        <span className="eyebrow">Satış akışı</span>
        <h1 className="display h2" style={{ marginTop: 10 }}>Talepler</h1>
      </header>

      <div className="row" style={{ ["--gap" as string]: "12px" }}>
        <LayoutGroup id="admin-req-tabs">
          <div className="tabs" role="tablist" aria-label="Duruma göre filtrele">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} aria-controls="admin-req-panel" className="tab" onClick={() => setTab(t)}>
                {tab === t && <motion.span layoutId="admin-req-tab" className="nav__pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span>{t === "all" ? "Tümü" : STATUS_LABEL[t]}</span>
                <span className="chip__count">{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <label className="input-wrap" style={{ flex: "1 1 240px" }}>
          <span className="sr-only">Cihaz veya kullanıcı ara</span>
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" placeholder="Cihaz veya e-posta ara…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <section id="admin-req-panel" role="tabpanel" aria-busy={loading}>
        {loading ? (
          <div className="list" aria-hidden="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 84, borderRadius: 18 }} />)}</div>
        ) : visible.length === 0 ? (
          <div className="glass">
            <EmptyState icon={<Inbox size={32} />} title={tab === "pending" ? "Bekleyen talep yok" : "Talep bulunamadı"}>
              {tab === "pending" && <p className="muted">Her şey yolunda — gelen kutusu boş. 🎉</p>}
            </EmptyState>
          </div>
        ) : (
          <ul className="list" role="list">
            <AnimatePresence initial={false}>
              {visible.map((r, i) => (
                <motion.li
                  key={r.id}
                  layout
                  className="list-item"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                >
                  <div className="list-item__main">
                    <div className="list-item__title">{r.deviceName}</div>
                    <div className="list-item__meta">
                      <span>{r.userEmail}</span>
                      <span>{formatDate(r.createdAt)}</span>
                      {r.decidedAt && <span>Karar: {timeAgo(r.decidedAt)}</span>}
                    </div>
                    {r.note && (
                      <div className="list-item__meta" style={{ marginTop: 6, color: "var(--text-muted)" }}>
                        <MessageSquare size={13} aria-hidden="true" /> <span>{r.note}</span>
                      </div>
                    )}
                  </div>
                  <span className="display mono" style={{ fontSize: 19 }}>{formatPrice(r.devicePrice)} ₺</span>
                  <StatusBadge status={r.status} />
                  {r.status === "pending" && (
                    <div className="row" style={{ ["--gap" as string]: "8px" }}>
                      <button className="btn btn--success btn--sm" disabled={busy === r.id} onClick={() => decide(r, "approved")} aria-label={`${r.userEmail} — ${r.deviceName} talebini onayla`}>
                        <Check size={16} aria-hidden="true" /> Onayla
                      </button>
                      <button className="btn btn--danger btn--sm" disabled={busy === r.id} onClick={() => decide(r, "rejected")} aria-label={`${r.userEmail} — ${r.deviceName} talebini reddet`}>
                        <X size={16} aria-hidden="true" /> Reddet
                      </button>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}
