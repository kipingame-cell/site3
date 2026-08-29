/* ================= Хранилище (по устройству, отдельно для каждого режима) ================= */

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* приватный режим — просто не запоминаем */ } },
};

export const dateKey = (mode) => (mode === 'compat' ? 'dm_d1_compat' : 'dm_d1_single');
