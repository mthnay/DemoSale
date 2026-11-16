import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Backdrop from "@/components/Backdrop";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-display-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DemoSale", template: "%s · DemoSale" },
  description: "Personel için demo ve teşhir cihazları satış portalı",
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${inter.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="skip-link">İçeriğe atla</a>
        <Backdrop />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
