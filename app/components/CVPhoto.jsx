"use client";

// CVPhoto - Composant photo du CV avec 3 modes
//
// Modes :
//   "upload"   : photo perso uploadee (base64, stockee dans cv.photo.src)
//   "initials" : cercle avec initiales du nom (defaut, comme avant)
//   "none"     : rien affiche du tout (zone disparait)
//
// UX : click sur la photo -> menu deroulant 3 choix
//      Upload -> ouvre file picker
//      Initials -> bascule en mode initials
//      None -> cache la photo
//
// Props :
//   cv      : objet CV (lit cv.name, cv.photo)
//   set     : setter useState (function)
//   t       : theme (couleurs t.ac, t.sb, t.st)
//   variant : "round" (Sidebar) | "square" (Classic)
//   size    : pixels (default 52)
//   T       : i18n
//   locale  : "fr" | "en"

import { useState, useRef, useEffect } from "react";

// Compute initials from cv.name :
//   "Kilian Reault" -> "KR"
//   "Marie Dupont Curie" -> "MC" (premiere + derniere)
//   "Plato" -> "P"
//   "" -> "?"
function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
}

// Resize an image file to a thumbnail (max 256x256) and return base64.
// Cela evite de stocker des images de 10 Mo dans localStorage.
async function fileToBase64Thumb(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        // Square crop centered
        const minSide = Math.min(width, height);
        const offsetX = (width - minSide) / 2;
        const offsetY = (height - minSide) / 2;
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, offsetX, offsetY, minSide, minSide, 0, 0, maxSize, maxSize);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CVPhoto({
  cv,
  set,
  t = {},
  variant = "round",
  size = 52,
  T = {},
  locale = "fr",
}) {
  const photo = cv.photo || { mode: "initials" };
  const mode = photo.mode || "initials";
  const src = photo.src || null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const wrapRef = useRef(null);

  // Fallback couleurs si t pas fourni
  const accentColor = t.ac || "#5b3df5";
  const accentBg = accentColor + "33"; // 20% opacity hex
  const accentText = t.ac || accentColor;
  const fontFamily = t.hf || "'Fraunces', serif";

  // Close menu on click outside
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

  // Si mode "none" -> on n'affiche rien du tout (la zone disparait)
  if (mode === "none") {
    // On garde quand meme un petit bouton invisible pour pouvoir changer
    // ATTENTION : ce bouton n'apparait que au hover de la zone vide (a la place de la photo).
    // Pour l'instant : zone vide reduite (small) avec hover pour revenir.
    return (
      <div
        ref={wrapRef}
        style={{
          width: size,
          height: 12, // tres mince
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
            variant={variant}
            mode={mode}
            locale={locale}
            onPickUpload={() => fileInputRef.current && fileInputRef.current.click()}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            setUploading(true);
            try {
              const b64 = await fileToBase64Thumb(file, 256);
              set(p => ({ ...p, photo: { mode: "upload", src: b64 } }));
              setMenuOpen(false);
            } catch (err) {
              console.error("[CVPhoto] Upload failed:", err);
              alert(locale === "en"
                ? "Could not load this image. Try another file."
                : "Impossible de charger cette image. Essaie un autre fichier.");
            }
            setUploading(false);
            e.target.value = ""; // reset pour pouvoir re-uploader le meme
          }}
        />
      </div>
    );
  }

  // Common shape style (rond ou carre)
  const shapeStyle = variant === "square"
    ? { borderRadius: 6 }
    : { borderRadius: "50%" };

  return (
    <div
      ref={wrapRef}
      style={{
        width: size,
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
          width: size,
          height: size,
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
          getInitials(cv.name)
        )}
        {uploading && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
          }}>
            ...
          </div>
        )}
      </button>

      {menuOpen && (
        <PhotoMenu
          variant={variant}
          mode={mode}
          locale={locale}
          onPickUpload={() => fileInputRef.current && fileInputRef.current.click()}
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          setUploading(true);
          try {
            const b64 = await fileToBase64Thumb(file, 256);
            set(p => ({ ...p, photo: { mode: "upload", src: b64 } }));
            setMenuOpen(false);
          } catch (err) {
            console.error("[CVPhoto] Upload failed:", err);
            alert(locale === "en"
              ? "Could not load this image. Try another file."
              : "Impossible de charger cette image. Essaie un autre fichier.");
          }
          setUploading(false);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// PhotoMenu : mini-menu deroulant qui apparait sous la photo au click
function PhotoMenu({
  variant,
  mode,
  locale,
  onPickUpload,
  onPickInitials,
  onPickNone,
  accent,
}) {
  const tx = locale === "en" ? {
    upload: "Upload photo",
    initials: "Initials",
    none: "No photo",
  } : {
    upload: "Importer une photo",
    initials: "Initiales",
    none: "Sans photo",
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
        minWidth: 160,
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
