/**
 * Atributos para que el navegador y los gestores de contraseñas no ofrezcan
 * datos propios en campos que recogen datos de otras personas (clientes,
 * trabajadores, asuntos), búsquedas o ajustes. `autoComplete="off"` solo no
 * basta: Bitwarden lo ignora y usa `data-bwignore`; 1Password, `data-1p-ignore`;
 * LastPass, `data-lpignore`; Dashlane, `data-form-type`.
 *
 * No usar en login, cambio de contraseña ni en el perfil de la propia persona.
 */
export const NO_AUTOFILL = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-bwignore': 'true',
  'data-lpignore': 'true',
  'data-form-type': 'other',
} as const
