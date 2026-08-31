// Ilustraciones para los registros de la cuenta de demostracion.
//
//   node scripts/make-demo-photos.mjs        -> store/demo-photos/*.jpg
//
// Por que dibujadas y no fotos: lo que sale en una ficha de tienda es material
// publico. Una foto de banco de imagenes arrastra licencia, y una de una persona
// real arrastra permiso. Esto es nuestro y no arrastra nada.
//
// Se generan a 16:9 porque el feed las pinta con `aspect-video` y `cover`: a
// cualquier otra proporcion el recorte se come el motivo.
//
// El estilo es plano a proposito — nadie las va a confundir con una foto, y una
// ilustracion limpia se lee mejor a tamano de tarjeta que un desenfoque que no
// se sabe que es.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const W = 1600;
const H = 900;
const OUT = path.join(import.meta.dirname, "..", "store", "demo-photos");

// Un trozo de tarta entre dos angulos, para las porciones del bowl.
function slice(cx, cy, r, from, to, fill) {
  const rad = (deg) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(from));
  const y1 = cy + r * Math.sin(rad(from));
  const x2 = cx + r * Math.cos(rad(to));
  const y2 = cy + r * Math.sin(rad(to));
  const large = to - from > 180 ? 1 : 0;
  return `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${fill}"/>`;
}

const scatter = (seed, n, cx, cy, spread, r, fill) => {
  let s = seed;
  const next = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  return Array.from({ length: n }, () => {
    const a = next() * Math.PI * 2;
    const d = Math.sqrt(next()) * spread;
    return `<circle cx="${(cx + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d).toFixed(1)}" r="${r}" fill="${fill}"/>`;
  }).join("");
};

const SCENES = {
  // Comida — bowl visto desde arriba. Las porciones se leen como ingredientes
  // distintos aunque esten planas.
  "food-bowl": `
    <rect width="${W}" height="${H}" fill="#FBF1E2"/>
    ${scatter(7, 26, 300, 200, 260, 6, "#EFE0C8")}
    ${scatter(11, 26, 1320, 720, 260, 6, "#EFE0C8")}
    <ellipse cx="800" cy="480" rx="330" ry="330" fill="#E4D3B8" opacity="0.55"/>
    <circle cx="800" cy="460" r="325" fill="#FFFFFF"/>
    <circle cx="800" cy="460" r="300" fill="#F6EFE2"/>
    <circle cx="800" cy="460" r="272" fill="#FFFBF3"/>
    ${slice(800, 460, 272, 0, 72, "#F2907A")}
    ${slice(800, 460, 272, 72, 140, "#8FBF6B")}
    ${slice(800, 460, 272, 140, 205, "#F3C053")}
    ${slice(800, 460, 272, 205, 268, "#D9584F")}
    ${slice(800, 460, 272, 268, 330, "#4E6E52")}
    <circle cx="800" cy="460" r="96" fill="#FFFDF8"/>
    <circle cx="800" cy="460" r="96" fill="none" stroke="#E8DCC6" stroke-width="6"/>
    ${scatter(3, 22, 890, 380, 78, 11, "#6E9B4E")}
    ${scatter(23, 14, 690, 560, 66, 10, "#B8412F")}
    <circle cx="800" cy="460" r="300" fill="none" stroke="#E2D2B6" stroke-width="10"/>
    <g transform="rotate(-24 1290 300)">
      <rect x="1240" y="120" width="18" height="420" rx="9" fill="#C89B6A"/>
      <rect x="1288" y="120" width="18" height="420" rx="9" fill="#C89B6A"/>
    </g>`,

  // Ejercicio — una mancuerna. Silueta simple, se reconoce a cualquier tamano.
  "exercise-dumbbell": `
    <rect width="${W}" height="${H}" fill="#FFF0E4"/>
    <ellipse cx="800" cy="606" rx="386" ry="38" fill="#F0D9C4" opacity="0.8"/>
    <rect x="560" y="418" width="480" height="64" rx="32" fill="#8A8F98"/>
    <rect x="560" y="418" width="480" height="26" rx="13" fill="#A7ACB5"/>
    <g fill="#3F4650">
      <rect x="452" y="330" width="66" height="240" rx="26"/>
      <rect x="518" y="366" width="52" height="168" rx="22"/>
      <rect x="1082" y="330" width="66" height="240" rx="26"/>
      <rect x="1030" y="366" width="52" height="168" rx="22"/>
    </g>
    <g fill="#565E6A">
      <rect x="452" y="330" width="66" height="86" rx="26"/>
      <rect x="1082" y="330" width="66" height="86" rx="26"/>
    </g>
    <rect x="228" y="530" width="214" height="82" rx="41" fill="#F5A05C"/>
    <rect x="228" y="530" width="214" height="34" rx="17" fill="#FFB877"/>
    <circle cx="242" cy="571" r="26" fill="#E8894A"/>
    <circle cx="1300" cy="250" r="72" fill="#FFD9BC"/>
    <circle cx="1392" cy="330" r="42" fill="#FFD9BC"/>`,

  // Lectura — libro abierto con un cafe. Las lineas de texto son lo que hace
  // que se lea como un libro y no como dos rectangulos.
  "reading-book": `
    <rect width="${W}" height="${H}" fill="#F2EDFA"/>
    <ellipse cx="780" cy="720" rx="470" ry="56" fill="#DCD2EE" opacity="0.8"/>
    <path d="M 360 620 L 360 300 Q 560 250 776 306 L 776 640 Q 560 584 360 620 Z" fill="#FFFFFF"/>
    <path d="M 1192 620 L 1192 300 Q 992 250 776 306 L 776 640 Q 992 584 1192 620 Z" fill="#FDFCFF"/>
    <path d="M 360 620 L 360 300 Q 560 250 776 306 L 776 640 Q 560 584 360 620 Z" fill="none" stroke="#C9BCE4" stroke-width="6"/>
    <path d="M 1192 620 L 1192 300 Q 992 250 776 306 L 776 640 Q 992 584 1192 620 Z" fill="none" stroke="#C9BCE4" stroke-width="6"/>
    <g fill="#B7A9D6">
      <rect x="418" y="352" width="290" height="14" rx="7"/>
      <rect x="418" y="398" width="318" height="14" rx="7"/>
      <rect x="418" y="444" width="262" height="14" rx="7"/>
      <rect x="418" y="490" width="300" height="14" rx="7"/>
      <rect x="418" y="536" width="212" height="14" rx="7"/>
      <rect x="846" y="352" width="290" height="14" rx="7"/>
      <rect x="846" y="398" width="252" height="14" rx="7"/>
      <rect x="846" y="444" width="306" height="14" rx="7"/>
      <rect x="846" y="490" width="228" height="14" rx="7"/>
    </g>
    <path d="M 776 306 L 776 640" stroke="#B0A0D2" stroke-width="8"/>
    <rect x="742" y="230" width="30" height="180" rx="8" fill="#8B6FC4"/>
    <path d="M 742 410 L 757 384 L 772 410 Z" fill="#7A5EB4"/>
    <g transform="translate(1244 452)">
      <ellipse cx="86" cy="196" rx="112" ry="22" fill="#DCD2EE" opacity="0.8"/>
      <path d="M 12 66 L 30 186 Q 34 200 50 200 L 122 200 Q 138 200 142 186 L 160 66 Z" fill="#FFFFFF" stroke="#C9BCE4" stroke-width="6"/>
      <path d="M 20 96 L 152 96 L 140 178 Q 137 190 124 190 L 48 190 Q 35 190 32 178 Z" fill="#6B4A33"/>
      <path d="M 160 92 Q 214 96 210 132 Q 206 168 156 166" fill="none" stroke="#C9BCE4" stroke-width="14" stroke-linecap="round"/>
    </g>`,

  // Agua — vaso con limon. La onda de la superficie es lo que la separa de un
  // simple rectangulo azul.
  "water-glass": `
    <rect width="${W}" height="${H}" fill="#E8F6FA"/>
    ${scatter(5, 18, 300, 700, 200, 8, "#D2EDF5")}
    <ellipse cx="800" cy="742" rx="220" ry="34" fill="#CDE9F2"/>
    <path d="M 660 176 L 700 720 Q 702 742 724 742 L 876 742 Q 898 742 900 720 L 940 176 Z" fill="#FFFFFF" opacity="0.92"/>
    <path d="M 690 372 L 700 720 Q 702 742 724 742 L 876 742 Q 898 742 900 720 L 910 372 Q 850 402 800 372 Q 750 342 690 372 Z" fill="#4FB3D9"/>
    <path d="M 690 372 Q 750 342 800 372 Q 850 402 910 372 L 906 420 Q 850 448 800 420 Q 750 392 694 420 Z" fill="#71C6E6"/>
    ${scatter(13, 9, 800, 560, 84, 13, "#8FD6EF")}
    <path d="M 660 176 L 700 720 Q 702 742 724 742 L 876 742 Q 898 742 900 720 L 940 176 Z" fill="none" stroke="#B4DFEE" stroke-width="10"/>
    <path d="M 700 220 L 730 690" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" opacity="0.75"/>
    <g transform="translate(902 150) rotate(18)">
      <circle cx="0" cy="0" r="104" fill="#F5D547"/>
      <circle cx="0" cy="0" r="104" fill="none" stroke="#E4BE2E" stroke-width="10"/>
      <circle cx="0" cy="0" r="80" fill="#FBE885"/>
      <g stroke="#EFD05F" stroke-width="7">
        <path d="M 0 -80 L 0 80"/><path d="M -80 0 L 80 0"/>
        <path d="M -57 -57 L 57 57"/><path d="M -57 57 L 57 -57"/>
      </g>
      <circle cx="0" cy="0" r="12" fill="#EFD05F"/>
    </g>`,

  // Sueno — noche tranquila. Sirve para el registro de sueno y para el evento
  // de fin de semana.
  "sleep-night": `
    <rect width="${W}" height="${H}" fill="#232A52"/>
    <circle cx="1180" cy="250" r="130" fill="#F2E9C8"/>
    <circle cx="1122" cy="212" r="130" fill="#232A52"/>
    ${scatter(31, 46, 800, 380, 620, 5, "#8E97D4")}
    ${scatter(37, 18, 500, 250, 380, 8, "#C9D0F5")}
    <path d="M 0 700 Q 260 590 520 690 Q 800 800 1080 680 Q 1340 570 1600 668 L 1600 900 L 0 900 Z" fill="#2E3767"/>
    <path d="M 0 786 Q 300 706 620 790 Q 940 874 1260 780 Q 1440 728 1600 762 L 1600 900 L 0 900 Z" fill="#3A4480"/>`,
};

mkdirSync(OUT, { recursive: true });

for (const [name, body] of Object.entries(SCENES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  const file = path.join(OUT, `${name}.jpg`);
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(file);
  console.log(`  ${name}.jpg`);
}

console.log(`\n  ${Object.keys(SCENES).length} ilustraciones en store/demo-photos/`);
