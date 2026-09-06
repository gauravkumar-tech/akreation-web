// Loads the real brand typefaces into jsPDF (its built-ins cannot render
// Cormorant Garamond / Inter, which is why PDFs looked off next to the screen).

const FONTS = [
  { file: "CormorantGaramond-Medium.ttf", family: "cormorant", style: "normal" },
  { file: "CormorantGaramond-SemiBold.ttf", family: "cormorant", style: "bold" },
  { file: "CormorantGaramond-MediumItalic.ttf", family: "cormorant", style: "italic" },
  { file: "Inter-Regular.ttf", family: "inter", style: "normal" },
  { file: "Inter-SemiBold.ttf", family: "inter", style: "bold" },
];

const cache = new Map();

function b64(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error("font fetch failed: " + url);
          return r.arrayBuffer();
        })
        .then((buf) => {
          const bytes = new Uint8Array(buf);
          let bin = "";
          const CH = 0x8000;
          for (let i = 0; i < bytes.length; i += CH) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
          }
          return btoa(bin);
        })
    );
  }
  return cache.get(url);
}

const readyDocs = new WeakSet();

export async function ensurePdfFonts(doc, base) {
  if (readyDocs.has(doc)) return;
  await Promise.all(
    FONTS.map(async (f) => {
      const data = await b64(`${base}fonts/${f.file}`);
      doc.addFileToVFS(f.file, data);
      doc.addFont(f.file, f.family, f.style);
    })
  );
  readyDocs.add(doc);
}
