import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileSpreadsheet,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

const PRIORITY_BADGES = {
  Critical: { bg: 'bg-red-500/20 text-red-300 border-red-500/40', icon: '🔴' },
  High: { bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: '🟠' },
  Medium: { bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', icon: '🟡' },
  Low: { bg: 'bg-slate-700/40 text-gray-300 border-slate-600/40', icon: '⚪' },
};

const EFFECT_BADGES = {
  'inflates metrics': 'bg-purple-950/60 text-purple-300 border-purple-500/30',
  'degrades model': 'bg-amber-950/60 text-amber-300 border-amber-500/30',
  'breaks pipeline': 'bg-rose-950/60 text-rose-300 border-rose-500/30',
};

export default function ScannerWorkspace() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDemo, setIsDemo] = useState(true);
  const [targetCol, setTargetCol] = useState('label');
  const [availableCols, setAvailableCols] = useState([
    'applicant_id',
    'age',
    'annual_income',
    'loan_amount',
    'credit_score',
    'employment',
    'region',
    'label',
    'review_flag',
  ]);
  const [useModelChecks, setUseModelChecks] = useState(true);

  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('issues');
  const [expandedIssue, setExpandedIssue] = useState(0);

  // Verification state per issue id
  const [verifyingId, setVerifyingId] = useState(null);
  const [verificationResults, setVerificationResults] = useState({});

  // Auto-run demo scan on first load
  useEffect(() => {
    runScan(true);
  }, []);

  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    if (!uploaded) return;
    setFile(uploaded);
    setFileName(uploaded.name);
    setIsDemo(false);
  };

  const runScan = async (useDemoParam = false) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      if (useDemoParam || (!file && isDemo)) {
        formData.append('use_demo', 'true');
      } else if (file) {
        formData.append('file', file);
      } else {
        formData.append('use_demo', 'true');
      }

      formData.append('target', targetCol || 'label');
      formData.append('use_model', useModelChecks ? 'true' : 'false');

      const res = await fetch('http://localhost:8000/api/scan', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to scan dataset.');
      }

      const data = await res.json();
      setScanResult(data);
      if (data.columns && data.columns.length > 0) {
        setAvailableCols(data.columns.map((c) => c.name));
      }
      setVerificationResults({});
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error connecting to DataPulse backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (issueId) => {
    setVerifyingId(issueId);
    try {
      const res = await fetch('http://localhost:8000/api/verify-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_id: issueId }),
      });
      const data = await res.json();
      setVerificationResults((prev) => ({
        ...prev,
        [issueId]: data,
      }));
    } catch (err) {
      console.error(err);
      setVerificationResults((prev) => ({
        ...prev,
        [issueId]: { ok: false, error: 'Verification failed.' },
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <section id="scanner" className="relative w-full bg-[#030712] py-20 px-4 sm:px-6 lg:px-8">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="absolute top-20 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-4 backdrop-blur-md">
            <Cpu className="w-3.5 h-3.5" />
            Live Pre-Training Diagnostic Engine
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Interactive Dataset Scanner
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            Scan your tabular training data for silent pipeline killers, leaky post-outcome variables,
            and mislabeled rows ranked by mathematical impact.
          </p>
        </div>

        {/* Scanner Control Deck */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-900/80 to-[#070d1e]/90 border border-blue-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left: Dataset Selector */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                Select Training Dataset
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDemo(true);
                    setFile(null);
                    setFileName('demo_loans.csv');
                    runScan(true);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                    isDemo
                      ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                      : 'bg-slate-900/80 text-gray-300 border-slate-700/60 hover:border-blue-500/50'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Load Demo (Loan Approvals)
                </button>

                <label className="relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/80 hover:bg-slate-850 text-gray-300 border border-slate-700/60 hover:border-blue-500/50 transition-colors cursor-pointer flex items-center justify-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  <span>{fileName && !isDemo ? fileName : 'Upload CSV / JSONL'}</span>
                  <input
                    type="file"
                    accept=".csv,.tsv,.jsonl,.ndjson,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <span className="text-[11px] text-gray-400">
                {isDemo
                  ? 'Loaded: demo_loans.csv (2,065 rows with synthetic injected faults)'
                  : fileName
                  ? `Loaded: ${fileName}`
                  : 'Pure-python robust CSV/JSONL parsing with line preservation'}
              </span>
            </div>

            {/* Middle: Target selection & Model checks toggle */}
            <div className="lg:col-span-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  Target (Label) Column
                </label>
                <select
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  className="w-full bg-slate-900/90 border border-blue-900/40 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="label">label (Inferred)</option>
                  <option value="(none)">(none - unsupervised)</option>
                  {availableCols
                    .filter((c) => c !== 'label')
                    .map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 sm:pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useModelChecks}
                    onChange={(e) => setUseModelChecks(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-300">Model Checks</span>
                </label>
              </div>
            </div>

            {/* Right: Scan Action Button */}
            <div className="lg:col-span-3 flex justify-end">
              <button
                type="button"
                onClick={() => runScan(isDemo)}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(37,99,235,0.6)] hover:shadow-[0_0_35px_rgba(37,99,235,0.85)] border border-blue-400/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scanning Dataset…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Execute Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Scan Results View */}
        {scanResult && (
          <div className="space-y-8">
            {/* 5 Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/60 border border-blue-900/30 backdrop-blur-md">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Rows</span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {scanResult.meta?.rows?.toLocaleString() || '0'}
                </p>
                <span className="text-[11px] text-blue-400 font-mono">100% captured</span>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-blue-900/30 backdrop-blur-md">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Columns</span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {scanResult.meta?.columns || '0'}
                </p>
                <span className="text-[11px] text-gray-400 font-mono">Schema typed</span>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-blue-900/30 backdrop-blur-md">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Issues Found</span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {scanResult.total_issues || '0'}
                </p>
                <span className="text-[11px] text-amber-400 font-mono">Ranked by impact</span>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-blue-900/30 backdrop-blur-md">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Critical / High</span>
                <p className="text-2xl sm:text-3xl font-black text-red-400 mt-1">
                  {scanResult.critical_high || '0'}
                </p>
                <span className="text-[11px] text-red-400/80 font-mono">Immediate risk</span>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-blue-900/30 backdrop-blur-md col-span-2 sm:col-span-1">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Baseline CV {scanResult.meta?.cv_metric || ''}
                </span>
                <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
                  {scanResult.meta?.cv_score ? scanResult.meta.cv_score.toFixed(3) : 'N/A'}
                </p>
                <span className="text-[11px] text-gray-400 font-mono">
                  Trivial: {scanResult.meta?.trivial_baseline ? scanResult.meta.trivial_baseline.toFixed(3) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-3 border-b border-blue-900/40 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('issues')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === 'issues'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Ranked Issues ({scanResult.issues?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('columns')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === 'columns'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Column Profile ({scanResult.columns?.length || 0})
              </button>
            </div>

            {/* Tab 1: Ranked Issues List */}
            {activeTab === 'issues' && (
              <div className="space-y-4">
                <div className="text-xs text-gray-400 flex items-center justify-between pb-1">
                  <span>
                    Formula: <code className="text-blue-300 font-mono">impact = 100 × severity × col. weight × extent</code>
                  </span>
                  <span>Click any card to inspect corrupted rows or measure retraining impact</span>
                </div>

                {scanResult.issues?.map((it, idx) => {
                  const isExpanded = expandedIssue === idx;
                  const priorityMeta = PRIORITY_BADGES[it.priority] || PRIORITY_BADGES.Low;
                  const effectClass = EFFECT_BADGES[it.effect] || 'bg-slate-800 text-gray-300';
                  const verification = verificationResults[it.id];

                  return (
                    <div
                      key={it.id}
                      className="rounded-xl bg-slate-900/60 border border-blue-900/30 hover:border-blue-500/40 transition-all overflow-hidden"
                    >
                      {/* Card Header Accordion Trigger */}
                      <div
                        onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-500 font-bold w-6">
                            #{idx + 1}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${priorityMeta.bg}`}
                          >
                            <span>{priorityMeta.icon}</span>
                            <span>{it.priority}</span>
                          </span>
                          <h4 className="text-base font-bold text-white group-hover:text-blue-200">
                            {it.title}
                          </h4>
                          {it.n_rows > 0 && (
                            <span className="text-xs text-gray-400 font-mono">
                              [{it.n_rows} rows]
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${effectClass}`}
                          >
                            {it.effect}
                          </span>

                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-blue-400 font-mono">
                              {it.impact.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                              Impact
                            </span>
                          </div>

                          <div className="p-1 rounded text-gray-400 hover:text-white">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Card Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-5 pb-6 pt-2 border-t border-blue-950/60 bg-[#060a17]/80 space-y-4"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                                <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5">
                                  What Was Detected
                                </h5>
                                <p className="text-xs text-gray-300 leading-relaxed">{it.detail}</p>
                              </div>

                              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                                <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                                  Recommended Pipeline Fix
                                </h5>
                                <p className="text-xs text-gray-300 leading-relaxed">{it.fix}</p>
                              </div>
                            </div>

                            {/* Verification Block */}
                            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div>
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-blue-400" />
                                  Empirical Verification (Retrain Delta)
                                </span>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Retrain model without these flagged rows across 3 repeats to measure actual validation impact.
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                {verification && verification.ok && (
                                  <div className="text-right">
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                      {verification.metric}: {verification.before?.toFixed(3)} → {verification.after?.toFixed(3)}
                                    </span>
                                    <div className="text-[10px] text-blue-300 font-mono">
                                      delta {verification.delta >= 0 ? `+${verification.delta.toFixed(3)}` : verification.delta.toFixed(3)} ± {verification.spread.toFixed(3)} (removed {verification.removed})
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleVerify(it.id)}
                                  disabled={verifyingId === it.id || it.n_rows === 0}
                                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-1.5"
                                >
                                  {verifyingId === it.id ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Measuring…</span>
                                    </>
                                  ) : (
                                    <>
                                      <TrendingUp className="w-3.5 h-3.5" />
                                      <span>Measure Impact</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Sample Row Indices */}
                            {it.rows_sample && it.rows_sample.length > 0 && (
                              <div className="pt-1">
                                <span className="text-[11px] text-gray-400 font-mono block mb-1">
                                  Sample Corrupted Row Indices (up to 50):
                                </span>
                                <div className="p-2.5 rounded bg-black/60 border border-slate-800 text-[11px] font-mono text-blue-300/90 overflow-x-auto">
                                  {it.rows_sample.join(', ')}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Column Profiles */}
            {activeTab === 'columns' && (
              <div className="rounded-xl bg-slate-900/60 border border-blue-900/30 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#060a17] text-gray-400 uppercase font-mono border-b border-blue-950">
                    <tr>
                      <th className="p-3.5">Column</th>
                      <th className="p-3.5">Inferred Type</th>
                      <th className="p-3.5">Missing Count</th>
                      <th className="p-3.5">Missing %</th>
                      <th className="p-3.5">Unique Values</th>
                      <th className="p-3.5">Role / Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-gray-300">
                    {scanResult.columns?.map((col) => (
                      <tr key={col.name} className="hover:bg-blue-950/20">
                        <td className="p-3.5 font-bold text-white">{col.name}</td>
                        <td className="p-3.5 text-blue-300">{col.type}</td>
                        <td className="p-3.5">{col.missing}</td>
                        <td className="p-3.5">
                          <span className={col.missing_pct > 5 ? 'text-amber-400' : 'text-gray-400'}>
                            {col.missing_pct}%
                          </span>
                        </td>
                        <td className="p-3.5">{col.unique}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            {col.is_target && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                Target (y)
                              </span>
                            )}
                            {col.is_leak && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                Leaky Feature
                              </span>
                            )}
                            {col.is_id && (
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                Identifier
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
