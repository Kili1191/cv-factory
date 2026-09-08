"use client";
// THE PLAN SHEET
//
// Opens when the AI route answers 402 (free fits used), or from Settings.
// Two prices, one button each, and Stripe's own page does the payment: no
// card field lives in Nuvi. A visitor is sent to sign in first, because
// the plan is tied to the account the fits are counted on.

import { useState } from "react";
import {
  Ink, InkMuted, Paper, Hairline, Purple, Magenta, PurpleSoft,
  Serif, Sans, RadiusMd, RadiusPill, B, PurpleText,
} from "./tokens";
import Sheet from "./Sheet";
import { PLANS } from "../../lib/plans.js";

export default function PlanSheet({ T, locale = "en", plan = null, cloudUser = null,
  onSignIn = () => {}, onCheckout = async () => {}, onClose = () => {} }) {
  const [etat, setEtat] = useState("idle"); // idle | opening | failed
  const restants = plan && plan.status === "free"
    ? Math.max(0, (plan.fits_free || 3) - (plan.fits_used || 0)) : null;

  const choisir = async (id) => {
    if (!cloudUser) { onSignIn(); return; }
    setEtat("opening");
    try {
      await onCheckout(id);
    } catch {
      setEtat("failed");
    }
  };

  const Carte = ({ id, titre, sous, bouton, accent }) => (
    <div style={{
      border:"1px solid " + (accent ? Purple : Hairline), borderRadius:RadiusMd,
      background: accent ? PurpleSoft : Paper, padding:"14px 16px", marginBottom:10,
    }}>
      <div style={{fontFamily:Serif, fontSize:22, fontWeight:500, color:Ink, letterSpacing:"-0.01em"}}>{titre}</div>
      <div style={{fontSize:12.5, color:InkMuted, margin:"2px 0 10px"}}>{sous}</div>
      <button data-nuvi={"plan-" + id} onClick={() => choisir(id)} disabled={etat === "opening"} style={{
        ...B({
          width:"100%", minHeight:44, borderRadius:RadiusPill, fontFamily:Sans, fontSize:13, fontWeight:600,
          background: accent ? `linear-gradient(135deg, ${Purple}, ${Magenta})` : Paper,
          color: accent ? "#fff" : Ink,
          border: accent ? "none" : "0.5px solid " + Hairline,
        }),
      }}>{bouton}</button>
    </div>
  );

  return (
    <Sheet eyebrow={T.pl_eyebrow} title={T.pl_title} onClose={onClose}>
      <div data-nuvi="plan-sheet" style={{fontFamily:Sans}}>
        <p style={{fontSize:13, color:InkMuted, lineHeight:1.55, margin:"0 0 14px"}}>{T.pl_sub}</p>
        {restants !== null && (
          <div style={{
            fontSize:12.5, fontWeight:600, color: restants ? PurpleText : Ink,
            background: Paper, border:"0.5px solid " + Hairline, borderRadius:RadiusMd,
            padding:"9px 12px", marginBottom:14,
          }}>{restants ? T.pl_free_left.replace("{n}", String(restants)) : T.pl_free_used}</div>
        )}
        {!cloudUser && (
          <div style={{fontSize:12.5, color:InkMuted, lineHeight:1.5, marginBottom:12}}>{T.pl_signin_first}</div>
        )}
        <Carte id="trimestre" accent
          titre={T.pl_quarter} sous={T.pl_quarter_s}
          bouton={cloudUser ? T.pl_take_quarter : T.pl_signin_btn}/>
        <Carte id="mensuel"
          titre={T.pl_month} sous={T.pl_month_s}
          bouton={cloudUser ? T.pl_take_month : T.pl_signin_btn}/>
        <div style={{fontSize:11.5, color:InkMuted, marginTop:4, minHeight:18}} aria-live="polite">
          {etat === "opening" ? T.pl_opening : etat === "failed" ? T.pl_failed : ""}
        </div>
        <div style={{fontSize:11, color:InkMuted, marginTop:6}}>
          {PLANS.mensuel.montant} {"€"} / {PLANS.mensuel.mois} {locale === "en" ? "month" : "mois"}, {PLANS.trimestre.montant} {"€"} / {PLANS.trimestre.mois} {locale === "en" ? "months" : "mois"}
        </div>
      </div>
    </Sheet>
  );
}
