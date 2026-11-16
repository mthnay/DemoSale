"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { PackageSearch, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/format";
import type { Device } from "@/lib/types";
import TopBar from "@/components/TopBar";
import DeviceCard from "@/components/DeviceCard";
import { CountUp, EmptyState, Skeleton } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";

type Sort = "new" | "price-asc" | "price-desc" | "battery";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useFeedback();
  const [devices, setDevices] = useState<Device[]>([]);
  const [fetching, setFetching] = useState(true);
  const [category, setCategory] = useState("Tümü");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [inStock, setInStock] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<Device[]>("/api/devices")
      .then(setDevices)
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => setFetching(false));
  }, [user, toast]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { Tümü: devices.length };
    for (const d of devices) m[d.category] = (m[d.category] ?? 0) + 1;
    return m;
  }, [devices]);

  const visible = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    const list = devices.filter(
      (d) =>
        (category === "Tümü" || d.category === category) &&
        (!inStock || d.stock > 0) &&
        (!term || `${d.name} ${d.description}`.toLocaleLowerCase("tr").includes(term))
    );
    const sorters: Record<Sort, (a: Device, b: Device) => number> = {
      new: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      battery: (a, b) => b.batteryHealth - a.batteryHealth,
    };
    return list.sort(sorters[sort]);
  }, [devices, category, q, sort, inStock]);

  const totalStock = devices.reduce((s, d) => s + d.stock, 0);
  const minPrice = devices.length ? Math.min(...devices.map((d) => d.price)) : 0;

  if (loading || !user) return null;

  return (
    <>
      <TopBar />
      <main id="main" className="container page">
        {/* Hero */}
        <section aria-labelledby="catalog-title" style={{ padding: "clamp(24px, 6vw, 72px) 0 clamp(28px, 4vw, 48px)" }}>
          <motion.span className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="eyebrow__dot" aria-hidden="true" /> Stok canlı güncelleniyor
          </motion.span>
          <motion.h1
            id="catalog-title"
            className="display h1"
            style={{ marginTop: 18, maxWidth: "14ch" }}
            initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
          >
            Merhaba{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}. <span className="gradient-text">Sıradaki cihazın</span> burada.
          </motion.h1>

          <motion.dl
            className="row"
            style={{ ["--gap" as string]: "clamp(20px, 5vw, 56px)", marginTop: 36 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {[
              { label: "Cihaz", value: devices.length },
              { label: "Stoktaki adet", value: totalStock },
              { label: "Başlangıç fiyatı (₺)", value: minPrice },
            ].map((s) => (
              <div key={s.label}>
                <dt className="dim" style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</dt>
                <dd className="display mono" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
                  {fetching ? "—" : <CountUp value={s.value} />}
                </dd>
              </div>
            ))}
          </motion.dl>
        </section>

        {/* Filtreler */}
        <section aria-label="Filtreler" className="stack" style={{ ["--gap" as string]: "16px", marginBottom: 28 }}>
          <div className="row" style={{ ["--gap" as string]: "12px" }}>
            <label className="input-wrap" style={{ flex: "1 1 280px" }}>
              <span className="sr-only">Cihaz ara</span>
              <Search size={18} aria-hidden="true" />
              <input className="input" type="search" placeholder="Model, renk, kapasite ara…" value={q} onChange={(e) => setQ(e.target.value)} />
              {q && (
                <button type="button" className="input-wrap__action" onClick={() => setQ("")} aria-label="Aramayı temizle">
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
            <label style={{ flex: "0 1 220px" }}>
              <span className="sr-only">Sıralama</span>
              <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="new">En yeni</option>
                <option value="price-asc">Fiyat: artan</option>
                <option value="price-desc">Fiyat: azalan</option>
                <option value="battery">Pil sağlığı</option>
              </select>
            </label>
            <label className="switch">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              <span className="switch__track" aria-hidden="true" />
              Sadece stoktakiler
            </label>
          </div>

          <LayoutGroup id="cats">
            <div className="chips" role="group" aria-label="Kategori">
              {["Tümü", ...CATEGORIES].map((c) => {
                const active = category === c;
                return (
                  <button key={c} className="chip" aria-pressed={active} onClick={() => setCategory(c)}>
                    {active && <motion.span layoutId="chip-bg" className="chip__bg" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                    <span className="chip__label">
                      {c}
                      <span className="chip__count">{counts[c] ?? 0}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </section>

        <p className="sr-only" role="status" aria-live="polite">
          {fetching ? "Cihazlar yükleniyor" : `${visible.length} cihaz listeleniyor`}
        </p>

        {fetching ? (
          <div className="grid-cards" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <Skeleton style={{ aspectRatio: "4/3", borderRadius: 0 }} />
                <div className="card__body">
                  <Skeleton style={{ height: 20, width: "70%" }} />
                  <Skeleton style={{ height: 30, width: "40%" }} />
                  <Skeleton style={{ height: 54 }} />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="glass">
            <EmptyState icon={<PackageSearch size={32} />} title="Eşleşen cihaz yok">
              <p className="muted" style={{ maxWidth: 420 }}>Filtreleri gevşetmeyi dene ya da kısa bir süre sonra tekrar bak — stok sık yenileniyor.</p>
              <button className="btn btn--ghost" onClick={() => { setCategory("Tümü"); setQ(""); setInStock(false); }}>
                Filtreleri sıfırla
              </button>
            </EmptyState>
          </div>
        ) : (
          <motion.div layout className="grid-cards">
            <AnimatePresence mode="popLayout">
              {visible.map((d, i) => (
                <DeviceCard key={d.id} device={d} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </>
  );
}
