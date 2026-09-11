# AGENTS.md

## Comandos
- `npm start` / `ng serve` — servidor dev en `http://localhost:4200` (auto-reload)
- `npm run build` / `ng build` — build prod a `dist/` (budgets: 500kB aviso / 1MB error initial)
- `npm run watch` / `ng build --watch --configuration development` — build dev en watch (sin optimización, con sourcemaps)
- `npm test` / `ng test` — tests unitarios con Vitest + jsdom (builder `@angular/build:unit-test`, no Karma)
- Sin scripts de lint/typecheck — usar `npx tsc --noEmit` manualmente para verificar tipos

Usar `npm@11.13.0` (campo `packageManager`). Proyecto único `frontSST` en `angular.json`.

## Stack
- Angular `21.2` con componentes standalone — `bootstrapApplication(App, appConfig)` en `src/main.ts:1`
- TypeScript `~5.9` en modo estricto (`tsconfig.json:5-22` — todos los `strict*`, `noImplicitReturns`, `isolatedModules`, `module: preserve`)
- Tailwind `4.3` + SCSS (`inlineStyleLanguage: scss`). Tailwind sin preflight: `src/styles.scss:9-13` importa `tailwindcss/theme.css` + `utilities.css` en layers.
- Vitest `4.0` + jsdom. Tipos globales desde `vitest/globals` en `tsconfig.spec.json:8`.

## Estructura
- Entrada: `src/main.ts` → `src/app/app.config.ts` (provee router + http) → `src/app/app.routes.ts` → `src/app/app.ts`
- Rutas: `/login` (`loginGuard`) + `MainLayout` autenticado con `authGuard` (`src/app/app.routes.ts:10-26`). Módulos hijos:
  - `farmacia` → `src/app/Modulos/Farmacia/rutasFarmacia.ts` (inventario, proveedores, ingresos, salidas)
  - `usuarios` → `src/app/Modulos/Usuarios/rutasUsuarios.ts` (usu, roles, horarios)
- Módulos: `src/app/Modulos/{Auth,Farmacia,Usuarios}/` — cada feature tiene `component.{ts,html,scss,spec.ts}` + opcional `data/` para servicios/interfaces (`*-service.ts`, `*Interfaz.ts`). Nombres en español (`Modulos`, `rutasFarmacia`, `principal-farmacia`).
- Compartido: `src/app/shared/{campo-validado,popUps,tab-switch}/`, `src/app/layout/{main-layout,menu-lateral,topbar}/`, `src/app/modal-principal/`
- Estilos globales: `src/styles.scss` delega a `src/styles/*.scss` (tableStyle, subMenuStyle, formularioStyle, botonesStyle, otrosStyle, popUpStyle) + `bootstrap-icons` + `fontawesome-free`. Variables CSS en `:root` (`src/styles.scss:31`).
- Assets: `public/` vía `angular.json:28`. Salida `dist/` ignorada en `.gitignore`.

## API / Entorno
- `src/environments/environment.ts:3` — `apiUrl: http://localhost:8080/api/v1` (no existe archivo prod; crear `environment.prod.ts` si hace falta). El backend debe correr en 8080 o actualizar la URL.
- `provideHttpClient()` en `app.config.ts:11` — aún sin interceptores configurados.

## Convenciones
- Componentes usan `style: scss` por defecto del schematic `angular.json:13`. Mantener `styleUrl: ./x.scss` junto al componente.
- Prettier: `printWidth: 100`, `singleQuote: true`, parser Angular para `*.html` (`.prettierrc:1-11`). EditorConfig: indentación 2 espacios, eliminar espacios finales (`.editorconfig:6-9`).
- `fix_indentation.py` en la raíz es un script puntual comentado — ignorar salvo que haya que corregir `ingresos.html` de nuevo.
- Proyecto único `frontSST`; sin monorepo, sin CI (`.github/` no existe), sin `opencode.json`.

## Testing
- Runner Vitest vía builder Angular — `ng test` queda en watch; para un solo archivo usar `npx ng test -- --run src/app/app.spec.ts` o `npx vitest run src/app/foo/foo.spec.ts`.
- Test desactualizado: `src/app/app.spec.ts:19` espera `<h1>Hello, frontSST</h1>` que `src/app/app.html` ya no renderiza — actualizar el test al tocar el componente App.
