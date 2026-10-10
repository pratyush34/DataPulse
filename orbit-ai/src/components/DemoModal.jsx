import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle2, Send, Orbit } from 'lucide-react';

export default function DemoModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service: 'Data Collection',
    details: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      email: '',
      company: '',
      service: 'Data Collection',
      details: '',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-xl rounded-2xl bg-[#080d1e] border border-blue-500/30 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(37,99,235,0.4)] z-10 overflow-hidden"
          >
            {/* Ambient Corner Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-blue-950/50 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {!submitted ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Orbit className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                      Orbit AI • Enterprise Consultation
                    </span>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      Request Custom Demo
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-6">
                  Speak directly with an AI data architect to evaluate throughput, accuracy SLAs,
                  and custom pipeline schemas for your foundation model.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Dr. Alex Rivera"
                        className="w-full bg-slate-900/90 border border-blue-900/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="alex@frontier-ai.com"
                        className="w-full bg-slate-900/90 border border-blue-900/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Organization *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Frontier Research Labs"
                        className="w-full bg-slate-900/90 border border-blue-900/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Primary Need *
                      </label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full bg-slate-900/90 border border-blue-900/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option>Data Collection (Global Reach)</option>
                        <option>Data Annotation (High Precision)</option>
                        <option>RLHF & Fine-Tuning</option>
                        <option>Model Evaluation & Red Teaming</option>
                        <option>Full End-to-End Pipeline</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Dataset Requirements / Timeline
                    </label>
                    <textarea
                      rows={3}
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      placeholder="e.g. 50,000 multimodal conversational dialogs across 12 languages with expert verification..."
                      className="w-full bg-slate-900/90 border border-blue-900/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-[0_0_25px_rgba(37,99,235,0.6)] hover:shadow-[0_0_35px_rgba(37,99,235,0.8)] border border-blue-400/40 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Demo Request</span>
                    </button>
                    <p className="text-center text-[11px] text-gray-400 mt-3">
                      Instant NDA available • Guaranteed response within 12 business hours
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-400 flex items-center justify-center text-blue-400 mx-auto mb-5 shadow-[0_0_25px_rgba(37,99,235,0.5)]">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Demo Request Received!
                </h3>
                <p className="text-gray-300 text-sm max-w-sm mx-auto mb-6">
                  Thank you, <span className="text-blue-400 font-semibold">{formData.name || 'there'}</span>.
                  A Senior AI Solutions Architect from Orbit AI will reach out to you shortly at{' '}
                  <span className="text-white font-mono">{formData.email || 'your email'}</span>.
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Close & Explore Platform
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
