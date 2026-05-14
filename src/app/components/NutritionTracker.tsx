import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, Plus, RefreshCw, Search } from 'lucide-react';
import {
  getMealLogs,
  getNutritionAnalytics,
  logMeal,
  searchNutritionIngredients,
  type MealLog,
  type NutritionAnalytics,
  type NutritionInfo,
  type ReactionSeverity,
} from '../../lib/nutrition-api';

interface NutritionTrackerProps {
  babyId: string;
  babyName: string;
  onBack: () => void;
}

const currentMonthValue = () => new Date().toISOString().slice(0, 7);
const todayInputValue = () => new Date().toISOString().split('T')[0];

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));

export function NutritionTracker({ babyId, babyName, onBack }: NutritionTrackerProps) {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [analytics, setAnalytics] = useState<NutritionAnalytics>({
    mealCount: 0,
    calories: 0,
    reactionCount: 0,
    allergenExposureCount: 0,
    ingredientCounts: {},
  });
  const [month, setMonth] = useState(currentMonthValue());
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [ingredientResults, setIngredientResults] = useState<NutritionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    mealName: '',
    ingredients: '',
    calories: '',
    allergens: '',
    babyReaction: '',
    reactionSeverity: 'none' as ReactionSeverity,
    mealDate: todayInputValue(),
  });

  const loadNutrition = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [mealResult, analyticsResult] = await Promise.all([
        getMealLogs(babyId, 50),
        getNutritionAnalytics(babyId, month),
      ]);
      setMeals(mealResult.meals);
      setAnalytics(analyticsResult);
    } catch (err: any) {
      setError(err?.message || 'Unable to load nutrition tracking right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadNutrition();
  }, [babyId, month]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      try {
        const results = await searchNutritionIngredients(ingredientQuery);
        setIngredientResults(results);
      } catch {
        setIngredientResults([]);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [ingredientQuery]);

  const topIngredients = useMemo(
    () =>
      Object.entries(analytics.ingredientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [analytics.ingredientCounts],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ingredients = splitList(form.ingredients);

    if (!form.mealName.trim() || ingredients.length === 0) {
      setError('Add a meal name and at least one ingredient.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await logMeal({
        babyId,
        mealDate: form.mealDate,
        mealName: form.mealName.trim(),
        ingredients,
        calories: form.calories ? Number(form.calories) : null,
        allergens: splitList(form.allergens),
        babyReaction: form.babyReaction.trim(),
        reactionSeverity: form.reactionSeverity,
      });
      setForm({
        mealName: '',
        ingredients: '',
        calories: '',
        allergens: '',
        babyReaction: '',
        reactionSeverity: 'none',
        mealDate: todayInputValue(),
      });
      await loadNutrition('refresh');
    } catch (err: any) {
      setError(err?.message || 'Unable to save this meal.');
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
              Food Journey
            </p>
            <h1 className="truncate text-xl font-headline font-black tracking-tight text-foreground sm:text-2xl">
              {babyName}'s Nutrition
            </h1>
          </div>
        </div>
        <button
          onClick={() => void loadNutrition('refresh')}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-gray bg-surface text-foreground transition-all disabled:opacity-60 dark:border-zinc-700"
          title="Refresh nutrition"
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

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2.2rem] border border-border-gray bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-500 p-6 text-white shadow-sm dark:border-zinc-800 sm:rounded-[3rem] sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
                    Monthly Food Log
                  </p>
                  <h2 className="mt-3 text-5xl font-headline font-black tracking-tighter">
                    {analytics.mealCount}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-white/75">meals and food introductions</p>
                </div>
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-white outline-none backdrop-blur"
                />
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/65">Calories</p>
                  <p className="mt-1 text-xl font-headline font-black">{analytics.calories || '-'}</p>
                </div>
                <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/65">Allergens</p>
                  <p className="mt-1 text-xl font-headline font-black">{analytics.allergenExposureCount}</p>
                </div>
                <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/65">Reactions</p>
                  <p className="mt-1 text-xl font-headline font-black">{analytics.reactionCount}</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Top Ingredients</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topIngredients.length ? (
                    topIngredients.map(([ingredient, count]) => (
                      <span
                        key={ingredient}
                        className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider backdrop-blur"
                      >
                        {ingredient} x{count}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-bold text-white/75">No ingredients logged this month yet.</span>
                  )}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2.2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 sm:rounded-[3rem] sm:p-7"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">Quick Add</p>
              <h3 className="mt-1 text-2xl font-headline font-black tracking-tight text-foreground">
                Log food or solids
              </h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Meal</span>
                  <input
                    value={form.mealName}
                    onChange={(event) => setForm((current) => ({ ...current, mealName: event.target.value }))}
                    placeholder="Breakfast, puree, snack..."
                    className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Date</span>
                  <input
                    type="date"
                    value={form.mealDate}
                    onChange={(event) => setForm((current) => ({ ...current, mealDate: event.target.value }))}
                    className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">
                  Ingredients
                </span>
                <input
                  value={form.ingredients}
                  onChange={(event) => setForm((current) => ({ ...current, ingredients: event.target.value }))}
                  placeholder="banana, oats, yogurt"
                  className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                />
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Calories</span>
                  <input
                    type="number"
                    min="0"
                    value={form.calories}
                    onChange={(event) => setForm((current) => ({ ...current, calories: event.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Reaction</span>
                  <select
                    value={form.reactionSeverity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reactionSeverity: event.target.value as ReactionSeverity,
                      }))
                    }
                    className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                  >
                    <option value="none">None</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Known allergens</span>
                <input
                  value={form.allergens}
                  onChange={(event) => setForm((current) => ({ ...current, allergens: event.target.value }))}
                  placeholder="egg, peanut, dairy..."
                  className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                />
              </label>

              <label className="mt-3 block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Baby response</span>
                <input
                  value={form.babyReaction}
                  onChange={(event) => setForm((current) => ({ ...current, babyReaction: event.target.value }))}
                  placeholder="Loved it, rash, refused, gassy..."
                  className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-background shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Meal'}
              </button>
            </form>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <Search className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">
                    Nutrition Reference
                  </p>
                  <h3 className="text-xl font-headline font-black tracking-tight text-foreground">
                    Ingredient lookup
                  </h3>
                </div>
              </div>
              <input
                value={ingredientQuery}
                onChange={(event) => setIngredientQuery(event.target.value)}
                placeholder="Search banana, egg, oat..."
                className="w-full rounded-2xl border border-border-gray bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-secondary dark:border-zinc-700"
              />
              <div className="mt-4 space-y-3">
                {ingredientResults.length === 0 ? (
                  <p className="rounded-[1.4rem] bg-surface-gray p-4 text-sm font-semibold text-text-dim dark:bg-zinc-900">
                    No reference ingredients found yet. Seed `nutrition_info` to unlock richer guidance.
                  </p>
                ) : (
                  ingredientResults.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="rounded-[1.4rem] border border-border-gray bg-background p-4 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-foreground">{ingredient.ingredient_name}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-text-light">
                            {ingredient.category || 'Food'} - intro {ingredient.introduction_age_months || '?'}m+
                          </p>
                        </div>
                        {ingredient.common_allergen && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            Allergen
                          </span>
                        )}
                      </div>
                      {ingredient.preparation_tips && (
                        <p className="mt-2 text-xs font-semibold text-text-dim">{ingredient.preparation_tips}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">Recent Meals</p>
              <h3 className="mt-1 text-xl font-headline font-black tracking-tight text-foreground">
                Food history
              </h3>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-secondary" />
                  </div>
                ) : meals.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-border-gray p-6 text-center dark:border-zinc-700">
                    <p className="text-sm font-bold text-foreground">No meals logged yet.</p>
                    <p className="mt-1 text-xs font-semibold text-text-dim">
                      Start with a simple food intro and note any reaction.
                    </p>
                  </div>
                ) : (
                  meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="rounded-[1.5rem] border border-border-gray bg-background p-4 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-foreground">{meal.meal_name}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-text-light">
                            {formatDate(meal.meal_date)}
                          </p>
                        </div>
                        {meal.reaction_severity && meal.reaction_severity !== 'none' && (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                            {meal.reaction_severity}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(meal.ingredients || []).map((ingredient) => (
                          <span
                            key={ingredient}
                            className="rounded-full bg-surface-gray px-3 py-1 text-[9px] font-black uppercase tracking-wider text-text-dim dark:bg-zinc-900"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                      {meal.baby_reaction && (
                        <p className="mt-3 text-xs font-semibold text-text-dim">{meal.baby_reaction}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
