import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Sparkles, Activity } from 'lucide-react';

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! I am your DataPulse Diagnostic Assistant. Ask me anything about dataset integrity, leakage detection, or how our mathematical impact scores are calculated.',
      time: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');

  const quickQuestions = [
    'How is impact score calculated?',
    'How is target leakage detected?',
    'What are disguised missing values?',
    'Why does retraining verify the impact?',
  ];

  const handleSend = (textToSend) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    // Instant smart response tailored to DataPulse
    setTimeout(() => {
      let replyText =
        'DataPulse evaluates datasets across four layers: raw parsing without truncation, heuristic rule checks, model-based mutual information & out-of-fold label noise, and empirical retraining verification.';

      const q = query.toLowerCase();
      if (q.includes('impact') || q.includes('formula') || q.includes('score')) {
        replyText =
          'Impact score is computed as: impact = 100 × base_severity × column_weight × extent(affected rows). Column weight is derived from mutual information with the target column; pipeline-breaking issues receive at least 0.8 weight.';
      } else if (q.includes('leak') || q.includes('leakage')) {
        replyText =
          'Single-feature leakage checks isolate columns (like post-outcome flags) that artificially predict the target. Leaky features are removed before label-noise estimation so they do not "explain away" corrupt labels!';
      } else if (q.includes('missing') || q.includes('disguised')) {
        replyText =
          'Disguised missing values include tokens like "N/A", "?", "-", "missing", or sentinel numbers (-999, 9999). Standard parsers treat them as valid strings or numbers, contaminating model baselines.';
      } else if (q.includes('retrain') || q.includes('verify')) {
        replyText =
          'Heuristic rankings and true model effects do not always agree! That is why DataPulse retrains a model with vs. without flagged rows on identical held-out test splits across 3 repeats to measure the true macro-F1 delta.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: replyText,
          time: 'Just now',
        },
      ]);
    }, 500);
  };

  return (
    <>
      {/* Interactive Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 rounded-2xl bg-[#090d1a] border border-blue-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(37,99,235,0.3)] backdrop-blur-2xl overflow-hidden flex flex-col max-h-[520px]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-4 flex items-center justify-between text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-blue-900/60 border border-blue-400/40 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-200" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-blue-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-wide">DataPulse Assistant</h4>
                  <p className="text-[11px] text-blue-200">Online • Dataset Diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-blue-100 hover:text-white"
                aria-label="Close assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-72 text-sm">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                        : 'bg-slate-800/80 text-gray-200 rounded-bl-none border border-slate-700/60'
                    }`}
                  >
                    <p className="text-xs sm:text-sm leading-relaxed">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 px-1">{m.time}</span>
                </div>
              ))}
            </div>

            {/* Quick Questions Chips */}
            <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/50 flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/20 transition-colors text-left cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-[#060a14] border-t border-blue-950/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about dataset checks..."
                className="flex-1 bg-slate-900/80 border border-blue-900/40 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-[0_0_12px_rgba(37,99,235,0.5)] transition-all"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Floating Action Button: Fixed in bottom-left corner, rounded square, solid blue background, white chat bubble icon, continuous gentle pulse animation */}
      <div className="fixed bottom-6 left-6 z-40">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              '0 0 15px rgba(37, 99, 235, 0.4), 0 0 0 0px rgba(37, 99, 235, 0.6)',
              '0 0 25px rgba(37, 99, 235, 0.7), 0 0 0 10px rgba(37, 99, 235, 0.0)',
              '0 0 15px rgba(37, 99, 235, 0.4), 0 0 0 0px rgba(37, 99, 235, 0.6)',
            ],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="rounded-2xl"
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 border border-blue-400/40 shadow-lg"
            aria-label="Open DataPulse AI Assistant"
            title="DataPulse Diagnostic Assistant"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <MessageSquare className="w-6 h-6 text-white" strokeWidth={2} />
            )}
          </button>
        </motion.div>
      </div>
    </>
  );
}
