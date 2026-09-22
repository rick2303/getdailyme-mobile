import { daysBetweenKeys, shiftDateKey } from "@/lib/utils/dates";

// Hitos de la pareja, calculados solos desde una sola fecha.
//
// Deliberadamente pocos. Si salta uno cada dos semanas deja de ser un hito y
// pasa a ser ruido, que es el error que cometen casi todas: D+100, D+200,
// D+300, D+400... Aqui solo hay dos clases, y la segunda se espacia sola.

// El unico hito por dias sueltos que se celebra.
//
// Y solo uno: 365 estuvo aqui y sobraba, porque 365 dias ES el primer
// aniversario. Tenerlo en las dos listas hacia que el mismo dia se anunciara
// como "los 365 dias" o como "vuestro primer ano" segun cual ganara el
// desempate, que es la clase de incoherencia que nadie sabe explicar pero
// todo el mundo nota.
const DAY_MARKS = [100] as const;

export type Milestone = {
  /** Que se cumple: 100 dias, o N anos. */
  kind: "days" | "years";
  value: number;
  /** El dia en que cae, en clave de fecha. */
  on: string;
  /** Cuantos dias faltan. Cero es hoy. */
  in: number;
};

/**
 * El siguiente hito a partir de hoy, o null si no queda ninguno cerca.
 *
 * `daysTogether` cuenta de forma inclusiva —el primer dia ya es el dia 1—, asi
 * que el dia 100 cae 99 dias despues del aniversario. Restarlo aqui evita que
 * la tarjeta y el contador se lleven la contraria por uno.
 */
export function nextMilestone(startedOn: string, today: string): Milestone | null {
  const elapsed = daysBetweenKeys(startedOn, today) + 1;

  const candidates: Milestone[] = [];

  for (const mark of DAY_MARKS) {
    if (elapsed <= mark) {
      candidates.push({
        kind: "days",
        value: mark,
        on: shiftDateKey(startedOn, mark - 1),
        in: mark - elapsed,
      });
    }
  }

  // El aniversario que viene. A partir del primer ano, los hitos son anuales y
  // nada mas: no hacen falta marcas intermedias cuando ya hay una fecha que la
  // gente celebra por su cuenta.
  const years = Math.max(1, Math.floor(elapsed / 365) + 1);
  const anniversaryOn = shiftDateKey(startedOn, years * 365 - 1);
  candidates.push({
    kind: "years",
    value: years,
    on: anniversaryOn,
    in: daysBetweenKeys(today, anniversaryOn),
  });

  const upcoming = candidates.filter((milestone) => milestone.in >= 0);
  if (upcoming.length === 0) return null;

  return upcoming.reduce((closest, milestone) =>
    milestone.in < closest.in ? milestone : closest,
  );
}
