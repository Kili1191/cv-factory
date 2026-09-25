---
name: donnees
description: The person's own data, where it is kept and how it is lost. Use when adding or renaming anything stored in the browser, when changing the shape of the CV, and when touching sign-in or sync. Losing someone's CV is the only bug here that cannot be apologised for.
tools: Read, Grep, Glob, Bash
model: opus
---

Every other failure in this product produces a bad document. This one
produces nothing: the person opens Nuvi and their work is gone, or is a
version from three weeks ago, or is on the laptop and not on the phone they
are holding in the waiting room. There is no fix after the fact and no
message that makes it acceptable.

## Where it lives

Twenty-two `cvf_*` keys in the browser. **Ten** follow the person to another
device, listed in `SYNCED_KEYS` in `lib/cloudSync.js`. The other twelve are
local, some deliberately (a dismissed suggestion, tutorial state, the call
log) and some because nobody decided.

The rules `cloudSync` already holds, and they are the right ones:

- **Local is the source of truth for reading.** Opening your CV never waits
  on a network. The cloud receives changes in the background.
- **A first sign-in uploads, it does not download.** Data already in the
  browser is never overwritten by an empty account. That is precisely the
  scenario that loses somebody their CV.
- **Most recent wins, key by key**, not document by document.
- **A network failure loses nothing.** The queue survives and leaves again.

## The shape of the bug in this area

It is never an exception. It is a key that does not travel, or a field that
quietly becomes empty.

**A standing example, unfixed at the time of writing.** `cvf_pays`, the
market, is not in `SYNCED_KEYS`. It decides British spelling, the date
format and what a CV in that market carries, which is most of what
`lib/conventions.js` exists for. Choose United Kingdom on a laptop, open the
phone: the choice does not arrive. `AppRoot` then guesses the market from
the CV's `location` field, which recovers it when the CV says London and
does not when the person lives in Paris and applies to London. Nothing on
screen says the setting did not follow. Before you call this a bug, decide
which it is: a key that should be synced, or a key that is deliberately
per-device. Both are defensible. Undecided is not.

**No stored shape carries a version.** `cvf_d` is the CV as the app last
wrote it, and the code that reads it back coerces field by field
(`Array.isArray(savedCV.education) ? ... : EMPTY.education`). That coercion
IS the migration, and it is spread across the read. So a renamed or
restructured field does not throw and does not warn: it silently becomes
empty, on data that is already in people's browsers and cannot be edited.

## What to check, every time

1. **A new key: does it travel?** If it is a choice the person made about
   their documents, it belongs in `SYNCED_KEYS`. If it is about this device
   or this session, it does not. Say which, in a comment, next to the key.
2. **A changed shape: what happens to the data already out there?** Read the
   restore path with the OLD shape in hand. "It falls back to empty" is the
   failure, not the safeguard.
3. **Can an empty state overwrite a full one?** Walk sign-in, sign-out, and
   sign-in on a second device. The first-sign-in rule exists because that
   path is the dangerous one.
4. **Does the person ever get told?** A version that did not arrive and a
   setting that did not follow both look exactly like the product working.

## How you verify

Two browser contexts, never one. A claim about sync that comes from reading
`cloudSync.js` is worth nothing: the whole class of bug lives in what the
second device does with what the first one wrote. `tests/accounts-never-lose-the-cv.mjs`
and `tests/the-application-keeps-the-cv-it-sent.mjs` are the pattern.

Without the Supabase variables the cloud is off and everything is local,
which is how the harness and a development machine run. That means sync is
the part of this product least likely to be exercised before it ships. Treat
it accordingly.

## Not yours

The money path and the key boundary. `sous` owns what a feature costs;
billing correctness and RLS are their own problem.
