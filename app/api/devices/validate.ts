import { HttpError } from "@/lib/auth";

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

export function parseDeviceInput(body: Record<string, unknown>, requireImages: boolean): DeviceInput {
  const num = (v: unknown, field: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `Geçersiz değer: ${field}`);
    return n;
  };
  const name = String(body.name ?? "").trim();
  if (!name) throw new HttpError(400, "Cihaz adı zorunlu.");
  const grade = String(body.grade ?? "A");
  if (!["A", "B", "C"].includes(grade)) throw new HttpError(400, "Geçersiz kondisyon sınıfı.");

  let imageUrls: string[] | undefined;
  if (Array.isArray(body.imageUrls)) {
    imageUrls = body.imageUrls.map(String).filter(Boolean);
  }
  if (requireImages && !imageUrls?.length) throw new HttpError(400, "En az bir fotoğraf gerekli.");

  return {
    name,
    price: num(body.price, "fiyat"),
    batteryHealth: Math.min(100, Math.round(num(body.batteryHealth, "pil sağlığı"))),
    grade: grade as DeviceInput["grade"],
    warranty: String(body.warranty ?? ""),
    category: String(body.category ?? "iPhone"),
    stock: Math.round(num(body.stock, "stok")),
    description: String(body.description ?? ""),
    imageUrls,
  };
}
