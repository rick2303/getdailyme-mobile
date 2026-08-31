// Cuenta de demostracion para App Review, para Play y para las capturas.
//
// Las dos tiendas piden credenciales que funcionen, y las dos devuelven la app
// si al entrar no hay nada que mirar ("we were unable to evaluate the
// functionality"). Este script deja la app llena: seis personas, historial,
// feed con fotos y conversaciones, amistades, clubs, retos y eventos.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-review-account.mjs
//
// Idioma de los datos:
//
//   REVIEW_LOCALE=en  node scripts/seed-review-account.mjs
//   REVIEW_LOCALE=es  node scripts/seed-review-account.mjs   (por defecto)
//
// Lo que cambia con el idioma son las notas, los comentarios y los titulos de
// clubs, retos y eventos. Los nombres de las personas NO cambian: una persona se
// llama igual en las dos fichas, y un elenco traducido se nota falso. Las cinco
// actividades por defecto SI se renombran: el trigger las crea siempre en
// espanol y el editor ensena el nombre guardado tal cual.
//
// Habla solo por HTTP(S) — Auth Admin, PostgREST y Storage — asi que sirve igual
// contra el Supabase local que contra produccion: no necesita psql ni Docker. Es
// idempotente: vuelve a dejar el elenco como nuevo cada vez, sin tocar datos de
// usuarios reales.

import { readFileSync } from "node:fs";
import path from "node:path";

const URL_BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TIMEZONE = process.env.REVIEW_TIMEZONE ?? "America/New_York";
const PASSWORD = process.env.REVIEW_PASSWORD ?? "Review2026!";
const LOCALE = (process.env.REVIEW_LOCALE ?? "es").toLowerCase() === "en" ? "en" : "es";

// Todas las fechas cuelgan de aqui, no de un `new Date()` suelto.
//
// Sirve para las capturas: si el script corre a las 00:07, "hoy" lleva siete
// minutos y la pantalla de Hoy sale vacia. Con REVIEW_NOW se ancla el sembrado a
// una hora normal (y se mueve el reloj del emulador a la misma), y el dia sale
// lleno. En produccion se deja sin poner y coge la hora de verdad.
//
//   REVIEW_NOW=2026-08-31T21:30:00 node scripts/seed-review-account.mjs
const NOW = process.env.REVIEW_NOW ? new Date(process.env.REVIEW_NOW) : new Date();
if (Number.isNaN(NOW.getTime())) {
  console.error(`REVIEW_NOW no es una fecha valida: ${process.env.REVIEW_NOW}`);
  process.exit(1);
}
const nowMs = () => NOW.getTime();

if (!URL_BASE || !SERVICE_KEY) {
  console.error(
    "Faltan variables.\n\n" +
      "  SUPABASE_URL=https://<ref>.supabase.co \\\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=<service_role> \\\n" +
      "  node scripts/seed-review-account.mjs\n\n" +
      "La service_role esta en Supabase -> Project Settings -> API. No la pegues\n" +
      "en el repo ni en eas.json: es una clave de administrador.",
  );
  process.exit(1);
}

if (/\banon\b/.test(SERVICE_KEY) || SERVICE_KEY.split(".").length !== 3) {
  console.error("SUPABASE_SERVICE_ROLE_KEY no parece una service_role valida.");
  process.exit(1);
}

// El elenco. El dominio es real y nuestro: Apple a veces comprueba que la
// direccion existe, y un TLD inventado (.local, .test) puede tumbar la
// validacion del formulario.
//
// Cinco amistades y no una: en una pantalla de 18:9 una lista con un solo
// nombre deja media captura vacia, y un feed de dos personas no se lee como un
// muro compartido. Nombres normales y de sitios distintos, que es como se ve
// una lista de amigos de verdad.
const REVIEWER = {
  email: process.env.REVIEW_EMAIL ?? "review@getdailyme.com",
  username: "alex",
  displayName: "Alex Rivera",
};

const FRIENDS = [
  { email: "sofia.marquez@getdailyme.com", username: "sofiam", displayName: "Sofía Márquez" },
  { email: "daniel.okafor@getdailyme.com", username: "danielok", displayName: "Daniel Okafor" },
  { email: "mia.chen@getdailyme.com", username: "miachen", displayName: "Mia Chen" },
  { email: "tomas.herrera@getdailyme.com", username: "tomash", displayName: "Tomás Herrera" },
  { email: "priya.nair@getdailyme.com", username: "priyan", displayName: "Priya Nair" },
];

// Alguien que aun no es amistad: deja una solicitud pendiente en la bandeja,
// que es una pantalla que si no, no hay forma de ensenar.
const PENDING = {
  email: "noah.bergstrom@getdailyme.com",
  username: "noahb",
  displayName: "Noah Bergström",
};

const CAST = [REVIEWER, ...FRIENDS, PENDING];

// Cuentas que creo una version anterior de este script. Se borran enteras: sus
// eventos y clubs siguen colgando del revisor aunque se le quite la amistad, y
// reaparecen en el feed y en la ficha con el idioma y los nombres de entonces.
const LEGACY_EMAILS = ["review.friend@getdailyme.com"];

// Todo lo que se lee en pantalla, en los dos idiomas.
const COPY = {
  es: {
    notes: {
      food: "Bowl de casa, el tercero de la semana",
      exercise: "Piernas y algo de cardio",
      reading: "Dos capitulos antes de dormir",
      water: "Botella nueva, a ver si asi",
    },
    extraActivity: { name: "Meditación", icon: "brain", color: "indigo", unit: "minute", target: 10 },
    comments: [
      "Ocho vasos antes de mediodia, me estas dejando fatal",
      "Que envidia, yo llevo dos dias sin pisar el gimnasio",
      "Esa receta la quiero",
      "Vamos que llegas a los 20 dias",
      "Yo tambien lo dejo para la noche y luego no lo hago",
    ],
    replies: ["Te paso la receta y te callas", "Manana sin falta"],
    clubs: [
      { name: "Los de las 6 de la mañana", icon: "sunrise", color: "amber" },
      { name: "Club de lectura", icon: "book-open", color: "purple" },
    ],
    challenges: [
      { title: "30 días de agua", target: 30 },
      { title: "Leer 300 páginas este mes", target: 300 },
      { title: "Correr 40 km en enero", target: 40 },
    ],
    events: [
      {
        title: "Viaje a Lisboa",
        description: "Vuelo a las 8:00, llevar el cargador del movil.",
        icon: "tree-palm",
        color: "teal",
      },
      {
        title: "Carrera 10K",
        description: "Salida en el parque, nos vemos 20 minutos antes.",
        icon: "footprints",
        color: "orange",
      },
      {
        title: "Cena del club",
        description: "Reservado a las 21:00. Confirmad antes del jueves.",
        icon: "utensils",
        color: "pink",
      },
    ],
  },
  en: {
    notes: {
      food: "Homemade bowl, third one this week",
      exercise: "Legs and a bit of cardio",
      reading: "Two chapters before bed",
      water: "New bottle, let's see if it helps",
    },
    extraActivity: { name: "Meditation", icon: "brain", color: "indigo", unit: "minute", target: 10 },
    comments: [
      "Eight glasses before noon, you are making me look bad",
      "Jealous. I have not been to the gym in two days",
      "I need that recipe",
      "Twenty days is right there, keep going",
      "I also leave it for the evening and then never do it",
    ],
    replies: ["I will send you the recipe if you stop", "Tomorrow for sure"],
    clubs: [
      { name: "The 6am Club", icon: "sunrise", color: "amber" },
      { name: "Book Club", icon: "book-open", color: "purple" },
    ],
    challenges: [
      { title: "30 days of water", target: 30 },
      { title: "Read 300 pages this month", target: 300 },
      { title: "Run 40 km in January", target: 40 },
    ],
    events: [
      {
        title: "Trip to Lisbon",
        description: "Flight at 8:00, do not forget the phone charger.",
        icon: "tree-palm",
        color: "teal",
      },
      {
        title: "10K race",
        description: "Start at the park, meet 20 minutes early.",
        icon: "footprints",
        color: "orange",
      },
      {
        title: "Club dinner",
        description: "Table booked for 9pm. Confirm before Thursday.",
        icon: "utensils",
        color: "pink",
      },
    ],
  },
}[LOCALE];

// Los nombres de la actividad extra en los dos idiomas, para poder limpiar la
// del idioma anterior al re-sembrar.
const EXTRA_ACTIVITY_NAMES = ["Meditación", "Meditation"];

const auth = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function api(path, init = {}) {
  const response = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: { ...auth, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// PostgREST devuelve las filas insertadas solo si se le pide.
function rest(path, init = {}) {
  return api(`/rest/v1${path}`, {
    ...init,
    headers: { Prefer: "return=representation", ...(init.headers ?? {}) },
  });
}

async function findUserByEmail(email) {
  // El filtro del admin API es una busqueda amplia; hay que confirmar la
  // coincidencia exacta para no pisar una cuenta parecida.
  const { users } = await api(`/auth/v1/admin/users?filter=${encodeURIComponent(email)}`);
  return users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertUser(person) {
  const existing = await findUserByEmail(person.email);

  if (existing) {
    await api(`/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
    });
    return { id: existing.id, created: false };
  }

  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: person.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: person.displayName, locale: LOCALE },
    }),
  });
  return { id: created.id, created: true };
}

// El username lo elige el trigger a partir del correo, asi que hay que fijarlo
// despues. Si lo tiene otra cuenta (restos de pruebas anteriores), a esa se le
// anade un sufijo en vez de borrarla: puede no ser nuestra.
async function claimUsername(userId, username) {
  const holders = await rest(`/profiles?username=eq.${encodeURIComponent(username)}&select=id`);
  for (const holder of holders ?? []) {
    if (holder.id === userId) continue;
    await rest(`/profiles?id=eq.${holder.id}`, {
      method: "PATCH",
      body: JSON.stringify({ username: `${username}_${holder.id.replace(/-/g, "").slice(0, 4)}` }),
    });
  }
}

async function shapeProfile(userId, person) {
  await claimUsername(userId, person.username);
  await rest(`/profiles?id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      username: person.username,
      display_name: person.displayName,
      timezone: TIMEZONE,
      locale: LOCALE,
      onboarded_at: NOW.toISOString(),
    }),
  });
}

// Cuatro meses de historial para la cuenta de revision, no dos semanas: el
// perfil pinta un mapa de calor de los ultimos 4 meses y con 14 dias sale una
// cuadricula gris con una esquina pintada, que es peor que no ensenarlo.
//
// La racha viva sigue siendo de 14 dias porque `STREAK_BREAK` deja un dia sin
// nada justo antes: el mapa se llena y el numero de la racha sigue contando una
// historia creible.
const DAYS = 120;
const STREAK_BREAK = 14;

// Las amistades no necesitan tanto: solo alimentan el feed y las
// clasificaciones, y cada dia de mas son ~10 filas por persona.
const FRIEND_DAYS = 45;

// Dias sueltos sin registrar, ademas del corte de la racha. Un mapa de calor sin
// un solo hueco en cuatro meses no se lo cree nadie.
const GAPS = new Set([STREAK_BREAK, 31, 32, 47, 63, 64, 65, 88, 101]);

// TODAS las horas se calculan en la zona de la cuenta, no en la de la maquina
// que corre el script.
//
// Antes se usaba `date.setHours()` a secas, que trabaja en la zona del sistema.
// Sembrando desde Madrid una cuenta en America/New_York, un registro puesto a
// las 08:00 aterrizaba a las 02:00 de la madrugada de alli, y algunos cruzaban
// la medianoche: la app cuenta los dias por la zona del perfil, asi que las
// rachas y el "N registros hoy" salian descuadrados. Se ve en cuanto las dos
// zonas se separan unas horas.
function tzOffsetMs(ms) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second")) - ms;
}

// La fecha civil (aaaa, mm, dd) que es `daysAgo` dias antes de hoy, en TIMEZONE.
function civilDay(daysAgo) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs()));
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  const noon = Date.UTC(get("year"), get("month") - 1, get("day"), 12) - daysAgo * 86_400_000;
  const date = new Date(noon);
  return [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
}

// El instante que, visto desde TIMEZONE, cae ese dia a esa hora. Dos pasadas
// porque el desfase depende del propio instante (horario de verano).
function zoned(daysAgo, hour, minute = 0) {
  const [year, month, day] = civilDay(daysAgo);
  const wall = Date.UTC(year, month, day, hour, minute);
  let ms = wall;
  for (let i = 0; i < 2; i += 1) ms = wall - tzOffsetMs(ms);
  return new Date(ms);
}

// La hora local de la cuenta ahora mismo, en minutos desde medianoche.
function minutesIntoDay() {
  return (nowMs() + tzOffsetMs(nowMs()) - Date.UTC(...civilDay(0))) / 60_000;
}

// Fechas sueltas: la amistad y los eventos. Acepta dias negativos para lo que
// cae en el futuro (un viaje, una carrera). Los registros no pasan por aqui:
// los suyos los calcula logTime, que ademas garantiza que no caigan por delante
// de ahora.
const at = (daysAgo, hour) => zoned(daysAgo, hour, (Math.abs(daysAgo) * 7) % 60).toISOString();

const dateOnly = (daysAgo) => at(daysAgo, 12).slice(0, 10);

// Minutos hacia atras desde ahora, para lo que tiene que quedar reciente pero no
// todo a la misma hora.
const ago = (minutes) => new Date(nowMs() - minutes * 60_000).toISOString();

// Cuanto se registra de una actividad segun su unidad. Numeros creibles: un
// heatmap perfecto llama mas la atencion que uno humano.
function amountFor(unit, day) {
  if (unit === "minute") return 20 + ((day * 5) % 40);
  if (unit === "page") return 10 + ((day * 7) % 30);
  if (unit === "hour") return 7;
  return 1;
}

// Cuantas veces al dia se registra: el agua va por vasos, la comida por platos.
const repeatsFor = (unit) => (unit === "glass" ? 5 : unit === "serving" ? 3 : 1);

// Cuando se registro cada cosa, siempre en hora local de la cuenta.
//
// Los de HOY se reparten entre las 7:00 y la hora local que sea ahora, en vez de
// contarse hacia atras desde ahora a saco. Cambia dos cosas: el dia se lee como
// un dia normal (desayuno, media manana, comida) y no como una rafaga en la
// ultima hora, y el reparto sigue sin poner nada en el futuro, que era lo que se
// buscaba con lo de contar hacia atras.
//
// Si el script corre de madrugada no hay dia donde repartir; ahi vuelve a contar
// hacia atras desde ahora, aunque eso deje "hoy" casi vacio. Para las capturas
// se ancla el reloj con REVIEW_NOW.
//
// `seatMin` es el asiento de cada actividad y de cada persona en el reloj. Sin
// el, todo aterriza en el mismo minuto, el feed ordena por fecha y salen los
// registros agrupados por persona: parece un diario en vez de un muro
// compartido, que es justo lo que hay que ensenar en la captura.
const DAY_START_HOUR = 7;

function logTime(day, n, seatMin) {
  if (day > 0) return zoned(day, 8 + n * 3, (day * 7 + seatMin) % 60).toISOString();

  const nowMin = minutesIntoDay();
  const startMin = DAY_START_HOUR * 60;
  const span = nowMin - startMin - 20;
  if (span < 60) return new Date(nowMs() - (20 + n * 40 + seatMin) * 60_000).toISOString();

  // Repartidos por el dia: el primero temprano, los siguientes escalonados.
  const step = span / 5;
  const offset = Math.min(span, n * step + (seatMin % 45));
  return zoned(0, DAY_START_HOUR, Math.round(offset)).toISOString();
}

// El nombre que crea el trigger, sea cual sea el idioma del perfil.
const SEED_KEY = {
  Agua: "water",
  Comida: "food",
  Ejercicio: "exercise",
  Lectura: "reading",
  Sueño: "sleep",
  Water: "water",
  Food: "food",
  Exercise: "exercise",
  Reading: "reading",
  Sleep: "sleep",
};

// El trigger de alta crea las cinco actividades SIEMPRE en espanol, mire el
// idioma del perfil o no. La app las traduce al pintarlas, asi que en las listas
// se leen bien — pero el editor ensena el nombre guardado tal cual, porque ahi
// es un campo editable de verdad. Con la interfaz en ingles sale un campo
// "Nombre: Sueño", y eso en una captura de la ficha en ingles canta.
//
// Arreglado de raiz en la migracion 20260831120000_default_activities_locale:
// `handle_new_user` ya mira el locale. Esto se queda porque el sembrado cambia
// de idioma sobre las MISMAS cuentas — se siembra en ingles, se capturan las
// pantallas, se vuelve a sembrar en espanol — y ahi los nombres los puso el
// trigger con el idioma de la primera alta.
const SEED_NAMES = {
  es: { water: "Agua", food: "Comida", exercise: "Ejercicio", reading: "Lectura", sleep: "Sueño" },
  en: { water: "Water", food: "Food", exercise: "Exercise", reading: "Reading", sleep: "Sleep" },
}[LOCALE];

async function renameDefaultActivities(userId) {
  const rows = await rest(`/activities?user_id=eq.${userId}&select=id,name`);
  for (const row of rows ?? []) {
    const key = SEED_KEY[row.name];
    const wanted = key ? SEED_NAMES[key] : null;
    if (!wanted || wanted === row.name) continue;
    await rest(`/activities?id=eq.${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: wanted }),
    });
  }
}

// Ejercicio dia si dia no, lectura casi siempre, sueno todos menos hoy. Agua y
// comida todos los dias para que haya una racha viva que ensenar. `shift` mueve
// el patron por persona: si todo el elenco descansa el mismo dia, el feed tiene
// huecos identicos y se nota.
function logsOnDay(key, day, shift) {
  if (GAPS.has(day)) return false;
  if (key === "exercise") return (day + shift) % 2 === 0;
  if (key === "reading") return (day + shift) % 4 !== 3;
  if (key === "sleep") return day > 0;
  return true;
}

async function activitiesOf(userId) {
  return rest(`/activities?user_id=eq.${userId}&is_archived=eq.false&select=id,name,unit,position`);
}

async function seedLogs(userId, seat, withNotes, days = DAYS) {
  const activities = await activitiesOf(userId);

  const rows = [];
  for (const [ai, activity] of activities.entries()) {
    const key = SEED_KEY[activity.name] ?? "other";
    const repeats = repeatsFor(activity.unit);
    const seatMin = seat + ai * 9;
    for (let day = 0; day < days; day += 1) {
      if (!logsOnDay(key, day, seat)) continue;
      for (let n = 0; n < repeats; n += 1) {
        rows.push({
          activity_id: activity.id,
          user_id: userId,
          amount: amountFor(activity.unit, day),
          note: withNotes && day === 0 && n === 0 ? (COPY.notes[key] ?? null) : null,
          photo_url: null,
          logged_at: logTime(day, n, seatMin),
        });
      }
    }
  }

  // PostgREST se atraganta con inserciones muy grandes; por lotes va sobrado.
  for (let i = 0; i < rows.length; i += 200) {
    await rest("/activity_logs", { method: "POST", body: JSON.stringify(rows.slice(i, i + 200)) });
  }
  return rows.length;
}

async function wipe(userId) {
  // Los logs arrastran sus reacciones y comentarios, y los eventos, clubs y
  // retos a sus miembros, todo por cascada.
  await rest(`/activity_logs?user_id=eq.${userId}`, { method: "DELETE" });
  await rest(`/events?creator_id=eq.${userId}`, { method: "DELETE" });
  await rest(`/clubs?creator_id=eq.${userId}`, { method: "DELETE" });
  await rest(`/challenges?creator_id=eq.${userId}`, { method: "DELETE" });
  await rest(`/nudges?sender_id=eq.${userId}`, { method: "DELETE" });
  await rest(`/nudges?receiver_id=eq.${userId}`, { method: "DELETE" });
  await rest(`/friendships?requester_id=eq.${userId}`, { method: "DELETE" });
  await rest(`/friendships?addressee_id=eq.${userId}`, { method: "DELETE" });
  // Las actividades extra que anade este script; las cinco del trigger se
  // quedan, que son las que el resto de la app da por hechas.
  //
  // Se borran las de LOS DOS idiomas, no solo la del idioma de esta pasada:
  // sembrando en ingles y luego en espanol quedaban "Meditation" y "Meditación"
  // a la vez, porque el borrado buscaba solo el nombre de ahora.
  for (const name of EXTRA_ACTIVITY_NAMES) {
    await rest(`/activities?user_id=eq.${userId}&name=eq.${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }
}

async function befriend(a, b, daysAgo, status = "accepted") {
  await rest("/friendships", {
    method: "POST",
    body: JSON.stringify({
      requester_id: b,
      addressee_id: a,
      status,
      responded_at: status === "accepted" ? at(daysAgo, 12) : null,
    }),
  });
}

// Reacciones variadas y repartidas entre los registros recientes. Con un solo
// tipo, la bandeja de avisos ensena cuatro veces la misma linea a la misma hora
// y se nota que son datos puestos a mano: justo lo que no queremos en una
// captura de tienda ni delante de un revisor.
const REACTIONS = ["fire", "clap", "heart", "laugh", "muscle"];

async function react(fromUser, onUserLogs, offset) {
  const logs = await rest(
    `/activity_logs?user_id=eq.${onUserLogs}&select=id&order=logged_at.desc&limit=40`,
  );
  if (!logs?.length) return 0;

  const picked = [];
  // Dos por persona y no cuatro: la bandeja de avisos escribe la misma linea
  // ("X reacciono a tu registro") sea cual sea el emoji, asi que cuatro
  // seguidas de la misma persona se leen como un error de la app.
  for (let i = 0; i < 2; i += 1) {
    const log = logs[offset + i * 3];
    if (!log) continue;
    // Repartidas en el tiempo. Sin esto todas nacen en el mismo minuto y la
    // bandeja ensena veinte avisos con la misma hora: se ve sembrado a mano.
    const minutesAgo = 25 + offset * 47 + i * 193;
    const when = new Date(nowMs() - minutesAgo * 60_000).toISOString();
    picked.push({
      log_id: log.id,
      user_id: fromUser,
      type: REACTIONS[(offset + i) % 5],
      created_at: when,
    });
  }
  if (!picked.length) return 0;

  // Cada persona reacciona una sola vez por registro; si el reparto repite, la
  // clave unica lo rechaza y no pasa nada.
  await rest("/reactions", {
    method: "POST",
    headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
    body: JSON.stringify(picked),
  });
  return picked.length;
}

// Conversaciones, no comentarios sueltos. Un hilo con respuesta es lo que hace
// que el feed se lea como algo vivo, y es la pantalla que pide la ficha.
async function seedComments(reviewerId, friends) {
  const mine = await rest(
    `/activity_logs?user_id=eq.${reviewerId}&select=id&order=logged_at.desc&limit=12`,
  );
  const hers = await rest(
    `/activity_logs?user_id=eq.${friends[0].id}&select=id&order=logged_at.desc&limit=12`,
  );
  if (!mine?.length || !hers?.length) return 0;

  let count = 0;

  // Dos amigas comentan mi registro con foto, y yo contesto a la primera.
  const first = await rest("/comments", {
    method: "POST",
    body: JSON.stringify([
      { log_id: mine[0].id, user_id: friends[0].id, body: COPY.comments[2], created_at: ago(96), updated_at: ago(96) },
      { log_id: mine[0].id, user_id: friends[2].id, body: COPY.comments[1], created_at: ago(71), updated_at: ago(71) },
    ]),
  });
  count += first.length;

  await rest("/comments", {
    method: "POST",
    body: JSON.stringify({
      log_id: mine[0].id,
      user_id: reviewerId,
      body: COPY.replies[0],
      created_at: ago(58), updated_at: ago(58),
      parent_id: first[0].id,
      reply_to_user_id: friends[0].id,
    }),
  });
  count += 1;

  // Y yo comento el de ella, para que la interaccion vaya en las dos
  // direcciones y no parezca que solo me hablan a mi.
  await rest("/comments", {
    method: "POST",
    body: JSON.stringify([
      { log_id: hers[0].id, user_id: reviewerId, body: COPY.comments[0], created_at: ago(34), updated_at: ago(34) },
      { log_id: hers[2].id, user_id: friends[3].id, body: COPY.comments[3], created_at: ago(12), updated_at: ago(12) },
    ]),
  });
  count += 2;

  return count;
}

// Sube las ilustraciones de store/demo-photos y las cuelga de los registros mas
// recientes. Sin fotos el feed es una lista de texto, y la ficha necesita
// ensenar que se pueden subir.
const PHOTOS = [
  { file: "food-bowl.jpg", key: "food" },
  { file: "exercise-dumbbell.jpg", key: "exercise" },
  { file: "reading-book.jpg", key: "reading" },
  { file: "water-glass.jpg", key: "water" },
];

async function uploadPhoto(userId, activityId, file) {
  const source = path.join(import.meta.dirname, "..", "store", "demo-photos", file);
  const bytes = readFileSync(source);
  const key = `${userId}/${activityId}/${file}`;
  const response = await fetch(`${URL_BASE}/storage/v1/object/activity-photos/${key}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!response.ok) throw new Error(`subiendo ${file}: ${response.status} ${await response.text()}`);
  return key;
}

async function attachPhotos(userId) {
  const activities = await activitiesOf(userId);
  let done = 0;

  for (const photo of PHOTOS) {
    const activity = activities.find((row) => SEED_KEY[row.name] === photo.key);
    if (!activity) continue;

    const [log] = await rest(
      `/activity_logs?user_id=eq.${userId}&activity_id=eq.${activity.id}&select=id&order=logged_at.desc&limit=1`,
    );
    if (!log) continue;

    const key = await uploadPhoto(userId, activity.id, photo.file);
    await rest(`/activity_logs?id=eq.${log.id}`, {
      method: "PATCH",
      body: JSON.stringify({ photo_url: key }),
    });
    done += 1;
  }
  return done;
}

async function seedEvents(reviewerId, friends) {
  const [lisbon, race, dinner] = COPY.events;
  const events = await rest("/events", {
    method: "POST",
    body: JSON.stringify([
      {
        creator_id: friends[0].id,
        ...lisbon,
        starts_at: at(-9, 8),
        ends_at: at(-13, 20),
        all_day: true,
      },
      {
        creator_id: reviewerId,
        ...race,
        starts_at: at(-3, 9),
        // PostgREST exige las mismas claves en todas las filas de un insert
        // masivo, asi que el evento sin fin la lleva explicitamente en null.
        ends_at: null,
        all_day: false,
      },
      {
        creator_id: friends[1].id,
        ...dinner,
        starts_at: at(-16, 21),
        ends_at: null,
        all_day: false,
      },
    ]),
  });

  const members = [];
  for (const [i, event] of events.entries()) {
    const guests = [reviewerId, ...friends.slice(0, 3 + i).map((f) => f.id)];
    for (const userId of new Set(guests)) {
      members.push({
        event_id: event.id,
        user_id: userId,
        // Uno invitado y sin contestar en cada evento: si todos van, el boton de
        // aceptar no aparece en ninguna captura.
        status: userId === event.creator_id ? "going" : userId === reviewerId && i === 0 ? "invited" : "going",
      });
    }
  }
  await rest("/event_members", {
    method: "POST",
    // Un trigger ya mete al creador como owner en cuanto se crea la fila padre,
    // asi que el roster que armamos aqui lo repite. Ignorar el duplicado es mas
    // simple que excluirlo a mano en cada caso.
    headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
    body: JSON.stringify(members),
  });
  return events;
}

async function seedClubs(reviewerId, friends) {
  const clubs = await rest("/clubs", {
    method: "POST",
    body: JSON.stringify(
      COPY.clubs.map((club, i) => ({
        ...club,
        creator_id: i === 0 ? reviewerId : friends[1].id,
        // La tabla exige el codigo en minusculas (`clubs_invite_code_lowercase`).
        invite_code: `demo${i + 1}${Math.random().toString(36).slice(2, 6)}`,
      })),
    ),
  });

  const members = [];
  for (const [i, club] of clubs.entries()) {
    const roster = [reviewerId, ...friends.slice(0, 4 - i).map((f) => f.id)];
    for (const userId of new Set(roster)) {
      members.push({
        club_id: club.id,
        user_id: userId,
        role: userId === club.creator_id ? "owner" : "member",
        joined_at: at(10 - i, 12),
      });
    }
  }
  await rest("/club_members", {
    method: "POST",
    // Un trigger ya mete al creador como owner en cuanto se crea la fila padre,
    // asi que el roster que armamos aqui lo repite. Ignorar el duplicado es mas
    // simple que excluirlo a mano en cada caso.
    headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
    body: JSON.stringify(members),
  });
  return clubs;
}

async function seedChallenges(reviewerId, friends, clubs) {
  const activities = await activitiesOf(reviewerId);
  const byKey = Object.fromEntries(activities.map((row) => [SEED_KEY[row.name], row]));
  const [water, reading, run] = COPY.challenges;

  const challenges = await rest("/challenges", {
    method: "POST",
    body: JSON.stringify([
      {
        creator_id: reviewerId,
        title: water.title,
        target: water.target,
        starts_on: dateOnly(9),
        ends_on: dateOnly(-20),
        club_id: null,
      },
      {
        creator_id: friends[1].id,
        title: reading.title,
        target: reading.target,
        starts_on: dateOnly(12),
        ends_on: dateOnly(-16),
        club_id: clubs[1]?.id ?? null,
      },
      {
        creator_id: friends[2].id,
        title: run.title,
        target: run.target,
        starts_on: dateOnly(5),
        ends_on: dateOnly(-24),
        club_id: null,
      },
    ]),
  });

  // Cada participante apunta SU propia actividad, no la mia: el reto cuenta
  // sobre la actividad de cada quien, y sin activity_id la clasificacion pinta
  // 0 para esa persona. Con todo el mundo a cero menos yo, la captura del
  // ranking parece una pantalla rota en vez de una competicion.
  const keyFor = ["water", "reading", "exercise"];
  const byUser = { [reviewerId]: byKey };
  for (const friend of friends.slice(0, 3)) {
    const rows = await activitiesOf(friend.id);
    byUser[friend.id] = Object.fromEntries(rows.map((row) => [SEED_KEY[row.name], row]));
  }

  const members = [];
  for (const [i, challenge] of challenges.entries()) {
    const roster = [reviewerId, ...friends.slice(0, 3).map((f) => f.id)];
    for (const [j, userId] of [...new Set(roster)].entries()) {
      const activity = byUser[userId]?.[keyFor[i]] ?? null;
      members.push({
        challenge_id: challenge.id,
        user_id: userId,
        activity_id: activity?.id ?? null,
        // Uno invitado sin contestar, para que se vea el estado.
        status: userId === challenge.creator_id ? "joined" : j === 3 && i === 2 ? "invited" : "joined",
      });
    }
  }
  await rest("/challenge_members", {
    method: "POST",
    // Un trigger ya mete al creador como owner en cuanto se crea la fila padre,
    // asi que el roster que armamos aqui lo repite. Ignorar el duplicado es mas
    // simple que excluirlo a mano en cada caso.
    headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
    body: JSON.stringify(members),
  });
  return challenges;
}

// El diferenciador de la app: cada actividad decide quien la ve. Se deja una en
// 'custom' compartida con dos personas, para poder ensenar esa pantalla.
async function seedPrivacy(reviewerId, friends) {
  const activities = await activitiesOf(reviewerId);
  const sleep = activities.find((row) => SEED_KEY[row.name] === "sleep");
  if (!sleep) return 0;

  await rest(`/activities?id=eq.${sleep.id}`, {
    method: "PATCH",
    body: JSON.stringify({ visibility: "custom" }),
  });
  await rest(`/activity_shares?activity_id=eq.${sleep.id}`, { method: "DELETE" });
  await rest("/activity_shares", {
    method: "POST",
    body: JSON.stringify(
      friends.slice(0, 2).map((friend) => ({ activity_id: sleep.id, friend_id: friend.id })),
    ),
  });
  return 2;
}

// Una actividad propia ademas de las cinco del trigger: ensena que la lista no
// esta cerrada, y llena el hueco que deja la rejilla con cinco tarjetas.
async function seedExtraActivity(userId) {
  const extra = COPY.extraActivity;
  const [activity] = await rest("/activities", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      name: extra.name,
      icon: extra.icon,
      color: extra.color,
      unit: extra.unit,
      daily_target: extra.target,
      position: 5,
      step: 5,
    }),
  });

  const rows = [];
  for (let day = 0; day < DAYS; day += 1) {
    // Respeta los mismos huecos: si esta actividad registrara el dia del corte,
    // la racha no se romperia y el numero del perfil dejaria de cuadrar.
    if (GAPS.has(day) || day % 3 === 2) continue;
    rows.push({
      activity_id: activity.id,
      user_id: userId,
      amount: 10,
      note: null,
      photo_url: null,
      logged_at: logTime(day, 0, 41),
    });
  }
  await rest("/activity_logs", { method: "POST", body: JSON.stringify(rows) });
  return rows.length;
}

const host = new URL(URL_BASE).host;
console.log(`Sembrando la cuenta de revision en ${host}  (idioma: ${LOCALE})\n`);

for (const email of LEGACY_EMAILS) {
  if (CAST.some((person) => person.email === email)) continue;
  const stale = await findUserByEmail(email);
  if (!stale) continue;
  await api(`/auth/v1/admin/users/${stale.id}`, { method: "DELETE" });
  console.log(`  borrada     ${email} (cuenta de una version anterior)`);
}

const ids = {};
for (const person of CAST) {
  const user = await upsertUser(person);
  ids[person.username] = user.id;
  await shapeProfile(user.id, person);
  console.log(`  ${user.created ? "creada     " : "actualizada"}  ${person.displayName.padEnd(16)} @${person.username}`);
}

const reviewerId = ids[REVIEWER.username];
const friends = FRIENDS.map((person) => ({ ...person, id: ids[person.username] }));
const pendingId = ids[PENDING.username];

for (const person of CAST) {
  await wipe(ids[person.username]);
  await renameDefaultActivities(ids[person.username]);
}

for (const [i, friend] of friends.entries()) await befriend(reviewerId, friend.id, 6 + i);
// La solicitud que aun no he contestado.
await befriend(reviewerId, pendingId, 0, "pending");

let logCount = await seedLogs(reviewerId, 0, true);
logCount += await seedExtraActivity(reviewerId);
for (const [i, friend] of friends.entries()) logCount += await seedLogs(friend.id, 13 + i * 7, true, FRIEND_DAYS);
await seedLogs(pendingId, 61, false, 20);

const photos = await attachPhotos(reviewerId);
await attachPhotos(friends[0].id);

let reactions = 0;
for (const [i, friend] of friends.entries()) reactions += await react(friend.id, reviewerId, i);
for (const [i, friend] of friends.entries()) reactions += await react(reviewerId, friend.id, i);

const comments = await seedComments(reviewerId, friends);
const events = await seedEvents(reviewerId, friends);
const clubs = await seedClubs(reviewerId, friends);
const challenges = await seedChallenges(reviewerId, friends, clubs);
const shares = await seedPrivacy(reviewerId, friends);

// Un toque pendiente de una amiga: ensena el sistema de avisos sin necesidad de
// que el revisor tenga push aceptado.
await rest("/nudges", {
  method: "POST",
  body: JSON.stringify({ sender_id: friends[0].id, receiver_id: reviewerId }),
});

// La bandeja no lee la hora de la reaccion, lee la de su aviso, y esa la pone un
// trigger con `now()`. Sin este repaso los veinte avisos salen con el mismo
// "hace 1 minuto" y la lista se lee como una tanda de datos falsos.
async function spreadInbox(userId) {
  const rows = await rest(
    `/notifications?user_id=eq.${userId}&read_at=is.null&select=id&order=created_at.desc`,
  );
  for (const [i, row] of (rows ?? []).entries()) {
    await rest(`/notifications?id=eq.${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ created_at: ago(9 + i * 37 + (i % 3) * 11) }),
    });
  }
  return rows?.length ?? 0;
}

const inbox = await spreadInbox(reviewerId);

console.log(`\n  ${logCount} registros repartidos entre ${CAST.length} personas, ${DAYS} dias de historial`);
console.log(`  ${friends.length} amistades aceptadas y 1 solicitud pendiente`);
console.log(`  ${photos} fotos, ${reactions} reacciones, ${comments} comentarios, ${inbox} avisos sin leer`);
console.log(`  ${events.length} eventos, ${clubs.length} clubs, ${challenges.length} retos`);
console.log(`  1 actividad en privacidad personalizada, compartida con ${shares}\n`);
console.log("Credenciales para App Store Connect y Play Console:\n");
console.log(`  Usuario:     ${REVIEWER.email}`);
console.log(`  Contrasena:  ${PASSWORD}`);
console.log("\nLa app no tiene 2FA, asi que no hace falta codigo de acceso.");
