# VeriFactu: Requisitos técnicos para desarrollar software de facturación

> Basado en fuentes oficiales AEAT (Sede Electrónica, FAQ actualizadas a diciembre 2025/marzo 2026), Real Decreto 1007/2023 y Orden HAC/1177/2024. Recopilado el 2026-07-06 para el diseño técnico de un SIF (Sistema Informático de Facturación) de Royers Hub.

## 0. Aviso importante como fabricante (Royers Hub)

Si el software se **comercializa** a clientes autónomos, Royers Hub no es solo "usuario" del reglamento: es **productor de un SIF**, con obligaciones propias y plazo distinto (y más corto) que los clientes finales.

Los productores y comercializadores deben ofrecer sus productos adaptados totalmente al reglamento en el plazo máximo de nueve meses desde la entrada en vigor de la orden ministerial (29 de julio de 2025) que desarrolla las especificaciones técnicas. Es decir, el plazo para fabricantes venció el **29 de abril de 2026** — ya ha pasado. Para los clientes autónomos, el resto de obligados tributarios deberán tener operativos los sistemas informáticos adaptados antes del **1 de julio de 2027** (las empresas sujetas a Impuesto de Sociedades, antes del **1 de enero de 2027**).

## 1. Marco normativo (solo fuentes oficiales)

- **Ley 11/2021** (Ley Antifraude) → introduce el art. 29.2.j) LGT.
- **Real Decreto 1007/2023, de 5 de diciembre** → aprueba el **RRSIF** (Reglamento de Requisitos de los Sistemas Informáticos de Facturación).
- **Orden HAC/1177/2024, de 17 de octubre** (BOE 28-oct-2024) → desarrolla las especificaciones técnicas, funcionales y de contenido de los sistemas y programas informáticos que soporten los procesos de facturación, con especial consideración al sistema VERI*FACTU, y establece como contenido obligatorio de las facturas el código QR y la frase «Factura verificable en la sede electrónica de la AEAT» o «VERI*FACTU».
- **Real Decreto-ley 15/2025** y **Real Decreto 254/2025** → modificaciones posteriores (plazos y ámbito foral/SII).
- Página oficial de referencia: sede.agenciatributaria.gob.es → "Sistemas Informáticos de Facturación (SIF) y VERI*FACTU" (FAQ actualizadas a 5-dic-2025, última revisión de página 26-mar-2026).

## 2. A quién aplica (clientes autónomos)

Aplica a quien expida facturas mediante SIF y cumpla la "regla de los 4 NO": que no facture exclusivamente de forma manual, que no esté adscrito al SII, que no tenga domicilio fiscal en País Vasco o Navarra, y que no disponga de resolución de no aplicación. Los autónomos canarios entran de pleno: quedan sujetos a la aplicación del reglamento los obligados a expedir facturas radicados en Canarias, Ceuta o Melilla, entendiendo las referencias al IVA hechas al IGIC.

Importante para el diseño: si se usan hojas de cálculo o procesadores de texto exclusivamente para introducir datos, expedir/imprimir facturas y conservar la información, no se consideran SIF; pero si se usan para generar directamente libros registro de IVA/IRPF, contabilidad u otros resultados tributarios, sí se consideran SIF y deben cumplir el reglamento. Al hacer facturación + contabilidad integrada, el producto estará dentro del ámbito sin duda.

## 3. Las dos modalidades de cumplimiento

Hay que decidir qué se ofrece (o ambas, en modo "dual"):

**Modalidad VERI*FACTU**: el SIF remite cada registro de facturación a la AEAT en el momento de emitir la factura. A cambio, se simplifican algunos requisitos (no hace falta firma electrónica cualificada del registro, ni registro de eventos, ni comprobación de huellas).

**Modalidad NO VERI*FACTU**: el sistema conserva los registros localmente y no los envía automáticamente, pero debe:
- Firmar electrónicamente cada registro.
- Mantener un registro de eventos del sistema.
- Comprobar el encadenamiento de huellas al generar cada nuevo registro.

Dato clave: **no existe SIF que solo pueda ser NO VERI*FACTU**. No puede existir un SIF que únicamente funcione como sistema de emisión de facturas no verificables, porque el Reglamento obliga a que todos los SIF tengan la capacidad de ser VERI*FACTU, aunque luego el usuario no elija esa modalidad de funcionamiento. Y aunque el cliente elija no operar en VERI*FACTU, el sistema informático deberá tener capacidad de remitir por medios electrónicos a la Administración tributaria, de forma continuada, segura, correcta, íntegra, automática, consecutiva, instantánea y fehaciente, todos los registros de facturación generados. Esto significa: **hay que construir la integración de envío a la AEAT sí o sí**, aunque por defecto se deje desactivada.

## 4. Requisitos técnicos concretos a implementar

### 4.1 Registro de facturación (RF)
Por cada factura expedida (completa o simplificada) el sistema debe generar automáticamente un **registro de alta** con datos fiscales obligatorios definidos en el Anexo I de la OM, y un **registro de anulación** cuando proceda. El sistema debe garantizar la integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros de facturación que está obligado a generar por cada factura expedida, generando un fichero de alta de factura por cada una de las expedidas.

### 4.2 Huella / hash (encadenamiento)
- Algoritmo obligatorio: SHA-256 en todos los casos, para todos los tipos de registro.
- La huella se calcula solo sobre unos pocos datos relevantes del registro (distintos según sea de alta, anulación o evento), y el resultado se almacena en el propio registro como un campo más; esa huella debe incluirse también en el registro inmediatamente siguiente, formando el mecanismo de encadenamiento.
- Existe un documento técnico específico publicado por la AEAT ("Detalle de las especificaciones técnicas para la generación de la huella o hash de los registros") en la web de desarrolladores de la AEAT: imprescindible para implementar el cálculo exacto campo a campo.
- La huella del registro NO se incluye en el QR tributario (a diferencia de TicketBAI).
- Si se va dual (VERI*FACTU + no VERI*FACTU): los SIF VERI*FACTU no están obligados a comprobar huellas ni ofrecer funcionalidad para comprobarlas (lo hace la AEAT), pero un sistema no verificable sí debe ofrecer esa funcionalidad, y debe comprobar obligatoriamente el correcto encadenamiento al generar cada nuevo registro.

### 4.3 Firma electrónica
Solo obligatoria para registros no enviados a AEAT en tiempo real (modalidad no verificable). El tipo de firma electrónica a utilizar por los desarrolladores puede ser distinto del usado por la AEAT, siempre que sea firma cualificada y sirva para autenticar y hacer inmutable el contenido del registro de facturación de alta.

### 4.4 Código QR + leyenda
Obligatorio en **todas** las facturas (completas y simplificadas), en papel o digital, con la frase "Factura verificable en la sede electrónica de la AEAT" o "VERI*FACTU" cuando proceda, según especifica la Orden HAC/1177/2024. El QR permite al receptor cotejar la factura en la sede de la AEAT.

Especificaciones concretas del QR (Orden HAC/1177/2024 + documento técnico AEAT "Características del QR y especificaciones del servicio de cotejo"):
- Tamaño: entre **30x30 y 40x40 mm**, conforme a la norma **ISO/IEC 18004**.
- Contenido: una **URL del servicio de cotejo de la sede de la AEAT** con parámetros identificativos de la factura: NIF del emisor, número de serie+número de factura, fecha de expedición e importe total. **La huella (hash) NO se incluye en el QR** (a diferencia de TicketBAI).
- La leyenda «VERI*FACTU» / «Factura verificable en la sede electrónica de la AEAT» solo se incluye cuando el SIF opera en modalidad VERI*FACTU; en modalidad no verificable la factura lleva QR pero **sin** la leyenda.
- El QR se coloca en la parte superior de la factura, legible tanto en papel como en formato digital.

### 4.5 Registro de eventos
Obligatorio solo para sistemas que no operen (o no operen siempre) en modo VERI*FACTU: deberán disponer también de un "registro de eventos" del sistema conservado con requisitos de seguridad análogos a los aplicados a los registros de facturación.

### 4.6 Inalterabilidad / integridad (a nivel de arquitectura)
Cualquier operación sobre los registros de facturación, sea VERI*FACTU o no, debe ser registrada a través de un registro de facturación, por lo que el acceso desde el SIF a modificaciones directamente sobre la base de datos de registros ya emitidos no debe ser una operativa permitida. Es decir: **prohibido UPDATE/DELETE directo sobre facturas ya emitidas**; cualquier corrección debe generar un nuevo registro (de anulación/rectificación) trazable. No hay especificación de mecanismo concreto de BD: el Reglamento no dice nada sobre medidas concretas relacionadas con las bases de datos empleadas, sino que se centra en las medidas mínimas que debe cumplir el SIF; el sistema debe detectar el intento de efectuar cambios e impedirlos.

### 4.7 Capacidad de comunicación con AEAT (obligatoria en todo caso)
Aunque el cliente opte por no VERI*FACTU, el software debe tener la capacidad técnica lista para remitir registros mediante los servicios web de la AEAT (formato XML según especificaciones del Anexo I de la OM), y debe poder activarse en cualquier momento.

### 4.8 Conservación, accesibilidad y legibilidad
Los registros deben conservarse durante el plazo legal (mínimo el de prescripción tributaria), estar accesibles ante requerimiento y en formato legible/estándar para la AEAT.

### 4.9 Disociación de datos con trascendencia tributaria
El SIF deberá tener una forma diferenciada de acceder a las funcionalidades y a los datos con trascendencia tributaria exigidos en el reglamento, de manera que quede preservada la confidencialidad de otros datos distintos, previsto sobre todo para el caso de una personación de la AEAT para inspeccionar in situ el SIF — relevante si se integra facturación con CRM u otros módulos con datos no fiscales en la misma app (típico en un ERP tipo Odoo).

### 4.10 Multi-entidad / multi-SIF
Cada usuario debe tener sus SIF adaptados a la normativa, pero eso no significa que deba tener solo un SIF; es lícito disponer de varios, especialmente con varios centros de negocio no interconectados, cada uno con su propio encadenamiento independiente. Importante para el diseño multi-tenant con varios autónomos/empresas sobre la misma infraestructura.

### 4.11 Servicio web de remisión a la AEAT (detalle técnico)
- Servicio **SOAP** `SistemaFacturacion` (operación de suministro de registros), mensajes XML según esquemas XSD del Anexo I. Conexión con **certificado electrónico cualificado** (mTLS): del obligado tributario, de un apoderado, o de un **colaborador social** (una asesoría con certificado de representante puede remitir registros de todos sus clientes).
- Endpoints: producción `https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP`; entorno de **pruebas externas** en `prewww1.aeat.es` (+ portal de pruebas/documentación en `preportal.aeat.es`). Existe entorno de pruebas abierto para validar antes de producción.
- **Control de flujo**: cada respuesta de la AEAT devuelve un parámetro de espera (`TiempoEsperaEnvio`, por defecto **60 segundos**). El SIF debe esperar ese tiempo desde el envío anterior **o** acumular hasta el límite de **1.000 registros por envío** antes de remitir de nuevo. Los registros se pueden agrupar en un mismo envío.
- **Estados de respuesta** por registro: `Correcto`, `AceptadoConErrores` (admitido pero con errores a subsanar) e `Incorrecto` (rechazado, no registrado). El SIF debe procesar la respuesta síncrona y gestionar reintentos.
- **Subsanación**: los registros rechazados o aceptados con errores se corrigen reenviando un registro de alta con `Subsanacion=S` (y `RechazoPrevio` cuando aplique).
- Existe además un **servicio de consulta** de registros remitidos (esquema ConsultaLR) para verificar lo que consta en la AEAT.
- Documentación oficial para desarrolladores (sede AEAT → SIF/VERI*FACTU → Información técnica): WSDL de los servicios web, esquemas XSD, documento de validaciones y errores, especificación de la huella, especificación de la firma electrónica, especificación del QR y servicio de cotejo, ejemplos de Declaración Responsable y FAQ de desarrolladores.

### 4.12 Contenido del registro y cálculo de la huella (detalle)
- **Tipos de factura** (`TipoFactura`): `F1` completa, `F2` simplificada, `F3` factura emitida en sustitución de simplificadas, `R1`–`R4` rectificativas por distintos motivos y `R5` rectificativa de simplificada. Rectificación por diferencias o por sustitución (`TipoRectificativa`).
- Campo `ClaveRegimen` (régimen de IVA/IGIC aplicable, listas L8A/L8B del Anexo I) y **desglose por tipo impositivo** con campo `Impuesto`: `01` IVA, `02` IPSI, `03` IGIC (clientes canarios).
- **Campos de la huella del registro de alta** (documento técnico AEAT de la huella): `IDEmisorFactura`, `NumSerieFactura`, `FechaExpedicionFactura`, `TipoFactura`, `CuotaTotal`, `ImporteTotal`, `Huella` (la del registro anterior) y `FechaHoraHusoGenRegistro`; se concatenan como `campo=valor&campo=valor…`, codificación UTF-8, SHA-256, resultado en hexadecimal mayúsculas (64 caracteres). `TipoHuella=01` (SHA-256).
- `FechaHoraHusoGenRegistro`: fecha-hora de generación del registro en formato **ISO 8601 con huso horario**.
- **Encadenamiento por obligado tributario**: la cadena de huellas es independiente **por NIF emisor** (no global del sistema); el primer registro de cada cadena se marca con `PrimerRegistro=S`, y los siguientes referencian el anterior en el bloque `Encadenamiento/RegistroAnterior` (IDEmisorFactura, NumSerieFactura, FechaExpedicionFactura, Huella).
- Cada registro incluye el bloque `SistemaInformatico` (NIF y nombre del productor, `IdSistemaInformatico` de 2 caracteres, versión, `NumeroInstalacion`, indicadores `TipoUsoPosibleSoloVerifactu`, `TipoUsoPosibleMultiOT`, `IndicadorMultiplesOT`).

### 4.13 Permanencia en modalidad y otros
- Quien opte voluntariamente por operar en VERI*FACTU debe **mantenerse en esa modalidad al menos hasta el final del año natural**; la renuncia se hace efectiva para el año siguiente.
- El **registro de eventos** (Anexo II de la OM) solo aplica a sistemas no verificables: tipos de evento tasados (arranque/parada, anomalías de integridad, exportaciones, resúmenes periódicos…), también encadenados y firmados.

## 5. Certificación: no hay homologación externa, es autocertificación

Esto afecta directamente al "go-to-market": para certificar un producto NO se requiere de procesos de certificación por entidades independientes; se trata de una "auto-certificación" del propio productor realizada como Declaración Responsable e incorporada al producto. No está previsto ningún registro previo del producto por parte de nadie.

Requisitos de esa Declaración Responsable:
- Debe constar por escrito y de modo visible dentro del propio sistema informático en cada una de sus versiones, así como estar disponible para el cliente y comercializador en el momento de adquisición del producto (recomendado: un apartado "Ayuda → Acerca de" dentro del software, y también publicada en la web).
- Debe incluir los datos que permitan identificar el sistema (tipología, composición, funcionalidades, características de instalación) y los datos identificativos del productor, fecha y lugar de la certificación. No requiere firma electrónica.
- Cada versión del producto, por pequeña que sea la variación, debe certificarse de nuevo, emitiendo una nueva Declaración Responsable — implicación directa para el pipeline de releases: cada deploy con cambios relevantes en el módulo de facturación necesita nueva DR.
- Debe indicarse un código identificador único de sistema ("IdSistemaInformatico") y su nombre comercial, siguiendo el formato del Anexo I de la OM (dos caracteres, letras mayúsculas o dígitos).
- Debe indicarse si el sistema es "solo VERI*FACTU" o "dual" (campo `TipoUsoPosibleSoloVerifactu`, valores S/N).
- Deben conservarse todas las certificaciones de todas las versiones desde el momento en que la normativa lo exija.
- Si se integran componentes de terceros o se hacen desarrollos a medida para un cliente concreto que afecten a la generación/firma/remisión de registros: esas modificaciones también deben certificarse por quien las realiza, incorporando su propia Declaración Responsable — relevante para personalizaciones cliente a cliente sobre Odoo.
- Si se usan librerías de código abierto: la empresa que integre el código, sea o no abierto, debe hacer la declaración responsable y se hace responsable de su funcionamiento, incluyendo los sistemas de seguridad exigidos.

## 6. Sanciones (para dimensionar el riesgo del proyecto)

- Hasta **150.000 €** por comercializar/producir/tener sistemas informáticos que no cumplan las especificaciones (recae principalmente sobre el fabricante, en este caso Royers Hub).
- Hasta **50.000 €** por ejercicio para el usuario por tenencia de sistemas que debieran estar certificados y no lo estén, o que hayan sido alterados tras su certificación.

## 7. Recomendaciones prácticas para el desarrollo

1. **Empezar por el diseño "solo VERI*FACTU"** para simplificar el MVP: libra de implementar firma electrónica cualificada, registro de eventos y verificación de huellas en local — solo generar el registro, calcular el hash, encadenar y enviar en tiempo real. Se puede añadir el modo no verificable después si algún cliente lo pide.
2. **Descargar los documentos técnicos de la AEAT para desarrolladores** (especificaciones del hash, diseños de registro XML del Anexo I, esquemas WSDL de los servicios web) desde `agenciatributaria.es` (sección Desarrolladores → IVA → VERI*FACTU) antes de tocar código: son la única fuente fiable del formato exacto de campos.
3. **Diseñar la capa de persistencia con append-only** para los registros de facturación (nada de UPDATE/DELETE sobre facturas emitidas), separada claramente del resto de datos de gestión (arts. de disociación de acceso).
4. Al comercializarse, preparar ya la plantilla de Declaración Responsable y el proceso de versión-a-versión desde el primer release, no como algo posterior.
5. Al ser partner de Odoo: si esto se construye como módulo add-on sobre Odoo Enterprise, tener en cuenta que si Odoo ya trae compatibilidad Verifactu nativa, cualquier ampliación que toque generación/firma/remisión de registros obliga a certificar esa ampliación de forma independiente (ver punto 5).

## 8. Próximos pasos a discutir

- Diseño concreto del esquema del registro de alta/anulación (campos del Anexo I).
- Flujo de integración con los servicios web de la AEAT para el envío en modo VERI*FACTU.

## 9. Decisión de arquitectura (2026-07-06)

**Ruta elegida: Odoo Enterprise multi-company como SIF + syntia-app como UI/orquestador.** Modalidad de lanzamiento: **solo VERI*FACTU**. Certificado de envío: **colaborador social** (certificado de representante de Tena Asesores).

- 1 `res.company` de Odoo por cliente autónomo (multi-company sobre la misma BD; los portal users son gratuitos y la facturación vía API no consume seats Enterprise).
- Se reutiliza el módulo nativo `l10n_es_edi_verifactu` de Odoo **sin modificarlo** → se hereda la Declaración Responsable de Odoo S.A. (Royers Hub evita la autocertificación propia mientras no toque generación/huella/firma/remisión).
- syntia-app crea/lee facturas vía JSON-2 API (`account.move`) con contexto de company; nunca genera QR/XML/huella ni escribe sobre facturas emitidas.

Hallazgos técnicos que condicionan el diseño (verificados contra código Odoo 18 y docs AEAT):

| # | Hallazgo | Consecuencia |
|---|----------|--------------|
| D1 | `l10n_es_edi_verifactu` es multi-company nativo: `l10n_es_edi_verifactu_required`, `..._test_environment` (default true), `..._certificate_ids` (por company), `..._chain_sequence_id` → cadena de huellas independiente por NIF | Requisito multi-SIF (§4.10) cumplido de serie |
| D2 | El registro Verifactu NO se crea en `action_post`: lo encola el flujo Send & Print (`account.move.send` → `_l10n_es_edi_verifactu_mark_for_next_batch`); envío asíncrono por cron de Odoo con control de flujo (60 s / máx 1000) | La app debe disparar el envío explícitamente tras postear; único punto de emisión en el repositorio |
| D3 | El módulo stock es **solo VERI*FACTU**: sin firma cualificada local, sin registro de eventos Anexo II, sin verificación local de huellas; subsanación de registros remitidos no soportada | Modo dual pospuesto (exigiría módulo custom + DR propia); subsanación: proceso manual |
| D4 | QR + leyenda en el PDF los genera Odoo (`_compute_l10n_es_edi_verifactu_qr_code`); anulación vía `l10n_es_edi_verifactu_button_cancel()` | syntia-app no necesita dependencias de PDF/QR/XML |
| D5 | Soporte IGIC/Canarias en el módulo: sin evidencia | Verificar en portal de pruebas antes de dar de alta clientes canarios |
| D6 | Calificación de syntia-app como "parte del SIF": postura defendible = el SIF es Odoo y syntia-app un cliente de captura de datos | Obtener criterio legal; plantilla de DR propia preparada como contingencia |
