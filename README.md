# mdDocs

**Aplicación web para escribir, organizar y compartir documentación en Markdown, con una API e integración MCP para agentes de IA.**

[Ver aplicación](https://md-docs-liard.vercel.app) · [Guía del servidor MCP](mcp-server/README.md) · [Arquitectura](docs/ARCHITECTURE.md)

Proyecto personal en desarrollo. Reúne interfaz, autenticación, persistencia y herramientas para que clientes MCP puedan trabajar con los documentos.

## Funcionalidades actuales

- Editor Markdown con vista previa y exportación a PDF.
- Creación, edición y eliminación de documentos.
- Organización mediante carpetas y subcarpetas.
- Registro e inicio de sesión con correo y contraseña.
- Compartición de carpetas con permisos de lectura, escritura y eliminación.
- Panel de administración de usuarios y permisos.
- Acceso a la API mediante sesión o cabecera `X-API-Key`.
- Servidor MCP independiente para consultar y gestionar documentos y carpetas.

El repositorio también contiene implementaciones experimentales de colaboración mediante polling y Socket.IO. Su estado se mantiene en memoria y requieren trabajo adicional antes de un uso con varias instancias.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Interfaz y rutas de API | Next.js 16, React 19, TypeScript |
| Estilos | Tailwind CSS 4 |
| Base de datos | PostgreSQL, Prisma 5 |
| Autenticación | NextAuth 4, bcrypt |
| Integración con IA | Model Context Protocol, servidor Node.js/TypeScript |
| Colaboración experimental | Socket.IO y polling HTTP |

## Puesta en marcha

Requisitos: Node.js 20.9 o superior, npm y una base de datos PostgreSQL vacía para desarrollo.

```bash
git clone https://github.com/rrrarrra9/mdDocs.git
cd mdDocs
cp .env.example .env
```

En PowerShell, sustituye el último comando por `Copy-Item .env.example .env`.

Configura en `.env`:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión a tu PostgreSQL |
| `NEXTAUTH_SECRET` | Secreto aleatorio para la sesión |
| `NEXTAUTH_URL` | `http://localhost:3000` para desarrollo local |

Puedes generar un secreto con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

```bash
npm ci
npx prisma migrate deploy
npm run dev
```

Abre [localhost:3000](http://localhost:3000), crea una cuenta en la pantalla de acceso y prueba la creación de una carpeta y un documento.

### Integración MCP

Con la aplicación en marcha:

```bash
cd mcp-server
npm ci
npm run build
```

Genera una API key desde la interfaz y configura `MD_DOCS_URL` y `MD_DOCS_API_KEY` en tu cliente MCP. Consulta [la guía completa](mcp-server/README.md). Las credenciales deben permanecer en tu configuración local.

## Comandos del proyecto

| Comando | Función |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` | Análisis con ESLint |
| `npm run build` | Generación de Prisma, aplicación de migraciones y compilación de Next.js |
| `npm start` | Ejecución de la compilación de Next.js |
| `npm run dev:socket` | Servidor personalizado con Socket.IO |
| `cd mcp-server && npm run build` | Compilación del servidor MCP |

**El comando de build aplica migraciones a la base configurada en `DATABASE_URL`.** Utiliza una base de desarrollo para evaluar el proyecto.

## Estructura y decisiones técnicas

| Ruta | Responsabilidad |
| --- | --- |
| `src/app/` | Páginas y rutas HTTP |
| `src/components/Editor.tsx` | Edición, navegación y compartición |
| `src/lib/auth.ts` | Configuración de autenticación |
| `src/lib/api-auth.ts` | Resolución de sesión o API key |
| `prisma/` | Modelo relacional y migraciones |
| `mcp-server/src/` | Servidor MCP y cliente de la API |
| `server.cjs` | Alternativa experimental con Socket.IO |

Los datos de usuarios, documentos, carpetas y permisos se modelan con relaciones en PostgreSQL. La API permite reutilizar las operaciones tanto desde la interfaz como desde el servidor MCP. [Más detalles de arquitectura](docs/ARCHITECTURE.md).

## Estado y próximos pasos

- Añadir pruebas de integración para autorización y operaciones sobre documentos.
- Completar la validación de entradas y el tratamiento de errores.
- Unificar la colaboración y revisar su autorización y persistencia.
- Separar las migraciones del proceso de build.
- Añadir capturas y un recorrido de demostración.

La colaboración actual no utiliza CRDT ni resolución avanzada de conflictos. Las carpetas compartidas tienen permisos explícitos; la herencia de permisos a subcarpetas debe evaluarse por separado.

## Autor

[Raúl Ortiz Sánchez](https://github.com/rrrarrra9) · Estudiante de Desarrollo de Aplicaciones Multiplataforma.
