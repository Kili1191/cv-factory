---
name: design-md-library
description: Bibliotheque de fichiers DESIGN.md de marques reelles (Linear, Vercel, Apple, Claude, Stripe, Ferrari, Figma, Notion...) rangees par famille esthetique, plus des recettes et des prompts pour en tirer un systeme de design. A utiliser quand il faut choisir une direction visuelle pour un site ou une interface, extraire un DESIGN.md depuis une marque ou un site existant, melanger deux identites, ou auditer le rendu d'une page. Contient aussi un catalogue de 68 DESIGN.md hebergees a telecharger a la demande.
---

# Bibliotheque DESIGN.md

Un `DESIGN.md` decrit le langage visuel d'une marque dans un format qu'un
agent peut appliquer : jetons de couleur, echelle typographique, regles de
composition, et surtout le *pourquoi* de chaque choix. C'est ce dernier point
qui le distingue d'un export Figma. Il dit ce qu'il faut faire, et il permet
de decider seul dans un cas qu'il n'avait pas prevu.

## Choisir une direction

Les fichiers de `design-md/` sont ranges par famille. La famille se choisit
avant la marque : elle porte l'atmosphere, la marque n'en est qu'un exemple
abouti.

| Famille | Ce qu'elle donne | Exemples |
| --- | --- | --- |
| `editorial/` | Minimalisme suisse, un seul accent chirurgical | Linear, Vercel |
| `warm/` | Surfaces chaudes, serif, ton pose | Claude, Mercury |
| `cinematic/` | Sombre, large, image en premier | Ferrari, BMW, Runway, Nvidia |
| `data-dense/` | Beaucoup d'information, hierarchie stricte | Datadog, ClickHouse, PostHog |
| `glass/` | Translucidite, profondeur, flou | Apple, Arc |
| `playful/` | Couleur franche, formes rondes | Figma, Canva, Toss |
| `terminal/` | Monospace, monochrome, densite | Warp, Ollama, OpenCode |
| `brutalist/` | Contraste brut, grille apparente | The Verge |
| `indie/` | Petit produit assume, ton personnel | Granola |
| `remix/` | Deux identites croisees | Linear x Claude, Stripe x A24 |

Quand le brief hesite, `prompts/family-picker.md` pose trois questions et
tranche.

## Fabriquer, auditer, melanger

- `prompts/brand-to-design-md.md` : une URL devient un `DESIGN.md` complet.
- `prompts/audit-live-site.md` : une URL devient un audit avec liste de
  corrections.
- `prompts/remix-two-brands.md` : combine deux fichiers sans les rendre
  incoherents.
- `prompts/break-default-aesthetic.md` : neutralise le rendu par defaut,
  teal et degrade, qui trahit une interface generee.
- `prompts/3-designer-debate.md` : trois voix critiquent, puis synthetisent.

`recipes/` couvre les trajets complets : `landing-page-20-min.md`,
`wireframe-to-hifi.md`, `figma-to-design-md.md`, `repo-to-design-system.md`,
`web-capture-to-prototype.md`, `token-budget-claude-design.md`, entre autres.

`showcase/case-studies/` montre des reprises reelles, utile pour calibrer ce
qu'un `DESIGN.md` change vraiment sur un produit.

## Les 68 autres

`catalogue-getdesign-md.md` recense soixante-huit `DESIGN.md` supplementaires,
hebergees sur getdesign.md plutot que copiees ici. Chaque entree porte une
ligne de description : lire le catalogue suffit souvent a choisir, et on ne
telecharge que le fichier retenu.

## Rapport avec les autres competences installees

Les 67 langages visuels ranges directement dans `.claude/skills/` (`minimal`,
`brutalism`, `editorial`, ...) decrivent des *styles*. Les fichiers d'ici
decrivent des *marques* qui ont pousse un style jusqu'au bout. Partir d'une
marque donne des valeurs concretes tout de suite ; partir d'un style laisse
plus de liberte. Les deux se combinent mal en meme temps : en choisir un.
