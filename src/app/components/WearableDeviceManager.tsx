import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Activity, Trash2, Plus, Heart, Zap, Thermometer, Footprints } from 'lucide-react';
import {
  connectAppleHealth,
  connectFitbit,
  disconnectWearable,
  getConnectedWearables,
  getWearableData,
  WearableData,
} from '@/lib/wearable-service';
import { useAuthStore } from '@/app/AppContext';

interface WearableDeviceManagerProps {
  babyId: string;
  babyName: string;
}

export function WearableDeviceManager({ babyId, babyName }: WearableDeviceManagerProps) {
  const { user } = useAuthStore();
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);
  const [wearableData, setWearableData] = useState<WearableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadConnectedDevices();
    loadWearableData();
  }, [babyId, user?.id]);

  const loadConnectedDevices = async () => {
    if (!user?.id) {
      setConnectedDevices([]);
      return;
    }

    const devices = await getConnectedWearables(user.id);
    setConnectedDevices(devices);
  };

  const loadWearableData = async () => {
    setLoading(true);
    const data = await getWearableData(babyId);
    setWearableData(data);
    setLoading(false);
  };

  const handleConnectAppleHealth = async () => {
    if (!user?.id) return;

    setConnecting('apple');
    const device = await connectAppleHealth(user.id);
    if (device) {
      setConnectedDevices([...connectedDevices, device]);
      await loadWearableData();
    }
    setConnecting(null);
  };

  const handleConnectFitbit = async () => {
    if (!user?.id) return;

    setConnecting('fitbit');
    const device = await connectFitbit(user.id, 'manual-connect');
    if (device) {
      setConnectedDevices([...connectedDevices, device]);
      await loadWearableData();
    }
    setConnecting(null);
  };

  const handleDisconnect = async (deviceId: string) => {
    if (!user?.id) return;

    if (!confirm('Disconnect this device?')) return;

    setLoading(true);
    const device = connectedDevices.find((entry) => entry.id === deviceId);
    const success = device ? await disconnectWearable(user.id, device.device_type) : false;
    if (success) {
      setConnectedDevices(connectedDevices.filter((d) => d.id !== deviceId));
      await loadWearableData();
    }
    setLoading(false);
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'heart_rate':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'steps':
        return <Footprints className="h-4 w-4 text-blue-500" />;
      case 'temperature':
        return <Thermometer className="h-4 w-4 text-orange-500" />;
      case 'calories':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getMetricLabel = (metric: string) => {
    return metric
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  if (loading) {
    return <div className="text-center py-8">Loading wearable data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Wearable Devices
        </CardTitle>
        <CardDescription>Connect and manage health tracking devices for {babyName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="devices">Devices ({connectedDevices.length})</TabsTrigger>
            <TabsTrigger value="data">Health Data</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-3">
            {connectedDevices.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  No devices connected yet
                </p>
              </div>
            ) : (
              connectedDevices.map((device) => (
                <Card key={device.id} className="border">
                  <CardContent className="pt-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{device.device_type}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Connected: {new Date(device.connected_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnect(device.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <Button
                onClick={handleConnectAppleHealth}
                disabled={connecting === 'apple'}
                variant="outline"
                className="text-xs h-9"
              >
                <Plus className="h-3 w-3 mr-1" />
                Apple Health
              </Button>
              <Button
                onClick={handleConnectFitbit}
                disabled={connecting === 'fitbit'}
                variant="outline"
                className="text-xs h-9"
              >
                <Plus className="h-3 w-3 mr-1" />
                Fitbit
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-2">
            {wearableData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No data available yet. Connect a device and sync data.
              </p>
            ) : (
              <div className="space-y-2">
                {wearableData.slice(0, 10).map((data) => (
                  <Card key={data.id} className="border">
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMetricIcon(data.data_type)}
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">
                              {getMetricLabel(data.data_type)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(data.recorded_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-bold">{data.value}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
