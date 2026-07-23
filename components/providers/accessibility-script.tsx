/*
 * Script bloqueante que aplica las preferencias de accesibilidad guardadas
 * antes del primer pintado (mismo mecanismo que next-themes) para evitar
 * un destello de contenido sin escalar. Debe ir como primer hijo de <body>.
 * La clave y los valores deben coincidir con accessibility-provider.tsx.
 */
const script = `(function(){try{var s=JSON.parse(localStorage.getItem('syntia-a11y')||'null');if(!s)return;var el=document.documentElement;if(['sm','lg','xl'].indexOf(s.fontScale)>-1)el.setAttribute('data-font-scale',s.fontScale);if(s.highContrast===true)el.classList.add('hc');if(s.underlineLinks===true)el.classList.add('a11y-underline');}catch(e){}})();`

export function AccessibilityScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
