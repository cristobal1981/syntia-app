# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuario primario: clientes de la gestoría (tenaasesores) que acceden al portal Syntia para consultar el estado de sus trámites y consultas — tareas y tickets de contabilidad/fiscalidad gestionados internamente en Odoo. No hay presión de plazo real asociada a esta pantalla (confirmado por el usuario) — es consulta de estado, no un flujo con countdown.

Usuario secundario: personal interno de la gestoría (asesores/staff) con vistas de administración del portal (equipo, automatizaciones, solicitudes de alta) fuera del alcance de este redisño de `/tramites`.

## Product Purpose

Syntia es la plataforma digital de la asesoría tenaasesores: portal de cliente para seguir trámites, consultas, obligaciones fiscales, firmas y documentos sin necesidad de llamar o escribir directamente al asesor para "¿cómo va esto?". Claim de marca: "Digitaliza. Innova. Crece." — posicionado como asesoría clara, moderna y cercana.

## Positioning

Lo que un portal de gestoría genérico (ticketing reskinizado) no puede copiar sin rehacer trabajo real:

- **El ERP interno (Odoo) nunca se expone al cliente** — ni en copy de error, ni en vocabulario, ni en artefactos visuales. Todo se traduce a lenguaje de cliente antes de llegar a la UI. (Este principio motivó el fix de "Odoo" filtrado al copy de error, hecho en la sesión de critique previa a este redisño.)
- **Trámite vs. Consulta es una distinción funcional real, no cosmética** — mapea a task vs. ticket en Odoo con lógica de merge/filtro propia, estados propios, y reglas de cierre distintas (una consulta cerrada es de solo lectura; un trámite cerrado sigue permitiendo respuesta).
- **El sistema de tokens de marca llega hasta el detalle funcional** — burbuja de chat del cliente, badges de estado/tipo, no solo páginas de marketing.

## Operating Context

- El cliente entra al portal para revisar novedades: nuevos mensajes del asesor, documentos nuevos, cambios de estado — sin presión de plazo pero sí con relevancia real (correspondencia fiscal/legal).
- Backend: Odoo Enterprise self-hosted, single multi-company DB, acceso mediado por el portal (nunca acceso directo del cliente a Odoo). Ver `[[project_verifactu_odoo_architecture]]` en memoria del agente para el porqué arquitectónico.
- Sensibilidad de coste de peticiones a Odoo: minimizar/evitar llamadas duplicadas es una restricción activa en todo el código de este módulo (sync entre pestañas ya construido para evitar re-pedir lo mismo dos veces).
- Datos de prueba disponibles ahora mismo en el entorno de desarrollo (localhost:3000, cuenta "Guillermo Probando Pruebas"): el trámite **"12_Nominas Diciembre 2026"** tiene chatter poblado con mensajes, un adjunto PDF, y notificaciones activas incluyendo el estado nuevo "Cambios solicitados" — usar como caso de referencia real durante el redisño en vez de datos sintéticos.

## Capabilities and Constraints

- Next.js 16 / React 19 / TypeScript estricto / Tailwind CSS 4.
- Arquitectura modular por dominio (`domain` / `application` / `infrastructure` / `ui`) bajo `src/modules/tramites` y `src/modules/portal`.
- Componentes compartidos ya existentes que el redisño debe reutilizar o reemplazar deliberadamente, no ignorar: `PortalRecordTable`, `PortalActionTooltip`, `RecordDetailTabs` (tablist ARIA correcto), `RecordChatterPanel`, `TaskStateBadge`.
- Estados de trámite: `01_in_progress`, `02_changes_requested` (nuevo, con badge propio naranja `badge-status-changes-requested`), `03_approved`, `04_waiting_normal`, done, canceled.
- Sync de notificaciones/chat entre pestañas es client-role-only por diseño (staff no tiene sync en vivo hoy — coste, no bug). Ver `[[project_portal_tab_sync]]`.

## Brand Commitments

- Nombre: **Syntia**, "by tenaasesores". Claim: "Digitaliza. Innova. Crece." Descripción: "Plataforma digital de asesoría: clara, moderna y cercana."
- Logos e isotipos en `public/brand/` (horizontal/vertical, positivo/negativo).
- Tokens de color ya establecidos en `app/globals.css`: `--primary` (teal/turquesa), `--turquesa`, `--agua`, `--service-fiscal` (ámbar), `--service-contable`, `--service-constitucion`, `--destructive`. El redisño de `/tramites` debe trabajar dentro de este sistema de tokens, no introducir una paleta paralela.

## Evidence on Hand

- Dos informes de critique previos en `.impeccable/critique/` sobre esta misma superficie (11 ago y 13 ago 2026) con hallazgos detallados de heurísticas, accesibilidad y specificity — tratar como evidencia de partida, no repetir el análisis desde cero.
- Cuenta de cliente de prueba real y poblada en el entorno de desarrollo (ver Operating Context) — usar para verificación visual en vez de inventar datos.
- Sin research de usuario formal, sin analytics citados, sin testimonios — no fabricar ninguno de los tres.

## Product Principles

1. El cliente nunca debe ver ni deducir que existe un ERP interno llamado Odoo.
2. Trámite y Consulta son dos modelos mentales distintos y deben seguir leyéndose como tales, no fusionarse en una tabla genérica.
3. Toda señal de "algo cambió" (nuevo mensaje, documento, cambio de estado, cambios solicitados) debe ser perceptible sin depender de hover con ratón.
4. Cada petición nueva a Odoo tiene coste — el redisño no debe introducir llamadas duplicadas donde el dato ya está disponible en el cliente o vía el sync entre pestañas existente.
5. La marca (tokens Syntia) se aplica hasta el detalle funcional, no solo en superficie.

## Accessibility & Inclusion

Buena práctica activa (teclado, foco visible, `aria-label`/roles correctos, contraste), sin mandato formal WCAG AA conocido — confirmado por el usuario. Los P1 de accesibilidad de teclado ya identificados en el critique (iconos de notificación sin `tabIndex`, fila de tabla sin fallback de teclado) forman parte del alcance de este redisño.
