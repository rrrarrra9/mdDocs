'use client';

import { useState } from 'react';
import { X, Copy, Check, Terminal, Bot, Code2, Settings } from 'lucide-react';

interface MCPConnectModalProps {
  apiKey: string | null;
  onClose: () => void;
}

type ClientType = 'claude-code' | 'claude-desktop' | 'cursor' | 'windsurf' | 'opencode';

const CLIENT_INFO: Record<ClientType, { name: string; icon: React.ReactNode; configPath: string; description: string }> = {
  'claude-code': {
    name: 'Claude Code',
    icon: <Code2 size={20} />,
    configPath: '~/.claude/claude_desktop_config.json',
    description: 'CLI de Anthropic para desarrollo asistido por IA'
  },
  'claude-desktop': {
    name: 'Claude Desktop',
    icon: <Bot size={20} />,
    configPath: '%APPDATA%\\Claude\\claude_desktop_config.json (Windows)\n~/Library/Application Support/Claude/claude_desktop_config.json (macOS)',
    description: 'Aplicacion de escritorio de Claude'
  },
  'cursor': {
    name: 'Cursor',
    icon: <Terminal size={20} />,
    configPath: '~/.cursor/mcp.json',
    description: 'Editor de codigo con IA integrada'
  },
  'windsurf': {
    name: 'Windsurf',
    icon: <Settings size={20} />,
    configPath: '~/.windsurf/mcp.json',
    description: 'Editor de codigo AI-first'
  },
  'opencode': {
    name: 'OpenCode',
    icon: <Terminal size={20} />,
    configPath: '~/.config/opencode/config.json',
    description: 'CLI open source para desarrollo con IA'
  }
};

export default function MCPConnectModal({ apiKey, onClose }: MCPConnectModalProps) {
  const [selectedClient, setSelectedClient] = useState<ClientType>('claude-code');
  const [copied, setCopied] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const generateConfig = (client: ClientType): string => {
    const mcpPath = './mcp-server/dist/index.js';
    const envConfig = {
      MD_DOCS_URL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      MD_DOCS_API_KEY: apiKey || 'TU_API_KEY_AQUI'
    };

    if (client === 'opencode') {
      return JSON.stringify({
        '$schema': 'https://opencode.ai/config.json',
        mcp: {
          mdDocs: {
            type: 'local',
            command: ['node', mcpPath],
            enabled: true,
            environment: envConfig
          }
        }
      }, null, 2);
    }

    if (client === 'claude-desktop') {
      return JSON.stringify({
        mcpServers: {
          'md-docs': {
            command: 'node',
            args: [mcpPath],
            env: envConfig
          }
        }
      }, null, 2);
    }

    return JSON.stringify({
      mcpServers: {
        'md-docs': {
          command: 'node',
          args: [mcpPath],
          env: envConfig
        }
      }
    }, null, 2);
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const client = CLIENT_INFO[selectedClient];
  const config = generateConfig(selectedClient);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Conectar MCP</h2>
              <p className="text-sm text-gray-500">Model Context Protocol para agentes de IA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">1. Selecciona tu cliente</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.entries(CLIENT_INFO) as [ClientType, typeof CLIENT_INFO[ClientType]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSelectedClient(key)}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedClient === key
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={selectedClient === key ? 'text-purple-600' : 'text-gray-500'}>
                    {info.icon}
                  </div>
                  <span className={`text-sm font-medium ${selectedClient === key ? 'text-purple-700' : 'text-gray-600'}`}>
                    {info.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {apiKey ? (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">2. Tu API Key</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between gap-4">
                  <code className="text-sm text-gray-700 font-mono flex-1 overflow-x-auto">
                    {showApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-sm text-purple-600 hover:text-purple-700 whitespace-nowrap"
                    >
                      {showApiKey ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button
                      onClick={() => handleCopy(apiKey, 'apikey')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      {copied === 'apikey' ? <Check size={14} /> : <Copy size={14} />}
                      {copied === 'apikey' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Necesitas generar una API Key primero. Ve a configuracion o usa el boton &quot;Generar API Key&quot;.
              </p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">3. Ruta del archivo de configuracion</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 font-mono whitespace-pre-wrap">{client.configPath}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">4. Configuracion JSON</h3>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono">
                {config}
              </pre>
              <button
                onClick={() => handleCopy(config, 'config')}
                className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
              >
                {copied === 'config' ? <Check size={14} /> : <Copy size={14} />}
                {copied === 'config' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Instrucciones:</h4>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Copia la configuracion JSON de arriba</li>
              <li>Abre o crea el archivo de configuracion en la ruta indicada</li>
              <li>Pega la configuracion dentro del archivo</li>
              <li>Reinicia {client.name} para aplicar los cambios</li>
              <li>El agente ya podra acceder a tus documentos</li>
            </ol>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
