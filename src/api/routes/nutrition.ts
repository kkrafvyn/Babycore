/**
 * Nutrition and meal tracking API routes
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { ensureBabyAccess } from '../utils/baby-access.js';
import { supabase } from '../utils/supabase.js';
import { logger } from '../../utils/logger.js';

const router = Router();

const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeSeverity = (value: unknown): 'none' | 'mild' | 'moderate' | 'severe' => {
  const severity = String(value || 'none');
  return ['none', 'mild', 'moderate', 'severe'].includes(severity)
    ? (severity as 'none' | 'mild' | 'moderate' | 'severe')
    : 'none';
};

/**
 * POST /api/nutrition/meals
 * Log a meal or food introduction.
 */
router.post('/meals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      babyId,
      mealDate,
      mealName,
      ingredients,
      calories,
      allergens,
      babyReaction,
      reactionSeverity,
    } = req.body;
    const parsedIngredients = parseList(ingredients);

    if (!babyId || !mealName || parsedIngredients.length === 0) {
      return res.status(400).json({ success: false, error: 'Baby, meal name, and ingredients are required' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

    const { data, error } = await supabase
      .from('meals_logged')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        meal_date: mealDate || new Date().toISOString().split('T')[0],
        meal_name: String(mealName),
        ingredients: parsedIngredients,
        calories: Number.isFinite(Number(calories)) ? Number(calories) : null,
        allergens: parseList(allergens),
        baby_reaction: babyReaction || null,
        reaction_severity: normalizeSeverity(reactionSeverity),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Failed to log meal', error as Error, 'NUTRITION');
    return res.status(500).json({ success: false, error: 'Failed to log meal' });
  }
});

/**
 * GET /api/nutrition/meals?babyId=...
 * List recent meal logs.
 */
router.get('/meals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.query.babyId || '');
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 40)));

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    if (!(await ensureBabyAccess(req, res, babyId))) return;

    const { data, error, count } = await supabase
      .from('meals_logged')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('meal_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return res.json({ success: true, data: data || [], total: count || 0 });
  } catch (error) {
    logger.error('Failed to fetch meals', error as Error, 'NUTRITION');
    return res.status(500).json({ success: false, error: 'Failed to fetch meals' });
  }
});

/**
 * GET /api/nutrition/analytics?babyId=...&month=YYYY-MM
 * Summarize nutrition activity.
 */
router.get('/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.query.babyId || '');
    const month = String(req.query.month || '');

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    if (!(await ensureBabyAccess(req, res, babyId))) return;

    let query = supabase.from('meals_logged').select('*').eq('baby_id', babyId);
    if (/^\d{4}-\d{2}$/.test(month)) {
      const start = `${month}-01`;
      const end = new Date(`${start}T00:00:00.000Z`);
      end.setUTCMonth(end.getUTCMonth() + 1);
      query = query.gte('meal_date', start).lt('meal_date', end.toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    if (error) throw error;

    const ingredientCounts: Record<string, number> = {};
    let reactionCount = 0;
    let allergenExposureCount = 0;
    let calories = 0;

    for (const meal of data || []) {
      for (const ingredient of meal.ingredients || []) {
        ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
      }
      if (meal.reaction_severity && meal.reaction_severity !== 'none') {
        reactionCount += 1;
      }
      allergenExposureCount += Array.isArray(meal.allergens) ? meal.allergens.length : 0;
      calories += Number(meal.calories || 0);
    }

    return res.json({
      success: true,
      data: {
        mealCount: data?.length || 0,
        calories,
        reactionCount,
        allergenExposureCount,
        ingredientCounts,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch nutrition analytics', error as Error, 'NUTRITION');
    return res.status(500).json({ success: false, error: 'Failed to fetch nutrition analytics' });
  }
});

/**
 * GET /api/nutrition/ingredients?q=...
 * Search reference nutrition ingredients.
 */
router.get('/ingredients', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    const request = supabase
      .from('nutrition_info')
      .select('*')
      .order('ingredient_name', { ascending: true })
      .limit(20);

    const { data, error } = query
      ? await request.ilike('ingredient_name', `%${query}%`)
      : await request;

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error('Failed to search nutrition ingredients', error as Error, 'NUTRITION');
    return res.status(500).json({ success: false, error: 'Failed to search nutrition ingredients' });
  }
});

export default router;
