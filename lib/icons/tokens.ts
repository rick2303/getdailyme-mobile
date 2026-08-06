// El trazo compensa el tamano: a 14px un trazo de 2 se ve mas fino que a 24px,
// asi que los glifos pequenos lo llevan mas grueso para pesar lo mismo. Habia
// ocho valores sueltos (2.1, 2.2, 2.4, 2.5, 2.6, 2.8, 3, 3.5) sin criterio.
//
// El trazo normal es el que trae lucide por defecto, asi que no se escribe: si
// un icono no lleva strokeWidth, es que va en el nivel de cuerpo.
export const ICON_STROKE = {
  // Glifos a 14-16px, donde un trazo fino desaparece: confirmaciones, insignias.
  tiny: 3,
  // Estados activos y acentos que deben destacar sobre su fila.
  emphasis: 2.5,
} as const;

// Tamanos con nombre para no repetir la escala a ojo. Los tres primeros cubren
// casi todo; xl queda para ilustraciones de estado vacio.
export const ICON_SIZE = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-7",
} as const;
