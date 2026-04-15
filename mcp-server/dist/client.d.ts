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
export declare class MdDocsClient {
    private baseUrl;
    private apiKey;
    private sessionCookie;
    constructor(config: MdDocsConfig);
    setSessionCookie(cookie: string): void;
    private request;
    listDocuments(): Promise<Document[]>;
    getDocument(id: string): Promise<Document>;
    createDocument(title: string, content?: string, folderId?: string): Promise<Document>;
    updateDocument(id: string, updates: {
        title?: string;
        content?: string;
    }): Promise<Document>;
    deleteDocument(id: string): Promise<void>;
    listFolders(): Promise<Folder[]>;
    createFolder(name: string, parentId?: string): Promise<Folder>;
    deleteFolder(id: string): Promise<void>;
    getFolderTree(): Promise<{
        folders: (Folder & {
            documents: Document[];
        })[];
        unorganizedDocs: Document[];
    }>;
    login(email: string, password: string): Promise<boolean>;
}
