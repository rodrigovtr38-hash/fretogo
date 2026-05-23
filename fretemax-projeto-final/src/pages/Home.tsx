import HeroSection from '../components/home/HeroSection';
import BenefitsSection from '../components/home/BenefitsSection';
import Navbar from '../components/home/Navbar';
import RadarBackground from '../components/home/RadarBackground';

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">

      {/* BACKGROUND */}
      <RadarBackground />

      {/* NAVBAR */}
      <Navbar />

      {/* HERO */}
      <main className="relative z-20">
        <HeroSection />
      </main>

      {/* BENEFÍCIOS */}
      <BenefitsSection />

    </div>
  );
}
