# Payment & Role-Based Access Control (RBAC) Implementation Guide

## Overview

This guide covers the implementation of:
1. **Dual Payment Providers**: Paystack and Flutterwave
2. **Role-Based Access Control**: Admin, Manager, and User roles
3. **Subscription Management**: Multi-plan support
4. **Payment Integration**: Unified payment manager

---

## 1. Payment Provider Setup

### Environment Variables

Create a `.env` file in the project root:

```env
# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key_here
VITE_PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key_here

# Flutterwave Configuration
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_LIVE_your_flutterwave_key_here
VITE_FLUTTERWAVE_SECRET_KEY=sk_live_your_flutterwave_secret_here
```

### Obtaining API Keys

#### Paystack
1. Create account at https://paystack.com
2. Navigate to Settings → API Keys & Webhooks
3. Copy **Public Key** to `VITE_PAYSTACK_PUBLIC_KEY`
4. Copy **Secret Key** to `VITE_PAYSTACK_SECRET_KEY`

#### Flutterwave
1. Create account at https://flutterwave.com
2. Go to Settings → API Keys
3. Copy **Public Key** to `VITE_FLUTTERWAVE_PUBLIC_KEY`
4. Copy **Secret Key** to `VITE_FLUTTERWAVE_SECRET_KEY`

---

## 2. Using Payment Manager

### Initialize Payment Providers

In your main app file (e.g., `App.tsx`):

```typescript
import { initializePaystack } from './lib/paystack';
import { initializeFlutterwave } from './lib/flutterwave';
import { getPaymentManager } from './lib/payment-manager';

// Initialize payment providers
useEffect(() => {
  initializePaystack({
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_demo',
  });

  initializeFlutterwave({
    publicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST_demo',
  });

  // Set primary provider (optional)
  const paymentManager = getPaymentManager();
  paymentManager.setPrimaryProvider('paystack'); // or 'flutterwave'
}, []);
```

### Process Payment

```typescript
import { usePaymentManager } from './lib/payment-manager';

const paymentManager = usePaymentManager();

// Single payment
await paymentManager.processPayment({
  provider: 'paystack',
  amount: 49.99,
  currency: 'NGN',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+234812345678',
  reference: `txn_${Date.now()}`,
  description: 'Premium Subscription',
  onSuccess: () => {
    console.log('Payment successful!');
  },
  onError: (error) => {
    console.error('Payment failed:', error);
  },
});

// Subscription payment
const plan = paymentManager.getSubscriptionPlan('premium-monthly');
await paymentManager.processSubscription(
  plan,
  'user@example.com',
  'John',
  'Doe',
  '+234812345678'
);
```

---

## 3. Role-Based Access Control (RBAC)

### Available Roles

#### Admin (Full Access)
- ✅ Manage all users
- ✅ View all subscriptions
- ✅ System settings
- ✅ Data management
- ✅ Generate reports
- ✅ All features enabled

#### Manager (Limited Admin)
- ✅ Manage users (except deletion)
- ✅ View subscriptions
- ✅ Generate reports
- ✅ Data export/import
- ❌ Cannot delete users
- ❌ Cannot manage roles
- ❌ Cannot manage system settings

#### User (End User)
- ✅ Personal settings
- ✅ All app features
- ✅ Data export
- ✅ Profile management
- ❌ Cannot manage users
- ❌ Cannot view reports
- ❌ Cannot manage system

### Initialize RBAC

```typescript
import { RBACService, UserWithRole } from './lib/rbac';

// Create user with role
const rbac = RBACService.getInstance();

const user: UserWithRole = rbac.createUserWithRole(
  'user_123',
  'user@example.com',
  'user' // 'admin' | 'manager' | 'user'
);

// Set current logged-in user
rbac.setCurrentUser(user);
```

### Check Permissions

```typescript
import { useRBAC, canAccess, canAccessByRole } from './lib/rbac';

const rbac = useRBAC();

// Check single permission
if (rbac.hasPermission('user.create')) {
  // Show user management UI
}

// Check multiple permissions (any)
if (rbac.hasAnyPermission(['data.export', 'data.import'])) {
  // Show data management UI
}

// Check multiple permissions (all)
if (rbac.hasAllPermissions(['subscription.view_all', 'reports.generate'])) {
  // Show analytics dashboard
}

// Check role
if (rbac.hasRole('admin')) {
  // Show admin panel
}

// Check any of multiple roles
if (rbac.hasAnyRole(['admin', 'manager'])) {
  // Show management features
}
```

### Component-Level Access Control

```typescript
import { canAccess, canAccessByRole } from './lib/rbac';

// Protected component based on permission
function UserManagement() {
  if (!canAccess('user.create')) {
    return <div>Access Denied</div>;
  }
  return <UserManagementPanel />;
}

// Protected component based on role
function AdminPanel() {
  if (!canAccessByRole('admin')) {
    return <div>Admin Only</div>;
  }
  return <AdminDashboard />;
}
```

### Update User Role

```typescript
const rbac = RBACService.getInstance();

// Only admins can change roles
if (rbac.canAssignRole('manager')) {
  rbac.updateUserRole('user_456', 'manager');
}
```

### Get All Users

```typescript
const rbac = RBACService.getInstance();

// Only accessible to users with 'user.read' permission
const allUsers = rbac.getAllUsers();
```

---

## 4. Permission Matrix

### User Management
| Permission | Admin | Manager | User |
|-----------|-------|---------|------|
| user.create | ✅ | ✅ | ❌ |
| user.read | ✅ | ✅ | ❌ |
| user.update | ✅ | ✅ | ✅ |
| user.delete | ✅ | ❌ | ❌ |
| user.manage_roles | ✅ | ❌ | ❌ |

### Subscription Management
| Permission | Admin | Manager | User |
|-----------|-------|---------|------|
| subscription.view_all | ✅ | ✅ | ❌ |
| subscription.create | ✅ | ❌ | ❌ |
| subscription.update | ✅ | ✅ | ❌ |
| subscription.cancel | ✅ | ❌ | ❌ |

### Features
| Feature | Admin | Manager | User |
|---------|-------|---------|------|
| growth_chart | ✅ | ✅ | ✅ |
| vaccination | ✅ | ✅ | ✅ |
| notifications | ✅ | ✅ | ✅ |
| cloud_sync | ✅ | ✅ | ✅ |
| multi_baby | ✅ | ✅ | ✅ |
| export | ✅ | ✅ | ✅ |

---

## 5. Integration with Paywall

The payment system integrates with the existing Paywall component:

```typescript
import { Paywall } from './components/Paywall';
import { usePaymentManager } from './lib/payment-manager';

function PremiumFeature() {
  const [showPaywall, setShowPaywall] = useState(false);
  const { hasAccess } = usePremiumFeature('growthChart');
  const paymentManager = usePaymentManager();

  if (!hasAccess) {
    return (
      <>
        <Paywall
          feature="Growth Chart"
          onUpgrade={() => {
            setShowPaywall(true);
          }}
        />
        {showPaywall && (
          <PaymentScreen
            onBack={() => setShowPaywall(false)}
            onSuccess={() => {
              setShowPaywall(false);
              // Refresh user permissions
            }}
          />
        )}
      </>
    );
  }

  return <GrowthChart />;
}
```

---

## 6. Webhook Handling (Backend)

### Paystack Webhook Example

```typescript
// POST /api/webhooks/paystack
async function handlePaystackWebhook(req: Request) {
  const { event, data } = req.body;

  if (event === 'charge.success') {
    const { reference, customer, amount } = data;
    
    // Update subscription in database
    await updateSubscription({
      email: customer.email,
      status: 'active',
      lastPayment: new Date(),
      amount,
    });
  }
}
```

### Flutterwave Webhook Example

```typescript
// POST /api/webhooks/flutterwave
async function handleFlutterwaveWebhook(req: Request) {
  const { data } = req.body;

  if (data.status === 'successful') {
    const { customer_email, amount } = data;
    
    // Update subscription in database
    await updateSubscription({
      email: customer_email,
      status: 'active',
      lastPayment: new Date(),
      amount,
    });
  }
}
```

---

## 7. Testing

### Test Payment Credentials

**Paystack Test Mode:**
- Public Key: `pk_test_...`
- Use test card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Flutterwave Test Mode:**
- Public Key: `FLWPUBK_TEST_...`
- Use test card: `5531889988872014`
- CVV: `564`
- Expiry: `09/32`

### Test RBAC

```typescript
import { RBACService } from './lib/rbac';

// Create test users
const rbac = RBACService.getInstance();

const admin = rbac.createUserWithRole('admin_1', 'admin@test.com', 'admin');
const manager = rbac.createUserWithRole('mgr_1', 'manager@test.com', 'manager');
const user = rbac.createUserWithRole('user_1', 'user@test.com', 'user');

// Test permissions
rbac.setCurrentUser(admin);
console.assert(rbac.hasPermission('user.delete')); // true

rbac.setCurrentUser(manager);
console.assert(!rbac.hasPermission('user.delete')); // false

rbac.setCurrentUser(user);
console.assert(!rbac.hasPermission('user.create')); // false
```

---

## 8. File Structure

```
src/
├── lib/
│   ├── paystack.ts              # Paystack integration
│   ├── flutterwave.ts           # Flutterwave integration
│   ├── payment-manager.ts       # Unified payment manager
│   └── rbac.ts                  # Role-based access control
├── app/
│   └── components/
│       ├── PaymentScreen.tsx    # Payment UI
│       ├── Paywall.tsx          # Paywall component
│       └── SettingsScreen.tsx   # Settings with RBAC
└── .env                         # Environment variables
```

---

## 9. Best Practices

1. **Always verify payments** on the backend before granting access
2. **Store payment data** securely with encryption
3. **Implement rate limiting** on payment endpoints
4. **Log all payment transactions** for audit purposes
5. **Use strong permission checks** in sensitive operations
6. **Refresh user permissions** after role changes
7. **Test with sandbox credentials** before going live
8. **Implement proper error handling** for payment failures
9. **Securely store API keys** - never commit to version control
10. **Monitor webhook delivery** and implement retry logic

---

## 10. Support & Resources

- **Paystack Docs**: https://paystack.com/docs
- **Flutterwave Docs**: https://developer.flutterwave.com/docs
- **RBAC Best Practices**: https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html
- **Payment Security**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
