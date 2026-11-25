import { auth } from './firebase';

export interface UploadedFileResponse {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  scope: 'brief' | 'receipt' | 'deliverable';
}

async function getBearerToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required');
  }
  return user.getIdToken();
}

export async function uploadPrivateFile(
  file: File,
  scope: 'brief' | 'receipt' | 'deliverable',
  sharedWithUid?: string
): Promise<UploadedFileResponse> {
  const token = await getBearerToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scope', scope);
  if (sharedWithUid) {
    formData.append('sharedWithUid', sharedWithUid);
  }

  const res = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Private file upload failed');
  }
  return data as UploadedFileResponse;
}

export async function grantPrivateFileAccess(fileId: string, targetUid: string): Promise<void> {
  if (!fileId || !targetUid) return;
  const token = await getBearerToken();
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}/grant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetUid }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to grant file access');
  }
}

export async function fetchPrivateFileBlob(fileId: string): Promise<{ url: string; mimeType: string }> {
  const token = await getBearerToken();
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to load private file');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return { url, mimeType: blob.type || 'application/octet-stream' };
}
