import type { CommissionSettings, PaymentSettings, ServiceItem } from '../types';

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'social-media-management',
    category: 'social_media',
    title: 'Social Media Management',
    titleUr: 'سوشل میڈیا مینجمنٹ',
    description:
      'Monthly Facebook, Instagram, and WhatsApp Business content calendar, Urdu/English ad creatives, caption copywriting, and Meta Ads campaign setup tailored for Pakistani retail and service brands.',
    descriptionUr:
      'پاکستانی برانڈز کے لیے ماہانہ فیس بک، انسٹاگرام اور واٹس ایپ بزنس پوسٹس، اردو و انگریزی اشتہارات اور میٹا ایڈز کی مکمل مینجمنٹ۔',
    pricePkr: 25000,
    turnaroundDays: 30,
    commissionRate: 20,
    deliverables: [
      '16 custom branded social media posts & reels covers',
      'Bilingual Urdu & English captions with local hashtags',
      'Meta Business Suite scheduling & ad audience setup',
      'End-of-month reach and inquiry performance summary',
    ],
    active: true,
    imagePath: '/src/assets/images/service_social_media_1795571729315.jpg',
    sortOrder: 1,
  },
  {
    id: 'video-editing',
    category: 'video_editing',
    title: 'Video Editing',
    titleUr: 'ویڈیو ایڈیٹنگ',
    description:
      'High-retention vertical Reels, TikTok product showcases, and YouTube commercial edits with color grading, clean Urdu/English subtitles, motion titles, and licensed background audio.',
    descriptionUr:
      'پروڈکٹ ریلز، ٹک ٹاک اور یوٹیوب کمرشلز کے لیے پروفیشنل ویڈیو ایڈیٹنگ، کلر گریڈنگ، اردو و انگریزی سب ٹائٹلز اور موشن گرافکس۔',
    pricePkr: 18000,
    turnaroundDays: 7,
    commissionRate: 20,
    deliverables: [
      '4 edited short-form Reels/TikTok videos (up to 60s each)',
      'Custom animated product callouts & bilingual subtitles',
      'Color correction and balanced audio mastering',
      '2 rounds of frame-accurate revisions',
    ],
    active: true,
    imagePath: '/src/assets/images/service_video_editing_1795571729991.jpg',
    sortOrder: 2,
  },
  {
    id: 'logo-and-branding',
    category: 'logo_branding',
    title: 'Logo and Branding',
    titleUr: 'لوگو اور برانڈنگ',
    description:
      'Distinctive business identity package including primary and monochrome logo marks, color palette, typography pairing, visiting card, letterhead, and social profile kit ready for print and digital.',
    descriptionUr:
      'مکمل کاروباری شناخت بشمول پرائمری لوگو، رنگوں کی اسکیم، بزنس کارڈ، لیٹر ہیڈ اور سوشل میڈیا برانڈ کٹ۔',
    pricePkr: 22000,
    turnaroundDays: 10,
    commissionRate: 20,
    deliverables: [
      '3 original logo concepts with vector source files (AI, SVG, PDF)',
      'Print-ready visiting card & official letterhead design',
      'Brand color codes & typography usage guide',
      'WhatsApp, Facebook & Instagram profile avatar pack',
    ],
    active: true,
    imagePath: '/src/assets/images/service_logo_branding_1795571730286.jpg',
    sortOrder: 3,
  },
  {
    id: 'business-website-development',
    category: 'web_dev',
    title: 'Business Website Development',
    titleUr: 'بزنس ویب سائٹ ڈیولپمنٹ',
    description:
      'Fast, mobile-first corporate or catalog website with WhatsApp order inquiry integration, Google Maps branch embed, SSL-ready setup, and local SEO structure for Pakistani customers.',
    descriptionUr:
      'تیز رفتار اور موبائل فرینڈلی کاروباری ویب سائٹ، واٹس ایپ انکوائری بٹن، گوگل میپس اور مقامی ایس ای او کے ساتھ۔',
    pricePkr: 48000,
    turnaroundDays: 14,
    commissionRate: 20,
    deliverables: [
      'Up to 5 responsive pages (Home, Services, Catalog, About, Contact)',
      'Direct WhatsApp Business inquiry & lead capture form',
      'On-page SEO metadata, speed optimization & mobile testing',
      'Deployment handover and 14 days post-launch support',
    ],
    active: true,
    imagePath: '/src/assets/images/service_web_development_1795571730837.jpg',
    sortOrder: 4,
  },
];

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  bankName: 'Meezan Bank Limited',
  accountTitle: 'Kaarzora Business Services',
  accountNumber: '03401695827',
  iban: 'PK03MUCB1707165691002462',
  jazzcashNumber: '03401695827',
  instructions:
    'Transfer the exact PKR order amount via Bank IBAN or EasyPaisa (03401695827). Upload your clear transaction screenshot and enter the TID/Reference number below. Admin verifies every transfer manually before production starts.',
  instructionsUr:
    'براہ کرم آرڈر کی مکمل رقم ہمارے بینک IBAN یا ایزی پیسہ (03401695827) پر منتقل کریں۔ اس کے بعد ٹرانزیکشن کی تصویر اور ریفرنس نمبر نیچے جمع کروائیں۔ ایڈمن تصدیق کے بعد کام شروع ہوگا۔',
};

export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  defaultCommissionPercent: 20,
  socialMediaPercent: 20,
  videoEditingPercent: 20,
  logoBrandingPercent: 20,
  webDevPercent: 20,
};

export const HERO_IMAGE_PATH = '/src/assets/images/hero_kaamlab_agency_1795571729331.jpg';
export const ADMIN_EMAIL = 'muhammadzakariya5566@gmail.com';
export const CONTACT_PHONE = '03401695827';
export const CONTACT_EMAIL = 'muhammadzakariya5566@gmail.com';

