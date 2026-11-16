"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BatteryMedium, CheckCircle2, ChevronLeft, ChevronRight, Package, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { deviceImages, formatPrice, GRADE_LABEL } from "@/lib/format";
import type { Device } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { EmptyState, Skeleton } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";

export default function DeviceDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast, confirm } = useFeedback();

  const [device, setDevice] = useState<Device | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");
  const [[index, dir], setSlide] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !params.id) return;
    api<Device>(`/api/devices/${params.id}`)
      .then(setDevice)
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false));
  }, [params.id, user]);

  const images = device ? deviceImages(device) : [];
  const go = useCallback(
    (delta: number) => setSlide(([i]) => [(i + delta + images.length) % images.length, delta]),
    [images.length]
  );

  const handleRequest = async () => {
    if (!device) return;
    const ok = await confirm({
      title: "Satın alma talebi oluşturulsun mu?",
      description: `${device.name} için ${formatPrice(device.price)} ₺ tutarında talep oluşturulacak ve 1 adet sizin için ayrılacak.`,
      confirmLabel: "Talebi gönder",
    });
    if (!ok) return;
    setRequesting(true);
    try {
      const res = await api<{ stock: number }>("/api/requests", { method: "POST", body: { deviceId: device.id, note } });
      setDevice({ ...device, stock: res.stock });
      setDone(true);
      setNote("");
      toast("Talebiniz alındı! Yöneticiler en kısa sürede dönüş yapacak.");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setRequesting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <TopBar />
      <main id="main" className="container page">
        <Link href="/" className="back-link" style={{ marginBottom: 20 }}>
          <ArrowLeft size={18} aria-hidden="true" /> Kataloğa dön
        </Link>

        {fetching ? (
          <div className="detail" aria-hidden="true">
            <Skeleton style={{ aspectRatio: "1", borderRadius: 26 }} />
            <div className="stack">
              <Skeleton style={{ height: 22, width: 120 }} />
              <Skeleton style={{ height: 56, width: "80%" }} />
              <Skeleton style={{ height: 44, width: "40%" }} />
              <Skeleton style={{ height: 160 }} />
            </div>
          </div>
        ) : notFound || !device ? (
          <div className="glass">
            <EmptyState icon={<Package size={32} />} title="Cihaz bulunamadı">
              <p className="muted">Bu cihaz kaldırılmış olabilir.</p>
              <Link href="/" className="btn btn--ghost">Kataloğa dön</Link>
            </EmptyState>
          </div>
        ) : (
          <div className="detail">
            {/* Galeri */}
            <section className="gallery" aria-roledescription="galeri" aria-label={`${device.name} fotoğrafları`}>
              <div
                className="gallery__stage"
                tabIndex={images.length > 1 ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") go(1);
                  if (e.key === "ArrowLeft") go(-1);
                }}
                aria-label={images.length > 1 ? "Fotoğraflar arasında sol/sağ ok tuşlarıyla gezinebilirsiniz" : undefined}
              >
                <AnimatePresence initial={false} custom={dir}>
                  <motion.img
                    key={index}
                    src={images[index]}
                    alt={`${device.name} — fotoğraf ${index + 1} / ${images.length}`}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 60, scale: 1.04 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: dir * -60 }}
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                    drag={images.length > 1 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -60) go(1);
                      else if (info.offset.x > 60) go(-1);
                    }}
                  />
                </AnimatePresence>
                {images.length > 1 && (
                  <>
                    <button className="gallery__nav gallery__nav--prev" onClick={() => go(-1)} aria-label="Önceki fotoğraf">
                      <ChevronLeft size={22} aria-hidden="true" />
                    </button>
                    <button className="gallery__nav gallery__nav--next" onClick={() => go(1)} aria-label="Sonraki fotoğraf">
                      <ChevronRight size={22} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="gallery__thumbs">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      className="gallery__thumb"
                      aria-current={i === index}
                      aria-label={`Fotoğraf ${i + 1}`}
                      onClick={() => setSlide([i, i > index ? 1 : -1])}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Bilgiler */}
            <motion.section
              className="stack"
              style={{ ["--gap" as string]: "24px" }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
              aria-labelledby="device-title"
            >
              <div className="stack" style={{ ["--gap" as string]: "12px" }}>
                <div className="row">
                  <span className="badge"><Tag size={13} aria-hidden="true" />{device.category}</span>
                  {device.stock <= 0 ? (
                    <span className="badge badge--rejected">Tükendi</span>
                  ) : (
                    <span className="badge badge--approved"><span className="badge__dot" aria-hidden="true" />Stokta {device.stock} adet</span>
                  )}
                </div>
                <h1 id="device-title" className="display h2">{device.name}</h1>
                <div className="display mono" style={{ fontSize: "clamp(36px, 5vw, 52px)" }}>
                  <span className="gradient-text">{formatPrice(device.price)}</span>
                  <span className="muted" style={{ fontSize: "0.5em", marginLeft: 6 }}>₺</span>
                </div>
              </div>

              <dl className="spec-grid">
                <div className="spec">
                  <dt className="spec__label"><BatteryMedium size={14} aria-hidden="true" />Pil sağlığı</dt>
                  <dd className="spec__value mono">%{device.batteryHealth}</dd>
                  <div className="meter" style={{ marginTop: 10 }} role="presentation">
                    <motion.div
                      className="meter__fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${device.batteryHealth}%` }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                      style={{ backgroundPosition: `${100 - device.batteryHealth}% 0` }}
                    />
                  </div>
                </div>
                <div className="spec">
                  <dt className="spec__label"><Sparkles size={14} aria-hidden="true" />Kondisyon</dt>
                  <dd className="spec__value">Sınıf {device.grade} · {GRADE_LABEL[device.grade]}</dd>
                </div>
                <div className="spec">
                  <dt className="spec__label"><ShieldCheck size={14} aria-hidden="true" />Garanti</dt>
                  <dd className="spec__value">{device.warranty || "Belirtilmemiş"}</dd>
                </div>
                <div className="spec">
                  <dt className="spec__label"><Package size={14} aria-hidden="true" />Stok</dt>
                  <dd className="spec__value mono">{device.stock} adet</dd>
                </div>
              </dl>

              {device.description && (
                <div className="stack" style={{ ["--gap" as string]: "8px" }}>
                  <h2 className="eyebrow">Açıklama</h2>
                  <p className="muted" style={{ whiteSpace: "pre-line" }}>{device.description}</p>
                </div>
              )}

              <div className="glass panel stack" style={{ ["--gap" as string]: "14px" }}>
                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.div
                      key="done"
                      className="stack"
                      style={{ ["--gap" as string]: "12px", alignItems: "flex-start" }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      role="status"
                    >
                      <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
                        <CheckCircle2 size={44} color="var(--success)" aria-hidden="true" />
                      </motion.div>
                      <h2 className="h3">Talebin alındı!</h2>
                      <p className="muted">Durumunu &quot;Taleplerim&quot; sayfasından takip edebilirsin.</p>
                      <div className="row">
                        <Link href="/requests" className="btn btn--primary">Taleplerime git</Link>
                        <Link href="/" className="btn btn--ghost">Alışverişe devam</Link>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="stack" style={{ ["--gap" as string]: "14px" }} exit={{ opacity: 0, y: -10 }}>
                      <label className="field">
                        <span className="field__label">Yöneticiye not <span className="dim">(isteğe bağlı)</span></span>
                        <textarea
                          className="input"
                          rows={3}
                          maxLength={500}
                          placeholder="Örn. teslim almak için uygun olduğum günler…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          disabled={device.stock <= 0}
                        />
                      </label>
                      <button className="btn btn--primary btn--lg btn--block" onClick={handleRequest} disabled={requesting || device.stock <= 0}>
                        {requesting ? (
                          <><span className="spinner" aria-hidden="true" /> Gönderiliyor…</>
                        ) : device.stock <= 0 ? (
                          "Tükendi"
                        ) : (
                          "Satın alma talebi oluştur"
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          </div>
        )}
      </main>
    </>
  );
}
