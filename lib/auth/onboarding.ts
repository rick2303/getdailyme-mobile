// En la web el onboarding se marca con cookie para que el proxy redirija sin
// consultar la base. Aqui no hay proxy: la navegacion decide con onboarded_at
// del perfil, asi que estas funciones existen solo por compatibilidad.
export function markOnboarded() {}

export function clearOnboardedCookie() {}
