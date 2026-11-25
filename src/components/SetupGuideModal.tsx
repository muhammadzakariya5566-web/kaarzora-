import { Download, Terminal, X } from 'lucide-react';

interface SetupGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ open, onClose }: SetupGuideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-emerald-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Setup Instructions & Source Code
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-slate-900 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-stone-50 border border-stone-200">
            <div>
              <p className="font-semibold text-slate-900">Complete Full-Stack Source Bundle</p>
              <p className="text-xs text-stone-600 mt-0.5">
                Includes React + TypeScript portals, Express API, Firestore rules, and SETUP.md.
              </p>
            </div>
            <a
              href="/api/download-source"
              download="kaarzora-business-services-source.zip"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Source ZIP</span>
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1.5">1. Install & Configure Environment</h3>
              <pre className="p-3 rounded-lg bg-slate-900 text-stone-100 text-xs font-mono overflow-x-auto">
{`npm install
cp .env.example .env
# Add your Firebase config into firebase-applet-config.json`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-1.5">2. Deploy Security Rules</h3>
              <pre className="p-3 rounded-lg bg-slate-900 text-stone-100 text-xs font-mono overflow-x-auto">
{`npx eslint firestore.rules
firebase deploy --only firestore:rules`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-1.5">3. Run Local Server & Production Build</h3>
              <pre className="p-3 rounded-lg bg-slate-900 text-stone-100 text-xs font-mono overflow-x-auto">
{`npm run dev       # Express API + Vite dev server on port 3000
npm run build     # Build client bundle to dist/
NODE_ENV=production npm start`}
              </pre>
            </div>

            <div className="pt-2 border-t border-stone-200 text-xs text-stone-600 space-y-1">
              <p>
                <strong className="text-slate-900">Bootstrapped Admin Account:</strong> Sign in with{' '}
                <span className="font-mono">muhammadzakariya5566@gmail.com</span> to access the Admin Console, verify manual bank transfers, manage PKR pricing, and approve freelancers.
              </p>
              <p>
                <strong className="text-slate-900">Private Uploads:</strong> Brief files, bank receipts, and deliverables are saved outside public directories and streamed only to verified owners, assigned freelancers, and admins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
