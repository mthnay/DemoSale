import { HttpError } from "@/lib/auth";

export const CATEGORIES = ["iPhone", "iPad", "Mac", "Apple Watch", "AirPods", "Aksesuar"] as const;
const MAX_IMAGES = 6;
const MAX_IMAGE_CHARS = 1_500_000; // ~1.1 MB'lık görsel (base64)

export interface DeviceInput {
  name: string;
  price: number;
  batteryHealth: number;
  grade: "A" | "B" | "C";
  warranty: string;
  category: string;
  stock: number;
  description: string;
  imageUrls?: string[];
}

const isValidImage = (src: string) =>
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) || /^https:\/\/[^\s"'<>]+$/.test(src);

export function parseDeviceInput(body: Record<string, unknown>, requireImages: boolean): DeviceInput {
  const num = (v: unknown, field: string, max = 1e9) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, `Geçersiz değer: ${field}`);
    return n;
  };
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

  const name = text(body.name, 120);
  if (!name) throw new HttpError(400, "Cihaz adı zorunlu.");
  const grade = String(body.grade ?? "A");
  if (!["A", "B", "C"].includes(grade)) throw new HttpError(400, "Geçersiz kondisyon sınıfı.");
  const category = String(body.category ?? "iPhone");
  if (!(CATEGORIES as readonly string[]).includes(category)) throw new HttpError(400, "Geçersiz kategori.");

  let imageUrls: string[] | undefined;
  if (Array.isArray(body.imageUrls)) {
    imageUrls = body.imageUrls.map(String).filter(Boolean);
    if (imageUrls.length > MAX_IMAGES) throw new HttpError(400, `En fazla ${MAX_IMAGES} fotoğraf yüklenebilir.`);
    if (imageUrls.some((u) => u.length > MAX_IMAGE_CHARS || !isValidImage(u))) {
      throw new HttpError(400, "Fotoğraflardan biri geçersiz veya çok büyük.");
    }
  }
  if (requireImages && !imageUrls?.length) throw new HttpError(400, "En az bir fotoğraf gerekli.");

  return {
    name,
    price: num(body.price, "fiyat", 10_000_000),
    batteryHealth: Math.round(num(body.batteryHealth, "pil sağlığı", 100)),
    grade: grade as DeviceInput["grade"],
    warranty: text(body.warranty, 80),
    category,
    stock: Math.round(num(body.stock, "stok", 10_000)),
    description: text(body.description, 2000),
    imageUrls,
  };
}
