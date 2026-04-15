'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RemoteUser {
  userId: string;
  userName: string;
  color: string;
}

interface CollabState {
  content: string;
  version: number;
  users: RemoteUser[];
}

interface UseCollabOptions {
  docId: string | null;
  enabled?: boolean;
}

export function useCollab({ docId, enabled = true }: UseCollabOptions) {
  const [content, setContent] = useState<string>('');
  const [version, setVersion] = useState<number>(0);
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const lastVersion = useRef<number>(0);

  const poll = useCallback(async () => {
    if (!docId || !enabled) return;

    try {
      const res = await fetch(`/api/collab/${docId}?since=${lastVersion.current}`);
      if (res.ok) {
        const data: CollabState = await res.json();
        
        if (data.version > lastVersion.current) {
          setContent(data.content);
          lastVersion.current = data.version;
          setVersion(data.version);
        }
        
        setUsers(data.users);
        setIsConnected(true);
      }
    } catch {
      setIsConnected(false);
    }
  }, [docId, enabled]);

  const updateContent = useCallback(async (newContent: string) => {
    if (!docId || !enabled) return;

    setContent(newContent);

    try {
      const res = await fetch(`/api/collab/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent, version }),
      });

      if (res.ok) {
        const data = await res.json();
        setVersion(data.version);
        lastVersion.current = data.version;
      }
    } catch {
      // Ignore errors
    }
  }, [docId, version, enabled]);

  useEffect(() => {
    if (!docId || !enabled) return;

    poll();

    pollInterval.current = setInterval(poll, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      fetch(`/api/collab/${docId}`, { method: 'DELETE' }).catch(() => {});
    };
  }, [docId, enabled, poll]);

  return {
    content,
    version,
    users,
    isConnected,
    updateContent,
  };
}
