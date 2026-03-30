import * as XLSX from "xlsx";
import { normalizeTechSpecs } from "../data/techSpecs";

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

export async function importTechSpecsFile({ file, setTechSpecs }) {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    try {
      const d = await readJsonFile(file);
      if (Array.isArray(d)) setTechSpecs(normalizeTechSpecs(d));
      else alert("Неверный формат файла");
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const wsName = wb.SheetNames.find((n) => n === "ТУ") || wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    const newSpecs = [];
    let curSec = null;
    for (let r = 0; r < data.length; r += 1) {
      const row = Array.isArray(data[r]) ? data[r] : [];
      const col0Raw = row[0];
      const col1Raw = row[1];
      const col2Raw = row[2];
      const col0 = String(col0Raw ?? "").trim();
      const col1 = String(col1Raw ?? "").trim();
      const col2 = String(col2Raw ?? "").trim();
      const col1Empty = col1 === "" || Number.isNaN(col1Raw);
      const col2Empty = col2 === "" || Number.isNaN(col2Raw);
      const col0Numeric = col0 !== "" && !Number.isNaN(Number(col0));

      if (col0 === "#") continue;

      if (col1Empty && col0 !== "" && col0 !== "#") {
        curSec = { n: col0, items: [] };
        newSpecs.push(curSec);
        continue;
      }

      if (col0Numeric && !col1Empty && curSec) {
        curSec.items.push({ n: col1, n2: col2Empty ? "" : col2 });
      }
    }

    const validSpecs = newSpecs.filter((sec) => Array.isArray(sec.items) && sec.items.length > 0);
    if (validSpecs.length === 0) {
      alert("Не удалось распознать структуру ТУ: в файле не найдено ни одного корректного раздела с параметрами.");
      return;
    }

    setTechSpecs(normalizeTechSpecs(validSpecs));
    alert(`✓ Загружено: разделов ${validSpecs.length}, параметров ${validSpecs.reduce((a, s) => a + s.items.length, 0)}`);
  } catch (err) {
    alert(`Ошибка чтения XLSX: ${err.message}`);
  }
}
