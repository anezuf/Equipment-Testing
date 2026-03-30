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

const makeStyle = ({ fill, color, bold = false, size = 10, align = "left", border } = {}) => {
  const style = {
    font: { name: "Arial", sz: size, bold },
    alignment: { horizontal: align, vertical: "center", wrapText: true },
  };
  if (color) style.font.color = { rgb: color };
  if (fill) style.fill = { patternType: "solid", fgColor: { rgb: fill } };
  if (border) style.border = border;
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

  const verdictRowIndexes = [];
  verdicts.forEach((text) => {
    const verdictRowIndex = rows.length;
    rows.push([text, "", "", "", ""]);
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

  const thinBorderGray = {
    top: { style: "thin", color: { rgb: "D0D0D0" } },
    bottom: { style: "thin", color: { rgb: "D0D0D0" } },
    left: { style: "thin", color: { rgb: "D0D0D0" } },
    right: { style: "thin", color: { rgb: "D0D0D0" } },
  };
  const thinBorderDark = {
    top: { style: "thin", color: { rgb: "334155" } },
    bottom: { style: "thin", color: { rgb: "334155" } },
    left: { style: "thin", color: { rgb: "334155" } },
    right: { style: "thin", color: { rgb: "334155" } },
  };

  const titleStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 14, align: "center" });
  const topLabelStyle = makeStyle({ bold: true, size: 12, align: "center", border: thinBorderGray });
  const headerStyle = makeStyle({
    fill: "334155",
    color: "FFFFFF",
    bold: true,
    size: 10,
    align: "center",
    border: thinBorderDark,
  });
  const sectionStyle = makeStyle({
    fill: "334155",
    color: "FFFFFF",
    bold: true,
    size: 10,
    align: "left",
    border: thinBorderGray,
  });
  const dataNumberStyle = makeStyle({ size: 10, align: "center", border: thinBorderGray });
  const dataTextStyle = makeStyle({ size: 10, align: "left", border: thinBorderGray });
  const dataScoreStyle = makeStyle({ size: 10, align: "center", border: thinBorderGray });
  const categoryPPStyle = makeStyle({
    fill: "C00000",
    color: "FFFFFF",
    bold: true,
    size: 10,
    align: "center",
    border: thinBorderGray,
  });
  const categoryOPStyle = makeStyle({
    fill: "FFB3B3",
    color: "5C0000",
    bold: true,
    size: 10,
    align: "center",
    border: thinBorderGray,
  });
  const categoryEmptyStyle = makeStyle({ size: 10, align: "center", border: thinBorderGray });
  const totalLabelStyle = makeStyle({
    fill: "334155",
    color: "FFFFFF",
    bold: true,
    size: 10,
    align: "right",
    border: thinBorderGray,
  });
  const totalValueStyle = makeStyle({
    fill: "334155",
    color: "FFFFFF",
    bold: true,
    size: 10,
    align: "center",
    border: thinBorderGray,
  });
  const totalTailStyle = makeStyle({
    fill: "334155",
    color: "FFFFFF",
    bold: true,
    size: 10,
    align: "left",
    border: thinBorderGray,
  });
  const verdictTitleStyle = makeStyle({ fill: "334155", color: "FFFFFF", bold: true, size: 10, align: "left" });
  const verdictTextStyle = makeStyle({ size: 10, align: "left", border: thinBorderGray });
  const verdictMarkGoodStyle = makeStyle({ size: 10, align: "center", border: thinBorderGray, fill: "D1FAE5" });
  const verdictMarkWarnStyle = makeStyle({ size: 10, align: "center", border: thinBorderGray, fill: "FEF3C7" });
  const verdictMarkBadStyle = makeStyle({ size: 10, align: "center", border: thinBorderGray, fill: "FEE2E2" });

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
  setCellStyle(ws, totalRowIndex, 4, totalTailStyle);

  for (let c = 0; c < 5; c += 1) setCellStyle(ws, spacerBeforeVerdictRow, c, dataTextStyle);
  for (let c = 0; c < 5; c += 1) setCellStyle(ws, verdictTitleRowIndex, c, verdictTitleStyle);

  verdictRowIndexes.forEach((rowIndex, idx) => {
    for (let c = 0; c < 4; c += 1) setCellStyle(ws, rowIndex, c, verdictTextStyle);
    if (idx === 0) setCellStyle(ws, rowIndex, 4, verdictMarkGoodStyle);
    else if (idx === 1) setCellStyle(ws, rowIndex, 4, verdictMarkWarnStyle);
    else setCellStyle(ws, rowIndex, 4, verdictMarkBadStyle);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Форма");
  XLSX.writeFile(wb, `Форма_${eqType}_${vendorName}.xlsx`);
}
