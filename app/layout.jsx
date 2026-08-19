import './globals.css';

// Typographie de marque. Chargee ici, dans le <head>, et non depuis l'arbre
// de composants : les <link> qui vivaient dans page.jsx etaient rendus dans
// une branche client-only, donc Fraunces et Inter ne commencaient a se
// telecharger qu'APRES l'hydratation. Le navigateur les decouvre maintenant
// des la premiere reponse HTML.
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,30..100"
  + "&family=Inter:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap";

export const metadata = {
  title: "CV Factory",
  description: "Editeur de CV Premium IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
