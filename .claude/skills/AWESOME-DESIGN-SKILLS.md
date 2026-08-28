# awesome-design-skills : provenance

Les 67 dossiers de langage visuel presents ici (`agentic`, `bento`,
`brutalism`, `glassmorphism`, `minimal`, `retro`, `vintage`, ...) viennent de
[bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills),
commit `f631a09b4fcc0166f2e2c1a8c81906ef680c57e8`.

Chaque dossier contient deux fichiers, recopies tels quels :

- `SKILL.md` : les regles lisibles par un agent (tokens, typographie, palette,
  contraintes d'accessibilite, garde-fous qualite) ;
- `DESIGN.md` : l'intention de design en clair, pour un lecteur humain.

Les deux autres dossiers, `playwright-cli` et `web-design-guidelines`, ne
viennent pas de ce depot.

## Mettre a jour

Un langage a la fois, avec l'outil du depot amont :

```bash
npx typeui.sh pull <slug>
```

## Cout et elagage

Ces 67 competences ajoutent environ 2 200 jetons a chaque session : seul leur
nom et leur description restent charges en permanence, le corps du fichier
n'est lu qu'a l'invocation. Si un jour le projet se fixe sur un langage
visuel, supprimer les dossiers inutilises est sans effet de bord : ce sont des
fichiers de texte independants les uns des autres.
