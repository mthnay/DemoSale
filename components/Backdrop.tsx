"use client";

import { useEffect, useRef } from "react";

/** Sabit, dekoratif sinematik arka plan: aurora küreleri, ızgara, film greni ve imleci izleyen ışık. */
export default function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        ref.current?.style.setProperty("--mx", `${e.clientX}px`);
        ref.current?.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={ref} className="backdrop" aria-hidden="true">
      <div className="backdrop__orb backdrop__orb--1" />
      <div className="backdrop__orb backdrop__orb--2" />
      <div className="backdrop__orb backdrop__orb--3" />
      <div className="backdrop__grid" />
      <div className="backdrop__spot" />
      <div className="backdrop__grain" />
    </div>
  );
}
