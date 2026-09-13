import { CartProvider } from "@/lib/cart-context";
import { ProductProvider } from "@/lib/product-context";
import Nav from "@/components/Nav";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import Hero from "@/components/Hero";
import Pillars from "@/components/Pillars";
import Nutrition from "@/components/Nutrition";
import Shop from "@/components/Shop";
import SocialGrid from "@/components/SocialGrid";
import Marquee from "@/components/Marquee";
import WholesaleForm from "@/components/WholesaleForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <CartProvider>
      <ProductProvider>
        <SmoothScroll />
        <ScrollProgressBar />
        <Nav />
        <CartDrawer />
        <main>
          <Hero />
          <Pillars />
          <Nutrition />
          <Shop />
          <SocialGrid />
          <Marquee />
          <WholesaleForm />
        </main>
        <Footer />
      </ProductProvider>
    </CartProvider>
  );
}
