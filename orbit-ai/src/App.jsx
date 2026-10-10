import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HighlightsBanner from './components/HighlightsBanner';
import ServicesSection from './components/ServicesSection';
import ScannerWorkspace from './components/ScannerWorkspace';
import FloatingChat from './components/FloatingChat';
import Footer from './components/Footer';

export default function App() {
  const handleScrollToScanner = () => {
    const el = document.getElementById('scanner');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-blue-600 selection:text-white relative">
      {/* 1. Fixed Transparent Top Navbar with subtle Glassmorphism on scroll */}
      <Navbar onRunDemoScan={handleScrollToScanner} />

      {/* Main Page Content */}
      <main>
        {/* 2. Hero Section: 3D glowing particle globe, massive bold headline, sub-features, glowing CTA */}
        <Hero onRunDemoScan={handleScrollToScanner} />

        {/* 3. Full-width horizontal section with solid royal blue background & 4-column white badges */}
        <HighlightsBanner />

        {/* 4. Services Section Intro: Transition to black, cool blue/white inner glow heading */}
        <ServicesSection onScrollToScanner={handleScrollToScanner} />

        {/* 5. Live Interactive Scanner Workspace for DataPulse */}
        <ScannerWorkspace />
      </main>

      {/* 6. Sleek Dark Footer */}
      <Footer />

      {/* 7. Global Floating Element: Fixed bottom-left, rounded square, continuous gentle pulse */}
      <FloatingChat />
    </div>
  );
}
