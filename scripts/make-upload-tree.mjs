// Deja las fotos de demostracion en el arbol de carpetas que exige Storage,
// para subirlas a mano cuando se siembra con SQL en vez de con Node.
//
//   node scripts/make-upload-tree.mjs
//
// La politica `can_view_activity_photo` lee la ruta por tramos: el primero tiene
// que ser el id de quien la subio y el segundo el de la actividad. Una foto en
// cualquier otro sitio no la puede abrir nadie, y no falla al subirla: solo deja
// huecos en el feed.
//
// Los identificadores son los mismos que calcula el SQL —un md5 del correo y de
// la posicion— asi que se pueden generar aqui sin tocar la base, y no cambian al
// re-sembrar.

import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const EMAIL = process.env.REVIEW_EMAIL ?? "review@getdailyme.com";

const uuid = (seed) => {
  const h = createHash("md5").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

// La posicion que les da el trigger: 0 agua, 1 comida, 2 ejercicio, 3 lectura.
const FOTOS = [
  [0, "water-glass.jpg"],
  [1, "food-bowl.jpg"],
  [2, "exercise-dumbbell.jpg"],
  [3, "reading-book.jpg"],
];

const raiz = path.join(import.meta.dirname, "..", "store");
const origen = path.join(raiz, "demo-photos");
const destino = path.join(raiz, "upload-to-storage", "activity-photos");

const userId = uuid(`gdm-user-${EMAIL}`);

rmSync(destino, { recursive: true, force: true });

for (const [position, archivo] of FOTOS) {
  const activityId = uuid(`gdm-act-${EMAIL}-${position}`);
  const carpeta = path.join(destino, userId, activityId);
  mkdirSync(carpeta, { recursive: true });
  copyFileSync(path.join(origen, archivo), path.join(carpeta, archivo));
  console.log(`  ${userId}/${activityId}/${archivo}`);
}

console.log(`\n  ${readdirSync(path.join(destino, userId)).length} carpetas en store/upload-to-storage/`);
console.log("  Subelas al bucket activity-photos conservando la estructura.");
