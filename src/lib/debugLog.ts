export type DebugLogEntry = {
  t: number;
  msg: string;
  data?: any;
};

const MAX = 200;

function getStore(): DebugLogEntry[] {
  const w = globalThis as any;
  if (!w.__SANSU_LOGS__) w.__SANSU_LOGS__ = [];
  return w.__SANSU_LOGS__ as DebugLogEntry[];
}

export function debugLog(msg: string, data?: any) {
  const entry: DebugLogEntry = { t: Date.now(), msg, data };
  try {
    // Keep console logging minimal; still useful for debugging "page unresponsive".
    // eslint-disable-next-line no-console
    console.log('[SANSU]', msg, data ?? '');
  } catch {
    // ignore
  }
  const store = getStore();
  store.push(entry);
  while (store.length > MAX) store.shift();
}

export function getDebugLogs(): DebugLogEntry[] {
  return getStore();
}
