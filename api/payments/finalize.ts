type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: Record<string, any>) => void;
  setHeader: (name: string, value: string) => void;
};

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
  };
}

const parseRequestBody = (requestBody: unknown): Record<string, any> => {
  if (!requestBody) {
    return {};
  }

  if (typeof requestBody === 'string') {
    try {
      return JSON.parse(requestBody);
    } catch {
      return {};
    }
  }

  if (typeof requestBody === 'object') {
    return requestBody as Record<string, any>;
  }

  return {};
};

const toMinorUnits = (amount: number): number => Math.round(amount * 100);

const verifyWithPaystack = async (
  reference: string,
  secretKey: string,
): Promise<PaystackVerifyResponse> => {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = (await response.json()) as PaystackVerifyResponse;

  if (!response.ok) {
    throw new Error(data?.message || `Paystack verification failed (${response.status})`);
  }

  return data;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, verified: false, message: 'Method not allowed' });
    return;
  }

  const body = parseRequestBody(req.body);
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  const amount = Number(body.amount);
  const expectedCurrency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : '';
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || process.env.VITE_PAYSTACK_LIVE_SECRET_KEY;

  if (!reference || !Number.isFinite(amount) || amount <= 0 || !expectedCurrency) {
    res.status(400).json({
      success: false,
      verified: false,
      message: 'Missing or invalid reference/amount/currency',
    });
    return;
  }

  if (!paystackSecretKey) {
    res.status(500).json({
      success: false,
      verified: false,
      message: 'PAYSTACK_SECRET_KEY is not configured',
    });
    return;
  }

  try {
    const verification = await verifyWithPaystack(reference, paystackSecretKey);
    const paidAmountMinor = verification.data?.amount ?? 0;
    const paidCurrency = (verification.data?.currency || '').toUpperCase();
    const paidStatus = verification.data?.status || 'unknown';
    const expectedAmountMinor = toMinorUnits(amount);

    if (!verification.status || paidStatus !== 'success') {
      res.status(400).json({
        success: false,
        verified: false,
        message: `Payment status is ${paidStatus}`,
      });
      return;
    }

    if (paidAmountMinor !== expectedAmountMinor) {
      res.status(400).json({
        success: false,
        verified: false,
        message: 'Paid amount does not match expected amount',
      });
      return;
    }

    if (paidCurrency && paidCurrency !== expectedCurrency) {
      res.status(400).json({
        success: false,
        verified: false,
        message: `Currency mismatch: expected ${expectedCurrency}, got ${paidCurrency}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Payment verified successfully',
      reference,
      paidAt: verification.data?.paid_at || null,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      verified: false,
      message: error?.message || 'Payment verification failed',
    });
  }
}
