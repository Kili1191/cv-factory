// THE CARD IS A WINDOW ONTO A REFRACTED DUPLICATE OF THE VIDEO
//
// Every frame, the current video frame is drawn into a canvas that is
// positioned so its pixels sit exactly where the real video's pixels sit
// behind the card. The card's overflow and radius clip it, and CSS applies
// the SVG refraction filter to the canvas. What shows through the card is
// therefore the same picture as behind it, bent at the rim.
//
// The duplicate is sized to the VIEWPORT, not to the card. The filter
// shifts each colour channel by a different amount, so the filtered
// element's own leading edges show hard channel-separation bands. At
// viewport size those bands fall outside the card and only clean
// refraction shows.
//
// The duplicate stays at 1x even on retina: the SVG filter's cost scales
// with pixel count, and what shows through is a soft refraction where 4x
// the filter work buys nothing.

const DUP_PIXEL_RATIO = 1;

const video = document.getElementById("bg-video");
const card = document.querySelector("[data-glass-card]");
const container = document.getElementById("dup-video-container");
const canvas = document.getElementById("dup-image");
const ctx = canvas ? canvas.getContext("2d") : null;

let lastW = 0;
let lastH = 0;

function frame() {
  requestAnimationFrame(frame);
  if (!video || !card || !container || !ctx) return;

  const rect = card.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  if (!video.videoWidth || !video.videoHeight) return;

  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  // Absolutely positioned inside the card, so a negative offset equal to
  // the card's own viewport position lands the duplicate on the viewport
  // origin, 1:1 with the real video behind.
  container.style.left = -rect.left + "px";
  container.style.top = -rect.top + "px";
  container.style.width = vw + "px";
  container.style.height = vh + "px";

  const w = Math.round(vw * DUP_PIXEL_RATIO);
  const h = Math.round(vh * DUP_PIXEL_RATIO);
  if (w !== lastW || h !== lastH) {
    canvas.width = w;
    canvas.height = h;
    lastW = w;
    lastH = h;
  }

  // Reproduce object-fit: cover so the duplicate frames the video exactly
  // like the element behind it.
  const cover = Math.max(vw / video.videoWidth, vh / video.videoHeight);
  const sw = vw / cover;
  const sh = vh / cover;
  const sx = (video.videoWidth - sw) / 2;
  const sy = (video.videoHeight - sh) / 2;

  try {
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  } catch (e) {
    // A frame may not be decodable yet; the next one will be.
  }
}

requestAnimationFrame(frame);
