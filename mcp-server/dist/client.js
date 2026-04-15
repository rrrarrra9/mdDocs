import fetch from 'node-fetch';
export class MdDocsClient {
    baseUrl;
    apiKey;
    sessionCookie = '';
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey || process.env.MD_DOCS_API_KEY || '';
    }
    setSessionCookie(cookie) {
        this.sessionCookie = cookie;
    }
    async request(path, options = {}) {
        const { method = 'GET', body } = options;
        const headers = {
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
        return response.json();
    }
    // Documents
    async listDocuments() {
        return this.request('/api/documents');
    }
    async getDocument(id) {
        return this.request(`/api/documents/${id}`);
    }
    async createDocument(title, content = '', folderId) {
        const body = { title, content };
        if (folderId)
            body.folderId = folderId;
        return this.request('/api/documents', { method: 'POST', body });
    }
    async updateDocument(id, updates) {
        return this.request(`/api/documents/${id}`, { method: 'PUT', body: updates });
    }
    async deleteDocument(id) {
        await this.request(`/api/documents/${id}`, { method: 'DELETE' });
    }
    // Folders
    async listFolders() {
        return this.request('/api/folders');
    }
    async createFolder(name, parentId) {
        const body = { name };
        if (parentId)
            body.parentId = parentId;
        return this.request('/api/folders', { method: 'POST', body });
    }
    async deleteFolder(id) {
        await this.request(`/api/folders/${id}`, { method: 'DELETE' });
    }
    // Folder tree with documents
    async getFolderTree() {
        const [folders, documents] = await Promise.all([
            this.listFolders(),
            this.listDocuments()
        ]);
        const folderMap = new Map();
        folders.forEach(f => folderMap.set(f.id, { ...f, documents: [] }));
        const unorganizedDocs = [];
        documents.forEach(doc => {
            if (doc.folderId && folderMap.has(doc.folderId)) {
                folderMap.get(doc.folderId).documents.push(doc);
            }
            else if (!doc.folderId) {
                unorganizedDocs.push(doc);
            }
        });
        return {
            folders: Array.from(folderMap.values()),
            unorganizedDocs
        };
    }
    // Authentication (for obtaining session)
    async login(email, password) {
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
