import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  CreditCard,
  Download,
  Settings,
  Sliders,
  Users,
  Wallet,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_LABELS, formatPkr, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../i18n';
import { OrderWorkspacePanel } from './OrderWorkspacePanel';
import { PrivateFileButton } from './PrivateFileViewer';
import type {
  AssignmentRecord,
  CommissionSettings,
  FreelancerApplication,
  FreelancerProfile,
  OrderRecord,
  PaymentSettings,
  ServiceCategory,
  ServiceItem,
  UserProfile,
} from '../types';

interface AdminPortalProps {
  services: ServiceItem[];
  paymentSettings: PaymentSettings;
}

type AdminTab =
  | 'overview'
  | 'payments'
  | 'orders'
  | 'applications'
  | 'freelancers'
  | 'reports'
  | 'pricing';

export function AdminPortal({ services, paymentSettings }: AdminPortalProps) {
  const { firebaseUser, userProfile, lang, seedInitialCatalogIfAdmin } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<(OrderRecord & { id: string })[]>([]);
  const [applications, setApplications] = useState<(FreelancerApplication & { id: string })[]>([]);
  const [freelancers, setFreelancers] = useState<(FreelancerProfile & { id: string })[]>([]);
  const [assignments, setAssignments] = useState<(AssignmentRecord & { id: string })[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
    defaultCommissionPercent: 20,
    socialMediaPercent: 20,
    videoEditingPercent: 20,
    logoBrandingPercent: 20,
    webDevPercent: 20,
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [appRejectNotes, setAppRejectNotes] = useState<Record<string, string>>({});
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});

  // Pricing & settings local editors
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [payForm, setPayForm] = useState<PaymentSettings>(paymentSettings);
  const [commForm, setCommForm] = useState<CommissionSettings>(commissionSettings);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    setPayForm(paymentSettings);
  }, [paymentSettings]);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsersList(snap.docs.map((d) => d.data() as UserProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderRecord) }));
        setOrders(list);
        if (!selectedOrderId && list.length > 0) setSelectedOrderId(list[0].id);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubApps = onSnapshot(
      query(collection(db, 'freelancerApplications'), orderBy('createdAt', 'desc')),
      (snap) =>
        setApplications(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FreelancerApplication) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'freelancerApplications')
    );

    const unsubFreelancers = onSnapshot(
      collection(db, 'freelancers'),
      (snap) => setFreelancers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FreelancerProfile) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'freelancers')
    );

    const unsubAssignments = onSnapshot(
      query(collection(db, 'assignments'), orderBy('createdAt', 'desc')),
      (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AssignmentRecord) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'assignments')
    );

    const unsubComm = onSnapshot(
      doc(db, 'settings', 'commission'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CommissionSettings;
          setCommissionSettings(data);
          setCommForm(data);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/commission')
    );

    return () => {
      unsubUsers();
      unsubOrders();
      unsubApps();
      unsubFreelancers();
      unsubAssignments();
      unsubComm();
    };
  }, []);

  // Live database-backed dashboard statistics
  const stats = useMemo(() => {
    const totalCustomers = usersList.filter((u) => u.role === 'customer').length;
    const totalFreelancers = freelancers.length;
    const pendingApps = applications.filter((a) => a.status === 'pending').length;
    const pendingPayments = orders.filter((o) => o.paymentStatus === 'submitted').length;
    const activeOrders = orders.filter((o) =>
      ['payment_verified', 'in_progress', 'submitted_for_review', 'revision_requested'].includes(o.status)
    ).length;
    const completedOrders = orders.filter((o) => o.status === 'completed').length;
    const verifiedOrders = orders.filter((o) => o.paymentStatus === 'verified');
    const grossRevenuePkr = verifiedOrders.reduce((sum, o) => sum + o.pricePkr, 0);
    const agencyProfitPkr = verifiedOrders.reduce((sum, o) => sum + (o.agencyProfitPkr || 0), 0);
    const freelancerPayablePkr = verifiedOrders.reduce((sum, o) => sum + (o.freelancerEarningPkr || 0), 0);

    return {
      totalCustomers,
      totalFreelancers,
      pendingApps,
      pendingPayments,
      totalOrders: orders.length,
      activeOrders,
      completedOrders,
      grossRevenuePkr,
      agencyProfitPkr,
      freelancerPayablePkr,
    };
  }, [usersList, freelancers, applications, orders]);

  const categoryBreakdown = useMemo(() => {
    const categories: ServiceCategory[] = ['social_media', 'video_editing', 'logo_branding', 'web_dev'];
    return categories.map((cat) => {
      const catOrders = orders.filter((o) => o.serviceCategory === cat && o.paymentStatus === 'verified');
      return {
        category: cat,
        label: CATEGORY_LABELS[cat][lang],
        count: catOrders.length,
        grossPkr: catOrders.reduce((s, o) => s + o.pricePkr, 0),
        profitPkr: catOrders.reduce((s, o) => s + (o.agencyProfitPkr || 0), 0),
        payoutPkr: catOrders.reduce((s, o) => s + (o.freelancerEarningPkr || 0), 0),
      };
    });
  }, [orders, lang]);

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'payment_submitted') return o.paymentStatus === 'submitted';
    return o.status === orderFilter;
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;
  const paymentQueue = orders.filter((o) => o.paymentStatus === 'submitted');

  const handleApplicationDecision = async (
    app: FreelancerApplication & { id: string },
    approve: boolean
  ) => {
    setAdminFeedback(null);
    setAdminError(null);
    const note = appRejectNotes[app.uid] || '';
    if (!approve && !note.trim()) {
      setAdminError('Provide feedback note before rejecting a freelancer application.');
      return;
    }

    try {
      await updateDoc(doc(db, 'freelancerApplications', app.uid), {
        status: approve ? 'approved' : 'rejected',
        adminNote: approve ? 'Approved for Kaarzora specialist roster.' : note.trim(),
        updatedAt: serverTimestamp(),
      });

      if (approve) {
        await setDoc(doc(db, 'freelancers', app.uid), {
          uid: app.uid,
          displayName: app.displayName,
          city: app.city,
          specialty: app.specialty,
          skills: app.skills,
          bio: app.bio,
          portfolioLinks: app.portfolioLinks,
          experienceYears: app.experienceYears,
          availability: 'available',
          status: 'active',
          completedOrders: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'freelancers', app.uid, 'private', 'payout'), {
          uid: app.uid,
          bankName: app.bankName,
          accountTitle: app.accountTitle,
          ibanOrAccount: app.ibanOrAccount,
          updatedAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'users', app.uid), {
          role: 'freelancer',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      setAdminFeedback(
        approve
          ? `${app.displayName} approved and added to active Freelancer roster.`
          : `Application for ${app.displayName} rejected.`
      );
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to process application');
    }
  };

  const handleToggleFreelancerStatus = async (f: FreelancerProfile & { id: string }) => {
    try {
      await updateDoc(doc(db, 'freelancers', f.uid), {
        status: f.status === 'active' ? 'suspended' : 'active',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to update freelancer');
    }
  };

  const handleMarkAssignmentPaid = async (a: AssignmentRecord & { id: string }) => {
    const ref = (payoutRefs[a.id] || '').trim();
    if (!ref) {
      setAdminError('Enter bank payout transaction reference before marking as paid out.');
      return;
    }
    setAdminError(null);
    try {
      await updateDoc(doc(db, 'assignments', a.id), {
        status: 'paid_out',
        payoutReference: ref,
        updatedAt: serverTimestamp(),
      });
      setAdminFeedback(`Payout ${ref} recorded for ${a.freelancerName}.`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to update assignment payout');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setAdminError(null);
    setAdminFeedback(null);
    try {
      await setDoc(doc(db, 'services', editingService.id), {
        ...editingService,
        pricePkr: Number(editingService.pricePkr),
        turnaroundDays: Number(editingService.turnaroundDays),
        commissionRate: Number(editingService.commissionRate),
        updatedAt: serverTimestamp(),
      });
      setEditingService(null);
      setAdminFeedback(`Saved pricing & deliverables for ${editingService.title}.`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to save service');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminFeedback(null);
    try {
      await setDoc(doc(db, 'settings', 'payment'), {
        ...payForm,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'settings', 'commission'), {
        defaultCommissionPercent: Number(commForm.defaultCommissionPercent),
        socialMediaPercent: Number(commForm.socialMediaPercent),
        videoEditingPercent: Number(commForm.videoEditingPercent),
        logoBrandingPercent: Number(commForm.logoBrandingPercent),
        webDevPercent: Number(commForm.webDevPercent),
        updatedAt: serverTimestamp(),
      });
      setAdminFeedback('Bank payment instructions and customizable commission settings updated.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to update agency settings');
    }
  };

  const exportRevenueCsv = () => {
    const header = [
      'OrderCode',
      'BusinessName',
      'Service',
      'Status',
      'PaymentStatus',
      'GrossPKR',
      'CommissionPct',
      'AgencyProfitPKR',
      'FreelancerPayoutPKR',
    ];
    const rows = orders.map((o) => [
      o.orderCode,
      `"${(o.businessName || '').replace(/"/g, '""')}"`,
      `"${o.serviceTitle}"`,
      o.status,
      o.paymentStatus,
      o.pricePkr,
      o.commissionPercent,
      o.agencyProfitPkr,
      o.freelancerEarningPkr,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaarzora-revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Console</h1>
          <p className="text-xs text-stone-600 mt-1">
            Live database operations · {userProfile?.email || firebaseUser?.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 border border-stone-200 rounded-lg">
          {[
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'payments' as const, label: `Payments (${stats.pendingPayments})`, icon: CreditCard },
            { id: 'orders' as const, label: `Orders (${stats.totalOrders})`, icon: Briefcase },
            { id: 'applications' as const, label: `Applications (${stats.pendingApps})`, icon: Users },
            { id: 'freelancers' as const, label: `Freelancers (${stats.totalFreelancers})`, icon: Users },
            { id: 'reports' as const, label: 'Revenue & Payouts', icon: Wallet },
            { id: 'pricing' as const, label: 'Pricing & Commission', icon: Sliders },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tab === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {adminFeedback && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{adminFeedback}</span>
        </div>
      )}
      {adminError && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
          {adminError}
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <div className="text-xs text-stone-500">Total Customers</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                {stats.totalCustomers}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Registered customer accounts</div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <div className="text-xs text-stone-500">Freelancers</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                {stats.totalFreelancers}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                {stats.pendingApps} pending application(s)
              </div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <div className="text-xs text-stone-500">Orders & Projects</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                {stats.totalOrders}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                {stats.activeOrders} active · {stats.completedOrders} completed
              </div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <div className="text-xs text-stone-500">Verified Gross Revenue</div>
              <div className="text-2xl font-bold text-emerald-800 mt-1 font-mono tabular-nums">
                {formatPkr(stats.grossRevenuePkr)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1 tabular-nums">
                Agency Net Profit: {formatPkr(stats.agencyProfitPkr)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Pending Manual Payment Verifications ({paymentQueue.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('payments')}
                  className="text-xs font-medium text-emerald-800 hover:underline"
                >
                  Open Queue
                </button>
              </div>
              {paymentQueue.length === 0 ? (
                <p className="text-xs text-stone-500">All submitted bank transfers are verified.</p>
              ) : (
                <div className="divide-y divide-stone-200">
                  {paymentQueue.slice(0, 5).map((o) => (
                    <div key={o.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {o.orderCode} · {o.businessName}
                        </div>
                        <div className="text-stone-500 font-mono">
                          {o.paymentBank} · TID {o.paymentReference}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(o.id);
                          setTab('orders');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
                      >
                        Inspect ({formatPkr(o.paymentAmountPkr)})
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Revenue by Service Category</h2>
              <div className="space-y-3">
                {categoryBreakdown.map((row) => (
                  <div key={row.category} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100 last:border-0">
                    <div>
                      <div className="font-medium text-slate-900">{row.label}</div>
                      <div className="text-stone-500 tabular-nums">{row.count} verified order(s)</div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-900">{formatPkr(row.grossPkr)}</div>
                      <div className="text-emerald-800">Profit: {formatPkr(row.profitPkr)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PAYMENT VERIFICATION QUEUE */}
      {tab === 'payments' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Manual Bank Receipt Verification Queue ({paymentQueue.length})
            </h2>
          </div>
          {paymentQueue.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No payment receipts currently awaiting manual verification.
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              {paymentQueue.map((o) => (
                <div key={o.id} className="p-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="text-sm font-semibold text-slate-900">
                      {o.orderCode} — {o.title}
                    </div>
                    <div className="text-stone-600">
                      {o.businessName} ({o.customerName}) · Due {formatPkr(o.pricePkr)}
                    </div>
                    <div className="font-mono text-stone-700">
                      Bank: {o.paymentBank} · TID: {o.paymentReference} · Declared:{' '}
                      <strong>{formatPkr(o.paymentAmountPkr)}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {o.paymentReceiptFileId && (
                      <PrivateFileButton
                        fileId={o.paymentReceiptFileId}
                        fileName={o.paymentReceiptName || 'receipt'}
                        label="View Receipt"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderId(o.id);
                        setTab('orders');
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
                    >
                      Verify / Reject in Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ORDERS & ASSIGNMENTS */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-3">
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            >
              <option value="all">All Orders ({orders.length})</option>
              <option value="payment_submitted">Awaiting Payment Verification</option>
              <option value="payment_verified">Payment Verified (Needs Assignment)</option>
              <option value="in_progress">In Production</option>
              <option value="submitted_for_review">Submitted for Review</option>
              <option value="completed">Completed</option>
            </select>

            {filteredOrders.length === 0 ? (
              <div className="p-6 rounded-xl border border-stone-200 bg-white text-xs text-stone-500">
                No orders match this filter.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      selectedOrderId === o.id
                        ? 'bg-white border-emerald-700 ring-1 ring-emerald-700'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-stone-500 mb-1">
                      <span>{o.orderCode}</span>
                      <span className="tabular-nums">{formatPkr(o.pricePkr)}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{o.title}</div>
                    <div className="text-xs text-stone-600 mt-1">
                      {o.businessName} · {ORDER_STATUS_LABELS[o.status][lang]}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Payment: {PAYMENT_STATUS_LABELS[o.paymentStatus][lang]}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {selectedOrder && firebaseUser ? (
              <OrderWorkspacePanel
                order={selectedOrder}
                viewerUid={firebaseUser.uid}
                viewerName={userProfile?.displayName || 'Kaarzora Admin'}
                viewerRole="admin"
                lang={lang}
                paymentSettings={paymentSettings}
                freelancers={freelancers}
                defaultCommissionPercent={
                  selectedOrder.serviceCategory === 'social_media'
                    ? commissionSettings.socialMediaPercent
                    : selectedOrder.serviceCategory === 'video_editing'
                    ? commissionSettings.videoEditingPercent
                    : selectedOrder.serviceCategory === 'logo_branding'
                    ? commissionSettings.logoBrandingPercent
                    : commissionSettings.webDevPercent
                }
              />
            ) : (
              <div className="p-10 rounded-xl border border-stone-200 bg-white text-center text-sm text-stone-500">
                Select an order to verify bank receipts, assign freelancers, or inspect deliverables.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FREELANCER APPLICATIONS */}
      {tab === 'applications' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Freelancer Applications ({applications.length})
          </h2>
          {applications.length === 0 ? (
            <div className="p-8 rounded-xl border border-stone-200 bg-white text-xs text-stone-500">
              No freelancer applications submitted yet.
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{app.displayName}</div>
                      <div className="text-xs text-stone-600 mt-0.5">
                        {CATEGORY_LABELS[app.specialty].en} · {app.city} · {app.experienceYears} yrs exp ·{' '}
                        {app.email} · {app.phone}
                      </div>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                      {app.status}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed">{app.bio}</p>

                  <div className="text-xs text-stone-600 space-y-1">
                    <div>
                      <strong>Skills:</strong> {app.skills.join(', ')}
                    </div>
                    {app.portfolioLinks.length > 0 && (
                      <div className="font-mono">
                        <strong>Portfolio:</strong> {app.portfolioLinks.join(' · ')}
                      </div>
                    )}
                    <div className="font-mono">
                      <strong>Payout Account:</strong> {app.bankName} · {app.accountTitle} · {app.ibanOrAccount}
                    </div>
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => handleApplicationDecision(app, true)}
                        className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
                      >
                        Approve Freelancer
                      </button>
                      <input
                        type="text"
                        value={appRejectNotes[app.uid] || ''}
                        onChange={(e) =>
                          setAppRejectNotes((prev) => ({ ...prev, [app.uid]: e.target.value }))
                        }
                        placeholder="Rejection reason if declining..."
                        className="flex-1 min-w-[220px] px-3 py-2 text-xs rounded-lg border border-stone-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplicationDecision(app, false)}
                        className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: FREELANCER ROSTER */}
      {tab === 'freelancers' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200 text-sm font-semibold text-slate-900">
            Vetted Freelancer Roster ({freelancers.length})
          </div>
          {freelancers.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No active freelancers yet. Approve applications in the Applications tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                  <tr>
                    <th className="py-3 px-4 font-medium">Specialist</th>
                    <th className="py-3 px-4 font-medium">Specialty</th>
                    <th className="py-3 px-4 font-medium">City</th>
                    <th className="py-3 px-4 font-medium">Availability</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {freelancers.map((f) => (
                    <tr key={f.id}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{f.displayName}</div>
                        <div className="text-stone-500">{f.skills.slice(0, 4).join(', ')}</div>
                      </td>
                      <td className="py-3 px-4">{CATEGORY_LABELS[f.specialty].en}</td>
                      <td className="py-3 px-4">{f.city}</td>
                      <td className="py-3 px-4 capitalize">{f.availability}</td>
                      <td className="py-3 px-4 capitalize font-medium">{f.status}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleFreelancerStatus(f)}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs font-medium"
                        >
                          {f.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: REVENUE & PAYOUT REPORTS */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">
              Revenue, Profit & Freelancer Payout Reports
            </h2>
            <button
              type="button"
              onClick={exportRevenueCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Report</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                  <tr>
                    <th className="py-3 px-4 font-medium">Service Category</th>
                    <th className="py-3 px-4 font-medium text-right">Verified Orders</th>
                    <th className="py-3 px-4 font-medium text-right">Gross PKR</th>
                    <th className="py-3 px-4 font-medium text-right">Freelancer Payouts</th>
                    <th className="py-3 px-4 font-medium text-right">Agency Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {categoryBreakdown.map((row) => (
                    <tr key={row.category}>
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.label}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{row.count}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{formatPkr(row.grossPkr)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{formatPkr(row.payoutPkr)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-800">
                        {formatPkr(row.profitPkr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 text-sm font-semibold text-slate-900">
              Assignments & Payout Settlement ({assignments.length})
            </div>
            {assignments.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">No assignments created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                    <tr>
                      <th className="py-3 px-4 font-medium">Order</th>
                      <th className="py-3 px-4 font-medium">Freelancer</th>
                      <th className="py-3 px-4 font-medium text-right">Net Payout</th>
                      <th className="py-3 px-4 font-medium text-right">Commission</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Settle Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{a.orderCode}</div>
                          <div className="text-stone-500">{a.orderTitle}</div>
                        </td>
                        <td className="py-3 px-4">{a.freelancerName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {formatPkr(a.netPayoutPkr)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                          {formatPkr(a.commissionPkr)} ({a.commissionPercent}%)
                        </td>
                        <td className="py-3 px-4 capitalize">{a.status.replace('_', ' ')}</td>
                        <td className="py-3 px-4 text-right">
                          {a.status === 'paid_out' ? (
                            <span className="font-mono text-emerald-800">{a.payoutReference}</span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <input
                                type="text"
                                value={payoutRefs[a.id] || ''}
                                onChange={(e) =>
                                  setPayoutRefs((prev) => ({ ...prev, [a.id]: e.target.value }))
                                }
                                placeholder="Bank Ref / TID"
                                className="px-2 py-1 text-xs rounded border border-stone-200 w-32"
                              />
                              <button
                                type="button"
                                onClick={() => handleMarkAssignmentPaid(a)}
                                className="px-2.5 py-1 rounded bg-emerald-800 text-white text-xs font-medium"
                              >
                                Mark Paid
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRICING, COMMISSION & BANK SETTINGS */}
      {tab === 'pricing' && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">
              Service Pricing Management (PKR)
            </h2>
            <button
              type="button"
              onClick={async () => {
                await seedInitialCatalogIfAdmin();
                setAdminFeedback('Default catalogue and settings synchronized with Firestore.');
              }}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium hover:bg-stone-50"
            >
              Sync Default Catalogue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s) => (
              <div key={s.id} className="p-5 rounded-xl bg-white border border-stone-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-stone-500">
                    {CATEGORY_LABELS[s.category].en} · {s.active ? 'Active' : 'Paused'}
                  </div>
                  <div className="text-base font-semibold text-slate-900 mt-0.5">{s.title}</div>
                  <div className="text-sm font-mono tabular-nums text-emerald-800 font-bold mt-1">
                    {formatPkr(s.pricePkr)} · {s.turnaroundDays} days · {s.commissionRate}% commission
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingService({ ...s })}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium hover:bg-stone-50"
                >
                  Edit Pricing
                </button>
              </div>
            ))}
          </div>

          {editingService && (
            <form
              onSubmit={handleSaveService}
              className="bg-white border border-emerald-700 rounded-xl p-6 space-y-4"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                Editing: {editingService.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Price (PKR)</label>
                  <input
                    type="number"
                    min={500}
                    value={editingService.pricePkr}
                    onChange={(e) =>
                      setEditingService({ ...editingService, pricePkr: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Turnaround (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingService.turnaroundDays}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        turnaroundDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Commission (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={editingService.commissionRate}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        commissionRate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Visibility</label>
                  <select
                    value={editingService.active ? 'active' : 'paused'}
                    onChange={(e) =>
                      setEditingService({ ...editingService, active: e.target.value === 'active' })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
                  >
                    <option value="active">Active on Storefront</option>
                    <option value="paused">Hidden / Paused</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={editingService.description}
                  onChange={(e) =>
                    setEditingService({ ...editingService, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
                >
                  Save Service Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Commission & Bank Details Form */}
          <form
            onSubmit={handleSaveSettings}
            className="bg-white border border-stone-200 rounded-xl p-6 space-y-6"
          >
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Settings className="w-4 h-4 text-emerald-700" />
              <span>Customizable Commission & Manual Bank Transfer Settings</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Default (%)</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={commForm.defaultCommissionPercent}
                  onChange={(e) =>
                    setCommForm({ ...commForm, defaultCommissionPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Social Media (%)</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={commForm.socialMediaPercent}
                  onChange={(e) =>
                    setCommForm({ ...commForm, socialMediaPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Video Editing (%)</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={commForm.videoEditingPercent}
                  onChange={(e) =>
                    setCommForm({ ...commForm, videoEditingPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Logo & Brand (%)</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={commForm.logoBrandingPercent}
                  onChange={(e) =>
                    setCommForm({ ...commForm, logoBrandingPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Web Dev (%)</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={commForm.webDevPercent}
                  onChange={(e) =>
                    setCommForm({ ...commForm, webDevPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={payForm.bankName}
                  onChange={(e) => setPayForm({ ...payForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Account Title</label>
                <input
                  type="text"
                  value={payForm.accountTitle}
                  onChange={(e) => setPayForm({ ...payForm, accountTitle: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={payForm.accountNumber}
                  onChange={(e) => setPayForm({ ...payForm, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">IBAN</label>
                <input
                  type="text"
                  value={payForm.iban}
                  onChange={(e) => setPayForm({ ...payForm, iban: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">EasyPaisa</label>
                <input
                  type="text"
                  value={payForm.jazzcashNumber}
                  onChange={(e) => setPayForm({ ...payForm, jazzcashNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Payment Instructions (English)
              </label>
              <textarea
                rows={2}
                value={payForm.instructions}
                onChange={(e) => setPayForm({ ...payForm, instructions: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
            >
              Save Commission & Bank Settings
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
