// LE POINT DE RUPTURE, ECRIT UNE FOIS
//
// Il en existait TROIS dans l'application : 768 dans une feuille, 800 pour
// la bascule generale telephone/ordinateur, 900 dans les modales. Entre 768
// et 900, Nuvi etait donc a moitie telephone et a moitie ordinateur : sur un
// iPad en portrait - l'une des largeurs les plus repandues du parc - la
// barre du bas d'un telephone s'affichait sous une mise en page
// d'ordinateur.
//
// Personne ne l'avait vu parce que personne ne teste a 768. On teste a 390
// et a 1440, et entre les deux on suppose.
//
// POURQUOI 900, ET PAS 768
//
// Le contenu de Nuvi est une page A4. L'interface d'ordinateur lui ajoute
// une barre laterale et une ligne d'en-tete, donc elle ne se justifie que
// s'il reste assez de largeur pour que le document respire.
//
// Les tablettes en portrait font 768, 810 ou 834 selon le modele. A ces
// largeurs, l'interface de telephone laisse plus de place au CV et se tient
// mieux a la main - c'est un appareil qu'on tient, pas un appareil pose.
// L'interface d'ordinateur commence donc a 900, ce qui met une tablette en
// PAYSAGE (1024 et au-dela) du bon cote.
//
// C'est la valeur que les modales employaient deja. Les deux autres etaient
// les exceptions, et c'est en les alignant qu'on l'a decouvert.
export const RUPTURE = 900;

export function estTelephone() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < RUPTURE;
}
