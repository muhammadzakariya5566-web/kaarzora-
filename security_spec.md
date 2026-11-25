# Security Specification: KaamLab Business Services

## 1. Data Invariants
1. **Identity Integrity**: Users can only create or read their own `/users/{uid}` profile (unless Admin). Users cannot self-assign `role: "admin"` or `role: "freelancer"`.
2. **PII Isolation**: Email, phone, and bank IBAN details live only in `/users/{uid}`, `/freelancerApplications/{uid}`, and `/freelancers/{uid}/private/payout`, strictly gated to `isOwner(uid) || isAdmin()`.
3. **Order Integrity**: An order can only be created for an existing `/services/{serviceId}`, initialized strictly to `status: "awaiting_payment"` and `paymentStatus: "unpaid"` with `assignedFreelancerUid: ""`.
4. **No Fake Payment Verification**: Customers can only set `paymentStatus: "submitted"`; only an Admin can set `paymentStatus: "verified"` or `"rejected"`.
5. **Master Gate on Subcollections**: `/orders/{orderId}/files`, `/tasks`, and `/messages` verify parent `/orders/{orderId}` ownership (`customerUid` or `assignedFreelancerUid`) or `isAdmin()`.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`.
7. **Secure List Queries**: Every `allow list` rule evaluates `resource.data` against `request.auth.uid` or `isBootstrappedAdmin()` with zero `get()`/`exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Role Escalation on Registration**: User creates `/users/{uid}` with `role: "admin"`. Expected: `PERMISSION_DENIED`.
2. **Shadow Ghost Field Injection**: User updates `/users/{uid}` adding `isVerified: true`. Expected: `PERMISSION_DENIED`.
3. **Spoofed Unverified Admin Email**: Auth token has admin email but `email_verified: false`. Expected: `PERMISSION_DENIED`.
4. **Customer Self-Verifying Payment**: Customer updates `/orders/{id}` setting `paymentStatus: "verified"`. Expected: `PERMISSION_DENIED`.
5. **Customer Self-Assigning Freelancer**: Customer updates `/orders/{id}` setting `assignedFreelancerUid: "hacker"`. Expected: `PERMISSION_DENIED`.
6. **Unassigned Freelancer Reading Order**: Random freelancer reads `/orders/{otherOrderId}`. Expected: `PERMISSION_DENIED`.
7. **Oversized ID Poisoning**: Document ID of 200+ characters with special symbols on `/orders/{id}`. Expected: `PERMISSION_DENIED`.
8. **Blanket User List Scrape**: Signed-in user calls `list` on `/users`. Expected: `PERMISSION_DENIED`.
9. **PII Read on Application**: Signed-in user reads `/freelancerApplications/{otherUid}`. Expected: `PERMISSION_DENIED`.
10. **Terminal State Tampering**: Customer updates a `completed` order back to `in_progress`. Expected: `PERMISSION_DENIED`.
11. **Backdated Timestamp Spoofing**: Client sets `createdAt` to past timestamp instead of `serverTimestamp()`. Expected: `PERMISSION_DENIED`.
12. **Orphaned Review Injection**: User creates `/reviews/{id}` referencing nonexistent `orderId` or another customer's order. Expected: `PERMISSION_DENIED`.
