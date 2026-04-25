/**
 * Paystack Payment Integration
 * Handles payment processing via Paystack
 */

export interface PaystackConfig {
  publicKey: string;
  baseURL?: string;
}

export interface PaystackInitializeOptions {
  email: string;
  amount: number; // Amount in kobo
  reference: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, any>;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    amount: number;
    status: string;
    paidAt: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
  };
}

export interface PaystackSubscriptionPlan {
  planCode: string;
  name: string;
  description: string;
  amountKobo: number; // in kobo
  interval: 'monthly' | 'quarterly' | 'biannually' | 'annually';
  inviteLink?: string;
}

class PaystackPaymentClient {
  private publicKey: string;
  private baseURL: string = 'https://api.paystack.co';
  private scriptLoaded: boolean = false;

  constructor(config: PaystackConfig) {
    this.publicKey = config.publicKey;
    if (config.baseURL) {
      this.baseURL = config.baseURL;
    }
    this.loadPaystackScript();
  }

  private loadPaystackScript(): void {
    if (document.getElementById('paystack-script')) {
      this.scriptLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-script';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      this.scriptLoaded = true;
    };
    document.head.appendChild(script);
  }

  private waitForPaystackScript(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if ((window as any).PaystackPop) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  async initializeTransaction(options: PaystackInitializeOptions): Promise<void> {
    await this.waitForPaystackScript();

    if (!(window as any).PaystackPop) {
      throw new Error(
        'Paystack library not loaded. Please check your internet connection or public key.'
      );
    }

    return new Promise((resolve, reject) => {
      const handler = (window as any).PaystackPop.setup({
        key: this.publicKey,
        email: options.email,
        amount: options.amount,
        ref: options.reference,
        currency: 'NGN',
        firstname: options.firstName || '',
        lastname: options.lastName || '',
        metadata: options.metadata || {},
        onClose: () => {
          options.onClose?.();
          resolve();
        },
        callback: (response: any) => {
          // Verify transaction on backend before marking as successful
          this.verifyTransaction(response.reference)
            .then(() => {
              options.onSuccess?.();
              resolve();
            })
            .catch((error) => {
              options.onError?.(error);
              reject(error);
            });
        },
      });

      handler.openIframe();
    });
  }

  async verifyTransaction(reference: string): Promise<PaystackTransactionResponse> {
    try {
      const response = await fetch(`${this.baseURL}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to verify transaction');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  }

  async createPlan(plan: PaystackSubscriptionPlan): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/plan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: plan.name,
          description: plan.description,
          amount: plan.amountKobo,
          interval: plan.interval,
          plan_code: plan.planCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription plan');
      }

      return response.json();
    } catch (error) {
      console.error('Paystack plan creation error:', error);
      throw error;
    }
  }

  async createSubscription(
    authorizationCode: string,
    email: string,
    planCode: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: email,
          plan: planCode,
          authorization: authorizationCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      return response.json();
    } catch (error) {
      console.error('Paystack subscription error:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionCode: string, token: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/subscription/${subscriptionCode}/disable`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      return response.json();
    } catch (error) {
      console.error('Paystack cancellation error:', error);
      throw error;
    }
  }
}

// Export singleton instance getter
let paystackClient: PaystackPaymentClient | null = null;

export function initializePaystack(config: PaystackConfig): PaystackPaymentClient {
  paystackClient = new PaystackPaymentClient(config);
  return paystackClient;
}

export function getPaystackClient(): PaystackPaymentClient {
  if (!paystackClient) {
    throw new Error(
      'Paystack client not initialized. Call initializePaystack() first.'
    );
  }
  return paystackClient;
}
