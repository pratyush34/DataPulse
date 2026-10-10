import { motion } from 'framer-motion';
import { Smile, Star, Globe, Zap } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: Smile,
    title: 'Quality Assurance',
    description: 'Multi-tier peer validation & automated QA checks',
  },
  {
    icon: Star,
    title: 'Highest Quality Data Sets',
    description: 'Benchmark-ready datasets with zero hallucinations',
  },
  {
    icon: Globe,
    title: 'Multilingual Functionality',
    description: 'Native coverage across 85+ regional languages & dialects',
  },
  {
    icon: Zap,
    title: 'Advanced Tech Tools',
    description: 'API-driven pipelines with real-time telemetry',
  },
];

export default function HighlightsBanner() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  return (
    <section className="relative w-full bg-[#1d4ed8] sm:bg-[#2563eb] text-white py-14 sm:py-16 px-4 sm:px-6 lg:px-8 shadow-[0_10px_40px_rgba(37,99,235,0.3)] overflow-hidden">
      {/* Subtle tech background circuit texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="banner-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              <circle cx="40" cy="0" r="2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#banner-grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6"
        >
          {HIGHLIGHTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex flex-col items-center text-center group"
              >
                {/* Circular white badge holding thin, blue line-art icon */}
                <motion.div
                  whileHover={{ y: -8, scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.25),0_0_20px_rgba(255,255,255,0.4)] mb-5 cursor-pointer transition-shadow duration-300 group-hover:shadow-[0_15px_35px_rgba(0,0,0,0.3),0_0_30px_rgba(255,255,255,0.7)]"
                >
                  <Icon
                    className="w-10 h-10 sm:w-11 sm:h-11 text-blue-600 transition-transform duration-300 group-hover:scale-110"
                    strokeWidth={1.5}
                  />
                </motion.div>

                {/* Centered white text */}
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide mb-1.5 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-blue-100/80 max-w-[220px]">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
