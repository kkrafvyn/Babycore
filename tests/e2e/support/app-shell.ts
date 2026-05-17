import type { Page, Route } from '@playwright/test';

export const TEST_BABY = {
  id: 'playwright-baby',
  name: 'Avery',
  dateOfBirth: '2024-06-15T08:00:00.000Z',
  gender: 'girl',
  country: 'US',
  ageGroup: 'infant',
  createdAt: '2026-05-17T12:00:00.000Z',
} as const;

const DB_NAME = 'babylog';
const DB_VERSION = 5;
const GUEST_SESSION_KEY = 'babylog_guest_session';
const MOBILE_SPLASH_SESSION_KEY = 'babylog_mobile_splash_seen';

const fulfillJson = async (route: Route, payload: unknown, status = 200): Promise<void> => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
};

export const stubGuestAppNetwork = async (page: Page): Promise<void> => {
  await page.route('**/rest/v1/**', async (route) => {
    await fulfillJson(
      route,
      {
        code: '42501',
        message: 'permission denied',
      },
      401,
    );
  });

  await page.route('**/storage/v1/**', async (route) => {
    await fulfillJson(route, { message: 'storage unavailable during local smoke tests' }, 401);
  });

  await page.route('**/api/payments/config', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        paymentCollection: {
          enabled: false,
          reason: 'Playwright smoke test mode',
          source: 'database',
          updatedAt: '2026-05-17T12:00:00.000Z',
        },
        premiumAccess: {
          enabled: false,
          reason: 'Playwright smoke test mode',
          source: 'database',
          updatedAt: '2026-05-17T12:00:00.000Z',
        },
      },
    });
  });
};

export const primeGuestApp = async (page: Page): Promise<void> => {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.location.pathname === '/login');

  await page.evaluate(
    async ({ dbName, dbVersion, guestSessionKey, splashSessionKey, baby }) => {
      const waitForRequest = <T>(request: IDBRequest<T>) =>
        new Promise<T>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

      const deleteDb = () =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        });

      const createStoreWithIndex = (
        database: IDBDatabase,
        transaction: IDBTransaction,
        storeName: string,
        indexes: Array<[string, string]>,
      ) => {
        const store = database.objectStoreNames.contains(storeName)
          ? transaction.objectStore(storeName)
          : database.createObjectStore(storeName, { keyPath: 'id' });

        for (const [indexName, keyPath] of indexes) {
          if (!store.indexNames.contains(indexName)) {
            store.createIndex(indexName, keyPath, { unique: false });
          }
        }
      };

      localStorage.setItem(guestSessionKey, 'true');
      sessionStorage.setItem(splashSessionKey, 'true');

      await deleteDb();

      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          const nextDatabase = request.result;
          const upgradeTransaction = request.transaction;
          if (!upgradeTransaction) {
            reject(new Error('Missing IndexedDB upgrade transaction.'));
            return;
          }

          createStoreWithIndex(nextDatabase, upgradeTransaction, 'babies', [['ownerScopeId', 'ownerScopeId']]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'sleep_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'startTime'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'feed_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'diaper_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'growth_measurements', [
            ['babyId', 'babyId'],
            ['date', 'date'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'vaccination_records', [
            ['babyId', 'babyId'],
            ['dueDate', 'dueDate'],
          ]);

          if (!nextDatabase.objectStoreNames.contains('user_settings')) {
            nextDatabase.createObjectStore('user_settings', { keyPath: 'userId' });
          }

          createStoreWithIndex(nextDatabase, upgradeTransaction, 'milestones', [
            ['babyId', 'babyId'],
            ['date', 'date'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'memories', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'health_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'journal_entries', [
            ['babyId', 'babyId'],
            ['date', 'date'],
          ]);
          createStoreWithIndex(nextDatabase, upgradeTransaction, 'achievements', [['babyId', 'babyId']]);
        };

        request.onsuccess = () => resolve(request.result);
      });

      const transaction = database.transaction(['babies'], 'readwrite');
      const store = transaction.objectStore('babies');
      await waitForRequest(
        store.put({
          ...baby,
          ownerScopeId: 'guest',
        }),
      );

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });

      database.close();
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      guestSessionKey: GUEST_SESSION_KEY,
      splashSessionKey: MOBILE_SPLASH_SESSION_KEY,
      baby: TEST_BABY,
    },
  );

  await page.reload({ waitUntil: 'networkidle' });
};
