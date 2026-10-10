import { motion } from 'framer-motion';
import {
  FileCode2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Bot,
  BrainCircuit,
  Binary,
  Layers,
  Sparkles,
  GitCompare,
} from 'lucide-react';

const SERVICES_DATA = [
  {
    id: 'robust-ingestion',
    icon: FileCode2,
    tag: 'LAYER 1 • ROBUST INGESTION',
    title: 'Robust Raw Ingestion',
    description:
      'Reads every value as string without silent truncation. Captures rows with inconsistent delimiter counts or corrupt JSON lines and flags duplicate or empty headers.',
    features: [
      'Preserves original physical CSV line numbers',
      'Catches unescaped quotes & malformed row counts',
      'Flags invisible disguised missing values ("N/A", "?", "missing")',
      'Infers strict typed schema with non-destructive fallback',
    ],
    metric: 'Zero Silent Drops',
    gradient: 'from-blue-600/20 via-blue-900/10 to-transparent',
  },
  {
    id: 'rule-checks',
    icon: AlertTriangle,
    tag: 'LAYER 2 • RULE CHECKS',
    title: 'Rule-Based Integrity Engine',
    description:
      'Detects insidious faults before they contaminate model weights: sentinel numbers, unit multiplier anomalies, and contradictory duplicate records.',
    features: [
      'Sentinel value detector (-999, 9999, -1 in numeric features)',
      'Contradicting records (identical inputs with opposite labels)',
      'Label spelling variants ("approved" vs "Approved" vs " approved ")',
      'Robust z-score outlier bounds for unit-error slips (1000x)',
    ],
    metric: 'Deterministic Recall',
    gradient: 'from-blue-500/20 via-indigo-900/10 to-transparent',
  },
  {
    id: 'model-checks',
    icon: BrainCircuit,
    tag: 'LAYER 3 • MODEL CHECKS',
    title: 'Model-Based Leakage & Noise',
    description:
      'Detects post-outcome target leakage and mislabeled rows using out-of-fold probability disagreement inspired by confident learning.',
    features: [
      'Mutual information & single-feature target leakage checks',
      'Leak suspects isolated before label noise calculation',
      '5-fold cross-validated out-of-fold class probability matrix',
      'Top-50 precision of 52% on 4% base-rate flipped labels',
    ],
    metric: '13x Better Than Random',
    gradient: 'from-blue-600/20 via-cyan-900/10 to-transparent',
  },
  {
    id: 'empirical-verify',
    icon: GitCompare,
    tag: 'LAYER 4 • VERIFICATION',
    title: 'Empirical Impact Verification',
    description:
      'The heuristic ranking and measured impact do not always agree. DataPulse retrains with vs. without flagged rows on identical held-out test splits.',
    features: [
      '3x cross-validation repeats on identical test splits',
      'Measures delta and spread (e.g. macro-F1 +0.020 ± 0.010)',
      'Categorizes by ML effect: breaks pipeline, degrades model, inflates metrics',
      'Ranks issues: impact = 100 × severity × col. weight × extent',
    ],
    metric: 'Empirical Ground Truth',
    gradient: 'from-sky-500/20 via-blue-900/10 to-transparent',
  },
];

export default function ServicesSection({ onScrollToScanner }) {
  return (
    <section
      id="services"
      className="relative w-full bg-[#030712] text-white py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="relative max-w-7xl mx-auto">
        {/* Services Section Intro: Centered large heading with layered text-shadow or glassmorphic gradient for cool blue/white inner glow */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-5 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Inspection Architecture
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6"
            style={{
              /* Layered text-shadow & glassmorphic gradient effect for cool blue/white inner glow */
              backgroundImage: 'linear-gradient(180deg, #ffffff 20%, #bfdbfe 70%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow:
                '0 0 25px rgba(255, 255, 255, 0.4), 0 0 50px rgba(59, 130, 246, 0.5), 0 0 90px rgba(37, 99, 235, 0.35)',
            }}
          >
            Services
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-400 font-normal leading-relaxed"
          >
            A multi-tiered scanning system that ranks data problems by their actual mathematical
            threat to machine learning training pipelines.
          </motion.p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {SERVICES_DATA.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.7, delay: index * 0.12 }}
                whileHover={{ y: -6 }}
                className="group relative rounded-2xl bg-gradient-to-b from-slate-900/60 to-[#050b1d]/80 border border-blue-500/20 hover:border-blue-500/50 p-8 sm:p-10 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.25)] flex flex-col justify-between overflow-hidden"
              >
                {/* Radial Accent Glow */}
                <div
                  className={`absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br ${service.gradient} blur-3xl group-hover:scale-125 transition-transform duration-500 pointer-events-none`}
                />

                <div>
                  {/* Top Badge & Metric */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-110 group-hover:border-blue-400 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold tracking-widest text-blue-400 uppercase bg-blue-950/40 px-3 py-1 rounded-full border border-blue-500/20">
                        {service.tag}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-900/60 px-3 py-1 rounded-full border border-gray-800">
                      {service.metric}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 group-hover:text-blue-100 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8">
                    {service.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    {service.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300 font-medium">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA action */}
                <div className="pt-6 border-t border-blue-950/60 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium font-mono">
                    impact = 100 × severity × weight × extent
                  </span>
                  <button
                    onClick={onScrollToScanner}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 group-hover:text-blue-300 hover:underline cursor-pointer"
                  >
                    <span>Test on Dataset</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
