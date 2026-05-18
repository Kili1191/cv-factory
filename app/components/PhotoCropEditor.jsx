"use client";

// PhotoCropEditor - Editeur de crop photo plein ecran (style LinkedIn / Instagram)
//
// Features :
//   - Modale plein ecran avec cadre de crop visible (carre / 3:4 / rond)
//   - Toggle ratio : Carre 1:1 / Portrait 3:4 / Rond (= carre + render rond)
//   - Zoom in/out via slider + boutons + / -
//   - Mobile : pinch-to-zoom natif (2 doigts) + drag (1 doigt)
//   - Desktop : drag souris + slider zoom + boutons
//   - Bouton "Importer une nouvelle photo" + "Supprimer" + "OK" + "Annuler"
//   - Sauvegarde l'image croppee dans cv.photo.src (base64 JPEG)
//   - Sauvegarde aussi les params de crop pour pouvoir re-editer plus tard
//
// Props :
//   open       : boolean
//   onClose    : () => void
//   cv         : CV object (lit cv.photo)
//   onSave     : (newPhoto) => void  -- appele avec { mode, src, crop }
//   onRemove   : () => void          -- appele quand l'user clique "Sans photo"
//   T          : i18n
//   lang       : "fr" | "en"
//   defaultRatio : "1:1" | "3:4" | "round" (depend du layout)
//
// State persiste :
//   originalSrc : la base64 de l'image originale (pas la cropped)
//   crop        : { x: number, y: number, zoom: number, ratio: "1:1"|"3:4"|"round" }

import { useState, useRef, useEffect, useCallback } from "react";

const FRAME_DIMENSIONS = {
  "1:1":   { width: 280, height: 280, isRound: false },
  "3:4":   { width: 240, height: 320, isRound: false },
  "round": { width: 280, height: 280, isRound: true  },
};

// Lit un fichier en base64
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Crop une image originale selon les params et renvoie une base64 finale
async function cropImageToBase64(originalSrc, crop, outputSize = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const { x, y, zoom, ratio } = crop;
        const frameDim = FRAME_DIMENSIONS[ratio] || FRAME_DIMENSIONS["1:1"];
        const aspectRatio = frameDim.width / frameDim.height;

        // Output canvas dimensions (preserve aspect ratio)
        const outW = outputSize;
        const outH = Math.round(outputSize / aspectRatio);

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");

        // L'image affichee dans l'editeur :
        // - elle est redimensionnee pour que sa plus petite dimension corresponde
        //   au frame, multipliee par zoom
        // - x, y sont les offsets en pixels (par rapport au centre du frame)
        const frameW = frameDim.width;
        const frameH = frameDim.height;

        const imgRatio = img.width / img.height;
        const frameRatio = frameW / frameH;

        // base scale : couvre le frame (cover)
        let baseW, baseH;
        if (imgRatio > frameRatio) {
          // image plus large que le frame -> hauteur fit le frame
          baseH = frameH;
          baseW = baseH * imgRatio;
        } else {
          baseW = frameW;
          baseH = baseW / imgRatio;
        }
        // applique le zoom
        const displayedW = baseW * zoom;
        const displayedH = baseH * zoom;

        // Position de l'image dans l'editeur :
        //   centerX = frameW/2 + x  (x est l'offset depuis le centre)
        //   l'image part du coin (centerX - displayedW/2, centerY - displayedH/2)
        const imgTopLeftX = (frameW / 2 + x) - displayedW / 2;
        const imgTopLeftY = (frameH / 2 + y) - displayedH / 2;

        // Ratio pixel image vs pixel frame
        const imgScaleX = img.width / displayedW;
        const imgScaleY = img.height / displayedH;

        // Source rect on the original image :
        //   on prend ce qui correspond au frame entier
        const srcX = (-imgTopLeftX) * imgScaleX;
        const srcY = (-imgTopLeftY) * imgScaleY;
        const srcW = frameW * imgScaleX;
        const srcH = frameH * imgScaleY;

        ctx.drawImage(
          img,
          srcX, srcY, srcW, srcH,
          0, 0, outW, outH
        );

        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = originalSrc;
  });
}

export default function PhotoCropEditor({
  open,
  onClose,
  cv,
  onSave,
  onRemove,
  T,
  lang = "fr",
  defaultRatio = "1:1",
}) {
  const photo = cv?.photo || {};

  // State principal
  const [originalSrc, setOriginalSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, zoom: 1, ratio: defaultRatio });
  const [loading, setLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

  const fileInputRef = useRef(null);
  const frameRef = useRef(null);
  const imgRef = useRef(null);

  // Drag state
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    cropStartX: 0,
    cropStartY: 0,
  });

  // Pinch state (mobile)
  const pinchRef = useRef({
    pinching: false,
    initialDistance: 0,
    initialZoom: 1,
  });

  // Anim entree / sortie
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setClosing(false);
      // Restaure depuis cv.photo si dispo
      if (photo.originalSrc) {
        setOriginalSrc(photo.originalSrc);
        if (photo.crop) {
          setCrop({
            x: photo.crop.x || 0,
            y: photo.crop.y || 0,
            zoom: photo.crop.zoom || 1,
            ratio: photo.crop.ratio || defaultRatio,
          });
        }
      } else if (photo.src && photo.mode === "upload") {
        // Pas d'original sauvegarde, on prend la version croppee comme original
        setOriginalSrc(photo.src);
        setCrop({ x: 0, y: 0, zoom: 1, ratio: defaultRatio });
      } else {
        setOriginalSrc(null);
        setCrop({ x: 0, y: 0, zoom: 1, ratio: defaultRatio });
      }
    } else if (shouldRender) {
      setClosing(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onClose(); };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  // Pick file
  const handleFilePick = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert(lang === "en"
        ? "Please pick an image file."
        : "Choisis un fichier image.");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      setOriginalSrc(dataUrl);
      setCrop({ x: 0, y: 0, zoom: 1, ratio: defaultRatio });
    } catch (err) {
      console.error("[PhotoCropEditor] readFile failed:", err);
      alert(lang === "en"
        ? "Could not load this image."
        : "Impossible de charger cette image.");
    }
    setLoading(false);
    e.target.value = "";
  }, [lang, defaultRatio]);

  // Drag handlers (mouse + touch)
  const onDragStart = useCallback((clientX, clientY) => {
    dragRef.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      cropStartX: crop.x,
      cropStartY: crop.y,
    };
  }, [crop.x, crop.y]);

  const onDragMove = useCallback((clientX, clientY) => {
    if (!dragRef.current.dragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setCrop(c => ({
      ...c,
      x: dragRef.current.cropStartX + dx,
      y: dragRef.current.cropStartY + dy,
    }));
  }, []);

  const onDragEnd = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  // Pinch handlers
  const getDistance = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        pinching: true,
        initialDistance: getDistance(e.touches[0], e.touches[1]),
        initialZoom: crop.zoom,
      };
    } else if (e.touches.length === 1) {
      onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [crop.zoom, onDragStart]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current.pinching) {
      const d = getDistance(e.touches[0], e.touches[1]);
      const scale = d / pinchRef.current.initialDistance;
      const newZoom = Math.max(0.5, Math.min(3, pinchRef.current.initialZoom * scale));
      setCrop(c => ({ ...c, zoom: newZoom }));
    } else if (e.touches.length === 1 && dragRef.current.dragging) {
      onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [onDragMove]);

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      pinchRef.current.pinching = false;
    }
    if (e.touches.length === 0) {
      onDragEnd();
    }
  }, [onDragEnd]);

  // Mouse handlers
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  }, [onDragStart]);

  useEffect(() => {
    const move = (e) => onDragMove(e.clientX, e.clientY);
    const up = () => onDragEnd();
    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
    }
  }, [onDragMove, onDragEnd]);

  // Wheel zoom (desktop bonus)
  const onWheel = useCallback((e) => {
    if (!originalSrc) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setCrop(c => ({
      ...c,
      zoom: Math.max(0.5, Math.min(3, c.zoom + delta)),
    }));
  }, [originalSrc]);

  // Save
  const handleSave = useCallback(async () => {
    if (!originalSrc) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const croppedSrc = await cropImageToBase64(originalSrc, crop, 400);
      onSave({
        mode: "upload",
        src: croppedSrc,
        originalSrc: originalSrc,
        crop: { x: crop.x, y: crop.y, zoom: crop.zoom, ratio: crop.ratio },
      });
      onClose();
    } catch (err) {
      console.error("[PhotoCropEditor] crop failed:", err);
      alert(lang === "en"
        ? "Could not save this photo. Try again."
        : "Impossible de sauvegarder cette photo. Reessaie.");
      setLoading(false);
    }
  }, [originalSrc, crop, onSave, onClose, lang]);

  const handleRemove = useCallback(() => {
    onRemove();
    onClose();
  }, [onRemove, onClose]);

  if (!shouldRender) return null;

  const tx = lang === "en" ? {
    title: "Edit photo",
    subtitle: "Drag to reposition. Zoom in/out as needed.",
    pickFile: "Choose a photo",
    pickFileFirst: "Click below to upload a photo",
    ratio_label: "Frame shape",
    ratio_square: "Square",
    ratio_portrait: "Portrait",
    ratio_round: "Round",
    zoom_label: "Zoom",
    save: "Save",
    cancel: "Cancel",
    remove: "Remove photo",
    loading: "Processing...",
  } : {
    title: "Modifier la photo",
    subtitle: "Glisse pour repositionner. Zoom in/out selon ton besoin.",
    pickFile: "Choisir une photo",
    pickFileFirst: "Clique ci-dessous pour importer une photo",
    ratio_label: "Forme du cadre",
    ratio_square: "Carre",
    ratio_portrait: "Portrait",
    ratio_round: "Rond",
    zoom_label: "Zoom",
    save: "Enregistrer",
    cancel: "Annuler",
    remove: "Supprimer la photo",
    loading: "Traitement...",
  };

  const frameDim = FRAME_DIMENSIONS[crop.ratio] || FRAME_DIMENSIONS["1:1"];

  // Image displayed dimensions (cover the frame, multiplied by zoom)
  const imgDimensions = (() => {
    if (!originalSrc || !imgRef.current) {
      return { width: frameDim.width, height: frameDim.height };
    }
    const img = imgRef.current;
    if (!img.naturalWidth) return { width: frameDim.width, height: frameDim.height };
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const frameRatio = frameDim.width / frameDim.height;
    let baseW, baseH;
    if (imgRatio > frameRatio) {
      baseH = frameDim.height;
      baseW = baseH * imgRatio;
    } else {
      baseW = frameDim.width;
      baseH = baseW / imgRatio;
    }
    return {
      width: baseW * crop.zoom,
      height: baseH * crop.zoom,
    };
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8, 8, 12, 0.85)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 900,
          opacity: closing ? 0 : 1,
          transition: "opacity 200ms ease-out",
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tx.title}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 901,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', -apple-system, sans-serif",
          color: "#fff",
          opacity: closing ? 0 : 1,
          transition: "opacity 200ms ease-out",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            aria-label={tx.cancel}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              width: 38,
              height: 38,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}>{tx.title}</div>
            <div style={{
              fontSize: 11,
              opacity: 0.6,
              marginTop: 2,
            }}>{originalSrc ? tx.subtitle : tx.pickFileFirst}</div>
          </div>
          <button
            onClick={handleSave}
            disabled={!originalSrc || loading}
            aria-label={tx.save}
            style={{
              background: (!originalSrc || loading)
                ? "rgba(255,255,255,0.15)"
                : "linear-gradient(135deg, #5b3df5, #b91c8c)",
              border: "none",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 999,
              cursor: (!originalSrc || loading) ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              boxShadow: (!originalSrc || loading)
                ? "none"
                : "0 4px 14px rgba(91, 61, 245, 0.4)",
              transition: "all 180ms ease",
            }}
          >
            {loading ? tx.loading : tx.save}
          </button>
        </div>

        {/* Frame area */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          touchAction: "none",
        }}>
          {!originalSrc && (
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                padding: "18px 28px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #5b3df5, #b91c8c)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 8px 24px rgba(91, 61, 245, 0.4)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {tx.pickFile}
            </button>
          )}

          {originalSrc && (
            <div
              ref={frameRef}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onWheel={onWheel}
              style={{
                position: "relative",
                width: frameDim.width,
                height: frameDim.height,
                cursor: dragRef.current.dragging ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
                overflow: "visible",
              }}
            >
              {/* Image en dessous (sans crop) */}
              <div style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px))`,
                width: imgDimensions.width,
                height: imgDimensions.height,
                opacity: 0.4,
                pointerEvents: "none",
                transition: dragRef.current.dragging ? "none" : "width 150ms ease, height 150ms ease",
              }}>
                <img
                  ref={imgRef}
                  src={originalSrc}
                  alt=""
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "fill",
                    display: "block",
                  }}
                />
              </div>
              {/* Frame de crop (visible, image dedans = pleine opacite) */}
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: frameDim.isRound ? "50%" : 8,
                overflow: "hidden",
                boxShadow: "0 0 0 9999px rgba(8,8,12,0.7), 0 0 0 2px #fff",
                pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px))`,
                  width: imgDimensions.width,
                  height: imgDimensions.height,
                  transition: dragRef.current.dragging ? "none" : "width 150ms ease, height 150ms ease",
                }}>
                  <img
                    src={originalSrc}
                    alt=""
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "fill",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {originalSrc && (
          <div style={{
            padding: "16px 20px 22px",
            background: "rgba(0,0,0,0.5)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}>
            {/* Ratio toggle */}
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.7,
                marginBottom: 8,
              }}>{tx.ratio_label}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "1:1", label: tx.ratio_square, icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="1"/>
                    </svg>
                  )},
                  { id: "3:4", label: tx.ratio_portrait, icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="3" width="12" height="18" rx="1"/>
                    </svg>
                  )},
                  { id: "round", label: tx.ratio_round, icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9"/>
                    </svg>
                  )},
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setCrop(c => ({ ...c, ratio: opt.id }))}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: 10,
                      border: "1px solid " + (crop.ratio === opt.id ? "#fff" : "rgba(255,255,255,0.2)"),
                      background: crop.ratio === opt.id ? "rgba(255,255,255,0.15)" : "transparent",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 150ms ease",
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom slider + buttons */}
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.7,
                marginBottom: 8,
              }}>{tx.zoom_label} : {crop.zoom.toFixed(2)}x</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setCrop(c => ({ ...c, zoom: Math.max(0.5, c.zoom - 0.1) }))}
                  aria-label="Zoom out"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.01"
                  value={crop.zoom}
                  onChange={(e) => setCrop(c => ({ ...c, zoom: parseFloat(e.target.value) }))}
                  style={{
                    flex: 1,
                    accentColor: "#b91c8c",
                  }}
                />
                <button
                  onClick={() => setCrop(c => ({ ...c, zoom: Math.min(3, c.zoom + 0.1) }))}
                  aria-label="Zoom in"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Bottom actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  flex: 1,
                  padding: "11px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {tx.pickFile}
              </button>
              <button
                onClick={handleRemove}
                style={{
                  padding: "11px 16px",
                  borderRadius: 999,
                  background: "transparent",
                  border: "1px solid rgba(217, 119, 87, 0.5)",
                  color: "#e89579",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                </svg>
                {tx.remove}
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFilePick}
        />
      </div>
    </>
  );
}
