export const KATEX_WOFF2_FONTS = [
  { file: "KaTeX_AMS-Regular.woff2", family: "KaTeX_AMS", weight: "400", style: "normal" },
  { file: "KaTeX_Caligraphic-Bold.woff2", family: "KaTeX_Caligraphic", weight: "700", style: "normal" },
  { file: "KaTeX_Caligraphic-Regular.woff2", family: "KaTeX_Caligraphic", weight: "400", style: "normal" },
  { file: "KaTeX_Fraktur-Bold.woff2", family: "KaTeX_Fraktur", weight: "700", style: "normal" },
  { file: "KaTeX_Fraktur-Regular.woff2", family: "KaTeX_Fraktur", weight: "400", style: "normal" },
  { file: "KaTeX_Main-Bold.woff2", family: "KaTeX_Main", weight: "700", style: "normal" },
  { file: "KaTeX_Main-BoldItalic.woff2", family: "KaTeX_Main", weight: "700", style: "italic" },
  { file: "KaTeX_Main-Italic.woff2", family: "KaTeX_Main", weight: "400", style: "italic" },
  { file: "KaTeX_Main-Regular.woff2", family: "KaTeX_Main", weight: "400", style: "normal" },
  { file: "KaTeX_Math-BoldItalic.woff2", family: "KaTeX_Math", weight: "700", style: "italic" },
  { file: "KaTeX_Math-Italic.woff2", family: "KaTeX_Math", weight: "400", style: "italic" },
  { file: "KaTeX_SansSerif-Bold.woff2", family: "KaTeX_SansSerif", weight: "700", style: "normal" },
  { file: "KaTeX_SansSerif-Italic.woff2", family: "KaTeX_SansSerif", weight: "400", style: "italic" },
  { file: "KaTeX_SansSerif-Regular.woff2", family: "KaTeX_SansSerif", weight: "400", style: "normal" },
  { file: "KaTeX_Script-Regular.woff2", family: "KaTeX_Script", weight: "400", style: "normal" },
  { file: "KaTeX_Size1-Regular.woff2", family: "KaTeX_Size1", weight: "400", style: "normal" },
  { file: "KaTeX_Size2-Regular.woff2", family: "KaTeX_Size2", weight: "400", style: "normal" },
  { file: "KaTeX_Size3-Regular.woff2", family: "KaTeX_Size3", weight: "400", style: "normal" },
  { file: "KaTeX_Size4-Regular.woff2", family: "KaTeX_Size4", weight: "400", style: "normal" },
  { file: "KaTeX_Typewriter-Regular.woff2", family: "KaTeX_Typewriter", weight: "400", style: "normal" },
];

export function encodeFontBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export async function installKatexFonts({ getFontData, FontFaceType, fontSet }) {
  const fonts = await getFontData();
  if (!Array.isArray(fonts) || fonts.length !== KATEX_WOFF2_FONTS.length) {
    throw new Error("KaTeX font bundle is incomplete");
  }

  const faces = await Promise.all(fonts.map(async ({ descriptor, base64 }) => {
    const bytes = decodeBase64(base64);
    const face = new FontFaceType(descriptor.family, bytes, {
      weight: descriptor.weight,
      style: descriptor.style,
    });
    await face.load();
    return face;
  }));

  for (const face of faces) fontSet.add(face);
  return faces.length;
}
