"use client";

// THE PAGE THAT SAYS WHAT IS MISSING
//
// Wiring the accounts up takes six fields spread across two different
// dashboards. Getting one wrong raises no error: the sign-in button simply
// does not appear, or the link that arrives by mail sends you to localhost.
// Nothing shows, nothing explains itself, and you go looking in the code
// while the code is fine.
//
// This page runs the checks on behalf of whoever is installing it, from the
// live site, and names the exact field to correct. It is linked from no
// button: you reach it by typing /diagnostic. That is deliberate, it is an
// installation tool, not a feature.
//
// IT CAN LEAK NOTHING
//
// Everything it reads is already public: the project's address and the key
// called publishable travel in every request the browser makes. The key is
// never printed in full anyway. What protects the CVs is not the secrecy of
// those two values, it is the database's RLS rules, and this page checks
// precisely that they answer.
//
// IT IS WRITTEN IN ENGLISH, AND IT WAS NOT
//
// It was the one page on the website with French prose and no way out of it:
// no dictionary, no switch, 526 lines of it. The language of the interface is
// a product choice offered in both languages; this page offered one, and it
// was not the one the product opens in. Translated on 7 October 2026 with the
// rest of the English sweep.

import { useEffect, useState } from "react";
import { isCloudConfigured } from "../../lib/supabaseClient.js";

const CREAM = "#faf8f3";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";

// The production domain, written down and NOT taken from the page being read.
// Opening this diagnostic from a Vercel preview must not advise putting the
// preview's address in Site URL: that is where every sign-in link goes back
// to, including those of real people.
const SITE_URL = "https://thenuvi.com";

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ENV =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || "";

// Only the ends are shown: enough to spot a copy and paste mistake, not
// enough to be any use in a screenshot.
function masked(value) {
  if (!value) return "absent";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)} (${value.length} characters)`;
}

function Verdict({ state, title, detail, fix }) {
  // Three states only, and the third counts as much as the other two:
  // printing "TO FIX" in red on a point that CANNOT be fixed sends somebody
  // looking for a fault where there is none.
  //
  // A fourth arrived with the career pages: it works, and something is
  // missing. The job search now answers with no key at all, so it is never
  // "to fix"; the aggregators stay useful for employers with no ATS, so their
  // variables still have to be readable somewhere. Filing them under a quiet
  // green would erase them, filing them under red would send somebody looking
  // for a fault that does not exist.
  const color =
    state === "ok" ? "#2f7d4f" : state === "ko" ? "#b3261e"
    : state === "partiel" ? "#9a6b00" : MUTED;
  const mark =
    state === "ok" ? "OK"
    : state === "ko" ? "TO FIX"
    : state === "partiel" ? "INCOMPLETE"
    : state === "blocked" ? "WAITING"
    : "...";
  return (
    <li style={{
      listStyle: "none", padding: "16px 0",
      borderBottom: "1px solid rgba(0,0,0,.08)",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <span style={{
          color, fontWeight: 700, fontSize: 11, letterSpacing: 1,
          minWidth: 92, flexShrink: 0,
        }}>{mark}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
          {detail ? (
            <div style={{
              fontSize: 13, color: MUTED, marginTop: 4,
              wordBreak: "break-word",
            }}>{detail}</div>
          ) : null}
          {(state === "ko" || state === "partiel") && fix ? (
            <div style={{
              fontSize: 13, marginTop: 8, padding: "10px 12px",
              background: state === "ko" ? "rgba(179,38,30,.06)" : "rgba(154,107,0,.07)",
              borderRadius: 8,
              borderLeft: "3px solid " + (state === "ko" ? "#b3261e" : "#9a6b00"),
              lineHeight: 1.5,
            }}>{fix}</div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function Diagnostic() {
  const [origin, setOrigin] = useState("");
  const [reach, setReach] = useState({ state: "wait" });
  const [table, setTable] = useState({ state: "wait" });
  // The Google provider: the only point that was missing, and exactly the one
  // that is broken today.
  const [google, setGoogle] = useState({ state: "wait" });

  // WHAT DEGRADES WITHOUT SAYING ANYTHING
  //
  // The six points above are about the accounts, and a missing account ends
  // up showing: the button is not there. These four are worse, because they
  // never show. Each one lets the product answer, looking as though it works,
  // while returning less than it promises:
  //
  //   the native PDF falls back to the picture, and nobody knows;
  //   the job search returns an empty list, as though there were no jobs in
  //     London today;
  //   with no payment everything stays free, so nothing caps the Anthropic
  //     bill;
  //   the live assistant cannot hear in this particular browser.
  //
  // The last one can only be checked from here: it depends on the browser
  // reading this page, not on the server.
  const [pdf, setPdf] = useState({ state: "wait" });
  const [jobs, setJobs] = useState({ state: "wait" });
  const [payment, setPayment] = useState({ state: "wait" });
  const [live, setLive] = useState({ state: "wait" });

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    let alive = true;

    // The route's GET says whether the function's Chromium starts. Without it
    // the export falls back to the picture backed by a text layer, which a
    // part of the ATSs still read but which is no longer the promised file.
    fetch("/api/pdf")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j && j.ok) {
          setPdf({ state: "ok", detail: `Chromium ${j.chromium || "?"}, ${j.ms || "?"} ms` });
        } else {
          setPdf({
            state: "ko",
            detail: (j && j.erreur) || "the route returns no PDF",
            fix: "Every download falls back to the picture of the CV, with "
               + "nothing saying so. Look at the /api/pdf function's logs on "
               + "Vercel: @sparticuz/chromium is not starting.",
          });
        }
      })
      .catch((e) => {
        if (alive) setPdf({ state: "ko", detail: String(e).slice(0, 120),
          fix: "The route does not answer at all. Every export goes through the picture." });
      });

    // `only=sources` skips reading the boards: this page asks which sources
    // exist, not for jobs, and a full search takes twelve seconds.
    fetch("/api/jobs/search?only=sources&country=gb")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const sources = (j && j.sources) || [];
        // CAREER PAGES NEED NO KEY, SO THIS CHECK CHANGED MEANING
        //
        // The search can no longer be "not configured": lib/boards.js reads
        // companies' career pages with no key, and it is the product's best
        // source. What this check still has to say is what is MISSING: the
        // aggregators cover employers with no ATS, and their keys stay
        // useful. Name them when they are absent, without turning their
        // absence into a fault.
        const aggregators = sources.filter((x) => x !== "career pages");

        // WHICH VARIABLES THE SERVER SEES, NAME BY NAME
        //
        // On 6 October 2026 a valid Adzuna key was in Vercel and the search
        // still answered "career pages" alone. Three causes read the same
        // way: the variable absent (saved after the deployment, or ticked for
        // Preview and not Production), the name misspelt, or the value wrong.
        // Naming them one by one separates them at a glance. Never a value,
        // only a boolean.
        const keyFlags = (j && j.keys) || {};
        const seen = Object.keys(keyFlags).filter((k) => keyFlags[k]);
        const missing = Object.keys(keyFlags).filter((k) => !keyFlags[k]);
        const keyReport = Object.keys(keyFlags).length
          ? "The server sees: " + (seen.join(", ") || "none")
            + ". It does not see: " + (missing.join(", ") || "none") + ". "
          : "";

        if (j && j.configured) {
          setJobs({
            state: aggregators.length ? "ok" : "partiel",
            detail: `active sources: ${sources.join(", ") || "none named"}`,
            fix: aggregators.length ? "" :
              "The career pages answer, and only them. The aggregators cover "
              + "employers with no ATS: Adzuna is free "
              + "(developer.adzuna.com), then Vercel > Environment Variables > "
              + "ADZUNA_APP_ID and ADZUNA_APP_KEY. For the United Kingdom, "
              + "REED_API_KEY as well.\n\n"
              + keyReport
              + "A variable the server does not see was not delivered to this "
              + "function: Vercel freezes the variables at build time, so "
              + "saving them is not enough, you have to redeploy AFTER. Check "
              + "too that they are ticked for Production, and that the name is "
              + "exact. A variable that is seen but whose value is wrong shows "
              + "up differently: the source is named above and a warning gives "
              + "its HTTP code.",
          });
        } else {
          setJobs({
            state: "ko",
            detail: "no job source configured",
            fix: "The search returns an empty list, which reads as \"no jobs "
               + "today\" and not as a fault. Adzuna is free: "
               + "developer.adzuna.com, then Vercel > Environment "
               + "Variables > ADZUNA_APP_ID and ADZUNA_APP_KEY, and redeploy. "
               + "For the United Kingdom, REED_API_KEY as well.",
          });
        }
      })
      .catch(() => { if (alive) setJobs({ state: "ko", detail: "the route does not answer" }); });

    fetch("/api/billing")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j && j.configured) setPayment({ state: "ok", detail: "Stripe answers, the plans can be sold" });
        else {
          setPayment({
            state: "ko",
            detail: "everything is free and accountless",
            fix: "Nobody can pay, and nothing caps the Anthropic bill. The six "
               + "values are in docs/facturation.md. "
               + "SUPABASE_SERVICE_ROLE_KEY must NEVER carry the NEXT_PUBLIC_ "
               + "prefix: it ignores the security rules.",
          });
        }
      })
      .catch(() => { if (alive) setPayment({ state: "ko", detail: "the route does not answer" }); });

    // This one is about the browser reading this page.
    const hasVoice = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasTabCapture = Boolean(navigator.mediaDevices
      && typeof navigator.mediaDevices.getDisplayMedia === "function");
    if (hasVoice && hasTabCapture) {
      setLive({ state: "ok", detail: "transcription and tab capture available here" });
    } else {
      setLive({
        state: "ko",
        detail: [!hasVoice ? "no transcription" : null,
          !hasTabCapture ? "no tab capture" : null].filter(Boolean).join(", "),
        fix: "Try from Chrome or Edge on a computer. On a phone tab capture "
           + "does not exist, and the assistant then cannot tell the recruiter "
           + "from the person.",
      });
    }

    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!URL_ENV || !KEY_ENV) {
      const blocked = { state: "blocked", detail: "waiting on points 1 and 2" };
      setReach(blocked);
      setTable(blocked);
      setGoogle(blocked);
      return;
    }
    let alive = true;

    // 1. Does the project answer, and is the key accepted?
    fetch(`${URL_ENV}/auth/v1/settings`, { headers: { apikey: KEY_ENV } })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 401 || r.status === 403) {
          setReach({
            state: "ko",
            detail: `the project answers but refuses the key (HTTP ${r.status})`,
            fix: "The key does not belong to this project. Take it again from "
               + "Supabase, Project Settings > API keys, publishable / anon column.",
          });
          return;
        }
        if (!r.ok) {
          setReach({
            state: "ko",
            detail: `the project answered HTTP ${r.status}`,
            fix: "A free project pauses itself after a period with no use. Open "
               + "the Supabase dashboard: if it offers Restore project, click it.",
          });
          return;
        }
        setReach({ state: "ok", detail: "the project answers and accepts the key" });

        // THE ANSWER ALREADY HELD WHAT WE WERE LOOKING FOR
        //
        // This request only served to find out whether the project answers,
        // and its body went in the bin. But /auth/v1/settings says exactly
        // which providers are active, and that was the one point this page did
        // not check, although it is precisely the one that stops people
        // signing in.
        //
        // Carefully: we only assert "absent" if the answer is readable and
        // plainly says no. An unexpected shape gives "not verifiable", not
        // "broken". A wrong diagnosis sends somebody looking for the fault in
        // the wrong place, which costs more than no diagnosis at all.
        let settings = null;
        try { settings = await r.json(); } catch { /* unreadable body */ }
        const ext = settings && settings.external;
        if (!ext || typeof ext !== "object") {
          setGoogle({
            state: "wait",
            detail: "the project did not declare its providers",
            fix: "Check by hand: Supabase > Authentication > Sign In / Providers.",
          });
        } else if (ext.google) {
          setGoogle({
            state: "ok",
            detail: "Google is active on the project",
            fix: "",
          });
        } else {
          setGoogle({
            state: "ko",
            detail: "Google is not active on this project",
            fix: "Supabase > Authentication > Sign In / Providers > Google: "
               + "turn it on, then paste the Client ID and the Client Secret "
               + "taken from the Google Cloud Console. Without that, the "
               + "sign-in button returns to the site having created no account.",
          });
        }
      })
      .catch(() => alive && setReach({
        state: "ko",
        detail: "no answer from the project",
        fix: "Either the address is wrong, or the project is paused. Open the "
           + "Supabase dashboard and check it is not showing Restore project.",
      }));

    // 2. Does the table answer, and are the RLS rules really in place?
    //
    // Signed out, a protected table has to return an EMPTY list, not an error
    // and above all not rows. Rows here would mean anybody can read
    // everybody's CV: it is the only result on this page that is an emergency.
    fetch(`${URL_ENV}/rest/v1/user_state?select=user_id&limit=1`, {
      headers: { apikey: KEY_ENV },
    })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 404) {
          setTable({
            state: "ko",
            detail: "the user_state table does not exist",
            fix: "Supabase > SQL Editor: run the creation script again "
               + "(see docs/mise-en-service.md).",
          });
          return;
        }
        if (!r.ok) {
          setTable({ state: "ko", detail: `the table answered HTTP ${r.status}` });
          return;
        }
        const rows = await r.json().catch(() => null);
        if (Array.isArray(rows) && rows.length > 0) {
          setTable({
            state: "ko",
            detail: "DANGER: the table returns rows to a visitor who is not signed in",
            fix: "The RLS rules are off. As it stands, anybody can read "
               + "everybody's CV. Supabase > SQL Editor: "
               + "alter table user_state enable row level security;",
          });
          return;
        }
        setTable({ state: "ok", detail: "the table answers, and gives nothing without an account" });
      })
      .catch(() => alive && setTable({ state: "ko", detail: "table unreachable" }));

    return () => { alive = false; };
  }, []);

  const configured = isCloudConfigured();

  return (
    <main style={{
      minHeight: "100vh", background: CREAM, color: INK,
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "48px 20px 80px",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontSize: 30, fontWeight: 600, margin: "0 0 8px",
        }}>Setup</h1>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
          This page checks, from this site, what the accounts need in order to
          work. Everything has to read OK.
        </p>
        <p style={{ color: MUTED, fontSize: 13, margin: "0 0 28px" }}>
          Page read from <strong style={{ color: INK }}>{origin || "..."}</strong>
        </p>

        <ul style={{ margin: 0, padding: 0 }}>
          <Verdict
            state={URL_ENV ? "ok" : "ko"}
            title="1. The project's address is in the build"
            detail={URL_ENV || "NEXT_PUBLIC_SUPABASE_URL absent"}
            fix={"Vercel > Settings > Environment Variables: add "
              + "NEXT_PUBLIC_SUPABASE_URL, ticked for Production, Preview and "
              + "Development. Then Deployments > Redeploy: these values are "
              + "written into the code at build time, adding them is not enough."}
          />
          <Verdict
            state={KEY_ENV ? "ok" : "ko"}
            title="2. The public key is in the build"
            detail={masked(KEY_ENV)}
            fix={"Same place: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or "
              + "NEXT_PUBLIC_SUPABASE_ANON_KEY, both names are accepted). "
              + "Never the service_role key: it ignores the security rules."}
          />
          <Verdict
            state={reach.state === "wait" ? "wait" : reach.state}
            title="3. The Supabase project answers"
            detail={reach.detail}
            fix={reach.fix}
          />
          <Verdict
            state={table.state === "wait" ? "wait" : table.state}
            title="4. The table is created and protected"
            detail={table.detail}
            fix={table.fix}
          />
          {/* The provider, before the consequence: it is the one that breaks
              signing in when everything else is green. */}
          <Verdict
            state={google.state === "wait" ? "wait" : google.state}
            title="5. Google is wired to the project"
            detail={google.detail}
            fix={google.fix}
          />
          <Verdict
            state={configured ? "ok" : "ko"}
            title="6. The application offers accounts"
            detail={configured
              ? "the sign-in button shows up in Settings"
              : "the application works, but with no accounts"}
            fix="A direct consequence of points 1 and 2: fix those, redeploy, come back here."
          />
        </ul>

        {/* WHAT DEGRADES WITHOUT SAYING ANYTHING
            The six points above end up showing: a missing account is a
            missing button. These four never show. The product answers, it
            looks as though it works, and it returns less than it promises. */}
        <h2 style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontSize: 22, fontWeight: 600, margin: "40px 0 6px",
        }}>What degrades without saying anything</h2>
        <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 12px", lineHeight: 1.6 }}>
          None of what follows raises an error. The product answers, it looks
          as though it works, and it returns less than it promises. The last
          point depends on the browser reading this page.
        </p>

        <ul style={{ margin: 0, padding: 0 }}>
          <Verdict
            state={pdf.state}
            title="7. The downloaded PDF is real text"
            detail={pdf.detail}
            fix={pdf.fix}
          />
          <Verdict
            state={jobs.state}
            title="8. The job search has a source"
            detail={jobs.detail}
            fix={jobs.fix}
          />
          <Verdict
            state={payment.state}
            title="9. Somebody can pay"
            detail={payment.detail}
            fix={payment.fix}
          />
          <Verdict
            state={live.state}
            title="10. The live assistant can hear, here"
            detail={live.detail}
            fix={live.fix}
          />
        </ul>

        {/* The one point no code can check, and therefore the most forgotten. */}
        <div style={{
          marginTop: 32, padding: "18px 20px", borderRadius: 12,
          background: "rgba(0,0,0,.035)", fontSize: 13, lineHeight: 1.65,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            11. To check by hand: the return addresses
          </div>
          <p style={{ margin: "0 0 10px", color: MUTED }}>
            No test can read this setting from here. If it is wrong, the
            sign-in link that arrives by mail points at <code>localhost</code>
            {" "}and never completes. Supabase &gt; Authentication &gt; URL
            Configuration:
          </p>
          <div style={{
            fontFamily: "ui-monospace, monospace", fontSize: 12,
            background: "rgba(0,0,0,.05)", padding: "10px 12px", borderRadius: 8,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {`Site URL       ${SITE_URL}
Redirect URLs  https://thenuvi.com/**
               https://www.thenuvi.com/**
               https://*.vercel.app/**`}
          </div>
        </div>
      </div>
    </main>
  );
}
