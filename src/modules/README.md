# Módulos por dominio

Estructura objetivo para nuevas features en `syntia-app`:

```text
src/modules/<nombre>/
  domain/           # tipos y reglas de negocio puras
  application/      # casos de uso
  infrastructure/   # adaptadores a servicios externos
  ui/               # componentes y composición visual
    index.ts        # entrypoint público del módulo
```

## Reglas

1. La UI no debe contener lógica de integración externa compleja.
2. Los casos de uso (`application`) orquestan dominio + infraestructura.
3. El dominio no depende de framework ni de detalles de red.
4. Importar preferentemente desde entrypoints (`src/modules/*/ui/index.ts`).
5. El copy vive en `content/` (re-exportado desde `src/shared/config/`).

## Flujo para nuevas features

1. Crear tipos en `domain/`.
2. Implementar caso de uso en `application/`.
3. Conectar adaptador en `infrastructure/`.
4. Exponer UI desde `ui/index.ts`.
5. Consumir desde rutas en `app/`.
