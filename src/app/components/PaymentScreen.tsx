import React, { useState, useMemo } from 'react';
import { ChevronLeft, Check, AlertCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../AppContext';
import { usePaymentManager, SUBSCRIPTION_PLANS, PaymentProvider } from '../../lib/payment-manager';
import { initializePaystack } from '../../lib/paystack';
import { initializeFlutterwave } from '../../lib/flutterwave';
import { i18nT } from '../../lib/i18n';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

interface PaymentScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ onBack, onSuccess }) => {
  const { user, updateSettings } = useAppContext();
  const paymentManager = usePaymentManager();

  const [selectedPlan, setSelectedPlan] = useState<string>('premium-monthly');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('paystack');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const selectedPlanData = useMemo(
    () => paymentManager.getSubscriptionPlan(selectedPlan),
    [selectedPlan, paymentManager]
  );

  const amount = selectedPlanData?.monthlyPrice || selectedPlanData?.yearlyPrice || 0;

  React.useEffect(() => {
    try {
      initializePaystack({
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_demo',
      });
      initializeFlutterwave({
        publicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST_demo',
      });
    } catch (err) {
      console.error('Failed to initialize payment providers:', err);
    }
  }, []);

  const handlePayment = async () => {
    if (!user?.email || !selectedPlanData || !firstName.trim() || !lastName.trim()) {
      setError(i18nT('payment.fillRequired', 'Please fill in all required fields'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const plan = selectedPlanData;
      
      await paymentManager.processSubscription(
        plan,
        user.email,
        firstName,
        lastName,
        phoneNumber
      );

      await updateSettings({
        subscriptionPlan: plan.id,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date().toISOString(),
      });

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(errorMessage);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const providerOptions: { value: PaymentProvider; label: string; emoji: string }[] = [
    { value: 'paystack', label: 'Paystack', emoji: '💳' },
    { value: 'flutterwave', label: 'Flutterwave', emoji: '📱' },
  ];

  return (
    <div className="fit-screen bg-background">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">{i18nT('payment.title')}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-32">
        <div className="max-w-md mx-auto w-full space-y-10">
          {error && (
            <MotionDiv initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-error/10 border border-error/20 rounded-[2rem] flex items-start gap-4">
               <AlertCircle className="text-error shrink-0" size={20} />
               <p className="text-xs font-bold text-error leading-relaxed">{error}</p>
            </MotionDiv>
          )}

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-2">Access Architecture</h3>
            <div className="space-y-4">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <MotionButton
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full p-8 rounded-[3rem] border transition-all text-left relative overflow-hidden group ${
                    selectedPlan === plan.id
                      ? 'bg-surface border-secondary shadow-xl'
                      : 'bg-surface border-border-gray dark:border-zinc-800 hover:border-text-light/30'
                  }`}
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-1">
                      <h3 className={`font-headline font-black text-xl tracking-tight ${selectedPlan === plan.id ? 'text-foreground' : 'text-text-light'}`}>
                        {plan.name}
                      </h3>
                      <p className="text-[11px] font-bold text-text-dim leading-tight">
                        {plan.description}
                      </p>
                    </div>
                    {selectedPlan === plan.id && (
                      <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg">
                         <Check size={18} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8 flex items-baseline gap-2 relative z-10">
                    <span className={`text-4xl font-headline font-black tracking-tighter ${selectedPlan === plan.id ? 'text-foreground' : 'text-text-light'}`}>
                      ${plan.monthlyPrice || plan.yearlyPrice}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">
                      /{plan.monthlyPrice ? 'mo' : 'yr'}
                    </span>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border-gray dark:border-zinc-800/50 flex gap-3 overflow-x-auto pb-1 no-scrollbar relative z-10">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-shrink-0 bg-surface-gray dark:bg-zinc-800/50 px-4 py-2 rounded-full border border-border-gray/30">
                        <Check size={10} className="text-secondary" strokeWidth={4} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">{feature}</span>
                      </div>
                    ))}
                  </div>
                </MotionButton>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-2">Gateway Registry</h3>
            <div className="grid grid-cols-2 gap-4">
              {providerOptions.map((provider) => (
                <MotionButton
                  key={provider.value}
                  onClick={() => setSelectedProvider(provider.value)}
                  className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group relative overflow-hidden ${
                    selectedProvider === provider.value
                      ? 'bg-surface border-secondary shadow-lg'
                      : 'bg-surface border-border-gray dark:border-zinc-800'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 ${selectedProvider === provider.value ? 'bg-secondary/10' : 'bg-surface-gray dark:bg-zinc-800/50'}`}>
                    {provider.emoji}
                  </div>
                  <span className={`font-black text-[10px] uppercase tracking-[0.2em] transition-colors ${selectedProvider === provider.value ? 'text-foreground' : 'text-text-light'}`}>
                    {provider.label}
                  </span>
                  {selectedProvider === provider.value && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-white shadow-sm">
                       <Check size={12} strokeWidth={4} />
                    </div>
                  )}
                </MotionButton>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-2">Patron Identity</h3>
            <div className="bg-surface rounded-[3rem] p-10 border border-border-gray dark:border-zinc-800 shadow-sm space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] px-2">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Name" className="input-onboarding" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] px-2">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Surname" className="input-onboarding" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] px-2">Channel Contact</label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 (000) 000-0000" className="input-onboarding" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] px-2">Encrypted Vault Email</label>
                  <input type="email" value={user?.email || ''} disabled className="input-onboarding opacity-40 cursor-not-allowed" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">Grand Total</p>
                   <h4 className="text-2xl font-headline font-black tracking-tight">{selectedPlanData?.name}</h4>
                </div>
                <p className="text-5xl font-headline font-black tracking-tighter">${amount}</p>
              </div>
              <div className="h-px bg-white/10 w-full" />
              <p className="text-[10px] font-bold text-white/70 leading-relaxed italic">
                Final commitment inclusive of all quantum-safe encryption overheads.
              </p>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border-gray dark:border-zinc-800 p-8 z-50">
        <div className="max-w-md mx-auto">
          <MotionButton
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePayment}
            disabled={loading || !selectedPlanData}
            className="w-full h-20 bg-secondary text-white py-6 rounded-full font-headline font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-secondary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin text-white/50" />
                <span>{i18nT('payment.processing')}</span>
              </>
            ) : (
              <>
                <span>{i18nT('payment.payNow')}</span>
                <div className="w-px h-4 bg-white/20" />
                <span>${amount}</span>
              </>
            )}
          </MotionButton>
        </div>
      </div>
    </div>
  );
};
