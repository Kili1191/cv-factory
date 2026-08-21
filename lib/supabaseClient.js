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

export function isCloudConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
