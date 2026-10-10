import { motion } from 'framer-motion';
import { ArrowRight, Play, Database, ShieldCheck, Cpu } from 'lucide-react';
import GlobeCanvas from './GlobeCanvas';

const SUB_FEATURES = [
  { action: 'COLLECT', rest: 'with Robust Ingestion' },
  { action: 'LABEL', rest: 'with Noise Detection' },
  { action: 'FINE TUNE', rest: 'with Measured Impact' },
];

export default function Hero({ onRunDemoScan }) {
  const subFeaturesContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.18,
        delayChildren: 0.6,
      },
    },
  };

  const subFeatureItem = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const scrollToScanner = () => {
    const el = document.getElementById('scanner');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="home"
      className="relative min-h-[100vh] flex flex-col items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#030712]"
    >
      {/* Background: Rotating, glowing wireframe / particle globe animation */}
      <GlobeCanvas />

      {/* Atmospheric lighting gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.85),rgba(3,7,18,0.98))] pointer-events-none" />

      {/* Tech grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(to right, #3b82f6 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center pointer-events-none mt-4 md:mt-0">
        
        {/* Top telemetry tag */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-medium tracking-wide mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(37,99,235,0.25)] pointer-events-auto"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          DataPulse • Pre-Training Dataset Failure Predictor
        </motion.div>

        {/* Main Typography: Centered massive, bold headline with slow fade-up and slight scale-in */}
        <motion.h1
          initial={{ opacity: 0, y: 35, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.08] sm:leading-[1.06] mb-8 max-w-4xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
        >
          Powering AI Models with Flawless Training Data
        </motion.h1>

        {/* Sub-features: Inline row with first word in vibrant blue and rest in white */}
        <motion.div
          variants={subFeaturesContainer}
          initial="hidden"
          animate="show"
          className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-3 mb-10 max-w-3xl text-sm sm:text-base md:text-lg font-medium"
        >
          {SUB_FEATURES.map((item, idx) => (
            <motion.div
              key={idx}
              variants={subFeatureItem}
              className="flex items-center gap-2 bg-blue-950/30 sm:bg-transparent px-3 py-1 rounded-full border border-blue-500/20 sm:border-none backdrop-blur-sm sm:backdrop-blur-none"
            >
              <span className="text-blue-500 font-extrabold tracking-wider drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">
                {item.action}
              </span>
              <span className="text-white tracking-normal font-normal">
                {item.rest}
              </span>
              {idx < SUB_FEATURES.length - 1 && (
                <span className="hidden sm:inline-block text-blue-500/40 ml-4 font-light">
                  •
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA: Prominent, glowing royal blue "Scan Dataset Now" button with scale & glow hover */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="pointer-events-auto flex flex-col sm:flex-row items-center gap-4"
        >
          <motion.button
            onClick={() => {
              onRunDemoScan();
              scrollToScanner();
            }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 50px 8px rgba(37, 99, 235, 0.85), 0 0 20px 2px rgba(96, 165, 250, 0.7)',
            }}
            whileTap={{ scale: 0.97 }}
            className="group relative px-9 py-4 rounded-xl bg-blue-600 text-white font-bold text-base sm:text-lg tracking-wide shadow-[0_0_30px_rgba(37,99,235,0.6)] border border-blue-400/50 transition-colors duration-300 flex items-center gap-3 cursor-pointer overflow-hidden"
            aria-label="Scan Dataset with DataPulse"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 transition-transform bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <Play className="w-5 h-5 fill-current text-white" />
            <span>Launch Live Scanner</span>
            <ArrowRight className="w-5 h-5 text-blue-100 group-hover:translate-x-1 transition-transform duration-300" />
          </motion.button>

          <button
            onClick={scrollToScanner}
            className="px-6 py-4 rounded-xl bg-blue-950/50 hover:bg-blue-900/40 text-blue-300 hover:text-white text-sm font-semibold border border-blue-500/30 transition-all cursor-pointer backdrop-blur-md"
          >
            Upload Custom CSV/JSONL
          </button>
        </motion.div>

        {/* Telemetry proof metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.2 }}
          className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 pt-6 border-t border-blue-900/30 max-w-3xl pointer-events-auto"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">100%</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Injected Fault Recall</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">13x</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Better than Random</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">&lt; 3.5s</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Scan Runtime</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">0 Silent</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Data Drops</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
