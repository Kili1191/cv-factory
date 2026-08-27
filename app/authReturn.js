// LE RETOUR DE CONNEXION ARRIVE SUR "/", PAS SUR "/app"
//
// Le fournisseur d'identite renvoie toujours vers l'adresse enregistree
// comme Site URL, c'est-a-dire la racine du domaine. Ce reglage vit chez
// Supabase et chez Google, pas dans ce depot : on ne peut pas le changer
// depuis ici, et surtout on ne DOIT pas dependre de son changement.
//
// Depuis que l'application a demenage sur /app, un retour de connexion
// atterrit donc sur une page d'accueil qui ne sait pas quoi en faire. Sans
// ce relais, se connecter ramene le visiteur sur la vitrine, deconnecte,
// sans un mot - exactement la panne silencieuse qu'on vient de corriger,
// reintroduite par le demenagement.
//
// TOUT est transmis, requete ET fragment : le code d'echange, les jetons du
// flux implicite, et les erreurs. Le fragment compte autant que la requete,
// parce que c'est la que le flux implicite met ses jetons - et un fragment
// n'est jamais envoye au serveur, donc seul le navigateur peut le relayer.

// Les marqueurs qui signent un retour d'authentification, et rien d'autre.
// On ne redirige QUE sur ceux-la : une adresse ordinaire, ou un lien de
// partage avec ses propres parametres, doit rester sur l'accueil.
const MARQUEURS = [
  "code",              // echange de code (PKCE)
  "access_token",      // flux implicite
  "refresh_token",
  "error",             // echec, quelle qu'en soit la cause
  "error_code",
  "error_description",
  "token_hash",        // lien recu par courriel
  "type",
];

export function paramsDAuth(search, hash) {
  const trouve = [];
  for (const source of [search, hash]) {
    if (!source) continue;
    let p;
    try { p = new URLSearchParams(String(source).replace(/^[?#]/, "")); }
    catch { continue; }
    for (const m of MARQUEURS) {
      if (p.has(m)) trouve.push(m);
    }
  }
  return [...new Set(trouve)];
}

// Rend l'adresse complete vers laquelle relayer, ou null s'il n'y a rien a
// relayer. On preserve requete ET fragment tels quels : y toucher casserait
// la verification de signature des jetons.
export function destinationDuRetour(search, hash) {
  if (!paramsDAuth(search, hash).length) return null;
  return "/app" + (search || "") + (hash || "");
}

// L'ICONE DEJA POSEE SUR UN ECRAN D'ACCUEIL POINTE ENCORE SUR "/"
//
// Le manifeste indique desormais /app comme point de depart, mais il n'est
// relu qu'a la prochaine installation. Quelqu'un qui a deja pose Nuvi sur
// son telephone garde l'ancienne adresse : sans ce relais, il ouvrirait son
// application et tomberait sur une page de presentation, avec son CV a deux
// clics de la. C'est une regression pour les seules personnes qui se sont
// deja engagees - exactement celles qu'il ne faut pas perdre.
//
// Le meme raisonnement vaut pour les raccourcis du manifeste, qui portent
// tous ?go=... : ils designent une fonction precise de l'outil.
export function destinationDUneAppInstallee(search) {
  if (!search) return null;
  let p;
  try { p = new URLSearchParams(String(search).replace(/^\?/, "")); }
  catch { return null; }
  if (p.get("src") === "homescreen" || p.has("go") || p.has("gmail")) {
    return "/app" + search;
  }
  return null;
}
