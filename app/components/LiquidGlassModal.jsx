"use client";

// LiquidGlassModal v2 - tokens centralises (verdict panel 2026-05-21)
//
// CHANGEMENT v2 : header/footer gradients allegés (le verre vient maintenant
// du LiquidGlassPanel via --nuvi-glass-panel, plus besoin d'une couche cream
// opaque par-dessus). Helpers GlassCard/Button/Input alignes sur les memes
// tokens. Memes couleurs partout, niveau "panneau".

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

// Verre "carte" interne (bulles, cards) : un cran plus transparent que le
// panneau pour la profondeur, mais coherent. Centralise ici.
const CARD_BG   = "var(--nuvi-glass-card, rgba(255,255,255,0.5))";
const CARD_BLUR = "var(--nuvi-glass-card-blur, blur(20px) saturate(180%))";

export default function LiquidGlassModal({
  open = true,
  onClose,
  layout = "auto",
  width = 480,
  height,
  maxHeight = "85vh",
  eyebrow,
  title,
  titleAccent,
  subtitle,
  headerActions,
  footer,
  children,
  closeOnEscape = true,
  noPadding = false,
}) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const effectiveLayout =
    layout === "auto" ? (isMobile ? "bottom" : "side") : layout;

  useEffect(() => {
    if (!closeOnEscape || !onClose) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [closeOnEscape, onClose]);

  if (!open) return null;

  if (effectiveLayout === "side") {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: width,
          height: "100vh",
          zIndex: 99998,
          fontFamily: Sans,
          pointerEvents: "none",
          animation: "lgm-slide-side 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <style>{`
          @keyframes lgm-slide-side {
            0%   { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
        `}</style>

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

function ModalContent({
  eyebrow, title, titleAccent, subtitle,
  headerActions, footer, onClose, children, layout, noPadding,
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", overflow: "hidden",
    }}>
      {/* HEADER : fade leger (le verre vient du panel maintenant, plus besoin
          d'une couche cream 0.82 opaque). Juste un voile pour lisibilite titre. */}
      <div style={{
        padding: "16px 24px 28px",
        flexShrink: 0,
        background: "linear-gradient(180deg, rgba(250,248,243,0.45) 0%, rgba(250,248,243,0.25) 65%, rgba(250,248,243,0.0) 100%)",
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
                background: CARD_BG,
                borderRadius: "50%",
                width: 32, height: 32, color: Ink,
                border: "0.5px solid rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                backdropFilter: CARD_BLUR,
                WebkitBackdropFilter: CARD_BLUR,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                transition: "all 150ms ease",
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

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: noPadding ? 0 : "0 24px",
        position: "relative",
        zIndex: 1,
        marginTop: -16,
        paddingTop: 16,
      }}>
        {children}
      </div>

      {footer && (
        <div style={{
          padding: "28px 24px 18px",
          flexShrink: 0,
          background: "linear-gradient(180deg, rgba(250,248,243,0.0) 0%, rgba(250,248,243,0.25) 40%, rgba(250,248,243,0.45) 100%)",
          position: "relative",
          zIndex: 2,
        }}>
          {footer}
        </div>
      )}
    </div>
  );
}

export function GlassCard({
  children,
  padding = "14px 18px",
  tint,
  borderRadius = 16,
  marginBottom = 12,
  onClick,
  style = {},
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: tint || CARD_BG,
        backdropFilter: CARD_BLUR,
        WebkitBackdropFilter: CARD_BLUR,
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
    bg = hovered ? "rgba(255, 255, 255, 0.7)" : CARD_BG;
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
        backdropFilter: variant === "default" ? CARD_BLUR : undefined,
        WebkitBackdropFilter: variant === "default" ? CARD_BLUR : undefined,
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
        background: CARD_BG,
        backdropFilter: CARD_BLUR,
        WebkitBackdropFilter: CARD_BLUR,
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

export function GlassDivider({ marginY = 16 }) {
  return (
    <div style={{
      height: 1,
      margin: marginY + "px 0",
      background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 50%, transparent 100%)",
    }} />
  );
}

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
