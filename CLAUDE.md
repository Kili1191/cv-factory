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

Le PDF téléchargé est natif depuis le 5 septembre 2026 sur les gabarits à
une colonne (classique, chronologie, ATS) : `app/api/pdf` ouvre
`app/imprimer` dans un Chromium sans tête (`@sparticuz/chromium`, embarqué
dans la fonction, rien de téléchargé à l'exécution) et imprime le même
gabarit que l'écran, en texte vectoriel avec les polices incorporées. Les
gabarits à deux colonnes gardent l'ancien export, une photo du CV doublée
d'une couche de texte invisible écrite par Nuvi en ordre de lecture : lus par
position, deux colonnes sortent ligne à ligne mélangées, et cette couche est
ce qui les garde entières (mesuré : la fidélité tombait de 100 % à 56 %). Si
la route ne répond pas, la photo revient pour tout le monde.
`tests/the-pdf-is-real-text.mjs` tient les trois cas. Hors Vercel, la route
emprunte le Chromium de Playwright, trouvé par `lib/chromiumLocal.js`, le
même module que le harnais de test : la première version portait sa propre
copie, limitée au dossier de la session distante, et répondait 503 sur la CI
où Playwright installe ailleurs.

Le 7 septembre 2026, les gabarits à deux colonnes ont été imprimés en natif
pour mesurer, avec le même CV d'essai et le barème de `lib/atsFidelity.js` :
poppler en ordre de flux, MuPDF et Tika (PDFBox) lisent les trois à 100 %,
parce que la page d'impression peint dans l'ordre de lecture ; les lecteurs
qui trient par position tombent à 97, 86 et 92 % (poppler par défaut) et à
86, 86 et 56 % (pdf.js trié, la méthode d'une part des ATS) : un intitulé de
rubrique ou une période partage sa ligne avec l'autre colonne et n'est plus
reconnu. La photo doublée de sa couche écrite tient 100 % sur les cinq
moteurs. C'est pour ça qu'elle reste : le texte natif sur deux colonnes
n'est pas une question de rendu mais de géométrie, et aucun PDF ne fait lire
une colonne à un lecteur qui trie par ligne.

Les anciens téléchargements, la photo doublée d'une couche coupée en fin de
ligne, existent chez les gens : quelqu'un a réimporté le sien et retrouvé
chaque puce amputée. `lib/lireUnFichier.js` décide donc sur deux signes : la
page est une image (l'aire dessinée de l'image à l'opérateur `Do`) et la
couche s'arrête au milieu d'une phrase (une ligne longue sans ponctuation,
suivie d'un nouvel élément et non d'une continuation en minuscule). Les deux
réunis, la page est rendue et lue comme une photo. Un vrai PDF texte ne prend
jamais ce chemin. `GET /api/pdf` dit depuis un navigateur si le Chromium de la
fonction démarre : la photo de secours cache toute panne de la route, à qui
télécharge comme à qui maintient. `tests/an-old-download-is-read-whole.mjs`.

Les polices de l'impression sont des instances statiques. Chromium ne sait
pas incorporer une police variable dans un PDF : il dessine chaque glyphe en
contour (police « Type 3 », aucun fichier de police), et les extracteurs y
perdent des lignes entières, mesuré sur la CI où les polices Google se
chargent : l'e-mail et le téléphone disparaissaient du texte lu. La route
demande donc à Google les mêmes familles avec un agent d'avant les polices
variables (`lib/policesDuSite.js`), reçoit un fichier par graisse, les
incorpore en `data:` dans la feuille de style et la remet à la page, qui
remet à la page en répondant elle-même aux requêtes de polices de celle-ci.
Sur le papier, les alternates contextuelles sont coupées : Inter remplace le
« + » et le « - » voisins d'un chiffre par des variantes sans correspondance
Unicode dans le PDF, et pdf.js lisait « 33 6 12 34 56 78 ».
`tests/the-pdf-is-real-text.mjs` refuse un Type 3.

La CI imprime avec le même Chromium que la session distante, le build 1194
(141) qu'installe Playwright 1.56 : la 131 de Playwright 1.49 sortait les
polices web en Type 3 même statiques, et le texte lu tombait à 8 %. Ce
qu'on mesure ici doit être ce que la CI exécute ; Vercel imprime en 149,
mesuré sur un fichier téléchargé : polices incorporées, texte entier.

Le flux du PDF suit l'ordre de lecture. Chromium écrit dans l'ordre de
peinture, et le CSS peint les éléments positionnés après le texte en flux :
les postes de la chronologie, positionnés pour ancrer leur point, sortaient
en fin de flux, après les langues. Poppler et pdf.js trient par position et
ne voyaient rien ; PDFBox, derrière Tika et une part des ATS, lit le flux tel
quel : 81 % sur la CI. La page d'impression positionne donc tout élément, en
ordre d'arbre, sauf les enveloppes entre une décoration absolue et son
ancrage, et enferme les nœuds texte nus dans une portée positionnée. Tika ne
tourne qu'avec `TIKA_JAR` : sans lui, ce défaut restait invisible en local.

Les routes ont un plafond. `middleware.js` compte les appels par adresse sur
une minute (20 sur `/api/pdf`, 40 sur `/api/claude`, 30 sur les registres) et
répond 429 avec `Retry-After`, que le client sait déjà attendre. La mémoire de
l'instance sert de compteur : assez pour arrêter une boucle, pas un plafond
global ; un magasin partagé viendra quand il en faudra un. Un appelant sans
adresse est local, le harnais de test en premier, et n'est jamais limité :
`tests/the-routes-have-a-ceiling.mjs` se fait passer pour un visiteur. Les
appels à Anthropic s'arrêtent à 55 secondes et le flux annule l'amont quand
le navigateur part. Les quatre règles RLS de Supabase vivent dans
`supabase/migrations/`, plus seulement dans la documentation.

Ce qui casse arrive au propriétaire avant la capture d'écran.
`lib/incidents.js` garde les erreurs de la page, les promesses rompues, la
photo de secours à l'export et l'IA qui renonce, et les envoie à
`/api/incident` : genre, message coupé, chemin, build, appareil, jamais un
mot du CV. La fonction écrit une ligne `[incident]` dans ses journaux, que
Vercel montre, et la relaie à `INCIDENT_WEBHOOK_URL` si elle est posée (Slack,
Discord, n'importe quel POST). Dans Réglages, « Signaler un problème » envoie
une note et, si la case est cochée, la forme du CV : rubriques et comptes,
pas le texte. `tests/a-breakage-reaches-the-owner.mjs`.

Le CV part aussi en Word. `lib/exporterEnDocx.js` écrit les mêmes données en
une colonne, titres de section réels, puces réelles, polices du gabarit
nommées, avec la bibliothèque `docx` chargée à la demande. Jamais de tableau :
un fichier Word vaut par ce qu'un recruteur peut y retoucher, et un tableau
casse sous son curseur. La CI ouvre le fichier avec LibreOffice Writer et
l'imprime : la preuve que c'est un document, pas un zip qui passe une
expression régulière. `tests/the-cv-leaves-as-word.mjs`.

Un profil LinkedIn enregistré en PDF est un CV. Le fichier place une colonne
étroite (Contact, Top Skills, Languages, Certifications) à côté du profil, et
`lib/lireUnFichier.js` reconstruisait les lignes par leur hauteur seule : chaque
ligne prenait un morceau des deux colonnes. `enColonnes` cherche donc une bande
verticale qu'aucun fragment ne traverse sous le quart supérieur de la page, et
lit la colonne large d'abord, l'étroite ensuite ; sur un CV à une colonne,
chaque puce court jusqu'à la marge et traverse toute bande candidate, donc rien
n'est coupé, quoi que fassent les dates à droite. `lib/lireUnCv.js` connaît les
formes de l'export : ses intitulés, la durée entre parenthèses après la
période, l'école au-dessus du diplôme, le pied de page, et la phrase que la
page a coupée (une ligne longue sans ponctuation suivie d'une minuscule est
une seule ligne). `tests/a-linkedin-profile-is-a-cv.mjs` imprime une page à la
forme de l'export au moment du test, aucun fichier personnel n'est dans le
dépôt ; un vrai fichier reste la prochaine chose à essayer.

La vitrine, sur `/`, est depuis le 7 septembre 2026 la page que Kilian a
choisie sur motionsites, « Planetary Pulse » : une vidéo de bulle irisée sur
un studio presque blanc, une typographie noire légère, une carte de verre
liquide qui réfracte la vidéo derrière elle (un filtre SVG et un canvas
redessiné à chaque image), un bouton chanfreiné, un menu qui glisse.
`app/components/Vitrine.jsx` et `vitrine.css`, préfixe `vv-`. Une première
version l'avait recolorée dans le crème et le corail du site et a été
refusée : la lumière de la vidéo est la palette, et la seule couleur ajoutée
est le violet du point du logo. Les sections en dessous vivent dans le même
monde et gardent les classes que les suites tiennent (`nuvi-scroll-in`,
`nuvi-titre-geant`, `nuvi-mots`, `nuvi-piste-doc`, `nuvi-temps`) : le
mouvement au défilement reste dans `globals.css`. La vidéo est demandée
d'abord à `/vitrine/orbe.mp4`, la copie de Nuvi, et retombe sur le fichier
de la référence chez son hébergeur tant que cette copie n'est pas dans le
dépôt ; sans elle, le gris du studio et tous les mots restent. Les encres
sont des gris pleins, jamais une opacité sur un fond inconnu : la suite de
lisibilité mesure chaque texte contre la première boîte opaque derrière lui.

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
| `app/api/` | Routes serveur : `claude/` pour l'IA, `jobs/` pour les offres, `pdf/` qui imprime le CV |
| `app/imprimer/` | La page que `api/pdf` ouvre dans un Chromium sans tête : le CV seul, prêt à imprimer |
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

**`node tests/une-suite.mjs` ne vérifie rien.** Les suites exportent `run()`
sans l'appeler : lancée ainsi, la commande rend 0 sans lire un fichier, et ce
silence se lit comme un succès. Utilisée comme garde-fou pendant toute une
session, elle n'a rien gardé, et la règle numéro un s'est fait enfreindre dans
ce fichier-ci. Les deux suites qu'on lance à la main, `no-em-dash` et
`no-runtime-cdn`, s'exécutent maintenant vraiment quand on les appelle
directement. Les autres passent par `npm test <nom>`.

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

## Les couleurs : deux familles, et on ne les mélange pas

Le 2 septembre 2026, un balayage a mesuré chaque texte visible de
l'application : **vingt-neuf** étaient sous le plancher AA de 4,5:1. Pas une
couleur ratée, une règle absente. La palette de marque servait d'encre.

    corail sur blanc            3,12:1
    la sur-ligne grise          2,32:1
    le vert de la pastille      3,00:1 sur son fond vert doux

Les libellés de navigation, **tous** les intitulés de champ de l'éditeur, la
sur-ligne de chaque panneau. En corps 10 ou 11, c'est-à-dire la taille où ça se
paie. Nuvi se lit sur un téléphone, souvent dehors, souvent mal éclairé.

D'où la règle, et elle n'a qu'une ligne :

> **Un texte prend le jeton `-Text`. Un aplat prend l'autre.**

`--nuvi-coral` peint un fond, un dégradé, une pastille : là elle porte du blanc
et le contraste se calcule autrement. `--nuvi-coral-text` écrit. Les deux
basculent avec le thème, et les versions encre sont calibrées pour tenir 4,5:1
sur les fonds du produit, y compris les fonds doux, plus exigeants que le
blanc. Idem pour `purple`, `magenta`, `green`, et `--nuvi-gray-text` qui
remplace `Gray400` dès qu'il s'agit d'écrire.

`tests/the-interface-can-be-read.mjs` mesure tout texte visible sur la vitrine
et trois écrans de l'application, en clair et en sombre, sur ordinateur et sur
téléphone. Il a trouvé son premier défaut réel à sa première exécution, sur la
vitrine, la page que personne n'avait jamais mesurée.

### Une surface sombre le déclare

`data-nuvi-sombre` sur un conteneur y redéclare les encres, le filet et le
papier. Tout ce qu'on pose dedans hérite des bonnes valeurs.

C'est ce qui rend une barre sombre possible sans reprendre une seule couleur à
la main : les jetons encre y basculent vers leurs versions claires. Repeindre
un fond **sans** cet attribut est le défaut à ne pas refaire : du texte juste,
sur le mauvais fond, et rien qui le signale.

Le rail vaut `#22201c`. Ce n'est pas un noir : le crème `#faf8f3` et le filet
`#e8e3d6` sont tous deux à la teinte 43, le neutre chaud de Nuvi ; on garde la
teinte, on descend la luminosité. Une première version employait `#17171a`,
emprunté aux outils de développeur : canaux 23/23/26, le bleu domine, donc
froide à côté d'un crème. Le signe que la bonne est la bonne : **le corail de
marque y tient sans être délavé**, ce que le quasi-noir exigeait.

### Le CV ne suit jamais le thème

`[data-cvf="cv"]` redéclare les valeurs claires, dans les deux thèmes, et pose
sa couleur de texte sur lui-même. C'est le document qui part en PDF.

Une règle existait déjà pour ça et ne s'appliquait **à rien** : elle visait
`.cv-preview-container`, chaîne absente de tout le dépôt. En sombre, le
conteneur passait donc à `rgb(26,26,28)` et héritait du texte clair de
`[data-cvf="app"]`. Invisible à l'écran, les enfants recouvrent le fond, mais
l'export étire la feuille à 297 mm quand le contenu est plus court, et le fond
réapparaît dans le PDF du recruteur.

### Le focus se voit, et `:where()` ne suffisait pas

Vingt-sept endroits posent `outline:"none"` en style **inline**. La règle qui
devait les annuler était enveloppée dans `:where()`, spécificité zéro : elle
perdait contre les vingt-sept. Elle marchait pour les boutons, qui ne le posent
pas, et **jamais** pour un champ de saisie. Le plancher d'accessibilité est
donc `!important`, une fois, dans `globals.css`.

### Les icônes de navigation ont une seule source

`app/components/navIcons.jsx`. Elles vivaient en variables locales dans la
barre latérale, donc le tiroir « Plus » du téléphone, vingt et une entrées,
n'en avait aucune et retombait sur une pastille ronde vide. `NAV_TEINTES` y
range les entrées en quatre familles ; seule l'icône est colorée, le libellé
reste neutre.

---

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
