// THE PAGE MEANT TO BE SENT HAD NOTHING TO SHOW WHEN IT WAS
//
// /verifier is the only thing on this site a stranger can use in full with no
// account, no upload and no reason to trust us: it reads their file in their
// own browser and tells them which of six named screening systems can read
// it. It is the one page built to be passed between two people.
//
// And it had no metadata. The page is a client component, so it cannot export
// any, and nothing else did it for it: every link to it carried the site's
// default card, "Nuvi, the CV that gets past the ATS", with the home page's
// description underneath. Pasted into a group chat that reads as an advert
// for a product, which nobody opens, instead of a free check on your own CV,
// which people do. The card is made by the messaging app from these tags
// before anyone visits, so it is the one piece of this page no visitor can
// ever correct for us.
//
// A layout is the only place to put them on a client page. It adds no markup
// and renders nothing of its own.
//
// It is written in English and does not follow the reader: a crawler fetches
// it with no stored choice, so there is nothing to follow. That is the same
// reason the root layout's card is English, written out there at length.

export const metadata = {
  // The template in the root layout appends " . Nuvi".
  title: "Free CV check",
  description:
    "Drop your CV and see what Workday, Taleo, iCIMS, SAP SuccessFactors, "
    + "Greenhouse and Lever actually read. No account, nothing uploaded: the "
    + "check runs in your browser.",
  alternates: { canonical: "/verifier" },
  openGraph: {
    type: "website",
    siteName: "Nuvi",
    url: "/verifier",
    title: "See your CV the way the screening software does",
    description:
      "Six real parsers, your own file, in your browser. No account, nothing "
      + "uploaded. Most CVs lose something before a human ever reads them.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "See your CV the way the screening software does",
    description:
      "Six real parsers, your own file, in your browser. No account, nothing "
      + "uploaded. Most CVs lose something before a human ever reads them.",
    images: ["/icon-512.png"],
  },
};

export default function VerifierLayout({ children }) {
  return children;
}
