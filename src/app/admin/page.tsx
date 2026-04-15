'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Users, Folder as FolderIcon, Plus, Trash2, Shield, FolderPlus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  user: { id: string; name: string | null; email: string };
  permissions: {
    id: string;
    userId: string;
    user: { id: string; name: string | null; email: string };
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'folders'>('users');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderUser, setNewFolderUser] = useState('');
  const [showAddPerm, setShowAddPerm] = useState<string | null>(null);
  const [permUser, setPermUser] = useState('');
  const [permCanRead, setPermCanRead] = useState(true);
  const [permCanWrite, setPermCanWrite] = useState(false);
  const [permCanDelete, setPermCanDelete] = useState(false);

  const fetchData = useCallback(async () => {
    const [usersRes, foldersRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/folders'),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (foldersRes.ok) setFolders(await foldersRes.json());
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/');
    } else if (status === 'authenticated' && session?.user?.role === 'admin') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router]);

  const handleRoleChange = async (userId: string, role: string) => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    fetchData();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !newFolderUser) return;
    await fetch('/api/admin/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName, userId: newFolderUser }),
    });
    setNewFolderName('');
    setNewFolderUser('');
    fetchData();
  };

  const handleAddPermission = async (folderId: string) => {
    if (!permUser) return;
    await fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId,
        userId: permUser,
        canRead: permCanRead,
        canWrite: permCanWrite,
        canDelete: permCanDelete,
      }),
    });
    setShowAddPerm(null);
    setPermUser('');
    setPermCanRead(true);
    setPermCanWrite(false);
    setPermCanDelete(false);
    fetchData();
  };

  const handleRemovePermission = async (permissionId: string) => {
    await fetch('/api/admin/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionId }),
    });
    fetchData();
  };

  if (status === 'loading' || !session || session.user.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield size={24} className="text-purple-600" />
              Panel de Administración
            </h1>
          </div>
          <span className="text-sm text-gray-600">{session.user.email}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            <Users size={18} />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'folders' ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            <FolderIcon size={18} />
            Carpetas
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Rol</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">{user.name || '-'}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'folders' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FolderPlus size={18} />
                Crear Carpeta
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nombre de carpeta"
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <select
                  value={newFolderUser}
                  onChange={(e) => setNewFolderUser(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar propietario</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || !newFolderUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Crear
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Carpeta</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Propietario</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Permisos</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {folders.map((folder) => (
                    <tr key={folder.id}>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <FolderIcon size={16} className="text-yellow-500" />
                        {folder.name}
                      </td>
                      <td className="px-4 py-3">{folder.user.name || folder.user.email}</td>
                      <td className="px-4 py-3">
                        {folder.permissions.length > 0 ? (
                          <div className="space-y-1">
                            {folder.permissions.map((p) => (
                              <div key={p.id} className="flex items-center gap-2 text-sm">
                                <span>{p.user.name || p.user.email}</span>
                                <span className="text-xs text-gray-500">
                                  [{p.canRead && 'R'}{p.canWrite && 'W'}{p.canDelete && 'D'}]
                                </span>
                                <button
                                  onClick={() => handleRemovePermission(p.id)}
                                  className="p-0.5 hover:bg-red-100 rounded text-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin permisos adicionales</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {showAddPerm === folder.id ? (
                          <div className="space-y-2">
                            <select
                              value={permUser}
                              onChange={(e) => setPermUser(e.target.value)}
                              className="px-2 py-1 border rounded text-sm w-full"
                            >
                              <option value="">Usuario</option>
                              {users
                                .filter((u) => u.id !== folder.user.id)
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name || u.email}
                                  </option>
                                ))}
                            </select>
                            <div className="flex gap-2 text-xs">
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={permCanRead}
                                  onChange={(e) => setPermCanRead(e.target.checked)}
                                />
                                Leer
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={permCanWrite}
                                  onChange={(e) => setPermCanWrite(e.target.checked)}
                                />
                                Escribir
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={permCanDelete}
                                  onChange={(e) => setPermCanDelete(e.target.checked)}
                                />
                                Eliminar
                              </label>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleAddPermission(folder.id)}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setShowAddPerm(null)}
                                className="px-2 py-1 bg-gray-300 rounded text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAddPerm(folder.id)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            + Añadir permiso
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
