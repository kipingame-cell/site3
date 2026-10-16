/* ================= Хранилище (по устройству, отдельно для каждого режима) ================= */

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};

export const dateKey = (mode) => (mode === 'compat' ? 'dm_d1_compat' : 'dm_d1_single');

