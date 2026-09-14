import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import { headers } from "next/headers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "YEXX Energy Drink — More Energy, Bigger You",
  description: "YEXX is more than an energy drink. It's your boost for the moments that matter.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Set by proxy.ts on every request (it already calls getUser() to make
  // its own auth decision) — reading it here avoids a second Auth-server
  // round trip just to pick the Nav's account link on every page load.
  const signedIn = (await headers()).get("x-user-signed-in") === "1";

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="bg-bone text-ink">
        <CartProvider>
          <SmoothScroll />
          <ScrollProgressBar />
          <Nav accountHref={signedIn ? "/account" : "/account/login"} />
          <CartDrawer />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
