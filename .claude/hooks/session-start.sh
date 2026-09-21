#!/bin/bash
# Prepare une session distante pour que "npm test" et "npm run lint" marchent.
#
# POURQUOI CE FICHIER EXISTE
#
# Le conteneur d'une session sur le web est neuf a chaque fois : pas de
# node_modules, pas de Chromium connu de playwright, aucun des moteurs
# d'extraction que la suite interroge. Sans ce script, la seule facon de
# verifier une modification est d'ouvrir une proposition de fusion et
# d'attendre l'integration continue. Le script installe donc ici ce que
# .github/workflows/ci.yml installe la-bas, et rien de plus.
#
# Il ne fait rien en local : une machine de developpement a deja tout, et
# reinstaller des paquets systeme sans qu'on l'ait demande serait grossier.

set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "--> dependances npm"
# install et non ci : l'etat du conteneur est mis en cache apres le script, et
# install sait ne rien refaire quand le verrou n'a pas bouge.
npm install --no-audit --no-fund

echo "--> moteurs d'extraction PDF et OCR"
# poppler et MuPDF sont deux implementations independantes de la lecture d'un
# PDF, tesseract lit l'image rendue. La suite se sert des trois pour verifier
# qu'un ATS retrouve le CV exporte. Sans eux les controles concernes se
# declarent non executes au lieu de rougir, ce qui est pire qu'un echec : on
# croit avoir verifie.
# libreoffice-writer opens the .docx and prints it, the proof that the Word
# export is a document and not a zip that passes a regex. The image ships
# libreoffice-core alone: soffice is on the PATH and cannot load a .docx, so
# the suite found a binary, got "source file could not be loaded", and
# reported "Writer produced no PDF" as if the export were broken. CI installs
# writer (.github/workflows), this script did not, so the same tree was green
# there and red here.
MANQUE=""
command -v pdftotext >/dev/null 2>&1 || MANQUE="$MANQUE poppler-utils mupdf-tools tesseract-ocr tesseract-ocr-fra"
[ -x /usr/lib/libreoffice/program/swriter ] || MANQUE="$MANQUE libreoffice-writer"
if [ -n "$MANQUE" ]; then
  # update sans condition : les listes de l'image sont plus vieilles que les
  # paquets qu'elles pointent, et apt rend alors un 404 sur une version
  # retiree du miroir. Une installation avait echoue exactement ainsi.
  apt-get update -qq
  apt-get install -y -qq $MANQUE
fi

echo "--> Apache Tika"
# Troisieme moteur, en Java, celui qui avait attrape un ordre de lecture faux
# que les deux autres masquaient en reordonnant le texte par position.
TIKA_JAR_PATH="$HOME/tika-app.jar"
if [ ! -s "$TIKA_JAR_PATH" ]; then
  curl -sSL --max-time 300 -o "$TIKA_JAR_PATH" \
    https://repo1.maven.org/maven2/org/apache/tika/tika-app/2.9.2/tika-app-2.9.2.jar
fi
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  # Sans cette variable le test signale le moteur comme non execute au lieu de
  # le passer sous silence. Meme raison qu'en integration continue.
  echo "export TIKA_JAR=$TIKA_JAR_PATH" >> "$CLAUDE_ENV_FILE"
fi

echo "--> Chromium"
# L'image fournit deja un binaire. tests/lib/chromium.mjs le trouve seul, donc
# on ne telecharge que s'il n'y a vraiment rien.
if ! node -e "import('./tests/lib/chromium.mjs').then(m=>process.exit(m.cheminChromium()?0:1))"; then
  npx playwright install --with-deps chromium
fi
# Meme binaire pour playwright-cli, qui attend un autre numero de build et
# refuserait de demarrer sans qu'on le lui designe.
node scripts/playwright-cli-config.mjs

echo "--> build Next"
# pretest le refait de toute facon avant les tests. Le faire ici met le cache
# dans l'etat conserve du conteneur, et la premiere execution de npm test part
# d'un build tiede au lieu d'un build froid.
npm run build

echo "session prete : npm run lint et npm test peuvent tourner"
