export const HEATMAP_DAYS = 119;
export const DAYS_PER_WEEK = 7;

// Un nombre de mes ocupa unas tres columnas; etiquetar dos seguidas los solapa.
const MIN_COLUMNS_BETWEEN_MONTHS = 3;

export type HeatmapCell = { date: string; total: number };

// Cada columna es una semana de lunes a domingo. Los huecos del principio hacen
// que la ultima celda caiga en la fila del dia de la semana que sea hoy.
export function heatmapColumns(
  cells: HeatmapCell[],
  leadingBlanks: number,
): (HeatmapCell | null)[][] {
  const padded: (HeatmapCell | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...cells,
  ];

  const columns: (HeatmapCell | null)[][] = [];
  for (let index = 0; index < padded.length; index += DAYS_PER_WEEK) {
    columns.push(padded.slice(index, index + DAYS_PER_WEEK));
  }
  return columns;
}

// Devuelve, por columna, el dia que debe dar nombre al mes, o null si esa
// columna no lleva etiqueta. Se marca la primera columna de cada mes nuevo.
export function monthMarkers(columns: (HeatmapCell | null)[][]): (string | null)[] {
  const markers: (string | null)[] = [];
  let currentMonth = "";
  let lastLabelled = -MIN_COLUMNS_BETWEEN_MONTHS;

  columns.forEach((column, index) => {
    const first = column.find((cell): cell is HeatmapCell => cell !== null);
    if (!first) {
      markers.push(null);
      return;
    }

    const month = first.date.slice(0, 7);
    const changed = month !== currentMonth;
    currentMonth = month;

    if (changed && index - lastLabelled >= MIN_COLUMNS_BETWEEN_MONTHS) {
      lastLabelled = index;
      markers.push(first.date);
      return;
    }

    markers.push(null);
  });

  return markers;
}
