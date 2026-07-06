# Gobernanza de la Declaración Responsable (DR) VERI*FACTU

> Política interna de Royers Hub/Tena Asesores para mantener la cobertura de la DR de Odoo S.A. y no convertirse en productor de SIF sin quererlo. Contexto: `verifactu-requisitos-tecnicos.md` §5 y §9 (D6).

## 1. Principio rector

**El SIF es Odoo.** syntia-app es un cliente de captura de datos que crea/lee facturas por la API estándar. La DR de Odoo S.A. cubre el módulo `l10n_es_edi_verifactu` **sin modificar**. Cualquier código nuestro que toque generación, huella, firma o remisión de registros nos convierte en productor de esa parte → DR propia + certificación por versión + riesgo sancionador de fabricante (hasta 150.000 €).

## 2. Política "no tocar" (obligatoria)

Prohibido sin decisión expresa de dirección:
- Instalar módulos custom/OCA que hereden o parcheen `l10n_es_edi_verifactu` (modelos, huella, XML, cron de envío).
- Server actions de Odoo Studio o automatizaciones que escriban sobre `account.move` posteadas o sobre los documentos Verifactu.
- En syntia-app: cualquier `write`/`unlink` sobre `account.move` emitidas (el repositorio `odoo-account-move-repository.ts` no lo expone a propósito — mantenerlo así en revisión de código).

Permitido (no afecta a la DR de Odoo): crear borradores, postear, disparar Send & Print, leer estados, descargar PDF, crear rectificativas/anulaciones por los flujos estándar.

## 3. Archivo de DRs de Odoo

- Al confirmar la versión de Odoo desplegada (runbook A2), descargar su DR y archivarla en el Drive interno (carpeta "Verifactu/DR-Odoo/<versión>").
- En **cada upgrade de Odoo** (SaaS lo hace solo — vigilar los emails de upgrade): re-descargar la DR de la nueva versión y archivarla. Registrar fecha del upgrade.
- Conservar todas las DRs de todas las versiones usadas (obligación de conservación §5 del doc de requisitos).

## 4. Checklist en cada upgrade de Odoo

1. ¿Sigue instalado `l10n_es_edi_verifactu` y sin módulos que lo extiendan? (`ir.module.module` filtrado por verifactu)
2. ¿Cambió el flujo Send & Print o los nombres de wizard? → revisar `postAndSendInvoice`/`triggerVerifactuSend` en `src/modules/facturacion/infrastructure/odoo-account-move-repository.ts` y los valores del selection mapeados en `map-account-move.ts`.
3. ¿Añadió Odoo subsanación o IGIC? → actualizar runbook C2 y el proceso manual de incidencias.
4. Archivar nueva DR (punto 3).
5. Smoke test: emitir factura de prueba en company de test → estado `registered`.

## 5. Contingencia: DR propia (R6)

Si un criterio legal o de la AEAT concluye que syntia-app forma parte del SIF, o si algún día se desarrolla un módulo Odoo propio:
- Emitir DR propia según art. 13 Orden HAC/1177/2024: por escrito, visible dentro del software en cada versión (apartado "Acerca de"), con identificación del sistema (`IdSistemaInformatico` de 2 caracteres, nombre comercial, tipología, funcionalidades), datos del productor, fecha y lugar. Sin firma electrónica.
- Indicar `TipoUsoPosibleSoloVerifactu = S` (lanzamiento solo VERI*FACTU).
- Nueva DR en **cada versión** que toque facturación → integrarlo en el pipeline de releases.
- Ejemplos oficiales: sede AEAT → SIF/VERI*FACTU → Información técnica → "Ejemplos de declaraciones responsables".

## 6. Personalizaciones por cliente

Desarrollos a medida sobre Odoo para un cliente concreto que afecten a generación/firma/remisión de registros deben certificarse por quien los realice (DR propia de esa modificación). Antes de aceptar un encargo así: evaluar con esta política en la mano.
