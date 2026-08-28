# awesome-design-skills : provenance

Les dossiers de langage visuel presents ici, `clean`, `editorial`, `minimal`,
`professional` et `refined`, viennent de
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

## Pourquoi cinq et pas soixante-sept

Le depot amont en propose 67. Les 62 autres ont ete retires : ils ajoutaient
environ 2 200 jetons a chaque session pour un produit dont la direction
visuelle est deja fixee, et dont les contraintes sont tenues par les tests,
rien ne recouvre une commande sur telephone, toutes les largeurs d'ecran
tiennent, les mots en italique sont de vrais italiques. `brutalism` et
`pacman` n'allaient jamais servir ici.

Les cinq gardes sont ceux dont le registre correspond au produit : sobre,
lisible, credible. En reprendre un autre est sans effet de bord, ce sont des
fichiers de texte independants :

```bash
npx typeui.sh pull <slug>
```
