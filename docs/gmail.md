# Lire les reponses des recruteurs

Nuvi peut relire la boite Gmail de l'utilisateur pour remettre le suivi des
candidatures a jour tout seul : un refus fait passer la ligne en "refusee",
une invitation la fait passer en "entretien".

Sans la configuration ci-dessous, **rien ne change** : le panneau ne
s'affiche pas et le suivi se tient a la main, exactement comme avant.

## Ce que Nuvi lit, et ce qu'il ne lit pas

| | |
|---|---|
| Portee demandee | `gmail.readonly` |
| Messages demandes | uniquement ceux qui citent une entreprise **deja presente dans le suivi**, sur les 120 derniers jours, hors spam et corbeille |
| Champs telecharges | expediteur, objet, date, et l'extrait de ~100 caracteres que Google joint |
| Corps du message | jamais |
| Chemin des donnees | navigateur → Google. **Aucun passage par un serveur Nuvi** |

Le dernier point n'est pas une promesse, c'est une propriete du code : c'est
le navigateur qui appelle l'API Gmail (`lib/gmailClient.js`), donc il
n'existe aucune route serveur ou le jeton ou les messages pourraient etre
journalises.

La requete envoyee a Google est construite par `buildQuery()`. Sans
candidature suivie, elle rend une chaine vide et **aucun appel n'est fait** :
il n'existe pas de chemin par lequel Nuvi demanderait la boite entiere.

## Ce que Nuvi ne fait jamais

Il ne change aucun etat tout seul. Chaque proposition affiche le message qui
l'a produite, avec un lien pour aller le lire dans Gmail, et attend un clic.

La raison est asymetrique : classer un refus en "entretien" fait perdre une
heure de preparation ; classer une invitation en "refus" fait abandonner un
poste obtenu. La seconde erreur ne se rattrape pas, donc la machine propose
et l'utilisateur decide.

## Mise en place (Google Cloud)

1. **console.cloud.google.com** → nouveau projet (ou le projet existant).
2. **APIs & Services → Library** → activer **Gmail API**.
3. **APIs & Services → OAuth consent screen** :
   - type **External**, mode **Testing** ;
   - ajouter la portee `https://www.googleapis.com/auth/gmail.readonly` ;
   - ajouter les adresses de test dans **Test users**.

   En mode Testing, Google autorise jusqu'a **100 utilisateurs** avec cette
   portee sans audit de securite CASA. Passer en **Production** avec une
   portee restreinte demande cet audit, qui est long et payant : ne le
   declencher que quand le nombre d'utilisateurs le justifie.
4. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   - **Authorized redirect URIs** : l'URL de rappel de Supabase,
     `https://<projet>.supabase.co/auth/v1/callback`.
5. Dans **Supabase → Authentication → Providers → Google** : coller le
   *Client ID* et le *Client secret*.

Aucune variable d'environnement supplementaire n'est necessaire cote Nuvi :
l'autorisation Gmail se demande par-dessus le compte Supabase deja en place
(voir `docs/comptes.md`).

## Duree de l'autorisation

Le jeton d'acces Google vit **une heure** et Supabase ne le renouvelle pas.
Passe ce delai, le panneau affiche "L'autorisation Google a expire" et
propose de reconnecter : comme le consentement est deja donne, le passage
par Google est immediat et silencieux.

C'est une limite reelle et assumee. La lever demanderait de conserver le
jeton de renouvellement cote serveur, donc de detenir un acces permanent a la
boite mail de chaque utilisateur, exactement ce que la conception ci-dessus
evite.

## Verification

`tests/gmail-reads-the-replies.mjs` fait tourner le classement sur onze
messages reels : refus polis qui commencent par un remerciement, refus qui
contiennent le mot *offer*, recruteur qui deplace un rendez-vous avec
"malheureusement", lettre d'information de la meme entreprise. Il verifie
aussi qu'une candidature ne recule jamais, et qu'aucune requete ne part sans
filtre.

```
npm test gmail
```
