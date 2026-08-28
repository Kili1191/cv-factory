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

Le dossier de travail `.playwright/` est ignoré par git : il contient la
configuration locale du navigateur, propre à chaque machine. Sur un poste où
Chromium est déjà fourni par l'environnement plutôt que téléchargé par
Playwright, `playwright-cli install --skills` échoue à la dernière étape (le
téléchargement du navigateur) alors que les compétences sont bien écrites ; il
suffit alors de désigner le binaire existant :

```json
// .playwright/cli.config.json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "executablePath": "/chemin/vers/chrome",
      "chromiumSandbox": false
    }
  }
}
```

Les tests end-to-end du dépôt (`tests/run.mjs`) continuent d'utiliser la
dépendance `playwright` déclarée dans `package.json` ; `@playwright/cli` est un
outil d'exploration pour l'agent, pas un remplaçant.

## 4. Les 67 langages visuels d'awesome-design-skills

Recopies depuis
[bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills)
dans `skills/`, un dossier par langage : `bento`, `brutalism`, `editorial`,
`glassmorphism`, `minimal`, `retro`, `terracotta`, et soixante autres. Chacun
porte son `SKILL.md` (regles pour l'agent) et son `DESIGN.md` (l'intention en
clair). Provenance, mise a jour et cout en contexte :
`skills/AWESOME-DESIGN-SKILLS.md`.

Ces langages se choisissent un par projet ou par page. Les invoquer tous en
meme temps n'aurait pas de sens : ils se contredisent, c'est le but.
