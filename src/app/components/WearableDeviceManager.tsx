import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Activity,
  Download,
  Footprints,
  Heart,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Thermometer,
  Trash2,
  Upload,
  Watch,
  Zap,
} from 'lucide-react';
import {
  addWearableDataManually,
  connectWearableSource,
  disconnectWearable,
  getConnectedWearables,
  getWearableData,
  importNativeWearableData,
  importWearableDataEntries,
  type WearableData,
  type WearableDataInput,
  type WearableDataType,
  type WearableDeviceType,
  type WearableIntegration,
} from '@/lib/wearable-service';
import {
  isNativeWearablesSupported,
  requestNativeWearablePermissions,
  type NativeWearablesAvailability,
} from '@/lib/native-wearables';
import { useAuthStore } from '@/app/AppContext';
import { toast } from 'sonner';

interface WearableDeviceManagerProps {
  babyId: string;
  babyName: string;
}

const DEVICE_OPTIONS: Array<{ type: WearableDeviceType; label: string; description: string }> = [
  { type: 'apple_health', label: 'Apple Health', description: 'Sync from iPhone HealthKit or import exports' },
  { type: 'health_connect', label: 'Health Connect', description: 'Sync from Android Health Connect or import exports' },
  { type: 'fitbit', label: 'Fitbit', description: 'Import Fitbit exports or copied readings' },
  { type: 'oura_ring', label: 'Oura', description: 'Track sleep and recovery exports' },
  { type: 'garmin', label: 'Garmin', description: 'Track activity and heart-rate exports' },
];

const DATA_TYPE_OPTIONS: Array<{ value: WearableDataType; label: string; defaultUnit: string }> = [
  { value: 'heart_rate', label: 'Heart Rate', defaultUnit: 'bpm' },
  { value: 'temperature', label: 'Temperature', defaultUnit: 'C' },
  { value: 'activity', label: 'Activity', defaultUnit: 'minutes' },
  { value: 'sleep', label: 'Sleep', defaultUnit: 'hours' },
  { value: 'steps', label: 'Steps', defaultUnit: 'steps' },
];

const SOURCE_OPTIONS = ['manual', ...DEVICE_OPTIONS.map((option) => option.type)];
const APPLE_HEALTH_PERMISSION_COPY =
  "BabyLog requests read-only access to heart rate, steps, sleep sessions, exercise duration, and body temperature from Apple Health so you can import caregiver-approved health trends into your baby's timeline, reminders, and summaries. You can stop using Apple Health at any time by disconnecting the source in Wearables.";
const HEALTH_CONNECT_PERMISSION_COPY =
  "BabyLog requests read-only access to heart rate, steps, sleep, exercise duration, and body temperature from Android Health Connect. We use these readings only to import caregiver-approved health trends into your baby's timeline, reminders, and summaries. You can stop using Health Connect at any time by disconnecting the source in Wearables.";
const WEARABLE_HEALTH_FIELDS = [
  'heart rate',
  'steps',
  'sleep sessions',
  'exercise duration',
  'body temperature',
] as const;

const defaultUnitForType = (type: WearableDataType): string =>
  DATA_TYPE_OPTIONS.find((option) => option.value === type)?.defaultUnit || '';

const formatDeviceLabel = (deviceType: WearableDeviceType): string =>
  DEVICE_OPTIONS.find((option) => option.type === deviceType)?.label ||
  deviceType.replace(/_/g, ' ');

const normalizeDataType = (raw: unknown): WearableDataType | null => {
  const normalized = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'heart':
    case 'heart_rate':
    case 'heartrate':
    case 'pulse':
      return 'heart_rate';
    case 'temp':
    case 'temperature':
      return 'temperature';
    case 'activity':
    case 'active_minutes':
    case 'movement':
      return 'activity';
    case 'sleep':
    case 'sleep_duration':
      return 'sleep';
    case 'steps':
    case 'step_count':
      return 'steps';
    default:
      return null;
  }
};

const parseCsvRow = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const inferSourceFromFileName = (fileName: string): string => {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('apple')) return 'apple_health';
  if (normalized.includes('healthconnect') || (normalized.includes('health') && normalized.includes('connect'))) {
    return 'health_connect';
  }
  if (normalized.includes('fitbit')) return 'fitbit';
  if (normalized.includes('oura')) return 'oura_ring';
  if (normalized.includes('garmin')) return 'garmin';
  return 'import';
};

const normalizeImportedEntry = (
  record: Record<string, unknown>,
  fallbackSource: string,
): WearableDataInput | null => {
  const dataType = normalizeDataType(
    record.data_type ?? record.dataType ?? record.type ?? record.metric,
  );
  const numericValue = Number(record.value ?? record.amount ?? record.reading);
  const recordedAt = String(
    record.recorded_at ?? record.recordedAt ?? record.timestamp ?? record.date ?? '',
  ).trim();

  if (!dataType || !Number.isFinite(numericValue) || !recordedAt) {
    return null;
  }

  const source = String(record.source ?? record.device ?? record.device_type ?? fallbackSource).trim() || fallbackSource;
  const unit = String(record.unit ?? defaultUnitForType(dataType)).trim() || defaultUnitForType(dataType);

  return {
    dataType,
    value: numericValue,
    unit,
    recordedAt,
    source,
  };
};

const parseWearableImportText = (text: string, fileName: string): WearableDataInput[] => {
  const fallbackSource = inferSourceFromFileName(fileName);
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.entries)
        ? parsed.entries
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [];

    return items
      .map((item: unknown) => normalizeImportedEntry(item as Record<string, unknown>, fallbackSource))
      .filter(Boolean) as WearableDataInput[];
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvRow(lines[0]).map((header) =>
    header.trim().toLowerCase().replace(/\s+/g, '_'),
  );

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvRow(line);
      const record = headers.reduce<Record<string, unknown>>((acc, header, index) => {
        acc[header] = values[index] ?? '';
        return acc;
      }, {});
      return normalizeImportedEntry(record, fallbackSource);
    })
    .filter(Boolean) as WearableDataInput[];
};

export function WearableDeviceManager({ babyId, babyName }: WearableDeviceManagerProps) {
  const { user } = useAuthStore();
  const [connectedDevices, setConnectedDevices] = useState<WearableIntegration[]>([]);
  const [wearableData, setWearableData] = useState<WearableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<WearableDeviceType | null>(null);
  const [savingManual, setSavingManual] = useState(false);
  const [importing, setImporting] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<NativeWearablesAvailability>({
    available: false,
    source: null,
    reason: null,
  });
  const [syncingNative, setSyncingNative] = useState(false);
  const [manualType, setManualType] = useState<WearableDataType>('heart_rate');
  const [manualValue, setManualValue] = useState('');
  const [manualUnit, setManualUnit] = useState(defaultUnitForType('heart_rate'));
  const [manualSource, setManualSource] = useState<string>('manual');
  const [manualRecordedAt, setManualRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadConnectedDevices();
  }, [user?.id]);

  useEffect(() => {
    void loadWearableData();
  }, [babyId]);

  useEffect(() => {
    void loadNativeStatus();
  }, []);

  const connectedTypes = useMemo(
    () => new Set(connectedDevices.map((device) => device.device_type)),
    [connectedDevices],
  );
  const activeNativeHealthSource = nativeStatus.source === 'apple_health' || nativeStatus.source === 'health_connect'
    ? nativeStatus.source
    : connectedTypes.has('apple_health')
      ? 'apple_health'
      : connectedTypes.has('health_connect')
        ? 'health_connect'
        : null;
  const activeNativeHealthPermissionCopy =
    activeNativeHealthSource === 'apple_health'
      ? APPLE_HEALTH_PERMISSION_COPY
      : activeNativeHealthSource === 'health_connect'
        ? HEALTH_CONNECT_PERMISSION_COPY
        : null;

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
    const data = await getWearableData(babyId, undefined, 30);
    setWearableData(data);
    setLoading(false);
  };

  const loadNativeStatus = async () => {
    const status = await isNativeWearablesSupported();
    setNativeStatus(status);
    if (status.available && status.source) {
      setManualSource(status.source);
    }
  };

  const handleConnectSource = async (deviceType: WearableDeviceType) => {
    if (!user?.id) return;

    setConnecting(deviceType);
    const device = await connectWearableSource(user.id, deviceType);
    setConnecting(null);

    if (!device) {
      toast.error('Unable to save wearable source.');
      return;
    }

    setConnectedDevices((prev) => [
      device,
      ...prev.filter((entry) => entry.device_type !== device.device_type),
    ]);
    setManualSource(deviceType);
    const syncLabel =
      deviceType === 'apple_health' || deviceType === 'health_connect'
        ? 'native sync or import'
        : 'manual import';
    toast.success(`${formatDeviceLabel(deviceType)} is ready for ${syncLabel}.`);
  };

  const handleNativeSync = async () => {
    if (!user?.id || !nativeStatus.source) {
      toast.error('Native wearable sync is not available on this device.');
      return;
    }

    setSyncingNative(true);
    if (nativeStatus.source === 'apple_health' || nativeStatus.source === 'health_connect') {
      const permissionCopy =
        nativeStatus.source === 'apple_health' ? APPLE_HEALTH_PERMISSION_COPY : HEALTH_CONNECT_PERMISSION_COPY;
      const destinationLabel =
        nativeStatus.source === 'apple_health' ? 'Apple Health' : 'Android Health Connect';
      const accepted = window.confirm(`${permissionCopy}\n\nContinue to ${destinationLabel} permissions?`);
      if (!accepted) {
        setSyncingNative(false);
        return;
      }
    }

    const permission = await requestNativeWearablePermissions();
    if (!permission.granted) {
      setSyncingNative(false);
      toast.error(permission.reason || 'Wearable permissions were not granted.');
      return;
    }

    await handleConnectSource(nativeStatus.source as WearableDeviceType);

    const result = await importNativeWearableData(
      babyId,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    );
    setSyncingNative(false);

    if (!result.imported.length) {
      toast.message('No new wearable samples were found yet.');
      return;
    }

    setWearableData((prev) =>
      [...result.imported, ...prev].sort(
        (left, right) => new Date(right.recorded_at).getTime() - new Date(left.recorded_at).getTime(),
      ),
    );
    if (result.source) {
      setManualSource(result.source);
    }

    toast.success(
      `Imported ${result.imported.length} readings from ${formatDeviceLabel((result.source || nativeStatus.source) as WearableDeviceType)}.`,
    );
  };

  const handleDisconnect = async (deviceType: WearableDeviceType) => {
    if (!user?.id) return;
    if (!confirm(`Disconnect ${formatDeviceLabel(deviceType)}?`)) return;

    setLoading(true);
    const success = await disconnectWearable(user.id, deviceType);
    setLoading(false);

    if (!success) {
      toast.error('Unable to disconnect source.');
      return;
    }

    setConnectedDevices((prev) => prev.filter((entry) => entry.device_type !== deviceType));
    if (manualSource === deviceType) {
      setManualSource('manual');
    }
    toast.success(`${formatDeviceLabel(deviceType)} disconnected.`);
  };

  const handleManualTypeChange = (value: WearableDataType) => {
    setManualType(value);
    setManualUnit(defaultUnitForType(value));
  };

  const handleSaveManualEntry = async () => {
    const numericValue = Number(manualValue);
    if (!Number.isFinite(numericValue)) {
      toast.error('Enter a valid number first.');
      return;
    }

    setSavingManual(true);
    const entry = await addWearableDataManually(
      babyId,
      manualType,
      numericValue,
      manualUnit.trim() || defaultUnitForType(manualType),
      manualRecordedAt,
      manualSource,
    );
    setSavingManual(false);

    if (!entry) {
      toast.error('Unable to save wearable metric.');
      return;
    }

    setWearableData((prev) => [entry, ...prev]);
    setManualValue('');
    toast.success('Wearable metric saved.');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const parsedEntries = parseWearableImportText(text, file.name);
      if (!parsedEntries.length) {
        toast.error('No usable rows found. Use CSV or JSON with data_type, value, unit, and recorded_at.');
        return;
      }

      const imported = await importWearableDataEntries(babyId, parsedEntries);
      if (!imported.length) {
        toast.error('Import failed.');
        return;
      }

      setWearableData((prev) =>
        [...imported, ...prev].sort(
          (left, right) => new Date(right.recorded_at).getTime() - new Date(left.recorded_at).getTime(),
        ),
      );

      const inferredSource = inferSourceFromFileName(file.name);
      if (user?.id && inferredSource !== 'import' && SOURCE_OPTIONS.includes(inferredSource)) {
        await handleConnectSource(inferredSource as WearableDeviceType);
      }

      toast.success(`Imported ${imported.length} wearable readings.`);
    } catch (error) {
      console.error('Wearable import failed:', error);
      toast.error('Import failed. Check the file format and try again.');
    } finally {
      setImporting(false);
    }
  };

  const getMetricIcon = (metric: WearableDataType) => {
    switch (metric) {
      case 'heart_rate':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'steps':
        return <Footprints className="h-4 w-4 text-blue-500" />;
      case 'temperature':
        return <Thermometer className="h-4 w-4 text-orange-500" />;
      case 'activity':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-violet-500" />;
    }
  };

  const getMetricLabel = (metric: WearableDataType) =>
    DATA_TYPE_OPTIONS.find((option) => option.value === metric)?.label ||
    metric.replace(/_/g, ' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Watch className="h-5 w-5" />
          Wearables
        </CardTitle>
        <CardDescription>
          No vendor API keys needed. Add a source, import CSV/JSON exports, or log health metrics manually for {babyName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,application/json,text/csv"
          className="hidden"
          onChange={handleImportFile}
        />

        <Tabs defaultValue="sources" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sources">Sources ({connectedDevices.length})</TabsTrigger>
            <TabsTrigger value="data">Health Data</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-3">
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Import a phone or wearable export with headers like <code>data_type,value,unit,recorded_at,source</code>.
                </p>
                <div className="flex flex-wrap gap-2">
                  {nativeStatus.available && nativeStatus.source ? (
                    <Button onClick={handleNativeSync} disabled={syncingNative} className="h-9 text-xs">
                      <Smartphone className="mr-2 h-3.5 w-3.5" />
                      {syncingNative
                        ? 'Syncing device...'
                        : `Sync ${formatDeviceLabel(nativeStatus.source as WearableDeviceType)}`}
                    </Button>
                  ) : null}
                  <Button onClick={handleImportClick} disabled={importing} className="h-9 text-xs">
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {importing ? 'Importing...' : 'Import CSV or JSON'}
                  </Button>
                  <div className="inline-flex items-center rounded-full border px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Apple Health, Health Connect, Fitbit, Oura, Garmin, or manual exports
                  </div>
                  {!nativeStatus.available && nativeStatus.reason ? (
                    <div className="inline-flex items-center rounded-full border px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      {nativeStatus.reason}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {activeNativeHealthPermissionCopy && activeNativeHealthSource ? (
              <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/20">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                        {formatDeviceLabel(activeNativeHealthSource as WearableDeviceType)} access
                      </div>
                      <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                        {activeNativeHealthPermissionCopy}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                        {WEARABLE_HEALTH_FIELDS.map((field) => (
                          <span
                            key={field}
                            className="rounded-full border border-amber-300/80 bg-white/80 px-2.5 py-1 dark:border-amber-700 dark:bg-amber-950/30"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {connectedDevices.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-gray-600 dark:text-gray-400">
                No sources saved yet. Choose one below so imports and manual entries are labeled clearly.
              </div>
            ) : (
              connectedDevices.map((device) => (
                <Card key={device.id} className="border">
                  <CardContent className="pt-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{formatDeviceLabel(device.device_type)}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Added {new Date(device.created_at || device.updated_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnect(device.device_type)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            <div className="grid grid-cols-1 gap-2 pt-3 border-t sm:grid-cols-2">
              {DEVICE_OPTIONS.map((option) => (
                <Button
                  key={option.type}
                  onClick={() => handleConnectSource(option.type)}
                  disabled={connecting === option.type}
                  variant={connectedTypes.has(option.type) ? 'secondary' : 'outline'}
                  className="h-auto items-start justify-start px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {connecting === option.type ? 'Saving...' : option.label}
                    </div>
                    <div className="text-[11px] font-normal opacity-80">{option.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card className="border">
              <CardContent className="pt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">Add a manual reading</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Use this when you want Health Sync without third-party APIs.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold">
                    Metric
                    <select
                      value={manualType}
                      onChange={(event) => handleManualTypeChange(event.target.value as WearableDataType)}
                      className="h-10 w-full rounded-xl border border-border-gray bg-background px-3 text-sm font-medium"
                    >
                      {DATA_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-xs font-semibold">
                    Source
                    <select
                      value={manualSource}
                      onChange={(event) => setManualSource(event.target.value)}
                      className="h-10 w-full rounded-xl border border-border-gray bg-background px-3 text-sm font-medium"
                    >
                      {SOURCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option === 'manual' ? 'Manual entry' : formatDeviceLabel(option as WearableDeviceType)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-xs font-semibold">
                    Value
                    <input
                      type="number"
                      step="0.01"
                      value={manualValue}
                      onChange={(event) => setManualValue(event.target.value)}
                      className="h-10 w-full rounded-xl border border-border-gray bg-background px-3 text-sm font-medium"
                      placeholder="Enter a value"
                    />
                  </label>

                  <label className="space-y-1 text-xs font-semibold">
                    Unit
                    <input
                      value={manualUnit}
                      onChange={(event) => setManualUnit(event.target.value)}
                      className="h-10 w-full rounded-xl border border-border-gray bg-background px-3 text-sm font-medium"
                      placeholder="bpm / hours / steps"
                    />
                  </label>

                  <label className="space-y-1 text-xs font-semibold sm:col-span-2">
                    Recorded at
                    <input
                      type="datetime-local"
                      value={manualRecordedAt}
                      onChange={(event) => setManualRecordedAt(event.target.value)}
                      className="h-10 w-full rounded-xl border border-border-gray bg-background px-3 text-sm font-medium"
                    />
                  </label>
                </div>

                <Button onClick={handleSaveManualEntry} disabled={savingManual} className="h-10 text-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {savingManual ? 'Saving...' : 'Save reading'}
                </Button>
              </CardContent>
            </Card>

            {loading ? (
              <div className="text-center py-8">Loading wearable data...</div>
            ) : wearableData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No data yet. Import an export file or add a reading manually.
              </p>
            ) : (
              <div className="space-y-2">
                {wearableData.slice(0, 20).map((data) => (
                  <Card key={data.id} className="border">
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {getMetricIcon(data.data_type)}
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">
                              {getMetricLabel(data.data_type)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(data.recorded_at).toLocaleString()} | {data.source}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{data.value}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{data.unit}</div>
                        </div>
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

