import { NextResponse, type NextRequest } from "next/server";

// Oturum çerezi olmayan ziyaretçileri sayfa düzeyinde girişe yönlendirir.
// Asıl yetki kontrolü API'de (lib/auth.ts) yapılır; bu sadece hızlı bir ön kapıdır.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("ds_session");
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // API, Next iç dosyaları ve statik dosyalar hariç tüm sayfalar
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
