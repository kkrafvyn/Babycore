/**
 * Flutterwave Payment Integration
 * Handles payment processing via Flutterwave
 */

export interface FlutterwaveConfig {
  publicKey: string;
  baseURL?: string;
}

export interface FlutterwavePaymentOptions {
  amount: number;
  currency: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  txRef: string;
  customization?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  meta?: Record<string, any>;
  onSuccess?: (response: FlutterwavePaymentResponse) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export interface FlutterwavePaymentResponse {
  status: string;
  message: string;
  data?: {
    id: number;
    txRef: string;
    flwRef: string;
    amount: number;
    currency: string;
    customer: {
      id: number;
      name: string;
      email: string;
      phoneNumber: string;
    };
    processor_response: string;
    auth_model: string;
    payment_type: string;
    plan: string;
    createdAt: string;
  };
}

export interface FlutterwaveSubscriptionPlan {
  plan_code: string;
  name: string;
  amount: number;
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  duration: number;
  status: 'active' | 'inactive';
}

class FlutterwavePaymentClient {
  private publicKey: string;
  private baseURL: string = 'https://api.flutterwave.com/v3';
  private scriptLoaded: boolean = false;

  constructor(config: FlutterwaveConfig) {
    this.publicKey = config.publicKey;
    if (config.baseURL) {
      this.baseURL = config.baseURL;
    }
    this.loadFlutterwaveScript();
  }

  private loadFlutterwaveScript(): void {
    if (document.getElementById('flutterwave-script')) {
      this.scriptLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.id = 'flutterwave-script';
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.onload = () => {
      this.scriptLoaded = true;
    };
    document.head.appendChild(script);
  }

  private waitForFlutterwaveScript(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if ((window as any).FlutterwaveCheckout) {
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

  async initializePayment(options: FlutterwavePaymentOptions): Promise<void> {
    await this.waitForFlutterwaveScript();

    if (!(window as any).FlutterwaveCheckout) {
      throw new Error(
        'Flutterwave library not loaded. Please check your internet connection or public key.'
      );
    }

    return new Promise((resolve, reject) => {
      (window as any).FlutterwaveCheckout({
        public_key: this.publicKey,
        tx_ref: options.txRef,
        amount: options.amount,
        currency: options.currency,
        payment_options: 'card,mobilemoney,ussd',
        customer: {
          email: options.email,
          phonenumber: options.phoneNumber,
          name: `${options.firstName} ${options.lastName}`,
        },
        customizations: {
          title: options.customization?.title || 'Bud & Bloom Subscription',
          description: options.customization?.description || 'Premium subscription payment',
          logo: options.customization?.logo,
        },
        meta: options.meta || {},
        onComplete: (response: FlutterwavePaymentResponse) => {
          if (response.status === 'successful') {
            this.verifyTransaction(response.data?.flwRef || '')
              .then((verified) => {
                options.onSuccess?.(response);
                resolve();
              })
              .catch((error) => {
                options.onError?.(error);
                reject(error);
              });
          } else {
            const error = new Error(response.message || 'Payment failed');
            options.onError?.(error);
            reject(error);
          }
        },
        onClose: () => {
          options.onClose?.();
          resolve();
        },
      });
    });
  }

  async verifyTransaction(flwRef: string): Promise<FlutterwavePaymentResponse> {
    try {
      const response = await fetch(`${this.baseURL}/transactions/${flwRef}/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to verify transaction');
      }

      return response.json();
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw error;
    }
  }

  async createPlan(plan: FlutterwaveSubscriptionPlan): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/subscription/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plan),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription plan');
      }

      return response.json();
    } catch (error) {
      console.error('Flutterwave plan creation error:', error);
      throw error;
    }
  }

  async createSubscription(
    email: string,
    planId: string,
    authorization: {
      number: string;
      cvv: string;
      expiry_month: string;
      expiry_year: string;
    }
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            email,
          },
          plan: planId,
          authorization,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      return response.json();
    } catch (error) {
      console.error('Flutterwave subscription error:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/subscription/${subscriptionId}/cancel`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      return response.json();
    } catch (error) {
      console.error('Flutterwave cancellation error:', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction status');
      }

      return response.json();
    } catch (error) {
      console.error('Flutterwave status error:', error);
      throw error;
    }
  }
}

// Export singleton instance getter
let flutterwaveClient: FlutterwavePaymentClient | null = null;

export function initializeFlutterwave(config: FlutterwaveConfig): FlutterwavePaymentClient {
  flutterwaveClient = new FlutterwavePaymentClient(config);
  return flutterwaveClient;
}

export function getFlutterwaveClient(): FlutterwavePaymentClient {
  if (!flutterwaveClient) {
    throw new Error(
      'Flutterwave client not initialized. Call initializeFlutterwave() first.'
    );
  }
  return flutterwaveClient;
}
