/**
 * Expenses Tracking API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { ensureBabyAccess } from '../utils/baby-access.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/expenses/log
 * Log baby expense
 */
router.post('/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, category, amount, description, date, quantity } = req.body;
    const parsedAmount = Number(amount);
    const parsedQuantity = Math.max(1, Number(quantity || 1));

    if (!babyId || !category || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

    const { data: expense, error } = await supabase
      .from('baby_expenses')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        category,
        amount: parsedAmount,
        description: String(description || category),
        purchase_date: date || new Date().toISOString().split('T')[0],
        quantity: parsedQuantity,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Expense logged', 'EXPENSES', { userId: req.user?.id, babyId, amount });

    res.status(201).json({
      success: true,
      data: {
        ...expense,
        amount: Number(expense.amount || 0),
      },
    });
  } catch (error) {
    logger.error('Failed to log expense', error as Error, 'EXPENSES');
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

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    const { data: expenses, error, count } = await supabase
      .from('baby_expenses')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('purchase_date', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: (expenses || []).map((expense: any) => ({
        ...expense,
        amount: Number(expense.amount || 0),
      })),
      total: count,
    });
  } catch (error) {
    logger.error('Failed to fetch expenses', error as Error, 'EXPENSES');
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

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    let query = supabase
      .from('baby_expenses')
      .select('*')
      .eq('baby_id', babyId);

    if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      const start = `${month}-01`;
      const endDate = new Date(`${start}T00:00:00.000Z`);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      query = query.gte('purchase_date', start).lt('purchase_date', endDate.toISOString().split('T')[0]);
    }

    const { data: expenses, error } = await query;

    if (error) throw error;

    // Calculate analytics
    const byCategory: Record<string, number> = {};
    const countByCategory: Record<string, number> = {};
    let total = 0;

    (expenses || []).forEach((exp: any) => {
      const amount = Number(exp.amount || 0);
      byCategory[exp.category] = (byCategory[exp.category] || 0) + amount;
      countByCategory[exp.category] = (countByCategory[exp.category] || 0) + 1;
      total += amount;
    });

    res.json({
      success: true,
      data: {
        byCategory,
        countByCategory,
        total,
        averagePerExpense: total / (expenses?.length || 1),
        expenseCount: expenses?.length || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch expense analytics', error as Error, 'EXPENSES');
    res.status(500).json({ success: false, error: 'Failed to fetch expense analytics' });
  }
});

export default router;
