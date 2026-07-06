# Runbook VERI*FACTU — Odoo multi-company

> Operativa de configuración y validación del SIF (Odoo + `l10n_es_edi_verifactu`). Se rellena durante la Fase 1. Ver decisiones en `verifactu-requisitos-tecnicos.md` §9.

## A. Administrativo (acciones manuales, sin código)

### A1. Colaborador social
- [ ] Certificado de representante de Tena Asesores vigente (emisor, caducidad: ___).
- [ ] Alta/verificación en el censo de colaboradores sociales de la AEAT.
- [ ] Confirmar que la remisión VERI*FACTU de registros de terceros está habilitada para los NIF de los clientes (¿exige AEAT apoderamiento por cliente? → documentar respuesta).

### A2. Versión Odoo y Declaración Responsable
- [ ] Versión/edición de Odoo desplegada: ___ (JSON-2 `/json/2/` ⇒ Odoo 19 SaaS previsiblemente).
- [ ] `l10n_es_edi_verifactu` disponible e instalado: ___.
- [ ] Declaración Responsable de Odoo S.A. de esa versión descargada y archivada en: ___ (re-archivar en cada upgrade).

## B. Configuración de company piloto (C1)

- [ ] Crear `res.company` de prueba (NIF de pruebas): id=___.
- [ ] Plan contable español aplicado (variante: ___). Canarias/IGIC: resultado de verificación → ___ (riesgo R4).
- [ ] `l10n_es_edi_verifactu_required = True`.
- [ ] `l10n_es_edi_verifactu_test_environment = True` (NO pasar a producción hasta superar la matriz C2).
- [ ] Certificado subido a `l10n_es_edi_verifactu_certificate_ids` (¿admite cert compartido `company_id=False`? → ___).

## C. Matriz de validación en portal de pruebas AEAT (C2)

| Caso | Resultado | Notas |
|------|-----------|-------|
| F1 completa → `registered` | | |
| F2 simplificada → `registered` | | |
| Rectificativa por diferencias (R1) | | |
| Rectificativa por sustitución | | |
| Anulación (`l10n_es_edi_verifactu_button_cancel`) | | |
| QR + leyenda en PDF (tamaño 30–40 mm, cotejo en sede) | | |
| Cadena de huellas: 3+ facturas × 2 companies, sin cruce | | |
| Rechazo simulado (NIF receptor inválido) → estado + detalle error | | |
| `AceptadoConErrores` → visibilidad del error | | |
| Factura IGIC (company canaria de prueba) | | R4 |

**Verificación crítica D2/R3** — llamada exacta que dispara el registro Verifactu vía API:
- [ ] ¿`action_post` solo lo dispara? → ___
- [ ] Si no: secuencia wizard `account.move.send` (método/params exactos por JSON-2): ___
- [ ] Nombre exacto del modelo de documento Verifactu (¿`l10n_es_edi_verifactu.document`?): ___
- Resultado → implementar en `postAndSendInvoice` (`src/modules/facturacion/infrastructure/odoo-account-move-repository.ts`).

## D. Service account API (C3)

- [ ] Añadir cada company nueva a `company_ids` del usuario de servicio (proceso al provisionar).
- [ ] Spike JSON-2: `context.allowed_company_ids` respetado en create/read/wizards → ___ (riesgo R7).
- [ ] Timeout observado en `action_post` + send wizard: ___ ms (ajustar `timeoutMs`, riesgo R8).

## E. Paso a producción (por company)

1. Matriz C completa en entorno de pruebas.
2. `l10n_es_edi_verifactu_test_environment = False` solo para esa company.
3. Primera factura real cotejada vía QR en sede AEAT.
4. Registrar fecha de activación: la permanencia en VERI*FACTU es hasta fin de año natural (§4.13).

## F. Operativa de incidencias

- Registros `Incorrecto` / `AceptadoConErrores`: subsanación NO soportada por el módulo stock (D3) → proceso manual en backend Odoo; donde sea válido: anulación + reemisión. La UI de syntia solo señala y enlaza.
- Requerimiento/inspección AEAT: los registros viven en Odoo (SIF); acceso del inspector al módulo de facturación, no al CRM (disociación §4.9). Exportación XML desde la pestaña Verifactu de la factura.
- Renovación del certificado colaborador social: recargar en todas las companies (o cert compartido si B lo confirma). Fecha próxima renovación: ___.
