import './globals.css';

// Typographie de marque. Chargee ici, dans le <head>, et non depuis l'arbre
// de composants : les <link> qui vivaient dans page.jsx etaient rendus dans
// une branche client-only, donc Fraunces et Inter ne commencaient a se
// telecharger qu'APRES l'hydratation. Le navigateur les decouvre maintenant
// des la premiere reponse HTML.
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,30..100"
  + "&family=Inter:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap";

// L'ecran d'accueil d'un iPhone ne peut poser l'application que si le
// document declare son manifeste, son icone et son titre court. Sans ces
// trois-la, "Sur l'ecran d'accueil" fabrique une vignette a partir d'une
// capture de la page et l'ouvre dans Safari : un marque-page, pas une app.
export const metadata = {
  metadataBase: new URL("https://thenuvi.com"),
  applicationName: "Nuvi",
  title: {
    default: "Nuvi — le CV qui passe l'ATS",
    template: "%s · Nuvi",
  },
  description:
    "Colle l'annonce, obtiens le CV qui correspond, et suis tes candidatures.",
  manifest: "/manifest.webmanifest",
  // Le nom sous l'icone. Sans lui, iOS affiche le <title> entier, tronque a
  // une douzaine de caracteres : "Nuvi — le CV..." au lieu de "Nuvi".
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
  openGraph: {
    type: "website",
    siteName: "Nuvi",
    title: "Nuvi — le CV qui passe l'ATS",
    description:
      "Colle l'annonce, obtiens le CV qui correspond, et suis tes candidatures.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
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
  return (
    <html lang="fr">
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
        <h1 className="sr-only">Nuvi — editeur de CV</h1>
        <main>{children}</main>
      </body>
    </html>
  );
}
