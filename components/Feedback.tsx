"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */
type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; message: string }

/* ------------------------------------------------------------------ */
/* Onay penceresi                                                      */
/* ------------------------------------------------------------------ */
interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

interface FeedbackApi {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi>({
  toast: () => {},
  confirm: async () => false,
});

export const useFeedback = () => useContext(FeedbackContext);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4500);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    []
  );

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirmState && !d.open) d.showModal();
    if (!confirmState && d.open) d.close();
  }, [confirmState]);

  const settle = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toasts" role="region" aria-label="Bildirimler">
        <div aria-live="polite" aria-atomic="false" className="stack" style={{ ["--gap" as string]: "10px" }}>
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const Icon = ICONS[t.kind];
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`toast toast--${t.kind}`}
                  role={t.kind === "error" ? "alert" : "status"}
                >
                  <Icon size={20} className="toast__icon" aria-hidden="true" />
                  <div style={{ flex: 1 }}>{t.message}</div>
                  <button className="btn btn--icon btn--sm" style={{ ["--h" as string]: "26px" }} onClick={() => dismiss(t.id)} aria-label="Bildirimi kapat">
                    <X size={16} aria-hidden="true" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby="confirm-title"
        aria-describedby={confirmState?.description ? "confirm-desc" : undefined}
        onCancel={(e) => {
          e.preventDefault();
          settle(false);
        }}
      >
        {confirmState && (
          <>
            <div className="dialog__head">
              <div className={`dialog__icon ${confirmState.tone === "danger" ? "dialog__icon--danger" : ""}`} aria-hidden="true">
                <AlertTriangle size={22} />
              </div>
              <h2 id="confirm-title" className="h3">{confirmState.title}</h2>
            </div>
            {confirmState.description && (
              <div className="dialog__body">
                <p id="confirm-desc" className="muted">{confirmState.description}</p>
              </div>
            )}
            <div className="dialog__foot" style={{ paddingTop: confirmState.description ? 0 : 20 }}>
              <button className="btn btn--ghost" onClick={() => settle(false)} autoFocus>
                {confirmState.cancelLabel ?? "Vazgeç"}
              </button>
              <button
                className={`btn ${confirmState.tone === "danger" ? "btn--danger" : "btn--primary"}`}
                onClick={() => settle(true)}
              >
                {confirmState.confirmLabel ?? "Onayla"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </FeedbackContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Genel amaçlı modal (native <dialog>: odak hapsi ve Esc yerleşik)    */
/* ------------------------------------------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog--wide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // arka plana tıklama
      }}
    >
      {open && (
        <>
          <div className="dialog__head">
            <h2 id="modal-title" className="h3" style={{ flex: 1 }}>{title}</h2>
            <button className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="Kapat">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="dialog__body">{children}</div>
        </>
      )}
    </dialog>
  );
}
