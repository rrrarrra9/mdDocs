#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MdDocsClient } from './client.js';

const server = new Server(
  {
    name: 'md-docs-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let client: MdDocsClient | null = null;

function getClient(): MdDocsClient {
  if (!client) {
    const baseUrl = process.env.MD_DOCS_URL;
    if (!baseUrl) {
      throw new McpError(ErrorCode.InternalError, 'MD_DOCS_URL environment variable is not set');
    }
    client = new MdDocsClient({ baseUrl });
    
    const sessionCookie = process.env.MD_DOCS_SESSION;
    if (sessionCookie) {
      client.setSessionCookie(sessionCookie);
    }
  }
  return client;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'init_connection',
        description: 'Initialize connection to md-docs server. Required before using other tools.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Base URL of the md-docs server (e.g., http://localhost:3000)',
            },
            sessionCookie: {
              type: 'string',
              description: 'Session cookie for authentication (optional if MD_DOCS_SESSION is set)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'list_documents',
        description: 'List all accessible documents in the documentation system',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_document',
        description: 'Get a specific document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Document ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new markdown document',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Document title',
            },
            content: {
              type: 'string',
              description: 'Markdown content (optional, defaults to empty)',
            },
            folderId: {
              type: 'string',
              description: 'Folder ID to place document in (optional)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_document',
        description: 'Update an existing document (title and/or content)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Document ID',
            },
            title: {
              type: 'string',
              description: 'New title (optional)',
            },
            content: {
              type: 'string',
              description: 'New markdown content (optional)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Document ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_folders',
        description: 'List all folders in the documentation system',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder for organizing documents',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Folder name',
            },
            parentId: {
              type: 'string',
              description: 'Parent folder ID for nested folders (optional)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_folder',
        description: 'Delete a folder (documents move to root)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Folder ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_folder_tree',
        description: 'Get the complete folder structure with documents organized by folder',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_documents',
        description: 'Search documents by title (simple text search)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to match against document titles',
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'init_connection': {
        const { url, sessionCookie } = args as { url: string; sessionCookie?: string };
        client = new MdDocsClient({ baseUrl: url });
        if (sessionCookie) {
          client.setSessionCookie(sessionCookie);
        }
        return {
          content: [
            {
              type: 'text',
              text: `Connected to md-docs at ${url}`,
            },
          ],
        };
      }

      case 'list_documents': {
        const c = getClient();
        const documents = await c.listDocuments();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(documents, null, 2),
            },
          ],
        };
      }

      case 'get_document': {
        const { id } = args as { id: string };
        const c = getClient();
        const doc = await c.getDocument(id);
        return {
          content: [
            {
              type: 'text',
              text: `# ${doc.title}\n\n---\n\n${doc.content}`,
            },
          ],
        };
      }

      case 'create_document': {
        const { title, content, folderId } = args as {
          title: string;
          content?: string;
          folderId?: string;
        };
        const c = getClient();
        const doc = await c.createDocument(title, content || '', folderId);
        return {
          content: [
            {
              type: 'text',
              text: `Document created successfully:\nID: ${doc.id}\nTitle: ${doc.title}`,
            },
          ],
        };
      }

      case 'update_document': {
        const { id, title, content } = args as {
          id: string;
          title?: string;
          content?: string;
        };
        const c = getClient();
        const updates: { title?: string; content?: string } = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        const doc = await c.updateDocument(id, updates);
        return {
          content: [
            {
              type: 'text',
              text: `Document updated successfully:\nID: ${doc.id}\nTitle: ${doc.title}`,
            },
          ],
        };
      }

      case 'delete_document': {
        const { id } = args as { id: string };
        const c = getClient();
        await c.deleteDocument(id);
        return {
          content: [
            {
              type: 'text',
              text: `Document ${id} deleted successfully`,
            },
          ],
        };
      }

      case 'list_folders': {
        const c = getClient();
        const folders = await c.listFolders();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(folders, null, 2),
            },
          ],
        };
      }

      case 'create_folder': {
        const { name, parentId } = args as { name: string; parentId?: string };
        const c = getClient();
        const folder = await c.createFolder(name, parentId);
        return {
          content: [
            {
              type: 'text',
              text: `Folder created successfully:\nID: ${folder.id}\nName: ${folder.name}`,
            },
          ],
        };
      }

      case 'delete_folder': {
        const { id } = args as { id: string };
        const c = getClient();
        await c.deleteFolder(id);
        return {
          content: [
            {
              type: 'text',
              text: `Folder ${id} deleted successfully`,
            },
          ],
        };
      }

      case 'get_folder_tree': {
        const c = getClient();
        const tree = await c.getFolderTree();
        
        let output = '# Documentation Structure\n\n';
        
        const buildTree = (folders: typeof tree.folders, parentId: string | null = null, indent: string = ''): string => {
          const filtered = folders.filter(f => f.parentId === parentId);
          let result = '';
          for (const folder of filtered) {
            result += `${indent}📁 ${folder.name}/\n`;
            for (const doc of folder.documents) {
              result += `${indent}  📄 ${doc.title} (id: ${doc.id})\n`;
            }
            result += buildTree(folders, folder.id, indent + '  ');
          }
          return result;
        };
        
        output += buildTree(tree.folders);
        
        if (tree.unorganizedDocs.length > 0) {
          output += '\n📄 Unorganized Documents:\n';
          for (const doc of tree.unorganizedDocs) {
            output += `  - ${doc.title} (id: ${doc.id})\n`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }

      case 'search_documents': {
        const { query } = args as { query: string };
        const c = getClient();
        const documents = await c.listDocuments();
        const matches = documents.filter(doc =>
          doc.title.toLowerCase().includes(query.toLowerCase())
        );
        return {
          content: [
            {
              type: 'text',
              text: matches.length > 0
                ? JSON.stringify(matches, null, 2)
                : `No documents found matching "${query}"`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new McpError(ErrorCode.InternalError, message);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
