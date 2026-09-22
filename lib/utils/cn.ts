import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// La escala tipografica de la casa usa nombres propios (text-headline,
// text-subhead, text-title-1...). tailwind-merge no los reconoce como tamanos
// y los tomaba por colores: en cn("text-brand-contrast", "text-headline") se
// quedaba con el ultimo y borraba el color. Resultado: TODOS los botones
// principales perdian el blanco y quedaban en texto casi negro sobre el azul
// de marca, que ademas no llega al contraste minimo.
//
// Declarando la escala como grupo font-size, color y tamano dejan de pelearse
// y cada uno anula solo a los de su especie.
const FONT_SIZES = [
  "hero",
  "large-title",
  "title-1",
  "title-2",
  "title-3",
  "headline",
  "body",
  "callout",
  "subhead",
  "footnote",
  "caption",
  "caption-2",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
