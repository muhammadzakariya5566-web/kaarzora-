import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileUp,
  MessageSquare,
  Plus,
  Send,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { grantPrivateFileAccess, uploadPrivateFile } from '../lib/api';
import { CATEGORY_LABELS, formatPkr, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../i18n';
import { PrivateFileButton } from './PrivateFileViewer';
import type {
  FreelancerProfile,
  Language,
  OrderFileRecord,
  OrderMessageRecord,
  OrderRecord,
  OrderStatus,
  OrderTaskRecord,
  PaymentSettings,
  UserRole,
} from '../types';

interface OrderWorkspacePanelProps {
  order: OrderRecord & { id: string };
  viewerUid: string;
  viewerName: string;
  viewerRole: UserRole;
  lang: Language;
  paymentSettings: PaymentSettings;
  freelancers?: FreelancerProfile[];
  defaultCommissionPercent?: number;
  onOrderUpdated?: () => void;
}

export function OrderWorkspacePanel({
  order,
  viewerUid,
  viewerName,
  viewerRole,
  lang,
  paymentSettings,
  freelancers = [],
  defaultCommissionPercent = 20,
}: OrderWorkspacePanelProps) {
  const [files, setFiles] = useState<OrderFileRecord[]>([]);
  const [tasks, setTasks] = useState<OrderTaskRecord[]>([]);
  const [messages, setMessages] = useState<OrderMessageRecord[]>([]);

  // Customer Payment Receipt state
  const [payBank, setPayBank] = useState(order.paymentBank || paymentSettings.bankName);
  const [payRef, setPayRef] = useState(order.paymentReference || '');
  const [payAmount, setPayAmount] = useState(String(order.pricePkr));
  const [payNotes, setPayNotes] = useState(order.paymentNotes || '');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Brief / Deliverable upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Message state
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Customer Review & Approval state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Admin Controls state
  const [selectedFreelancerUid, setSelectedFreelancerUid] = useState(order.assignedFreelancerUid || '');
  const [customCommission, setCustomCommission] = useState(
    String(order.commissionPercent || defaultCommissionPercent)
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminStatus, setAdminStatus] = useState<OrderStatus>(order.status);
  const [adminBusy, setAdminBusy] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setSelectedFreelancerUid(order.assignedFreelancerUid || '');
    setCustomCommission(String(order.commissionPercent || defaultCommissionPercent));
    setAdminStatus(order.status);
  }, [order.id, order.assignedFreelancerUid, order.commissionPercent, order.status, defaultCommissionPercent]);

  useEffect(() => {
    const filesQ = query(collection(db, 'orders', order.id, 'files'), orderBy('createdAt', 'desc'));
    const unsubFiles = onSnapshot(
      filesQ,
      (snap) => setFiles(snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderFileRecord) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, `orders/${order.id}/files`)
    );

    const tasksQ = query(collection(db, 'orders', order.id, 'tasks'), orderBy('createdAt', 'asc'));
    const unsubTasks = onSnapshot(
      tasksQ,
      (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderTaskRecord) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, `orders/${order.id}/tasks`)
    );

    const msgQ = query(collection(db, 'orders', order.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(
      msgQ,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderMessageRecord) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, `orders/${order.id}/messages`)
    );

    return () => {
      unsubFiles();
      unsubTasks();
      unsubMsgs();
    };
  }, [order.id]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!payRef.trim()) {
      setFeedback({ type: 'err', text: 'Please enter the bank Transaction ID / Reference.' });
      return;
    }
    if (!receiptFile && !order.paymentReceiptFileId) {
      setFeedback({ type: 'err', text: 'Please attach a clear screenshot or PDF of your payment receipt.' });
      return;
    }
    const parsedAmount = Number(payAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ type: 'err', text: 'Enter a valid PKR amount transferred.' });
      return;
    }

    setSubmittingPayment(true);
    try {
      let receiptFileId = order.paymentReceiptFileId;
      let receiptFileName = order.paymentReceiptName;
      if (receiptFile) {
        const uploaded = await uploadPrivateFile(receiptFile, 'receipt');
        receiptFileId = uploaded.fileId;
        receiptFileName = uploaded.fileName;
      }

      await updateDoc(doc(db, 'orders', order.id), {
        status: 'payment_submitted',
        paymentStatus: 'submitted',
        paymentBank: payBank.trim(),
        paymentReference: payRef.trim(),
        paymentAmountPkr: Math.round(parsedAmount),
        paymentReceiptFileId: receiptFileId,
        paymentReceiptName: receiptFileName,
        paymentNotes: payNotes.trim(),
        paymentRejectionReason: '',
        updatedAt: serverTimestamp(),
      });
      setReceiptFile(null);
      setFeedback({
        type: 'ok',
        text: 'Payment receipt submitted. An Admin will manually verify your transfer before work begins.',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Payment submission failed' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOrderFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadingDoc(true);
    setFeedback(null);
    try {
      const kind: 'brief' | 'deliverable' = viewerRole === 'freelancer' ? 'deliverable' : 'brief';
      const sharedTarget =
        kind === 'deliverable' ? order.customerUid : order.assignedFreelancerUid || undefined;
      const uploaded = await uploadPrivateFile(uploadFile, kind, sharedTarget);

      await addDoc(collection(db, 'orders', order.id, 'files'), {
        ownerUid: viewerUid,
        ownerName: viewerName,
        ownerRole: viewerRole,
        kind,
        fileId: uploaded.fileId,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        note: uploadNote.trim(),
        createdAt: serverTimestamp(),
      });

      setUploadFile(null);
      setUploadNote('');
      setFeedback({
        type: 'ok',
        text:
          kind === 'deliverable'
            ? 'Deliverable uploaded privately and shared with the customer and admin.'
            : 'Project brief file uploaded securely.',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'File upload failed' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await addDoc(collection(db, 'orders', order.id, 'tasks'), {
        title: newTaskTitle.trim(),
        status: 'todo',
        createdByUid: viewerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewTaskTitle('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${order.id}/tasks`);
    } finally {
      setAddingTask(false);
    }
  };

  const handleCycleTaskStatus = async (task: OrderTaskRecord) => {
    if (!task.id) return;
    const nextStatus =
      task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    try {
      await updateDoc(doc(db, 'orders', order.id, 'tasks', task.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}/tasks/${task.id}`);
    }
  };

  const handleDeleteTask = async (taskId?: string) => {
    if (!taskId) return;
    try {
      await deleteDoc(doc(db, 'orders', order.id, 'tasks', taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${order.id}/tasks/${taskId}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'orders', order.id, 'messages'), {
        senderUid: viewerUid,
        senderName: viewerName,
        senderRole: viewerRole,
        body: messageText.trim(),
        createdAt: serverTimestamp(),
      });
      setMessageText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${order.id}/messages`);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleFreelancerStatusAction = async (nextStatus: 'in_progress' | 'submitted_for_review') => {
    setFeedback(null);
    if (nextStatus === 'submitted_for_review' && files.filter((f) => f.kind === 'deliverable').length === 0) {
      setFeedback({ type: 'err', text: 'Upload at least one deliverable file before submitting for review.' });
      return;
    }
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      if (nextStatus === 'submitted_for_review') {
        await updateDoc(doc(db, 'assignments', order.id), {
          status: 'submitted',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
      setFeedback({
        type: 'ok',
        text:
          nextStatus === 'in_progress'
            ? 'Project moved to In Production.'
            : 'Work submitted for Customer approval.',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Status update failed' });
    }
  };

  const handleCustomerApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDecision(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'completed',
        reviewRating: reviewRating,
        reviewComment: reviewComment.trim() || 'Approved work delivery.',
        updatedAt: serverTimestamp(),
      });
      if (reviewComment.trim().length >= 5) {
        await setDoc(doc(db, 'reviews', order.id), {
          orderId: order.id,
          customerUid: viewerUid,
          customerName: order.customerName,
          businessName: order.businessName,
          serviceCategory: order.serviceCategory,
          serviceTitle: order.serviceTitle,
          rating: reviewRating,
          comment: reviewComment.trim(),
          createdAt: serverTimestamp(),
        });
      }
      setFeedback({ type: 'ok', text: 'Work approved and review published. Thank you for partnering with Kaarzora.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Approval failed' });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleCustomerRequestRevision = async () => {
    if (!revisionNote.trim()) {
      setFeedback({ type: 'err', text: 'Please provide clear revision notes before requesting changes.' });
      return;
    }
    setSubmittingDecision(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'revision_requested',
        reviewComment: revisionNote.trim(),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'orders', order.id, 'messages'), {
        senderUid: viewerUid,
        senderName: viewerName,
        senderRole: 'customer',
        body: `Revision requested: ${revisionNote.trim()}`,
        createdAt: serverTimestamp(),
      });
      setRevisionNote('');
      setFeedback({ type: 'ok', text: 'Revision request sent to your assigned specialist.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Unable to request revision' });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleAdminVerifyPayment = async (approve: boolean) => {
    if (!approve && !rejectionReason.trim()) {
      setFeedback({ type: 'err', text: 'Enter a rejection reason so the customer knows what to fix.' });
      return;
    }
    setAdminBusy(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: approve ? 'verified' : 'rejected',
        status: approve ? (order.assignedFreelancerUid ? 'in_progress' : 'payment_verified') : 'awaiting_payment',
        paymentVerifiedBy: approve ? viewerUid : '',
        paymentRejectionReason: approve ? '' : rejectionReason.trim(),
        updatedAt: serverTimestamp(),
      });
      setRejectionReason('');
      setFeedback({
        type: 'ok',
        text: approve ? 'Payment manually verified and unlocked for production.' : 'Payment rejected and customer notified.',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Verification update failed' });
    } finally {
      setAdminBusy(false);
    }
  };

  const handleAdminAssignFreelancer = async () => {
    if (!selectedFreelancerUid) {
      setFeedback({ type: 'err', text: 'Select a freelancer to assign.' });
      return;
    }
    const chosen = freelancers.find((f) => f.uid === selectedFreelancerUid);
    if (!chosen) return;

    const commPct = Math.min(80, Math.max(0, Number(customCommission) || 0));
    const agencyProfitPkr = Math.round((order.pricePkr * commPct) / 100);
    const freelancerEarningPkr = Math.max(0, order.pricePkr - agencyProfitPkr);

    setAdminBusy(true);
    setFeedback(null);
    try {
      // Grant private file access on existing brief files to the newly assigned freelancer
      for (const f of files.filter((item) => item.kind === 'brief')) {
        await grantPrivateFileAccess(f.fileId, chosen.uid).catch(() => {});
      }

      const nextStatus: OrderStatus =
        order.paymentStatus === 'verified' && order.status === 'payment_verified'
          ? 'in_progress'
          : order.status;

      await updateDoc(doc(db, 'orders', order.id), {
        assignedFreelancerUid: chosen.uid,
        assignedFreelancerName: chosen.displayName,
        commissionPercent: commPct,
        agencyProfitPkr,
        freelancerEarningPkr,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'assignments', order.id), {
        orderId: order.id,
        orderCode: order.orderCode,
        orderTitle: order.title,
        serviceCategory: order.serviceCategory,
        freelancerUid: chosen.uid,
        freelancerName: chosen.displayName,
        customerName: order.businessName || order.customerName,
        grossPkr: order.pricePkr,
        commissionPercent: commPct,
        commissionPkr: agencyProfitPkr,
        netPayoutPkr: freelancerEarningPkr,
        status: nextStatus === 'completed' ? 'completed' : 'active',
        payoutReference: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setFeedback({
        type: 'ok',
        text: `Assigned to ${chosen.displayName} (${formatPkr(freelancerEarningPkr)} payout / ${commPct}% commission).`,
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Assignment failed' });
    } finally {
      setAdminBusy(false);
    }
  };

  const handleAdminStatusChange = async () => {
    setAdminBusy(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: adminStatus,
        updatedAt: serverTimestamp(),
      });
      if (order.assignedFreelancerUid && adminStatus === 'completed') {
        await updateDoc(doc(db, 'assignments', order.id), {
          status: 'completed',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
      setFeedback({ type: 'ok', text: `Order status updated to ${ORDER_STATUS_LABELS[adminStatus][lang]}.` });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Status update failed' });
    } finally {
      setAdminBusy(false);
    }
  };

  const briefFiles = files.filter((f) => f.kind === 'brief');
  const deliverableFiles = files.filter((f) => f.kind === 'deliverable');

  return (
    <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200">
      {/* Header Summary */}
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 font-mono mb-1.5">
              <span>{order.orderCode}</span>
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABELS[order.serviceCategory][lang]}</span>
              <span aria-hidden="true">·</span>
              <span>Deadline {order.deadline}</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900">{order.title}</h3>
            <p className="text-sm text-stone-600 mt-1">
              {order.businessName} ({order.customerName})
              {order.assignedFreelancerName ? ` · Specialist: ${order.assignedFreelancerName}` : ' · Unassigned'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-900 tabular-nums font-mono">
              {formatPkr(order.pricePkr)}
            </div>
            <div className="text-xs font-medium text-emerald-800 mt-0.5">
              {ORDER_STATUS_LABELS[order.status][lang]}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus][lang]}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50 border border-stone-200 rounded-lg p-4">
          {order.description}
        </p>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Customer Payment Section */}
      {(viewerRole === 'customer' || viewerRole === 'admin') && (
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">
              Manual Bank Payment & Receipt Verification
            </h4>
            <span className="text-xs font-medium text-stone-600">
              {PAYMENT_STATUS_LABELS[order.paymentStatus][lang]}
            </span>
          </div>

          {order.paymentRejectionReason && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              <strong>Admin Verification Note:</strong> {order.paymentRejectionReason}
            </div>
          )}

          {order.paymentReceiptFileId && (
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-stone-700 space-y-1">
                <div>
                  <strong>Bank:</strong> {order.paymentBank} · <strong>TID / Ref:</strong>{' '}
                  <span className="font-mono">{order.paymentReference}</span>
                </div>
                <div>
                  <strong>Amount:</strong>{' '}
                  <span className="font-mono tabular-nums">{formatPkr(order.paymentAmountPkr)}</span>
                  {order.paymentNotes ? ` · ${order.paymentNotes}` : ''}
                </div>
              </div>
              <PrivateFileButton
                fileId={order.paymentReceiptFileId}
                fileName={order.paymentReceiptName || 'payment-receipt'}
                label="Inspect Receipt"
              />
            </div>
          )}

          {viewerRole === 'customer' &&
            (order.paymentStatus === 'unpaid' || order.paymentStatus === 'rejected') && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    Transfer {formatPkr(order.pricePkr)} to:
                  </div>
                  <div>
                    Bank: <strong>{paymentSettings.bankName}</strong> · Title:{' '}
                    <strong>{paymentSettings.accountTitle}</strong>
                  </div>
                  <div className="font-mono">
                    Account: {paymentSettings.accountNumber} · IBAN: {paymentSettings.iban}
                  </div>
                  {paymentSettings.jazzcashNumber && (
                    <div className="font-mono">EasyPaisa: {paymentSettings.jazzcashNumber}</div>
                  )}
                  <p className="text-stone-600 pt-1">
                    {lang === 'ur' ? paymentSettings.instructionsUr : paymentSettings.instructions}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Bank / Wallet Used</label>
                    <input
                      type="text"
                      value={payBank}
                      onChange={(e) => setPayBank(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Transaction Reference / TID</label>
                    <input
                      type="text"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="e.g., TID-9482710"
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Amount Paid (PKR)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 tabular-nums focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Private Receipt Screenshot / PDF
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-stone-200 file:text-xs file:font-medium file:bg-white hover:file:bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Sender Notes (Optional)</label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Account holder name or branch"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 disabled:opacity-50 transition-colors"
                >
                  {submittingPayment ? 'Uploading Receipt...' : 'Submit Payment Receipt for Verification'}
                </button>
              </form>
            )}

          {viewerRole === 'admin' && order.paymentStatus === 'submitted' && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
              <div className="text-xs font-semibold text-amber-900">
                Action Required: Verify bank statement for TID {order.paymentReference} ({formatPkr(order.paymentAmountPkr)})
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={() => handleAdminVerifyPayment(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 disabled:opacity-50"
                >
                  Verify & Approve Payment
                </button>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason if rejecting (e.g. amount mismatch)"
                  className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"
                />
                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={() => handleAdminVerifyPayment(false)}
                  className="px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Reject Receipt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Assignment & Status Management */}
      {viewerRole === 'admin' && (
        <div className="p-6 space-y-4 bg-stone-50/50">
          <h4 className="text-sm font-semibold text-slate-900">Admin Assignment & Status Control</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Assign Freelancer</label>
              <select
                value={selectedFreelancerUid}
                onChange={(e) => setSelectedFreelancerUid(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
              >
                <option value="">Select vetted freelancer...</option>
                {freelancers
                  .filter((f) => f.status === 'active')
                  .map((f) => (
                    <option key={f.uid} value={f.uid}>
                      {f.displayName} ({CATEGORY_LABELS[f.specialty].en} · {f.availability})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Agency Commission (%)
              </label>
              <input
                type="number"
                min={0}
                max={80}
                value={customCommission}
                onChange={(e) => setCustomCommission(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white tabular-nums"
              />
            </div>
            <button
              type="button"
              disabled={adminBusy}
              onClick={handleAdminAssignFreelancer}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              Save Assignment & Grant Brief Access
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-200">
            <span className="text-xs font-medium text-stone-700">Override Order Status:</span>
            <select
              value={adminStatus}
              onChange={(e) => setAdminStatus(e.target.value as OrderStatus)}
              className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
            >
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                <option key={st} value={st}>
                  {ORDER_STATUS_LABELS[st].en}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={adminBusy}
              onClick={handleAdminStatusChange}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium text-slate-800 hover:bg-stone-100"
            >
              Update Status
            </button>
          </div>
        </div>
      )}

      {/* Freelancer Production Controls */}
      {viewerRole === 'freelancer' && (
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Production & Payout Summary</h4>
              <p className="text-xs text-stone-600 mt-0.5 tabular-nums">
                Your Net Payout: <strong className="text-slate-900">{formatPkr(order.freelancerEarningPkr)}</strong>{' '}
                (Order {formatPkr(order.pricePkr)} · Agency Commission {order.commissionPercent}%)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {order.status === 'payment_verified' && (
                <button
                  type="button"
                  onClick={() => handleFreelancerStatusAction('in_progress')}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
                >
                  Start Production
                </button>
              )}
              {(order.status === 'in_progress' || order.status === 'revision_requested') && (
                <button
                  type="button"
                  onClick={() => handleFreelancerStatusAction('submitted_for_review')}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900"
                >
                  Submit Deliverables for Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Private Files: Briefs & Deliverables */}
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-stone-700 mb-2.5">
              Client Brief Files ({briefFiles.length})
            </h4>
            {briefFiles.length === 0 ? (
              <p className="text-xs text-stone-500">No brief files attached yet.</p>
            ) : (
              <div className="space-y-2">
                {briefFiles.map((f) => (
                  <div key={f.id} className="flex flex-col gap-1 p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                    <PrivateFileButton fileId={f.fileId} fileName={f.fileName} mimeType={f.mimeType} />
                    {f.note && <span className="text-xs text-stone-500">{f.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-stone-700 mb-2.5">
              Submitted Deliverables ({deliverableFiles.length})
            </h4>
            {deliverableFiles.length === 0 ? (
              <p className="text-xs text-stone-500">No deliverables uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {deliverableFiles.map((f) => (
                  <div key={f.id} className="flex flex-col gap-1 p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-200">
                    <PrivateFileButton fileId={f.fileId} fileName={f.fileName} mimeType={f.mimeType} />
                    {f.note && <span className="text-xs text-stone-600">{f.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload new private brief or deliverable */}
        {(viewerRole === 'customer' || viewerRole === 'freelancer' || viewerRole === 'admin') &&
          order.status !== 'completed' &&
          order.status !== 'cancelled' && (
            <form onSubmit={handleOrderFileUpload} className="flex flex-wrap items-end gap-3 pt-4 border-t border-stone-200">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  {viewerRole === 'freelancer' ? 'Upload Private Deliverable' : 'Attach Additional Brief File'}
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-stone-200 file:text-xs file:font-medium file:bg-white"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-stone-700 mb-1">File Note</label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200"
                />
              </div>
              <button
                type="submit"
                disabled={!uploadFile || uploadingDoc}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>{uploadingDoc ? 'Uploading...' : 'Upload File'}</span>
              </button>
            </form>
          )}
      </div>

      {/* Customer Work Approval & Review */}
      {viewerRole === 'customer' && order.status === 'submitted_for_review' && (
        <div className="p-6 bg-emerald-50/40 space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">Work Approval & Review</h4>
          <p className="text-xs text-stone-600">
            Inspect the deliverables above. Approve the completed work and leave a verified rating, or request revisions.
          </p>
          <form onSubmit={handleCustomerApprove} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-700">Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={`p-1 rounded ${star <= reviewRating ? 'text-amber-500' : 'text-stone-300'}`}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share feedback on quality and timeliness..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submittingDecision}
                className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 disabled:opacity-50"
              >
                Approve Work & Complete Order
              </button>
              <input
                type="text"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Or describe needed revisions..."
                className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white"
              />
              <button
                type="button"
                disabled={submittingDecision}
                onClick={handleCustomerRequestRevision}
                className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-xs font-medium text-slate-800 hover:bg-stone-100"
              >
                Request Revision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Checklist & Messaging Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardList className="w-4 h-4 text-emerald-700" />
            <span>Deliverable Checklist ({tasks.length})</span>
          </div>

          {tasks.length === 0 ? (
            <p className="text-xs text-stone-500">No tasks added yet.</p>
          ) : (
            <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <button
                    type="button"
                    disabled={viewerRole === 'customer'}
                    onClick={() => handleCycleTaskStatus(task)}
                    className="flex items-center gap-2 text-left flex-1 disabled:cursor-default"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className={task.status === 'done' ? 'line-through text-stone-400' : 'text-slate-800'}>
                      {task.title}
                    </span>
                  </button>
                  <span className="text-[11px] font-mono text-stone-500 shrink-0">
                    {task.status}
                  </span>
                  {(viewerRole === 'freelancer' || viewerRole === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-stone-400 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {(viewerRole === 'freelancer' || viewerRole === 'admin') && (
            <form onSubmit={handleAddTask} className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add milestone task..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200"
              />
              <button
                type="submit"
                disabled={addingTask || !newTaskTitle.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          )}
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <span>Project Messages ({messages.length})</span>
          </div>

          <div className="border border-stone-200 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2.5 bg-stone-50">
            {messages.length === 0 ? (
              <p className="text-xs text-stone-500">No messages in this order thread yet.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-lg text-xs border ${
                    m.senderUid === viewerUid
                      ? 'bg-emerald-50 border-emerald-200 text-slate-900'
                      : 'bg-white border-stone-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500 mb-1">
                    <span className="font-semibold text-slate-800">
                      {m.senderName} · {m.senderRole}
                    </span>
                  </div>
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write a message to your project team..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200"
            />
            <button
              type="submit"
              disabled={sendingMsg || !messageText.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
