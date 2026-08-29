import './globals.css';

// Typographie de marque. Chargee ici, dans le <head>, et non depuis l'arbre
// de composants : les <link> qui vivaient dans page.jsx etaient rendus dans
// une branche client-only, donc Fraunces et Inter ne commencaient a se
// telecharger qu'APRES l'hydratation. Le navigateur les decouvre maintenant
// des la premiere reponse HTML.
//
// L'AXE ital N'EST PAS FACULTATIF
//
// Sans lui, Google ne sert AUCUNE face italique - verifie : l'ancienne URL en
// rendait zero, celle-ci en rend trois pour Fraunces. Le navigateur fabrique
// alors un faux italique en PENCHANT les lettres droites.
//
// Une lettre penchee de force garde la largeur d'avance de la lettre droite :
// son encre deborde a droite, et tout ce qui la contient - une boite a
// overflow cache, un degrade pose par background-clip:text - lui coupe le
// bout. C'est ce qui donnait des mots italiques amputes un peu partout.
//
// Le vrai italique de Fraunces n'a pas ce defaut : ses glyphes sont dessines
// penches, avec les largeurs qui vont avec.
// L'AXE opsz ETAIT PAYE ET JAMAIS UTILISE
//
// Fraunces se demandait avec quatre axes. Trois servent : l'italique, la
// graisse, la douceur. Le quatrieme, opsz (taille optique), n'est regle nulle
// part dans le produit - il ne l'etait que dans l'adresse qui le telecharge.
//
// Mesure faite sur les fichiers reellement servis par Google, en se declarant
// Android, et en ne comptant QUE le sous-ensemble latin - un visiteur
// britannique ou francais ne telecharge jamais le cyrillique ni le grec, et
// les compter gonflerait le gain d'un facteur deux :
//
//     avant   405 564 octets
//     apres   275 644 octets
//     gagne   129 920 octets, 32%
//
// Pour un reglage que personne n'utilise. Sur une connexion faible c'est
// environ deux secondes et demie de plus ou tous les titres de la page sont
// en Georgia avant de sauter dans Fraunces.
//
// A savoir : reduire la PLAGE d'un axe ne sert a rien - mesure identique
// avec 9..144 et avec 9..72. Google sert la fonte variable entiere. Seul le
// retrait de l'axe compte.
//
// Ce qu'on perd : le navigateur ne fait plus varier automatiquement le dessin
// selon la taille (font-optical-sizing vaut auto par defaut). Le titre a 64px
// et une legende a 11px partagent donc le meme dessin. C'est un raffinement ;
// 275 ko sur le telephone d'une aide-soignante n'en est pas un.
//
// L'italique reste : il est utilise 59 fois dans le produit, et un vrai
// italique dessine ne se remplace pas par une inclinaison mecanique - une
// suite le verifie.
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght,SOFT"
  + "@0,300..900,30..100;1,300..900,30..100"
  + "&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800"
  + ";1,300;1,400;1,500;1,600;1,700;1,800"
  + "&family=DM+Serif+Display:ital@0;1&display=swap";

// L'ecran d'accueil d'un iPhone ne peut poser l'application que si le
// document declare son manifeste, son icone et son titre court. Sans ces
// trois-la, "Sur l'ecran d'accueil" fabrique une vignette a partir d'une
// capture de la page et l'ouvre dans Safari : un marque-page, pas une app.
export const metadata = {
  metadataBase: new URL("https://thenuvi.com"),
  applicationName: "Nuvi",
  title: {
    default: "Nuvi · the CV that gets past the ATS",
    template: "%s · Nuvi",
  },
  description:
    "Paste the job ad, get the CV that matches it, and track your applications.",
  manifest: "/manifest.webmanifest",
  // Le nom sous l'icone. Sans lui, iOS affiche le <title> entier, tronque a
  // une douzaine de caracteres : "Nuvi - le CV..." au lieu de "Nuvi".
  appleWebApp: {
    capable: true,
    title: "Nuvi",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // LA VIGNETTE DE PARTAGE DOIT PARLER LA MEME LANGUE QUE LE SITE
  //
  // Elle etait restee en francais alors que le site s'ouvre en anglais. Un
  // lien colle sur LinkedIn ou envoye par message affichait donc une carte
  // francaise, et la page qui s'ouvrait derriere etait anglaise. C'est
  // exactement le moment ou l'on decide de cliquer ou non, et le seul endroit
  // ou personne ne voit jamais l'incoherence : la vignette est fabriquee par
  // le reseau social, pas par nous.
  //
  // Elle suit donc la langue par defaut du document. Elle ne peut pas suivre
  // le choix du visiteur : elle est lue par un robot, avant toute visite.
  openGraph: {
    type: "website",
    siteName: "Nuvi",
    title: "Nuvi · the CV that gets past the ATS",
    description:
      "Paste the job ad, get the CV that matches it, and track your applications.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  // Sans carte declaree, X n'affiche qu'un lien nu. summary_large_image donne
  // la meme vignette que partout ailleurs.
  twitter: {
    card: "summary_large_image",
    title: "Nuvi · the CV that gets past the ATS",
    description:
      "Paste the job ad, get the CV that matches it, and track your applications.",
    images: ["/icon-512.png"],
  },
};

// viewportFit: "cover" est la ligne qui rend utiles tous les
// env(safe-area-inset-*) deja ecrits dans l'interface. Sans elle iOS les
// renvoie a zero, et en mode plein ecran - ou il n'y a plus de barre de
// navigateur - la barre du bas de Nuvi passe sous l'indicateur d'accueil.
//
// Le zoom reste autorise : le bloquer rendrait l'application inutilisable a
// qui a besoin d'agrandir, pour ne gagner qu'un detail esthetique.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f3",
};

export default function RootLayout({ children }) {
  // La langue par defaut du document est l'anglais : c'est ce que lisent
  // Google et les lecteurs d'ecran quand personne n'a encore choisi. Le
  // francais reste a un clic dans les reglages.
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
        {/* La couleur de la barre du navigateur sur telephone. Sans elle,
            Android et iOS peignent leur propre gris au-dessus d'une page
            creme : une bande qui ne va avec rien, juste sous l'heure. */}
        <meta name="theme-color" content="#faf8f3" />
        {/* Version servie, lisible sans ouvrir l'app : curl -s thenuvi.com | grep app-build */}
        <meta name="app-build" content={process.env.NEXT_PUBLIC_BUILD_ID || "unknown"} />
      </head>
      <body className="nuvi-grain" style={{ margin: 0, padding: 0 }}>
        {/* LE LIEN D'EVITEMENT
            Au clavier, atteindre le contenu demandait de traverser la
            manchette a chaque page. Ce lien ne se voit qu'une fois focalise,
            et c'est la premiere chose que rencontre la touche Tab. */}
        <a href="#contenu" className="nuvi-evitement">
          Skip to content
        </a>

        {/* IL Y AVAIT DEUX TITRES DE NIVEAU 1 SUR CHAQUE PAGE
            Ce layout en posait un, masque visuellement, a l'epoque ou
            l'application n'en avait aucun : ses titres etaient des <div>
            stylises, et un lecteur d'ecran n'avait aucun plan du document.
            Depuis, les trois pages ont le leur - la vitrine, l'editeur et la
            page de mise en service. Celui d'ici faisait donc doublon partout,
            et deux h1 sur une page privent justement ce plan de sa racine
            unique. Mesure : la vitrine en exposait deux.
            Chaque page nomme desormais sa propre page. */}
        <main id="contenu">{children}</main>
      </body>
    </html>
  );
}
