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

/** Allowed values for `rack_active_view` in localStorage. */
export const RACK_ACTIVE_VIEWS = ["editor", "techspecs", "input", "dashboard"];

export function normalizeRackActiveView(v) {
  return RACK_ACTIVE_VIEWS.includes(v) ? v : "input";
}

/**
 * Custom hook that pairs a React state variable with a localStorage slot.
 *
 * - On mount: reads the stored value (JSON); falls back to `initializer`
 *   if nothing is stored or parsing fails (also handles legacy plain strings).
 * - Optional `normalize` maps the loaded value (e.g. validate enums and fall back).
 * - On every change of `value` or `key`: serialises the value back to
 *   localStorage under the current `key`.
 *
 * @param {string}          key         localStorage key (may be dynamic)
 * @param {*|function}      initializer Fallback value or zero-arg factory
 * @param {{ normalize?: (v: unknown) => * }} [options]
 * @returns {[*, function]} [value, setValue] – same API as useState
 */
export function useStorage(key, initializer, options) {
  const normalize = options?.normalize;
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      let parsed;
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = stored;
      }
      if (key === "rack_active_view") return normalizeRackActiveView(parsed);
      return normalize ? normalize(parsed) : parsed;
    }
    return typeof initializer === "function" ? initializer() : initializer;
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignored */ }
  }, [key, value]);

  return [value, setValue];
}
