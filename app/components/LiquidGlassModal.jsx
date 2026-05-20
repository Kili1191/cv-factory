"use client";

// LiquidGlassModal v1 (2026-05-20)
//
// Wrapper reutilisable pour transformer n'importe quelle modale en
// Liquid Glass coherent. Geste 2 layouts :
//
//   layout="side"   -> Side panel droite, full-height (style Notion/Cursor)
//                       Ideal pour : Adjust, Design, Match, Audit, Truth,
//                       Positioning. CV reste visible 60% a gauche.
//
//   layout="bottom" -> Bottom sheet hauteur adaptative (style iOS)
//                       Ideal pour : Translation et modales courtes.
//
//   layout="auto"   -> side desktop (>900px), bottom mobile
//
// Architecture pointer-events : le CV en background reste scrollable et
// interactif dans les zones hors panel. C'est ce qui differencie ce
// LiquidGlassModal d'une modale classique.
//
// Composants helpers exportes :
//   GlassCard     -> Bulle frosted glass (auto blur 20px + tint 0.55)
//   GlassButton   -> Bouton frosted glass coherent
//   GlassInput    -> Input frosted glass coherent
//   GlassSelect   -> Select frosted glass coherent

import { useEffect, useState } from "react";
import LiquidGlassPanel from "./LiquidGlassPanel";

const Ink       = "var(--nuvi-ink)";
const InkMuted  = "var(--nuvi-ink-muted)";
const Coral     = "var(--nuvi-coral)";
const Purple    = "var(--nuvi-purple)";
const Magenta   = "var(--nuvi-magenta)";
const Hairline  = "var(--nuvi-hairline)";

const Sans  = "'Inter', -apple-system, sans-serif";
const Serif = "'Fraunces', Georgia, serif";

// ============================================================================
// LiquidGlassModal - wrapper principal
// ============================================================================
export default function LiquidGlassModal({
  open = true,
  onClose,
  layout = "auto",        // "side" | "bottom" | "auto"
  width = 480,            // largeur en px pour mode side
  height,                 // hauteur pour mode bottom (par defaut "auto")
  maxHeight = "85vh",     // limite pour mode bottom
  eyebrow,                // ex: "NUVI ADJUST" (sera affiche en Coral upper)
  title,                  // ex: "Ajuster" (Fraunces)
  titleAccent,            // ex: "ton CV" (partie en gradient Purple->Magenta)
  subtitle,               // ex: "Affine bullet par bullet"
  headerActions,          // React node : boutons cote droit du header
  footer,                 // React node : contenu du footer (input, CTA...)
  children,               // contenu du body
  closeOnEscape = true,
  noPadding = false,      // si true, pas de padding sur le body
}) {
  // [Auto] Detection mobile pour layout="auto"
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // [Effective layout] Si "auto", on choisit selon viewport
  const effectiveLayout =
    layout === "auto" ? (isMobile ? "bottom" : "side") : layout;

  // [Escape key] Fermeture par Escape
  useEffect(() => {
    if (!closeOnEscape || !onClose) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [closeOnEscape, onClose]);

  if (!open) return null;

  // ============ MODE SIDE (panel droite, full-height) ============
  if (effectiveLayout === "side") {
    return (
      <div
        style={{
          // Wrapper : couvre QUE la zone du panel droit (pas tout l'ecran)
          // pour laisser le CV scrollable a gauche.
          position: "fixed",
          top: 0,
          right: 0,
          width: width,
          height: "100vh",
          zIndex: 99998,
          fontFamily: Sans,
          pointerEvents: "none",
          // Animation slide-in droite
          animation: "lgm-slide-side 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <style>{`
          @keyframes lgm-slide-side {
            0%   { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        {/* Wrapper interne avec pointer-events actif sur la largeur panel */}
        <div style={{ pointerEvents: "auto", width: "100%", height: "100%" }}>
          <LiquidGlassPanel
            height="100vh"
            maxWidth={width}
            borderRadius="0"
            borderColor={Coral}
            distortion={30}
            tintColor="rgba(250, 248, 243, 0.04)"
            animate={true}
          >
            <ModalContent
              eyebrow={eyebrow}
              title={title}
              titleAccent={titleAccent}
              subtitle={subtitle}
              headerActions={headerActions}
              footer={footer}
              onClose={onClose}
              layout="side"
              noPadding={noPadding}
            >
              {children}
            </ModalContent>
          </LiquidGlassPanel>
        </div>
      </div>
    );
  }

  // ============ MODE BOTTOM (sheet bas, hauteur adaptative) ============
  return (
    <div
      style={{
        position: "fixed",
        left: 0, right: 0, bottom: 0,
        maxHeight: maxHeight,
        height: height || "auto",
        zIndex: 99998,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        fontFamily: Sans,
        pointerEvents: "none",
        animation: "lgm-slide-bottom 280ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <style>{`
        @keyframes lgm-slide-bottom {
          0%   { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        pointerEvents: "auto",
        width: "100%",
        maxWidth: 840,
        marginLeft: "auto",
        marginRight: "auto",
      }}>
        <LiquidGlassPanel
          height={height || "auto"}
          maxWidth={840}
          borderRadius="32px 32px 0 0"
          borderColor={Coral}
          distortion={30}
          tintColor="rgba(250, 248, 243, 0.04)"
          animate={true}
        >
          {/* Handle pill en haut (style iOS bottom sheet) */}
          <div style={{
            width: 40, height: 4, background: Coral,
            borderRadius: 999,
            margin: "10px auto 6px", flexShrink: 0,
            opacity: 0.7,
          }} />

          <ModalContent
            eyebrow={eyebrow}
            title={title}
            titleAccent={titleAccent}
            subtitle={subtitle}
            headerActions={headerActions}
            footer={footer}
            onClose={onClose}
            layout="bottom"
            noPadding={noPadding}
          >
            {children}
          </ModalContent>
        </LiquidGlassPanel>
      </div>
    </div>
  );
}

// ============================================================================
// ModalContent - structure interne (header + body + footer)
// ============================================================================
function ModalContent({
  eyebrow, title, titleAccent, subtitle,
  headerActions, footer, onClose, children, layout, noPadding,
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", overflow: "hidden",
    }}>
      {/* ===== HEADER : fond cream + fade gradient en bas (pas de border) ===== */}
      <div style={{
        padding: "16px 24px 28px",
        flexShrink: 0,
        background: "linear-gradient(180deg, rgba(250, 248, 243, 0.82) 0%, rgba(250, 248, 243, 0.65) 65%, rgba(250, 248, 243, 0.0) 100%)",
        backdropFilter: "blur(16px) saturate(160%)",
        WebkitBackdropFilter: "blur(16px) saturate(160%)",
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 12,
        position: "relative",
        zIndex: 2,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && (
            <div style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: 4,
              color: "#b91c8c",
              background: "linear-gradient(135deg, #8b6dff 0%, #e547bf 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>{eyebrow}</div>
          )}

          {title && (
            <div style={{
              fontFamily: Serif, fontWeight: 400, fontSize: 24,
              letterSpacing: "-0.02em", lineHeight: 1.15,
              color: Ink,
            }}>
              {title}
              {titleAccent && (
                <>
                  {" "}<em style={{
                    fontStyle: "italic",
                    color: "#b91c8c",
                    background: "linear-gradient(135deg, #8b6dff 0%, #e547bf 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>{titleAccent}</em>
                </>
              )}
            </div>
          )}

          {subtitle && (
            <div style={{
              fontSize: 12, marginTop: 4, lineHeight: 1.5,
              color: InkMuted,
            }}>{subtitle}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {headerActions}

          {onClose && (
            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                background: "rgba(255, 255, 255, 0.55)",
                borderRadius: "50%",
                width: 32, height: 32, color: Ink,
                border: "0.5px solid rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                backdropFilter: "blur(18px) saturate(170%)",
                WebkitBackdropFilter: "blur(18px) saturate(170%)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.75)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.55)";
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ===== BODY : scrollable, padding ajustable ===== */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: noPadding ? 0 : "0 24px",
        position: "relative",
        zIndex: 1,
        // Le padding-top negatif permet au contenu de "remonter" sous le fade
        // gradient du header pour un effet plus immersif
        marginTop: -16,
        paddingTop: 16,
      }}>
        {children}
      </div>

      {/* ===== FOOTER : fade gradient en haut + content ===== */}
      {footer && (
        <div style={{
          padding: "28px 24px 18px",
          flexShrink: 0,
          background: "linear-gradient(180deg, rgba(250, 248, 243, 0.0) 0%, rgba(250, 248, 243, 0.65) 40%, rgba(250, 248, 243, 0.82) 100%)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          position: "relative",
          zIndex: 2,
        }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS - composants frosted glass coherents
// ============================================================================

/**
 * GlassCard - card frosted glass
 * Usage : <GlassCard>contenu</GlassCard>
 *         <GlassCard padding="16px 20px" tint="rgba(255,255,255,0.6)">...</GlassCard>
 */
export function GlassCard({
  children,
  padding = "14px 18px",
  tint = "rgba(255, 255, 255, 0.55)",
  borderRadius = 16,
  marginBottom = 12,
  onClick,
  style = {},
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: tint,
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "0.5px solid rgba(255, 255, 255, 0.6)",
        borderRadius: borderRadius,
        boxShadow: "0 4px 16px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        padding: padding,
        marginBottom: marginBottom,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        ...style,
      }}
      onMouseEnter={onClick ? (e) => {
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
      } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * GlassButton - bouton frosted glass
 * Variants :
 *   - default : transparent, hover plus opaque
 *   - primary : gradient Purple->Magenta solide
 *   - ghost   : sans background, juste un border light
 */
export function GlassButton({
  children,
  onClick,
  variant = "default",
  disabled = false,
  fullWidth = false,
  icon,
  style = {},
}) {
  const [hovered, setHovered] = useState(false);

  let bg, color, border, shadow;
  if (variant === "primary") {
    bg = "linear-gradient(135deg, #5b3df5 0%, #b91c8c 100%)";
    color = "#fff";
    border = "none";
    shadow = "0 4px 16px rgba(91, 61, 245, 0.3)";
  } else if (variant === "ghost") {
    bg = "transparent";
    color = Ink;
    border = "0.5px solid rgba(0,0,0,0.15)";
    shadow = "none";
  } else {
    bg = hovered ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.55)";
    color = Ink;
    border = "0.5px solid rgba(255, 255, 255, 0.6)";
    shadow = "0 2px 8px rgba(0,0,0,0.06)";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "10px 16px",
        borderRadius: 999,
        background: bg,
        color: color,
        border: border,
        backdropFilter: variant === "default" ? "blur(18px) saturate(170%)" : undefined,
        WebkitBackdropFilter: variant === "default" ? "blur(18px) saturate(170%)" : undefined,
        boxShadow: shadow,
        fontSize: 13, fontWeight: 500,
        fontFamily: Sans,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 150ms ease",
        width: fullWidth ? "100%" : "auto",
        ...style,
      }}>
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      {children}
    </button>
  );
}

/**
 * GlassInput - input frosted glass
 */
export function GlassInput({
  value, onChange, placeholder, disabled, type = "text",
  multiline = false, rows = 3,
  style = {},
  onKeyDown,
}) {
  const Component = multiline ? "textarea" : "input";
  return (
    <Component
      type={multiline ? undefined : type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={multiline ? rows : undefined}
      style={{
        width: "100%",
        padding: "11px 16px",
        borderRadius: multiline ? 16 : 999,
        border: "0.5px solid rgba(255, 255, 255, 0.7)",
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        color: Ink, fontSize: 13,
        fontFamily: Sans,
        outline: "none",
        resize: multiline ? "vertical" : "none",
        boxSizing: "border-box",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 150ms ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = Purple; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.7)"; }}
    />
  );
}

/**
 * GlassDivider - separateur fade qui ne casse pas l'effet glass
 */
export function GlassDivider({ marginY = 16 }) {
  return (
    <div style={{
      height: 1,
      margin: marginY + "px 0",
      background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 50%, transparent 100%)",
    }} />
  );
}

/**
 * GlassSection - section avec titre + content frosted
 * Utile pour les onglets type Customize avec plusieurs sections
 */
export function GlassSection({ title, children, marginBottom = 20 }) {
  return (
    <div style={{ marginBottom }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: InkMuted,
          marginBottom: 10,
          paddingLeft: 4,
        }}>{title}</div>
      )}
      {children}
    </div>
  );
}
