"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Clock, Package, Smartphone, Users, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, timeAgo } from "@/lib/format";
import type { PurchaseRequest } from "@/lib/types";
import { CountUp, Skeleton, StatusBadge } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";

interface Stats {
  devices: number;
  unitsInStock: number;
  soldOut: number;
  pendingRequests: number;
  approvedRequests: number;
  approvedRevenue: number;
  users: number;
}
interface Dashboard {
  stats: Stats;
  byCategory: { category: string; devices: number; stock: number }[];
  last14: { day: string; requests: number }[];
  recent: PurchaseRequest[];
}

export default function AdminDashboard() {
  const { toast } = useFeedback();
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/admin/stats").then(setData).catch((e) => toast((e as Error).message, "error"));
  }, [toast]);

  const cards = data
    ? [
        { label: "Bekleyen talep", value: data.stats.pendingRequests, foot: "Aksiyon bekliyor", icon: Clock, color: "#fbbf24", href: "/admin/requests" },
        { label: "Cihaz", value: data.stats.devices, foot: `${data.stats.soldOut} model tükendi`, icon: Smartphone, color: "#8b6cff", href: "/admin/devices" },
        { label: "Stoktaki adet", value: data.stats.unitsInStock, foot: "Satışa hazır", icon: Package, color: "#3ad6ff" },
        { label: "Onaylanan satış", value: data.stats.approvedRequests, foot: `${formatPrice(data.stats.approvedRevenue)} ₺ ciro`, icon: Wallet, color: "#4ade80" },
        { label: "Kullanıcı", value: data.stats.users, foot: "Kayıtlı personel", icon: Users, color: "#ff6b8b", href: "/admin/users" },
      ]
    : [];
  const maxDay = Math.max(1, ...(data?.last14.map((d) => d.requests) ?? [1]));
  const totalDevices = Math.max(1, data?.stats.devices ?? 1);

  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <header>
        <span className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> Canlı özet</span>
        <h1 className="display h2" style={{ marginTop: 10 }}>Pano</h1>
      </header>

      <section className="stats" aria-label="Özet istatistikler">
        {!data
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: 132, borderRadius: 26 }} />)
          : cards.map((c, i) => {
              const Inner = (
                <motion.div
                  className="stat"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 160, damping: 20, delay: i * 0.06 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="stat__glow" style={{ background: c.color }} aria-hidden="true" />
                  <div className="stat__label"><c.icon size={16} color={c.color} aria-hidden="true" />{c.label}</div>
                  <div className="stat__value"><CountUp value={c.value} /></div>
                  <div className="stat__foot">{c.foot}</div>
                </motion.div>
              );
              return c.href ? <Link key={c.label} href={c.href} aria-label={`${c.label}: ${c.value}`}>{Inner}</Link> : <div key={c.label}>{Inner}</div>;
            })}
      </section>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" }}>
        <section className="glass panel" aria-labelledby="chart-title">
          <h2 id="chart-title" className="h3" style={{ marginBottom: 4 }}>Son 14 gün</h2>
          <p className="dim" style={{ fontSize: 13, marginBottom: 20 }}>Günlük oluşturulan talep sayısı</p>
          {!data ? (
            <Skeleton style={{ height: 180 }} />
          ) : (
            <>
              <div className="bars" role="img" aria-label={`Son 14 günde toplam ${data.last14.reduce((s, d) => s + d.requests, 0)} talep`}>
                {data.last14.map((d, i) => (
                  <div key={d.day} className="bars__col" title={`${d.day}: ${d.requests} talep`}>
                    <motion.div
                      className={`bars__bar ${d.requests === 0 ? "bars__bar--empty" : ""}`}
                      style={{ height: `${Math.max(3, (d.requests / maxDay) * 100)}%` }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.2 + i * 0.03 }}
                    />
                    <span className="bars__label">{d.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="glass panel" aria-labelledby="cat-title">
          <h2 id="cat-title" className="h3" style={{ marginBottom: 20 }}>Kategoriler</h2>
          {!data ? (
            <Skeleton style={{ height: 180 }} />
          ) : data.byCategory.length === 0 ? (
            <p className="muted">Henüz cihaz eklenmedi.</p>
          ) : (
            <ul className="stack" style={{ ["--gap" as string]: "14px", listStyle: "none" }}>
              {data.byCategory.map((c, i) => (
                <li key={c.category}>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.category}</span>
                    <span className="dim mono">{c.devices} model · {c.stock} adet</span>
                  </div>
                  <div className="meter">
                    <motion.div
                      className="meter__fill"
                      style={{ background: "var(--grad-hot)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.devices / totalDevices) * 100}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.08 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass panel" aria-labelledby="recent-title">
        <div className="row" style={{ marginBottom: 18 }}>
          <h2 id="recent-title" className="h3">Son talepler</h2>
          <div className="spacer" />
          <Link href="/admin/requests" className="btn btn--ghost btn--sm">
            Tümünü gör <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {!data ? (
          <Skeleton style={{ height: 160 }} />
        ) : data.recent.length === 0 ? (
          <p className="muted"><BadgeCheck size={16} aria-hidden="true" style={{ verticalAlign: "-3px" }} /> Henüz talep yok.</p>
        ) : (
          <ul className="list" role="list">
            {data.recent.map((r) => (
              <li key={r.id} className="list-item">
                <div className="list-item__main">
                  <div className="list-item__title">{r.deviceName}</div>
                  <div className="list-item__meta"><span>{r.userEmail}</span><span>{timeAgo(r.createdAt)}</span></div>
                </div>
                <span className="mono" style={{ fontWeight: 650 }}>{formatPrice(r.devicePrice)} ₺</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
