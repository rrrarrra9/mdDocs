'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense, memo } from 'react';
import { FileText, Plus, Trash2, Download, Folder as FolderIcon, ChevronRight, ChevronDown, FolderPlus, LogOut, Share2, Users, Shield, Bot, Key } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MCPConnectModal from './MCPConnectModal';

const MDEditor = lazy(() => import('@uiw/react-md-editor').then((mod) => ({ default: mod.default })));

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

interface Document {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
}

interface Permission {
  id: string;
  userId: string;
  folderId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  user?: { id: string; name: string | null; email: string };
}

interface FolderTreeProps {
  folder: Folder;
  documents: Document[];
  folders: Folder[];
  currentDoc: Document | null;
  expandedFolders: Set<string>;
  userPermissions: Map<string, { canRead: boolean; canWrite: boolean; canDelete: boolean }>;
  onSelectDoc: (doc: Document) => void;
  onDeleteDoc: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onAddDoc: (folderId: string) => void;
  onAddFolder: (parentId: string) => void;
  onDeleteFolder: (id: string) => void;
  onShareFolder: (folder: Folder) => void;
}

const FolderTree = memo(function FolderTree({
  folder,
  documents,
  folders,
  currentDoc,
  expandedFolders,
  userPermissions,
  onSelectDoc,
  onDeleteDoc,
  onToggleFolder,
  onAddDoc,
  onAddFolder,
  onDeleteFolder,
  onShareFolder,
}: FolderTreeProps) {
  const isExpanded = expandedFolders.has(folder.id);
  const subFolders = folders.filter(f => f.parentId === folder.id);
  const docsInFolder = documents.filter(doc => doc.folderId === folder.id);
  const perms = userPermissions.get(folder.id);

  return (
    <div>
      <div className="flex items-center gap-1 p-2 rounded-lg cursor-pointer hover:bg-gray-100 group">
        <button onClick={() => onToggleFolder(folder.id)} className="p-0.5">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <FolderIcon size={16} className="text-yellow-500" />
        <span className="flex-1 truncate">{folder.name}</span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={() => onShareFolder(folder)}
            className="p-1 hover:bg-purple-100 rounded text-purple-500"
            title="Compartir"
          >
            <Share2 size={12} />
          </button>
          {perms?.canWrite !== false && (
            <>
              <button
                onClick={() => onAddDoc(folder.id)}
                className="p-1 hover:bg-blue-100 rounded text-blue-500"
                title="Nuevo documento"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => onAddFolder(folder.id)}
                className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                title="Nueva subcarpeta"
              >
                <FolderPlus size={12} />
              </button>
            </>
          )}
          {perms?.canDelete && (
            <button
              onClick={() => onDeleteFolder(folder.id)}
              className="p-1 hover:bg-red-100 rounded text-red-500"
              title="Eliminar carpeta"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="ml-4">
          {docsInFolder.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center justify-between pl-6 p-2 rounded-lg cursor-pointer ${
                currentDoc?.id === doc.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => onSelectDoc(doc)}
                className="flex items-center gap-2 flex-1 text-left truncate"
              >
                <FileText size={14} />
                <span className="truncate text-sm">{doc.title}</span>
              </button>
              {perms?.canDelete && (
                <button
                  onClick={() => onDeleteDoc(doc.id)}
                  className="p-1 hover:bg-red-100 rounded text-red-500"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          {subFolders.map((subFolder) => (
            <FolderTree
              key={subFolder.id}
              folder={subFolder}
              documents={documents}
              folders={folders}
              currentDoc={currentDoc}
              expandedFolders={expandedFolders}
              userPermissions={userPermissions}
              onSelectDoc={onSelectDoc}
              onDeleteDoc={onDeleteDoc}
              onToggleFolder={onToggleFolder}
              onAddDoc={onAddDoc}
              onAddFolder={onAddFolder}
              onDeleteFolder={onDeleteFolder}
              onShareFolder={onShareFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface ShareModalProps {
  folder: Folder;
  onClose: () => void;
  onRefresh: () => void;
}

const ShareModal = memo(function ShareModal({ folder, onClose, onRefresh }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPermissions = async () => {
    const res = await fetch(`/api/folders/${folder.id}/permissions`);
    if (res.ok) {
      setPermissions(await res.json());
    }
  };

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder.id]);

  const handleShare = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/folders/${folder.id}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, canRead, canWrite, canDelete }),
    });
    setLoading(false);
    if (res.ok) {
      setEmail('');
      loadPermissions();
      onRefresh();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al compartir');
    }
  };

  const handleRemovePermission = async (permId: string) => {
    await fetch(`/api/folders/${folder.id}/permissions/${permId}`, {
      method: 'DELETE',
    });
    loadPermissions();
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <Share2 size={20} />
          <h2 className="text-xl font-bold">Compartir: {folder.name}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email del usuario</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="usuario@email.com"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={canRead} onChange={(e) => setCanRead(e.target.checked)} />
              <span className="text-sm">Leer</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={canWrite} onChange={(e) => setCanWrite(e.target.checked)} />
              <span className="text-sm">Escribir</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={canDelete} onChange={(e) => setCanDelete(e.target.checked)} />
              <span className="text-sm">Eliminar</span>
            </label>
          </div>

          <button
            onClick={handleShare}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Compartiendo...' : 'Compartir'}
          </button>
        </div>

        {permissions.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Users size={16} />
              Usuarios con acceso
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {permissions.map((perm) => (
                <div key={perm.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                  <div>
                    <div className="text-sm font-medium">{perm.user?.name || perm.user?.email}</div>
                    <div className="text-xs text-gray-500">
                      {[perm.canRead && 'Leer', perm.canWrite && 'Escribir', perm.canDelete && 'Eliminar']
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePermission(perm.id)}
                    className="p-1 hover:bg-red-100 rounded text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
});

export default function Editor() {
  const { data: session } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [shareFolder, setShareFolder] = useState<Folder | null>(null);
  const [userPermissions, setUserPermissions] = useState<Map<string, { canRead: boolean; canWrite: boolean; canDelete: boolean }>>(new Map());
  const [collabUsers, setCollabUsers] = useState<{ userId: string; userName: string; color: string }[]>([]);
  const [showMCPModal, setShowMCPModal] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchData();
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    const res = await fetch('/api/api-key');
    if (res.ok) {
      const data = await res.json();
      setApiKey(data.apiKey || null);
    }
  };

  const handleGenerateApiKey = async () => {
    const res = await fetch('/api/api-key', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setApiKey(data.apiKey);
    }
  };

  const fetchData = async () => {
    const [docsRes, foldersRes] = await Promise.all([
      fetch('/api/documents'),
      fetch('/api/folders'),
    ]);

    if (docsRes.ok) {
      setDocuments(await docsRes.json());
    }
    if (foldersRes.ok) {
      const foldersData = await foldersRes.json();
      setFolders(foldersData);

      const permsMap = new Map<string, { canRead: boolean; canWrite: boolean; canDelete: boolean }>();
      foldersData.forEach((f: { id: string; canRead?: boolean; canWrite?: boolean; canDelete?: boolean }) => {
        permsMap.set(f.id, {
          canRead: f.canRead ?? true,
          canWrite: f.canWrite ?? true,
          canDelete: f.canDelete ?? true,
        });
      });
      setUserPermissions(permsMap);
    }
  };

  const handleNewDocument = async (folderId: string | null = null) => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nuevo Documento', folderId }),
    });
    if (res.ok) {
      const doc = await res.json();
      fetchData();
      setCurrentDoc(doc);
    }
  };

  const handleSelectDocument = async (doc: Document) => {
    const res = await fetch(`/api/documents/${doc.id}`);
    if (res.ok) {
      setCurrentDoc(await res.json());
    }
  };

  const handleSaveDocument = useCallback(async (content: string) => {
    if (!currentDoc) return;

    await fetch(`/api/documents/${currentDoc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setCurrentDoc(prev => prev ? { ...prev, content } : null);
  }, [currentDoc?.id]);

  const handleDeleteDocument = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    fetchData();
    if (currentDoc?.id === id) {
      setCurrentDoc(null);
    }
  };

  const handleToggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    fetchData();
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleNewSubFolder = async (parentId: string) => {
    const name = prompt('Nombre de la carpeta:');
    if (name) {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      });
      fetchData();
      setExpandedFolders((prev) => new Set(prev).add(parentId));
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (confirm('¿Eliminar esta carpeta? Los documentos se moverán a la raíz.')) {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

const handleExportPDF = async () => {
  if (!currentDoc) return;

  const html2pdf = (await import('html2pdf.js')).default;
  const ReactMarkdown = (await import('react-markdown')).default;
  const remarkGfm = (await import('remark-gfm')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');

  const markdownElement = React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
  }, currentDoc.content);

  const renderedHtml = renderToStaticMarkup(markdownElement);

  const element = document.createElement('div');
  element.innerHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #333; margin: 0; padding: 20px; }
    h1 { font-size: 28px; font-weight: bold; margin: 24px 0 16px 0; color: #111; border-bottom: 2px solid #333; padding-bottom: 8px; break-after: avoid; }
    h2 { font-size: 22px; font-weight: bold; margin: 20px 0 12px 0; color: #222; border-bottom: 1px solid #ccc; padding-bottom: 6px; break-after: avoid; }
    h3 { font-size: 18px; font-weight: bold; margin: 18px 0 10px 0; color: #333; break-after: avoid; }
    h4 { font-size: 16px; font-weight: bold; margin: 16px 0 8px 0; color: #333; break-after: avoid; }
    h5 { font-size: 14px; font-weight: bold; margin: 14px 0 6px 0; color: #444; break-after: avoid; }
    h6 { font-size: 13px; font-weight: bold; margin: 12px 0 6px 0; color: #555; break-after: avoid; }
    p { margin: 0 0 12px 0; orphans: 3; widows: 3; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    hr { border: none; border-top: 2px solid #333; margin: 24px 0; }
    ul, ol { margin: 0 0 16px 0; padding-left: 24px; break-inside: avoid; }
    li { margin: 4px 0; }
    blockquote { border-left: 4px solid #555; margin: 16px 0; padding: 8px 16px; background: #f9f9f9; color: #555; font-style: italic; break-inside: avoid; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 16px 0; font-family: 'Courier New', Courier, monospace; font-size: 13px; break-inside: avoid; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', Courier, monospace; font-size: 13px; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; break-inside: avoid; }
    th, td { border: 1px solid #555; padding: 10px 12px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    tr { break-inside: avoid; }
    tr:nth-child(even) { background: #fafafa; }
    img { max-width: 100%; height: auto; margin: 16px 0; break-inside: avoid; }
    a { color: #0066cc; text-decoration: underline; }
    .title { font-size: 32px; font-weight: bold; margin-bottom: 8px; color: #000; }
    .date { font-size: 12px; color: #666; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="title">${currentDoc.title}</div>
  <div class="date">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <hr>
  ${renderedHtml}
</body>
</html>
  `;

  html2pdf()
    .set({
      margin: [0.5, 0.75, 0.5, 0.75],
      filename: `${currentDoc.title}.pdf`,
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    } as any)
    .from(element)
    .save();
};

  const rootFolders = folders.filter(f => f.parentId === null);
  const rootDocs = documents.filter(doc => doc.folderId === null);

  if (!mounted) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col">
<div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800">MD Docs</h1>
          <div className="flex items-center gap-2">
            {session?.user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="p-1 hover:bg-purple-100 rounded text-purple-600"
                title="Panel de Administracion"
              >
                <Shield size={18} />
              </button>
            )}
            <button
              onClick={() => signOut()}
              className="p-1 hover:bg-gray-100 rounded"
              title="Cerrar sesion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMCPModal(true)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium"
          >
            <Bot size={16} />
            Conectar MCP
          </button>
          {!apiKey && (
            <button
              onClick={handleGenerateApiKey}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              title="Generar API Key"
            >
              <Key size={16} />
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 truncate">{session?.user?.name || session?.user?.email}</div>
      </div>

        <div className="p-2 space-y-2">
          <button
            onClick={() => handleNewDocument(null)}
            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Nuevo Documento
          </button>

          {!showNewFolder ? (
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <FolderPlus size={18} />
              Nueva Carpeta
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de carpeta"
                className="flex-1 px-3 py-2 border rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleNewFolder()}
                autoFocus
              />
              <button
                onClick={handleNewFolder}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                OK
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                className="px-3 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                X
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {rootDocs.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer mb-1 ${
                currentDoc?.id === doc.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => handleSelectDocument(doc)}
                className="flex items-center gap-2 flex-1 text-left truncate"
              >
                <FileText size={16} />
                <span className="truncate">{doc.title}</span>
              </button>
              <button
                onClick={() => handleDeleteDocument(doc.id)}
                className="p-1 hover:bg-red-100 rounded text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {rootFolders.map((folder) => (
            <FolderTree
              key={folder.id}
              folder={folder}
              documents={documents}
              folders={folders}
              currentDoc={currentDoc}
              expandedFolders={expandedFolders}
              userPermissions={userPermissions}
              onSelectDoc={handleSelectDocument}
              onDeleteDoc={handleDeleteDocument}
              onToggleFolder={handleToggleFolder}
              onAddDoc={handleNewDocument}
              onAddFolder={handleNewSubFolder}
              onDeleteFolder={handleDeleteFolder}
              onShareFolder={setShareFolder}
            />
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        {currentDoc ? (
          <>
            <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={currentDoc.title}
                  onChange={async (e) => {
                    const updated = { ...currentDoc, title: e.target.value };
                    await fetch(`/api/documents/${currentDoc.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: e.target.value }),
                    });
                    fetchData();
                    setCurrentDoc(updated);
                  }}
              className="text-xl font-semibold bg-transparent border-none outline-none"
            />
                {collabUsers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <div className="flex -space-x-2">
                      {collabUsers.map((user: { userId: string; userName: string; color: string }) => (
                        <div
                          key={user.userId}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: user.color }}
                          title={user.userName}
                        >
                          {user.userName.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={18} />
                Exportar PDF
              </button>
            </header>
          <div className="flex-1 relative">
            <Suspense fallback={<div className="flex items-center justify-center h-full">Cargando editor...</div>}>
              <MDEditor
                value={currentDoc.content}
                onChange={(value) => handleSaveDocument(value || '')}
                height="calc(100vh - 73px)"
              />
            </Suspense>
          </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Selecciona un documento o crea uno nuevo</p>
            </div>
          </div>
        )}
      </main>

      {shareFolder && (
        <ShareModal
          folder={shareFolder}
          onClose={() => setShareFolder(null)}
          onRefresh={fetchData}
        />
      )}

      {showMCPModal && (
        <MCPConnectModal
          apiKey={apiKey}
          onClose={() => setShowMCPModal(false)}
        />
      )}
    </div>
  );
}
