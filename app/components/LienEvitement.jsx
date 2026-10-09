"use client";

// THE SKIP LINK, IN THE READER'S LANGUAGE
//
// It is the first thing the Tab key reaches on every page, and it was the
// only string in the root layout that never followed the language. It read
// "Skip to content" to a French reader, which is a small thing to hear and
// an odd one: the whole page behind it is French.
//
// It could not simply be translated where it was. The root layout is a server
// component, rendered before anyone's stored choice is readable, so the word
// has to be chosen in the browser. This is the same shape app/page.jsx uses
// for the shop window: English on the server and on the first client render,
// which is what the default is anyway, then the stored choice once it can be
// read. Rendering the French on the server instead would make the HTML sent
// and the HTML rebuilt disagree, and React throws the whole tree away to fix
// it, which costs more than the word is worth.

import { useEffect, useState } from "react";
import { langueDuSite } from "../../lib/langueDuSite.js";

export default function LienEvitement() {
  const [mot, setMot] = useState("Skip to content");

  useEffect(() => {
    // langueDuSite also carries the one time move of a stored "fr" to
    // English. Reading it here rather than the raw key keeps this link on the
    // same answer as the rest of the site.
    if (langueDuSite(window.localStorage) === "fr") setMot("Aller au contenu");
  }, []);

  return (
    <a href="#contenu" className="nuvi-evitement" data-evitement="1">
      {mot}
    </a>
  );
}
