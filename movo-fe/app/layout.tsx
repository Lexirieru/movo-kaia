import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AuthProvider } from "@/lib/userContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || "https://movopayment.vercel.app";
  return {
    title: "MovoPayment",
    description:
      "Swap crypto seamlessly across multiple blockchains. Send tokens to anyone, anywhere, and let them convert to fiat instantly.",
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: `${URL}/hero.png`,
        button: {
          title: "Launch MovoPayment",
          action: {
            type: "launch_frame",
            name: "MovoPayment",
            url: URL,
            splashImageUrl: `${URL}/splash.png`,
            splashBackgroundColor: "#000000",
          },
        },
      }),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background">
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
