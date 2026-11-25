import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { LogOut } from 'lucide-react';
import { db } from './lib/firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DEFAULT_PAYMENT_SETTINGS, DEFAULT_SERVICES } from './data/defaults';
import { UI_COPY } from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLanding } from './components/PublicLanding';
import { CustomerPortal } from './components/CustomerPortal';
import { FreelancerPortal } from './components/FreelancerPortal';
import { AdminPortal } from './components/AdminPortal';
import { SetupGuideModal } from './components/SetupGuideModal';
import type { PaymentSettings, ReviewRecord, ServiceItem } from './types';

type ActiveView = 'landing' | 'customer' | 'freelancer' | 'admin';

function KaarzoraShell() {
  const {
    firebaseUser,
    userProfile,
    freelancerProfile,
    isAdmin,
    authReady,
    authError,
    lang,
    setLang,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [view, setView] = useState<ActiveView>('landing');
  const [setupOpen, setSetupOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);

  const [dbServices, setDbServices] = useState<ServiceItem[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  useEffect(() => {
    const unsubServices = onSnapshot(
      query(collection(db, 'services'), orderBy('sortOrder', 'asc')),
      (snap) => {
        setDbServices(snap.docs.map((d) => d.data() as ServiceItem));
      },
      () => {}
    );

    const unsubPayment = onSnapshot(
      doc(db, 'settings', 'payment'),
      (snap) => {
        if (snap.exists()) {
          setPaymentSettings(snap.data() as PaymentSettings);
        }
      },
      () => {}
    );

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), orderBy('createdAt', 'desc')),
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ReviewRecord) })));
      },
      () => {}
    );

    return () => {
      unsubServices();
      unsubPayment();
      unsubReviews();
    };
  }, []);

  const effectiveServices = dbServices.length > 0 ? dbServices : DEFAULT_SERVICES;
  const copy = UI_COPY[lang];

  const handleOrderService = async (service: ServiceItem) => {
    setPreselectedServiceId(service.id);
    if (!firebaseUser) {
      try {
        await signInWithGoogle();
        setView('customer');
      } catch {
        // Handled in authError
      }
      return;
    }
    setView('customer');
  };

  const handleJoinFreelancer = async () => {
    if (!firebaseUser) {
      try {
        await signInWithGoogle();
        setView('freelancer');
      } catch {
        // Handled in authError
      }
      return;
    }
    setView('freelancer');
  };

  const handlePrimaryHeaderAction = async () => {
    if (!firebaseUser) {
      try {
        await signInWithGoogle();
      } catch {
        // Handled in authError
      }
      return;
    }
    if (view === 'landing') {
      if (isAdmin) setView('admin');
      else if (freelancerProfile) setView('freelancer');
      else setView('customer');
    } else {
      setView('landing');
    }
  };

  return (
    <div dir={lang === 'ur' ? 'rtl' : 'ltr'} className="min-h-screen bg-stone-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setView('landing')}
            className="text-xl font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors"
          >
            {copy.brand}
          </button>

          {/* Zone 2: 4 Concise Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <a
              href="#services"
              onClick={() => setView('landing')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navServices}
            </a>
            <a
              href="#process"
              onClick={() => setView('landing')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navProcess}
            </a>
            <a
              href="#reviews"
              onClick={() => setView('landing')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navReviews}
            </a>
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navSetup}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handlePrimaryHeaderAction}
              className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              {!firebaseUser
                ? copy.signIn
                : view === 'landing'
                ? copy.openPortal
                : copy.backToStorefront}
            </button>
          </div>
        </div>
      </header>

      {/* Portal Switcher Toolbar (shown below top bar when signed in) */}
      {firebaseUser && (
        <div className="bg-white border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setView('landing')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  view === 'landing' ? 'bg-white text-slate-900 shadow-xs' : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                {copy.backToStorefront}
              </button>
              <button
                type="button"
                onClick={() => setView('customer')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  view === 'customer' ? 'bg-white text-slate-900 shadow-xs' : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                {copy.portalCustomer}
              </button>
              <button
                type="button"
                onClick={() => setView('freelancer')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  view === 'freelancer' ? 'bg-white text-slate-900 shadow-xs' : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                {copy.portalFreelancer}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setView('admin')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    view === 'admin' ? 'bg-white text-slate-900 shadow-xs' : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  {copy.portalAdmin}
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-stone-600">
              <span className="truncate max-w-[200px]">
                {userProfile?.displayName || firebaseUser.email}
              </span>
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
                className="font-medium text-emerald-800 hover:underline whitespace-nowrap shrink-0"
              >
                {copy.langToggle}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setView('landing');
                }}
                className="inline-flex items-center gap-1 text-stone-600 hover:text-red-700 font-medium whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{copy.signOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {authError && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
            {authError}
          </div>
        </div>
      )}

      {!authReady ? (
        <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-stone-500">
          Connecting to Kaarzora Business Services...
        </div>
      ) : (
        <main>
          {view === 'landing' && (
            <PublicLanding
              lang={lang}
              onToggleLang={() => setLang(lang === 'en' ? 'ur' : 'en')}
              services={effectiveServices}
              reviews={reviews}
              paymentSettings={paymentSettings}
              isSignedIn={Boolean(firebaseUser)}
              onOrderService={handleOrderService}
              onJoinFreelancer={handleJoinFreelancer}
              onOpenSetupGuide={() => setSetupOpen(true)}
            />
          )}

          {view === 'customer' && firebaseUser && (
            <CustomerPortal
              services={effectiveServices}
              hasFirestoreServices={dbServices.length > 0}
              paymentSettings={paymentSettings}
              preselectedServiceId={preselectedServiceId}
              onClearPreselected={() => setPreselectedServiceId(null)}
            />
          )}

          {view === 'freelancer' && firebaseUser && (
            <FreelancerPortal paymentSettings={paymentSettings} />
          )}

          {view === 'admin' && firebaseUser && isAdmin && (
            <AdminPortal services={effectiveServices} paymentSettings={paymentSettings} />
          )}
        </main>
      )}

      <SetupGuideModal open={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <KaarzoraShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
