"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LayoutDashboard, UserPlus, X } from "lucide-react";

const AUTH_KEY = "glassportal_consultant_auth";
const SESSION_KEY = "glassportal_consultant_session";

interface ConsultantAccount {
  email: string;
  secret: string;
  name: string;
  createdAt: string;
}

function encodeSecret(password: string) {
  if (typeof window === "undefined") return password;
  return window.btoa(unescape(encodeURIComponent(`gp:${password}`)));
}

function loadAccounts(): ConsultantAccount[] {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConsultantAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(list: ConsultantAccount[]) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(list));
}

export function getConsultantSession(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearConsultantSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

type AuthMode = "signin" | "register";

export interface ConsultantAuthFormProps {
  intent?: "private-link" | "save" | "default";
  initialMode?: AuthMode;
  onSuccess: (email: string) => void;
  /** Compact copy for modal; page uses fuller framing outside the form */
  compact?: boolean;
}

export function ConsultantAuthForm({
  intent = "default",
  initialMode = "signin",
  onSuccess,
  compact = true,
}: ConsultantAuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setError("");
    setPassword("");
  }, [initialMode, intent]);

  const intentCopy =
    intent === "private-link"
      ? "Sign in to create a private client link."
      : intent === "save"
        ? "Sign in to publish this portal for your client."
        : "Sign in to unlock publishing and client delivery."

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    if (!cleanEmail || !cleanPass) {
      setError("Email and password are required.");
      return;
    }

    const accounts = loadAccounts();

    if (mode === "register") {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (accounts.some((a) => a.email === cleanEmail)) {
        setError("An account with this email already exists. Sign in instead.");
        return;
      }
      saveAccounts([
        ...accounts,
        {
          email: cleanEmail,
          secret: encodeSecret(cleanPass),
          name: name.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      sessionStorage.setItem(SESSION_KEY, cleanEmail);
      onSuccess(cleanEmail);
      return;
    }

    const hit = accounts.find((a) => a.email === cleanEmail);
    if (!hit || hit.secret !== encodeSecret(cleanPass)) {
      setError("Invalid email or password.");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, cleanEmail);
    onSuccess(cleanEmail);
  };

  return (
    <div className={compact ? "" : "w-full"}>
      {compact ? (
        <p className="text-sm leading-relaxed text-slate-600">{intentCopy}</p>
      ) : null}

      <div
        className={`${compact ? "mt-4" : ""} flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1`}
      >
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError("");
          }}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
            mode === "signin"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError("");
          }}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
            mode === "register"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        {mode === "register" ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              className="mech-input"
            />
          </label>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-600">Work Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@advisoryfirm.com"
            className="mech-input"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-600">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mech-input"
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {mode === "register" ? (
            <>
              <UserPlus className="h-4 w-4" />
              Create account & continue
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Continue
            </>
          )}
        </button>
      </form>
    </div>
  );
}

interface AuthModalProps {
  open: boolean;
  intent?: "private-link" | "save" | "default";
  onClose: () => void;
  onSuccess: (email: string) => void;
}

/** Lightweight sign-in / register modal — only for privileged studio actions. */
export function AuthModal({
  open,
  intent = "default",
  onClose,
  onSuccess,
}: AuthModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <LayoutDashboard className="h-5 w-5 text-slate-900" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              GlassPortal
            </p>
            <h2
              id="auth-modal-title"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              Consultant Access
            </h2>
          </div>
        </div>

        <div className="mt-3">
          <ConsultantAuthForm intent={intent} onSuccess={onSuccess} />
        </div>
      </div>
    </div>
  );
}
