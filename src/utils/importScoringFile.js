import * as XLSX from "xlsx";
import { mkAll } from "../sections";
import { normalizeProductionCapacityStored } from "../utils";

function normalizeArrayLength(source, itemCount, fallbackValue) {
  const arr = Array.isArray(source) ? source : [];
  if (arr.length >= itemCount) return arr.slice(0, itemCount);
  return [...arr, ...Array(itemCount - arr.length).fill(fallbackValue)];
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        resolve(JSON.parse(ev.target.result));
      } catch {
        reject(new Error("Ошибка чтения JSON"));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения JSON"));
    reader.readAsText(file);
  });
}

export async function importScoringFile({ file, sections, vendorsLength, itemCount, setVendors, setAct, setView }) {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    try {
      const d = await readJsonFile(file);
      if (d.vendors && Array.isArray(d.vendors)) {
        setVendors(
          d.vendors.map((v) => ({
            ...v,
            scores: normalizeArrayLength(v.scores, itemCount, null).map((score) => (score === 0 || score === 1 || score === 2 ? score : null)),
            notes: normalizeArrayLength(v.notes, itemCount, "").map((note) => String(note ?? "")),
            images: normalizeArrayLength(v.images, itemCount, null),
            productionRating: v?.productionRating ?? null,
            productionVerdict: v?.productionVerdict ?? null,
            productionCapacity: normalizeProductionCapacityStored(v?.productionCapacity),
          }))
        );
      }
      setAct(0);
      setView("input");
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const wsName = wb.SheetNames.find((n) => n === "Оценка") || wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const norm = (val) => String(val ?? "").trim().toLowerCase();

    const a1 = String(data?.[0]?.[0] ?? "").trim();
    const vendorHdr = data?.[3] ?? [];
    const isVendorForm =
      a1.includes(" - ") &&
      norm(vendorHdr[0]) === "№ п. ту" &&
      norm(vendorHdr[1]) === "параметр" &&
      norm(vendorHdr[3]) === "оценка (0/1/2)" &&
      norm(vendorHdr[4]) === "примечание";

    if (isVendorForm) {
      const allItems = mkAll(sections);
      const itemIndexByName = new Map();
      allItems.forEach((it, idx) => {
        const key = norm(it.n);
        if (key && !itemIndexByName.has(key)) itemIndexByName.set(key, idx);
      });

      const vendorNameRaw = a1.split(" - ").slice(1).join(" - ").trim();
      const vendorName = vendorNameRaw || `Вендор ${vendorsLength + 1}`;
      const scores = Array(itemCount).fill(null);
      const notes = Array(itemCount).fill("");
      const images = Array(itemCount).fill(null);
      let matchedCount = 0;

      for (let r = 4; r < data.length; r += 1) {
        const row = Array.isArray(data[r]) ? data[r] : [];
        const colA = row[0];
        const colBRaw = row[1];
        const colB = String(colBRaw ?? "").trim();

        if (typeof colA === "string" && colA.trim() !== "" && colB === "") continue;

        const aNum = Number(colA);
        if (!Number.isFinite(aNum) || String(colA ?? "").trim() === "") continue;
        if (!colB) continue;

        const itemIdx = itemIndexByName.get(norm(colB));
        if (itemIdx == null) continue;

        const rawScore = row[3];
        if (rawScore === "" || rawScore == null) {
          scores[itemIdx] = null;
        } else {
          const num = Number(rawScore);
          scores[itemIdx] = num === 0 || num === 1 || num === 2 ? num : null;
        }

        const noteText = String(row[4] ?? "").trim();
        if (noteText) notes[itemIdx] = noteText;
        matchedCount += 1;
      }

      const newVendor = {
        name: vendorName,
        scores,
        notes,
        images,
        productionRating: null,
        productionVerdict: null,
        productionCapacity: "0",
      };
      setVendors((prev) => [...prev, newVendor]);
      setAct(vendorsLength);
      setView("input");
      if (matchedCount === 0) {
        alert("Не найдено совпадений параметров для импорта формы вендора");
      }
      return;
    }

    const hdr = data[1] || [];
    const vendorCols = [];
    for (let c = 3; c < hdr.length; c += 2) {
      const name = String(hdr[c] || "").trim();
      if (name) vendorCols.push({ name, scoreCol: c, noteCol: c + 1 });
    }
    if (vendorCols.length === 0) {
      alert("Не найдены колонки вендоров");
      return;
    }

    const newSections = [];
    let curSec = null;
    for (let r = 2; r < data.length; r += 1) {
      const row = data[r];
      if (!row || row.every((c) => c === "" || c == null)) continue;
      const colA = row[0];
      const colB = String(row[1] || "").trim();
      const aNum = Number(colA);

      if (colA && Number.isNaN(aNum) && colB === "") {
        curSec = { n: String(colA).trim(), items: [] };
        newSections.push(curSec);
        continue;
      }

      if (!Number.isNaN(aNum) && aNum > 0) {
        const colC = String(row[2] || "").toUpperCase();
        const w = colC.includes("ПП") || colC.includes("!") ? 2 : colC.includes("ОП") || colC.includes("★") ? 1 : 0;
        if (!curSec) {
          curSec = { n: "Раздел", items: [] };
          newSections.push(curSec);
        }
        curSec.items.push({ n: String(row[1] || "").trim(), w });
      }
    }

    if (newSections.length === 0 || newSections.every((s) => s.items.length === 0)) {
      alert("Не удалось распознать структуру файла");
      return;
    }

    const totalItems = newSections.reduce((a, s) => a + s.items.length, 0);
    const newVendors = vendorCols.map((vn) => {
      const scores = Array(totalItems).fill(null);
      const notes = Array(totalItems).fill("");
      const images = Array(totalItems).fill(null);
      let idx = 0;

      for (let r = 2; r < data.length; r += 1) {
        const row = data[r];
        if (!row) continue;
        const aNum = Number(row[0]);
        if (Number.isNaN(aNum) || aNum <= 0) continue;
        if (idx >= totalItems) break;

        const rawScore = row[vn.scoreCol];
        if (rawScore != null && rawScore !== "") {
          const num = Number(rawScore);
          if (!Number.isNaN(num) && num >= 0 && num <= 2) scores[idx] = num;
        }

        const rawNote = String(row[vn.noteCol] || "").trim();
        if (rawNote) notes[idx] = rawNote;
        idx += 1;
      }

      return {
        name: vn.name,
        scores,
        notes,
        images,
        productionRating: null,
        productionVerdict: null,
        productionCapacity: "0",
      };
    });

    setVendors(newVendors);
    setAct(0);
    setView("input");
  } catch (err) {
    console.error(err);
    alert(`Ошибка чтения Excel: ${err.message}`);
  }
}
