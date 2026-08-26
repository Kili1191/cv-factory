"use client";

// LE SUIVI QUI SE MET A JOUR TOUT SEUL
//
// Le probleme que ce panneau resout : trois semaines apres avoir postule, le
// tableau de suivi ment. On lit les reponses sur son telephone, entre deux
// choses, et on ne revient jamais changer la ligne. Les candidatures marquees
// "en attente" contiennent alors des refus encaisses depuis longtemps et,
// bien pire, des invitations restees sans reponse.
//
// LA REGLE : PROPOSER, JAMAIS DECIDER
//
// Aucun etat ne change sans un geste de l'utilisateur. Un classement
// automatique se trompe - rarement, mais il se trompe - et l'erreur qui
// compte est celle qui enterre une candidature vivante : personne ne relance
// une piste que l'outil a marquee morte. Chaque proposition affiche donc le
// message qui l'a produite, avec un lien pour aller le lire dans Gmail, et
// attend un oui.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Ink, InkMuted, Paper, Hairline, Coral, CoralSoft, Green, GreenSoft,
  Purple, PurpleSoft, Sans, Serif, RadiusSm, RadiusMd, RadiusPill, ShadowSm, B,
} from "./tokens";
import { scanInbox } from "../../lib/gmailScan";
import { fetchCandidateMessages, gmailLink, GmailError } from "../../lib/gmailClient";

const TXT = {
  fr: {
    eyebrow: "Reponses des recruteurs",
    idle: "Nuvi peut lire les reponses a tes candidatures et remettre le suivi a jour.",
    privacy: "Nuvi ne cherche que les entreprises de ton suivi, sur les quatre derniers mois, et lit l'expediteur, l'objet et la date. Jamais le contenu complet, et rien ne passe par nos serveurs.",
    connect: "Connecter Gmail",
    scan: "Chercher les reponses",
    scanning: "Lecture en cours...",
    reconnect: "Reconnecter Gmail",
    expired: "L'autorisation Google a expire. Un clic et c'est reparti.",
    nothing: "Aucune reponse nouvelle. Le suivi est deja a jour.",
    noApps: "Ajoute une candidature d'abord : Nuvi ne cherche que les entreprises que tu suis.",
    found: (n) => n === 1 ? "1 reponse trouvee" : `${n} reponses trouvees`,
    apply: "Mettre a jour",
    ignore: "Ignorer",
    open: "Lire dans Gmail",
    noChange: "Rien a changer",
    failed: "Gmail n'a pas repondu. Reessaie dans un instant.",
    outcome: {
      rejected: "Refus",
      interview: "Entretien propose",
      offer: "Offre",
      ack: "Candidature bien recue",
    },
    to: (s) => ({
      rejected: "passer en refusee",
      interview: "passer en entretien",
      phone: "passer en entretien telephonique",
      offer: "passer en offre",
    }[s] || s),
    doubt: "A verifier",
  },
  en: {
    eyebrow: "Recruiter replies",
    idle: "Nuvi can read the replies to your applications and bring the tracker up to date.",
    privacy: "Nuvi only searches the companies in your tracker, over the last four months, and reads the sender, subject and date. Never the full content, and nothing goes through our servers.",
    connect: "Connect Gmail",
    scan: "Find the replies",
    scanning: "Reading...",
    reconnect: "Reconnect Gmail",
    expired: "The Google authorisation expired. One click and it is back.",
    nothing: "No new replies. The tracker is already up to date.",
    noApps: "Add an application first: Nuvi only searches companies you track.",
    found: (n) => n === 1 ? "1 reply found" : `${n} replies found`,
    apply: "Update",
    ignore: "Dismiss",
    open: "Read in Gmail",
    noChange: "Nothing to change",
    failed: "Gmail did not answer. Try again in a moment.",
    outcome: {
      rejected: "Rejection",
      interview: "Interview offered",
      offer: "Offer",
      ack: "Application received",
    },
    to: (s) => ({
      rejected: "move to rejected",
      interview: "move to interview",
      phone: "move to phone screen",
      offer: "move to offer",
    }[s] || s),
    doubt: "Worth checking",
  },
};

function tone(outcome) {
  if (outcome === "offer") return { fg: Green, bg: GreenSoft };
  if (outcome === "interview") return { fg: Purple, bg: PurpleSoft };
  if (outcome === "rejected") return { fg: Coral, bg: CoralSoft };
  return { fg: InkMuted, bg: Hairline };
}

export default function GmailScanPanel({
  locale = "en",
  applications = [],
  onApply = () => {},
  connectGmail,
  getGmailToken,
  // Vrai au retour de l'autorisation Google. On ne fait pas cliquer quelqu'un
  // sur "chercher les reponses" trois secondes apres qu'il vient d'autoriser
  // Nuvi a chercher les reponses.
  autoScan = false,
}) {
  const t = TXT[locale] || TXT.fr;
  const [phase, setPhase] = useState("idle"); // idle | scanning | done | expired | failed
  const [results, setResults] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());

  const scan = useCallback(async () => {
    if (!applications.length) return;
    setPhase("scanning");
    try {
      const token = await getGmailToken();
      if (!token) { setPhase("expired"); return; }
      const messages = await fetchCandidateMessages(token, applications);
      setResults(scanInbox(messages, applications));
      setPhase("done");
    } catch (err) {
      // Une autorisation perdue n'est pas une panne : elle se repare d'un
      // clic, et l'afficher comme une erreur ferait croire a un probleme.
      if (err instanceof GmailError && (err.status === 401 || err.status === 403)) {
        setPhase("expired");
      } else {
        setPhase("failed");
      }
    }
  }, [applications, getGmailToken]);

  // Une seule fois : sans ce garde, un rendu declenche par le resultat du
  // balayage relancerait le balayage.
  const started = useRef(false);
  useEffect(() => {
    if (!autoScan || started.current || !applications.length) return;
    started.current = true;
    scan();
  }, [autoScan, applications.length, scan]);

  const live = results.filter(r => !dismissed.has(r.message.id));
  const changes = live.filter(r => r.proposedStatus);

  const label = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: Coral, fontFamily: Sans };

  const primary = (extra) => ({
    ...B({
      padding: "11px 18px", borderRadius: RadiusPill, border: "none",
      background: Coral, color: "#fff", fontFamily: Sans,
      fontSize: 13, fontWeight: 600, boxShadow: ShadowSm, ...extra,
    }),
  });

  return (
    <div style={{
      background: Paper, border: "0.5px solid " + Hairline,
      borderRadius: RadiusMd, padding: "14px 16px 16px",
      marginBottom: 16, fontFamily: Sans,
    }}>
      <div style={{ ...label, marginBottom: 8 }}>{t.eyebrow}</div>

      {phase === "idle" && (
        <>
          <p style={{ fontSize: 13, color: Ink, lineHeight: 1.5, margin: "0 0 8px" }}>
            {t.idle}
          </p>
          <p style={{ fontSize: 11.5, color: InkMuted, lineHeight: 1.5, margin: "0 0 12px" }}>
            {t.privacy}
          </p>
          {applications.length === 0 ? (
            <div style={{ fontSize: 12, color: InkMuted }}>{t.noApps}</div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={scan} style={primary()}>{t.scan}</button>
              <button onClick={connectGmail} style={{
                ...B({
                  padding: "11px 16px", borderRadius: RadiusPill,
                  border: "0.5px solid " + Hairline, background: "transparent",
                  color: InkMuted, fontFamily: Sans, fontSize: 13,
                }),
              }}>{t.connect}</button>
            </div>
          )}
        </>
      )}

      {phase === "scanning" && (
        <div style={{ fontSize: 13, color: InkMuted, padding: "6px 0" }}>{t.scanning}</div>
      )}

      {phase === "expired" && (
        <>
          <p style={{ fontSize: 13, color: Ink, lineHeight: 1.5, margin: "0 0 12px" }}>
            {t.expired}
          </p>
          <button onClick={connectGmail} style={primary()}>{t.reconnect}</button>
        </>
      )}

      {phase === "failed" && (
        <>
          <p style={{ fontSize: 13, color: Ink, lineHeight: 1.5, margin: "0 0 12px" }}>
            {t.failed}
          </p>
          <button onClick={scan} style={primary()}>{t.scan}</button>
        </>
      )}

      {phase === "done" && (
        <>
          <div style={{
            fontSize: 13, color: live.length ? Ink : InkMuted,
            lineHeight: 1.5, margin: "0 0 12px",
          }}>
            {live.length ? t.found(live.length) : t.nothing}
          </div>

          {live.map((r) => {
            const c = tone(r.outcome);
            return (
              <div key={r.message.id} style={{
                border: "0.5px solid " + Hairline, borderRadius: RadiusSm,
                padding: "12px 13px", marginBottom: 8, background: "var(--nuvi-cream)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 6, flexWrap: "wrap",
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", padding: "3px 9px",
                    borderRadius: RadiusPill, color: c.fg, background: c.bg,
                  }}>{t.outcome[r.outcome] || r.outcome}</span>
                  <span style={{
                    fontFamily: Serif, fontSize: 14, color: Ink, minWidth: 0,
                  }}>{r.company}</span>
                  {r.confidence !== "haute" && (
                    <span style={{ fontSize: 10.5, color: InkMuted }}>· {t.doubt}</span>
                  )}
                </div>

                {/* Le message qui a produit la proposition. Sans lui,
                    l'utilisateur devrait croire l'outil sur parole. */}
                <div style={{
                  fontSize: 12, color: Ink, lineHeight: 1.45, marginBottom: 3,
                }}>{r.message.subject}</div>
                <div style={{
                  fontSize: 11, color: InkMuted, lineHeight: 1.45, marginBottom: 10,
                }}>{r.message.snippet}</div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {r.proposedStatus ? (
                    <button
                      onClick={() => {
                        onApply(r.applicationId, r.proposedStatus, r);
                        setDismissed(prev => new Set(prev).add(r.message.id));
                      }}
                      style={{
                        ...B({
                          padding: "8px 14px", borderRadius: RadiusPill, border: "none",
                          background: c.fg, color: "#fff",
                          fontFamily: Sans, fontSize: 12, fontWeight: 600,
                        }),
                      }}>
                      {t.apply} · {t.to(r.proposedStatus)}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11.5, color: InkMuted }}>{t.noChange}</span>
                  )}
                  {gmailLink(r.message) && (
                    <a href={gmailLink(r.message)} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11.5, color: Purple, textDecoration: "none" }}>
                      {t.open}
                    </a>
                  )}
                  <button
                    onClick={() => setDismissed(prev => new Set(prev).add(r.message.id))}
                    style={{
                      ...B({
                        padding: "8px 12px", borderRadius: RadiusPill,
                        border: "0.5px solid " + Hairline, background: "transparent",
                        color: InkMuted, fontFamily: Sans, fontSize: 11.5,
                      }),
                    }}>{t.ignore}</button>
                </div>
              </div>
            );
          })}

          <button onClick={scan} style={{
            ...B({
              padding: "9px 15px", borderRadius: RadiusPill,
              border: "0.5px solid " + Hairline, background: "transparent",
              color: InkMuted, fontFamily: Sans, fontSize: 12, marginTop: 4,
            }),
          }}>{t.scan}</button>
          {changes.length === 0 && live.length > 0 && (
            <div style={{ fontSize: 11, color: InkMuted, marginTop: 8 }}>
              {t.nothing}
            </div>
          )}
        </>
      )}
    </div>
  );
}
