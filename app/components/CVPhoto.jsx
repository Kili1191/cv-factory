"use client";

// CVPhoto v2 - Composant photo du CV avec 3 modes + crop editor
//
// v1 -> v2 changes :
//   - "Upload" ouvre maintenant PhotoCropEditor (modale plein ecran avec crop)
//   - Plus de file picker direct, tout passe par l'editeur
//   - Stocke aussi cv.photo.originalSrc + cv.photo.crop pour re-editer plus tard
//
// Modes :
//   "upload"   : photo perso croppee (base64 dans cv.photo.src)
//   "initials" : cercle avec initiales du nom
//   "none"     : rien affiche
//
// UX : click sur la photo -> menu 3 choix
//      Upload -> ouvre PhotoCropEditor (modale plein ecran)
//      Initials -> bascule en mode initials
//      None -> cache la photo

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";

const PhotoCropEditor = dynamic(() => import("./PhotoCropEditor"), { ssr: false });

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
}

export default function CVPhoto({
  cv,
  set,
  t = {},
  variant = "round",
  size = 52,
  T = {},
  locale = "en",
}) {
  // Telephone : le menu doit sortir du CV et s'afficher au centre de l'ecran.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const read = () => setNarrow(window.innerWidth < 768);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const photo = cv.photo || { mode: "initials" };
  const mode = photo.mode || "initials";
  const src = photo.src || null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const wrapRef = useRef(null);

  // Default ratio for the editor: prefer saved choice, else infer from variant
  const defaultRatio = (photo.crop && photo.crop.ratio)
    ? photo.crop.ratio
    : (variant === "round" ? "round" : "1:1");

  const accentColor = t.ac || "#5b3df5";
  const accentBg = accentColor + "33";
  const accentText = t.ac || accentColor;
  const fontFamily = t.hf || "'Fraunces', serif";

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handlePhotoSave = (newPhoto) => {
    set(p => ({ ...p, photo: newPhoto }));
    setMenuOpen(false);
  };

  const handlePhotoRemove = () => {
    set(p => ({ ...p, photo: { mode: "none" } }));
    setMenuOpen(false);
  };

  if (mode === "none") {
    return (
      <>
        <div
          ref={wrapRef}
          style={{
            width: size,
            height: 12,
            margin: "0 auto 8px",
            position: "relative",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={locale === "en" ? "Add photo" : "Ajouter une photo"}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "1px dashed " + (accentColor + "66"),
              background: "transparent",
              color: accentColor,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              opacity: 0.5,
              transition: "opacity 150ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          {menuOpen && (
            <PhotoMenu
              mode={mode}
              locale={locale}
              onPickUpload={() => {
                setMenuOpen(false);
                setEditorOpen(true);
              }}
              onPickInitials={() => {
                set(p => ({ ...p, photo: { mode: "initials" } }));
                setMenuOpen(false);
              }}
              onPickNone={() => {
                set(p => ({ ...p, photo: { mode: "none" } }));
                setMenuOpen(false);
              }}
              accent={accentColor}
            />
          )}
        </div>
        {editorOpen && (
          <PhotoCropEditor
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            cv={cv}
            onSave={handlePhotoSave}
            onRemove={handlePhotoRemove}
            T={T}
            lang={locale}
            defaultRatio={defaultRatio}
          />
        )}
      </>
    );
  }

  // Compute shape based on user choice in editor (cv.photo.crop.ratio).
  // Falls back to the variant prop for "initials" / "none" / legacy CVs.
  const ratioChoice = (photo.crop && photo.crop.ratio)
    ? photo.crop.ratio
    : (variant === "round" ? "round" : "1:1");

  // Dimensions based on ratio
  // Square 1:1 and Round  -> size x size
  // Portrait 3:4          -> size x (size * 4/3)
  const renderW = size;
  const renderH = ratioChoice === "3:4" ? Math.round(size * 4 / 3) : size;

  // Border-radius
  let borderRadiusValue = "50%";
  if (ratioChoice === "1:1") borderRadiusValue = 8;
  else if (ratioChoice === "3:4") borderRadiusValue = 8;
  // round -> 50%

  const shapeStyle = { borderRadius: borderRadiusValue };

  return (
    <>
      <div
        ref={wrapRef}
        style={{
          width: renderW,
          margin: "0 auto 12px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label={locale === "en" ? "Change photo" : "Changer la photo"}
          title={locale === "en" ? "Click to change" : "Clique pour modifier"}
          style={{
            width: renderW,
            height: renderH,
            ...shapeStyle,
            border: "2px solid " + accentColor,
            background: mode === "upload" && src ? "transparent" : accentBg,
            color: accentText,
            cursor: "pointer",
            padding: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.36),
            fontFamily: fontFamily,
            fontWeight: 700,
            position: "relative",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 0 3px " + accentColor + "33";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {mode === "upload" && src ? (
            <img
              src={src}
              alt={cv.name || "Photo"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            // Decoratif : dessine dans le CV, exclu de la couche de texte que
            // lisent les robots de tri (voir overlayTextLayer).
            <span data-cvf-decorative="true" aria-hidden="true">
              {getInitials(cv.name)}
            </span>
          )}
        </button>

        {menuOpen && (
          <PhotoMenu
            mode={mode}
            locale={locale}
            onPickUpload={() => {
              setMenuOpen(false);
              setEditorOpen(true);
            }}
            onPickInitials={() => {
              set(p => ({ ...p, photo: { mode: "initials" } }));
              setMenuOpen(false);
            }}
            onPickNone={() => {
              set(p => ({ ...p, photo: { mode: "none" } }));
              setMenuOpen(false);
            }}
            accent={accentColor}
            narrow={narrow}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>

      {editorOpen && (
        <PhotoCropEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          cv={cv}
          onSave={handlePhotoSave}
          onRemove={handlePhotoRemove}
          T={T}
          lang={locale}
          defaultRatio={defaultRatio}
        />
      )}
    </>
  );
}

function PhotoMenu({
  mode,
  locale,
  onPickUpload,
  onPickInitials,
  onPickNone,
  accent,
  narrow = false,
  onClose = () => {},
}) {
  const tx = locale === "en" ? {
    upload: mode === "upload" ? "Edit photo" : "Upload photo",
    initials: "Initials",
    none: "No photo",
    title: "Photo",
    cancel: "Cancel",
  } : {
    upload: mode === "upload" ? "Modifier la photo" : "Importer une photo",
    initials: "Initiales",
    none: "Sans photo",
    title: "Photo",
    cancel: "Annuler",
  };

  const itemStyle = (active) => ({
    width: "100%",
    padding: "8px 12px",
    border: "none",
    background: active ? accent + "1a" : "#fff",
    color: active ? accent : "#0a0a0a",
    fontSize: 11,
    fontWeight: active ? 600 : 500,
    fontFamily: "'Inter', -apple-system, sans-serif",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "background 120ms ease",
  });

  // [Fix] Sur telephone ce menu etait illisible, et pas parce qu'il etait mal
  // dimensionne : il est dessine A L'INTERIEUR du CV, que l'apercu mobile
  // reduit avec transform: scale(). A l'echelle 0.45, ses 11px de texte en
  // font 5. Un `position: fixed` ne suffirait pas a s'en echapper, puisqu'un
  // transform cree un bloc conteneur pour ses descendants fixes. Il faut donc
  // sortir du CV par un portail vers document.body, ou le menu retrouve sa
  // taille reelle : une boite centree, lisible, avec des cibles de 44px.
  const items = (big) => [
    { key: "upload", on: onPickUpload, active: mode === "upload", label: tx.upload,
      icon: (<svg width={big ? 18 : 13} height={big ? 18 : 13} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/></svg>) },
    { key: "initials", on: onPickInitials, active: mode === "initials", label: tx.initials,
      icon: (<svg width={big ? 18 : 13} height={big ? 18 : 13} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M8 13h.01M16 13h.01"/></svg>) },
    { key: "none", on: onPickNone, active: mode === "none", label: tx.none,
      icon: (<svg width={big ? 18 : 13} height={big ? 18 : 13} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>) },
  ];

  if (narrow && typeof document !== "undefined") {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 5000,
          background: "rgba(10,10,10,.55)",
          WebkitBackdropFilter: "blur(6px)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 340,
            background: "#fff", borderRadius: 18,
            boxShadow: "0 20px 60px rgba(0,0,0,.28)",
            overflow: "hidden",
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          <div style={{
            padding: "16px 20px 12px", fontSize: 15, fontWeight: 600,
            color: "#0a0a0a", borderBottom: "0.5px solid #e8e3d6",
          }}>{tx.title}</div>
          {items(true).map(it => (
            <button
              key={it.key}
              onClick={it.on}
              style={{
                width: "100%", minHeight: 52, padding: "0 20px",
                border: "none", borderBottom: "0.5px solid #f0ece3",
                background: it.active ? accent + "1a" : "#fff",
                color: it.active ? accent : "#0a0a0a",
                fontSize: 15, fontWeight: it.active ? 600 : 500,
                fontFamily: "inherit", textAlign: "left", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              {it.icon}{it.label}
            </button>
          ))}
          <button
            onClick={onClose}
            style={{
              width: "100%", minHeight: 52, padding: "0 20px", border: "none",
              background: "#fff", color: "#6b6b6b", fontSize: 15, fontWeight: 500,
              fontFamily: "inherit", cursor: "pointer",
            }}
          >{tx.cancel}</button>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        border: "0.5px solid #e8e3d6",
        zIndex: 100,
        minWidth: 170,
        overflow: "hidden",
        animation: "cvPhotoMenuIn 160ms ease-out",
      }}
    >
      <button
        onClick={onPickUpload}
        style={itemStyle(mode === "upload")}
        onMouseEnter={(e) => {
          if (mode !== "upload") e.currentTarget.style.background = "#faf8f3";
        }}
        onMouseLeave={(e) => {
          if (mode !== "upload") e.currentTarget.style.background = "#fff";
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {tx.upload}
      </button>
      <button
        onClick={onPickInitials}
        style={itemStyle(mode === "initials")}
        onMouseEnter={(e) => {
          if (mode !== "initials") e.currentTarget.style.background = "#faf8f3";
        }}
        onMouseLeave={(e) => {
          if (mode !== "initials") e.currentTarget.style.background = "#fff";
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M8 13h.01M16 13h.01"/>
        </svg>
        {tx.initials}
      </button>
      <button
        onClick={onPickNone}
        style={itemStyle(mode === "none")}
        onMouseEnter={(e) => {
          if (mode !== "none") e.currentTarget.style.background = "#faf8f3";
        }}
        onMouseLeave={(e) => {
          if (mode !== "none") e.currentTarget.style.background = "#fff";
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        {tx.none}
      </button>
      <style>{`
        @keyframes cvPhotoMenuIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
