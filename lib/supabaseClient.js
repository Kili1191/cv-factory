// Client Supabase, cree une seule fois et seulement si la configuration existe.
//
// POURQUOI CE FICHIER PEUT NE RIEN RENDRE
//
// L'application doit continuer de fonctionner exactement comme avant quand
// aucun serveur n'est configure. Sans cette garantie, ajouter les comptes
// serait un risque pour tous les utilisateurs actuels : une variable
// d'environnement oubliee au deploiement et plus personne n'accede a son CV.
//
// Ici, si les variables manquent, getSupabase() rend null, la synchronisation
// se met en sommeil, et le stockage local reprend son role d'avant. Aucun
// ecran d'erreur, aucune fonctionnalite perdue : simplement pas de compte.

import { createClient } from "@supabase/supabase-js";

let cached;

// LA CLE PUBLIQUE PORTE DEUX NOMS, ET C'EST SUPABASE QUI EN A CHANGE
//
// Historiquement la cle destinee au navigateur s'appelait "anon" et prenait la
// forme d'un jeton JWT (eyJ...). Supabase distribue maintenant des cles dites
// "publishable" (sb_publishable_...), et le code d'exemple affiche dans leur
// tableau de bord propose de les ranger sous NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
//
// Quelqu'un qui suit ce code d'exemple pose donc la bonne cle sous un nom que
// l'application ne lit pas. Tout est juste, et pourtant aucun bouton de
// connexion n'apparait : la panne la plus penible qui soit, parce qu'il n'y a
// rien a corriger et rien qui l'indique.
//
// On accepte les deux noms. Les deux formes de cle fonctionnent avec la
// bibliotheque, et cette ligne coute moins cher qu'une page de documentation
// que personne ne relira au moment ou il en aurait besoin.
//
// Les deux acces sont ecrits en toutes lettres, et non calcules : Next.js
// remplace ces expressions par leur valeur au moment de la construction, et il
// ne sait le faire que sur une ecriture litterale.
function publicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || "";
}

export function isCloudConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publicKey());
}

export function getSupabase() {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined" || !isCloudConfigured()) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      publicKey(),
      {
        auth: {
          // Les trois reglages qui font qu'on ne redemande jamais de se
          // reconnecter : la session est ecrite sur le disque du navigateur,
          // le jeton se renouvelle tout seul avant d'expirer, et le retour
          // depuis un lien magique est capte automatiquement.
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "nuvi_session",
        },
      }
    );
  } catch {
    cached = null;
  }
  return cached;
}
