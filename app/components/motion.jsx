"use client";

// LE MOUVEMENT DE NUVI
//
// Ce fichier existe pour donner a l'application la qualite de geste des sites
// de reference - le texte qui monte mot par mot, les blocs qui apparaissent au
// defilement, les boutons qui viennent au doigt - SANS embarquer de
// bibliotheque d'animation.
//
// POURQUOI PAS FRAMER MOTION
//
// Le concept de Nuvi tient en une phrase : coller une annonce et avoir le CV
// tout de suite. Trente a cinquante kilo-octets de JavaScript charges avant
// le premier pixel travaillent contre cette phrase. Tout ce qui suit est
// obtenu avec IntersectionObserver, des transformations CSS et l'API
// d'animation du navigateur : environ trois kilo-octets, et rien a executer
// avant le premier rendu.
//
// LA REGLE QUI NE SE NEGOCIE PAS
//
// Une animation d'apparition cache son contenu en attendant son signal. Si le
// signal ne vient jamais - navigateur sans IntersectionObserver, element deja
// hors flux, onglet restaure en arriere-plan - le contenu reste invisible pour
// toujours. Un CV qui ne s'affiche pas est infiniment pire qu'un CV qui
// s'affiche sans elegance. Chaque apparition porte donc un filet : passe un
// delai, elle se montre, signal ou pas.
//
// prefers-reduced-motion coupe tout. Ce reglage n'est pas une preference
// esthetique : il est coche par des gens que le mouvement rend malades.

import React, {
  useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback,
} from "react";

// useLayoutEffect previent en boucle lors du rendu serveur. On garde son
// comportement dans le navigateur - c'est lui qui evite le clignotement - et
// on retombe sur useEffect ailleurs.
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Le filet de securite : au-dela de ce delai, tout ce qui attendait encore
// son signal s'affiche.
const FAILSAFE_MS = 1400;

// La courbe. Depassement leger, arrivee douce : le ressort sans le cout d'un
// moteur physique.
export const SPRING = "cubic-bezier(.22,1,.36,1)";
export const EASE_OUT = "cubic-bezier(.16,1,.3,1)";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    // addEventListener sur MediaQueryList n'existe pas sur les Safari
    // anterieurs a 14, ou seul addListener repond.
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);
  return reduced;
}

// Vrai des que l'element a ete vu une fois. On ne re-cache jamais : un bloc
// qui disparait quand on remonte donne l'impression que la page se casse.
export function useInView(ref, { rootMargin = "0px 0px -12% 0px", threshold = 0.08 } = {}) {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;

    // Le filet, arme dans tous les cas - y compris quand l'observateur
    // existe mais ne se declenche pas (element dans un conteneur transforme,
    // onglet ouvert en arriere-plan).
    const failsafe = setTimeout(() => setSeen(true), FAILSAFE_MS);

    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      clearTimeout(failsafe);
      return () => clearTimeout(failsafe);
    }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
          clearTimeout(failsafe);
        }
      }
    }, { rootMargin, threshold });

    io.observe(el);
    return () => { io.disconnect(); clearTimeout(failsafe); };
  }, [ref, seen, rootMargin, threshold]);

  return seen;
}

// APPARITION AU DEFILEMENT
//
// Le bloc monte de quelques pixels en se revelant. `delay` sert au decalage
// d'un groupe ; `y` a la distance parcourue - au-dela d'une trentaine de
// pixels le mouvement devient une chute et attire l'oeil pour rien.
export function Reveal({
  children, delay = 0, y = 18, duration = 620, blur = false,
  as = "div", style, className, ...rest
}) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const Tag = as;

  const shown = inView || reduced;
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(0, ${y}px, 0)`,
        filter: blur && !shown ? "blur(6px)" : "none",
        transition: reduced ? "none"
          : `opacity ${duration}ms ${EASE_OUT} ${delay}ms,`
            + ` transform ${duration}ms ${SPRING} ${delay}ms,`
            + ` filter ${duration}ms ${EASE_OUT} ${delay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
      {...rest}
    >{children}</Tag>
  );
}

// TEXTE QUI MONTE MOT PAR MOT
//
// La signature des sites de reference. Le decoupage se fait sur les mots et
// non sur les lettres : lettre par lettre, un lecteur d'ecran epelle, et
// l'oeil lit deux fois plus lentement.
//
// Le texte complet reste dans un element accessible, et les mots animes sont
// masques aux technologies d'assistance : elles entendent une phrase, pas
// une liste de mots.
export function WordReveal({
  text, delay = 0, stagger = 42, duration = 700, y = "0.7em",
  as = "span", style, className, ...rest
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.2 });
  const reduced = useReducedMotion();
  const words = useMemo(() => String(text || "").split(/(\s+)/), [text]);
  const Tag = as;

  if (reduced) {
    return <Tag ref={ref} className={className} style={style} {...rest}>{text}</Tag>;
  }

  return (
    <Tag ref={ref} className={className} style={{ ...style }} {...rest}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          /^\s+$/.test(w) ? <span key={i}> </span> : (
            <span key={i} style={{
              display: "inline-block",
              // Le masque qui donne l'impression que le mot sort de la ligne.
              // overflow:hidden couperait les jambages des g et des p, d'ou
              // le petit rembourrage vertical compense par la marge.
              overflow: "hidden",
              paddingBottom: "0.14em",
              marginBottom: "-0.14em",
              verticalAlign: "bottom",
            }}>
              <span style={{
                display: "inline-block",
                transform: inView ? "translateY(0)" : `translateY(${y})`,
                opacity: inView ? 1 : 0,
                transition: `transform ${duration}ms ${SPRING} ${delay + i * stagger * 0.5}ms,`
                  + ` opacity ${duration}ms ${EASE_OUT} ${delay + i * stagger * 0.5}ms`,
              }}>{w}</span>
            </span>
          )
        ))}
      </span>
    </Tag>
  );
}

// BOUTON MAGNETIQUE
//
// L'element se decale vers le curseur quand il en approche. Reserve aux
// actions principales : applique partout, l'interface devient instable.
//
// Rien ne se produit au doigt. Sur un ecran tactile il n'y a pas
// d'approche - le contact est deja le clic - et la traduction ferait
// seulement rater la cible.
export function Magnetic({
  children, strength = 0.28, radius = 90,
  as = "div", style, className, ...rest
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const Tag = as;

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el || reduced) return;
    if (e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const pull = Math.max(0, 1 - dist / (radius + Math.max(r.width, r.height) / 2));
    el.style.transform =
      `translate3d(${dx * strength * pull}px, ${dy * strength * pull}px, 0)`;
  }, [reduced, strength, radius]);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "translate3d(0,0,0)";
  }, []);

  return (
    <Tag
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={className}
      style={{
        ...style,
        transition: reduced ? "none" : `transform 420ms ${SPRING}`,
      }}
      {...rest}
    >{children}</Tag>
  );
}

// COMPTEUR
//
// Le score qui monte jusqu'a sa valeur. La courbe ralentit a l'arrivee, ce
// qui laisse le temps de lire le dernier chiffre.
export function CountUp({ to = 0, duration = 1100, decimals = 0, style, ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.4 });
  const reduced = useReducedMotion();
  const [val, setVal] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setVal(to); return; }
    let raf = 0;
    let start = 0;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      // Sortie cubique : rapide au debut, posee a la fin.
      setVal(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} style={style} {...rest}>
      {val.toFixed(decimals)}
    </span>
  );
}

// LUEUR QUI SUIT LE POINTEUR
//
// Une tache de couleur diffuse derriere le contenu, qui se deplace avec la
// souris. Purement decorative, donc aria-hidden et pointer-events:none : elle
// ne doit intercepter aucun clic.
//
// Le suivi passe par une variable CSS et non par un rendu React : bouger la
// souris ne doit pas re-rendre l'arbre.
export function Aurora({ children, style, className, ...rest }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
  }, [reduced]);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={className}
      style={{ position: "relative", ...style }}
      {...rest}
    >
      {/*
        LA LUEUR TIENT DANS SON CADRE, ET C'EST DELIBERE.

        Premiere version : la tache debordait de 80 pixels pour que son flou
        s'eteigne hors du cadre. Deux defauts, chacun visible.

        Un element en position absolue qui depasse a droite ou en bas AJOUTE
        de la zone de defilement a son conteneur : l'accueil gagnait 80 pixels
        de defilement fantome. Recadrer reglait ca - mais coupait le flou net,
        et la lueur devenait un rectangle de couleur pose sur la page.

        inset:0 supprime les deux d'un coup : rien ne depasse, donc rien a
        recadrer. Et le degre de douceur ne vient plus d'un flou applique
        apres coup mais du degrade lui-meme, qui s'eteint bien avant le bord.
        Une tache radiale est deja floue par nature ; la flouter etait une
        depense de calcul pour un resultat moins bon.
      */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, zIndex: 0,
        pointerEvents: "none", borderRadius: "inherit",
        // LE RAYON EST EN POURCENTAGE, ET C'EST TOUTE LA DIFFERENCE
        //
        // Avec un rayon en pixels, la tache atteignait le bord du bloc avant
        // d'etre eteinte : le degrade se retrouvait coupe net, et la lueur
        // devenait un rectangle de couleur pose sur la page - exactement ce
        // qu'on ne veut pas.
        //
        // En pourcentage, le rayon suit la largeur du bloc : la tache
        // s'eteint toujours a l'interieur, quelle que soit la taille de
        // l'ecran. Un ellipse de 58% x 52% eteint a 72% de son rayon touche
        // le vide bien avant le bord, sur un telephone comme sur un grand
        // ecran.
        background:
          "radial-gradient(ellipse 58% 52% at var(--mx, 50%) var(--my, 30%),"
          + " color-mix(in srgb, var(--nuvi-purple) 20%, transparent), transparent 72%),"
          + " radial-gradient(ellipse 48% 46% at calc(var(--mx, 50%) + 16%) calc(var(--my, 30%) + 24%),"
          + " color-mix(in srgb, var(--nuvi-coral) 15%, transparent), transparent 70%)",
        // LE MASQUE, PARCE QUE LA TACHE BOUGE
        //
        // Le rayon en pourcentage garantit l'extinction quand la tache est au
        // centre. Mais elle suit le pointeur : montez la souris vers le haut
        // du bloc et la tache s'approche du bord, ou elle est de nouveau
        // coupee net.
        //
        // Ce masque eteint les bords quoi qu'il arrive. C'est une garantie
        // geometrique et non un reglage a la main : aucune position de
        // pointeur ne peut faire reapparaitre le lisere.
        maskImage:
          "radial-gradient(ellipse 80% 78% at 50% 50%, #000 35%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 78% at 50% 50%, #000 35%, transparent 100%)",
        transition: reduced ? "none" : "background 260ms linear",
        opacity: reduced ? 0.35 : 1,
      }}/>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

// INCLINAISON AU SURVOL
//
// Le bloc s'incline legerement vers le curseur. Utilise sur l'apercu du CV :
// il donne du relief a un objet qui est, litteralement, une feuille.
//
// L'angle reste sous six degres. Au-dela, le texte du CV devient penible a
// lire pendant le survol, ce qui est l'exact contraire du but.
export function Tilt({
  children, max = 5, scale = 1.012, style, className, ...rest
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el || reduced || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform =
      `perspective(1100px) rotateX(${-py * max * 2}deg) rotateY(${px * max * 2}deg) scale(${scale})`;
  }, [reduced, max, scale]);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(1100px) rotateX(0) rotateY(0) scale(1)";
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={className}
      style={{
        transformStyle: "preserve-3d",
        transition: reduced ? "none" : `transform 520ms ${SPRING}`,
        ...style,
      }}
      {...rest}
    >{children}</div>
  );
}

// BARRE DE PROGRESSION DU DEFILEMENT
//
// Fine ligne en haut de l'ecran. Elle repond a une question que se pose tout
// visiteur d'une page longue : est-ce que ca continue encore longtemps.
// `targetRef` designe le conteneur qui defile. Dans Nuvi, la page elle-meme
// ne defile presque jamais : les ecrans sont en position fixe et c'est un
// bloc interieur qui porte overflow:auto. Sans ce parametre, la barre
// resterait a zero sur exactement les ecrans ou elle sert.
export function ScrollProgress({ targetRef, color, height = 2.5, zIndex = 9000 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const scroller = () => (targetRef && targetRef.current) || document.documentElement;
    const update = () => {
      raf = 0;
      const sc = scroller();
      const max = sc.scrollHeight - sc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, sc.scrollTop / max)) : 0;
      el.style.transform = `scaleX(${p})`;
      // Une page qui tient dans l'ecran n'a pas de progression a montrer :
      // une barre pleine en permanence serait un mensonge decoratif.
      el.style.opacity = max > 24 ? "1" : "0";
    };
    // Le defilement emet a la frequence de l'ecran. On ne recalcule qu'une
    // fois par image, sinon la lecture de scrollHeight force autant de
    // recalculs de mise en page qu'il y a d'evenements.
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    const node = (targetRef && targetRef.current) || window;
    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetRef]);

  return (
    <div aria-hidden="true" style={{
      position: "fixed", top: 0, left: 0, right: 0, height,
      zIndex, pointerEvents: "none",
    }}>
      <div ref={ref} style={{
        height: "100%", transformOrigin: "0 50%", transform: "scaleX(0)",
        transition: "opacity 240ms ease",
        background: color
          || "linear-gradient(90deg, var(--nuvi-coral), var(--nuvi-purple), var(--nuvi-magenta))",
      }}/>
    </div>
  );
}
