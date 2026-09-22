import React, { useState } from 'react';
import { X, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { loginUser, registerUser, sendOtp, verifyOtp } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'password' | 'otp' | 'register'>('password');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@luxion.ai');
  const [password, setPassword] = useState('password123');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await sendOtp(email);
      setOtpSent(true);
      setInfoMessage('Verification code has been generated and sent.');
      if (res.devCode) {
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (mode === 'password') {
        const res = await loginUser(email, password);
        onSuccess(res.user, res.token);
        onClose();
      } else if (mode === 'otp') {
        if (!otpSent) {
          await handleSendOtp();
          return;
        }
        if (!otpCode.trim()) {
          setError('Please enter the 6-digit verification code.');
          setIsLoading(false);
          return;
        }
        const res = await verifyOtp(email, otpCode.trim());
        onSuccess(res.user, res.token);
        onClose();
      } else {
        const res = await registerUser(name || email.split('@')[0], email, password);
        onSuccess(res.user, res.token);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="modal-auth-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-auth-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-left"
      >
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-base font-semibold text-white">
          {mode === 'register'
            ? 'Create Account'
            : mode === 'otp'
            ? 'OTP Verification Sign In'
            : 'Sign In to LUXION'}
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {mode === 'register'
            ? 'Start your conversation'
            : mode === 'otp'
            ? 'Sign in via one-time secure code'
            : 'Access your saved sessions'}
        </p>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-950 p-1 my-4 border border-neutral-800 text-[11px]">
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setError(null);
              setInfoMessage(null);
            }}
            className={`rounded-lg py-1.5 font-medium transition-all ${
              mode === 'password' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setError(null);
              setInfoMessage(null);
            }}
            className={`rounded-lg py-1.5 font-medium transition-all ${
              mode === 'otp' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            OTP Code
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setInfoMessage(null);
            }}
            className={`rounded-lg py-1.5 font-medium transition-all ${
              mode === 'register' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
            />
          </div>

          {mode !== 'otp' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>
          )}

          {mode === 'otp' && (
            <div>
              {otpSent ? (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-neutral-300">
                      6-Digit Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[10px] text-neutral-400 hover:text-white underline"
                    >
                      Resend
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter code (e.g. 123456)"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-center tracking-[0.25em] font-mono text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Send OTP Verification Code</span>
                </button>
              )}
            </div>
          )}

          {infoMessage && (
            <div className="rounded-xl border border-neutral-700/60 bg-neutral-950/80 p-2.5 text-xs text-neutral-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {(mode !== 'otp' || otpSent) && (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 rounded-xl bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-950 hover:bg-white transition-colors disabled:opacity-50"
            >
              {isLoading
                ? 'Processing...'
                : mode === 'password'
                ? 'Sign In'
                : mode === 'otp'
                ? 'Verify & Sign In'
                : 'Create Account'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
