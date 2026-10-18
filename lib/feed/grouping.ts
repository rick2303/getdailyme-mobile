import type { FeedEntry } from "@/lib/api/types";

export const GROUP_WINDOW_MS = 30 * 60 * 1000;

export type FeedGroup = {
  entry: FeedEntry;
  count: number;
  amount: number;
};

// Un registro que lleva algo que ensenar nunca se agrupa.
//
// El grupo se queda con UNA entrada y del resto solo suma `count` y `amount`.
// Todo lo demas —la foto, la nota, los comentarios, las reacciones— vive en la
// entrada concreta, asi que agrupar la hacia desaparecer: registrabas Comida con
// una foto y otra vez Comida diez minutos despues, y la foto ya no estaba en
// ningun sitio. Los comentarios de la entrada absorbida quedaban directamente
// fuera de alcance.
//
// Agrupar existe para que cinco vasos de agua seguidos no llenen el muro. Eso
// son registros identicos y sin contenido: colapsarlos no pierde nada. Una
// entrada con foto o con un hilo de comentarios no es ruido repetido, es una
// publicacion, y va en su propia tarjeta.
function carriesContent(entry: FeedEntry): boolean {
  return (
    entry.photo_url !== null ||
    (entry.note !== null && entry.note.trim() !== "") ||
    entry.comment_count > 0 ||
    entry.reactions.length > 0
  );
}

export function groupFeedEntries(entries: FeedEntry[]): FeedGroup[] {
  const groups: FeedGroup[] = [];

  for (const entry of entries) {
    const current = groups[groups.length - 1];
    const belongsToCurrent =
      current !== undefined &&
      current.entry.user_id === entry.user_id &&
      current.entry.activity.id === entry.activity.id &&
      new Date(current.entry.logged_at).getTime() - new Date(entry.logged_at).getTime() <=
        GROUP_WINDOW_MS &&
      // Ni la que llega se deja absorber, ni la que representa al grupo absorbe:
      // asi la regla es "con contenido, tarjeta propia" y no depende del orden
      // en que hayas registrado las cosas.
      !carriesContent(entry) &&
      !carriesContent(current.entry);

    if (belongsToCurrent) {
      current.count += 1;
      current.amount += entry.amount;
      continue;
    }

    groups.push({ entry, count: 1, amount: entry.amount });
  }

  return groups;
}

export const BATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

export type FeedItem =
  | { kind: "single"; group: FeedGroup }
  | { kind: "batch"; key: string; groups: FeedGroup[] };

// Lo que se publica de verdad (foto o nota) va siempre en su propia tarjeta.
function isPost(entry: FeedEntry): boolean {
  return entry.photo_url !== null || (entry.note !== null && entry.note.trim() !== "");
}

// Segundo nivel, el del muro de Strava: el dia de cada persona en una tarjeta.
// Agua, comida, ejercicio y lectura de la misma persona en la misma tarde eran
// cuatro tarjetas seguidas con la misma cara; ahora son una con cuatro filas.
//
// Las reacciones y los comentarios no rompen el lote: siguen siendo de cada
// registro y se ven en su fila. Lo que si lo rompe es una publicacion (foto o
// nota), que merece tarjeta propia, y que pase la ventana desde la primera.
export function batchFeedGroups(groups: FeedGroup[]): FeedItem[] {
  const items: FeedItem[] = [];
  let run: FeedGroup[] = [];

  const flush = () => {
    if (run.length === 1) items.push({ kind: "single", group: run[0] });
    else if (run.length > 1) items.push({ kind: "batch", key: `batch-${run[0].entry.id}`, groups: run });
    run = [];
  };

  for (const group of groups) {
    if (isPost(group.entry)) {
      flush();
      items.push({ kind: "single", group });
      continue;
    }

    const head = run[0];
    const joins =
      head !== undefined &&
      head.entry.user_id === group.entry.user_id &&
      new Date(head.entry.logged_at).getTime() - new Date(group.entry.logged_at).getTime() <=
        BATCH_WINDOW_MS;

    if (!joins) flush();
    run.push(group);
  }

  flush();
  return items;
}
