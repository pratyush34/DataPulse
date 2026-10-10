import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Menu, X, Play, FileSpreadsheet, ShieldAlert } from 'lucide-react';

const NAV_LINKS = [
  { name: 'Home', href: '#home' },
  { name: 'Scanner', href: '#scanner' },
  { name: 'Capabilities', href: '#services' },
  { name: 'Architecture', href: '#highlights' },
  { name: 'Try Live Demo', href: '#scanner', isCta: true },
];

export default function Navbar({ onRunDemoScan }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (e, link) => {
    if (link.isCta && onRunDemoScan) {
      e.preventDefault();
      onRunDemoScan();
      const el = document.getElementById('scanner');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
      return;
    }
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#030712]/80 backdrop-blur-md border-b border-blue-900/40 shadow-[0_4px_30px_rgba(0,0,0,0.6)] py-3'
          : 'bg-transparent border-b border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left Side: Logo featuring "DataPulse" */}
        <a
          href="#home"
          className="group flex items-center gap-3 focus:outline-none"
          aria-label="DataPulse Home"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-500/40 group-hover:border-blue-400 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.7)] transition-all duration-300">
            <Activity className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-[#030712] animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-blue-100 transition-colors">
              Data<span className="text-blue-500">Pulse</span>
            </span>
          </div>
        </a>

        {/* Right Side: Desktop Navigation Links with Blue Hover Underline */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {NAV_LINKS.map((link, idx) => {
            if (link.isCta) {
              return (
                <button
                  key={link.name}
                  onClick={(e) => handleLinkClick(e, link)}
                  className="relative ml-3 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.45)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] hover:scale-[1.03] active:scale-[0.98] border border-blue-400/40 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>{link.name}</span>
                </button>
              );
            }

            return (
              <a
                key={link.name}
                href={link.href}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative px-3.5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
              >
                <span>{link.name}</span>

                {/* Subtle blue underline animation on hover */}
                {hoveredIndex === idx && (
                  <motion.div
                    layoutId="navbar-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 shadow-[0_0_10px_#3b82f6] rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-blue-950/40 border border-blue-900/40 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-blue-900/40 bg-[#030712]/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-2 overflow-hidden"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  link.isCta
                    ? 'bg-blue-600 text-white text-center shadow-[0_0_20px_rgba(37,99,235,0.5)] font-semibold mt-4'
                    : 'text-gray-300 hover:text-white hover:bg-blue-950/40'
                }`}
              >
                {link.name}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
