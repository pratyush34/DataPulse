import { Activity, ShieldCheck, Mail, ArrowUp, Globe2, Share2, Terminal } from 'lucide-react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#02050e] border-t border-blue-950 text-gray-400 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
        {/* Brand */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Data<span className="text-blue-500">Pulse</span>
            </span>
          </div>
          <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
            Scan your datasets before training and get a ranked list of the data problems most likely
            to break your pipeline, degrade your model, or inflate your metrics.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a
              href="#scanner"
              className="w-9 h-9 rounded-xl bg-slate-900 border border-blue-900/40 hover:border-blue-500 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Dataset Scanner"
            >
              <Terminal className="w-4 h-4" />
            </a>
            <a
              href="#services"
              className="w-9 h-9 rounded-xl bg-slate-900 border border-blue-900/40 hover:border-blue-500 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Architecture"
            >
              <Globe2 className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Diagnostics
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a href="#services" className="hover:text-blue-400 transition-colors">
                Robust Ingestion
              </a>
            </li>
            <li>
              <a href="#services" className="hover:text-blue-400 transition-colors">
                Rule Integrity Checks
              </a>
            </li>
            <li>
              <a href="#services" className="hover:text-blue-400 transition-colors">
                Leakage & Label Noise
              </a>
            </li>
            <li>
              <a href="#services" className="hover:text-blue-400 transition-colors">
                Retraining Verification
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Integrations & Formats
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-1.5 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>CSV & TSV Streaming</span>
            </li>
            <li className="flex items-center gap-1.5 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>JSONL & NDJSON Corpora</span>
            </li>
            <li className="flex items-center gap-1.5 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Scikit-Learn Baselines</span>
            </li>
            <li className="flex items-center gap-1.5 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Local Air-Gapped Scanning</span>
            </li>
          </ul>
        </div>

        {/* Action */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Try Demo
          </h4>
          <p className="text-xs text-gray-400 mb-4">
            Evaluate DataPulse against known synthetic faults in under 4 seconds.
          </p>
          <a
            href="#scanner"
            className="block text-center w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
          >
            Launch Scanner
          </a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
        <p>© {new Date().getFullYear()} DataPulse. Dataset failure predictor for modern ML teams.</p>
        <div className="flex items-center gap-6">
          <a href="#home" className="hover:text-gray-300 transition-colors">
            MIT License
          </a>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
