import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Lock, Plus } from 'lucide-react';
import {
  getAvailableAddons,
  getUserAddonSubscriptions,
  subscribeToAddon,
  SubscriptionAddon,
  UserAddonSubscription,
} from '@/lib/subscription-service';
import { useAuthStore } from '@/app/AppContext';

export function SubscriptionAddons() {
  const { user } = useAuthStore();
  const [addons, setAddons] = useState<SubscriptionAddon[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserAddonSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadAddons = async () => {
      setLoading(true);
      const [availableAddons, subscriptions] = await Promise.all([
        getAvailableAddons(),
        getUserAddonSubscriptions(user.id),
      ]);

      setAddons(availableAddons);
      setUserSubscriptions(subscriptions);
      setLoading(false);
    };

    loadAddons();
  }, [user?.id]);

  const handleSubscribe = async (addonId: string) => {
    if (!user?.id) return;

    setSubscribing(addonId);
    const subscription = await subscribeToAddon(user.id, addonId);

    if (subscription) {
      setUserSubscriptions([...userSubscriptions, subscription]);
    }

    setSubscribing(null);
  };

  const isSubscribed = (addonId: string) => {
    return userSubscriptions.some((sub) => sub.addon_id === addonId && sub.is_active);
  };

  const getAddonIcon = (type: string) => {
    switch (type) {
      case 'content_course':
        return '🎓';
      case 'consultant_chat':
        return '💬';
      case 'doctor_qa':
        return '👨‍⚕️';
      case 'premium_reports':
        return '📊';
      default:
        return '⭐';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading add-ons...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Premium Add-Ons
          </CardTitle>
          <CardDescription>Enhance your BabyLog experience with premium features</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {addons.map((addon) => {
          const subscribed = isSubscribed(addon.id);

          return (
            <Card
              key={addon.id}
              className={`${subscribed ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10' : ''}`}
            >
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <span className="text-xl">{getAddonIcon(addon.addon_type)}</span>
                        {addon.addon_name}
                      </h3>
                      {subscribed && <Badge className="bg-green-500">Active</Badge>}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">{addon.description}</p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm font-semibold">
                      ${addon.price.toFixed(2)} {addon.currency}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSubscribe(addon.id)}
                      disabled={subscribed || subscribing === addon.id}
                      variant={subscribed ? 'outline' : 'default'}
                    >
                      {subscribed ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Subscribed
                        </>
                      ) : subscribing === addon.id ? (
                        'Processing...'
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Subscribe
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {addons.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500">No add-ons available at the moment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
