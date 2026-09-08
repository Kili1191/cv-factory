# Facturation : mettre l'argent en route

Le code du plan est dans le dépôt depuis le 8 septembre 2026 et ne fait
rien tant que sept variables d'environnement ne sont pas posées sur Vercel.
Sans elles, le produit est gratuit et sans compte, comme avant. Avec elles :

- un visiteur sans compte est invité à se connecter avant tout appel au
  modèle (la vérification ATS, le suivi et les gabarits restent libres) ;
- un compte a trois adaptations gratuites (une adaptation = un CV pour une
  annonce ; son second passage mesuré n'en compte pas une deuxième) ;
- au-delà, la feuille du plan s'ouvre : 24 € par mois ou 49 € pour trois
  mois, TVA comprise, paiement sur la page de Stripe, résiliation depuis
  Réglages via le portail de Stripe.

## Les sept variables

| Variable | Où la prendre |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe, Développeurs, Clés API. `sk_test_…` pour essayer, `sk_live_…` pour vendre. |
| `STRIPE_WEBHOOK_SECRET` | Stripe, Développeurs, Webhooks : ajouter `https://thenuvi.com/api/billing/webhook` avec les événements `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Le secret `whsec_…` s'affiche à la création. |
| `STRIPE_PRICE_MONTHLY` | Stripe, Catalogue : un produit « Nuvi », un prix récurrent mensuel de 24 € **TTC** (« le prix inclut la taxe »). L'identifiant `price_…`. |
| `STRIPE_PRICE_QUARTERLY` | Le même produit, un prix récurrent tous les 3 mois de 49 € TTC. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase, Réglages du projet, API. **Jamais** avec le préfixe `NEXT_PUBLIC_` : cette clé passe outre toutes les règles RLS. |
| `NEXT_PUBLIC_SUPABASE_URL` | Déjà posée pour le compte. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Déjà posée pour le compte. |

Puis appliquer la migration `supabase/migrations/20260908000000_billing.sql`
(deux tables : `subscriptions`, `usage_monthly` ; le navigateur lit sa
propre ligne, seul le serveur écrit).

Dans Stripe, activer **Stripe Tax** (le paiement calcule la TVA du pays de
la carte) et le **portail client** (Réglages, Facturation, Portail client :
autoriser la résiliation et le changement de carte).

## Vérifier

1. Avec les clés `sk_test_`, se connecter à l'application, faire trois
   adaptations, la quatrième ouvre la feuille du plan.
2. Payer avec la carte de test `4242 4242 4242 4242`. Le retour sur
   `/app?facture=ok` dit « Bienvenue », et Réglages montre « Plan actif ».
3. Dans Stripe, Développeurs, Webhooks, le dernier événement est en 200.
4. « Gérer mon abonnement » ouvre le portail ; résilier ; au prochain
   événement, Réglages repasse en gratuit.

Chaque appel au modèle écrit une ligne `[usage]` dans les journaux de la
fonction, avec la tâche, le modèle, les jetons, le coût en dollars et qui a
payé (`payer=abonne`, `payer=gratuit`, `payer=open` sans facturation). C'est
contre ces lignes que le prix se vérifie.

Poser aussi une **limite de dépense** dans la console Anthropic, au double
du coût mensuel attendu du modèle : la pire nuit coûte alors un montant
connu.

## Ce que le code garantit

`tests/the-money-arrives.mjs` : un visiteur reçoit 401, un compte au bout de
ses trois adaptations reçoit 402, un abonné passe, l'adaptation est comptée
et pas le coach, le checkout demande à Stripe le bon prix avec le compte en
référence et la TVA automatique, et seul un webhook signé écrit un plan.
`tests/the-model-follows-the-task.mjs` : le modèle par tâche et le coût par
appel, sur lesquels le prix a été fixé.
