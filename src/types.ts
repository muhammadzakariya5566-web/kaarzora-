export type Language = 'en' | 'ur';
export type UserRole = 'customer' | 'freelancer' | 'admin';
export type ServiceCategory = 'social_media' | 'video_editing' | 'logo_branding' | 'web_dev';

export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_submitted'
  | 'payment_verified'
  | 'in_progress'
  | 'submitted_for_review'
  | 'revision_requested'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'submitted' | 'verified' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  businessName?: string;
  phone?: string;
  city?: string;
  preferredLang: Language;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceItem {
  id: string;
  category: ServiceCategory;
  title: string;
  titleUr: string;
  description: string;
  descriptionUr: string;
  pricePkr: number;
  turnaroundDays: number;
  commissionRate: number;
  deliverables: string[];
  active: boolean;
  imagePath: string;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface FreelancerProfile {
  uid: string;
  displayName: string;
  city: string;
  specialty: ServiceCategory;
  skills: string[];
  bio: string;
  portfolioLinks: string[];
  experienceYears: number;
  availability: 'available' | 'busy';
  status: 'active' | 'suspended';
  completedOrders: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FreelancerPayout {
  uid: string;
  bankName: string;
  accountTitle: string;
  ibanOrAccount: string;
  updatedAt?: unknown;
}

export interface FreelancerApplication {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  city: string;
  specialty: ServiceCategory;
  skills: string[];
  bio: string;
  portfolioLinks: string[];
  experienceYears: number;
  bankName: string;
  accountTitle: string;
  ibanOrAccount: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderRecord {
  id?: string;
  orderCode: string;
  customerUid: string;
  customerName: string;
  businessName: string;
  serviceId: string;
  serviceTitle: string;
  serviceCategory: ServiceCategory;
  title: string;
  description: string;
  deadline: string;
  pricePkr: number;
  commissionPercent: number;
  freelancerEarningPkr: number;
  agencyProfitPkr: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentBank: string;
  paymentReference: string;
  paymentAmountPkr: number;
  paymentReceiptFileId: string;
  paymentReceiptName: string;
  paymentNotes: string;
  paymentVerifiedBy: string;
  paymentRejectionReason: string;
  assignedFreelancerUid: string;
  assignedFreelancerName: string;
  reviewRating: number;
  reviewComment: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderFileRecord {
  id?: string;
  ownerUid: string;
  ownerName: string;
  ownerRole: UserRole;
  kind: 'brief' | 'deliverable';
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  note: string;
  createdAt?: unknown;
}

export interface OrderTaskRecord {
  id?: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderMessageRecord {
  id?: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  createdAt?: unknown;
}

export interface AssignmentRecord {
  id?: string;
  orderId: string;
  orderCode: string;
  orderTitle: string;
  serviceCategory: ServiceCategory;
  freelancerUid: string;
  freelancerName: string;
  customerName: string;
  grossPkr: number;
  commissionPercent: number;
  commissionPkr: number;
  netPayoutPkr: number;
  status: 'active' | 'submitted' | 'completed' | 'paid_out';
  payoutReference: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReviewRecord {
  id?: string;
  orderId: string;
  customerUid: string;
  customerName: string;
  businessName: string;
  serviceCategory: ServiceCategory;
  serviceTitle: string;
  rating: number;
  comment: string;
  createdAt?: unknown;
}

export interface PaymentSettings {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  jazzcashNumber: string;
  instructions: string;
  instructionsUr: string;
  updatedAt?: unknown;
}

export interface CommissionSettings {
  defaultCommissionPercent: number;
  socialMediaPercent: number;
  videoEditingPercent: number;
  logoBrandingPercent: number;
  webDevPercent: number;
  updatedAt?: unknown;
}
