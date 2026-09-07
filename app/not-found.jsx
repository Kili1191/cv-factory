// A page that does not exist, in the world of the front page: studio grey,
// black light type, the chamfered button back to the start. A jury clicks
// a dead link on purpose; a visitor does it by accident. Both should land
// somewhere that still looks like Nuvi.
export default function NotFound() {
  return (
    <main style={{
      minHeight: "100dvh", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: "clamp(24px, 5vw, 64px)", background: "#f5f4f0", color: "#000",
      fontFamily: '"Helvetica Neue", Inter, Helvetica, Arial, sans-serif', fontWeight: 300,
    }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5f5f5f" }}>404</p>
      <h1 style={{ margin: "12px 0 0", fontWeight: 300, fontSize: "clamp(2rem, 6vw, 4.5rem)", lineHeight: 1.02, letterSpacing: "-0.03em", maxWidth: "18ch" }}>
        This page is not here. Your CV can be.
      </h1>
      <a href="/" style={{
        display: "inline-flex", alignItems: "center", gap: 12, width: 260, height: 48, marginTop: 32, padding: "0 24px",
        color: "#000", textDecoration: "none", fontSize: 14, letterSpacing: "0.025em",
        clipPath: "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
        border: "1.5px solid #000", boxSizing: "border-box",
      }}>Back to the front page <span aria-hidden="true">&rarr;</span></a>
    </main>
  );
}
