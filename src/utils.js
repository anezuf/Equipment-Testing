export const fmt=(v)=>{if(v==null)return "—";return v%1===0?v.toFixed(0):v.toFixed(1);};

/** Editor weights map: only 0 | 1 | 2 values kept (same rules as loadSaved weights). */
export function sanitizeEditorWeightsMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.entries(raw).reduce((acc, [key, value]) => {
    if (value === 0 || value === 1 || value === 2) acc[key] = value;
    return acc;
  }, {});
}

export function downloadJsonFile(filename, data) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
