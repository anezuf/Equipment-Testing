export async function exportScoringExcel({ sections, vendors }) {
  try {
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Оценка");
    const colCount = 3 + vendors.length * 2;

    const argb = (hex) => `FF${hex.replace("#", "")}`;
    const fill = (hex) => ({ type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } });
    const fnt = (color, bold = false, size) => ({ bold, color: { argb: argb(color) }, ...(size ? { size } : {}) });
    const CENTER = { horizontal: "center", vertical: "middle" };
    const LEFT = { horizontal: "left", vertical: "middle" };

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;
    ws.getColumn(3).width = 18;
    vendors.forEach((_, vi) => {
      ws.getColumn(4 + vi * 2).width = 12;
      ws.getColumn(5 + vi * 2).width = 22;
    });

    ws.addRow(["ЧЕК-ЛИСТ ТЕСТИРОВАНИЯ СТОЕК"]);
    ws.mergeCells(1, 1, 1, colCount);
    const tc = ws.getCell(1, 1);
    tc.fill = fill("#334155");
    tc.font = fnt("#FFFFFF", true, 13);
    tc.alignment = CENTER;
    ws.getRow(1).height = 26;

    const hdr = ["#", "Параметр", "Тип"];
    vendors.forEach((v, n) => {
      hdr.push(v.name);
      hdr.push(`Прим. В${n + 1}`);
    });
    ws.addRow(hdr);
    for (let c = 1; c <= colCount; c += 1) {
      const cell = ws.getCell(2, c);
      cell.fill = fill("#334155");
      cell.font = fnt("#FFFFFF", true);
      cell.alignment = CENTER;
    }
    ws.getRow(2).height = 18;

    let gi = 0;
    let rowNum = 3;
    sections.forEach((sec) => {
      ws.addRow([sec.n]);
      ws.mergeCells(rowNum, 1, rowNum, colCount);
      const sc = ws.getCell(rowNum, 1);
      sc.fill = fill("#2F9AFF");
      sc.font = fnt("#FFFFFF", true);
      sc.alignment = CENTER;
      ws.getRow(rowNum).height = 16;
      rowNum += 1;

      sec.items.forEach((it) => {
        const typeStr = it.w === 2 ? "ПП" : it.w === 1 ? "ОП" : "П";
        const isReq = it.w >= 1;
        const altBg = gi % 2 === 0 ? "#F5F8FB" : "#FFFFFF";
        const cleanNote = (str) => {
          if (!str) return "";
          return str.replace(/<[^>]*>/g, "").trim();
        };

        const rowData = [gi + 1, it.n, typeStr];
        vendors.forEach((v) => {
          rowData.push(v.scores[gi] != null ? v.scores[gi] : "");
          rowData.push(cleanNote(v.notes[gi]));
        });
        ws.addRow(rowData);
        ws.getRow(rowNum).height = 15;

        const ca = ws.getCell(rowNum, 1);
        ca.font = fnt("#7B97B2");
        ca.alignment = CENTER;

        const cb = ws.getCell(rowNum, 2);
        cb.font = fnt("#334155");
        cb.alignment = LEFT;

        const cc = ws.getCell(rowNum, 3);
        cc.fill = isReq ? fill("#FEE2E2") : fill("#DBEAFE");
        cc.font = isReq ? fnt("#DC2626", true) : fnt("#2F9AFF", true);
        cc.alignment = CENTER;

        vendors.forEach((_, vi) => {
          const sc2 = ws.getCell(rowNum, 4 + vi * 2);
          sc2.fill = fill(altBg);
          sc2.alignment = CENTER;

          const nc = ws.getCell(rowNum, 5 + vi * 2);
          nc.fill = fill(altBg);
          nc.font = fnt("#7B97B2");
        });

        rowNum += 1;
        gi += 1;
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scoring_export.xlsx";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error(err);
    alert(`Ошибка экспорта Excel: ${err.message}`);
  }
}
