// The slide-in menu: one state, one function, focus that goes where the
// eye goes. Escape only acts while the menu is open, so it never steals
// the key from anything else on the page.

const menu = document.getElementById("menu");
const openBtn = document.getElementById("menu-open");
const closeBtn = document.getElementById("menu-close");
const backdrop = document.getElementById("menu-backdrop");
const links = menu ? menu.querySelectorAll(".menu__link") : [];

let open = false;

function setMenu(next) {
  if (!menu || !openBtn || !closeBtn) return;
  open = !!next;
  menu.classList.toggle("is-open", open);
  openBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) closeBtn.focus({ preventScroll: true });
  else openBtn.focus({ preventScroll: true });
}

if (openBtn) openBtn.addEventListener("click", () => setMenu(true));
if (closeBtn) closeBtn.addEventListener("click", () => setMenu(false));
if (backdrop) backdrop.addEventListener("click", () => setMenu(false));
links.forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && open) setMenu(false);
});
