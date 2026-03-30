import * as XLSX from "xlsx-js-style";
import { calcTotal } from "../scoring";

const getEqTitle = (eqType) => (eqType === "стойка" ? "СЕРВЕРНАЯ СТОЙКА" : "PDU");

const getCategory = (weight) => {
  if (weight >= 2) return "ПП";
  if (weight === 1) return "ОП";
  return "";
};

const normalizeScore = (score) => (score === 0 || score === 1 || score === 2 ? score : "");

const stripNoteHtml = (str) => String(str ?? "").replace(/<[^>]*>/g, "").trim();

const makeStyle = ({ fill, color, bold = false, size = 10, align = "left" } = {}) => {
  const style = {
    font: { sz: size, bold },
    alignment: { horizontal: align, vertical: "center", wrapText: true },
  };
  if (color) style.font.color = { rgb: color };
  if (fill) style.fill = { patternType: "solid", fgColor: { rgb: fill } };
  return style;
};

const setCellStyle = (ws, rowIndex, colIndex, style) => {
  const ref = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  if (!ws[ref]) ws[ref] = { t: "s", v: "" };
  ws[ref].s = style;
};

export function exportVendorForm({ vendor, sections, eqType, ALL }) {
  if (!vendor) return;

  const vendorName = String(vendor?.name ?? "").trim() || "Вендор";
  const rows = [];
  const merges = [];
  const sectionRows = [];
  const dataRows = [];

  rows.push([`${getEqTitle(eqType)} - ${vendorName}`, "", "", "", ""]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 1, c: 2 }, e: { r: 1, c: 4 } });
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } });
  merges.push({ s: { r: 2, c: 2 }, e: { r: 2, c: 4 } });

  rows.push(["ОЦЕНКА ПРОИЗВОДСТВА", "", "ПРОИЗВОДСТВЕННАЯ МОЩНОСТЬ", "", ""]);
  rows.push(["Выбрать из списка", "", "Прозведено ед. в мес.", "", ""]);
  rows.push(["№ п. ТУ", "Параметр", "Категория", "Оценка (0/1/2)", "Примечание"]);

  let seq = 1;
  let itemIdx = 0;

  (sections || []).forEach((section) => {
    const sectionRowIndex = rows.length;
    rows.push([String(section?.n ?? ""), "", "", "", ""]);
    sectionRows.push(sectionRowIndex);
    merges.push({ s: { r: sectionRowIndex, c: 0 }, e: { r: sectionRowIndex, c: 4 } });

    (section?.items || []).forEach((item) => {
      const rowIndex = rows.length;
      const category = getCategory(item?.w);
      rows.push([
        seq,
        String(item?.n ?? ""),
        category,
        normalizeScore(vendor?.scores?.[itemIdx]),
        stripNoteHtml(vendor?.notes?.[itemIdx]),
      ]);
      dataRows.push({ rowIndex, category });
      seq += 1;
      itemIdx += 1;
    });
  });

  rows.push(["", "", "", "", ""]);
  const spacerBeforeTotalRow = rows.length - 1;

  const total = calcTotal(vendor?.scores || [], ALL || []);
  const totalValue = total == null ? "" : Number(total.toFixed(2));
  rows.push(["Итоговый балл по 10-бальной шкале", "", "", totalValue, ""]);
  const totalRowIndex = rows.length - 1;
  merges.push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 2 } });

  rows.push(["", "", "", "", ""]);
  const spacerBeforeVerdictRow = rows.length - 1;
  rows.push(["ВЫВОД", "", "", "", ""]);
  const verdictTitleRowIndex = rows.length - 1;
  merges.push({ s: { r: verdictTitleRowIndex, c: 0 }, e: { r: verdictTitleRowIndex, c: 4 } });

  const verdicts = [
    "Рекомендован к включению в список рекомендованных производителей",
    "Производителю рекомендовано доработать изделие для повторного тестирования",
    "Не рекомендован к включению в список рекомендованных производителей",
  ];

  const verdictIndex =
    typeof total === "number" ? (total >= 8 ? 0 : total >= 5 ? 1 : 2) : null;

  const verdictRowIndexes = [];
  verdicts.forEach((text, idx) => {
    const verdictRowIndex = rows.length;
    rows.push([text, "", "", "", verdictIndex === idx ? "✓" : ""]);
    verdictRowIndexes.push(verdictRowIndex);
    merges.push({ s: { r: verdictRowIndex, c: 0 }, e: { r: verdictRowIndex, c: 3 } });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 7.5 }, { wch: 42.66 }, { wch: 10 }, { wch: 15.5 }, { wch: 13.66 }];

  const rowsMeta = Array.from({ length: rows.length }, () => ({ hpt: 18 }));
  rowsMeta[0] = { hpt: 31.5 };
  rowsMeta[1] = { hpt: 31.5 };
  rowsMeta[2] = { hpt: 20 };
  rowsMeta[3] = { hpt: 21.75 };
  rowsMeta[totalRowIndex] = { hpt: 27.75 };
  rowsMeta[verdictTitleRowIndex] = { hpt: 21.75 };
  rowsMeta[verdictRowIndexes[0]] = { hpt: 24 };
  rowsMeta[verdictRowIndexes[1]] = { hpt: 32 };
  rowsMeta[verdictRowIndexes[2]] = { hpt: 24 };
  ws["!rows"] = rowsMeta;

  const titleStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 14, align: "center" });
  const topLabelStyle = makeStyle({ bold: true, size: 12, align: "center" });
  const headerStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 10, align: "center" });
  const sectionStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 10, align: "left" });
  const dataNumberStyle = makeStyle({ fill: "FFFFFF", size: 10, align: "center" });
  const dataTextStyle = makeStyle({ fill: "FFFFFF", size: 10, align: "left" });
  const dataScoreStyle = makeStyle({ fill: "FFFFFF", size: 10, align: "center" });
  const categoryPPStyle = makeStyle({ fill: "C00000", color: "FFFFFF", bold: true, size: 10, align: "center" });
  const categoryOPStyle = makeStyle({ fill: "FFB3B3", color: "5C0000", bold: true, size: 10, align: "center" });
  const categoryEmptyStyle = makeStyle({ fill: "FFFFFF", size: 10, align: "center" });
  const totalLabelStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 10, align: "left" });
  const totalValueStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 10, align: "center" });
  const verdictTitleStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 10, align: "left" });
  const verdictTextStyle = makeStyle({ size: 10, align: "left" });
  const verdictMarkStyle = makeStyle({ size: 10, align: "center", fill: "FEE2E2", color: "AAAAAA" });
  const verdictMarkEmptyStyle = makeStyle({ size: 10, align: "center" });

  for (let c = 0; c < 5; c += 1) setCellStyle(ws, 0, c, titleStyle);

  setCellStyle(ws, 1, 0, topLabelStyle);
  setCellStyle(ws, 1, 1, topLabelStyle);
  setCellStyle(ws, 1, 2, topLabelStyle);
  setCellStyle(ws, 1, 3, topLabelStyle);
  setCellStyle(ws, 1, 4, topLabelStyle);
  setCellStyle(ws, 2, 0, topLabelStyle);
  setCellStyle(ws, 2, 1, topLabelStyle);
  setCellStyle(ws, 2, 2, topLabelStyle);
  setCellStyle(ws, 2, 3, topLabelStyle);
  setCellStyle(ws, 2, 4, topLabelStyle);

  for (let c = 0; c < 5; c += 1) setCellStyle(ws, 3, c, headerStyle);

  sectionRows.forEach((rowIndex) => {
    for (let c = 0; c < 5; c += 1) setCellStyle(ws, rowIndex, c, sectionStyle);
  });

  dataRows.forEach(({ rowIndex, category }) => {
    setCellStyle(ws, rowIndex, 0, dataNumberStyle);
    setCellStyle(ws, rowIndex, 1, dataTextStyle);
    if (category === "ПП") setCellStyle(ws, rowIndex, 2, categoryPPStyle);
    else if (category === "ОП") setCellStyle(ws, rowIndex, 2, categoryOPStyle);
    else setCellStyle(ws, rowIndex, 2, categoryEmptyStyle);
    setCellStyle(ws, rowIndex, 3, dataScoreStyle);
    setCellStyle(ws, rowIndex, 4, dataTextStyle);
  });

  for (let c = 0; c < 5; c += 1) setCellStyle(ws, spacerBeforeTotalRow, c, dataTextStyle);
  setCellStyle(ws, totalRowIndex, 0, totalLabelStyle);
  setCellStyle(ws, totalRowIndex, 1, totalLabelStyle);
  setCellStyle(ws, totalRowIndex, 2, totalLabelStyle);
  setCellStyle(ws, totalRowIndex, 3, totalValueStyle);
  setCellStyle(ws, totalRowIndex, 4, dataTextStyle);

  for (let c = 0; c < 5; c += 1) setCellStyle(ws, spacerBeforeVerdictRow, c, dataTextStyle);
  for (let c = 0; c < 5; c += 1) setCellStyle(ws, verdictTitleRowIndex, c, verdictTitleStyle);

  verdictRowIndexes.forEach((rowIndex, idx) => {
    for (let c = 0; c < 4; c += 1) setCellStyle(ws, rowIndex, c, verdictTextStyle);
    setCellStyle(ws, rowIndex, 4, verdictIndex === idx ? verdictMarkStyle : verdictMarkEmptyStyle);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Форма");
  XLSX.writeFile(wb, `Форма_${eqType}_${vendorName}.xlsx`);
}
