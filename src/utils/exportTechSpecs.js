const TITLE_FILL = "1F3764";
const HEADER_FILL = "DAE3F3";
const WHITE = "FFFFFFFF";

const borderless = {};

const makeCell = (value, style = {}) => ({
  v: value,
  t: typeof value === "number" ? "n" : "s",
  s: {
    alignment: { wrapText: true, vertical: "center", ...style.alignment },
    font: style.font || {},
    fill: style.fill || borderless,
  },
});

export const exportTechSpecsXlsx = async ({ techSpecs, eqType }) => {
  const xlsxModule = await import("xlsx-js-style");
  const XLSXStyle = xlsxModule.default ?? xlsxModule;
  const rows = [];
  rows.push(["Технические условия", "", ""]);

  (techSpecs || []).forEach((sec) => {
    const sectionName = String(sec?.n ?? "").trim();
    if (!sectionName) return;
    rows.push([sectionName, "", ""]);
    rows.push(["#", "Параметр", "Требуемые характеристики"]);
    (sec?.items || []).forEach((item, idx) => {
      rows.push([
        idx + 1,
        String(item?.n ?? ""),
        String(item?.n2 ?? ""),
      ]);
    });
  });

  const ws = XLSXStyle.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 4 }, { wch: 32.33 }, { wch: 123.66 }];
  ws["!merges"] = [];

  const darkBlueRowStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: WHITE } },
    fill: { patternType: "solid", fgColor: { rgb: TITLE_FILL } },
    alignment: { horizontal: "center" },
  };
  const titleStyle = darkBlueRowStyle;
  const sectionStyle = darkBlueRowStyle;
  const colHeaderStyle = {
    font: { bold: true, italic: true },
    fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL } },
    alignment: { horizontal: "center" },
  };
  const dataNumberStyle = { alignment: { horizontal: "center" } };
  const dataTextStyle = { alignment: { horizontal: "left" } };

  let rowIdx = 0;
  ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 0 })] = makeCell("Технические условия", titleStyle);
  ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 1 })] = makeCell("", titleStyle);
  ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 2 })] = makeCell("", titleStyle);
  ws["!merges"].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 2 } });
  rowIdx += 1;

  (techSpecs || []).forEach((sec) => {
    const sectionName = String(sec?.n ?? "").trim();
    if (!sectionName) return;

    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 0 })] = makeCell(sectionName, sectionStyle);
    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 1 })] = makeCell("", sectionStyle);
    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 2 })] = makeCell("", sectionStyle);
    ws["!merges"].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 2 } });
    rowIdx += 1;

    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 0 })] = makeCell("#", colHeaderStyle);
    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 1 })] = makeCell("Параметр", colHeaderStyle);
    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 2 })] = makeCell("Требуемые характеристики", colHeaderStyle);
    rowIdx += 1;

    (sec?.items || []).forEach((item, idx) => {
      ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 0 })] = makeCell(idx + 1, dataNumberStyle);
      ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 1 })] = makeCell(String(item?.n ?? ""), dataTextStyle);
      ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: 2 })] = makeCell(String(item?.n2 ?? ""), dataTextStyle);
      rowIdx += 1;
    });
  });

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Технические условия");
  XLSXStyle.writeFile(wb, `ТУ_${eqType}.xlsx`);
};
