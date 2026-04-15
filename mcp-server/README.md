# MD Docs MCP Server

Servidor MCP (Model Context Protocol) para conectar agentes de IA como Claude Code con tu sistema de documentación md-docs.

## Instalación

```bash
cd mcp-server
npm install
npm run build
```

## Configuración

### Opción 1: API Key (Recomendado)

1. Genera una API Key desde la aplicación md-docs:
   - Inicia sesión en la aplicación
   - Ve a configuración o usa el endpoint `/api/api-key` con POST

2. Configura las variables de entorno:

```bash
export MD_DOCS_URL="http://localhost:3000"
export MD_DOCS_API_KEY="md_tu_api_key_aqui"
```

### Opción 2: Session Cookie

Si prefieres usar la sesión existente:

```bash
export MD_DOCS_URL="http://localhost:3000"
export MD_DOCS_SESSION="next-auth.session-token=..."
```

## Configuración en Claude Desktop

Añade esto a tu archivo de configuración de Claude Desktop:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "md-docs": {
      "command": "node",
      "args": ["C:\\ruta\\a\\md-docs\\mcp-server\\dist\\index.js"],
      "env": {
        "MD_DOCS_URL": "http://localhost:3000",
        "MD_DOCS_API_KEY": "md_tu_api_key_aqui"
      }
    }
  }
}
```

## Configuración en Claude Code

Para usar con Claude Code, añade la configuración MCP:

```json
{
  "mcpServers": {
    "md-docs": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "MD_DOCS_URL": "http://localhost:3000",
        "MD_DOCS_API_KEY": "md_tu_api_key_aqui"
      }
    }
  }
}
```

## Herramientas disponibles

El servidor MCP expone las siguientes herramientas:

### `init_connection`
Inicializa la conexión con el servidor md-docs.
```
Argumentos: url (requerido), sessionCookie (opcional)
```

### `list_documents`
Lista todos los documentos accesibles.

### `get_document`
Obtiene un documento específico.
```
Argumentos: id (requerido)
```

### `create_document`
Crea un nuevo documento markdown.
```
Argumentos: title (requerido), content (opcional), folderId (opcional)
```

### `update_document`
Actualiza un documento existente.
```
Argumentos: id (requerido), title (opcional), content (opcional)
```

### `delete_document`
Elimina un documento.
```
Argumentos: id (requerido)
```

### `list_folders`
Lista todas las carpetas.

### `create_folder`
Crea una nueva carpeta.
```
Argumentos: name (requerido), parentId (opcional)
```

### `delete_folder`
Elimina una carpeta (los documentos se mueven a la raíz).
```
Argumentos: id (requerido)
```

### `get_folder_tree`
Muestra la estructura completa de carpetas y documentos.

### `search_documents`
Busca documentos por título.
```
Argumentos: query (requerido)
```

## Uso con agentes

Una vez configurado, los agentes pueden:

1. **Documentar código automáticamente** tras completar una tarea
2. **Crear guías de desarrollo** basadas en el código existente
3. **Actualizar documentación** cuando cambia el código
4. **Organizar documentación** en carpetas por proyecto/módulo

### Ejemplo de flujo de trabajo

```
Usuario: "Crea una función para validar emails y documenta el proceso"

Agente:
1. Crea la función en el código
2. Usa `create_folder` para crear "API Docs" si no existe
3. Usa `create_document` para crear "Email Validation.md"
4. Escribe la documentación con ejemplos de uso
```

## Desarrollo

Para desarrollo del servidor MCP:

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Ejecutar
npm start
```

## Estructura de archivos

```
mcp-server/
├── src/
│   ├── index.ts    # Servidor MCP principal
│   └── client.ts   # Cliente API para md-docs
├── package.json
├── tsconfig.json
└── README.md
```
