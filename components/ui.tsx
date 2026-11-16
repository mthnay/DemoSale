"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { STATUS_LABEL } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Spinner({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <span role="status" style={{ display: "inline-flex" }}>
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ style, className = "" }: { style?: React.CSSProperties; className?: string }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** Görünür olduğunda sayıyı yumuşakça sayar; azaltılmış harekette doğrudan gösterir. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("tr-TR") }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref}>
      <span aria-hidden="true">{format(reduce ? value : display)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">{icon}</div>
      <h2 className="h3">{title}</h2>
      {children}
    </div>
  );
}
