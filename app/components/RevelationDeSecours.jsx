"use client";

import { useEffect } from "react";

/**
 * LE DEFILEMENT ANIME, POUR LES NAVIGATEURS QUI NE SAVENT PAS LE FAIRE SEULS
 *
 * Les sections de la vitrine se revelent avec animation-timeline: view(),
 * qui lie l'animation a la position de defilement. C'est la bonne facon de
 * le faire : rien en JavaScript, le mouvement suit le doigt exactement.
 *
 * Mais toute cette partie vit dans un @supports. Les navigateurs qui ne
 * connaissent pas cette propriete recoivent la regle de base, opacity: 1, et
 * donc AUCUN mouvement. Pas un mouvement degrade : aucun.
 *
 * Safari en fait partie, et c'est la moitie du trafic sur telephone. La page
 * dont tout l'interet tient a sa mise en scene se montrait donc parfaitement
 * immobile a une bonne part de ses visiteurs, sans que rien ne le signale
 * cote developpement : sur Chrome, tout marchait.
 *
 * POURQUOI CE REPLI NE PEUT PAS CACHER LA PAGE
 *
 * Le piege evident serait de poser opacity: 0 en CSS et de compter sur le
 * JavaScript pour la remonter. Si le script ne part pas - erreur ailleurs,
 * script bloque, navigateur ancien - la page reste blanche. Une page vide
 * est infiniment pire qu'une page sans animation.
 *
 * L'opacite de depart n'est donc posee QUE par ce composant, une fois qu'il
 * tourne et qu'il a arme l'observateur. Sans JavaScript, rien ne se cache.
 *
 * Un filet double la mesure : si l'observateur ne se declenche jamais - un
 * ancetre transforme, un onglet ouvert en arriere-plan - tout se revele au
 * bout de deux secondes.
 */
const FILET_MS = 2000;

export default function RevelationDeSecours() {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    // Le navigateur sait deja faire : on ne touche a rien.
    const sait = typeof CSS !== "undefined"
      && typeof CSS.supports === "function"
      && CSS.supports("animation-timeline: view()");
    if (sait) return undefined;

    // Quelqu'un qui refuse le mouvement voit tout, tout de suite.
    const refuse = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (refuse) return undefined;

    const blocs = Array.from(document.querySelectorAll(".nuvi-scroll-in"));
    if (!blocs.length) return undefined;

    // A partir d'ici seulement, les blocs partent invisibles.
    document.documentElement.setAttribute("data-revelation", "js");

    const montrer = (el) => el.classList.add("nuvi-vu");
    const filet = setTimeout(() => blocs.forEach(montrer), FILET_MS);

    if (typeof IntersectionObserver === "undefined") {
      blocs.forEach(montrer);
      clearTimeout(filet);
      return () => clearTimeout(filet);
    }

    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => {
        if (!e.isIntersecting) return;
        montrer(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });

    blocs.forEach((b) => io.observe(b));
    return () => { io.disconnect(); clearTimeout(filet); };
  }, []);

  return null;
}
