/**
 * Expenses Tracking API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/expenses/log
 * Log baby expense
 */
router.post('/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, category, amount, description, date } = req.body;

    if (!babyId || !category || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data: expense, error } = await supabase
      .from('baby_expenses')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        category,
        amount,
        description,
        purchase_date: date || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Expense logged', 'EXPENSES', { userId: req.user?.id, babyId, amount });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to log expense' });
  }
});

/**
 * GET /api/expenses/logs
 * Get expense logs
 */
router.get('/logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, limit = 20, offset = 0 } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const { data: expenses, error, count } = await supabase
      .from('baby_expenses')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('purchase_date', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, data: expenses, total: count });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
  }
});

/**
 * GET /api/expenses/analytics
 * Get expense analytics
 */
router.get('/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, month } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const { data: expenses, error } = await supabase
      .from('baby_expenses')
      .select('*')
      .eq('baby_id', babyId);

    if (error) throw error;

    // Calculate analytics
    const byCategory: Record<string, number> = {};
    let total = 0;

    (expenses || []).forEach((exp: any) => {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
      total += exp.amount;
    });

    res.json({
      success: true,
      data: {
        byCategory,
        total,
        averagePerExpense: total / (expenses?.length || 1),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch expense analytics' });
  }
});

export default router;
