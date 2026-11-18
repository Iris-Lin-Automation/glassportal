"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LayoutDashboard, UserPlus, X } from "lucide-react";

const SESSION_KEY = "glassportal_consultant_session";

export function getConsultantSession(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearConsultantSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError("");
    setPassword("");
  }, [initialMode, intent]);

  // Rehydrate local session marker from httpOnly cookie when possible
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { email?: string };
        if (json.email) {
          sessionStorage.setItem(SESSION_KEY, json.email);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const intentCopy =
    intent === "private-link"
      ? "Sign in to create a private client link."
      : intent === "save"
        ? "Sign in to publish this portal for your client."
        : "Sign in to unlock publishing and client delivery.";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    if (!cleanEmail || !cleanPass) {
      setError("Email and password are required.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      if (mode === "register" && !name.trim()) {
        setError("Please enter your name.");
        setBusy(false);
        return;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
          name: name.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
      };
      if (!res.ok) {
        setError(json.error || "Authentication failed.");
        return;
      }
      const signedIn = (json.email || cleanEmail).toLowerCase();
      sessionStorage.setItem(SESSION_KEY, signedIn);
      onSuccess(signedIn);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
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
            placeholder="you@firm.com"
            className="mech-input"
            autoComplete="email"
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
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </label>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mode === "register" ? (
            <UserPlus className="h-4 w-4" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export interface AuthModalProps {
  open: boolean;
  intent?: ConsultantAuthFormProps["intent"];
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export function AuthModal({
  open,
  intent = "default",
  onClose,
  onSuccess,
}: AuthModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <LayoutDashboard className="h-4 w-4 text-slate-800" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              Consultant access
            </p>
            <h2 className="text-base font-semibold text-slate-900">
              Sign in to GlassPortal
            </h2>
          </div>
        </div>
        <ConsultantAuthForm
          intent={intent}
          onSuccess={(email) => {
            onSuccess(email);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
