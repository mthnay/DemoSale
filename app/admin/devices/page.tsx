"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Pencil, Plus, Search, Smartphone, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { CATEGORIES, coverImage, formatPrice } from "@/lib/format";
import type { Device, Grade } from "@/lib/types";
import { EmptyState, Skeleton } from "@/components/ui";
import { Modal, useFeedback } from "@/components/Feedback";

const MAX_IMAGES = 6;

interface FormState {
  name: string;
  price: string;
  batteryHealth: string;
  grade: Grade;
  warranty: string;
  category: string;
  stock: string;
  description: string;
  images: string[];
}
const EMPTY: FormState = {
  name: "", price: "", batteryHealth: "100", grade: "A", warranty: "Devam ediyor",
  category: "iPhone", stock: "1", description: "", images: [],
};

/** Görseli tarayıcıda küçültüp JPEG data URL'ye çevirir (en fazla 1200px). */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Görsel işlenemedi."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => reject(new Error(`${file.name} okunamadı.`));
    img.src = url;
  });
}

export default function DevicesManagement() {
  const { toast, confirm } = useFeedback();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api<Device[]>("/api/devices")
      .then(setDevices)
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return term ? devices.filter((d) => `${d.name} ${d.category}`.toLocaleLowerCase("tr").includes(term)) : devices;
  }, [devices, q]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  };
  const openEdit = (d: Device) => {
    setEditingId(d.id);
    setForm({
      name: d.name, price: String(d.price), batteryHealth: String(d.batteryHealth), grade: d.grade,
      warranty: d.warranty, category: d.category, stock: String(d.stock), description: d.description,
      images: d.imageUrls ?? [],
    });
    setError("");
    setOpen(true);
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const room = MAX_IMAGES - form.images.length;
    if (list.length > room) toast(`En fazla ${MAX_IMAGES} fotoğraf eklenebilir.`, "info");
    try {
      const encoded = await Promise.all(list.slice(0, room).map(compressImage));
      setForm((f) => ({ ...f, images: [...f.images, ...encoded] }));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Cihaz adı zorunlu.");
    if (form.images.length === 0) return setError("En az bir fotoğraf ekleyin.");
    setSaving(true);
    const body = {
      name: form.name, price: Number(form.price), batteryHealth: Number(form.batteryHealth), grade: form.grade,
      warranty: form.warranty, category: form.category, stock: Number(form.stock), description: form.description,
      imageUrls: form.images,
    };
    try {
      if (editingId) {
        const updated = await api<Device>(`/api/devices/${editingId}`, { method: "PUT", body });
        setDevices((list) => list.map((d) => (d.id === editingId ? updated : d)));
        toast("Cihaz güncellendi.");
      } else {
        const created = await api<Device>("/api/devices", { method: "POST", body });
        setDevices((list) => [created, ...list]);
        toast("Cihaz eklendi.");
      }
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: Device) => {
    const ok = await confirm({
      title: "Cihaz silinsin mi?",
      description: `${d.name} katalogdan kalıcı olarak kaldırılacak. Geçmiş talepler korunur.`,
      confirmLabel: "Sil",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api(`/api/devices/${d.id}`, { method: "DELETE" });
      setDevices((list) => list.filter((x) => x.id !== d.id));
      toast("Cihaz silindi.");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <header className="row">
        <div>
          <span className="eyebrow">Envanter</span>
          <h1 className="display h2" style={{ marginTop: 10 }}>Cihazlar</h1>
        </div>
        <div className="spacer" />
        <button className="btn btn--primary" onClick={openNew}>
          <Plus size={18} aria-hidden="true" /> Yeni cihaz
        </button>
      </header>

      <label className="input-wrap">
        <span className="sr-only">Cihaz ara</span>
        <Search size={18} aria-hidden="true" />
        <input className="input" type="search" placeholder="Ad veya kategori ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {loading ? (
        <div className="list" aria-hidden="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 86, borderRadius: 18 }} />)}</div>
      ) : visible.length === 0 ? (
        <div className="glass">
          <EmptyState icon={<Smartphone size={32} />} title={devices.length ? "Eşleşen cihaz yok" : "Henüz cihaz yok"}>
            {!devices.length && <button className="btn btn--primary" onClick={openNew}><Plus size={18} aria-hidden="true" /> İlk cihazı ekle</button>}
          </EmptyState>
        </div>
      ) : (
        <ul className="list" role="list">
          <AnimatePresence initial={false}>
            {visible.map((d, i) => (
              <motion.li
                key={d.id}
                layout
                className="list-item"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="list-item__thumb" src={coverImage(d)} alt="" />
                <div className="list-item__main">
                  <div className="list-item__title">{d.name}</div>
                  <div className="list-item__meta">
                    <span>{d.category}</span><span>Sınıf {d.grade}</span><span>Pil %{d.batteryHealth}</span>
                  </div>
                </div>
                <span className="display mono" style={{ fontSize: 19 }}>{formatPrice(d.price)} ₺</span>
                <span className={`badge ${d.stock === 0 ? "badge--rejected" : d.stock <= 2 ? "badge--pending" : "badge--approved"}`}>
                  Stok {d.stock}
                </span>
                <div className="row" style={{ ["--gap" as string]: "6px" }}>
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => openEdit(d)} aria-label={`${d.name} düzenle`}>
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button className="btn btn--danger btn--icon btn--sm" onClick={() => remove(d)} aria-label={`${d.name} sil`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Cihazı düzenle" : "Yeni cihaz"} wide>
        <form className="stack" style={{ ["--gap" as string]: "18px" }} onSubmit={save} noValidate>
          <label className="field">
            <span className="field__label">Cihaz adı</span>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="iPhone 15 Pro 256 GB Natürel Titanyum" required maxLength={120} />
          </label>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">Kategori</span>
              <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Fiyat (₺)</span>
              <input className="input" type="number" inputMode="decimal" min={0} value={form.price} onChange={(e) => set("price", e.target.value)} required />
            </label>
            <label className="field">
              <span className="field__label">Stok</span>
              <input className="input" type="number" inputMode="numeric" min={0} value={form.stock} onChange={(e) => set("stock", e.target.value)} required />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">Pil sağlığı (%)</span>
              <input className="input" type="number" inputMode="numeric" min={0} max={100} value={form.batteryHealth} onChange={(e) => set("batteryHealth", e.target.value)} required />
            </label>
            <fieldset className="field" style={{ border: 0 }}>
              <legend className="field__label" style={{ marginBottom: 8 }}>Kondisyon sınıfı</legend>
              <div className="row" style={{ ["--gap" as string]: "6px" }}>
                {(["A", "B", "C"] as Grade[]).map((g) => (
                  <button key={g} type="button" className="chip" aria-pressed={form.grade === g} onClick={() => set("grade", g)} style={{ flex: 1 }}>
                    {form.grade === g && <span className="chip__bg" />}
                    <span className="chip__label">{g}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span className="field__label">Garanti</span>
              <input className="input" value={form.warranty} onChange={(e) => set("warranty", e.target.value)} maxLength={80} />
            </label>
          </div>

          <label className="field">
            <span className="field__label">Açıklama</span>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Kozmetik durum, kutu içeriği, notlar…" maxLength={2000} />
          </label>

          <div className="field">
            <span className="field__label" id="photos-label">Fotoğraflar ({form.images.length}/{MAX_IMAGES})</span>
            {form.images.length < MAX_IMAGES && (
              <button
                type="button"
                className="dropzone"
                data-active={dragging}
                aria-describedby="photos-hint"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              >
                <ImagePlus size={28} aria-hidden="true" />
                <span style={{ fontWeight: 600 }}>Fotoğraf seç veya buraya sürükle</span>
                <span id="photos-hint" className="field__hint">İlk fotoğraf kapak olur. Görseller otomatik küçültülür.</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            {form.images.length > 0 && (
              <ul className="thumbs" role="list" aria-labelledby="photos-label">
                <AnimatePresence>
                  {form.images.map((src, i) => (
                    <motion.li key={src.slice(-40) + i} className="thumb" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Fotoğraf ${i + 1}`} />
                      {i === 0 && <span className="badge thumb__cover">Kapak</span>}
                      <button type="button" className="thumb__remove" onClick={() => set("images", form.images.filter((_, j) => j !== i))} aria-label={`Fotoğraf ${i + 1}'i kaldır`}>
                        <X size={14} aria-hidden="true" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {error && <p className="field__error" role="alert">{error}</p>}

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Vazgeç</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? <><span className="spinner" aria-hidden="true" /> Kaydediliyor…</> : editingId ? "Değişiklikleri kaydet" : "Cihazı ekle"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
