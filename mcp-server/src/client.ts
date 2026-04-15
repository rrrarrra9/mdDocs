import fetch from 'node-fetch';

export interface MdDocsConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'user';
}

export class MdDocsClient {
  private baseUrl: string;
  private apiKey: string;
  private sessionCookie: string = '';

  constructor(config: MdDocsConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey || process.env.MD_DOCS_API_KEY || '';
  }

  setSessionCookie(cookie: string) {
    this.sessionCookie = cookie;
  }

  private async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: object;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  // Documents
  async listDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/api/documents');
  }

  async getDocument(id: string): Promise<Document> {
    return this.request<Document>(`/api/documents/${id}`);
  }

  async createDocument(title: string, content: string = '', folderId?: string): Promise<Document> {
    const body: { title: string; content: string; folderId?: string } = { title, content };
    if (folderId) body.folderId = folderId;
    return this.request<Document>('/api/documents', { method: 'POST', body });
  }

  async updateDocument(id: string, updates: { title?: string; content?: string }): Promise<Document> {
    return this.request<Document>(`/api/documents/${id}`, { method: 'PUT', body: updates });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request(`/api/documents/${id}`, { method: 'DELETE' });
  }

  // Folders
  async listFolders(): Promise<Folder[]> {
    return this.request<Folder[]>('/api/folders');
  }

  async createFolder(name: string, parentId?: string): Promise<Folder> {
    const body: { name: string; parentId?: string } = { name };
    if (parentId) body.parentId = parentId;
    return this.request<Folder>('/api/folders', { method: 'POST', body });
  }

  async deleteFolder(id: string): Promise<void> {
    await this.request(`/api/folders/${id}`, { method: 'DELETE' });
  }

  // Folder tree with documents
  async getFolderTree(): Promise<{
    folders: (Folder & { documents: Document[] })[];
    unorganizedDocs: Document[];
  }> {
    const [folders, documents] = await Promise.all([
      this.listFolders(),
      this.listDocuments()
    ]);

    const folderMap = new Map<string, Folder & { documents: Document[] }>();
    folders.forEach(f => folderMap.set(f.id, { ...f, documents: [] }));

    const unorganizedDocs: Document[] = [];
    documents.forEach(doc => {
      if (doc.folderId && folderMap.has(doc.folderId)) {
        folderMap.get(doc.folderId)!.documents.push(doc);
      } else if (!doc.folderId) {
        unorganizedDocs.push(doc);
      }
    });

    return {
      folders: Array.from(folderMap.values()),
      unorganizedDocs
    };
  }

  // Authentication (for obtaining session)
  async login(email: string, password: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.sessionCookie = setCookie;
      return true;
    }
    return false;
  }
}
