# Activer les comptes

L'application marche sans compte. Tant que les deux variables ci-dessous sont
absentes, rien ne change : le CV reste dans le navigateur, aucun bouton de
connexion n'apparait, et personne ne voit de fonction qui ne repondrait pas.

Cette page decrit les trois etapes pour activer les comptes. Compter dix
minutes.

## 1. Creer le projet

Sur [supabase.com](https://supabase.com), cree un projet. L'offre gratuite
suffit largement pour demarrer.

Choisis une region **europeenne** (Frankfurt ou Paris) : les CV contiennent des
noms, des adresses et des parcours professionnels, donc des donnees
personnelles au sens du RGPD. Les heberger en Europe evite une discussion
inutile plus tard.

## 2. Creer la table

Dans le projet, ouvre **SQL Editor** et execute ceci :

```sql
create table public.user_state (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_state enable row level security;

-- Chacun ne voit et ne modifie que ses propres lignes. Sans ces regles,
-- n'importe quel visiteur pourrait lire le CV de n'importe qui : la cle
-- publique du navigateur ne protege rien par elle-meme.
create policy "lecture de ses propres donnees"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "ecriture de ses propres donnees"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "mise a jour de ses propres donnees"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "suppression de ses propres donnees"
  on public.user_state for delete
  using (auth.uid() = user_id);
```

La securite tient entierement aux quatre regles `policy`. Ne les saute pas.

## 3. Poser les deux variables

Dans Supabase, **Project Settings > API** (ou le bouton **Connect** en haut),
releve :

- `Project URL`
- la cle publique. Selon l'age du projet elle s'appelle `anon public` et
  ressemble a `eyJ...`, ou `publishable` et ressemble a `sb_publishable_...`.
  Les deux fonctionnent.

Puis dans Vercel, **Settings > Environment Variables**, ajoute :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

L'application accepte aussi `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, qui est le
nom propose par le code d'exemple du tableau de bord Supabase. Suivre leur
exemple sans le savoir posait la bonne cle sous un nom que l'application ne
lisait pas : tout etait juste, et aucun bouton de connexion n'apparaissait.

## Les adresses de retour

Sans ce reglage, le lien recu par courriel renvoie vers `localhost:3000` et ne
mene nulle part. C'est le premier obstacle que rencontre quiconque active les
comptes.

Dans Supabase, **Authentication > URL Configuration** :

- **Site URL** : `https://thenuvi.com`
- **Redirect URLs** : `https://thenuvi.com/**`, `https://www.thenuvi.com/**`,
  et `https://*.vercel.app/**` pour pouvoir tester sur les apercus.

La cle `service_role` ne doit **jamais** sortir du serveur. Elle contourne les
regles ci-dessus. Seule la cle `anon` va dans le navigateur, et c'est prevu
pour.

Redeploie. Le bouton de connexion apparait dans Reglages.

## Connexion par Google

Facultatif mais recommande, c'est le chemin le plus court pour l'utilisateur.
Dans Supabase, **Authentication > Providers > Google**, active le fournisseur
et colle les identifiants OAuth obtenus dans la console Google Cloud. Ajoute
l'URL de redirection indiquee par Supabase aux origines autorisees.

Sans cette etape, seul le lien par courriel fonctionne, ce qui suffit.

## Ce qui se passe pour les utilisateurs actuels

Personne ne perd rien.

Un utilisateur qui a deja un CV dans son navigateur et qui se connecte pour la
premiere fois voit son CV **envoye** vers son compte. Le compte etant vide, il
ne peut pas ecraser quoi que ce soit : la regle de fusion donne toujours raison
au navigateur quand le compte ne connait pas encore la donnee.

Se deconnecter ne vide pas le navigateur non plus : on retrouve son CV comme
avant d'avoir un compte.

Ces deux garanties sont verifiees par `tests/accounts-never-lose-the-cv.mjs`,
qui echoue si l'une des deux cesse d'etre vraie.

## Comment la synchronisation se comporte

La lecture ne passe jamais par le reseau. Le navigateur reste la source de
verite pour l'affichage, donc ouvrir son CV n'attend rien, meme en 4G
capricieuse. Les modifications partent vers le compte en arriere-plan, groupees
toutes les 1,2 seconde.

Entre deux appareils, la version la plus recente gagne, cle par cle. Quand une
version plus recente arrive d'ailleurs, l'application le signale et se recharge
pour repartir d'un etat coherent.

---

# Brancher les sources d'offres

Trois sources ont ete verifiees comme reellement accessibles, gratuitement et
sans partenariat. Chacune est absente tant que sa cle n'est pas posee, et une
source en panne n'empeche pas les autres de repondre.

| Source | Couverture | Inscription | Cout |
|---|---|---|---|
| France Travail | France, 300 000+ offres | francetravail.io | gratuit |
| Adzuna | 19 pays dont France et Royaume-Uni | developer.adzuna.com | gratuit, ~1000 appels/mois |
| Reed | Royaume-Uni | reed.co.uk/developers | gratuit |

Adzuna seule couvre les deux marches qui interessent Nuvi. C'est la premiere a
brancher si tu n'en fais qu'une.

## Variables

```
FRANCE_TRAVAIL_ID=...
FRANCE_TRAVAIL_SECRET=...
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
REED_API_KEY=...
```

Aucune n'est prefixee `NEXT_PUBLIC_` : ce sont des secrets, ils restent sur le
serveur. La recherche passe par `/api/jobs/search`, jamais par le navigateur.

## Ce qui n'est pas possible, et pourquoi

**LinkedIn.** "Sign In with LinkedIn" est gratuit et immediat, mais ne donne
que le nom, l'e-mail et la photo. Le profil complet et les offres passent par
le Partner Program : trois a six mois d'instruction, accorde a discretion, les
refus sont rarement expliques, et l'API Sales Navigator n'accepte plus de
nouveaux partenaires. Le chemin honnete pour importer un profil LinkedIn reste
l'export PDF que LinkedIn fournit a chaque utilisateur, et que Nuvi sait deja
lire.

**Indeed.** L'API publique de recherche est fermee depuis 2024. Il ne reste
qu'une API destinee aux employeurs, payante a l'appel, qui ne sert pas a lire
des offres. Aucun acces en lecture pour une application tierce, a aucun prix
raisonnable.

**Google.** Google Jobs n'est pas une API mais une fonction de recherche.
Google se branche pour la connexion, la boite mail et l'agenda, pas pour les
offres.

Contourner ces limites par du grattage de pages violerait les conditions
d'utilisation de ces plateformes, qui bloquent activement et poursuivent. Ce
n'est pas une option pour un produit qu'on veut faire durer.

---

# L'extension navigateur

Dans `extension/`. Elle capture une annonce sur n'importe quel site d'emploi et
l'envoie vers Nuvi, ou elle devient une candidature suivie et ou le CV s'adapte
aussitot.

## L'installer

Pas encore publiee sur le Chrome Web Store. En attendant :

1. Ouvrir `chrome://extensions`
2. Activer le mode developpeur, en haut a droite
3. "Charger l'extension non empaquetee", choisir le dossier `extension/`

Les icones sont l'oeil de Nuvi, aux trois tailles attendues par Chrome. Elles
sont generees depuis le trace du compagnon par
`scripts/build-extension-icons.mjs` : pour les regenerer apres un changement de
charte, lancer ce script plutot que retoucher des images a la main.

## Comment elle lit les annonces

Pas de selecteurs par site. Ecrire un selecteur pour LinkedIn, un pour Indeed,
un pour Welcome to the Jungle, c'est signer pour les reparer a chaque refonte,
et n'avoir rien du tout sur les milliers d'autres sites.

Elle lit les donnees structurees schema.org `JobPosting` que ces sites
publient deja, parce que Google Jobs l'exige pour les referencer. C'est le
format le plus fiable et le plus universel disponible.

Trois niveaux : les donnees structurees d'abord, les balises meta ensuite, le
texte de la page en dernier recours. L'extension annonce quand la lecture est
approximative plutot que de faire croire a une capture propre.

## Ce qui la distingue

L'extension de Jobscan capture l'annonce puis renvoie l'utilisateur sur son
site, ou il reprend tout a la main. Un comparatif mesure vingt-deux a
vingt-six minutes par candidature.

Ici, un clic depose l'annonce, ouvre Nuvi, cree la candidature suivie et
pre-remplit l'adaptation du CV. Aucun copier-coller.

## Ce qu'elle ne fait pas

Elle ne lit que la page ouverte, quand tu cliques. Elle ne surveille rien, ne
parcourt aucun site en arriere-plan, et n'a acces qu'a `thenuvi.com` en
ecriture. Le contournement des protections de LinkedIn ou d'Indeed n'est pas
au programme : c'est contraire a leurs conditions et ils le detectent.
