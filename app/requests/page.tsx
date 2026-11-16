"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ClipboardList, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDate, formatPrice, STATUS_LABEL, timeAgo } from "@/lib/format";
import type { PurchaseRequest } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";

const TABS = ["all", "pending", "approved", "rejected", "cancelled"] as const;

export default function MyRequests() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<PurchaseRequest[]>("/api/requests?mine=1")
      .then(setRequests)
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => setFetching(false));
  }, [user, toast]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);
  const visible = tab === "all" ? requests : requests.filter((r) => r.status === tab);

  const cancel = async (r: PurchaseRequest) => {
    const ok = await confirm({
      title: "Talep iptal edilsin mi?",
      description: `${r.deviceName} için oluşturduğun talep iptal edilecek ve cihaz tekrar stoğa eklenecek.`,
      confirmLabel: "Talebi iptal et",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api(`/api/requests/${r.id}`, { method: "PATCH", body: { status: "cancelled" } });
      setRequests((list) => list.map((x) => (x.id === r.id ? { ...x, status: "cancelled", decidedAt: new Date().toISOString() } : x)));
      toast("Talep iptal edildi.");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <TopBar />
      <main id="main" className="container page">
        <motion.header
          style={{ padding: "clamp(16px, 4vw, 48px) 0 28px" }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        >
          <span className="eyebrow">Hesabım</span>
          <h1 className="display h2" style={{ marginTop: 10 }}>Taleplerim</h1>
          <p className="lead" style={{ marginTop: 10 }}>Oluşturduğun satın alma taleplerinin durumunu buradan takip et.</p>
        </motion.header>

        <LayoutGroup id="req-tabs">
          <div className="tabs" role="tablist" aria-label="Duruma göre filtrele" style={{ marginBottom: 20 }}>
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} aria-controls="req-panel" className="tab" onClick={() => setTab(t)}>
                {tab === t && <motion.span layoutId="req-tab" className="nav__pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span>{t === "all" ? "Tümü" : STATUS_LABEL[t]}</span>
                <span className="chip__count">{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        <section id="req-panel" role="tabpanel" aria-busy={fetching}>
          {fetching ? (
            <div className="list" aria-hidden="true">
              {[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 84, borderRadius: 18 }} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="glass">
              <EmptyState icon={<ClipboardList size={32} />} title={tab === "all" ? "Henüz talebin yok" : "Bu durumda talep yok"}>
                <p className="muted">Katalogdan bir cihaz seçip tek dokunuşla talep oluşturabilirsin.</p>
                <Link href="/" className="btn btn--primary">Kataloğa göz at</Link>
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
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.04 } }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="list-item__main">
                      <div className="list-item__title">
                        {r.deviceId ? <Link href={`/device/${r.deviceId}`} style={{ textDecoration: "underline", textDecorationColor: "transparent" }}>{r.deviceName}</Link> : r.deviceName}
                      </div>
                      <div className="list-item__meta">
                        <span>{formatDate(r.createdAt)}</span>
                        {r.decidedAt && <span>Sonuç: {timeAgo(r.decidedAt)}</span>}
                      </div>
                      {r.note && (
                        <div className="list-item__meta" style={{ marginTop: 6 }}>
                          <MessageSquare size={13} aria-hidden="true" /> <span>{r.note}</span>
                        </div>
                      )}
                    </div>
                    <div className="display mono" style={{ fontSize: 20 }}>{formatPrice(r.devicePrice)} ₺</div>
                    <StatusBadge status={r.status} />
                    {r.status === "pending" && (
                      <button className="btn btn--danger btn--sm" onClick={() => cancel(r)} aria-label={`${r.deviceName} talebini iptal et`}>
                        İptal et
                      </button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
