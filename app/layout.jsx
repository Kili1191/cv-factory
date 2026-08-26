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
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT"
  + "@0,9..144,300..900,30..100;1,9..144,300..900,30..100"
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
        {/* Version servie, lisible sans ouvrir l'app : curl -s thenuvi.com | grep app-build */}
        <meta name="app-build" content={process.env.NEXT_PUBLIC_BUILD_ID || "unknown"} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {/*
          L'application n'avait aucun titre de niveau 1 ni aucun point de
          repere : les titres etaient des <div> stylises. Un lecteur d'ecran
          n'avait donc aucun plan du document, et les moteurs de recherche
          aucune accroche. Le titre est masque visuellement (il ferait doublon
          avec le logo) mais reste expose aux technologies d'assistance.
        */}
        {/* Le seul titre que voient les robots d'indexation. Il vit dans le
            layout, donc cote serveur : il ne peut pas connaitre la langue
            choisie par le visiteur. Il suit donc la langue par defaut du
            document, l'anglais. */}
        <h1 className="sr-only">Nuvi · CV and resume editor</h1>
        <main>{children}</main>
      </body>
    </html>
  );
}
