// Garde-fou minimal : une seule regle, no-undef.
//
// Un clic sur "Comparer" est parti en production en levant "lang is not
// defined" : le composant expose `locale`, pas `lang`. Le build passait, la
// page se chargeait, et la fonctionnalite etait morte. Aucun test unitaire
// n'aurait attrape ca ; une passe de lint, si.
//
// On ne cherche pas a imposer un style ici. Une regle, celle qui aurait
// suffi, executee en integration continue avant les tests de bout en bout.

const BROWSER_GLOBALS = [
  "window", "document", "navigator", "localStorage", "sessionStorage", "fetch", "console",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback",
  "ResizeObserver", "IntersectionObserver", "MutationObserver", "NodeFilter",
  "Image", "Blob", "File", "FileReader", "URL", "URLSearchParams", "AbortSignal",
  "FormData", "Headers", "Request", "Response", "AbortController",
  "alert", "confirm", "prompt", "atob", "btoa", "crypto", "structuredClone", "queueMicrotask",
  "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "TouchEvent", "DragEvent",
  "DeviceOrientationEvent", "DOMParser", "XMLHttpRequest", "performance",
  "screen", "history", "location", "getComputedStyle", "matchMedia", "Intl",
  "TextEncoder", "TextDecoder", "Uint8Array", "ArrayBuffer", "DataView",
  "ReadableStream", "WritableStream", "TransformStream",
  "SpeechRecognition", "webkitSpeechRecognition", "MediaRecorder",
  "HTMLElement", "Node", "Element", "CSS", "SVGElement", "Worker",
  "print", "scrollTo", "getSelection", "IdleDeadline",
  "process", "Buffer", "global", "globalThis", "React",
];

const globals = {};
for (const g of BROWSER_GLOBALS) globals[g] = "readonly";

export default [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "out/**"],
  },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals,
    },
    // Le depot contient des commentaires eslint-disable pour
    // react-hooks/exhaustive-deps. Cette configuration ne charge pas ce
    // plugin, et ESLint refuse une directive qui cite une regle inconnue. On
    // declare donc la regle a vide : les commentaires restent valides, sans
    // que la regle n'evalue quoi que ce soit.
    plugins: {
      "react-hooks": { rules: { "exhaustive-deps": { create: () => ({}) } } },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "no-undef": "error",
    },
  },
];
