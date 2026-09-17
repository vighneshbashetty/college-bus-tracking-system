import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, ShieldCheck, RefreshCw, Printer, Clock, User, Bus, Sparkles, Copy, Check, LogOut } from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '@/services/api';

interface DigitalPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  user: { name: string; email: string; role: string };
  isDemoMode?: boolean;
}

interface PassData {
  pass_code: string;
  student_name: string;
  student_email: string;
  route_id: string;
  status: string;
  created_at: string;
  scanned_at?: string;
  scanned_by_bus_id?: string;
}

export const DigitalPassModal: React.FC<DigitalPassModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  user,
  isDemoMode = true
}) => {
  const [pass, setPass] = useState<PassData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (pass?.pass_code) {
      QRCode.toDataURL(pass.pass_code, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 256,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [pass?.pass_code]);

  const saveDemoPass = (newPass: PassData) => {
    try {
      const stored = localStorage.getItem('campustrack_demo_passes');
      const passes: PassData[] = stored ? JSON.parse(stored) : [];
      const idx = passes.findIndex((p) => p.student_email === newPass.student_email);
      if (idx >= 0) {
        passes[idx] = newPass;
      } else {
        passes.push(newPass);
      }
      localStorage.setItem('campustrack_demo_passes', JSON.stringify(passes));
      localStorage.setItem(`campustrack_pass_${user.email}`, JSON.stringify(newPass));
    } catch (err) {
      console.error('Error saving demo pass:', err);
    }
  };

  const fetchPass = async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        const stored = localStorage.getItem(`campustrack_pass_${user.email}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPass(parsed);
          saveDemoPass(parsed);
        } else {
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const randHex = Math.random().toString(36).substring(2, 8).toUpperCase();
          const demoPass: PassData = {
            pass_code: `PASS-${dateStr}-${randHex}`,
            student_name: user.name,
            student_email: user.email,
            route_id: 'ALL',
            status: 'active',
            created_at: new Date().toISOString()
          };
          saveDemoPass(demoPass);
          setPass(demoPass);
        }
      } else {
        const data = await api.getMyPass();
        setPass(data);
      }
    } catch (err) {
      console.error('Error fetching pass:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPass();
      setSecondsLeft(300);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handleCopyCode = () => {
    if (!pass?.pass_code) return;
    navigator.clipboard.writeText(pass.pass_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    if (isDemoMode && pass) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const updated: PassData = {
        ...pass,
        pass_code: `PASS-${dateStr}-${randHex}`,
        status: 'active',
        created_at: new Date().toISOString()
      };
      saveDemoPass(updated);
      setPass(updated);
    } else {
      fetchPass();
    }
    setSecondsLeft(300);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-2xl border border-indigo-500/30 overflow-hidden my-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/20 bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-indigo-100">Student Transit Pass</h3>
              <p className="text-xs text-indigo-300/70">Campus Mobility Pass</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Close Pass"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 space-y-5">
          {/* Card Body */}
          <div className="relative p-5 rounded-2xl bg-slate-800/90 border border-slate-700 shadow-inner flex flex-col items-center">
            {/* Security Holographic Bar */}
            <div className="w-full flex items-center justify-between px-3 py-1.5 mb-4 rounded-lg bg-indigo-500/10 border border-indigo-400/20 text-xs text-indigo-300">
              <span className="flex items-center space-x-1 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Campus Pass</span>
              </span>
              <span className="flex items-center space-x-1 font-mono text-[11px] text-indigo-400">
                <Clock className="w-3 h-3" />
                <span>Refreshes in {formatTimer(secondsLeft)}</span>
              </span>
            </div>

            {/* QR Code Container */}
            <div className="relative p-3 bg-white rounded-2xl shadow-xl border-4 border-indigo-400/30">
              {loading || !qrDataUrl ? (
                <div className="w-44 h-44 flex items-center justify-center text-slate-800">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={qrDataUrl}
                    alt="Digital Transit Pass QR Code"
                    className="w-44 h-44 rounded-lg block"
                  />
                  {/* Center Badge overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 border-2 border-white flex items-center justify-center shadow-lg">
                      <Bus className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pass Code string with 1-click Copy */}
            <div className="mt-4 text-center w-full">
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-sm font-bold tracking-wider text-indigo-300 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">
                  {pass?.pass_code || 'LOADING...'}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all text-xs flex items-center gap-1"
                  title="Copy Pass Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {copied && (
                <p className="text-[11px] text-emerald-400 mt-1 font-medium">✓ Pass code copied to clipboard!</p>
              )}

              <div className="mt-2 flex items-center justify-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  pass?.status === 'boarded'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {pass?.status === 'boarded' ? 'Scanned / Boarded' : 'Valid Pass'}
                </span>
                <span className="text-xs text-slate-400">• Route: {pass?.route_id || 'ALL'}</span>
              </div>
            </div>
          </div>

          {/* Student Info Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1">
              <p className="text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Student Name
              </p>
              <p className="font-semibold text-slate-200 truncate">{user.name}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1">
              <p className="text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Access Tier
              </p>
              <p className="font-semibold text-emerald-400">All Campus Lines</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleRegenerate}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>

          {/* Back to Login quick option */}
          {onLogout && (
            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="text-xs text-slate-400 hover:text-rose-300 flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Return to Login screen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
