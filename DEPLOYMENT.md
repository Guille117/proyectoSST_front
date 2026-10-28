# Despliegue del frontend

## Imagen Docker

- Repositorio: `ghcr.io/guille117/proyectosst_front`
- Etiquetas publicadas: `latest` y `sha-<commit-completo>`
- Plataforma: `linux/amd64`
- Puerto interno del contenedor: `80`

El workflow `.github/workflows/docker-publish.yml` se ejecuta al actualizar `master` o de forma manual. Primero instala dependencias, compila en producción y ejecuta las pruebas; si cualquiera de esos pasos falla, la imagen no se publica. El workflow no despliega en Dokploy.

## Construcción local (opcional)

Con Docker instalado:

```bash
docker build -t proyectosst-front .
docker run --rm -p 8080:80 proyectosst-front
```

La aplicación quedará disponible en `http://localhost:8080`.

La compilación local sin Docker es:

```bash
npm ci
npm run build
npm test -- --watch=false
```

El resultado de producción se genera en `dist/frontSST/browser`.

## Dokploy

1. Publicar la imagen ejecutando el workflow sobre `master`.
2. En Dokploy, crear una aplicación de tipo **Docker** y usar como imagen
   `ghcr.io/guille117/proyectosst_front:latest` o una etiqueta `sha-<commit>`.
3. Si el paquete de GHCR es privado, configurar en Dokploy las credenciales del
   registro con un token que tenga permiso `read:packages`. También se puede
   hacer público el paquete desde GitHub Packages.
4. Configurar el puerto del contenedor en `80`.
5. Asignar el dominio del frontend y activar HTTPS/Let's Encrypt en Dokploy.
6. Configurar un health check HTTP en `/`.

El contenedor no necesita variables de entorno: Nginx sirve archivos estáticos y
la URL de la API queda incluida en la compilación de Angular.

## Configuración de la API

- Desarrollo: `http://localhost:8080/api/v1` (`src/environments/environment.ts`).
- Producción: `https://api.62.238.101.78.sslip.io/api/v1`
  (`src/environments/environment.production.ts`).

Angular reemplaza el archivo de entorno mediante `fileReplacements` al compilar
con la configuración `production`. Si la URL de la API cambia, hay que volver a
construir y publicar la imagen.

## CORS en el backend

El backend solo autoriza por defecto `http://localhost:4200`. En la aplicación
del backend en Dokploy hay que definir la variable:

```text
CORS_ALLOWED_ORIGINS=https://<dominio-del-frontend>
```

Usar el origen exacto, con `https://` y sin barra final. Para varios orígenes,
separarlos con comas. Después de cambiarla, redesplegar el backend.

No se requiere modificar código del backend.

## Rutas internas

`nginx.conf` usa `try_files $uri $uri/ /index.html`, por lo que actualizar
directamente rutas como `/pacientes`, `/medica` o `/expediente/12` devuelve la
aplicación Angular en lugar de un 404. Nginx no hace proxy hacia la API: las
peticiones van directamente al dominio externo configurado en el entorno de
producción.

## Verificaciones posteriores al despliegue

- Abrir `/login` y autenticarse contra la API de producción.
- Recargar una ruta interna para comprobar el fallback de Angular.
- Verificar en el navegador que las peticiones van a
  `https://api.62.238.101.78.sslip.io/api/v1` y que CORS no las bloquea.
- Probar la subida, visualización y descarga de un documento.
- Confirmar que la URL del comprobante de compras usa `https://` (el backend
  respeta `X-Forwarded-Proto`; Dokploy debe enviar ese encabezado).
