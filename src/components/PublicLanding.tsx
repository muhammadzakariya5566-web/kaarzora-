import { ArrowRight, Check, Download, Globe2, Mail, Phone, ShieldCheck, Star, Terminal } from 'lucide-react';
import { CATEGORY_LABELS, formatPkr, UI_COPY } from '../i18n';
import { CONTACT_EMAIL, CONTACT_PHONE, HERO_IMAGE_PATH } from '../data/defaults';
import type { Language, PaymentSettings, ReviewRecord, ServiceItem } from '../types';

interface PublicLandingProps {
  lang: Language;
  onToggleLang: () => void;
  services: ServiceItem[];
  reviews: ReviewRecord[];
  paymentSettings: PaymentSettings;
  isSignedIn: boolean;
  onOrderService: (service: ServiceItem) => void;
  onJoinFreelancer: () => void;
  onOpenSetupGuide: () => void;
}

export function PublicLanding({
  lang,
  onToggleLang,
  services,
  reviews,
  paymentSettings,
  isSignedIn,
  onOrderService,
  onJoinFreelancer,
  onOpenSetupGuide,
}: PublicLandingProps) {
  const copy = UI_COPY[lang];
  const activeServices = services.filter((s) => s.active);

  return (
    <div className="bg-stone-50 text-slate-900">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200 mb-10">
          <p className="text-sm font-medium text-stone-700">
            Kaarzora Business Services <span aria-hidden="true">·</span>{' '}
            <span className="text-emerald-800 font-semibold">{copy.tagline}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-slate-800 hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Globe2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{copy.langToggle}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium text-stone-500 mb-4">
                Lahore · Karachi · Islamabad <span aria-hidden="true">·</span> Transparent PKR Pricing
              </p>
              <h1
                className="font-display font-bold tracking-tight text-slate-900 leading-[1.12] mb-5"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                {copy.heroHeadline}
              </h1>
              <p className="text-base text-stone-600 leading-relaxed max-w-xl mb-8">
                {copy.heroSubhead}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#services"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0"
              >
                <span>{copy.heroPrimaryCta}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onJoinFreelancer}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-stone-300 bg-white text-slate-800 text-sm font-medium hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
              >
                <span>{copy.heroSecondaryCta}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[280px] rounded-xl overflow-hidden border border-stone-200 bg-stone-200">
              <img
                src={HERO_IMAGE_PATH}
                alt="Kaarzora Business Services creative and engineering studio"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover lg:h-full"
              />
            </div>
          </div>
        </div>

        {/* Full-Width Agency Value Strip */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-stone-200">
          <div>
            <div className="text-xs text-stone-500">Core Services</div>
            <div className="text-base font-semibold text-slate-900 mt-1">4 Fixed-Scope Tracks</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Settlement Currency</div>
            <div className="text-base font-semibold text-slate-900 mt-1 tabular-nums">PKR · IBAN & EasyPaisa</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Payment Security</div>
            <div className="text-base font-semibold text-slate-900 mt-1">Manual Admin Verification</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Client Protection</div>
            <div className="text-base font-semibold text-slate-900 mt-1">Milestone & File Review</div>
          </div>
        </div>
      </section>

      {/* Service Catalogue */}
      <section id="services" className="bg-white border-y border-stone-200 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
              {copy.servicesHeading}
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">{copy.servicesSubheading}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {activeServices.map((service, idx) => (
              <article
                key={service.id}
                className="border border-stone-200 rounded-xl bg-stone-50/40 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-stone-200 overflow-hidden border-b border-stone-200">
                    <img
                      src={service.imagePath}
                      alt={service.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-4 text-xs text-stone-500 mb-2">
                      <span>
                        0{idx + 1}. {CATEGORY_LABELS[service.category][lang]}
                      </span>
                      <span className="tabular-nums">
                        {copy.turnaroundPrefix} {service.turnaroundDays} {copy.daysUnit}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-4 mb-3">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {lang === 'ur' ? service.titleUr : service.title}
                      </h3>
                      <span className="text-lg font-bold text-emerald-800 font-mono tabular-nums whitespace-nowrap shrink-0">
                        {formatPkr(service.pricePkr)}
                      </span>
                    </div>

                    <p className="text-sm text-stone-600 leading-relaxed mb-5">
                      {lang === 'ur' ? service.descriptionUr : service.description}
                    </p>

                    <ul className="space-y-2 border-t border-stone-200 pt-4">
                      {service.deliverables.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-stone-700">
                          <Check className="w-3.5 h-3.5 text-emerald-700 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <button
                    type="button"
                    onClick={() => onOrderService(service)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-emerald-800 transition-colors whitespace-nowrap"
                  >
                    <span>{isSignedIn ? copy.orderService : `${copy.signIn} & ${copy.orderService}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Process & Manual Bank Verification */}
      <section id="process" className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
              {copy.processHeading}
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              Every Kaarzora project uses verified Pakistani bank transfers and milestone tracking—no automated fake checkouts or unverified claims.
            </p>

            <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-2 text-xs text-stone-700">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Official Agency Bank Details</span>
              </div>
              <div>
                Bank: <strong>{paymentSettings.bankName}</strong> · Title:{' '}
                <strong>{paymentSettings.accountTitle}</strong>
              </div>
              <div className="font-mono text-slate-900">
                Account: {paymentSettings.accountNumber}
              </div>
              <div className="font-mono text-slate-900">
                IBAN: {paymentSettings.iban}
              </div>
              {paymentSettings.jazzcashNumber && (
                <div className="font-mono text-slate-900">
                  EasyPaisa: {paymentSettings.jazzcashNumber}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                step: '01. Submit Project Brief',
                text: 'Choose your PKR service package, specify deadline, and upload private reference files or logos.',
              },
              {
                step: '02. Bank Transfer & Receipt',
                text: 'Transfer via Bank IBAN, Raast, or EasyPaisa and upload your transaction screenshot + TID.',
              },
              {
                step: '03. Admin Verification & Assignment',
                text: 'Our Admin manually confirms the bank credit and assigns a vetted Pakistani specialist.',
              },
              {
                step: '04. Track, Message & Approve',
                text: 'Follow live deliverable tasks, exchange messages, inspect private deliverables, and approve work.',
              },
            ].map((item) => (
              <div key={item.step} className="p-6 rounded-xl bg-white border border-stone-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{item.step}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Customer Reviews */}
      <section id="reviews" className="bg-white border-y border-stone-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{copy.reviewsHeading}</h2>
            <span className="text-xs text-stone-500">
              Published directly when clients approve completed orders
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="p-8 rounded-xl border border-stone-200 bg-stone-50 text-center">
              <p className="text-sm text-stone-600">
                Verified reviews appear here automatically as clients approve completed Kaarzora orders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((rev) => (
                <div key={rev.id} className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">"{rev.comment}"</p>
                  <div className="pt-2 border-t border-stone-200 text-xs text-stone-600">
                    <div className="font-semibold text-slate-900">{rev.businessName}</div>
                    <div>
                      {rev.customerName} <span aria-hidden="true">·</span> {rev.serviceTitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Freelancer CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="p-8 md:p-10 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight mb-2">{copy.freelancerCtaHeading}</h2>
            <p className="text-sm text-stone-300 leading-relaxed">{copy.freelancerCtaBody}</p>
          </div>
          <button
            type="button"
            onClick={onJoinFreelancer}
            className="px-6 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {copy.freelancerCtaButton}
          </button>
        </div>
      </section>

      {/* More Information & Direct Contact */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="p-8 rounded-xl bg-white border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {lang === 'ur' ? 'مزید معلومات اور رابطہ' : 'Need More Information? Contact Us Directly'}
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              {lang === 'ur'
                ? 'پیکیجز، کسٹم آرڈرز یا ادائیگی کی تصدیق کے لیے فون یا ای میل پر رابطہ کریں۔'
                : 'Reach out directly for custom business quotes, package guidance, or payment verification support.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-medium text-slate-900 font-mono tabular-nums whitespace-nowrap shrink-0"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>{CONTACT_PHONE}</span>
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-xs font-medium text-white whitespace-nowrap shrink-0"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{CONTACT_EMAIL}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-stone-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-stone-600">
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">Kaarzora Business Services</div>
            <div>{copy.tagline}</div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-stone-600">
              <a href={`tel:${CONTACT_PHONE}`} className="hover:text-emerald-800 font-mono tabular-nums">
                {CONTACT_PHONE}
              </a>
              <span aria-hidden="true">·</span>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-emerald-800">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="inline-flex items-center gap-1.5 text-slate-800 hover:text-emerald-800 font-medium"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{copy.setupGuide}</span>
            </button>
            <a
              href="/api/download-source"
              download="kaarzora-business-services-source.zip"
              className="inline-flex items-center gap-1.5 text-emerald-800 hover:underline font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{copy.downloadSource}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
