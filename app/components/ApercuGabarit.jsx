"use client";

// THE THUMBNAIL OF A LAYOUT
//
// The real layout component rendered at the size of its card, on the
// demo CV, cut at two thirds of the page where the six shapes differ.
// Extracted from the root so the front page shows the same six previews
// as the app's appearance picker. The layouts load on demand: the front
// page must not carry the whole CV renderer in its first load.

import React, { Component, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DEMO_CV, DEMO_THEME } from "../../lib/gabarits";

const charger = (nom) => dynamic(() => import("./CVLayouts").then((m) => m[nom]), { ssr: false, loading: () => null });
const COMPOSANTS = {
  sidebar: charger("CVSidebar"), classic: charger("CVClassic"), timeline: charger("CVTimeline"),
  swiss: charger("CVSwiss"), compact: charger("CVCompact"), ats: charger("CVAts"),
};

// [Fix 2026-05-20] ErrorBoundary pour isoler les crashes de LayoutPreview
// Si un layout CV plante, on affiche un placeholder au lieu de tout casser
class LayoutPreviewErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn("[LayoutPreview] crashed:", error?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: 220, background: "#f5f5f5",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#999", fontSize: 11, fontFamily: "Inter, sans-serif",
        }}>Preview indisponible</div>
      );
    }
    return this.props.children;
  }
}

export default function ApercuGabarit({ kind, locale = "fr" }) {
  // [Fix 2026-05-20] Hydrated guard : ne render le composant CV lourd
  // qu'apres hydration cote client. Evite hydration mismatch (#418/#423).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  // LA VIGNETTE SE MET A LA TAILLE DE SA CARTE
  //
  // L'echelle valait 0.18 en dur, quelle que soit la carte qui l'accueille.
  // Une page A4 large de 1080 devenait donc 194px, toujours. Dans le panneau
  // de reglages les cartes font plus de 220px et ca passait ; sur l'ecran
  // d'import d'un telephone, trois colonnes dans 390px donnent des cartes de
  // 110px, et la vignette debordait de 42px de chaque cote.
  //
  // Resultat vu sur thenuvi.com : cinq apercus sur six coupes en plein milieu
  // d'un mot, "Alex Martin" reduit a "Martin". Or ces vignettes existent pour
  // une seule raison, choisir une forme qu'un nom ne decrit pas. Coupees, il
  // ne reste que le nom.
  //
  // On mesure donc la carte au lieu de parier sur sa largeur.
  const boite = useRef(null);
  const [largeur, setLargeur] = useState(0);
  useEffect(() => {
    const el = boite.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect.width;
      if (w) setLargeur(w);
    });
    ro.observe(el);
    setLargeur(el.clientWidth);
    return () => ro.disconnect();
  }, [hydrated]);

  const Comp = COMPOSANTS[kind] || null;

  // Placeholder SSR : pas de render du vrai CV avant hydration
  // (les vrais composants CV peuvent utiliser des hooks/window qui
  // creent des mismatches entre serveur et client)
  if (!Comp || !hydrated) {
    return (
      <div style={{
        height: 220, background: "#fafafa",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#bbb", fontSize: 10, fontFamily: "Inter, sans-serif",
        borderBottom: "0.5px solid #e5e5e5",
      }}>{Comp ? "..." : "Preview"}</div>
    );
  }

  // T minimal pour les libelles de l'apercu. Ils etaient figes en francais :
  // quelqu'un qui choisit sa mise en page en anglais lisait "Formation" et
  // "Competences" dans la vignette du document qu'il est en train de choisir.
  const T = (locale === "en")
    ? { cv_p: "Profile", cv_el: "Experience", cv_ed: "Education",
        cv_s: "Skills", cv_l: "Languages", cv_c: "Certifications",
        cv_ct: "Contact" }
    : { cv_p: "Profil", cv_el: "Experience", cv_ed: "Formation",
        cv_s: "Competences", cv_l: "Langues", cv_c: "Certifications",
        cv_ct: "Contact" };

  const realWidth = 1080;
  const realHeight = 1400;
  // Avant la premiere mesure on garde l'ancienne echelle : la vignette ne
  // clignote pas, elle se recale au premier rendu.
  const scale = largeur > 0 ? largeur / realWidth : 0.18;
  // ON NE MONTRE QUE LE HAUT DE LA PAGE
  //
  // Une A4 entiere laissait la moitie basse vide dans chaque carte, parce que
  // le CV de demonstration ne remplit pas la page. La carte etait haute, et
  // surtout ce qui distingue les six formes - la bande, les colonnes, la
  // place du titre - se joue en haut. On coupe donc au deux tiers.
  const PART_VISIBLE = 0.66;
  const previewH = realHeight * scale * PART_VISIBLE;

  return (
    <LayoutPreviewErrorBoundary>
      <div ref={boite} style={{
        width: "100%",
        height: previewH || 120,
        overflow: "hidden",
        position: "relative",
        background: "#f8f8f8",
        borderBottom: "0.5px solid #e5e5e5",
      }}>
        <div style={{
          width: realWidth,
          height: realHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          // La vignette fait exactement la largeur de la carte : plus rien a
          // recentrer, et donc plus rien a couper sur les bords.
          left: 0,
          pointerEvents: "none",
          userSelect: "none",
        }}>
          <Comp
            cv={DEMO_CV}
            set={() => {}}
            t={DEMO_THEME}
            T={T}
            locale={locale}
          />
        </div>
      </div>
    </LayoutPreviewErrorBoundary>
  );
}
