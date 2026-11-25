import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  FilePlus2,
  LayoutList,
  ShoppingBag,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { uploadPrivateFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_LABELS, formatPkr, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../i18n';
import { OrderWorkspacePanel } from './OrderWorkspacePanel';
import type { OrderRecord, PaymentSettings, ServiceItem } from '../types';

interface CustomerPortalProps {
  services: ServiceItem[];
  hasFirestoreServices: boolean;
  paymentSettings: PaymentSettings;
  preselectedServiceId?: string | null;
  onClearPreselected?: () => void;
}

type CustomerTab = 'orders' | 'new_order' | 'catalogue' | 'profile';

export function CustomerPortal({
  services,
  hasFirestoreServices,
  paymentSettings,
  preselectedServiceId,
  onClearPreselected,
}: CustomerPortalProps) {
  const { firebaseUser, userProfile, lang, updateBusinessProfile } = useAuth();
  const [tab, setTab] = useState<CustomerTab>(preselectedServiceId ? 'new_order' : 'orders');

  const [orders, setOrders] = useState<(OrderRecord & { id: string })[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // New Order form state
  const activeServices = services.filter((s) => s.active);
  const [serviceId, setServiceId] = useState(preselectedServiceId || activeServices[0]?.id || '');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 14 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [businessNameInput, setBusinessNameInput] = useState(userProfile?.businessName || '');
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Profile form state
  const [profName, setProfName] = useState(userProfile?.displayName || '');
  const [profBiz, setProfBiz] = useState(userProfile?.businessName || '');
  const [profPhone, setProfPhone] = useState(userProfile?.phone || '');
  const [profCity, setProfCity] = useState(userProfile?.city || 'Lahore');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (preselectedServiceId) {
      setServiceId(preselectedServiceId);
      setTab('new_order');
      onClearPreselected?.();
    }
  }, [preselectedServiceId, onClearPreselected]);

  useEffect(() => {
    if (!serviceId && activeServices.length > 0) {
      setServiceId(activeServices[0].id);
    }
  }, [activeServices, serviceId]);

  useEffect(() => {
    if (userProfile) {
      setProfName(userProfile.displayName || '');
      setProfBiz(userProfile.businessName || '');
      setProfPhone(userProfile.phone || '');
      setProfCity(userProfile.city || 'Lahore');
      if (!businessNameInput && userProfile.businessName) {
        setBusinessNameInput(userProfile.businessName);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'orders'),
      where('customerUid', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderRecord) }));
        setOrders(list);
        setLoadingOrders(false);
        if (!selectedOrderId && list.length > 0) {
          setSelectedOrderId(list[0].id);
        }
      },
      (err) => {
        setLoadingOrders(false);
        handleFirestoreError(err, OperationType.LIST, 'orders');
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const selectedService = activeServices.find((s) => s.id === serviceId) || activeServices[0];
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !selectedService) return;
    setOrderError(null);
    setOrderFeedback(null);

    if (!hasFirestoreServices) {
      setOrderError(
        'The service catalogue has not been published to Firestore yet. Please sign in once as Admin (muhammadzakariya5566@gmail.com) to initialize the catalog.'
      );
      return;
    }

    if (projectTitle.trim().length < 3 || projectDesc.trim().length < 10) {
      setOrderError('Provide a project title (min 3 chars) and description (min 10 chars).');
      return;
    }

    setPlacingOrder(true);
    try {
      const orderRef = doc(collection(db, 'orders'));
      const orderCode = `KL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const commPct = selectedService.commissionRate ?? 20;
      const agencyProfit = Math.round((selectedService.pricePkr * commPct) / 100);
      const freelancerEarning = Math.max(0, selectedService.pricePkr - agencyProfit);

      await setDoc(orderRef, {
        orderCode,
        customerUid: firebaseUser.uid,
        customerName: userProfile?.displayName || firebaseUser.displayName || 'Customer',
        businessName: businessNameInput.trim() || userProfile?.businessName || 'Pakistani Business',
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        serviceCategory: selectedService.category,
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        deadline,
        pricePkr: selectedService.pricePkr,
        commissionPercent: commPct,
        freelancerEarningPkr: freelancerEarning,
        agencyProfitPkr: agencyProfit,
        status: 'awaiting_payment',
        paymentStatus: 'unpaid',
        paymentBank: '',
        paymentReference: '',
        paymentAmountPkr: 0,
        paymentReceiptFileId: '',
        paymentReceiptName: '',
        paymentNotes: '',
        paymentVerifiedBy: '',
        paymentRejectionReason: '',
        assignedFreelancerUid: '',
        assignedFreelancerName: '',
        reviewRating: 0,
        reviewComment: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (briefFile) {
        const uploaded = await uploadPrivateFile(briefFile, 'brief');
        await addDoc(collection(db, 'orders', orderRef.id, 'files'), {
          ownerUid: firebaseUser.uid,
          ownerName: userProfile?.displayName || firebaseUser.displayName || 'Customer',
          ownerRole: 'customer',
          kind: 'brief',
          fileId: uploaded.fileId,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          note: 'Initial project brief attachment',
          createdAt: serverTimestamp(),
        });
      }

      setProjectTitle('');
      setProjectDesc('');
      setBriefFile(null);
      setSelectedOrderId(orderRef.id);
      setOrderFeedback(`Order ${orderCode} created. Complete bank transfer and submit your receipt below.`);
      setTab('orders');
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await updateBusinessProfile({
        displayName: profName,
        businessName: profBiz,
        phone: profPhone,
        city: profCity,
      });
      setProfileSaved(true);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Portal Sub-Header & Segmented Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Portal</h1>
          <p className="text-xs text-stone-600 mt-1">
            {userProfile?.businessName || userProfile?.displayName} <span aria-hidden="true">·</span>{' '}
            {userProfile?.city || 'Pakistan'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 border border-stone-200 rounded-lg">
          {[
            { id: 'orders' as const, label: `My Orders (${orders.length})`, icon: LayoutList },
            { id: 'new_order' as const, label: 'Place New Order', icon: FilePlus2 },
            { id: 'catalogue' as const, label: 'Service Pricing', icon: ShoppingBag },
            { id: 'profile' as const, label: 'Business Profile', icon: Building2 },
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

      {orderFeedback && (
        <div className="mb-6 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{orderFeedback}</span>
        </div>
      )}

      {/* TAB: MY ORDERS */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Your Orders</h2>
            {loadingOrders ? (
              <div className="p-6 rounded-xl border border-stone-200 bg-white text-xs text-stone-500">
                Loading your orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-6 rounded-xl border border-stone-200 bg-white space-y-3">
                <p className="text-sm font-medium text-slate-900">No orders placed yet</p>
                <p className="text-xs text-stone-600">
                  Start by selecting one of our four digital agency packages in PKR.
                </p>
                <button
                  type="button"
                  onClick={() => setTab('new_order')}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
                >
                  Create First Order
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      selectedOrderId === order.id
                        ? 'bg-white border-emerald-700 ring-1 ring-emerald-700'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-stone-500 mb-1">
                      <span>{order.orderCode}</span>
                      <span className="tabular-nums">{formatPkr(order.pricePkr)}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{order.title}</div>
                    <div className="text-xs text-stone-600 mt-1">
                      {ORDER_STATUS_LABELS[order.status][lang]} ·{' '}
                      {PAYMENT_STATUS_LABELS[order.paymentStatus][lang]}
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
                viewerName={userProfile?.displayName || firebaseUser.displayName || 'Customer'}
                viewerRole="customer"
                lang={lang}
                paymentSettings={paymentSettings}
              />
            ) : (
              <div className="p-10 rounded-xl border border-stone-200 bg-white text-center text-sm text-stone-500">
                Select an order on the left to inspect payment instructions, private files, messages, and deliverables.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PLACE NEW ORDER */}
      {tab === 'new_order' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handlePlaceOrder}
            className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-6 space-y-5"
          >
            <h2 className="text-lg font-semibold text-slate-900">Place a Service Order</h2>

            {orderError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {orderError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Select Service</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-stone-200 bg-white"
              >
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {formatPkr(s.pricePkr)} ({s.turnaroundDays} days)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={businessNameInput}
                  onChange={(e) => setBusinessNameInput(e.target.value)}
                  placeholder="e.g., Al-Noor Textiles Lahore"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Target Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Project Title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g., Eid Collection Instagram Reels & Storefront"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Project Brief & Requirements
              </label>
              <textarea
                rows={4}
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Describe your products, target Pakistani cities, preferred colors, Urdu/English copy preferences, and deliverables..."
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Private Brief Attachment (Logo, Brand Guide, Raw Clips — Optional, max 25MB)
              </label>
              <input
                type="file"
                onChange={(e) => setBriefFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-stone-200 file:text-xs file:font-medium file:bg-stone-50"
              />
            </div>

            <button
              type="submit"
              disabled={placingOrder}
              className="px-6 py-2.5 rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 disabled:opacity-50"
            >
              {placingOrder ? 'Creating Order...' : 'Create Order & View Bank Instructions'}
            </button>
          </form>

          {selectedService && (
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 space-y-4">
              <div className="text-xs text-stone-500">
                {CATEGORY_LABELS[selectedService.category][lang]} · {selectedService.turnaroundDays} days turnaround
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{selectedService.title}</h3>
              <div className="text-2xl font-bold text-emerald-800 font-mono tabular-nums">
                {formatPkr(selectedService.pricePkr)}
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{selectedService.description}</p>
              <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs text-stone-700">
                <div className="font-semibold text-slate-900">Included Deliverables:</div>
                {selectedService.deliverables.map((d) => (
                  <div key={d}>· {d}</div>
                ))}
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs text-stone-600 space-y-1">
                <div className="font-semibold text-slate-900">Manual Payment Account</div>
                <div>{paymentSettings.bankName} — {paymentSettings.accountTitle}</div>
                <div className="font-mono">{paymentSettings.iban}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: CATALOGUE */}
      {tab === 'catalogue' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeServices.map((s) => (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs text-stone-500">{CATEGORY_LABELS[s.category][lang]}</span>
                  <span className="text-sm font-bold text-emerald-800 font-mono tabular-nums">
                    {formatPkr(s.pricePkr)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-xs text-stone-600 mb-4">{s.description}</p>
                <ul className="space-y-1 text-xs text-stone-700">
                  {s.deliverables.map((d) => (
                    <li key={d}>· {d}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setTab('new_order');
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-emerald-800"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Order {s.title}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB: BUSINESS PROFILE */}
      {tab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="max-w-xl bg-white border border-stone-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">Customer Business Registration</h2>
          <p className="text-xs text-stone-600">
            Keep your Pakistani business contact details current for invoicing and project delivery updates.
          </p>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profName}
              onChange={(e) => setProfName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Business / Shop Name</label>
            <input
              type="text"
              value={profBiz}
              onChange={(e) => setProfBiz(e.target.value)}
              placeholder="e.g., Crescent Dental Clinic"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">WhatsApp / Phone</label>
              <input
                type="text"
                value={profPhone}
                onChange={(e) => setProfPhone(e.target.value)}
                placeholder="0300-1234567"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">City</label>
              <input
                type="text"
                value={profCity}
                onChange={(e) => setProfCity(e.target.value)}
                placeholder="Lahore / Karachi / Islamabad"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>
          </div>

          {profileSaved && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              Business profile updated.
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save Business Profile'}
          </button>
        </form>
      )}
    </div>
  );
}
