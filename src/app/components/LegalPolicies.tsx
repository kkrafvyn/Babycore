import React from 'react';
import { ChevronLeft, Scale, ShieldCheck } from 'lucide-react';

interface LegalPoliciesProps {
  onBack: () => void;
}

type PolicySection = {
  id: string;
  title: string;
  purpose: string;
  points: string[];
};

const LAST_UPDATED = 'April 26, 2026';

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'privacy-policy',
    title: '1. Privacy Policy',
    purpose: 'How Bud & Bloom collects, uses, stores, and protects family and child-related data.',
    points: [
      'We collect baby care logs such as feeding, sleep, diaper, growth, health notes, vaccination tracking, reminders, and optional photos uploaded by guardians/caregivers.',
      'Some records can be health-related. This app is designed for family tracking and care coordination, not diagnosis.',
      'Data is stored using secure cloud and local storage with encryption in transit and at rest where supported by infrastructure.',
      'Data can be viewed by the parent/guardian account owner and invited approved users (such as caregivers) according to role permissions.',
      'Parent/guardian data ownership: baby data belongs to the parent or legal guardian, not Bud & Bloom.',
      'Retention and deletion: active account data is retained while service is in use; deletion requests trigger removal from active systems and scheduled backup expiration according to operational retention windows.',
      'Users can request export or deletion of records through in-app controls where available and account support channels.',
    ],
  },
  {
    id: 'terms-of-service',
    title: '2. Terms of Service',
    purpose: 'Rules for using Bud & Bloom and responsibilities of account holders.',
    points: [
      'Users must provide accurate information to the best of their knowledge and keep account credentials secure.',
      'The primary parent/guardian account is the owner of baby profiles and access permissions.',
      'Premium features, subscriptions, and billing terms are governed by the selected payment plan and renewal settings.',
      'Bud & Bloom is provided as-is for care tracking support; users remain responsible for real-world care decisions.',
      'Limitation of liability: Bud & Bloom is not liable for losses resulting from reliance on app suggestions, missed entries, or service interruptions.',
    ],
  },
  {
    id: 'medical-disclaimer',
    title: '3. Medical Disclaimer',
    purpose: 'Clarifies the app is not a substitute for medical professionals.',
    points: [
      'Bud & Bloom does not provide medical diagnosis, treatment, or emergency intervention.',
      'Insights and reminders are informational support only and may be incomplete, delayed, or incorrect.',
      'Always consult licensed pediatric professionals for health concerns and urgent decisions.',
      'For emergencies, contact local emergency services immediately.',
    ],
  },
  {
    id: 'child-data-protection',
    title: "4. Children's Data Protection Policy",
    purpose: 'Protection standards for stored child-related records.',
    points: [
      'Bud & Bloom is intended for adults (parents/guardians/caregivers), not direct use by children.',
      'We do not knowingly collect accounts directly from children.',
      'Child-related data is submitted by authorized adults for caregiving purposes.',
      'Policy intent aligns with child data protection expectations including COPPA-style and GDPR child-data principles.',
    ],
  },
  {
    id: 'third-party-sharing',
    title: '5. Data Sharing & Third-Party Policy',
    purpose: 'Transparency on integrations and third-party services.',
    points: [
      'We may use third-party services for hosting, authentication, storage, analytics, notifications, and payments.',
      'Where possible, only necessary data is shared to operate app features.',
      'Bud & Bloom does not sell baby or family personal data.',
      'If analytics/AI services are used, data processing is limited to service functionality and security operations.',
    ],
  },
  {
    id: 'caregiver-access',
    title: '6. Caregiver Access Policy',
    purpose: 'Role-based access in multi-user family workflows.',
    points: [
      'Supported roles include owner (parent/guardian), caregiver, and clinician-facing workflows where configured.',
      'Owner has full control over profile settings, sharing permissions, export, and deletion.',
      'Caregiver accounts can be limited to logging and viewing permitted records.',
      'Owner can invite, revoke, or update caregiver access.',
      'Auditability: Bud & Bloom may log who created or modified records to support accountability.',
    ],
  },
  {
    id: 'ownership-portability',
    title: '7. Data Ownership & Portability Policy',
    purpose: 'Ensures users remain in control of family records.',
    points: [
      'Parents/guardians can export records (for example CSV/PDF where available).',
      'Parents/guardians can request account ownership transfer support when applicable.',
      'Users can request permanent deletion of records and account data, subject to required legal retention limits.',
    ],
  },
  {
    id: 'data-security',
    title: '8. Data Security Policy',
    purpose: 'Operational and technical controls for security.',
    points: [
      'Encryption in transit is enforced using HTTPS/TLS.',
      'Authentication controls include secure sign-in workflows and optional stronger protections where supported.',
      'Security monitoring, backups, and environment-level safeguards are used to reduce operational risk.',
      'Access to sensitive systems is restricted by role and operational need.',
    ],
  },
  {
    id: 'breach-notification',
    title: '9. Breach Notification Policy',
    purpose: 'How incidents are handled and communicated.',
    points: [
      'If a confirmed data incident affects user information, impacted users will be notified without undue delay and within 72 hours where legally required.',
      'Incident updates include affected data categories, mitigation actions, and user steps to reduce risk.',
      'We maintain incident-response procedures for containment, investigation, and remediation.',
    ],
  },
  {
    id: 'ai-insights',
    title: '10. AI & Insights Policy',
    purpose: 'Limits and transparency for smart recommendations.',
    points: [
      'Recommendations may be generated from logged patterns and configured rules, with optional AI-assisted insights.',
      'AI outputs are probabilistic and may be inaccurate; they are not medical advice.',
      'Users should validate important decisions with pediatric professionals.',
      'The app prioritizes explainable summaries where feasible, but not all outputs are guaranteed complete.',
    ],
  },
  {
    id: 'content-community',
    title: '11. Content & Community Policy',
    purpose: 'Standards for user-generated content and shared guidance.',
    points: [
      'Users must not share harmful, abusive, or misleading childcare/medical misinformation.',
      'Uploaded content must respect privacy rights and local laws.',
      'Bud & Bloom may moderate, restrict, or remove violating content and accounts.',
    ],
  },
  {
    id: 'growth-disclaimer',
    title: '12. Growth & Health Tracking Disclaimer',
    purpose: 'Interpretation boundaries for charts and milestones.',
    points: [
      'Growth charts, milestones, and health trend visualizations are reference tools only.',
      'Children develop at different rates; apparent delays or differences are not diagnoses.',
      'Consult healthcare professionals for interpretation of growth/health concerns.',
    ],
  },
  {
    id: 'subscription-refunds',
    title: '13. Subscription & Refund Policy',
    purpose: 'Billing expectations for premium features.',
    points: [
      'Subscription billing cycles, renewal behavior, and payment methods are shown at checkout.',
      'Trials, grace periods, and refunds are subject to platform/payment provider rules and local law.',
      'Failure to renew may restrict access to premium-only features while preserving core account records where supported.',
    ],
  },
  {
    id: 'offline-sync',
    title: '14. Offline Mode & Data Sync Policy',
    purpose: 'Behavior when internet connectivity is unavailable.',
    points: [
      'Some logging features may work offline and sync when connectivity is restored.',
      'If conflicts occur during sync, latest-write or server reconciliation rules may apply.',
      'Users should verify critical entries after reconnecting.',
    ],
  },
  {
    id: 'notification-policy',
    title: '15. Notification & Reminder Policy',
    purpose: 'How reminders are generated and controlled.',
    points: [
      'Notifications can include feeding, sleep, vaccine, medication, and routine reminders.',
      'Reminder timing depends on user settings, device permissions, and system delivery behavior.',
      'Users can customize or disable notifications at any time in app settings.',
    ],
  },
  {
    id: 'emergency-advisory',
    title: '16. Emergency Use & Advisory Note',
    purpose: 'Extra protection statement for high-stakes care scenarios.',
    points: [
      'Bud & Bloom is not an emergency response tool.',
      'Do not delay emergency care because of app outputs or missing notifications.',
      'If a pediatric advisory board is introduced, advisory input improves guidance quality but does not replace direct clinical care.',
    ],
  },
];

export const LegalPolicies: React.FC<LegalPoliciesProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 h-20 border-b border-border-gray bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-gray text-text-dim transition-all hover:text-foreground"
              title="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">
                Legal & Trust
              </p>
              <h1 className="text-xl font-headline font-black tracking-tight text-foreground">
                Bud & Bloom Policy Center
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl border border-border-gray bg-surface px-4 py-2 sm:flex">
            <ShieldCheck size={16} className="text-secondary" />
            <span className="text-xs font-black uppercase tracking-widest text-text-dim">
              Updated {LAST_UPDATED}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-8 sm:px-8">
        <section className="rounded-[2rem] border border-border-gray bg-surface p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <Scale size={20} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline font-black tracking-tight text-foreground">
                Safety, Privacy, and Family Control First
              </h2>
              <p className="text-sm font-bold leading-relaxed text-text-dim">
                These policies define how Bud & Bloom protects child-related records, supports multi-user care
                workflows, and communicates medical and AI limitations. By using Bud & Bloom, users agree to these
                policy terms.
              </p>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-text-light">
                Last Updated: {LAST_UPDATED}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          {POLICY_SECTIONS.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="rounded-[1.8rem] border border-border-gray bg-surface p-5 sm:p-6"
            >
              <h3 className="text-lg font-headline font-black tracking-tight text-foreground">
                {section.title}
              </h3>
              <p className="mt-1 text-sm font-bold leading-relaxed text-text-dim">
                {section.purpose}
              </p>
              <ul className="mt-4 space-y-2">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm font-semibold text-foreground/90">
                    <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-secondary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LegalPolicies;
