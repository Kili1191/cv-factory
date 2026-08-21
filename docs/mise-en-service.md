# Mise en service — ce qui est branché, et ce qui attend une clé

Tout le code est écrit, testé et déployé. Ce document liste les **quatre
réglages** qui restent, et ce que chacun allume.

Le principe de conception est le même partout : **sans la clé, la
fonctionnalité disparaît proprement**. Aucun écran d'erreur, aucune
fonctionnalité cassée — simplement une option qui ne s'affiche pas. Une
variable oubliée au déploiement ne peut donc pas casser l'application pour
les utilisateurs déjà là.

---

## 1. L'IA — `ANTHROPIC_API_KEY` — **déjà en place**

Sans elle, aucune analyse, aucune réécriture, aucune lettre. C'est la seule
variable indispensable, et elle est configurée.

---

## 2. Les comptes — Supabase — **à faire, ~10 min**

| Variable | Où |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel → Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem |

**Ce que ça allume** : la connexion par lien magique et par Google, la
mémoire du CV d'un appareil à l'autre, et la connexion qui ne se redemande
jamais.

**Tant que c'est absent** : l'application fonctionne exactement comme
aujourd'hui, le CV vit dans le navigateur, et aucun bouton de compte ne
s'affiche. C'est vérifié par un test (`accounts-never-lose-the-cv`), y
compris le scénario où un compte vide écraserait un CV local.

Marche à suivre détaillée : **`docs/comptes.md`**.

---

## 3. Les réponses des recruteurs — Google — **à faire après Supabase**

Rien à ajouter côté Vercel : l'autorisation Gmail se demande par-dessus le
compte Supabase. Il faut activer l'API Gmail dans Google Cloud et coller le
*Client ID* / *Client secret* dans Supabase.

**Ce que ça allume** : le suivi qui se met à jour tout seul. Un refus fait
passer la ligne en « refusée », une invitation en « entretien ».

**Tant que c'est absent** : le panneau ne s'affiche pas dans le suivi, qui se
tient à la main comme aujourd'hui.

Marche à suivre détaillée : **`docs/gmail.md`**.

---

## 4. La recherche d'offres — **facultatif, ~2 min par source**

| Source | Variables | Coût | Couverture |
|---|---|---|---|
| France Travail | `FRANCE_TRAVAIL_ID`, `FRANCE_TRAVAIL_SECRET` | gratuit | France |
| Adzuna | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | gratuit | France + UK |
| Reed | `REED_API_KEY` | gratuit | UK |

Les clés restent **côté serveur** : elles ne sont jamais envoyées au
navigateur. Chaque source est indépendante — en configurer une suffit, et
`availableSources()` n'expose que celles qui répondent.

**Tant que c'est absent** : l'écran « Trouver un poste » indique qu'aucune
source n'est configurée, et le reste du parcours (coller une annonce à la
main, l'extension) fonctionne normalement.

---

## 5. L'extension Chrome — **prête, non publiée**

Le dossier `extension/` est complet : manifeste, icônes tirées de l'œil de
Nuvi, lecture de l'annonce (JSON-LD → balises → texte de la page).

Pour l'essayer tout de suite : `chrome://extensions` → *Mode développeur* →
*Charger l'extension non empaquetée* → choisir le dossier `extension/`.

Pour la publier : compte développeur Chrome Web Store (25 $ une fois), puis
envoi du dossier compressé. La revue prend quelques jours.

---

## Ce qui marche déjà sans aucun réglage

- Créer, importer, réécrire, adapter un CV à une annonce
- Les six modèles, le design, la traduction
- L'export PDF **lu à 100 % par les trois moteurs d'extraction des ATS**
- Le score, l'audit ATS, le Truth Check, le positionnement, le lissage
- Le pack de candidature complet (lettre, relance, objections, négociation)
- L'assistant d'entretien en direct
- Le suivi des candidatures, à la main
- L'installation sur l'écran d'accueil de l'iPhone et d'Android
