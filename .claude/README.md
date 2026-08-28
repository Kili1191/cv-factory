# Outillage agent

Ce dossier décrit les compétences (« skills ») et extensions disponibles pour
les agents qui travaillent sur ce dépôt. Tout ce qui est versionné ici est
chargé automatiquement à l'ouverture d'une session.

## 1. Plugin `taste-skill`

Déclaré dans `settings.json` (`extraKnownMarketplaces` + `enabledPlugins`).
Source : <https://github.com/Leonxlnx/taste-skill>.

Il apporte treize compétences de direction artistique frontend, dont
`taste-skill:image-to-code-skill` (pipeline image → analyse → code) et
`taste-skill:redesign-skill` (audit puis reprise d'une interface existante).

Le plugin vient d'une place de marché externe : la première session sur une
machine neuve peut demander de l'installer explicitement.

```bash
claude plugin install taste-skill@taste-skill --scope project
```

## 2. Compétence `web-design-guidelines` (Vercel)

Copiée depuis `vercel-labs/agent-skills` dans `skills/web-design-guidelines/`.
Voir `skills/web-design-guidelines/SOURCE.md` pour la provenance exacte et la
commande de mise à jour. Elle relit une interface au regard des *Web Interface
Guidelines*, qu'elle récupère à chaque exécution.

## 3. Compétence `playwright-cli`

Installée dans `skills/playwright-cli/` par le binaire `@playwright/cli`.
Le binaire, lui, n'est pas versionné et doit être présent sur la machine :

```bash
npm install -g @playwright/cli@latest
playwright-cli install --skills
```

`playwright-cli` pilote un navigateur depuis le terminal (snapshot → ref →
action → snapshot). Il consomme nettement moins de contexte qu'un serveur MCP
équivalent, puisque les instantanés sont écrits dans des fichiers.

Le dossier de travail `.playwright/` est ignoré par git : il contient un chemin
absolu, vrai sur cette machine et faux sur la suivante. Il se régénère :

```bash
node scripts/playwright-cli-config.mjs
```

Ce script lit `tests/lib/chromium.mjs`, le même résolveur que le harnais de
test, pour qu'il n'y ait qu'un seul endroit à corriger le jour où l'image
change. Sur un environnement qui fournit déjà Chromium,
`playwright-cli install --skills` échoue à sa dernière étape, le téléchargement
du navigateur, alors que les compétences sont bien écrites. Le script règle
exactement ce cas.

Les tests end-to-end du dépôt (`tests/run.mjs`) continuent d'utiliser la
dépendance `playwright` déclarée dans `package.json` ; `@playwright/cli` est un
outil d'exploration pour l'agent, pas un remplaçant.

## 4. Cinq langages visuels d'awesome-design-skills

Recopies depuis
[bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills)
dans `skills/` : `clean`, `editorial`, `minimal`, `professional`, `refined`.
Chacun porte son `SKILL.md` (regles pour l'agent) et son `DESIGN.md`
(l'intention en clair).

Le depot amont en propose 67. Les autres ont ete retires : ils se contredisent
volontairement, et pour un produit dont le registre est deja fixe la plupart
n'allaient jamais servir. Voir `skills/AWESOME-DESIGN-SKILLS.md` pour la
provenance et la commande qui en reprend un.

## 5. Bibliotheque DESIGN.md

`skills/design-md-library/` regroupe deux sources de plus, toutes deux MIT :

- 35 fichiers `DESIGN.md` de marques reelles, ranges par famille esthetique,
  avec les recettes, prompts et etudes de cas qui les accompagnent, depuis
  [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design) ;
- le catalogue de 68 `DESIGN.md` supplementaires recense par
  [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design).
  Ce depot est un index : les fichiers restent heberges sur getdesign.md et se
  telechargent a la demande.

La difference avec les 67 langages du point 4 tient en une phrase : ceux-la
decrivent un style, ceux-ci decrivent une marque qui a pousse un style jusqu'au
bout. Voir `skills/design-md-library/SOURCE.md` pour les commits exacts.

## 6. Deux compétences React de Vercel

`react-best-practices` et `composition-patterns`, recopiées depuis le même
dépôt que les recommandations d'interface. Elles s'appliquent directement :
Next.js 14, React 18, cent seize fichiers source.

Une réserve, notée aussi dans `skills/composition-patterns/SOURCE.md` : ce
fichier décrit également les API de React 19. Tout ce qui touche `use()`, les
Actions ou `useOptimistic` ne s'applique pas tant que la version n'a pas bougé.

## 7. Le hook de démarrage de session

`hooks/session-start.sh` installe, dans une session distante uniquement, ce que
`.github/workflows/ci.yml` installe en intégration continue : les dépendances
npm, poppler, MuPDF, tesseract, le jar Apache Tika, et le build Next. Sans lui,
un conteneur neuf ne peut pas exécuter `npm test`, et la seule façon de
vérifier une modification est d'ouvrir une proposition de fusion.

Il ne fait rien en local, où la machine a déjà tout.
