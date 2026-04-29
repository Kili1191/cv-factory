export const metadata = {
  title: "CV Factory",
  description: "Editeur de CV Premium IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
