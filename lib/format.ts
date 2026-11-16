export const CATEGORIES = ["iPhone", "iPad", "Mac", "Apple Watch", "AirPods", "Aksesuar"] as const;

const priceFmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
export const formatPrice = (n: number) => priceFmt.format(n);

const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
export const formatDate = (s: string | null | undefined) => (s ? dateFmt.format(new Date(s)) : "—");

export function timeAgo(s: string | null | undefined) {
  if (!s) return "hiç";
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });
  if (diff < 60) return "az önce";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day");
  return formatDate(s);
}

const FALLBACK: Record<string, string> = {
  iPhone: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=70",
  iPad: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=70",
  Mac: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=70",
  "Apple Watch": "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=70",
  AirPods: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=70",
  Aksesuar: "https://images.unsplash.com/photo-1588156979402-15f5a8cb5d94?auto=format&fit=crop&w=800&q=70",
};
export const coverImage = (d: { imageUrls?: string[]; category: string }) =>
  d.imageUrls?.[0] || FALLBACK[d.category] || FALLBACK.Aksesuar;
export const deviceImages = (d: { imageUrls?: string[]; category: string }) =>
  d.imageUrls?.length ? d.imageUrls : [coverImage(d)];

export const GRADE_LABEL: Record<string, string> = { A: "Kusursuz", B: "Çok iyi", C: "İyi" };
export const STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal edildi",
};

export const initials = (email: string, name?: string) => {
  const src = (name || email.split("@")[0]).replace(/[._-]+/g, " ").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};
