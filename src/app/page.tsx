import { HeroSection } from "@/components/landing/hero-section";
import { CategoriesSection } from "@/components/landing/categories-section";
import { FeaturedProducts } from "@/components/landing/featured-products";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LatestProducts } from "@/components/landing/latest-products";
import { CTASection } from "@/components/landing/cta-section";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <div className="gold-divider" />
        <CategoriesSection />
        <div className="gold-divider" />
        <FeaturedProducts />
        <div className="gold-divider" />
        <HowItWorks />
        <LatestProducts />
        <div className="gold-divider" />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
