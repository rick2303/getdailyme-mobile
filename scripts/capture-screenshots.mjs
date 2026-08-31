// Capturas de Play a la medida exacta, desde un emulador o un telefono.
//
//   node scripts/capture-screenshots.mjs list      que hay capturado
//   node scripts/capture-screenshots.mjs shot 01-hoy
//   node scripts/capture-screenshots.mjs reset     devuelve la pantalla a su medida
//
// El truco es `adb shell wm size`: fuerza la resolucion logica del dispositivo
// a 1080x2160 mientras dura la sesion, asi que las capturas salen ya con la
// proporcion que pide Play y no hay que recortarlas despues (recortar mueve la
// composicion y se nota).
//
// iOS no se puede hacer desde aqui: las capturas de 6.9" salen del simulador de
// Xcode o de un iPhone fisico, y ambos necesitan un Mac.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Play exige que el lado largo no pase del doble del corto, asi que con 1080 de
// ancho el alto maximo es 2160. El panel nativo del AVD es 1080x2400 (los 20:9
// de un movil actual) y se pasa: 2400 es 2.22 veces 1080.
//
// 1080x2160 es 18:9 — el limite exacto, y la proporcion mas alta que Play
// acepta. Importa para la ficha: 1080x1920 es 9:16, la forma de un telefono de
// hace diez anos, y una captura asi se lee como una app vieja al lado de las
// demas de la tienda. Aqui se sube al maximo legal.
// Las de iOS son otra historia: 6.9" son 1290x2796, casi 19.5:9.
const WIDTH = 1080;
const HEIGHT = 2160;

// El AVD viene a 420ppp. A 400, y con el alto en 2160, la ventana logica queda
// en 432x864dp — lo mas cerca que se puede estar de lo que ve alguien con un
// telefono actual (un Pixel 7 son 411x914dp) sin salirse de la proporcion que
// Play admite. A 420 saldrian 823dp de alto y entraria menos. Se restaura con
// `reset`.
const DENSITY = 400;

// Cada ficha tiene su idioma y sus capturas: `app.json` declara `es` y `en`, y
// Play y App Store piden un juego por idioma con el texto de la pantalla en ese
// idioma. Van en subcarpetas para que no se mezclen.
//
//   SHOTS_LOCALE=en node scripts/capture-screenshots.mjs shot 01-today
const LOCALE_DIR = (process.env.SHOTS_LOCALE ?? "").replace(/[^a-z]/gi, "");
const OUT_DIR = path.join(
  import.meta.dirname,
  "..",
  "store",
  "screenshots",
  "android",
  ...(LOCALE_DIR ? [LOCALE_DIR] : []),
);
const SDK = process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
const ADB = path.join(SDK, "platform-tools", "adb.exe");

function adb(args, opts = {}) {
  return execFileSync(existsSync(ADB) ? ADB : "adb", args, {
    encoding: "utf8",
    ...opts,
  });
}

function devices() {
  return adb(["devices"])
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([, state]) => state === "device")
    .map(([serial]) => serial);
}

function requireDevice() {
  const found = devices();
  if (found.length === 0) {
    console.error(
      "No hay ningun dispositivo conectado.\n\n" +
        "  Emulador:  emulator -list-avds  y luego  emulator -avd <nombre>\n" +
        "  Telefono:  conectalo con depuracion USB activada\n\n" +
        "La app tiene que estar instalada: lleva OneSignal, HealthKit y un widget\n" +
        "nativo, asi que Expo Go no vale. Hace falta un dev build o el APK de EAS.",
    );
    process.exit(1);
  }
  if (found.length > 1) {
    console.error(`Hay varios dispositivos (${found.join(", ")}). Deja solo uno conectado.`);
    process.exit(1);
  }
  return found[0];
}

// Forzar `wm size` sobre un panel mas alto deja la app con franjas negras: el
// contenido se dibuja en un recorte y trabajar asi es incomodo aunque el PNG
// salga bien. Si el dispositivo ya mide lo que toca, no se toca nada.
//
// Para tenerlo nativo, arranca el emulador con la medida puesta:
//   emulator -avd <nombre> -skin 1080x2160 -gpu host
// Devuelve true si ha tocado algo. Cambiar densidad o tamano recrea la
// actividad, y capturar antes de que termine devuelve un fotograma en blanco
// (se nota en el peso: 11 KB en vez de ~140 KB), asi que quien llama tiene que
// esperar mas. Por eso solo se toca lo que de verdad esta mal.
function setSize() {
  let changed = false;

  // `wm density` sin argumentos imprime la fisica y, si la hay, la de override.
  const densityOut = adb(["shell", "wm", "density"]);
  const effective = /Override density: (\d+)/.exec(densityOut) ?? /Physical density: (\d+)/.exec(densityOut);
  if (!effective || Number(effective[1]) !== DENSITY) {
    adb(["shell", "wm", "density", String(DENSITY)]);
    changed = true;
  }

  const physical = /Physical size: (\d+)x(\d+)/.exec(adb(["shell", "wm", "size"]));
  if (physical && Number(physical[1]) === WIDTH && Number(physical[2]) === HEIGHT) return changed;

  console.log(`  Nota: el dispositivo mide ${physical ? `${physical[1]}x${physical[2]}` : "?"}.`);
  console.log(`  Forzando ${WIDTH}x${HEIGHT}; veras franjas negras en el emulador.`);
  console.log("  Para evitarlo: emulator -avd <nombre> -skin 1080x2160 -gpu host\n");
  adb(["shell", "wm", "size", `${WIDTH}x${HEIGHT}`]);
  return true;
}

function resetSize() {
  adb(["shell", "wm", "size", "reset"]);
  adb(["shell", "wm", "density", "reset"]);
}

// El equivalente Android de `simctl status_bar override`: deja la barra con la
// hora fija, la bateria llena y sin iconos de notificacion. Una captura con el
// 17% de bateria y tres avisos del sistema se ve descuidada en la ficha.
function demoBar(on) {
  if (!on) {
    adb(["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "exit"]);
    return;
  }
  adb(["shell", "settings", "put", "global", "sysui_demo_allowed", "1"]);
  const send = (args) =>
    adb(["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", ...args]);
  send(["clock", "-e", "hhmm", "0941"]);
  send(["battery", "-e", "level", "100", "-e", "plugged", "false"]);
  // `fully true` es lo que quita el "!" del icono de wifi. Sin el, la barra
  // avisa de "conectado pero sin internet" — el emulador no siempre convence al
  // detector de portales cautivos — y esa admiracion sale en la captura.
  send(["network", "-e", "wifi", "show", "-e", "level", "4", "-e", "fully", "true"]);
  // La radio movil se esconde a proposito. Con `show` la barra saca ademas la
  // etiqueta del tipo de dato, y `datatype none` no siempre llega a tiempo: se
  // cuela un "3G" que envejece la captura diez anos de un plumazo. Wifi al
  // maximo y bateria llena es lo mas limpio, y es lo normal en una ficha.
  send(["network", "-e", "mobile", "hide"]);
  send(["notifications", "-e", "visible", "false"]);
}

async function shot(name) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    console.error(`Nombre invalido: "${name}". Usa minusculas y guiones, p.ej. 01-hoy`);
    process.exit(1);
  }
  requireDevice();
  mkdirSync(OUT_DIR, { recursive: true });

  const relaidOut = setSize();
  demoBar(true);
  // Un respiro para que la app se redibuje antes de capturar. Si hemos cambiado
  // densidad o tamano la actividad se recrea entera y tarda bastante mas.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, relaidOut ? 5000 : 1200);

  const target = path.join(OUT_DIR, `${name}.png`);
  const png = adb(["exec-out", "screencap", "-p"], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });

  // `screencap` siempre devuelve RGBA. Apple rechaza las capturas con canal
  // alfa, asi que se aplana aqui y no en un paso manual que se olvida.
  const flat = await sharp(png).flatten({ background: "#FFFFFF" }).png().toBuffer();
  writeFileSync(target, flat);

  const meta = await sharp(flat).metadata();
  console.log(`  ${name}.png  ${meta.width}x${meta.height}  alfa:${meta.hasAlpha}  (${(flat.length / 1024).toFixed(0)} KB)`);
  if (meta.width !== WIDTH || meta.height !== HEIGHT) {
    console.log(`  Cuidado: se esperaba ${WIDTH}x${HEIGHT}.`);
  }

  // Una pantalla a medio dibujar sale casi lisa. Mas vale avisar que guardar en
  // silencio una captura en blanco y descubrirlo al subirla a la ficha.
  const stats = await sharp(flat).stats();
  const flatness = Math.max(...stats.channels.map((channel) => channel.stdev));
  if (flatness < 12) {
    console.log("\n  AVISO: la imagen esta casi lisa; probablemente cogio la app a medio");
    console.log("  dibujar. Espera unos segundos y repite la captura.");
  }
  console.log("  Al terminar, para quitar el modo demo de la barra:");
  console.log("  node scripts/capture-screenshots.mjs reset");
}

function list() {
  if (!existsSync(OUT_DIR)) {
    console.log("Todavia no hay capturas.");
    return;
  }
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".png")).sort();
  if (files.length === 0) {
    console.log("Todavia no hay capturas.");
    return;
  }
  for (const file of files) {
    const size = statSync(path.join(OUT_DIR, file)).size;
    console.log(`  ${file.padEnd(28)} ${(size / 1024).toFixed(0)} KB`);
  }
  console.log(`\n  ${files.length} de 2-8 que pide Play.`);
  if (files.length < 2) console.log("  Faltan: Play exige 2 como minimo.");
  if (files.length > 8) console.log("  Sobran: Play acepta 8 como maximo.");
}

const [command, arg] = process.argv.slice(2);

if (command === "shot" && arg) await shot(arg);
else if (command === "list") list();
else if (command === "reset") {
  requireDevice();
  resetSize();
  demoBar(false);
  console.log("Pantalla y barra de estado devueltas a su estado normal.");
} else {
  console.log(
    "Uso:\n" +
      "  node scripts/capture-screenshots.mjs shot <nombre>   captura la pantalla actual\n" +
      "  node scripts/capture-screenshots.mjs list            lista lo capturado\n" +
      "  node scripts/capture-screenshots.mjs reset           restaura la resolucion\n",
  );
}
