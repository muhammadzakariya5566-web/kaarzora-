import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Award,
  CheckCircle2,
  FolderKanban,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_LABELS, formatPkr, ORDER_STATUS_LABELS } from '../i18n';
import { OrderWorkspacePanel } from './OrderWorkspacePanel';
import type {
  AssignmentRecord,
  FreelancerApplication,
  FreelancerPayout,
  OrderRecord,
  PaymentSettings,
  ServiceCategory,
} from '../types';

interface FreelancerPortalProps {
  paymentSettings: PaymentSettings;
}

type FreelancerTab = 'projects' | 'earnings' | 'profile';

export function FreelancerPortal({ paymentSettings }: FreelancerPortalProps) {
  const { firebaseUser, userProfile, freelancerProfile, lang } = useAuth();
  const [tab, setTab] = useState<FreelancerTab>('projects');

  const [application, setApplication] = useState<FreelancerApplication | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  const [assignedOrders, setAssignedOrders] = useState<(OrderRecord & { id: string })[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<(AssignmentRecord & { id: string })[]>([]);
  const [payoutInfo, setPayoutInfo] = useState<FreelancerPayout | null>(null);

  // Registration / Application Form state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [specialty, setSpecialty] = useState<ServiceCategory>('social_media');
  const [skillsText, setSkillsText] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioText, setPortfolioText] = useState('');
  const [experienceYears, setExperienceYears] = useState('2');
  const [bankName, setBankName] = useState('Meezan Bank');
  const [accountTitle, setAccountTitle] = useState('');
  const [ibanOrAccount, setIbanOrAccount] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appFeedback, setAppFeedback] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  // Active Freelancer Profile edit state
  const [availability, setAvailability] = useState<'available' | 'busy'>('available');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName((prev) => prev || userProfile.displayName || '');
      setAccountTitle((prev) => prev || userProfile.displayName || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!firebaseUser) return;
    const appRef = doc(db, 'freelancerApplications', firebaseUser.uid);
    const unsubApp = onSnapshot(
      appRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as FreelancerApplication;
          setApplication(data);
          setDisplayName(data.displayName);
          setPhone(data.phone);
          setCity(data.city);
          setSpecialty(data.specialty);
          setSkillsText(data.skills.join(', '));
          setBio(data.bio);
          setPortfolioText(data.portfolioLinks.join('\n'));
          setExperienceYears(String(data.experienceYears));
          setBankName(data.bankName);
          setAccountTitle(data.accountTitle);
          setIbanOrAccount(data.ibanOrAccount);
        } else {
          setApplication(null);
        }
        setLoadingApp(false);
      },
      (err) => {
        setLoadingApp(false);
        handleFirestoreError(err, OperationType.GET, `freelancerApplications/${firebaseUser.uid}`);
      }
    );

    return () => unsubApp();
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser || !freelancerProfile) return;

    setAvailability(freelancerProfile.availability);
    setDisplayName(freelancerProfile.displayName);
    setCity(freelancerProfile.city);
    setSkillsText(freelancerProfile.skills.join(', '));
    setBio(freelancerProfile.bio);
    setPortfolioText(freelancerProfile.portfolioLinks.join('\n'));
    setExperienceYears(String(freelancerProfile.experienceYears));

    const ordersQ = query(
      collection(db, 'orders'),
      where('assignedFreelancerUid', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubOrders = onSnapshot(
      ordersQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderRecord) }));
        setAssignedOrders(list);
        if (!selectedOrderId && list.length > 0) {
          setSelectedOrderId(list[0].id);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const assignQ = query(
      collection(db, 'assignments'),
      where('freelancerUid', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubAssign = onSnapshot(
      assignQ,
      (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AssignmentRecord) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'assignments')
    );

    const payoutRef = doc(db, 'freelancers', firebaseUser.uid, 'private', 'payout');
    const unsubPayout = onSnapshot(
      payoutRef,
      (snap) => {
        if (snap.exists()) {
          const p = snap.data() as FreelancerPayout;
          setPayoutInfo(p);
          setBankName(p.bankName);
          setAccountTitle(p.accountTitle);
          setIbanOrAccount(p.ibanOrAccount);
        }
      },
      () => {}
    );

    return () => {
      unsubOrders();
      unsubAssign();
      unsubPayout();
    };
  }, [firebaseUser, freelancerProfile]);

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setAppError(null);
    setAppFeedback(null);

    const skills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 15);
    const portfolioLinks = portfolioText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (skills.length === 0) {
      setAppError('Add at least one skill (comma-separated).');
      return;
    }
    if (bio.trim().length < 10) {
      setAppError('Write a brief professional bio (at least 10 characters).');
      return;
    }

    setSubmittingApp(true);
    try {
      const appRef = doc(db, 'freelancerApplications', firebaseUser.uid);
      if (application && application.status === 'rejected') {
        await updateDoc(appRef, {
          displayName: displayName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          specialty,
          skills,
          bio: bio.trim(),
          portfolioLinks,
          experienceYears: Number(experienceYears) || 1,
          bankName: bankName.trim(),
          accountTitle: accountTitle.trim(),
          ibanOrAccount: ibanOrAccount.trim(),
          status: 'pending',
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(appRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: displayName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          specialty,
          skills,
          bio: bio.trim(),
          portfolioLinks,
          experienceYears: Number(experienceYears) || 1,
          bankName: bankName.trim(),
          accountTitle: accountTitle.trim(),
          ibanOrAccount: ibanOrAccount.trim(),
          status: 'pending',
          adminNote: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setAppFeedback('Freelancer application submitted for Admin review.');
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Unable to submit application');
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleSaveFreelancerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !freelancerProfile) return;
    setSavingProfile(true);
    setAppFeedback(null);
    setAppError(null);
    try {
      const skills = skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 15);
      const portfolioLinks = portfolioText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);

      await updateDoc(doc(db, 'freelancers', firebaseUser.uid), {
        displayName: displayName.trim(),
        city: city.trim(),
        skills: skills.length ? skills : freelancerProfile.skills,
        bio: bio.trim(),
        portfolioLinks,
        experienceYears: Number(experienceYears) || 1,
        availability,
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'freelancers', firebaseUser.uid, 'private', 'payout'), {
        uid: firebaseUser.uid,
        bankName: bankName.trim(),
        accountTitle: accountTitle.trim(),
        ibanOrAccount: ibanOrAccount.trim(),
        updatedAt: serverTimestamp(),
      });
      setAppFeedback('Freelancer portfolio and private payout settings saved.');
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Unable to update freelancer profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loadingApp) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-sm text-stone-500">
        Loading freelancer workspace...
      </div>
    );
  }

  // If NOT yet approved as an active freelancer, show registration / pending application screen
  if (!freelancerProfile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Freelancer Registration & Onboarding
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Apply to join Kaarzora Business Services as a vetted specialist in Social Media, Video Editing, Branding, or Web Development.
          </p>
        </div>

        {application && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              application.status === 'pending'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : application.status === 'rejected'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="font-semibold capitalize">Application Status: {application.status}</div>
            {application.status === 'pending' && (
              <p className="text-xs mt-1">
                Our Admin team is reviewing your skills and portfolio. Once approved, your Freelancer Portal unlocks automatically.
              </p>
            )}
            {application.adminNote && (
              <p className="text-xs mt-1">
                <strong>Admin Note:</strong> {application.adminNote}
              </p>
            )}
          </div>
        )}

        {appFeedback && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            {appFeedback}
          </div>
        )}
        {appError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
            {appError}
          </div>
        )}

        {(!application || application.status === 'rejected') && (
          <form
            onSubmit={handleSubmitApplication}
            className="bg-white border border-stone-200 rounded-xl p-6 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Primary Specialty</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as ServiceCategory)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
                >
                  {(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat].en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Premiere Pro, Reels Editing, Meta Ads, React, Figma"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Professional Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Summarize your agency/freelance background and Pakistani business campaigns delivered..."
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Portfolio URLs (one per line)
              </label>
              <textarea
                rows={2}
                value={portfolioText}
                onChange={(e) => setPortfolioText(e.target.value)}
                placeholder="https://behance.net/your-work"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 font-mono"
              />
            </div>

            <div className="pt-4 border-t border-stone-200 space-y-3">
              <div className="text-xs font-semibold text-slate-900">
                Payout Bank / Mobile Wallet Details (Kept Private)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Bank / Wallet</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Account Title</label>
                  <input
                    type="text"
                    value={accountTitle}
                    onChange={(e) => setAccountTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">IBAN / Account #</label>
                  <input
                    type="text"
                    value={ibanOrAccount}
                    onChange={(e) => setIbanOrAccount(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingApp}
              className="px-6 py-2.5 rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 disabled:opacity-50"
            >
              {submittingApp ? 'Submitting...' : 'Submit Freelancer Application'}
            </button>
          </form>
        )}
      </div>
    );
  }

  const selectedOrder = assignedOrders.find((o) => o.id === selectedOrderId) || null;
  const totalEarnedPkr = assignments
    .filter((a) => a.status === 'completed' || a.status === 'paid_out')
    .reduce((sum, a) => sum + a.netPayoutPkr, 0);
  const pendingPkr = assignments
    .filter((a) => a.status === 'active' || a.status === 'submitted')
    .reduce((sum, a) => sum + a.netPayoutPkr, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Freelancer Portal</h1>
          <p className="text-xs text-stone-600 mt-1">
            {freelancerProfile.displayName} <span aria-hidden="true">·</span>{' '}
            {CATEGORY_LABELS[freelancerProfile.specialty][lang]} <span aria-hidden="true">·</span>{' '}
            Status: {freelancerProfile.status} ({freelancerProfile.availability})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 border border-stone-200 rounded-lg">
          {[
            { id: 'projects' as const, label: `Assigned Projects (${assignedOrders.length})`, icon: FolderKanban },
            { id: 'earnings' as const, label: 'Earnings & Assignments', icon: Wallet },
            { id: 'profile' as const, label: 'Skills & Portfolio', icon: UserCheck },
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

      {appFeedback && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{appFeedback}</span>
        </div>
      )}

      {/* TAB: ASSIGNED PROJECTS */}
      {tab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Assigned Orders</h2>
            {assignedOrders.length === 0 ? (
              <div className="p-6 rounded-xl border border-stone-200 bg-white text-xs text-stone-600">
                No projects assigned yet. When the Admin assigns a payment-verified order to you, it will appear here automatically.
              </div>
            ) : (
              <div className="space-y-2.5">
                {assignedOrders.map((order) => (
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
                      <span className="tabular-nums text-emerald-800 font-semibold">
                        {formatPkr(order.freelancerEarningPkr)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{order.title}</div>
                    <div className="text-xs text-stone-600 mt-1">
                      {ORDER_STATUS_LABELS[order.status][lang]} · Due {order.deadline}
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
                viewerName={freelancerProfile.displayName}
                viewerRole="freelancer"
                lang={lang}
                paymentSettings={paymentSettings}
              />
            ) : (
              <div className="p-10 rounded-xl border border-stone-200 bg-white text-center text-sm text-stone-500">
                Select an assigned project to manage tasks, download brief files, and submit deliverables.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: EARNINGS & ASSIGNMENTS */}
      {tab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <div className="text-xs text-stone-500">Active / Pending Payouts</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                {formatPkr(pendingPkr)}
              </div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <div className="text-xs text-stone-500">Completed & Paid Earnings</div>
              <div className="text-2xl font-bold text-emerald-800 mt-1 font-mono tabular-nums">
                {formatPkr(totalEarnedPkr)}
              </div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <div className="text-xs text-stone-500">Registered Payout Account</div>
              <div className="text-sm font-semibold text-slate-900 mt-1 truncate">
                {payoutInfo ? `${payoutInfo.bankName} · ${payoutInfo.ibanOrAccount}` : 'Configure in Skills & Portfolio'}
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 text-sm font-semibold text-slate-900">
              Assignment Earnings Ledger
            </div>
            {assignments.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">No assignment records yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                    <tr>
                      <th className="py-3 px-4 font-medium">Order</th>
                      <th className="py-3 px-4 font-medium">Client</th>
                      <th className="py-3 px-4 font-medium text-right">Gross PKR</th>
                      <th className="py-3 px-4 font-medium text-right">Commission</th>
                      <th className="py-3 px-4 font-medium text-right">Net Payout</th>
                      <th className="py-3 px-4 font-medium">Assignment Status</th>
                      <th className="py-3 px-4 font-medium">Payout Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-stone-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{a.orderTitle}</div>
                          <div className="text-stone-500 font-mono">{a.orderCode}</div>
                        </td>
                        <td className="py-3 px-4 text-stone-700">{a.customerName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatPkr(a.grossPkr)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-500">
                          {a.commissionPercent}% ({formatPkr(a.commissionPkr)})
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-800">
                          {formatPkr(a.netPayoutPkr)}
                        </td>
                        <td className="py-3 px-4 capitalize font-medium text-slate-800">
                          {a.status.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600">{a.payoutReference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: SKILLS & PORTFOLIO */}
      {tab === 'profile' && (
        <form
          onSubmit={handleSaveFreelancerProfile}
          className="max-w-2xl bg-white border border-stone-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Award className="w-4 h-4 text-emerald-700" />
            <span>Skills, Portfolio & Payout Settings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Availability</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as 'available' | 'busy')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
              >
                <option value="available">Available for New Projects</option>
                <option value="busy">Busy / At Capacity</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Portfolio URLs (one per line)</label>
            <textarea
              rows={2}
              value={portfolioText}
              onChange={(e) => setPortfolioText(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 font-mono"
            />
          </div>

          <div className="pt-4 border-t border-stone-200 space-y-3">
            <div className="text-xs font-semibold text-slate-900">Private Bank Payout Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Bank / Wallet</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Account Title</label>
                <input
                  type="text"
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">IBAN / Account #</label>
                <input
                  type="text"
                  value={ibanOrAccount}
                  onChange={(e) => setIbanOrAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save Portfolio & Payout Settings'}
          </button>
        </form>
      )}
    </div>
  );
}
