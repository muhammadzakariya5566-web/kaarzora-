import type { Language, OrderStatus, PaymentStatus, ServiceCategory } from './types';

export function formatPkr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `PKR ${safe.toLocaleString('en-PK')}`;
}

export const CATEGORY_LABELS: Record<ServiceCategory, { en: string; ur: string }> = {
  social_media: { en: 'Social Media Management', ur: 'سوشل میڈیا مینجمنٹ' },
  video_editing: { en: 'Video Editing', ur: 'ویڈیو ایڈیٹنگ' },
  logo_branding: { en: 'Logo & Branding', ur: 'لوگو اور برانڈنگ' },
  web_dev: { en: 'Business Website Development', ur: 'بزنس ویب سائٹ ڈیولپمنٹ' },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; ur: string }> = {
  awaiting_payment: { en: 'Awaiting Bank Transfer', ur: 'ادائیگی کا انتظار' },
  payment_submitted: { en: 'Receipt Under Verification', ur: 'رسید کی تصدیق جاری ہے' },
  payment_verified: { en: 'Payment Verified', ur: 'ادائیگی کی تصدیق ہوگئی' },
  in_progress: { en: 'In Production', ur: 'کام جاری ہے' },
  submitted_for_review: { en: 'Ready for Approval', ur: 'منظوری کے لیے تیار' },
  revision_requested: { en: 'Revision Requested', ur: 'تبدیلی کی درخواست' },
  completed: { en: 'Completed & Approved', ur: 'مکمل اور منظور شدہ' },
  cancelled: { en: 'Cancelled', ur: 'منسوخ' },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { en: string; ur: string }> = {
  unpaid: { en: 'Unpaid', ur: 'غیر ادا شدہ' },
  submitted: { en: 'Pending Verification', ur: 'تصدیق کے زیر التواء' },
  verified: { en: 'Verified by Admin', ur: 'تصدیق شدہ' },
  rejected: { en: 'Rejected — Resubmit', ur: 'مسترد — دوبارہ جمع کروائیں' },
};

export const UI_COPY: Record<
  Language,
  {
    brand: string;
    tagline: string;
    navServices: string;
    navProcess: string;
    navReviews: string;
    navSetup: string;
    signIn: string;
    signOut: string;
    openPortal: string;
    heroHeadline: string;
    heroSubhead: string;
    heroPrimaryCta: string;
    heroSecondaryCta: string;
    servicesHeading: string;
    servicesSubheading: string;
    orderService: string;
    turnaroundPrefix: string;
    daysUnit: string;
    processHeading: string;
    reviewsHeading: string;
    freelancerCtaHeading: string;
    freelancerCtaBody: string;
    freelancerCtaButton: string;
    portalCustomer: string;
    portalFreelancer: string;
    portalAdmin: string;
    backToStorefront: string;
    downloadSource: string;
    setupGuide: string;
    langToggle: string;
  }
> = {
  en: {
    brand: 'Kaarzora',
    tagline: 'Your Business, Online and Growing.',
    navServices: 'Services',
    navProcess: 'Process',
    navReviews: 'Reviews',
    navSetup: 'Setup Guide',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    openPortal: 'Open Portal',
    heroHeadline: 'Digital services built for Pakistani small businesses.',
    heroSubhead:
      'Kaarzora Business Services connects local retail stores, clinics, restaurants, and B2B exporters with vetted creative and technical specialists at transparent PKR pricing.',
    heroPrimaryCta: 'Explore Services & Order',
    heroSecondaryCta: 'Join as Freelancer',
    servicesHeading: 'Core Agency Services',
    servicesSubheading:
      'Fixed-scope packages in Pakistani Rupees with dedicated project managers and verified delivery milestones.',
    orderService: 'Order This Service',
    turnaroundPrefix: 'Turnaround:',
    daysUnit: 'days',
    processHeading: 'How Orders & Manual Bank Verification Work',
    reviewsHeading: 'Verified Client Outcomes',
    freelancerCtaHeading: 'Are you a Pakistani designer, editor, marketer, or developer?',
    freelancerCtaBody:
      'Register your portfolio, receive structured client briefs, manage tasks, and earn predictable PKR payouts.',
    freelancerCtaButton: 'Apply as a Freelancer',
    portalCustomer: 'Customer Portal',
    portalFreelancer: 'Freelancer Portal',
    portalAdmin: 'Admin Console',
    backToStorefront: 'Agency Home',
    downloadSource: 'Download Source ZIP',
    setupGuide: 'Setup & Source Code',
    langToggle: 'اردو',
  },
  ur: {
    brand: 'Kaarzora',
    tagline: 'آپ کا کاروبار، آن لائن اور ترقی پذیر۔',
    navServices: 'خدمات',
    navProcess: 'طریقہ کار',
    navReviews: 'آراء',
    navSetup: 'سیٹ اپ گائیڈ',
    signIn: 'سائن ان',
    signOut: 'سائن آؤٹ',
    openPortal: 'پورٹل کھولیں',
    heroHeadline: 'پاکستانی چھوٹے کاروباروں کے لیے ڈیجیٹل خدمات۔',
    heroSubhead:
      'کارزورا بزنس سروسز مقامی دکانوں، کلینکس، ریسٹورنٹس اور کاروباروں کو مستند ماہرین کے ساتھ شفاف پاکستانی روپے کی قیمتوں میں جوڑتا ہے۔',
    heroPrimaryCta: 'خدمات دیکھیں اور آرڈر کریں',
    heroSecondaryCta: 'بطور فری لانسر شامل ہوں',
    servicesHeading: 'بنیادی ایجنسی خدمات',
    servicesSubheading:
      'پاکستانی روپے میں واضح پیکجز، مقررہ وقت اور تصدیق شدہ ڈیلیوری مراحل کے ساتھ۔',
    orderService: 'یہ سروس آرڈر کریں',
    turnaroundPrefix: 'مدت تکمیل:',
    daysUnit: 'دن',
    processHeading: 'آرڈر اور بینک ادائیگی کی تصدیق کا طریقہ',
    reviewsHeading: 'تصدیق شدہ صارفین کی آراء',
    freelancerCtaHeading: 'کیا آپ پاکستانی ڈیزائنر، ویڈیو ایڈیٹر، مارکیٹر یا ویب ڈویلپر ہیں؟',
    freelancerCtaBody:
      'اپنا پورٹ فولیو رجسٹر کریں، واضح پروجیکٹ بریف حاصل کریں اور محفوظ پاکستانی روپے میں ادائیگی پائیں۔',
    freelancerCtaButton: 'بطور فری لانسر درخواست دیں',
    portalCustomer: 'کسٹمر پورٹل',
    portalFreelancer: 'فری لانسر پورٹل',
    portalAdmin: 'ایڈمن کنسول',
    backToStorefront: 'ایجنسی ہوم',
    downloadSource: 'سورس کوڈ ڈاؤن لوڈ کریں',
    setupGuide: 'سیٹ اپ اور سورس کوڈ',
    langToggle: 'English',
  },
};
