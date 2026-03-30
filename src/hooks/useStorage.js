import { useState, useEffect } from "react";

/**
 * Reads a JSON value from localStorage.
 * Returns null if the key is missing or the value cannot be parsed.
 */
export function loadSaved(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/**
 * Custom hook that pairs a React state variable with a localStorage slot.
 *
 * - On mount: reads the stored value (JSON); falls back to `initializer`
 *   if nothing is stored or parsing fails (also handles legacy plain strings).
 * - On every change of `value` or `key`: serialises the value back to
 *   localStorage under the current `key`.
 *
 * @param {string}          key         localStorage key (may be dynamic)
 * @param {*|function}      initializer Fallback value or zero-arg factory
 * @returns {[*, function]} [value, setValue] – same API as useState
 */
export function useStorage(key, initializer) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try { return JSON.parse(stored); } catch { return stored; }
    }
    return typeof initializer === "function" ? initializer() : initializer;
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}
