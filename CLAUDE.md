# Nuvi

Une fabrique de CV. Quelqu'un dépose son CV, l'IA le réécrit et l'adapte à une
offre, l'application l'exporte en PDF, suit les candidatures et prépare
l'entretien. Le produit vit sur thenuvi.com.

La promesse tient en une phrase : **le CV doit passer les robots de tri des
recruteurs**. Presque toutes les règles ci-dessous en découlent.

## Les trois règles qui ne se négocient pas

**1. Ni cadratin ni demi-cadratin.** Les tirets longs sont devenus la signature
visuelle du texte écrit par une machine. Sur un produit qui promet à quelqu'un
un CV crédible, cette signature se lit avant le contenu. La règle couvre tout
le dépôt, pas seulement l'interface : le séparateur entre l'entreprise et la
ville s'imprime sur le PDF que lit le recruteur. `tests/no-em-dash.mjs` refuse
la fusion. Remplacements : le deux-points pour introduire, la virgule pour
incidenter, le tiret simple dans les commentaires.

Une exception, et une seule : `.claude/`, qui contient des fichiers
d'instructions recopiés tels quels depuis des dépôts tiers. Rien de ce qui s'y
trouve n'atteint un écran ni un PDF.

**2. Aucune dépendance à un CDN à l'exécution.** Deux pannes en production ont
eu cette même origine : l'import de CV cherchait le worker pdf.js sur cdnjs,
l'export PDF y cherchait html2canvas et jsPDF. Un bloqueur de contenu suffisait
à tuer la fonctionnalité. Ce dont l'application a besoin pour fonctionner vient
de son propre bundle. `tests/no-runtime-cdn.mjs` scanne `app/` et `lib/`. Les
polices Google restent tolérées : décoratives, avec une pile de repli.

**3. L'IA n'invente rien.** Le dossier de parcours rassemble ce que la personne
a déjà écrit, dans ses différentes versions de CV, et laisse l'adaptation
piocher dedans. Choisir dans son propre matériau n'est pas inventer. Mais la
frontière doit tenir toute seule et pas dépendre de la vigilance :
`tests/the-career-record-invents-nothing.mjs` vérifie que chaque élément
produit existe dans au moins une source.

## Structure

| Chemin | Rôle |
| --- | --- |
| `app/page.jsx` | La vitrine, sur `/` |
| `app/app/` | L'outil lui-même, sur `/app` |
| `app/components/` | Les composants, y compris les gabarits de CV (`CVLayouts.jsx`) |
| `app/api/` | Routes serveur : `claude/` pour l'IA, `jobs/` pour les offres |
| `app/i18n/` | `fr.js`, `en.js`. La langue est demandée une fois, puis figée |
| `lib/` | La logique métier hors React : parsing ATS, sérialisation du CV, Gmail, Supabase |
| `extension/` | L'extension de navigateur qui lit une annonce |
| `tests/` | Les tests de bout en bout, plus `lib/harness.mjs` |
| `docs/` | Mise en service, comptes, Gmail. En français accentué |

## Commandes

```bash
npm run dev      # serveur de développement
npm run lint     # eslint, une seule règle : no-undef
npm test         # suite complète, précédée d'un "next build"
npm test export  # une seule suite
```

`npm run lint` mérite un mot : la configuration ne porte qu'une règle. Un clic
sur « Comparer » est parti en production en levant `lang is not defined`, le
composant exposant `locale`. Le build passait, la page se chargeait, la
fonctionnalité était morte. Aucun test unitaire n'aurait attrapé ça.

### Ce dont les tests ont besoin

| Variable | À quoi elle sert |
| --- | --- |
| `TEST_PORT` | Port du serveur de test, 4311 par défaut |
| `PLAYWRIGHT_CHROMIUM_PATH` | Chromium explicite. Sinon `tests/lib/chromium.mjs` cherche dans `PLAYWRIGHT_BROWSERS_PATH` |
| `TIKA_JAR` | Sans elle, le moteur Tika se déclare non exécuté au lieu d'être silencieusement sauté |

La suite interroge trois moteurs d'extraction indépendants : poppler, MuPDF et
Apache Tika, plus tesseract pour lire l'image rendue. C'est délibéré. Un bug
d'ordre de lecture n'était visible que par PDFBox, les deux autres réordonnaient
le texte par position et le masquaient. Sur une session distante,
`.claude/hooks/session-start.sh` installe tout ça.

## Comment les tests sont écrits

Ils portent des noms de phrases : `une photo de CV est un CV`, `le lien partagé
dit la vérité`, `rien ne recouvre une commande sur téléphone`. Ce ne sont pas
des tests unitaires, ce sont des affirmations sur ce que l'utilisateur constate.
Ils couvrent ce qui est déjà parti cassé en production, pas ce qui est facile à
tester.

Chaque suite exporte `run()` et renvoie une liste d'échecs. Une liste vide vaut
succès. Pas de framework : `tests/lib/harness.mjs` démarre un serveur Next,
pilote un Chromium, et les assertions sont explicites.

Trois pièges que le harnais documente longuement, et qu'il vaut mieux lire
avant de déboguer :

- Un serveur resté en écoute sert le build précédent. Le harnais refuse de
  démarrer plutôt que de tester un fantôme.
- `stopServer` tue le groupe de processus, pas seulement `npx`.
- `seedApp` pose la langue explicitement. Un test qui affirme du texte doit
  dire dans quelle langue il l'attend, sinon il dépend d'un réglage que le
  produit a le droit de changer.

## Conventions d'écriture

**Tout en anglais.** Le code, les commentaires, les messages d'erreur
internes, les noms de tests, les messages de commit. La règle était le
français jusqu'au 30 août 2026 ; le dépôt contient donc encore des
commentaires français, et rien n'oblige à les traduire en passant. Ce qu'on
écrit à partir de maintenant est en anglais.

Une chose ne change pas : **les textes que l'utilisateur lit restent
bilingues**, dans `app/i18n/fr.js` et `app/i18n/en.js`. La langue de
l'interface est un choix produit, pas une convention de code, et le français
y a exactement le même statut qu'avant.

**Les commentaires expliquent pourquoi, et prennent la place qu'il faut.** Le
`timeout-minutes: 90` de la CI est accompagné de six lignes qui disent pourquoi
90 et pas 60. C'est le style de la maison : on écrit la raison pendant qu'on
l'a en tête, parce que dans six mois personne ne l'aura. Ça ne change pas avec
la langue : un commentaire anglais qui se contente de répéter la ligne de code
en dessous ne vaut pas mieux que son équivalent français.

**Pas d'accents ni de caractères non ASCII dans les commentaires de code.**
`docs/` et ce fichier sont accentués. Les commentaires dans `.js`, `.jsx` et
`.mjs` restent en ASCII : c'était vrai pour le français sans accents, ça reste
vrai pour l'anglais.

## Outillage agent

Les compétences installées pour les agents sont décrites dans
`.claude/README.md` : le plugin taste-skill, les recommandations d'interface de
Vercel, playwright-cli pour piloter un navigateur depuis le terminal, et une
bibliothèque de fichiers `DESIGN.md`.
