# Les alertes

## Ce qui marche aujourd'hui, sans aucune cle

La veille tourne **sur l'appareil**. A chaque recherche, l'ecran dit ce qui est
nouveau depuis la derniere fois : "1 nouvelle offre, sur 3 regardees", avec une
pastille sur les cartes concernees. Une veille par recherche, stockee sous
`cvf_vl`, parce que "gestion de comptes a Londres" et "gestion de comptes a
Manchester" sont deux questions.

La partie difficile est faite et testee : `lib/digest.js` decide ce qui compte
comme nouveau, et c'est la seule partie qui merite d'etre bien faite. Trois
regles, chacune une facon de se tromper :

- **le premier passage arme la veille et n'annonce rien.** Tout est inconnu au
  premier passage, donc une lecture litterale enverrait cinquante offres, ce
  qui n'est pas un resume mais la liste des resultats avec un tampon dessus ;
- **une memoire plafonnee ne doit pas ressusciter une vieille offre.** La liste
  garde les mille plus recentes ; une fois rognee, une annonce d'il y a six
  mois n'y est plus et reviendrait comme neuve, donc une date anterieure a la
  veille elle-meme la refuse ;
- **le resume dit ce qu'il a regarde.** "Rien de nouveau" apres 265 pages
  carriere est un fait ; "rien de nouveau" parce que la recherche a casse est
  une panne, et les deux se lisent pareil a partir du seul chiffre.

## Ce qui manque pour que ca parte par email

Quatre variables, et le serveur sait dire lesquelles il voit :
`GET /api/jobs/search?only=sources` renvoie `alerts`, **un booleen par nom,
jamais une valeur**. Comme pour Adzuna : un nom absent veut dire que Vercel ne
le livre pas (les variables sont figees dans la construction, donc il faut
redeployer apres les avoir enregistrees).

| Variable | A quoi elle sert |
| --- | --- |
| `RESEND_API_KEY` | Le fournisseur d'envoi. resend.com, gratuit jusqu'a 3000 messages par mois. |
| `ALERT_FROM` | L'adresse d'expedition, sur un domaine verifie chez le fournisseur. |
| `SUPABASE_SERVICE_ROLE_KEY` | Pour qu'une tache planifiee lise les veilles de tout le monde. **Jamais** avec le prefixe `NEXT_PUBLIC_` : cette cle passe outre toutes les regles RLS. |
| `CRON_SECRET` | Pour que la route planifiee refuse tout appelant qui n'est pas Vercel. |

`lib/alertMail.js` est ecrit et teste contre des doubles : la composition du
message, l'echappement de ce que l'annonce a ecrit, le rapport de
configuration, et un envoi qui echoue en le disant au lieu d'emporter la
tournee entiere. `tests/the-alert-says-what-is-missing.mjs`.

## Ce qui n'est volontairement pas ecrit

**La route d'envoi declenchee depuis le navigateur.** Un point d'entree qui
envoie un email a une adresse fournie par l'appelant est un relais a spam :
n'importe qui posterait du courrier depuis le domaine de Nuvi, et le domaine
serait sur liste noire en une journee. Il faut donc que le destinataire soit
l'adresse du compte connecte, et pas une adresse passee dans la requete.

**La tache planifiee et sa table.** Elle n'a rien a lire tant qu'il n'y a pas
de stockage cote serveur pour les veilles, et une tache qui tourne sans rien
lire est exactement la panne silencieuse que ce depot passe son temps a
chasser. Ces deux morceaux s'ecrivent le jour ou les quatre variables
existent, et le reste est deja la.
