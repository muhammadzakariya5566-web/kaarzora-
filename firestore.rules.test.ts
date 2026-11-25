/**
 * Security Rule Verification Specification for KaamLab Business Services.
 * Documents the 12 Dirty Dozen adversarial test payloads mapped against firestore.rules.
 */
export const DIRTY_DOZEN_TESTS = [
  {
    name: '1. Role Escalation on Registration',
    path: 'users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', token: { email: 'attacker@example.com', email_verified: true } },
    payload: { uid: 'attacker_uid', email: 'attacker@example.com', displayName: 'Attacker', role: 'admin', preferredLang: 'en' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '2. Shadow Ghost Field Injection',
    path: 'users/customer_uid',
    operation: 'update',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    payload: { isVerified: true },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '3. Spoofed Unverified Admin Email',
    path: 'settings/commission',
    operation: 'get',
    auth: { uid: 'spoof_uid', token: { email: 'muhammadzakariya5566@gmail.com', email_verified: false } },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '4. Customer Self-Verifying Payment',
    path: 'orders/order_1',
    operation: 'update',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    payload: { paymentStatus: 'verified', status: 'payment_verified' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '5. Customer Self-Assigning Freelancer',
    path: 'orders/order_1',
    operation: 'update',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    payload: { assignedFreelancerUid: 'freelancer_1' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '6. Unassigned Freelancer Reading Order',
    path: 'orders/order_1',
    operation: 'get',
    auth: { uid: 'random_freelancer', token: { email: 'f@example.com', email_verified: true } },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '7. Oversized ID Poisoning',
    path: `orders/${'a'.repeat(200)}`,
    operation: 'create',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '8. Blanket User List Scrape',
    path: 'users',
    operation: 'list',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '9. PII Read on Other Freelancer Application',
    path: 'freelancerApplications/other_uid',
    operation: 'get',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '10. Terminal State Tampering on Completed Order',
    path: 'orders/completed_order',
    operation: 'update',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    payload: { status: 'in_progress' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '11. Backdated Timestamp Spoofing',
    path: 'orders/order_new',
    operation: 'create',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    payload: { createdAt: new Date('2020-01-01') },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '12. Orphaned Review Injection',
    path: 'reviews/rev_fake',
    operation: 'create',
    auth: { uid: 'customer_uid', token: { email: 'c@example.com', email_verified: true } },
    payload: { orderId: 'nonexistent_order', customerUid: 'customer_uid', rating: 5, comment: 'Fake review' },
    expected: 'PERMISSION_DENIED'
  }
];
