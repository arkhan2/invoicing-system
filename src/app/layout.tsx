import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Invoicing System",
  description: "Sales & Purchase invoicing with FBR integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("invoicing-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var theme=t||(d?"dark":"light");document.documentElement.setAttribute("data-theme",theme);})();`,
          }}
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
