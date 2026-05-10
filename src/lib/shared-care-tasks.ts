export type CareTaskCategory =
  | 'medication'
  | 'appointment'
  | 'monitoring'
  | 'handoff'
  | 'admin';

export type CareTaskRole = 'parent' | 'caregiver' | 'doctor';
export type CareTaskStatus = 'open' | 'completed';
export type CareTaskPriority = 'routine' | 'soon' | 'urgent';

export interface SharedCareTask {
  id: string;
  babyId: string;
  title: string;
  details?: string;
  category: CareTaskCategory;
  assignedRole: CareTaskRole;
  status: CareTaskStatus;
  priority: CareTaskPriority;
  dueDate?: string | null;
  createdAt: string;
  completedAt?: string | null;
  createdByRole: CareTaskRole;
}

export interface CreateSharedCareTaskInput {
  babyId: string;
  title: string;
  details?: string;
  category?: CareTaskCategory;
  assignedRole?: CareTaskRole;
  priority?: CareTaskPriority;
  dueDate?: string | null;
  createdByRole?: CareTaskRole;
}

type TaskStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'babylog.shared-care-tasks.v1';
const memoryStorage = new Map<string, string>();

const getStorage = (): TaskStorageLike => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key) => {
      memoryStorage.delete(key);
    },
  };
};

const generateTaskId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `care-task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const normalizeTask = (task: SharedCareTask): SharedCareTask => ({
  ...task,
  title: task.title.trim(),
  details: task.details?.trim() || undefined,
  dueDate: task.dueDate || null,
  completedAt: task.completedAt || null,
});

const sortTasks = (tasks: SharedCareTask[]) =>
  tasks.slice().sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'open' ? -1 : 1;
    }

    const leftDue = left.dueDate || '9999-12-31';
    const rightDue = right.dueDate || '9999-12-31';
    if (leftDue !== rightDue) {
      return leftDue.localeCompare(rightDue);
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

const readAllTasks = (): SharedCareTask[] => {
  const raw = getStorage().getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SharedCareTask[];
    if (!Array.isArray(parsed)) return [];
    return sortTasks(parsed.map((task) => normalizeTask(task)));
  } catch {
    return [];
  }
};

const writeAllTasks = (tasks: SharedCareTask[]) => {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(sortTasks(tasks)));
};

export const getAllSharedCareTasks = (): SharedCareTask[] => readAllTasks();

export const getSharedCareTasks = (babyId: string): SharedCareTask[] =>
  readAllTasks().filter((task) => task.babyId === babyId);

export const getSharedCareTasksForBabies = (babyIds: string[]): SharedCareTask[] => {
  const babyIdSet = new Set(babyIds);
  return readAllTasks().filter((task) => babyIdSet.has(task.babyId));
};

export const createSharedCareTask = (
  input: CreateSharedCareTaskInput,
): SharedCareTask => {
  const nextTask: SharedCareTask = normalizeTask({
    id: generateTaskId(),
    babyId: input.babyId,
    title: input.title,
    details: input.details,
    category: input.category || 'monitoring',
    assignedRole: input.assignedRole || 'caregiver',
    status: 'open',
    priority: input.priority || 'routine',
    dueDate: input.dueDate || null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    createdByRole: input.createdByRole || 'parent',
  });

  const tasks = readAllTasks();
  tasks.push(nextTask);
  writeAllTasks(tasks);
  return nextTask;
};

export const updateSharedCareTask = (
  taskId: string,
  updates: Partial<Omit<SharedCareTask, 'id' | 'babyId' | 'createdAt'>>,
): SharedCareTask | null => {
  const tasks = readAllTasks();
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index === -1) return null;

  const current = tasks[index];
  const nextStatus = updates.status ?? current.status;

  const nextTask = normalizeTask({
    ...current,
    ...updates,
    status: nextStatus,
    completedAt:
      nextStatus === 'completed'
        ? updates.completedAt ?? current.completedAt ?? new Date().toISOString()
        : updates.completedAt ?? null,
  });

  tasks[index] = nextTask;
  writeAllTasks(tasks);
  return nextTask;
};

export const deleteSharedCareTask = (taskId: string): boolean => {
  const tasks = readAllTasks();
  const filtered = tasks.filter((task) => task.id !== taskId);
  if (filtered.length === tasks.length) return false;
  writeAllTasks(filtered);
  return true;
};

export const replaceSharedCareTasks = (tasks: SharedCareTask[]) => {
  writeAllTasks(tasks.map((task) => normalizeTask(task)));
};

export const clearSharedCareTasksForTests = () => {
  getStorage().removeItem(STORAGE_KEY);
  memoryStorage.delete(STORAGE_KEY);
};
