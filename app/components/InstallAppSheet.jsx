"use client";

// POSER NUVI SUR L'ECRAN D'ACCUEIL
//
// Deux mondes, deux mecanismes, et c'est la raison d'etre de ce fichier.
//
//   Android, Chrome de bureau, Edge  Le navigateur previent avec l'evenement
//     `beforeinstallprompt`. On le capte, on empeche sa banniere maison, et on
//     declenche la vraie boite d'installation au moment ou l'utilisateur le
//     demande. Un clic, c'est installe.
//
//   iPhone, iPad  Safari n'expose aucune API d'installation, et n'en exposera
//     pas : Apple reserve le geste au menu Partager. On ne peut donc que
//     montrer le geste. C'est ce que fait la feuille ci-dessous, avec l'icone
//     Partager dessinee a l'identique - une capture d'ecran vieillirait, un
//     trace vectoriel non.
//
// Le composant ne s'affiche jamais quand l'application tourne DEJA depuis
// l'ecran d'accueil : proposer d'installer ce qui est installe est le genre
// de detail qui fait douter de tout le reste.

import { useEffect, useState, useCallback } from "react";
import {
  Ink, InkMuted, Paper, Hairline, Coral, CoralSoft, Purple,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
} from "./tokens";
import { detectPlatform, isStandalone } from "../../lib/installTarget";

// La detection vit dans lib/installTarget.js, sans JSX : c'est la seule
// partie de l'installation qui peut se tromper en silence, donc celle que les
// tests doivent pouvoir charger directement.
export { detectPlatform, isStandalone };

function platformNow() {
  if (typeof navigator === "undefined") return "desktop";
  return detectPlatform(
    navigator.userAgent,
    typeof window !== "undefined" && "ontouchstart" in window,
    navigator.maxTouchPoints
  );
}

// L'icone Partager d'iOS : un carre ouvert par le haut, une fleche qui en
// sort. Dessinee ici pour que l'instruction montre exactement ce que
// l'utilisateur doit chercher dans sa barre Safari.
function ShareIcon({ size = 22, color = "#007AFF" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v11" stroke={color} strokeWidth="1.9" strokeLinecap="round"/>
      <path d="M8.4 6.6 12 3l3.6 3.6" stroke={color} strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 10.5H5.6A1.6 1.6 0 0 0 4 12.1v7.3A1.6 1.6 0 0 0 5.6 21h12.8a1.6 1.6 0 0 0 1.6-1.6v-7.3a1.6 1.6 0 0 0-1.6-1.6H17"
            stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Le "+" dans un carre, deuxieme repere du parcours iOS.
function PlusBoxIcon({ size = 22, color = Ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4"
            stroke={color} strokeWidth="1.8"/>
      <path d="M12 8.2v7.6M8.2 12h7.6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// L'icone de Nuvi, la meme que celle qui se posera sur l'ecran d'accueil.
// La montrer avant l'installation evite la question "c'est quoi cette
// vignette ?" une fois le geste fait.
function AppIcon({ size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.23,
      overflow: "hidden", flexShrink: 0,
      boxShadow: "0 4px 14px rgba(0,0,0,0.13)",
      border: "0.5px solid " + Hairline,
    }}>
      <img src="/apple-touch-icon.png" alt="" width={size} height={size}
           style={{ display: "block", width: "100%", height: "100%" }}/>
    </div>
  );
}

// Le crochet qui sait tout de l'installation. Rendu separement du visuel pour
// que la page puisse decider OU proposer le geste sans dupliquer la detection.
export function useInstallState() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState("desktop");

  useEffect(() => {
    setPlatform(platformNow());
    setInstalled(isStandalone());

    const onPrompt = (e) => {
      // Sans preventDefault, Chrome affiche sa propre banniere en bas de
      // l'ecran, qui recouvre la barre de navigation de Nuvi.
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => { setDeferred(null); setInstalled(true); };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Declenche la vraie boite du navigateur. Rend true si l'utilisateur a
  // accepte, false sinon - y compris quand il n'y a rien a declencher.
  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      // L'evenement n'est utilisable qu'une fois. Le garder ferait echouer
      // silencieusement le deuxieme clic.
      setDeferred(null);
      return choice && choice.outcome === "accepted";
    } catch {
      setDeferred(null);
      return false;
    }
  }, [deferred]);

  return {
    platform,
    installed,
    // Sur iOS il n'y a jamais de bouton automatique : on montre le geste.
    canPromptDirectly: Boolean(deferred),
    // Y a-t-il quelque chose a proposer ? Sur iOS, oui, toujours, tant que
    // l'app n'est pas deja posee.
    installable: !installed && (Boolean(deferred) || platform === "ios"),
    promptInstall,
  };
}

const T = {
  fr: {
    title: "Nuvi sur ton ecran d'accueil",
    sub: "Une icone, comme une vraie application. Ouverture plein ecran, sans barre de navigateur.",
    done: "Nuvi est deja installee. Tu la lances depuis ton ecran d'accueil.",
    install: "Installer",
    installing: "Installation...",
    close: "Plus tard",
    iosIntro: "Sur iPhone, c'est Safari qui installe, en trois gestes :",
    ios1: "Appuie sur Partager, en bas de Safari",
    ios2: "Fais defiler et choisis Sur l'ecran d'accueil",
    ios3: "Appuie sur Ajouter. L'icone apparait avec les autres.",
    iosNote: "Si tu ne vois pas Partager : ouvre thenuvi.com dans Safari, pas dans Chrome. Apple reserve l'installation a Safari.",
    deskNote: "Ton navigateur n'a pas propose l'installation. Ouvre le menu du navigateur : l'entree s'appelle Installer Nuvi ou Ajouter a l'ecran d'accueil.",
  },
  en: {
    title: "Nuvi on your home screen",
    sub: "An icon, like a real app. Opens full screen, no browser bar.",
    done: "Nuvi is already installed. Launch it from your home screen.",
    install: "Install",
    installing: "Installing...",
    close: "Later",
    iosIntro: "On iPhone, Safari does the install, in three taps:",
    ios1: "Tap Share, at the bottom of Safari",
    ios2: "Scroll and choose Add to Home Screen",
    ios3: "Tap Add. The icon appears with the others.",
    iosNote: "No Share button? Open thenuvi.com in Safari, not Chrome. Apple reserves installing for Safari.",
    deskNote: "Your browser did not offer the install. Open the browser menu: the entry is called Install Nuvi or Add to Home Screen.",
  },
};

function Step({ n, children, icon }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 0" }}>
      <div style={{
        width: 24, height: 24, borderRadius: RadiusPill, flexShrink: 0,
        background: CoralSoft, color: Coral,
        fontFamily: Sans, fontSize: 12, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{n}</div>
      <div style={{
        flex: 1, minWidth: 0, fontFamily: Sans, fontSize: 13.5,
        color: Ink, lineHeight: 1.45,
      }}>{children}</div>
      {icon ? <div style={{ flexShrink: 0 }}>{icon}</div> : null}
    </div>
  );
}

export default function InstallAppSheet({ lang = "en", onClose = () => {} }) {
  const t = T[lang] || T.fr;
  const { platform, installed, canPromptDirectly, promptInstall } = useInstallState();
  const [busy, setBusy] = useState(false);

  const doInstall = async () => {
    setBusy(true);
    const ok = await promptInstall();
    setBusy(false);
    if (ok) onClose();
  };

  // La feuille porte son propre calque. Elle est appelee depuis les reglages
  // comme depuis la barre du bas, et deux points d'entree qui devraient
  // fournir chacun leur habillage est exactement la facon dont un ecran finit
  // par exister en deux versions qui divergent.
  return (
    <div
      role="dialog" aria-modal="true" aria-label={t.title}
      data-nuvi="install-sheet"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 12000,
        background: "rgba(10,10,10,0.42)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 0 max(0px, env(safe-area-inset-bottom))",
        animation: "nuviInstallFade 220ms ease-out",
      }}>
      <style>{`
        @keyframes nuviInstallFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes nuviInstallRise {
          from { transform: translateY(22px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @media (min-width: 640px) {
          [data-nuvi="install-sheet"] { align-items: center }
          [data-nuvi="install-card"]  { border-radius: 22px; margin-bottom: 0 }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-nuvi="install-sheet"], [data-nuvi="install-card"] { animation: none }
        }
      `}</style>
    <div data-nuvi="install-card" style={{
      fontFamily: Sans, width: "100%", maxWidth: 430,
      background: "var(--nuvi-cream)",
      borderRadius: "22px 22px 0 0",
      padding: "22px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      maxHeight: "88vh", overflowY: "auto",
      animation: "nuviInstallRise 280ms cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
        <AppIcon size={60}/>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: Serif, fontSize: 20, fontWeight: 500,
            color: Ink, letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>{t.title}</div>
          <div style={{ fontSize: 12.5, color: InkMuted, marginTop: 5, lineHeight: 1.4 }}>
            {installed ? t.done : t.sub}
          </div>
        </div>
      </div>

      {installed ? null : canPromptDirectly ? (
        <button
          onClick={doInstall}
          disabled={busy}
          style={{
            width: "100%", padding: "14px 18px", borderRadius: RadiusPill,
            border: "none", background: Coral, color: "#fff",
            fontFamily: Sans, fontSize: 14.5, fontWeight: 600,
            cursor: busy ? "default" : "pointer", boxShadow: ShadowSm,
          }}>
          {busy ? t.installing : t.install}
        </button>
      ) : platform === "ios" ? (
        <div style={{
          background: Paper, border: "0.5px solid " + Hairline,
          borderRadius: RadiusMd, padding: "6px 16px 10px",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
            textTransform: "uppercase", color: Purple, padding: "12px 0 2px",
          }}>{t.iosIntro}</div>
          <Step n={1} icon={<ShareIcon/>}>{t.ios1}</Step>
          <div style={{ height: 0.5, background: Hairline }}/>
          <Step n={2} icon={<PlusBoxIcon/>}>{t.ios2}</Step>
          <div style={{ height: 0.5, background: Hairline }}/>
          <Step n={3} icon={<AppIcon size={26}/>}>{t.ios3}</Step>
          <div style={{
            fontSize: 11.5, color: InkMuted, lineHeight: 1.5,
            borderTop: "0.5px solid " + Hairline, paddingTop: 10, marginTop: 6,
          }}>{t.iosNote}</div>
        </div>
      ) : (
        <div style={{
          background: Paper, border: "0.5px solid " + Hairline,
          borderRadius: RadiusMd, padding: "14px 16px",
          fontSize: 12.5, color: InkMuted, lineHeight: 1.5,
        }}>{t.deskNote}</div>
      )}

      <button
        onClick={onClose}
        style={{
          width: "100%", marginTop: 12, padding: "12px 16px",
          borderRadius: RadiusSm, border: "0.5px solid " + Hairline,
          background: "transparent", color: InkMuted,
          fontFamily: Sans, fontSize: 13, cursor: "pointer",
        }}>
        {installed ? "OK" : t.close}
      </button>
    </div>
    </div>
  );
}
