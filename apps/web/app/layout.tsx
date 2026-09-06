import type { Metadata, Viewport } from "next";
import "./globals.css";
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ХАОС ПОДАРКОВ";
export const metadata: Metadata = { title: { default: appName, template: `%s · ${appName}` }, description: "Realtime interactive TikTok LIVE arcade game" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#070711" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
