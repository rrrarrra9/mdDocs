import { Document, Folder } from '@/types';

const DOCS_KEY = 'md-docs-documents';
const FOLDERS_KEY = 'md-docs-folders';

export function getDocuments(): Document[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(DOCS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getDocumentsByFolder(folderId: string | null): Document[] {
  return getDocuments().filter(doc => doc.folderId === folderId);
}

export function getDocument(id: string): Document | null {
  const documents = getDocuments();
  return documents.find(doc => doc.id === id) || null;
}

export function saveDocument(document: Document): void {
  const documents = getDocuments();
  const index = documents.findIndex(doc => doc.id === document.id);

  if (index >= 0) {
    documents[index] = { ...document, updatedAt: new Date().toISOString() };
  } else {
    documents.push({
      ...document,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(DOCS_KEY, JSON.stringify(documents));
}

export function deleteDocument(id: string): void {
  const documents = getDocuments().filter(doc => doc.id !== id);
  localStorage.setItem(DOCS_KEY, JSON.stringify(documents));
}

export function createDocument(title: string = 'Sin titulo', folderId: string | null = null): Document {
  return {
    id: crypto.randomUUID(),
    title,
    content: '',
    folderId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getFolders(): Folder[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(FOLDERS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getFolder(id: string): Folder | null {
  const folders = getFolders();
  return folders.find(f => f.id === id) || null;
}

export function saveFolder(folder: Folder): void {
  const folders = getFolders();
  const index = folders.findIndex(f => f.id === folder.id);

  if (index >= 0) {
    folders[index] = folder;
  } else {
    folders.push({
      ...folder,
      createdAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export function deleteFolder(id: string): void {
  const folders = getFolders().filter(f => f.id !== id);
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));

  const documents = getDocuments().map(doc => 
    doc.folderId === id ? { ...doc, folderId: null } : doc
  );
  localStorage.setItem(DOCS_KEY, JSON.stringify(documents));
}

export function createFolder(name: string, parentId: string | null = null): Folder {
  return {
    id: crypto.randomUUID(),
    name,
    parentId,
    createdAt: new Date().toISOString(),
  };
}

export function getSubFolders(parentId: string | null): Folder[] {
  return getFolders().filter(f => f.parentId === parentId);
}
