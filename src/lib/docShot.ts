// Pixel-exact PDF: renders the live preview node itself (real browser engine,
// real brand fonts, real Tailwind) into a single A4 page via SVG foreignObject.
// Browsers block *external* resources inside SVG images, so stylesheets and
// fonts are inlined as text / data-URIs (all same-origin).

import { jsPDF } from "jspdf";

let cssCache = null;

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(bin);
}

async function brandCss(base) {
  if (cssCache) return cssCache;
  const parts = [];
  document.querySelectorAll("style").forEach((s) => parts.push(s.textContent || ""));
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  for (const l of links) {
    try {
      parts.push(await (await fetch(l.href)).text());
    } catch (e) { /* offline — page styles still apply from <style> */ }
  }
  const faces = [
    ["cormorant-display", "normal", "CormorantGaramond-Medium.ttf", 500],
    ["cormorant-display", "bold", "CormorantGaramond-SemiBold.ttf", 600],
    ["cormorant-display", "italic", "CormorantGaramond-MediumItalic.ttf", 500],
    ["inter-body", "normal", "Inter-Regular.ttf", 400],
    ["inter-body", "bold", "Inter-SemiBold.ttf", 600],
  ];
  let fontCss = "";
  for (const [fam, style, file, weight] of faces) {
    try {
      const buf = await (await fetch(`${base}fonts/${file}`)).arrayBuffer();
      fontCss += `@font-face{font-family:'${fam}';font-style:${style};font-weight:${weight};src:url(data:font/ttf;base64,${bufToB64(buf)}) format('truetype');}`;
    } catch (e) { /* fall back to page fonts */ }
  }
  // The preview uses Tailwind `font-display` / `font-sans` — remap inside the shot
  fontCss += `.font-display{font-family:'cormorant-display',Georgia,serif !important;}body{font-family:'inter-body',system-ui,sans-serif !important;}`;
  cssCache = fontCss + parts.join("\n");
  return cssCache;
}

export async function downloadNodeAsPdf(el, base, filename) {
  const css = await brandCss(base);
  const w = Math.round(el.offsetWidth);
  const h = Math.round(el.scrollHeight);
  if (!w || !h) throw new Error("empty node");

  const NS = "http://www.w3.org/1999/xhtml";
  const wrapper = document.createElementNS(NS, "div");
  wrapper.setAttribute("xmlns", NS);
  wrapper.setAttribute("style", "background:#fffdf8;margin:0;padding:0;");
  const styleEl = document.createElementNS(NS, "style");
  styleEl.textContent = css;
  wrapper.appendChild(styleEl);
  const clone = el.cloneNode(true);
  clone.removeAttribute("id");
  // Neutralize screen-only effects for a clean capture
  clone.querySelectorAll("[data-reveal],[data-reveal-group]").forEach((n) => {
    n.removeAttribute("data-reveal");
    n.removeAttribute("data-reveal-group");
    n.classList.remove("is-visible");
  });
  wrapper.appendChild(clone);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(wrapper)}</foreignObject></svg>`;
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = svgUrl;
  });

  // Render at 3x, then fit to one A4 page
  const SCALE = 3;
  const canvas = document.createElement("canvas");
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL("image/png");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297;

  // Stationery page: plain ivory ground, document's own frame does the talking
  doc.setFillColor(255, 253, 248);
  doc.rect(0, 0, pageW, pageH, "F");

  // Capture seated with a true top margin, centered
  const TOP = 15, SIDE = 15, BOTTOM = 15;
  const availW = pageW - SIDE * 2;
  const availH = pageH - TOP - BOTTOM;
  const k = Math.min(availW / w, availH / h);
  const imgW = w * k, imgH = h * k;
  doc.addImage(png, "PNG", (pageW - imgW) / 2, TOP, imgW, imgH, undefined, "FAST");
  doc.save(filename);
}
