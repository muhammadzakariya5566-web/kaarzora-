import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Loader2, X } from 'lucide-react';
import { fetchPrivateFileBlob } from '../lib/api';

interface PrivateFileButtonProps {
  fileId: string;
  fileName: string;
  mimeType?: string;
  label?: string;
}

export function PrivateFileButton({ fileId, fileName, mimeType, label }: PrivateFileButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; mimeType: string } | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const handleOpen = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPrivateFileBlob(fileId);
      const effectiveMime = result.mimeType || mimeType || '';
      if (effectiveMime.startsWith('image/') || effectiveMime === 'application/pdf') {
        setPreview({ url: result.url, mimeType: effectiveMime });
      } else {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(result.url), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDirect = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPrivateFileBlob(fileId);
      const a = document.createElement('a');
      a.href = result.url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(result.url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpen}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-slate-800 transition-colors whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-emerald-700" />}
          <span className="max-w-[180px] truncate">{label || fileName}</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadDirect}
          disabled={loading}
          title={`Download ${fileName}`}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <span className="text-xs text-red-700">{error}</span>}

      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900 truncate">
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">{fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={preview.url}
                  download={fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(preview.url);
                    setPreview(null);
                  }}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-slate-900 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1 bg-stone-100 flex items-center justify-center">
              {preview.mimeType.startsWith('image/') ? (
                <img
                  src={preview.url}
                  alt={fileName}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[72vh] object-contain rounded-lg border border-stone-200 bg-white"
                />
              ) : (
                <iframe src={preview.url} title={fileName} className="w-full h-[72vh] rounded-lg bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
