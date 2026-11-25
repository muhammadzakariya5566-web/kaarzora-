import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const ADMIN_EMAIL = 'muhammadzakariya5566@gmail.com';
const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = path.resolve(process.cwd(), 'private_uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminAuth = getAuth();

interface AuthenticatedRequest extends Request {
  authUser?: DecodedIdToken;
}

interface StoredFileMeta {
  fileId: string;
  ownerUid: string;
  ownerEmail: string;
  scope: 'brief' | 'receipt' | 'deliverable';
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  allowedUids: string[];
  createdAt: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

function isSafeId(value: string): boolean {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{4,128}$/.test(value);
}

function isBootstrappedAdmin(decoded?: DecodedIdToken): boolean {
  return Boolean(decoded && decoded.email_verified === true && decoded.email === ADMIN_EMAIL);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160) || 'file';
}

function resolvePrivatePath(filename: string): string {
  const safeBase = path.basename(filename);
  const resolved = path.resolve(UPLOAD_DIR, safeBase);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error('Invalid file path');
  }
  return resolved;
}

async function requireFirebaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization Bearer token' });
    return;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    res.status(401).json({ error: 'Empty token' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.email_verified !== true) {
      res.status(403).json({ error: 'Verified email required' });
      return;
    }
    req.authUser = decoded;
    next();
  } catch (err) {
    console.error('Firebase token verification error:', err);
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'Kaarzora Business Services API' });
  });

  // Upload a private file (project brief, payment receipt, or deliverable)
  app.post('/api/files/upload', requireFirebaseAuth, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
    try {
      const file = req.file;
      const user = req.authUser;
      if (!file || !user) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        res.status(400).json({ error: `Unsupported file type: ${file.mimetype}` });
        return;
      }

      const rawScope = String(req.body?.scope || 'brief');
      const scope: StoredFileMeta['scope'] =
        rawScope === 'receipt' || rawScope === 'deliverable' ? rawScope : 'brief';

      const allowedUidsRaw = String(req.body?.sharedWithUid || '').trim();
      const allowedUids: string[] = [];
      if (allowedUidsRaw && isSafeId(allowedUidsRaw)) {
        allowedUids.push(allowedUidsRaw);
      }

      const fileId = crypto.randomUUID();
      const safeName = sanitizeFilename(file.originalname);
      const binPath = resolvePrivatePath(`${fileId}.bin`);
      const metaPath = resolvePrivatePath(`${fileId}.meta.json`);

      const meta: StoredFileMeta = {
        fileId,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        scope,
        originalName: safeName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        allowedUids,
        createdAt: new Date().toISOString(),
      };

      fs.writeFileSync(binPath, file.buffer);
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

      res.status(201).json({
        fileId: meta.fileId,
        fileName: meta.originalName,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        scope: meta.scope,
      });
    } catch (err) {
      console.error('Private file upload failed:', err);
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  // Grant access to a private file (e.g., admin assigning a freelancer to an order)
  app.post('/api/files/:fileId/grant', requireFirebaseAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const fileId = String(req.params.fileId || '');
      const targetUid = String(req.body?.targetUid || '').trim();
      const user = req.authUser;

      if (!isSafeId(fileId) || !isSafeId(targetUid) || !user) {
        res.status(400).json({ error: 'Invalid fileId or targetUid' });
        return;
      }

      const metaPath = resolvePrivatePath(`${fileId}.meta.json`);
      if (!fs.existsSync(metaPath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as StoredFileMeta;
      if (meta.ownerUid !== user.uid && !isBootstrappedAdmin(user)) {
        res.status(403).json({ error: 'Only file owner or admin can grant access' });
        return;
      }

      if (!meta.allowedUids.includes(targetUid)) {
        meta.allowedUids.push(targetUid);
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
      }

      res.json({ ok: true, fileId });
    } catch (err) {
      console.error('Grant access failed:', err);
      res.status(500).json({ error: 'Unable to update file access' });
    }
  });

  // Download or preview a private file (authenticated + authorized only)
  app.get('/api/files/:fileId', requireFirebaseAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const fileId = String(req.params.fileId || '');
      const user = req.authUser;
      if (!isSafeId(fileId) || !user) {
        res.status(400).json({ error: 'Invalid file identifier' });
        return;
      }

      const metaPath = resolvePrivatePath(`${fileId}.meta.json`);
      const binPath = resolvePrivatePath(`${fileId}.bin`);
      if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as StoredFileMeta;
      const isAuthorized =
        meta.ownerUid === user.uid ||
        isBootstrappedAdmin(user) ||
        meta.allowedUids.includes(user.uid);

      if (!isAuthorized) {
        res.status(403).json({ error: 'You do not have permission to access this private file' });
        return;
      }

      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${meta.originalName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      fs.createReadStream(binPath).pipe(res);
    } catch (err) {
      console.error('Private file retrieval failed:', err);
      res.status(500).json({ error: 'Unable to retrieve private file' });
    }
  });

  // Downloadable source code bundle (excludes private uploads, node_modules, secrets)
  app.get('/api/download-source', async (_req: Request, res: Response) => {
    try {
      const zip = new JSZip();
      const rootDir = process.cwd();
      const excludedDirs = new Set(['node_modules', 'dist', '.git', 'private_uploads', '.aistudio']);
      const excludedFiles = new Set(['.env', 'firebase-applet-config.json']);

      const walkAndAdd = (currentDir: string, zipFolder: JSZip) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (excludedDirs.has(entry.name)) continue;
            const childFolder = zipFolder.folder(entry.name);
            if (childFolder) {
              walkAndAdd(path.join(currentDir, entry.name), childFolder);
            }
          } else if (entry.isFile()) {
            if (excludedFiles.has(entry.name) || entry.name.startsWith('.env.local')) continue;
            const fullPath = path.join(currentDir, entry.name);
            zipFolder.file(entry.name, fs.readFileSync(fullPath));
          }
        }
      };

      walkAndAdd(rootDir, zip);

      zip.file(
        'firebase-applet-config.example.json',
        JSON.stringify(
          {
            projectId: 'YOUR_FIREBASE_PROJECT_ID',
            appId: 'YOUR_FIREBASE_APP_ID',
            apiKey: 'YOUR_FIREBASE_API_KEY',
            authDomain: 'YOUR_PROJECT.firebaseapp.com',
            firestoreDatabaseId: '(default)',
            storageBucket: 'YOUR_PROJECT.appspot.com',
            messagingSenderId: '000000000000',
          },
          null,
          2
        )
      );

      const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="kaarzora-business-services-source.zip"');
      res.send(buffer);
    } catch (err) {
      console.error('Source archive error:', err);
      res.status(500).json({ error: 'Failed to generate source archive' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kaarzora Business Services listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
