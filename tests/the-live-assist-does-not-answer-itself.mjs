// L'assistant live n'ecoute pas la personne lire sa propre reponse.
//
// LE DEFAUT QU'IL EMPECHE
//
// L'ecoute etait continue, y compris pendant l'affichage des reperes. Or
// c'est exactement le moment ou la personne les LIT a voix haute : c'est
// l'objet de l'ecran. Le micro entendait donc sa propre reponse, la prenait
// pour une nouvelle question, et remplacait a l'ecran ce qu'elle etait en
// train de dire.
//
// C'est une boucle : plus l'assistant sert, plus il se casse. Aucun reglage
// de duree de silence ne la corrige, parce que la voix qui parle est
// justement celle qu'on attend. Le micro doit s'arreter quand une question
// part, et se relancer d'un geste.
//
// LE SECOND DEFAUT : L'ECHEC MUET
//
// onerror coupait l'ecoute sans rien dire. Micro refuse, service de
// transcription injoignable : dans les deux cas le bouton redevenait inerte
// et l'assistant paraissait casse sans raison. C'est ce qu'on voyait sur
// ordinateur, ou la permission se demande par site et ou le service passe
// par le reseau. Quelqu'un en plein entretien n'a pas le temps de chercher
// pourquoi : il faut lui dire ou cliquer.

import { readFileSync } from "node:fs";

const FICHIER = "app/components/LiveAssistModal.jsx";

export async function run() {
  const failures = [];
  const src = readFileSync(FICHIER, "utf8");

  // 1. Une question qui part coupe le micro.
  const bloc = src.slice(src.indexOf("silenceRef.current = setTimeout"),
                         src.indexOf("rec.onerror"));
  if (!/rec\.stop\(\)/.test(bloc) || !/setListening\(false\)/.test(bloc)) {
    failures.push(
      "l'ecoute ne s'arrete pas quand une question part. La personne lit les "
      + "reperes a voix haute, le micro l'entend, la prend pour une nouvelle "
      + "question et remplace a l'ecran ce qu'elle est en train de dire."
    );
  }

  // 2. L'erreur du micro est retenue, pas avalee.
  if (!/rec\.onerror\s*=\s*\(e\)\s*=>/.test(src) || !/setMicErreur/.test(src)) {
    failures.push(
      "onerror n'expose pas le motif de l'echec. Un micro refuse ou un service "
      + "injoignable rend le bouton inerte sans un mot, et l'assistant parait "
      + "casse sans raison."
    );
  }

  // 3. Chaque motif connu a son message, et le message dit quoi faire.
  for (const [code, cle] of [
    ["not-allowed", "micRefuse"], ["service-not-allowed", "micRefuse"],
    ["audio-capture", "micAbsent"], ["network", "micReseau"],
    ["no-speech", "micRien"],
  ]) {
    if (!src.includes('"' + code + '"')) {
      failures.push(`le motif "${code}" n'est pas distingue : la personne recevra `
        + "un message generique la ou une action precise existe.");
    }
    if (!new RegExp("\\b" + cle + ":").test(src)) {
      failures.push(`le libelle ${cle} manque dans au moins une langue.`);
    }
  }

  // 3 bis. LA MEME GARANTIE, PAR L'AUTRE CHEMIN
  //
  // Couper le micro protege de la boucle en rendant l'assistant sourd. Ce
  // n'est vrai que du chemin de repli, celui ou seul le micro existe. Quand
  // l'onglet de la visio est suivi, le micro reste ouvert toute la duree de
  // l'entretien, et ce qui protege de la boucle est la source : les mots qui
  // arrivent pendant que le candidat parle sont ecartes avant d'etre
  // affiches ou envoyes.
  //
  // Les deux chemins doivent tenir. Un jour ou le portillon disparaitrait en
  // laissant le micro ouvert, la boucle reviendrait sans qu'aucun autre test
  // ne bronche : l'ecran resterait correct, il afficherait simplement la
  // reponse du candidat a la place de sa question.
  if (!/ecouteLeRecruteur\(/.test(src)) {
    failures.push(
      "le portillon ecouteLeRecruteur a disparu. Avec l'onglet suivi le micro "
      + "reste ouvert pendant que la personne lit ses reperes a voix haute : "
      + "sans ce test de source, l'assistant reprend sa propre reponse pour "
      + "une question."
    );
  }
  {
    // Le portillon doit couper AVANT l'affichage et l'envoi, pas apres.
    const i = src.indexOf("ecouteLeRecruteur(performance.now())");
    const j = src.indexOf("questionRef.current = clean");
    if (i < 0 || j < 0 || i > j) {
      failures.push(
        "le portillon ne precede pas l'enregistrement de la question : les mots "
        + "du candidat atteignent la question avant d'etre ecartes."
      );
    }
    const bloc = i >= 0 ? src.slice(i, i + 200) : "";
    if (!/return;/.test(bloc)) {
      failures.push("le portillon ne renvoie rien quand ce n'est pas le recruteur qui parle.");
    }
  }

  // 3 ter. Suivre l'onglet ne doit PAS couper le micro : c'est tout l'interet.
  //        Une question qui continue apres une pause doit encore trouver une
  //        oreille ouverte.
  {
    const i = src.indexOf("const oracle = oracleRef.current;");
    const j = src.indexOf("silenceRef.current = setTimeout");
    const entre = (i >= 0 && j > i) ? src.slice(i, j) : "";
    if (!entre || /rec\.stop\(\)/.test(entre)) {
      failures.push(
        "le chemin avec onglet suivi coupe le micro. Il ne doit pas : c'est ce "
        + "qui permet d'entendre la suite d'une question et la question d'apres."
      );
    }
  }

  // 3 quater. LE PARTAGE NE GARDE QUE LE SON
  //
  // Chrome refuse une capture audio seule : il faut demander une video et la
  // relacher. Une piste video gardee, c'est un partage d'ecran qui reste
  // allume pendant tout l'entretien, avec l'indicateur du navigateur par
  // dessus la visio, pour une image dont personne ne fait rien.
  if (!/getVideoTracks\(\)\.forEach/.test(src)) {
    failures.push(
      "la piste video de la capture n'est pas relachee : un partage d'ecran "
      + "reste ouvert pendant tout l'entretien pour une image inutilisee."
    );
  }
  // Et rien n'est transcrit de l'onglet : on n'en lit qu'un volume.
  if (!/rms\(/.test(src)) {
    failures.push("l'onglet n'est plus lu comme un simple volume.");
  }

  // 4. Le message est annonce aux technologies d'assistance : il apparait
  //    apres coup, sans que rien ne bouge a l'endroit du regard.
  if (!/aria-live="polite"/.test(src)) {
    failures.push(
      "le message d'echec du micro n'est pas annonce (aria-live). Il surgit "
      + "apres l'action, donc rien ne le signale a qui ne le voit pas."
    );
  }

  if (!failures.length) {
    console.log(
      "      le micro se coupe des qu'une question part, et chaque motif "
      + "d'echec est nomme avec ce qu'il faut faire"
    );
  }
  return failures;
}
