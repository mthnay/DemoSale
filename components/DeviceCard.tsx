"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { BatteryMedium, Package, ShieldCheck, Sparkles } from "lucide-react";
import type { Device } from "@/lib/types";
import { coverImage, formatPrice, GRADE_LABEL } from "@/lib/format";

export default function DeviceCard({ device: d, index = 0 }: { device: Device; index?: number }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 220, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 220, damping: 20 });
  const soldOut = d.stock <= 0;

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    mx.set(x);
    my.set(y);
    e.currentTarget.style.setProperty("--px", `${x * 100}%`);
    e.currentTarget.style.setProperty("--py", `${y * 100}%`);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: Math.min(index, 8) * 0.05 }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        className={`card ${soldOut ? "card--soldout" : ""}`}
        style={reduce ? undefined : { rotateX, rotateY }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div className="card__shine" aria-hidden="true" />
        <div className="card__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage(d)} alt="" loading="lazy" decoding="async" />
          <div className="card__tags">
            <span className="badge card__tag">{d.category}</span>
            {soldOut ? (
              <span className="badge badge--rejected">Tükendi</span>
            ) : d.stock <= 2 ? (
              <span className="badge badge--pending">Son {d.stock} adet</span>
            ) : null}
          </div>
        </div>
        <div className="card__body">
          <div>
            <h3 className="card__title">
              <Link href={`/device/${d.id}`} className="card__link">
                {d.name}
              </Link>
            </h3>
            <div className="card__price mono" style={{ marginTop: 6 }}>
              {formatPrice(d.price)}<small>₺</small>
            </div>
          </div>

          <dl className="card__specs">
            <div className="spec">
              <dt className="spec__label"><BatteryMedium size={13} aria-hidden="true" />Pil</dt>
              <dd className="spec__value mono">%{d.batteryHealth}</dd>
            </div>
            <div className="spec">
              <dt className="spec__label"><Sparkles size={13} aria-hidden="true" />Sınıf</dt>
              <dd className="spec__value" title={GRADE_LABEL[d.grade]}>{d.grade}</dd>
            </div>
            <div className="spec">
              <dt className="spec__label"><Package size={13} aria-hidden="true" />Stok</dt>
              <dd className="spec__value mono">{d.stock}</dd>
            </div>
          </dl>

          <div className="row dim" style={{ fontSize: 13, ["--gap" as string]: "6px", marginTop: "auto" }}>
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Garanti: {d.warranty || "Belirtilmemiş"}</span>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}
