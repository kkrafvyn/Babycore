import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus, Receipt, RefreshCw, TrendingUp } from 'lucide-react';
import {
  getBabyExpenses,
  getExpenseAnalytics,
  logBabyExpense,
  type BabyExpense,
  type ExpenseAnalytics,
  type ExpenseCategory,
} from '../../lib/expenses-api';

interface ExpenseTrackerProps {
  babyId: string;
  babyName: string;
  onBack: () => void;
}

const EXPENSE_CATEGORIES: Array<{
  value: ExpenseCategory;
  label: string;
  helper: string;
  accent: string;
}> = [
  { value: 'formula', label: 'Formula', helper: 'Milk, bottles, feeding supplies', accent: 'bg-emerald-500' },
  { value: 'diapers', label: 'Diapers', helper: 'Diapers, wipes, changing care', accent: 'bg-amber-500' },
  { value: 'clothing', label: 'Clothing', helper: 'Outfits, shoes, seasonal gear', accent: 'bg-sky-500' },
  { value: 'toys', label: 'Toys', helper: 'Books, play, development toys', accent: 'bg-violet-500' },
  { value: 'medical', label: 'Medical', helper: 'Visits, medicine, supplies', accent: 'bg-rose-500' },
  { value: 'other', label: 'Other', helper: 'Everything else', accent: 'bg-slate-500' },
];

const CATEGORY_BY_VALUE = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.value, category]),
) as Record<ExpenseCategory, (typeof EXPENSE_CATEGORIES)[number]>;

const todayInputValue = () => new Date().toISOString().split('T')[0];
const currentMonthValue = () => new Date().toISOString().slice(0, 7);

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));

export function ExpenseTracker({ babyId, babyName, onBack }: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<BabyExpense[]>([]);
  const [analytics, setAnalytics] = useState<ExpenseAnalytics>({
    byCategory: {},
    countByCategory: {},
    total: 0,
    averagePerExpense: 0,
    expenseCount: 0,
  });
  const [month, setMonth] = useState(currentMonthValue());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: 'diapers' as ExpenseCategory,
    amount: '',
    description: '',
    quantity: '1',
    date: todayInputValue(),
  });

  const loadExpenses = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [expenseResult, analyticsResult] = await Promise.all([
        getBabyExpenses(babyId, { limit: 50 }),
        getExpenseAnalytics(babyId, month),
      ]);
      setExpenses(expenseResult.expenses);
      setAnalytics(analyticsResult);
    } catch (err: any) {
      setError(err?.message || 'Unable to load expense tracking right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadExpenses();
  }, [babyId, month]);

  const categoryTotals = useMemo(
    () =>
      Object.entries(analytics.byCategory)
        .map(([category, total]) => ({
          category: category as ExpenseCategory,
          total: Number(total || 0),
        }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total),
    [analytics.byCategory],
  );

  const topCategory = categoryTotals[0] || null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount before saving the expense.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await logBabyExpense({
        babyId,
        category: form.category,
        amount,
        description: form.description.trim() || CATEGORY_BY_VALUE[form.category].label,
        date: form.date,
        quantity: Number(form.quantity || 1),
      });
      setForm((current) => ({
        ...current,
        amount: '',
        description: '',
        quantity: '1',
        date: todayInputValue(),
      }));
      await loadExpenses('refresh');
    } catch (err: any) {
      setError(err?.message || 'Unable to save this expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border-gray bg-background/85 px-3 backdrop-blur-xl dark:border-zinc-800/50 sm:h-20 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="p-2 text-primary transition-all hover:scale-110 active:scale-95 dark:text-zinc-400"
          >
            <ChevronLeft size={22} className="sm:h-6 sm:w-6" />
          </button>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-text-light">
              Baby Budget
            </p>
            <h1 className="truncate text-xl font-headline font-black tracking-tight text-foreground sm:text-2xl">
              {babyName}'s Expenses
            </h1>
          </div>
        </div>
        <button
          onClick={() => void loadExpenses('refresh')}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-gray bg-surface text-foreground transition-all disabled:opacity-60 dark:border-zinc-700"
          title="Refresh expenses"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-3 pb-24 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto w-full max-w-5xl space-y-5">
          {error && (
            <div className="rounded-[1.5rem] border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-[2.2rem] border border-border-gray bg-surface shadow-sm dark:border-zinc-800 sm:rounded-[3rem]">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-[18rem] overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 p-6 text-white sm:p-8">
                <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/15 blur-2xl" />
                <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
                      Month Spend
                    </p>
                    <div className="mt-4 flex flex-wrap items-end gap-4">
                      <h2 className="text-5xl font-headline font-black tracking-tighter sm:text-6xl">
                        {formatCurrency(analytics.total)}
                      </h2>
                      <input
                        type="month"
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                        className="mb-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-white outline-none backdrop-blur placeholder:text-white/70"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/65">
                        Entries
                      </p>
                      <p className="mt-1 text-2xl font-headline font-black">{analytics.expenseCount}</p>
                    </div>
                    <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/65">
                        Average
                      </p>
                      <p className="mt-1 text-2xl font-headline font-black">
                        {formatCurrency(analytics.averagePerExpense)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-7">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">
                    Quick Add
                  </p>
                  <h3 className="mt-1 text-2xl font-headline font-black tracking-tight text-foreground">
                    Log a new expense
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Category</span>
                    <select
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value as ExpenseCategory,
                        }))
                      }
                      className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                    >
                      {EXPENSE_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Amount</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Date</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.quantity}
                      onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                      className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                    />
                  </label>
                </div>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Description</span>
                  <input
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder={CATEGORY_BY_VALUE[form.category].helper}
                    className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-background shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Expense'}
                </button>
              </form>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">
                    Category Map
                  </p>
                  <h3 className="mt-1 text-xl font-headline font-black tracking-tight text-foreground">
                    Where money is going
                  </h3>
                </div>
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>

              {topCategory ? (
                <div className="mb-5 rounded-[1.5rem] bg-surface-gray p-4 dark:bg-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Top Category</p>
                  <p className="mt-1 text-2xl font-headline font-black text-foreground">
                    {CATEGORY_BY_VALUE[topCategory.category]?.label || topCategory.category}
                  </p>
                  <p className="mt-1 text-sm font-bold text-text-dim">{formatCurrency(topCategory.total)}</p>
                </div>
              ) : (
                <p className="mb-5 text-sm font-semibold text-text-dim">No category totals yet for this month.</p>
              )}

              <div className="space-y-3">
                {EXPENSE_CATEGORIES.map((category) => {
                  const total = Number(analytics.byCategory[category.value] || 0);
                  const percent = analytics.total > 0 ? Math.round((total / analytics.total) * 100) : 0;

                  return (
                    <div key={category.value}>
                      <div className="mb-1.5 flex items-center justify-between text-xs font-black uppercase tracking-wider">
                        <span className="text-foreground">{category.label}</span>
                        <span className="text-text-light">{formatCurrency(total)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-gray dark:bg-zinc-900">
                        <div className={`h-full rounded-full ${category.accent}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">
                    Recent Expenses
                  </p>
                  <h3 className="mt-1 text-xl font-headline font-black tracking-tight text-foreground">
                    Latest purchases
                  </h3>
                </div>
                <Receipt className="h-5 w-5 text-secondary" />
              </div>

              {loading ? (
                <div className="flex min-h-40 items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-secondary" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-border-gray p-6 text-center dark:border-zinc-700">
                  <p className="text-sm font-bold text-foreground">No expenses logged yet.</p>
                  <p className="mt-1 text-xs font-semibold text-text-dim">
                    Add the first one and this becomes a tidy baby budget ledger.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => {
                    const category = CATEGORY_BY_VALUE[expense.category] || CATEGORY_BY_VALUE.other;

                    return (
                      <div
                        key={expense.id}
                        className="flex items-center gap-3 rounded-[1.5rem] border border-border-gray bg-background p-4 dark:border-zinc-800"
                      >
                        <div className={`h-11 w-11 shrink-0 rounded-2xl ${category.accent} shadow-inner`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-foreground">{expense.description}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-text-light">
                            {category.label} - {formatDate(expense.purchase_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">{formatCurrency(expense.amount)}</p>
                          {expense.quantity && expense.quantity > 1 && (
                            <p className="text-[10px] font-bold text-text-light">x{expense.quantity}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
