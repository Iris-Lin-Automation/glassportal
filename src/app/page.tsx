"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  StudioMobileWizard,
  type StudioMobileStep,
} from "@/components/studio/StudioMobileWizard";
import type { PortalData, PortalTheme } from "@/lib/types";
import {
  compressLogoDataUrl,
  extractBrandColor,
} from "@/lib/brand-color";
import {
  createSamplePortalData,
  isSamplePortal,
  SAMPLE_COVER_URL,
} from "@/lib/sample-portal";
import {
  THEME_PRESETS,
  getThemePreset,
  normalizeThemeId,
  themeBrandColor,
} from "@/lib/theme-presets";
import { GlassCard } from "@/components/ui/GlassCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { BrandFavicon } from "@/components/portal/BrandFavicon";
import {
  AuthModal,
  clearConsultantSession,
  getConsultantSession,
} from "@/components/studio/AuthModal";
import {
  VipShareCard,
  type VipShareConfig,
} from "@/components/studio/VipShareCard";
import { PlanBillingCard } from "@/components/studio/PlanBillingCard";
import type { PlanId } from "@/config/plans";
import { getPlan, planShowsWatermark } from "@/config/plans";

const TOKEN_KEY = "glassportal_notion_token";
const THEME_KEY = "glassportal_theme";
const BRAND_KEY = "glassportal_branding";

function makeAccessToken() {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function encodeGate(passcode: string) {
  if (typeof window === "undefined") return passcode;
  return `b64.${btoa(unescape(encodeURIComponent(passcode)))}`;
}

type AuthIntent = "private-link" | "save";

export default function BuilderPage() {
  const [token, setToken] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [theme, setTheme] = useState<PortalTheme>("mckinsey-slate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PortalData | null>(() =>
    createSamplePortalData()
  );
  const [portalPath, setPortalPath] = useState("");
  const [privatePath, setPrivatePath] = useState("");
  const [copied, setCopied] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [liveSync] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>("private-link");
  const pendingAction = useRef<null | (() => void)>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [planId, setPlanId] = useState<PlanId>("starter");
  const [mobileStep, setMobileStep] = useState<StudioMobileStep>(0);

  const [clientName, setClientName] = useState("Acme Corporation");
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [brandColor, setBrandColor] = useState("#475569");
  const [passcodeEnabled, setPasscodeEnabled] = useState(true);
  const [passcode, setPasscode] = useState("Acme2026");
  const [accessToken, setAccessToken] = useState("");
  const [linkExpiry, setLinkExpiry] = useState("7");
  const [shareConfig, setShareConfig] = useState<VipShareConfig>({
    cardTitle: "Acme Group 2026 Strategic Advisory Report",
    cardSubtitle:
      "Confidential executive briefing — prepared exclusively for the CEO & CFO.",
    confidentialLabel: "Strictly Confidential",
    domainHint: "glassportal.app",
  });

  useEffect(() => {
    setSessionEmail(getConsultantSession());
    setToken(localStorage.getItem(TOKEN_KEY) || "");
    const savedTheme = normalizeThemeId(localStorage.getItem(THEME_KEY));
    setTheme(savedTheme);
    try {
      const brand = JSON.parse(localStorage.getItem(BRAND_KEY) || "{}") as {
        clientName?: string;
        logoDataUrl?: string;
        brandColor?: string;
        passcodeEnabled?: boolean;
        passcode?: string;
        accessToken?: string;
        linkExpiry?: string;
        shareConfig?: VipShareConfig;
      };
      if (brand.clientName) setClientName(brand.clientName);
      if (brand.logoDataUrl) setLogoDataUrl(brand.logoDataUrl);
      // Theme preset color applies unless a custom logo-sampled color was saved
      if (brand.brandColor) setBrandColor(brand.brandColor);
      else setBrandColor(themeBrandColor(savedTheme));
      if (typeof brand.passcodeEnabled === "boolean")
        setPasscodeEnabled(brand.passcodeEnabled);
      if (brand.passcode) setPasscode(brand.passcode);
      if (brand.accessToken) setAccessToken(brand.accessToken);
      else setAccessToken(makeAccessToken());
      if (brand.linkExpiry) setLinkExpiry(brand.linkExpiry);
      if (brand.shareConfig) {
        setShareConfig((prev) => ({ ...prev, ...brand.shareConfig }));
      }
    } catch {
      setAccessToken(makeAccessToken());
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    localStorage.setItem(
      BRAND_KEY,
      JSON.stringify({
        clientName,
        logoDataUrl,
        brandColor,
        passcodeEnabled,
        passcode,
        accessToken,
        linkExpiry,
        shareConfig,
      })
    );
  }, [
    clientName,
    logoDataUrl,
    brandColor,
    passcodeEnabled,
    passcode,
    accessToken,
    linkExpiry,
    shareConfig,
  ]);

  const themePreset = getThemePreset(theme);

  const displayData = useMemo(() => {
    if (!data) return null;
    // Portal body always prefers the Notion page title; VIP cardTitle is for share/OG only
    const title =
      (data.title || "").trim() ||
      shareConfig.cardTitle.trim() ||
      `${clientName} 2026 Strategic Advisory Report`;
    return {
      ...data,
      title,
      description: shareConfig.cardSubtitle || data.description,
      clientName: clientName.trim() || data.clientName,
      icon: logoDataUrl || data.icon,
      brandColor,
      preparedFor: data.preparedFor?.trim() || undefined,
      password: passcodeEnabled && passcode.trim() ? passcode.trim() : data.password,
      status: passcodeEnabled ? "encrypted" : data.status,
      statusLabel: passcodeEnabled
        ? "Passcode Protected"
        : data.statusLabel?.trim() || "Proposal Ready",
      badge:
        shareConfig.confidentialLabel.trim() ||
        data.badge?.trim() ||
        undefined,
    } as PortalData;
  }, [
    data,
    clientName,
    logoDataUrl,
    brandColor,
    passcodeEnabled,
    passcode,
    shareConfig,
  ]);

  const syncActive = Boolean(token.trim() && data && !isSamplePortal(data));
  const isGuest = !sessionEmail;
  const usingSample = isSamplePortal(data);
  /** Mobile wizard: allow leaving Connect once Sample is up or Notion is linked */
  const canAdvanceFromConnect = usingSample || syncActive;

  const loadSampleReport = () => {
    setError("");
    setData(createSamplePortalData());
    setClientName("Acme Corporation");
    setShareConfig((prev) => ({
      ...prev,
      cardTitle: "Acme Group 2026 Strategic Advisory Report",
      cardSubtitle:
        "Confidential executive briefing — prepared exclusively for the CEO & CFO.",
      confidentialLabel: "Strictly Confidential",
    }));
    setPortalPath("");
    setPrivatePath("");
    setLastSyncedAt("");
  };

  const persistBranding = async (
    pageId: string,
    overrides?: { logoDataUrl?: string; brandColor?: string; theme?: PortalTheme },
    opts?: { publish?: boolean }
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const email = getConsultantSession();
      const res = await fetch(`/api/branding/${encodeURIComponent(pageId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(email ? { "x-consultant-email": email } : {}),
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          logoDataUrl: (overrides?.logoDataUrl ?? logoDataUrl) || undefined,
          brandColor: overrides?.brandColor ?? brandColor,
          theme: overrides?.theme ?? theme,
          cardTitle: shareConfig.cardTitle.trim() || undefined,
          cardSubtitle: shareConfig.cardSubtitle.trim() || undefined,
          confidentialLabel: shareConfig.confidentialLabel.trim() || undefined,
          passcodeEnabled,
          passcode:
            passcodeEnabled && passcode.trim() ? passcode.trim() : undefined,
          ownerEmail: email || undefined,
          publish: opts?.publish === true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          error:
            (json as { error?: string }).error ||
            "Failed to save branding / publish.",
        };
      }
      const ent = (json as { entitlements?: { plan?: PlanId } }).entitlements;
      if (ent?.plan) setPlanId(ent.plan);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error while saving branding." };
    }
  };

  const onLogoUpload = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for the logo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = String(reader.result || "");
      const compressed = await compressLogoDataUrl(raw);
      const color = await extractBrandColor(compressed);
      setLogoDataUrl(compressed);
      setBrandColor(color);
      if (data?.id) {
        void persistBranding(data.id, {
          logoDataUrl: compressed,
          brandColor: color,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const buildPaths = (pageId: string, cleanToken: string) => {
    const expiryQs =
      linkExpiry && linkExpiry !== "never"
        ? `&expiresIn=${encodeURIComponent(linkExpiry)}d`
        : "";
    const ogQs = [
      shareConfig.cardTitle.trim()
        ? `ogTitle=${encodeURIComponent(shareConfig.cardTitle.trim())}`
        : "",
      shareConfig.cardSubtitle.trim()
        ? `ogDesc=${encodeURIComponent(shareConfig.cardSubtitle.trim())}`
        : "",
      shareConfig.confidentialLabel.trim()
        ? `ogBadge=${encodeURIComponent(shareConfig.confidentialLabel.trim())}`
        : "",
      clientName.trim()
        ? `client=${encodeURIComponent(clientName.trim())}`
        : "",
    ]
      .filter(Boolean)
      .map((q) => `&${q}`)
      .join("");

    // Put gate immediately after nt so long OG params cannot truncate it away
    const gateQs =
      passcodeEnabled && passcode.trim()
        ? `&gate=${encodeURIComponent(encodeGate(passcode.trim()))}`
        : "";

    const root = `/p/${encodeURIComponent(pageId)}?nt=${encodeURIComponent(cleanToken)}`;
    const passcodeLink = `${root}${gateQs}${expiryQs}${ogQs}`;
    // Private VIP link: no gate param — ?token= alone bypasses PasswordGate
    const privateLink = accessToken
      ? `${root}&token=${encodeURIComponent(accessToken)}${expiryQs}${ogQs}`
      : passcodeLink;

    return { passcodeLink, privateLink };
  };

  const refreshPathsFromData = (portal: PortalData, cleanToken: string) => {
    const paths = buildPaths(portal.id, cleanToken);
    setPortalPath(paths.passcodeLink);
    setPrivatePath(paths.privateLink);
    return paths;
  };

  // Keep share links + server branding in sync when passcode settings change
  useEffect(() => {
    if (!data?.id || !token.trim()) return;
    refreshPathsFromData(data, token.trim());
    void persistBranding(data.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-link when gate inputs change
  }, [passcodeEnabled, passcode, accessToken, linkExpiry, data?.id]);

  const requireAuth = (intent: AuthIntent, action: () => void) => {
    if (getConsultantSession()) {
      action();
      return;
    }
    setAuthIntent(intent);
    pendingAction.current = action;
    setAuthOpen(true);
  };

  const fetchPortal = async (opts?: {
    silent?: boolean;
  }): Promise<PortalData | null> => {
    if (!opts?.silent) setError("");
    setLoading(true);
    try {
      const cleanToken = token.trim();
      const id = pageInput.trim();
      if (!cleanToken) throw new Error("Notion Integration Token is required.");
      if (!id) throw new Error("Notion Page URL or ID is required.");

      localStorage.setItem(TOKEN_KEY, cleanToken);
      localStorage.setItem(THEME_KEY, theme);

      const res = await fetch(
        `/api/portal/${encodeURIComponent(id)}?_=${Date.now()}`,
        {
          headers: { "x-notion-token": cleanToken },
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load portal");

      const portal = json as PortalData;
      setData(portal);
      refreshPathsFromData(portal, cleanToken);
      await persistBranding(portal.id);
      setLastSyncedAt(
        new Date().toLocaleTimeString("en-US", { hour12: false })
      );
      return portal;
    } catch (e) {
      if (!opts?.silent) {
        setPortalPath("");
        setPrivatePath("");
        setError(e instanceof Error ? e.message : "Unknown error");
        setData((prev) =>
          !prev || isSamplePortal(prev) ? createSamplePortalData() : prev
        );
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Auto-load preview when Notion credentials are present (errors stay quiet;
  // use "Connect Notion page" to surface failures)
  useEffect(() => {
    const cleanToken = token.trim();
    const id = pageInput.trim();
    if (!cleanToken || !id) return;
    const handle = window.setTimeout(() => {
      void fetchPortal({ silent: true });
    }, 700);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pageInput]);

  const clientDemoPath = useMemo(() => {
    const gate = passcodeEnabled && passcode.trim() ? passcode.trim() : "Acme2026";
    const params = new URLSearchParams({
      gate,
      theme,
      client: clientName.trim() || "Acme Corporation",
    });
    return `/p/demo?${params.toString()}`;
  }, [passcodeEnabled, passcode, theme, clientName]);

  const openClientDemo = () => {
    window.open(clientDemoPath, "_blank", "noopener,noreferrer");
  };

  const copyText = async (text: string, label: string) => {
    if (!text) return;
    const full = text.startsWith("http")
      ? text
      : `${window.location.origin}${text}`;
    await navigator.clipboard.writeText(full);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  };

  const generatePrivateTokenLink = async () => {
    setError("");
    const cleanToken = token.trim();
    if (!cleanToken) {
      setError("Notion Integration Token is required.");
      return;
    }

    let portal = data;
    if (!portal) {
      portal = await fetchPortal();
    }

    if (!portal) return;
    if (isSamplePortal(portal)) {
      setError("Connect Notion first — sample demo cannot generate client links.");
      return;
    }
    await persistBranding(portal.id);
    const paths = refreshPathsFromData(portal, cleanToken);
    await copyText(paths.privateLink, "private");
  };

  const saveAndPublish = async () => {
    setError("");
    const cleanToken = token.trim();
    if (!cleanToken) {
      setError("Notion Integration Token is required.");
      return;
    }
    if (!pageInput.trim()) {
      setError("Notion Page URL or ID is required.");
      return;
    }
    if (!getConsultantSession()) {
      setError("Sign in to publish under your plan quota.");
      return;
    }

    const portal = data || (await fetchPortal());
    if (!portal) return;
    if (isSamplePortal(portal)) {
      setError(
        "Connect a real Notion page before publishing. Use Load Sample Report only for preview."
      );
      return;
    }

    localStorage.setItem(TOKEN_KEY, cleanToken);
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(
      BRAND_KEY,
      JSON.stringify({
        clientName,
        logoDataUrl,
        brandColor,
        passcodeEnabled,
        passcode,
        accessToken,
        linkExpiry,
        shareConfig,
        savedAt: new Date().toISOString(),
        pageId: portal.id,
      })
    );
    refreshPathsFromData(portal, cleanToken);
    const result = await persistBranding(portal.id, undefined, { publish: true });
    if (!result.ok) {
      setError(result.error || "Publish blocked by plan limits.");
      return;
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const onThemeChange = (raw: string) => {
    const next = normalizeThemeId(raw);
    const nextColor = themeBrandColor(next);
    setTheme(next);
    setBrandColor(nextColor);
    localStorage.setItem(THEME_KEY, next);
    if (data?.id) {
      void persistBranding(data.id, {
        brandColor: nextColor,
        theme: next,
      });
    }
  };

  const studioHeader = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <LayoutDashboard className="h-5 w-5 text-slate-900" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            GlassPortal
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">
            Portal Studio
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Notion → polished share page
          </p>
        </div>
      </div>
      {isGuest ? (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Free preview
          </span>
          <button
            type="button"
            onClick={() => {
              setAuthIntent("save");
              setAuthOpen(true);
            }}
            className="text-[11px] font-semibold text-slate-700 underline-offset-2 hover:underline"
          >
            Sign in
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            clearConsultantSession();
            setSessionEmail(null);
          }}
          className="max-w-[140px] truncate rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:text-slate-900"
          title={sessionEmail || undefined}
        >
          {sessionEmail} · Sign out
        </button>
      )}
    </div>
  );

  const syncBadge = (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        syncActive && liveSync
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : usingSample
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {syncActive && liveSync
        ? "Auto-Sync Active"
        : usingSample
          ? "Sample Demo"
          : loading
            ? "Syncing…"
            : "Waiting to Connect"}
    </span>
  );

  const shareLinkButtons =
    privatePath || portalPath ? (
      <div className="space-y-2">
        {privatePath ? (
          <button
            type="button"
            onClick={() =>
              requireAuth("private-link", () => {
                void generatePrivateTokenLink();
              })
            }
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
          >
            <span className="truncate">
              <span className="font-semibold text-slate-900">
                Private client link
              </span>
              <br />
              Opens the report without a passcode
            </span>
            <Copy className="h-3.5 w-3.5 shrink-0" />
          </button>
        ) : null}
        {passcodeEnabled && portalPath ? (
          <button
            type="button"
            onClick={() => copyText(portalPath, "passcode")}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
          >
            <span className="truncate">
              <span className="font-semibold text-slate-900">Passcode link</span>
              <br />
              Client types passcode at the gate
            </span>
            <Copy className="h-3.5 w-3.5 shrink-0" />
          </button>
        ) : null}
        {copied ? (
          <p className="text-[11px] font-medium text-emerald-700">
            {copied === "private"
              ? "Private token link copied"
              : "Passcode link copied"}
          </p>
        ) : null}
        <a
          href={
            passcodeEnabled && portalPath
              ? portalPath
              : privatePath || portalPath
          }
          target="_blank"
          rel="noreferrer"
          className="block text-center text-[11px] font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          {passcodeEnabled
            ? "Open secured client preview"
            : "Open live portal"}
        </a>
      </div>
    ) : null;

  const logoFileInput = (
    <input
      ref={logoInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
      tabIndex={-1}
      aria-hidden="true"
      className="pointer-events-none absolute h-0 w-0 opacity-0"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
      onChange={(e) => {
        onLogoUpload(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  const mobileConnectStep = (
    <GlassCard hover={false} className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">
            Connect Notion
          </h2>
        </div>
        {syncBadge}
      </div>
      <p className="text-[12px] leading-relaxed text-slate-500">
        Paste your integration token and page link. One screen — then brand and
        share.
      </p>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-600">
          Integration Token
        </span>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ntn_... / secret_..."
          className="mech-input"
          autoComplete="off"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-600">
          Notion Page URL / ID
        </span>
        <input
          type="text"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          placeholder="https://www.notion.so/..."
          className="mech-input"
        />
      </label>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const portal = await fetchPortal();
              if (portal) setMobileStep(1);
            })();
          }}
          disabled={loading || !token.trim() || !pageInput.trim()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-900 bg-slate-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Connect Notion page
        </button>
        <button
          type="button"
          onClick={() => {
            loadSampleReport();
            setMobileStep(1);
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Try Sample Report
        </button>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-400">
        Share the Notion page with your integration first, then Connect. Or try
        Sample to preview the flow.
      </p>
      {usingSample ? (
        <button
          type="button"
          onClick={openClientDemo}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-900 transition hover:bg-sky-100"
        >
          Open as client (demo passcode gate)
        </button>
      ) : null}
      {lastSyncedAt ? (
        <p className="text-[10px] text-slate-400">Last synced {lastSyncedAt}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </GlassCard>
  );

  const mobileBrandStep = (
    <div className="space-y-4">
      <GlassCard hover={false} className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">
            Client Branding
          </h2>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-600">Client Name</span>
          <input
            type="text"
            value={clientName}
            onChange={(e) => {
              const v = e.target.value;
              setClientName(v);
              setShareConfig((prev) => ({
                ...prev,
                cardTitle: prev.cardTitle.includes("Acme")
                  ? `${v || "Client"} 2026 Strategic Advisory Report`
                  : prev.cardTitle,
              }));
            }}
            placeholder="Acme Corporation"
            className="mech-input"
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600">Client Logo</span>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4 shrink-0" aria-hidden />
            Upload Logo
          </button>
          <p className="text-[10px] leading-relaxed text-slate-400">
            PNG, JPG, or SVG · Header, favicon, and share cards
          </p>
          {logoDataUrl ? (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoDataUrl}
                alt="Client logo preview"
                className="h-10 max-w-[160px] object-contain"
              />
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600"
                title="Accent color from logo"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: brandColor }}
                />
                {brandColor}
              </span>
            </div>
          ) : null}
        </div>
      </GlassCard>
      <GlassCard hover={false} className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Executive Theme</h2>
        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          className="mech-input"
        >
          {THEME_PRESETS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="flex items-center gap-2 text-[10px] text-slate-400">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-slate-200"
            style={{ backgroundColor: brandColor }}
          />
          {getThemePreset(theme).description}
        </span>
      </GlassCard>
    </div>
  );

  const mobileShareStep = (
    <div className="space-y-4">
      <GlassCard hover={false} className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">
            Access & Publish
          </h2>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Clients never create an account. Share a passcode link or a private
          link.
        </p>
        <label className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-600">
            Simple Passcode
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={passcodeEnabled}
            onClick={() => setPasscodeEnabled((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition ${
              passcodeEnabled ? "bg-slate-900" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                passcodeEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </label>
        {passcodeEnabled ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Access Passcode
            </span>
            <input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="e.g. Acme2026"
              className="mech-input"
            />
          </label>
        ) : null}
        <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <KeyRound className="h-3.5 w-3.5" />
              Exclusive Access Token
            </span>
            <button
              type="button"
              onClick={() => setAccessToken(makeAccessToken())}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="h-3 w-3" />
              Rotate
            </button>
          </div>
          <code className="block truncate rounded-md bg-white px-2 py-1.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
            {accessToken || "Generating…"}
          </code>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-600">Link Expiry</span>
          <select
            value={linkExpiry}
            onChange={(e) => setLinkExpiry(e.target.value)}
            className="mech-input"
          >
            <option value="1">Expires in 24 hours</option>
            <option value="7">Expires in 7 days</option>
            <option value="30">Expires in 30 days</option>
            <option value="never">No expiry</option>
          </select>
        </label>
        {usingSample ? (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900">
            Sample Demo — Publish is locked. Connect a real Notion page to
            publish a live link.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() =>
            requireAuth("save", () => {
              void saveAndPublish();
            })
          }
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm portal-transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            "Save & Publish Portal"
          )}
        </button>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}
        {savedFlash ? (
          <p className="text-[11px] font-medium text-emerald-700">
            Portal published · share links ready below.
          </p>
        ) : null}
        {shareLinkButtons}
      </GlassCard>
      <PlanBillingCard
        email={sessionEmail}
        pageId={data?.id || null}
        onPlanChange={setPlanId}
      />
      <GlassCard hover={false} className="p-5">
        <VipShareCard
          config={shareConfig}
          onChange={(next) =>
            setShareConfig((prev) => ({ ...prev, ...next }))
          }
          clientName={clientName}
          logoDataUrl={logoDataUrl}
          coverUrl={
            logoDataUrl
              ? undefined
              : data?.coverUrl ||
                (usingSample ? SAMPLE_COVER_URL : undefined)
          }
          sharePath={privatePath || portalPath}
        />
      </GlassCard>
    </div>
  );

  const mobilePreviewStep = (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${themePreset.pageBg}`}
    >
      <div
        className={`flex items-center justify-between border-b px-3 py-2 ${themePreset.previewChrome}`}
      >
        <span className="text-xs font-medium">Live preview</span>
        <span className="text-[11px] opacity-80">
          {data ? `${data.blocks.length} blocks` : "—"} · {themePreset.label}
        </span>
      </div>
      {displayData ? (
        <div
          className={`max-h-[calc(100dvh-14rem)] overflow-x-auto overflow-y-auto ${themePreset.pageBg}`}
        >
          {usingSample ? (
            <p className="sticky top-0 z-[5] border-b border-sky-100 bg-sky-50/95 px-3 py-2 text-center text-[11px] font-medium text-sky-800 backdrop-blur">
              Sample report — connect Notion for your live page
            </p>
          ) : null}
          <PortalShell
            data={displayData}
            token={usingSample ? undefined : token}
            shareUrl={
              usingSample
                ? clientDemoPath
                : privatePath || portalPath || undefined
            }
            pinProgress={false}
            liveSync={liveSync && !usingSample && mobileStep === 3}
            theme={theme}
            whiteLabel={getPlan(planId).whiteLabel}
            showWatermark={planShowsWatermark(planId)}
            onLiveData={() =>
              setLastSyncedAt(
                new Date().toLocaleTimeString("en-US", { hour12: false })
              )
            }
          />
        </div>
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-sm text-slate-500">
          Connect Notion or load Sample to preview.
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Studio tab icon = uploaded client logo whenever available */}
      <BrandFavicon href={logoDataUrl || undefined} />
      {logoFileInput}

      {/* —— Mobile: step wizard (Connect → Brand → Share → Preview) —— */}
      <StudioMobileWizard
        step={mobileStep}
        onStepChange={setMobileStep}
        canAdvanceFromConnect={canAdvanceFromConnect}
        header={studioHeader}
        connect={mobileConnectStep}
        brand={mobileBrandStep}
        share={mobileShareStep}
        preview={mobilePreviewStep}
      />

      {/* —— Desktop: existing two-column Studio —— */}
      <main className="relative hidden min-h-screen bg-[#F9FAFB] lg:block">
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[400px_1fr] lg:px-6 lg:py-8">
          <aside className="space-y-4 lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            {studioHeader}

            {/* 1 — Notion Connection */}
            <GlassCard hover={false} className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-slate-700" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    Notion Connection
                  </h2>
                </div>
                {syncBadge}
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Integration Token
                </span>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  🔒 Stored securely. Only grants access to pages explicitly
                  shared with this integration.
                </p>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ntn_... / secret_..."
                  className="mech-input"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Notion Page URL / ID
                </span>
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="https://www.notion.so/..."
                  className="mech-input"
                />
                <div className="flex flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void fetchPortal()}
                    disabled={loading || !token.trim() || !pageInput.trim()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Connect Notion page
                  </button>
                  <button
                    type="button"
                    onClick={loadSampleReport}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    ⚡ Sample
                  </button>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  Real Notion links end with a long page ID (32 characters). Share
                  the page with your integration first, then Connect.
                </p>
                {usingSample ? (
                  <button
                    type="button"
                    onClick={openClientDemo}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-100"
                  >
                    Open as client (demo passcode gate)
                  </button>
                ) : null}
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Executive Theme
                </span>
                <select
                  value={theme}
                  onChange={(e) => onThemeChange(e.target.value)}
                  className="mech-input"
                >
                  {THEME_PRESETS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-slate-200"
                    style={{ backgroundColor: brandColor }}
                  />
                  {getThemePreset(theme).description}
                </span>
              </label>

              {usingSample ? (
                <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900">
                  Still on Sample Demo — Publish is locked. Click{" "}
                  <strong>Open as client</strong> to try the buyer view now, or
                  Connect a real Notion page (Share → invite your integration)
                  to publish a live link.
                </p>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  requireAuth("save", () => {
                    void saveAndPublish();
                  })
                }
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm portal-transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  "Save & Publish Portal"
                )}
              </button>

              {lastSyncedAt ? (
                <p className="text-[10px] text-slate-400">
                  Last synced {lastSyncedAt}
                </p>
              ) : null}

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              ) : null}
              {savedFlash ? (
                <p className="text-[11px] font-medium text-emerald-700">
                  Portal published · share links ready below.
                </p>
              ) : null}

              {shareLinkButtons}
            </GlassCard>

            <PlanBillingCard
              email={sessionEmail}
              pageId={data?.id || null}
              onPlanChange={setPlanId}
            />

            {/* 2 — Client Branding */}
            <GlassCard hover={false} className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Client Branding
                </h2>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Client Name
                </span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClientName(v);
                    setShareConfig((prev) => ({
                      ...prev,
                      cardTitle: prev.cardTitle.includes("Acme")
                        ? `${v || "Client"} 2026 Strategic Advisory Report`
                        : prev.cardTitle,
                    }));
                  }}
                  placeholder="Acme Corporation"
                  className="mech-input"
                />
              </label>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Client Logo
                </span>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Upload Logo
                </button>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  PNG, JPG, or SVG · Used in header, favicon, and share cards
                </p>
                {logoDataUrl ? (
                  <div className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoDataUrl}
                      alt="Client logo preview"
                      className="h-10 max-w-[160px] object-contain"
                    />
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600"
                      title="Accent color from logo"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: brandColor }}
                      />
                      {brandColor}
                    </span>
                  </div>
                ) : null}
              </div>
            </GlassCard>

            {/* 3 — Access Security */}
            <GlassCard hover={false} className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Access Security
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Your clients never create an account. Share a passcode link, or
                a private link that opens the report directly.
              </p>
              <label className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-600">
                  Simple Passcode
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={passcodeEnabled}
                  onClick={() => {
                    setPasscodeEnabled((v) => {
                      const next = !v;
                      return next;
                    });
                  }}
                  className={`relative h-6 w-11 rounded-full transition ${
                    passcodeEnabled ? "bg-slate-900" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      passcodeEnabled ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </label>
              {passcodeEnabled ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-600">
                    Access Passcode
                  </span>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="e.g. Acme2026"
                    className="mech-input"
                  />
                </label>
              ) : null}

              <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <KeyRound className="h-3.5 w-3.5" />
                    Exclusive Access Token
                  </span>
                  <button
                    type="button"
                    onClick={() => setAccessToken(makeAccessToken())}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Rotate
                  </button>
                </div>
                <code className="block truncate rounded-md bg-white px-2 py-1.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
                  {accessToken || "Generating…"}
                </code>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Link Expiry
                </span>
                <select
                  value={linkExpiry}
                  onChange={(e) => setLinkExpiry(e.target.value)}
                  className="mech-input"
                >
                  <option value="1">Expires in 24 hours</option>
                  <option value="7">Expires in 7 days</option>
                  <option value="30">Expires in 30 days</option>
                  <option value="never">No expiry</option>
                </select>
              </label>
              {passcodeEnabled ? (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Lock className="h-3 w-3" />
                  Passcode gate active when the private token is absent.
                </p>
              ) : null}
            </GlassCard>

            {/* 4 — VIP Share Card */}
            <GlassCard hover={false} className="p-5">
              <VipShareCard
                config={shareConfig}
                onChange={(next) =>
                  setShareConfig((prev) => ({ ...prev, ...next }))
                }
                clientName={clientName}
                logoDataUrl={logoDataUrl}
                coverUrl={
                  logoDataUrl
                    ? undefined
                    : data?.coverUrl ||
                      (usingSample ? SAMPLE_COVER_URL : undefined)
                }
                sharePath={privatePath || portalPath}
              />
            </GlassCard>
          </aside>

          <section
            className={`relative rounded-2xl border border-slate-200 shadow-sm transition-colors duration-200 ${themePreset.pageBg}`}
          >
            <div
              className={`flex items-center justify-between border-b px-4 py-2.5 transition-colors duration-200 ${themePreset.previewChrome}`}
            >
              <span className="text-xs font-medium">Live portal preview</span>
              <span className="text-[11px] opacity-80">
                {data ? `${data.blocks.length} blocks` : "Awaiting generation"}
                {" · "}
                {themePreset.label}
              </span>
            </div>

            {displayData ? (
              <div
                id="portal-preview-scroll"
                className={`max-h-[calc(100vh-6rem)] overflow-x-auto overflow-y-auto pb-24 transition-colors duration-200 ${themePreset.pageBg}`}
              >
                {usingSample ? (
                  <p className="sticky top-0 z-[5] border-b border-sky-100 bg-sky-50/95 px-4 py-2 text-center text-[11px] font-medium text-sky-800 backdrop-blur">
                    Sample Acme Corp report — connect Notion to replace with your
                    live page
                  </p>
                ) : null}
                <PortalShell
                  data={displayData}
                  token={usingSample ? undefined : token}
                  shareUrl={
                    usingSample
                      ? clientDemoPath
                      : privatePath || portalPath || undefined
                  }
                  pinProgress={false}
                  liveSync={liveSync && !usingSample}
                  theme={theme}
                  whiteLabel={getPlan(planId).whiteLabel}
                  showWatermark={planShowsWatermark(planId)}
                  onLiveData={() =>
                    setLastSyncedAt(
                      new Date().toLocaleTimeString("en-US", { hour12: false })
                    )
                  }
                />
              </div>
            ) : (
              <div
                className={`flex min-h-[50vh] items-center justify-center p-8 pb-24 text-center transition-colors duration-200 ${themePreset.pageBg} ${themePreset.pageText}`}
              >
                <div className="max-w-md space-y-3">
                  <p className="text-sm font-semibold">Live preview</p>
                  <p
                    className={`text-sm leading-relaxed ${themePreset.mutedText}`}
                  >
                    Load the sample report to explore themes, or connect Notion
                    for your live page.
                  </p>
                  <button
                    type="button"
                    onClick={loadSampleReport}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    ⚡ Load Sample Report
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <AuthModal
        open={authOpen}
        intent={authIntent}
        onClose={() => {
          setAuthOpen(false);
          pendingAction.current = null;
        }}
        onSuccess={(email) => {
          setSessionEmail(email);
          setAuthOpen(false);
          const next = pendingAction.current;
          pendingAction.current = null;
          next?.();
        }}
      />
    </>
  );
}
