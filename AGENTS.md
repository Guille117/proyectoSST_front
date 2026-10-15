AGENTS.md — Frontend Angular (frontSST)
Alcance: estas instrucciones rigen únicamente el proyecto frontend Angular. El backend Spring Boot se mantiene en otro proyecto; no presupongas acceso a sus archivos.
Objetivo: implementar y modificar interfaces e integraciones funcionales, ordenadas y reutilizables, sin alterar decisiones de diseño ya aprobadas. Trabaja con rapidez, pero no omitas comprobaciones relevantes. Adapta el análisis y las pruebas al tamaño y riesgo de cada cambio.
Prioridades: 1) funcionalidad y recuperación ante errores; 2) sincronización UI/estado/backend; 3) conservación del diseño; 4) reutilización y buenas prácticas; 5) claridad y orden; 6) simplicidad y rapidez sin sacrificar lo anterior.

A. Información del proyecto
Comandos disponibles
- npm start / ng serve: servidor de desarrollo en http://localhost:4200; proceso persistente, no utilizar como comprobación puntual.
- npm run build / ng build: compilación de producción a dist/; budgets iniciales de 500 kB (aviso) y 1 MB (error).
- npm run watch / ng build --watch --configuration development: compilación continua de desarrollo; no utilizar como comprobación puntual.
- npm test / ng test: pruebas unitarias Angular con Vitest + jsdom (@angular/build:unit-test), potencialmente en modo observación. Para ejecuciones puntuales, indicar explícitamente --watch=false.
- npx ng test --watch=false: ejecutar una vez las pruebas Angular.
- npx ng test --watch=false --include="src/app/ruta/componente.spec.ts": ejecutar únicamente el archivo de pruebas afectado, si el builder instalado admite el filtro.
- npx tsc --noEmit: verificación TypeScript disponible; comprobar el tsconfig efectivo si el comando no cubre los archivos de aplicación. TypeScript por sí solo no verifica todas las plantillas Angular.
- No existe script de lint ni de typecheck: no inventes comandos ni instales herramientas por iniciativa propia.
Utiliza npm@11.13.0, indicado en packageManager. Proyecto único frontSST en angular.json (no es monorepo).
Tecnologías
- Angular 21.2, componentes standalone. Arranque: bootstrapApplication(App, appConfig) desde src/main.ts.
- TypeScript ~5.9 con configuración estricta (strict, noImplicitReturns, isolatedModules, module: preserve, etc.).
- Tailwind 4.3 y SCSS; inlineStyleLanguage: scss. Tailwind sin preflight: src/styles.scss incluye tailwindcss/theme.css y utilities.css mediante layers.
- Vitest 4.0 + jsdom; tipos globales de vitest/globals definidos en tsconfig.spec.json.
Arquitectura y ubicaciones
- Entrada: src/main.ts → src/app/app.config.ts (router y HTTP) → src/app/app.routes.ts → src/app/app.ts.
- Acceso: /login con loginGuard; MainLayout protegido por authGuard.
- Farmacia: src/app/Modulos/Farmacia/rutasFarmacia.ts (inventario, proveedores, ingresos, salidas).
- Usuarios: src/app/Modulos/Usuarios/rutasUsuarios.ts (usuarios, roles, horarios).
- Módulos: src/app/Modulos/{Auth,Farmacia,Usuarios}/. Las funcionalidades suelen incluir archivos .ts, .html, .scss, .spec.ts y opcionalmente una carpeta data/ para interfaces y servicios (*-service.ts, *Interfaz.ts). Respeta los nombres en español ya existentes.
- Compartidos: src/app/shared/{campo-validado,popUps,tab-switch}/, src/app/layout/{main-layout,menu-lateral,topbar}/ y src/app/modal-principal/.
- Estilos: src/styles.scss importa src/styles/*.scss, como tableStyle, subMenuStyle, formularioStyle, botonesStyle, otrosStyle y popUpStyle. Variables CSS en :root; iconos de bootstrap-icons y fontawesome-free ya incluidos. Reutiliza estos recursos antes de añadir otros.
- Recursos estáticos en public/; dist/ ignorado por Git.
API y entorno
- URL de API actual: src/environments/environment.ts → http://localhost:8080/api/v1. No se ha identificado archivo de entorno de producción; no lo crees salvo necesidad solicitada.
- provideHttpClient() está en src/app/app.config.ts; según el estado documentado inicialmente, todavía no había interceptores HTTP. Comprueba el código actual antes de afirmar que siguen ausentes o crear uno.
- Verifica los contratos API a partir de servicios existentes, documentación/OpenAPI o información aportada. No inventes endpoints ni estructuras de respuesta.
Convenciones ya adoptadas
- Componentes con SCSS, normalmente mediante styleUrl: './componente.scss' junto al componente; conserva los patrones actuales.
- Prettier: printWidth: 100, singleQuote: true, parser Angular para HTML; EditorConfig con indentación de 2 espacios y eliminación de espacios finales.
- fix_indentation.py es un script puntual antiguo relacionado con ingresos.html: ignóralo salvo tarea explícita.
- Sin monorepo, sin CI detectada originalmente y sin opencode.json; verifica el estado actual antes de basarte en ello.
- src/app/app.spec.ts tenía una prueba antigua que esperaba <h1>Hello, frontSST</h1>; si falla y no está relacionada con los cambios, repórtala como preexistente. Corrígela si la tarea afecta al componente App.
1. Preparación y alcance de cada tarea
1. Determina si el usuario está en fase 1 (diseño) o fase 2 (integración). No cambies de fase por iniciativa propia.
2. Lee solo los archivos relevantes para la tarea y sus dependencias directas. Reutiliza el contexto ya comprobado; no vuelvas a recorrer todo el repositorio por cada ajuste pequeño.
3. Para cambios visuales, consulta las reglas aplicables de src/styles.scss, src/styles/ y los componentes compartidos relacionados. Para tareas de datos, revisa interfaces, servicios, utilidades y popups globales existentes.
4. Respeta la arquitectura y el código vigente; no agregues pantallas, campos, endpoints, rutas, dependencias ni abstracciones que el usuario no solicitó.
5. Una tarea grande puede dividirse internamente en partes coherentes. Evita exigir solicitudes por archivo, pero tampoco reestructures módulos ajenos para resolverla.
6. Evita explicaciones extensas o planificación innecesaria para tareas pequeñas. Implementa el cambio concreto y comunica brevemente el resultado.
7. No modifiques este AGENTS.md por iniciativa propia. Solo si el usuario pide cambiar las reglas.
2. Fase 1 — Diseño e iteración visual
Se activa al crear, ajustar o rediseñar pantallas sin solicitar conexión real con el backend.
- Trabaja principalmente en HTML y SCSS; utiliza TypeScript cuando haga falta para mostrar interacciones.
- Usa datos y funciones simuladas (mocks) en TS o HTML para tablas, formularios, tarjetas, modales, búsquedas y acciones locales. Evita arquitectura prematura.
- Marca claramente el código temporal, por ejemplo // MOCK: datos para diseño o <!-- MOCK: contenido temporal -->, para poder retirarlo después.
- Los botones pueden simular agregar, seleccionar, editar, eliminar o limpiar, pero no deben aparentar persistencia real.
- No crees por iniciativa propia servicios HTTP, DTO, interceptores ni integración API en esta fase. Los tipos locales sencillos sí están permitidos.
- En iteraciones conserva todo lo aprobado y modifica únicamente lo solicitado. No agregues íconos, secciones o elementos ficticios para llenar espacios.
- Mantén accesibilidad, estados visuales, etiquetas y controles correctamente asociados.
- Informa qué comportamiento sigue siendo simulado y qué falta conectar.
- Optimización: un ajuste puramente visual y localizado no requiere ejecutar siempre ng build, tsc ni toda la batería de pruebas. Revisa el HTML/SCSS afectado; amplía las comprobaciones solo si introduces bindings, lógica, sintaxis delicada o cambios de alto riesgo.
3. Buenas prácticas de HTML, SCSS y TypeScript
HTML
- Usa HTML semántico, label asociados a controles y tipos correctos de botón (button/submit); considera teclado, foco y accesibilidad.
- Plantillas legibles: evita lógica de negocio, efectos secundarios y expresiones excesivamente complejas.
- Reutiliza componentes y directivas existentes; extrae nuevos componentes solo cuando aporten valor claro.
- Sigue la sintaxis Angular instalada (por ejemplo, @if/@for donde el proyecto ya la utilice).
- Representa según corresponda estados de carga, vacío, error, éxito y deshabilitado.
- Usa comentarios cortos para separar bloques significativos, sin comentar cada etiqueta.
SCSS
- Prioriza las variables, clases, mixins y estilos de src/styles/; evita duplicar botones, formularios, tablas, modales, colores y tamaños.
- Deja en cada componente solo estilos propios; mueve a compartidos únicamente patrones realmente reutilizados.
- Evita anidación excesiva, selectores demasiado específicos, estilos inline y !important injustificado.
- Mantén responsividad y estructura; usa comentarios breves por secciones importantes.
- En correcciones visuales, elimina estilos de versiones anteriores que hayan dejado de utilizarse, sin borrar estilos compartidos en uso.
TypeScript de componentes
- Usa tipado estricto, nombres claros y métodos con responsabilidades definidas; evita any, conversiones injustificadas y duplicaciones.
- Mantén las llamadas HTTP en servicios; los componentes gestionan estado e interacción de la vista.
- Organiza con encabezados de sección cuando sea útil. Sigue las convenciones de la pantalla; como guía: inyecciones y propiedades, ciclo de vida, carga de selectores, guardar, listar, buscar, actualizar, cambiar estados y auxiliares. No agregues secciones vacías.
- Explica mediante comentarios únicamente reglas o transformaciones complejas; elimina console.log de depuración y comentarios temporales obsoletos.
- Reutiliza validadores, helpers, componentes, estados y popups globales.
- Maneja suscripciones y limpieza del ciclo de vida (async pipe, takeUntilDestroyed u otra solución existente). Evita suscripciones anidadas y fugas de memoria.
4. Fase 2 — Integración con Spring Boot
Se activa solo cuando se pida conectar la pantalla al backend. El servidor es un proyecto independiente.
1. Revisa la pantalla existente: identifica cada mock, handler temporal, dato estático, interacción y validación simulada.
2. Identifica o verifica el contrato real. Reutiliza interfaces, modelos, DTO y servicios existentes; crea solo los faltantes. Diferencia tipos de formulario, petición y respuesta si es necesario.
3. Centraliza operaciones HttpClient, URL base, parámetros, respuestas y transformaciones en servicios según el patrón actual; no disperses URLs ni llamadas HTTP en componentes.
4. Conecta las acciones: validación, carga, éxito/error, sincronización de tabla/detalle, mensajes y confirmaciones con los popups globales.
5. Retira los mocks, handlers, imports, métodos y comentarios temporales sustituidos por integración real. Conserva los mocks válidos de pruebas automatizadas y los de otras pantallas aún en diseño.
6. Conserva el diseño previamente aprobado. Modifica HTML/SCSS solo cuando sea necesario para la integración o sus estados.
7. Verifica los escenarios relevantes. Si faltan endpoints o documentación, no inventes una integración: comunica exactamente lo pendiente.
5. Sincronización, concurrencia y recuperación de la interfaz
Estas reglas se aplican a acciones conectadas al backend.
- Una acción de escritura debe tener un estado explícito (saving, loading, etc.). Protege contra doble clic tanto en la vista ([disabled]) como en TypeScript.
- Deshabilita solo las acciones incompatibles durante la operación. Mantén utilizable el resto de la pantalla cuando sea seguro.
- Restablece siempre los estados de carga en éxito, error, cancelación y timeout, usando finalize o un patrón equivalente bien aplicado.
- Para búsquedas, aplica debounce/cancelación de solicitudes obsoletas (debounceTime, distinctUntilChanged, switchMap) cuando corresponda. Para envíos, utiliza bloqueo o exhaustMap según el caso; no apliques operadores automáticamente.
- Evita que una respuesta tardía sobrescriba información de otra pantalla, registro, modal o búsqueda. No uses setTimeout para ocultar problemas de sincronización.
- Tras una operación confirmada por el servidor, actualiza los datos mostrados desde una fuente coherente o recárgalos cuando proceda.
- Ante un error, conserva los valores del formulario; no cierres el modal ni limpies entradas sin éxito confirmado. Evita popups duplicados.
Tiempo máximo de comunicación: 5 segundos
- Aplica un límite predeterminado real y centralizado de 5000 ms a peticiones HTTP normales. Verifica primero si existe una implementación global; si no, créala en la fase 2 mediante solución compatible con Angular/RxJS, sin repetir constantes en cada componente.
- Operaciones justificadamente largas (subida de archivos, generación de documentos, etc.) pueden tener excepciones explícitas y configurables.
- Si vence el plazo o no hay conexión, termina la espera del cliente, muestra mediante el popup global un error de comunicación y recupera los controles sin recargar la página.
- Diferencia timeout/red de errores HTTP 400, 404, 500, validación y cancelación. Propaga errores; no los conviertas en éxitos falsos ni muestres la misma alerta en varias capas.
- El timeout no prueba que el servidor haya cancelado un guardado. No reintentes automáticamente operaciones de escritura; si el resultado es incierto, permite comprobar primero el estado real para evitar duplicados.
- Prueba cuando corresponda que, ante un servidor que nunca responde, el botón se libera, se conserva el formulario y la interfaz sigue disponible.
6. Verificaciones eficientes — obligatorias pero proporcionales
Objetivo: evitar que Cline/OpenCode dedique más tiempo a compilar y ejecutar comandos que a realizar cambios pequeños. Verifica con criterio; la auditoría sigue siendo obligatoria, pero localizada.
Según el tipo de tarea
Cambio	Comprobación mínima	Cuándo ampliar
Color, espacio, borde, tipografía o SCSS localizado	Revisar el diff y estilos afectados; limpiar CSS en desuso.	Solo si se altera el sistema de estilos o existe riesgo de compilación.
HTML estático o ajuste menor de estructura	Revisar markup, accesibilidad y referencias.	Ejecutar compilación Angular si cambian directivas, bindings, componentes, eventos o estructura compleja.
Lógica TypeScript pequeña	Revisar tipado, estado y flujo modificado; comprobación de tipos cuando afecte al código ejecutable.	Pruebas dirigidas si cambia comportamiento o hay riesgo de regresión.
Pantalla completa o refactorización significativa	Verificación Angular pertinente y pruebas específicas existentes.	Build completo y batería amplia si el alcance/riesgo lo justifica.
Servicio, integración HTTP, formularios con persistencia o concurrencia	Verificar tipos, pruebas de servicio/componente y casos éxito/error/doble clic/timeout según aplique.	Build completo al finalizar una integración importante; pruebas adicionales si afecta recursos compartidos.


Reglas de ejecución
1. No ejecutes comandos en modo watch como comprobación puntual. No uses npm start, ng serve, npm run watch ni ng test sin --watch=false para validar una tarea y esperar a que terminen.
2. Prioriza una sola ejecución de las pruebas afectadas. Usa npx ng test --watch=false --include="ruta/al/archivo.spec.ts" cuando esté soportado; para toda la suite, npx ng test --watch=false.
3. No lances npm run build después de cada edición. Para una tarea grande, ejecútalo cuando haya una versión coherente que comprobar, preferentemente al final; repítelo solo si se corrigieron errores que lo requieren.
4. No encadenes tsc, suite completa y build de producción por rutina: decide cuáles aportan información nueva. tsc no sustituye la validación de plantillas Angular.
5. No instales dependencias ni herramientas de test/lint para verificar una tarea salvo solicitud o necesidad acordada.
6. Nunca repitas un comando que falla sin analizar antes el error. Corrige la causa, verifica los archivos relacionados y reintenta de manera razonable; si hay un bloqueo preexistente, repórtalo y continúa con lo que se pueda comprobar.
7. Revisa solo archivos modificados y dependencias directas en la auditoría habitual. Una auditoría integral de todo el repositorio requiere solicitud explícita o justificación concreta.
8. Evita compilar, iniciar servidores o correr suites completas solo para producir un reporte. El reporte debe reflejar exactamente lo que se comprobó.
9. Si una tarea afecta seguridad, permisos, datos persistentes, sincronización o infraestructura compartida, no omitas las pruebas relevantes solo por rapidez.
10. Si no se pudo ejecutar una prueba necesaria, indícalo como pendiente; no afirmes que algo está verificado sin haberlo probado.
7. Limpieza obligatoria tras cada corrección: evitar «código fantasma»
Después de crear, rediseñar, reemplazar o corregir una funcionalidad, revisa los archivos afectados y retira los restos de versiones anteriores:
- TypeScript: métodos, propiedades, variables, importaciones, suscripciones y lógica sin uso.
- HTML: estructuras antiguas, bloques ocultos innecesarios, eventos y referencias obsoletos.
- SCSS: selectores, clases y estilos del diseño anterior que ya no utiliza el componente.
- Mocks: datos y funciones temporales que hayan dejado de ser necesarios; conserva los necesarios para la fase 1 y los legítimos de pruebas.
- Componentes/servicios: archivos duplicados o abandonados solo cuando compruebes que ninguna referencia activa depende de ellos.
- Referencias: verifica que no existan importaciones, bindings o llamadas hacia elementos retirados.
No dejes código antiguo comentado «por si acaso», no mantengas dos implementaciones de la misma funcionalidad y no limpies indiscriminadamente archivos externos al cambio. Si no puede demostrarse que algo está en desuso, consérvalo y menciónalo como observación. Realiza las verificaciones proporcionales de la sección 6; no compiles todo el proyecto únicamente por retirar una regla SCSS sin uso.
8. Auditoría de calidad del código modificado
Antes de concluir, haz una revisión enfocada para detectar y corregir dentro del alcance:
- Lógica, estilos, interfaces, componentes o servicios redundantes.
- Imports, variables, métodos, comentarios o código inalcanzable sin uso.
- Responsabilidades mezcladas (por ejemplo, HTTP directamente en componentes), tipos inseguros o suscripciones sin limpieza.
- Estados de carga permanentes, doble envío, condiciones de carrera y actualizaciones obsoletas.
- Incoherencias con src/styles/, los componentes compartidos, los popups y los servicios existentes.
- Problemas introducidos de accesibilidad, formularios y validación.
No hagas refactorizaciones masivas ni cambies código correcto fuera del alcance para «limpiar». Después de corregir, repite solo las comprobaciones que puedan haberse visto afectadas.
9. Reporte final breve y verificable
Al terminar, entrega un reporte proporcional a la tarea, evitando párrafos largos para cambios pequeños:
- Fase y cambios: diseño/integración, comportamiento implementado y archivos principales afectados.
- Reutilización: estilos, componentes, interfaces, servicios y popups reutilizados, si corresponde.
- Limpieza: código fantasma y redundancias eliminados, o riesgos pendientes.
- Comprobaciones: comandos y pruebas realmente ejecutados, con resultado; indicar expresamente las comprobaciones omitidas por ser innecesarias y las que quedan pendientes.
- Bloqueos/riesgos: contratos de API faltantes, errores preexistentes y resultados inciertos de escrituras con timeout.
Criterio de cierre: el cambio solicitado funciona en lo verificable, respeta la fase y el diseño, evita código residual, no introduce bloqueos de interfaz y supera las comprobaciones pertinentes según su alcance. Si una verificación no fue posible, informa la limitación sin inventar un resultado.