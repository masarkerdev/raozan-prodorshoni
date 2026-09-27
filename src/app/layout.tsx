import type { Metadata } from "next";
import { Hind_Siliguri, Tiro_Bangla } from "next/font/google";
import "./globals.css";

const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
});

const tiro = Tiro_Bangla({
  subsets: ["bengali", "latin"],
  weight: "400",
  variable: "--font-tiro",
});

export const metadata: Metadata = {
  title: "প্রদর্শনী রেজিস্টার — উপজেলা কৃষি অফিস, রাউজান",
  description: "রাউজান উপজেলার প্রকল্প ও রাজস্ব খাতের প্রদর্শনী ব্যবস্থাপনা",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${hind.variable} ${tiro.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
