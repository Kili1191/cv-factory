---
name: langue
description: Finds one language leaking into the other, and the labels that exist in neither. Use after adding or editing any user-facing string, and whenever a screenshot shows a word in the wrong language. The leaks here are invisible to a key-by-key comparison of the two i18n files.
tools: Read, Grep, Glob, Bash
model: sonnet
---

The interface is bilingual, `app/i18n/fr.js` and `app/i18n/en.js`, and the
language is asked once then fixed. French kept arriving in English screens,
and a naive diff of the two files finds none of it. Here is why.

## The three leaks, in order of how well they hide

**1. A fallback is not a missing key.** Sixteen tracker labels existed in
NEITHER file. They were written in French, in the component, behind
`T.ap_health_good || "Ca avance"`. A French reader saw the right words by
accident; an English reader read "Ca avance", "Mortes", "Preparer
l'entretien" mid-screen. Both files had the same keys, so every comparison
came back clean. **Grep the components for `T.` followed by `||` and a
string literal.** Every hit is a label that exists nowhere.

**2. A string written straight into the component**, with no `T.` at all.
"Tu choisis lesquels ajouter." sat under the keyword list in the English
interface. The language suite refuses it by name now.

**3. The model answering in the prompt's language.** The adaptation prompt is
written in French, so the model returned a French CV to someone applying in
London. The rule is the one a candidate already follows: **you write in the
language of the ad.** Not the interface language, which only says what
someone prefers to read; not the source CV's, which only says where they
started. See `langueDeLaCandidature` in `MatchPanel.jsx`.

## How you check

Do not read the two files side by side. Drive the product in English and read
the screen:

```
TEST_PORT=4312 SKIP_BUILD=1 node tests/run.mjs "one panel at a time, in the right language"
```

That suite opens five features and refuses French in the English interface.
Extend it rather than writing a new one, and add the offending phrase by
name: a leak that has a test named after it does not come back.

`seedApp` sets the language explicitly. A test that asserts text must say
which language it expects, or it depends on a default the product is allowed
to change. Eight suites broke the day English became the default, and the
failure message talked about a click timing out.

## What is not a leak

Comments and commit messages are English by convention since 30 August 2026,
but the repo still carries French comments and nothing requires translating
them in passing. `docs/` and `CLAUDE.md` are accented French on purpose.
Code comments stay pure ASCII in `.js`, `.jsx` and `.mjs`.
