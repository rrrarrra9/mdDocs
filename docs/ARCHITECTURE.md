# Arquitectura de mdDocs

## Componentes

| Componente | Responsabilidad | Código |
| --- | --- | --- |
| Interfaz React | Editar Markdown, organizar carpetas y compartir | `src/components/Editor.tsx` |
| API de Next.js | Operaciones de documentos, carpetas y permisos | `src/app/api/` |
| Autenticación | Credenciales, JWT de sesión y API keys | `src/lib/auth.ts`, `src/lib/api-auth.ts` |
| Prisma y PostgreSQL | Persistencia relacional | `prisma/schema.prisma` |
| Servidor MCP | Traducir herramientas MCP a peticiones HTTP | `mcp-server/src/` |

## Flujo de una operación

1. El usuario inicia sesión o el cliente MCP envía una API key.
2. La ruta HTTP obtiene la identidad con `getAuthUser` o `getServerSession`, según el endpoint.
3. La operación consulta la propiedad del recurso y los permisos que correspondan.
4. Prisma lee o modifica los datos en PostgreSQL.
5. La API devuelve JSON a la interfaz o al servidor MCP.

## Modelo de datos

| Entidad | Relaciones y propósito |
| --- | --- |
| `User` | Propietario de documentos y carpetas; rol y API key |
| `Document` | Contenido Markdown, propietario y carpeta opcional |
| `Folder` | Propietario, carpeta padre y subcarpetas |
| `Permission` | Usuario y carpeta; flags de lectura, escritura y eliminación |
| `Account`, `Session`, `VerificationToken` | Modelos asociados a autenticación |

El esquema define índices en claves de consulta como `userId`, `folderId` y `parentId`. La combinación usuario/carpeta de un permiso es única.

## Colaboración experimental

Hay dos implementaciones:

- `src/lib/collab.ts` y `/api/collab/[docId]`: polling HTTP y versiones con estado en un `Map` de proceso.
- `server.cjs` y `src/lib/socket.ts`: eventos Socket.IO y salas de documentos en memoria.

El editor principal gestiona documentos mediante la API persistente. Las alternativas de colaboración necesitan unificarse y validar permisos por documento. El estado en memoria se pierde al reiniciar y no se comparte automáticamente entre procesos. No hay un sistema CRDT.

## Desarrollo pendiente

La validación de autorización debe cubrir cada ruta y cada operación, incluida la colaboración. También quedan pendientes pruebas automatizadas, validación de entradas y la separación entre migraciones y compilación.
