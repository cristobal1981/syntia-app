# Google Drive: configuración de la cuenta de servicio (SA)

Guía paso a paso para dejar listo el acceso de los clientes a su carpeta **Pública** del Shared Drive, sin que puedan ver nada más.

Cada paso indica **quién** lo hace: **[Propietario]** (dueño o administrador del Shared Drive / Google Workspace) o **[Dev]** (quien mantiene la app).

## 1. Qué vamos a montar y por qué

Los clientes **no tienen cuenta de Google**. Entran al portal y el portal habla con Drive en su nombre usando **una sola cuenta de servicio (SA)**: una "cuenta robot" de Google que solo usa la aplicación.

Estructura actual del Shared Drive:

```
Shared Drive
└── Carpeta de Cliente A
    ├── Pública      ← el cliente A ve y sube aquí
    └── (resto)      ← privado, el cliente NO lo ve
└── Carpeta de Cliente B
    ├── Pública
    └── (resto)
```

**Regla de oro (lista blanca):** el SA **no se añade al Shared Drive**. Solo se le **comparte, una a una, cada carpeta Pública**. Así el SA físicamente no puede ver nada que no sea una Pública:

- Si algún día falla la aplicación, el SA no puede llegar a las carpetas privadas.
- Si se olvida compartir una Pública con el SA, ese cliente simplemente no ve documentos (falla de forma segura, no filtra nada).
- La separación **entre clientes** la hace la aplicación (cada cliente solo puede usar el ID de su carpeta, guardado en la base de datos).

### Qué NO hacer nunca
- No añadir el SA como miembro del Shared Drive.
- No compartir con el SA la carpeta del cliente ni la raíz del Shared Drive, solo la Pública.
- No activar la "delegación en todo el dominio" (*domain-wide delegation*). Daría al SA la capacidad de actuar como cualquier usuario de la empresa.
- No enviar la clave del SA por correo, chat ni guardarla en el repositorio.

---

## 2. Crear el proyecto y la cuenta de servicio

**Quién:** [Dev], con una cuenta de Google que pueda crear proyectos. No necesita ser el propietario del Shared Drive.

1. Entrar en <https://console.cloud.google.com>.
2. Arriba, selector de proyecto → **Proyecto nuevo**. Nombre sugerido: `syntia-portal-drive`. Crear y seleccionarlo.
3. Menú → **APIs y servicios → Biblioteca** → buscar **Google Drive API** → **Habilitar**.
4. Menú → **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**.
   - Nombre: `portal-drive`.
   - En el paso "Conceder acceso al proyecto": **no asignar ningún rol**. Continuar y Listo.
5. Abrir la cuenta creada y **copiar su correo**. Tiene esta forma:
   `portal-drive@syntia-portal-drive.iam.gserviceaccount.com`
   Este correo se enviará al propietario en el paso 4.
6. En la pestaña **Detalles** comprobar que **no** está activada la delegación en todo el dominio.

**Comprobación:** existe la cuenta, tiene correo `...iam.gserviceaccount.com`, sin roles de proyecto.

---

## 3. Generar la clave del SA

**Quién:** [Dev].

1. En la cuenta `portal-drive` → pestaña **Claves → Agregar clave → Crear clave nueva → JSON → Crear**.
2. Se descarga un archivo `.json`. Contiene dos datos que necesitamos: `client_email` y `private_key`.
3. **Si aparece el error "Key creation is not allowed on this service account"**: la política de organización `iam.disableServiceAccountKeyCreation` lo bloquea. Seguir el apartado **3.A** de abajo y volver a este paso.
4. Guardar el archivo en un gestor de contraseñas. **No** subirlo al repositorio ni enviarlo por chat o correo.
5. Cuando esté configurado en Vercel (paso 7), **borrar el archivo descargado**.

### 3.A Desbloquear la creación de claves (política de organización)

**Quién:** [Dev] con cuenta de administrador de Workspace.

La política *"Disable service account key creation"* (`iam.disableServiceAccountKeyCreation`) viene activada por defecto en las organizaciones de Workspace nuevas. Se desactiva **solo para este proyecto**; el resto de la organización sigue protegido.

1. En <https://console.cloud.google.com>, selector de proyecto (arriba) → seleccionar la **organización** (el dominio), no el proyecto.
2. **IAM y administración → IAM**. Comprobar que tu usuario tiene el rol **Administrador de políticas de la organización** (`roles/orgpolicy.policyAdmin`). Ser super admin de Workspace **no** lo da automáticamente.
   - Si falta: **Otorgar acceso** → tu correo → rol *Administrador de políticas de la organización* → Guardar. Hacerlo a nivel de organización.
3. Volver a seleccionar el **proyecto** `syntia-portal-drive`.
4. **IAM y administración → Políticas de la organización**.
5. Buscar *"Disable service account key creation"* y abrirla. Si aparecen dos políticas (una con `managed` en el ID), repetir el proceso con ambas.
6. **Administrar política** → **Anular la política del elemento superior** → **Aplicación: desactivada (Off)** → **Establecer política**.
7. Esperar 1 o 2 minutos y repetir el paso 3.1 (Claves → Agregar clave → JSON).

**Alternativa sin clave (más segura, para más adelante):** federación OIDC de Vercel con Google (*Workload Identity Federation*). Vercel emite un token temporal y Google lo canjea por acceso, sin archivo JSON que pueda filtrarse. Requiere más configuración inicial y un cambio pequeño en `src/modules/documents/infrastructure/google-drive-auth.ts`. Para avanzar ya, la excepción en este proyecto es razonable.

---

## 4. Preparar el Shared Drive

**Quién:** [Propietario] (o un administrador con rol **Gestor** del Shared Drive).

### 4.1 Permitir compartir carpetas con personas que no son miembros
1. Abrir Google Drive → **Unidades compartidas** → clic derecho en la unidad → **Administrar miembros / Configuración de la unidad compartida**.
2. En **Configuración** buscar una opción del tipo *"Permitir que las personas que no son miembros de la unidad compartida accedan a los archivos"* / *"Los gestores pueden compartir con quien no es miembro"*. **Activarla.** (El texto exacto puede variar según la versión de Google.)

### 4.2 Permitir compartir fuera de la organización
El correo del SA termina en `gserviceaccount.com`, que Google trata como una cuenta **externa** a vuestra empresa.

1. Entrar en <https://admin.google.com> (administrador de Workspace).
2. **Aplicaciones → Google Workspace → Drive y Documentos → Configuración de uso compartido**.
3. Si el uso compartido fuera de la organización está **desactivado**, hay que permitirlo para esta unidad o añadir una excepción. Si se limita a una lista de dominios permitidos, comprobar si admite la cuenta de servicio (puede requerir probarlo).

> Este es el paso que más suele bloquearse. Si en el paso 5 la carpeta de prueba **no se puede compartir** con el correo del SA, la causa es esta.

**Comprobación:** el propietario confirma por escrito que 4.1 está activado y que 4.2 permite compartir con el correo del SA.

---

## 5. Prueba con una carpeta de test

**Quién:** [Propietario] crea y comparte; [Dev] verifica.

Hacemos la prueba con datos ficticios antes de tocar ningún cliente real.

1. [Propietario] En el Shared Drive crear la carpeta `ZZ-TEST` y dentro `Pública` y `Privada`. Subir un archivo cualquiera a cada una.
2. [Propietario] Clic derecho en `ZZ-TEST/Pública` → **Compartir** → pegar el correo del SA → rol **Editor** → desmarcar "Notificar a las personas" → **Compartir**.
   - Compartir **solo** `Pública`. No `ZZ-TEST` ni `Privada`.
3. [Propietario] Enviar al Dev la URL de `ZZ-TEST/Pública`. Contiene el ID de la carpeta: es lo que aparece tras `/folders/`.
4. [Dev] Con las credenciales del SA, verificar:

   | Prueba | Resultado esperado |
   |---|---|
   | Listar la carpeta `Pública` | Funciona |
   | Descargar el archivo de `Pública` | Funciona |
   | Subir un archivo a `Pública` | Funciona |
   | Acceder a `ZZ-TEST` (la carpeta padre) | **Falla** (404 / sin permiso) |
   | Acceder a `ZZ-TEST/Privada` y su archivo | **Falla** |
   | Listar el Shared Drive entero | No devuelve nada más que la Pública compartida |
   | Borrar un archivo de `Pública` | Anotar si funciona o no |
   | Mover un archivo fuera de `Pública` | Anotar si funciona o no |

5. [Dev] Anotar el resultado de las dos últimas filas. La aplicación **no** ofrecerá borrar ni mover a los clientes, pero necesitamos saber hasta dónde llega el rol Editor para un no miembro.

**Comprobación:** las cuatro primeras filas dan el resultado esperado. Si "Privada" o el padre **son accesibles**, **parar**: el SA tiene más acceso del previsto (probablemente es miembro del Shared Drive). Revisar el paso 4 y los miembros de la unidad.

---

## 6. Proceso para cada cliente (alta)

**Quién:** el staff que da de alta al cliente.

1. En el Shared Drive, abrir la carpeta del cliente → clic derecho en `Pública` → **Compartir** → correo del SA → **Editor** → sin notificación.
2. Copiar la URL de esa carpeta `Pública`.
3. En el portal, alta o edición del cliente → pegar la URL (o el ID) en el campo de carpeta de Drive. La aplicación extrae el ID y rechaza valores con formato incorrecto. **No se puede asignar la misma carpeta a dos clientes.**
4. Comprobar que, con el cliente, el portal muestra la carpeta (vacía o con documentos).

> Si en el paso 3 se pega la URL de otra carpeta (no la Pública), el cliente vería esa carpeta. Siempre copiar la URL desde la carpeta `Pública`.

### Baja de un cliente
1. Quitar el correo del SA de la carpeta `Pública` (Compartir → quitar acceso).
2. Quitar el ID de la carpeta en el portal.

---

## 7. Configurar la aplicación (Vercel)

**Quién:** [Dev].

1. En Vercel → proyecto → **Settings → Environment Variables**:
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` = `client_email` del JSON.
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` = `private_key` del JSON, con los saltos de línea como `\n` literales (la aplicación los convierte).
2. Marcar ambas como **Sensitive** y asignarlas **solo al entorno Production**. No a Preview ni Development.
3. Para desarrollo local usar un SA de prueba distinto o el modo demo (`DRIVE_DOCUMENTS_MOCK=true`). No copiar la clave de producción a `.env.local`.
4. Desplegar y probar con `ZZ-TEST`.
5. Borrar el JSON descargado en el paso 3.

---

## 8. Mantenimiento

- **Rotar la clave** cada 90 días (o ante cualquier sospecha): crear clave nueva, actualizar Vercel, desplegar, comprobar, y **eliminar la clave antigua** en la consola de Google Cloud.
- **Revisión trimestral:** en la cuenta del SA ver qué carpetas tiene compartidas (o listar `sharedWithMe` con el SA) y compararlas con los clientes activos. Quitar las que sobren.
- **Si se sospecha una filtración de la clave:** eliminar la clave en Google Cloud inmediatamente (corta el acceso al instante), generar una nueva y actualizar Vercel. El Shared Drive no se ve afectado porque el SA nunca fue miembro.

---

## 9. Resumen / lista de verificación

| # | Paso | Quién | Hecho |
|---|---|---|---|
| 2 | Proyecto y SA creados, sin roles ni delegación | Dev | ☐ |
| 3 | Clave JSON generada y guardada en gestor de contraseñas | Dev | ☐ |
| 4.1 | Shared Drive permite compartir con no miembros | Propietario | ☐ |
| 4.2 | Workspace permite compartir con el correo del SA | Propietario | ☐ |
| 5 | Prueba `ZZ-TEST`: Pública accesible, padre y Privada **no** | Propietario + Dev | ☐ |
| 5 | Anotado qué puede hacer el rol Editor (borrar / mover) | Dev | ☐ |
| 7 | Variables en Vercel (Sensitive, solo Production) | Dev | ☐ |
| 7 | JSON descargado borrado | Dev | ☐ |
| 6 | Clientes existentes: compartir su Pública con el SA y cargar el ID | Staff | ☐ |
