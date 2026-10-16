# AGENTS.md — Frontend Angular (frontSST)

> **Alcance:** este documento rige únicamente el frontend Angular. El backend Spring Boot es otro proyecto y puede no estar accesible desde este repositorio.
>
> **Principio principal:** haz exactamente lo solicitado con el **menor cambio seguro posible**. La profundidad del análisis, la limpieza y las verificaciones debe ser proporcional al tamaño y al riesgo de la tarea. **Una modificación pequeña no debe transformarse en una auditoría o refactorización general.**
>
> **Prioridades:** 1) comportamiento correcto; 2) sincronización UI/estado/backend y recuperación ante fallos; 3) conservar el diseño aprobado; 4) reutilizar recursos existentes; 5) mantener código claro y sin restos obsoletos; 6) eficiencia de ejecución.

## 1. Contexto técnico y convenciones del proyecto

### Tecnologías

- Proyecto Angular **21.2** (`frontSST`), con componentes **standalone**; arranque con `bootstrapApplication(App, appConfig)` en `src/main.ts`.
- TypeScript **~5.9** en modo estricto (`strict`, `noImplicitReturns`, `isolatedModules`, `module: preserve`, entre otros).
- Tailwind **4.3** y **SCSS**. Tailwind sin *preflight*: `src/styles.scss` importa `tailwindcss/theme.css` y `utilities.css` mediante *layers*.
- Pruebas con **Vitest** y **jsdom**, integradas mediante `@angular/build:unit-test` (no Karma). Verifica las versiones instaladas antes de usar opciones específicas.
- Gestor de paquetes declarado: `npm@11.13.0`. Proyecto único, sin monorepo.

### Estructura conocida

- Entrada: `src/main.ts` → `src/app/app.config.ts` → `src/app/app.routes.ts` → `src/app/app.ts`.
- Autenticación: ruta `/login` con `loginGuard`; `MainLayout` con `authGuard`.
- Módulos bajo `src/app/Modulos/`, entre ellos `Auth`, `Farmacia`, `Usuarios` y `Medica`. Revisar el árbol real antes de asumir que la lista es exhaustiva.
- Rutas propias conocidas: `src/app/Modulos/Farmacia/rutasFarmacia.ts` y `src/app/Modulos/Usuarios/rutasUsuarios.ts`.
- Convención de funcionalidades: archivos `.ts`, `.html`, `.scss` y, cuando existan, `.spec.ts`; carpetas `data/` para interfaces y servicios (`*-service.ts`, `*Interfaz.ts`). **Seguir nombres y patrones reales**, normalmente en español.
- Compartidos: `src/app/shared/campo-validado/`, `src/app/shared/popUps/`, `src/app/shared/tab-switch/`; distribución en `src/app/layout/`; modal general en `src/app/modal-principal/`.
- Estilos globales: `src/styles.scss` y `src/styles/` (`tableStyle`, `subMenuStyle`, `formularioStyle`, `botonesStyle`, `otrosStyle`, `popUpStyle`, entre otros). Variables CSS en `:root`; ya existen `bootstrap-icons` y `fontawesome-free`.
- Assets en `public/`; salida de compilación en `dist/`.
- La API se configura en `src/environments/environment.ts`, con URL de referencia `http://localhost:8080/api/v1`. `provideHttpClient()` se configura en `src/app/app.config.ts`. **Verifica el estado actual** antes de afirmar que existe o falta un interceptor.
- Formato: Prettier con `printWidth: 100` y `singleQuote: true`; HTML con parser Angular; EditorConfig con indentación de 2 espacios y sin espacios finales. Mantén `styleUrl` y la organización de cada componente según su patrón vigente.
- `fix_indentation.py` es un script puntual antiguo: no ejecutarlo salvo solicitud justificada.
- Se ha observado que `src/app/app.spec.ts` podía contener una expectativa antigua (`Hello, frontSST`). Si falla sin relación con la tarea, reportar el error preexistente, no corregirlo automáticamente.
- Se han observado fallos de *budgets* en un `ng build` anterior (bundle inicial y SCSS de `evaluacion`). **No asumir que siguen presentes sin comprobar** y no cambiar los límites de `angular.json` ni refactorizar estilos ajenos para resolverlos sin autorización.

### Comandos del proyecto

- `npm start` / `ng serve`: servidor de desarrollo en `http://localhost:4200` (**persistente; no usar para verificar una tarea puntual**).
- `npm run watch`: compilación continua (**no usar para verificaciones puntuales**).
- `npm run build` / `ng build`: compilación de producción a `dist/`; *budgets* inicialmente documentados: 500 kB de aviso y 1 MB de error para el bundle inicial.
- `npm test` / `ng test`: pruebas Angular con Vitest; **puede quedar en modo watch**.
- Para una ejecución puntual: `npx ng test --watch=false`; para un archivo concreto: `npx ng test --watch=false --include="src/app/ruta/componente.spec.ts"`, si la opción está admitida por el builder instalado.
- `npx tsc --noEmit`: comprobación de tipos TypeScript (no reemplaza la compilación y comprobación de plantillas de Angular; confirmar el `tsconfig` pertinente).
- No se han documentado scripts de `lint` o `typecheck`. No inventar scripts, ni instalar herramientas sin necesidad aprobada.

## 2. Regla prioritaria: alcance mínimo y velocidad

**Esta regla determina cómo interpretar las demás.** Las instrucciones posteriores sobre pruebas, análisis, comentarios, limpieza y reportes **no obligan a una auditoría general después de cambios pequeños**.

### Nivel 1 — Cambio mínimo (por defecto en ajustes visuales sencillos)

Ejemplos: cambiar una clase de botón, texto, color, margen, borde, alineación o espaciado existente.

1. Localiza únicamente el componente o estilo necesario; lee los fragmentos concretos, no archivos ni módulos enteros sin motivo.
2. **Edita exclusivamente lo solicitado**. Si piden cambiar clases HTML, no reestructures contenedores, no extraigas reglas SCSS y no crees nuevas clases globales salvo necesidad real y autorizada.
3. No crees ni modifiques archivos `.spec.ts` por cambios de clases, textos o estilos; no ejecutes Vitest, `tsc`, `ng build` ni comandos de inspección amplios por rutina.
4. Verifica visualmente el *diff* o los fragmentos editados: clase correcta, sintaxis intacta, sin residuos directamente generados por el cambio. Finaliza.
5. No ejecutes búsquedas en todos los módulos para “homogeneizar” componentes que el usuario no mencionó. No cambies recursos globales con impacto en otras pantallas sin autorización.
6. El reporte debe tener **una o dos frases**: qué se cambió y, si procede, que no se ejecutaron pruebas por tratarse de un ajuste estático.

### Nivel 2 — Cambio funcional localizado

Ejemplos: una validación, un evento, la lógica de un botón, un formulario o una función TypeScript.

1. Lee los archivos afectados y sus dependencias directas.
2. Implementa, comprueba el flujo y limpia únicamente el código que el cambio dejó obsoleto.
3. Comprueba tipos, pruebas dirigidas o plantillas **solo si aportan valor para el comportamiento modificado**.
4. Evita ejecutar una suite completa o `ng build` de producción sin un riesgo concreto que lo justifique.

### Nivel 3 — Pantalla completa, integración o refactorización importante

1. Examina la estructura relacionada; reutiliza componentes, servicios, estilos e interfaces existentes.
2. Divide internamente el trabajo en pasos coherentes cuando sea necesario, sin obligar al usuario a pedir archivo por archivo.
3. Ejecuta verificaciones específicas y amplíalas al build o a suites mayores según dependencias e impacto real.
4. Realiza auditoría enfocada y reporte de los resultados y riesgos.

### Límites aplicables a todos los niveles

- **No ampliar el alcance sin permiso.** Si es imprescindible cambiar un estilo compartido, una API pública, otro módulo o muchos archivos, explica el impacto y pide autorización antes de extender el trabajo.
- **No crear trabajo artificial:** no añadir funcionalidades, pruebas de clases CSS, componentes, servicios, abstracciones, documentación ni dependencias para cumplir formalidades sin utilidad.
- No repetir lecturas, búsquedas, comandos o análisis del mismo código si no cambió y ya se conoce su contenido.
- No modificar `AGENTS.md` por iniciativa propia; únicamente a petición explícita.
- Cuando la petición sea clara, ejecutar directamente. No crear planes extensos ni pedir confirmaciones innecesarias.

## 3. Fase 1 — Diseño e iteración de interfaces

Se activa cuando el usuario pide crear, reproducir desde una imagen, mejorar o ajustar el diseño de una pantalla **sin pedir conexión real al backend**.

- Trabaja en HTML y SCSS; utiliza TS solo para estado y comportamiento visual necesario.
- Reutiliza primero `src/styles/`, variables, clases, componentes compartidos y patrones vigentes. **Consultar solo los estilos pertinentes** a la pantalla, no toda la carpeta después de cada cambio pequeño.
- Para representar tablas, cards, formularios, búsquedas, modales y botones, permite datos y operaciones locales simuladas (*mocks*) en HTML o TS. Evita servicios e interfaces prematuros.
- Marca inequívocamente los mocks temporales (`// MOCK: ...` o `<!-- MOCK: ... -->`) y mantenlos organizados para su eliminación posterior.
- Las operaciones de agregar/editar/eliminar simuladas deben actualizar la vista local sin aparentar persistencia real.
- No crear endpoints, servicios HTTP, DTO, interceptores ni integración API por iniciativa propia.
- Cuando el usuario adjunte una imagen, prioriza su composición, jerarquía, distribución, colores y espaciados; conserva lo aprobado en iteraciones anteriores. No agregues iconos o elementos de relleno no pedidos.
- No rediseñes las demás secciones ni modifiques estilos compartidos por comodidad.
- Mantén HTML válido, accesibilidad básica y comportamientos visuales coherentes.
- En pequeños cambios de diseño aplica el **Nivel 1**, no pruebas automáticas exhaustivas.

## 4. Buenas prácticas de HTML, SCSS y TypeScript

### HTML

- Usar etiquetas semánticas, `label` asociados a inputs y botones con `type="button"` o `type="submit"` adecuado.
- Cuidar teclado, foco visible y accesibilidad; no romper interacciones existentes.
- Mantener plantillas legibles y sin lógica compleja ni efectos secundarios en las expresiones.
- Reutilizar componentes/directivas; extraer un componente nuevo solo con beneficio claro.
- Mantener la sintaxis Angular coherente con el repositorio (`@if`, `@for`, etc. cuando ya se utilicen).
- Cuando aplique, representar estados vacío, carga, error, datos y controles deshabilitados.
- Comentarios breves solo para separar bloques significativos; no comentar cada etiqueta.

### SCSS

- Reutilizar variables, mixins y clases de `src/styles/`. No duplicar estilos de tablas, botones, formularios y modales existentes.
- **No modificar estilos globales para arreglar una sola pantalla** si ya puede resolverse localmente o con una clase existente; evaluar el impacto en otras vistas antes de introducir cambios compartidos.
- Mantener en cada componente solamente los estilos que le corresponden; promover estilos compartidos únicamente cuando la reutilización sea real y esté dentro del alcance autorizado.
- Evitar anidación excesiva, especificidad innecesaria, inline styles y `!important` no justificados.
- Conservar responsividad y estructura; usar comentarios cortos por bloques relevantes.
- Eliminar los selectores obsoletos que **la modificación actual** haya dejado sin uso, sin barrer otros módulos.

### TypeScript de componentes

- Mantener lógica de presentación, interacción, estado y coordinación de servicios en el componente; llamadas HTTP en servicios.
- Seguir tipado estricto; evitar `any`, conversiones sin fundamento, duplicaciones y funciones excesivamente largas.
- Usar orden coherente con los componentes existentes. Cuando aplique: (1) inyecciones, (2) ciclo de vida, (3) carga de selects, (4) guardar, (5) listar, (6) buscar, (7) actualizar, (8) cambiar estados; ubicar variables relacionadas cerca de sus métodos. No crear secciones vacías por seguir un índice.
- Comentar secciones relevantes y explicar **por qué** se aplica una regla compleja; no comentar lógica evidente.
- Reutilizar validadores, helpers, popups y componentes compartidos existentes; no crear soluciones paralelas.
- Limpiar suscripciones según el patrón del proyecto (`async` pipe, `takeUntilDestroyed`, etc.); evitar suscripciones anidadas.
- No dejar `console.log`, imports o código temporal no necesario en implementaciones finalizadas.

## 5. Fase 2 — Integración con el backend

**Activación exclusiva:** el usuario solicita conectar la pantalla, reemplazar mocks con datos reales o integrar una funcionalidad de API. No iniciar esta fase por una petición visual.

1. Revisar únicamente el componente solicitado y localizar cada mock, handler, lista estática o validación simulada que deba sustituirse.
2. Comprobar el contrato API con lo que esté realmente disponible: servicios actuales, documentación/OpenAPI o información facilitada. El backend Spring Boot vive en otro proyecto; **no inventar endpoints, DTO ni respuestas**.
3. Reutilizar interfaces y servicios; crear solo los faltantes siguiendo las convenciones de `data/`. Diferenciar modelos de formulario, solicitud y respuesta cuando la diferencia sea real.
4. Encapsular `HttpClient`, URLs, parámetros y transformaciones en servicios; no dispersar peticiones en los componentes.
5. Conectar acciones y estados de carga/error; usar las confirmaciones y popups globales ya definidos, sin crear duplicados.
6. Retirar **solo los mocks reemplazados**, junto con métodos simulados, imports y referencias obsoletas. Conservar mocks de otras pantallas aún en fase 1 y fixtures válidas de tests.
7. Preservar el HTML/SCSS y la apariencia aprobada. Cambiar diseño solo si la integración lo exige.
8. Verificar lo aplicable: errores HTTP, validación, doble clic, actualización de listas/detalles, timeout y conservación de formularios. Si no hay contrato o backend disponible, reportar lo pendiente sin fingir pruebas completas.

## 6. Botones, concurrencia y comunicación HTTP

### Sincronización y recuperación

- Evitar solicitudes duplicadas por doble clic: proteger con estados (`guardando`, `procesando`, etc.) **y** `[disabled]`; usar bloqueo o RxJS (`exhaustMap`) donde encaje.
- Bloquear solo acciones incompatibles, no toda la aplicación; el resto de controles debe seguir disponible cuando sea seguro.
- Liberar estados de carga en éxito, error, cancelación y timeout (por ejemplo, `finalize` correctamente aplicado). No dejar botones bloqueados ni spinners permanentes.
- Para búsquedas usar `debounceTime`, `distinctUntilChanged`, `switchMap` u otro patrón adecuado si procede; impedir que resultados antiguos reemplacen datos recientes.
- No emplear `setTimeout` para disimular problemas de sincronización.
- Actualizar tablas, cards, contadores y detalles cuando el servidor **confirme** la operación. Mantener una fuente coherente de datos o recargar cuando corresponda.
- En errores, conservar campos y formularios, no cerrar modales y evitar mensajes duplicados.

### Timeout obligatorio: 5 segundos

- Para peticiones HTTP **normales** al backend, aplicar **5000 ms de timeout real**, efectivo y configurable centralmente, preferiblemente mediante la infraestructura `HttpClient`/interceptores/RxJS ya existente o una implementación global única durante **fase 2**.
- Si una operación necesita más tiempo (por ejemplo, carga de archivos o generación de documentos), usar una excepción explícita y justificada, sin valores mágicos repetidos en componentes.
- Si el servidor no responde a tiempo o no hay conexión, terminar la espera del cliente, liberar los controles y mostrar mediante el popup global: **«Error de comunicación. El servidor no respondió dentro del tiempo esperado.»**
- Distinguir timeout/red de validación, errores HTTP y cancelaciones; no tratar todos los 400/404/500 como falta de respuesta.
- Evitar alertas duplicadas entre interceptor, servicio y componente. Propagar errores sin convertirlos en falsos éxitos.
- No limpiar datos del usuario ni cerrar la pantalla ante una falla.
- Un timeout del cliente **no confirma que el servidor haya cancelado un guardado**. No reintentar automáticamente escrituras ni operaciones sensibles; cuando sea posible, verificar el resultado real antes de permitir duplicados.
- Cancelar o ignorar respuestas tardías que pertenezcan a pantallas/contextos obsoletos.

## 7. Limpieza después de cambios: evitar «código fantasma»

Aplicar **siempre una limpieza localizada** sobre lo que la tarea haya reemplazado; en Nivel 1 esto debe ser rápido y no convertirse en una búsqueda global.

- **TS:** quitar métodos, variables, imports, estados y lógica que la modificación haya vuelto innecesarios.
- **HTML:** retirar bloques anteriores, bindings, clases o handlers que ya no correspondan al diseño o funcionalidad vigente.
- **SCSS:** retirar reglas de una versión reemplazada **solo si se comprueba que ya no se utilizan** en el alcance afectado.
- **Mocks:** conservar los necesarios para fase 1; eliminarlos cuando se sustituyen por datos reales en fase 2.
- **Servicios/componentes:** eliminar duplicados abandonados solo después de comprobar todas sus referencias reales.
- No conservar implementaciones viejas comentadas «por si acaso»; usar Git para recuperar versiones si hace falta.
- No borrar estilos globales, servicios compartidos ni código de otros módulos cuando puedan seguir siendo necesarios. Si el uso es incierto, conservar y reportar.
- **No modificar archivos `.spec.ts` únicamente porque cambió una clase o un diseño estático**, salvo que el usuario lo solicite expresamente o una prueba directamente relacionada deba actualizarse por haber cambiado el comportamiento.

## 8. Verificaciones y auditoría proporcionadas al riesgo

### Aplicar únicamente lo que aporte valor

| Alcance | Qué comprobar | Qué evitar |
| --- | --- | --- |
| **Nivel 1: clases, textos, color, espaciado** | Fragmentos editados y diff; ausencia de errores evidentes. | `ng build`, `tsc`, tests, nuevos specs, rastreos globales. |
| **Nivel 2: HTML con bindings o lógica TS** | Referencias, tipos, flujo; prueba dirigida si cambia comportamiento. | Suites completas y build de producción por rutina. |
| **Nivel 3: nueva pantalla** | Compilación Angular si se añadieron estructuras/bindings sustanciales; pruebas funcionales específicas si existen. | Ejecutar todos los comandos después de cada archivo editado. |
| **Nivel 3: integración HTTP/estado** | Tipos, pruebas relevantes con éxito/error/timeout/doble clic, y build cuando el alcance lo justifique. | Ejecutar pruebas del resto del proyecto sin dependencia directa. |
| **Refactorización compartida grande** | Verificaciones de consumidores afectados; suite o build amplios cuando el riesgo sea transversal. | Cambios globales no autorizados. |

### Reglas de ejecución

1. **No usar procesos watch** (`ng serve`, `npm start`, `npm run watch`, `ng test` sin `--watch=false`) como chequeos puntuales.
2. No crear pruebas nuevas para asegurar exclusivamente la existencia de una clase CSS o un texto estático salvo exigencia expresa.
3. Preferir una sola ejecución de las pruebas directamente afectadas. Ejemplo: `npx ng test --watch=false --include="src/app/ruta/componente.spec.ts"` si el builder lo admite.
4. No encadenar `tsc`, tests y build como ritual. Usar el chequeo mínimo capaz de detectar los riesgos introducidos.
5. No compilar al terminar cada edición; en tareas grandes ejecutar cuando el cambio esté listo para validación.
6. Analizar los errores antes de reintentar. No repetir el mismo comando indefinidamente ni arreglar errores preexistentes fuera del alcance.
7. Nunca cambiar los límites de presupuesto (*budgets*) de Angular solo para que `ng build` pase, sin autorización.
8. No instalar dependencias, linters, frameworks de pruebas ni modificar configuración global solo para verificar una tarea menor.
9. Revisar redundancias, imports sin uso, errores, estados desincronizados y limpieza **en los archivos tocados y dependencias necesarias**; no efectuar auditoría total por rutina.
10. Si se trata de permisos, seguridad, persistencia, HTTP o concurrencia, no omitir las comprobaciones importantes solo por rapidez.
11. Indicar las comprobaciones realmente ejecutadas, las omitidas de forma justificada y cualquier limitación. **Nunca afirmar que se probó algo que no se ejecutó.**

## 9. Entrega y reporte final

- **Nivel 1:** respuesta breve (una o dos frases): archivos o elementos modificados. Señalar que no se corrieron tests/build por no ser necesarios; evitar listados largos.
- **Nivel 2:** cambios, limpieza, verificación realizada y problema pendiente si existe.
- **Nivel 3:** fase, funcionalidades/archivos, componentes o estilos reutilizados, limpieza de mocks, pruebas realmente ejecutadas (con resultados), riesgos, limitaciones y pendientes.
- No inflar informes con revisiones globales o verificaciones innecesarias.
- Si algo falla, no bloquear indefinidamente la tarea: informar qué funciona, qué no pudo comprobarse y por qué.
- **Criterio de cierre:** el cambio solicitado está implementado dentro del alcance, conserva diseño y comportamiento preexistentes, no deja código residual atribuible a la tarea y tiene verificaciones proporcionales al riesgo.

## 10. Ejemplos para interpretar correctamente estas reglas

- **«Cambia `_principal` por `_guardar` en estos botones»**: abrir los HTML señalados, cambiar solamente las clases necesarias, revisar el diff y terminar. **No** crear estilos globales, tocar SCSS o tests, ejecutar compilaciones ni inspeccionar todos los botones del repositorio.
- **«Ajusta el borde de este card»**: editar el SCSS correspondiente, comprobar que no se alteren otras reglas relacionadas y terminar sin build.
- **«Rediseña esta pantalla según la imagen»**: fase 1; usar mocks marcados, componentes y estilos existentes; implementar solo la pantalla indicada, y comprobar su funcionalidad local según alcance.
- **«Conecta esta pantalla con Spring Boot»**: fase 2; revisar servicios y contratos disponibles, reemplazar mocks, gestionar doble clic y timeout de 5 s, comprobar casos relevantes sin rediseñar la vista.
- **«No me gusta la versión anterior, reemplázala»**: sustituir solo lo pedido y eliminar los restos de la implementación descartada en los archivos directamente afectados; no hacer limpieza de todo el proyecto.
