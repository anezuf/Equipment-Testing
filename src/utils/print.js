import { mkAll, mkOff } from "../sections";
import { calcTotal, calcSec } from "../scoring";
import { fmt } from "../utils";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getProductionVerdictText(vendor) {
  if (vendor?.productionVerdict === "recommended") {
    return "Рекомендован к включению в список рекомендованных производителей";
  }
  if (vendor?.productionVerdict === "rework") {
    return "Производителю рекомендовано доработать изделие для повторного тестирования";
  }
  if (vendor?.productionVerdict === "not_recommended") {
    return "Не рекомендован к включению в список рекомендованных производителей";
  }

  const rating = vendor?.productionRating;
  if (rating === "Хорошо") {
    return "Рекомендован к включению в список рекомендованных производителей";
  }
  if (rating === "Удовлетворительно") {
    return "Производителю рекомендовано доработать изделие для повторного тестирования";
  }
  if (rating === "Плохо") {
    return "Не рекомендован к включению в список рекомендованных производителей";
  }
  return "—";
}

function getProductionRatingPalette(rating) {
  if (rating === "Хорошо") {
    return { text: "#047857", bg: "#ECFDF5", border: "#A7F3D0" };
  }
  if (rating === "Удовлетворительно") {
    return { text: "#B45309", bg: "#FFFBEB", border: "#FDE68A" };
  }
  if (rating === "Плохо") {
    return { text: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" };
  }
  return { text: "#334155", bg: "#F8FAFC", border: "#D7E1EC" };
}

function getProductionVerdictPalette(vendor) {
  if (vendor?.productionVerdict === "recommended") {
    return { text: "#047857", bg: "#ECFDF5", border: "#A7F3D0" };
  }
  if (vendor?.productionVerdict === "rework") {
    return { text: "#B45309", bg: "#FFFBEB", border: "#FDE68A" };
  }
  if (vendor?.productionVerdict === "not_recommended") {
    return { text: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" };
  }
  return getProductionRatingPalette(vendor?.productionRating);
}

function getProductionCapacityPalette(capacityRaw) {
  const parsed = Number.parseInt(String(capacityRaw ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(parsed)) {
    return { text: "#334155", bg: "#F8FAFC", border: "#D7E1EC" };
  }
  if (parsed === 0) {
    return { text: "#B45309", bg: "#FFFBEB", border: "#FDE68A" };
  }
  return { text: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" };
}

export function exportVendorPdfReport(vendor, scoringSections) {
  if (!vendor) return;

  const allItems = mkAll(scoringSections);
  const offs = mkOff(scoringSections);
  const scoreLabels = ["✗ Нет", "◐ Частично", "✓ Да"];
  const scoreColors = ["#EF4444", "#F59E0B", "#10B981"];
  const total = calcTotal(vendor.scores, allItems);

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(vendor.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet">
    <style>
      @page{size:A4;margin:15mm 12mm 15mm 12mm}
      *{
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Inter,system-ui,sans-serif;color:#334155;padding:24px;max-width:700px;margin:0 auto;font-size:13px;line-height:1.5}
      .print-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E5EAF0;padding-bottom:8px;margin-bottom:12px;gap:12px}
      .print-header-logo{display:inline-flex;align-items:center}
      .print-header-title{font-size:12px;font-weight:600;color:#334155;text-align:center;flex:1}
      .print-header-date{font-size:11px;color:#7B97B2;white-space:nowrap}
      .print-logo{height:22px;display:block;flex-shrink:0}
      h1{font-size:22px;font-weight:800;margin-bottom:16px}
      .total{display:inline-block;padding:8px 20px;border-radius:12px;font-size:20px;font-weight:800;color:#fff;margin-bottom:28px}
      .sec{background:#334155;color:#fff;padding:8px 14px;font-size:12px;font-weight:700;border-radius:8px 8px 0 0;break-after:avoid-page;page-break-after:avoid}
      .items{border:1px solid #E5EAF0;border-top:none;border-radius:0 0 8px 8px;margin-bottom:2px;break-inside:auto;page-break-inside:auto}
      .sec-first-pack{break-inside:avoid;page-break-inside:avoid}
      .items-first{margin-bottom:0}
      .items-first.has-rest{border-radius:0}
      .items-first.has-rest .row:last-child{border-bottom:1px solid #F1F5F9}
      .items-first.single{border-radius:0 0 8px 8px;margin-bottom:2px}
      .items-rest{border-top:none;border-radius:0 0 8px 8px;margin-bottom:2px}
      .row{padding:8px 14px;border-bottom:1px solid #F1F5F9;break-inside:avoid-page;page-break-inside:avoid}
      .row:last-child{border-bottom:none}
      .rhead{display:flex;gap:10px;align-items:baseline}
      .rname{flex:1;font-size:12px;font-weight:500;padding-left:1px}
      .rtype{font-size:10px;font-weight:700}
      .rscore{font-size:12px;font-weight:700;flex-shrink:0;text-align:right}
      .note{display:block;background:#F5F8FB;border-radius:6px;padding:4px 10px;font-size:11px;color:#7B97B2;margin-top:4px;white-space:pre-wrap;display:block;text-align:left}.note ul{list-style:disc;padding-left:18px;margin:4px 0}.note ol{list-style:decimal;padding-left:18px;margin:4px 0}.note li{margin:2px 0}.note strong{font-weight:700}.note em{font-style:italic}.note s{text-decoration:line-through}
      .photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
      .photos img{max-width:48%;max-height:240px;border-radius:6px;border:1px solid #E5EAF0;object-fit:contain}
      .summary{margin-top:28px;border:1px solid #E5EAF0;border-radius:10px;overflow:hidden}
      .srow{display:flex;justify-content:space-between;padding:6px 14px;font-size:12px}
      .srow:nth-child(even){background:#F5F8FB}
      .sn{color:#7B97B2}.sv{font-weight:700}
      .pdf-toolbar{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 auto 24px;flex-wrap:wrap;max-width:700px}
      .pdf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:8px 15px;border-radius:20px;font-size:13px;font-weight:500;color:#334155;cursor:pointer;transition:all 0.2s ease;white-space:nowrap;border:1.5px solid #FECACA;background:#FEF2F2;font-family:Inter,system-ui,sans-serif}
      .pdf-btn:hover{background:#FEE2E2;border-color:#FCA5A5}
      .pdf-btn:active{background:#FECACA}
      .pdf-btn-back{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:8px 15px;border-radius:20px;font-size:13px;font-weight:500;color:#1E40AF;cursor:pointer;transition:all 0.2s ease;white-space:nowrap;border:1.5px solid #BFDBFE;background:#EFF6FF;font-family:Inter,system-ui,sans-serif}
      .pdf-btn-back:hover{background:#DBEAFE;border-color:#93C5FD}
      .pdf-btn-back:active{background:#BFDBFE}
      .sec-block{break-inside:auto;page-break-inside:auto;margin-top:14px}
      .sec + .items{break-before:avoid-page;page-break-before:avoid}
      @media print{
        body{padding:12px}
        .pdf-toolbar{display:none!important}
        .sec-block{break-inside:auto!important;page-break-inside:auto!important}
        .sec{break-after:avoid-page!important;page-break-after:avoid!important}
        .sec-first-pack{break-inside:avoid!important;page-break-inside:avoid!important}
        .sec + .items{break-before:avoid-page!important;page-break-before:avoid!important}
        .row{break-inside:avoid-page!important;page-break-inside:avoid!important}
      }
    </style></head><body>`;

  html += `<div class="pdf-toolbar">
      <button type="button" class="pdf-btn-back" onclick="window.close()"><span style="font-size:14px;line-height:1;color:#2563EB" aria-hidden="true">←</span><span>Назад</span></button>
      <button type="button" class="pdf-btn" onclick="window.print()"><span style="font-size:14px;line-height:1;color:#DC2626">↓</span><span>report</span><span style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:#DC2626">PDF</span></button>
    </div>`;
  html += `<div class="print-header">
      <div class="print-header-logo">
        <svg class="print-logo" viewBox="195 230 1530 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#2F9AFF" d="M416.3,825.4c-114.3,0-207.3-93-207.3-207.3S301.9,411,416.1,410.9C446.5,300.5,560.7,235.7,671,266.1c70.4,19.4,125.4,74.4,144.8,144.9c45.4-9,145-17,238.8,53.3c10.2,7.6,12.2,22.1,4.6,32.2c-7.6,10.2-22.1,12.2-32.2,4.6l0,0c-43.4-32.6-93.6-49.3-149.2-49.7c-42.3-0.3-71.9,9.4-72.2,9.5c-12.1,4-25.2-2.5-29.2-14.6c-0.4-1.3-0.7-2.6-0.9-3.9c-11.4-78.5-80-137.7-159.5-137.7c-78.6-0.2-145.8,56.5-158.9,134c-2,11.9-12.9,20.2-24.9,19.1c-5.3-0.5-10.6-0.8-15.9-0.8c-88.9,0-161.2,72.3-161.2,161.2s72.3,161.2,161.2,161.2c29.3,0,58.1-8,83.2-23.1c10.9-6.6,25-3.1,31.6,7.8s3.1,25-7.8,31.6C491,815.1,454,825.4,416.3,825.4z"/>
          <path fill="#1E1E1E" d="M580.1,654.2v53.3h-37.8V530.3H612c24.5,0,42.5,5.8,54.1,17.4c11.6,11.6,17.4,26.7,17.4,45.4c0,14.8-3.6,27.1-10.8,37s-16,16.8-26.5,20.7c-10.5,3.9-22.2,5.9-35.3,5.9S587.6,655.9,580.1,654.2z M580.1,563.4v59.7c5.4,1.1,13.9,1.7,25.5,1.7c25.6,0,38.4-10.8,38.4-32.5c0-19.2-11.4-28.9-34.2-28.9H580.1z"/><path fill="#1E1E1E" d="M689.1,563.4v-33.1h148.5v33.1h-56v144.1h-36.5V563.4H689.1z"/><path fill="#1E1E1E" d="M859,707.4V530.3h37.8V604h8.7l61.7-73.7h44.3l-73.2,85.5l81.8,91.7h-49.4L906,632.9h-9.3v74.5H859z"/><path fill="#1E1E1E" d="M1093,655.9h-86.6v-35.6h86.6V655.9z"/><path fill="#1E1E1E" d="M1237.6,673.8V530.3h37.8v143.5h26.6v66.7h-36.4v-33.1h-140.1V530.3h37.8v143.5H1237.6z"/><path fill="#1E1E1E" d="M1414.4,712.5c-27.8,0-50.4-8.6-67.7-25.8s-26.1-39.5-26.5-67c0.4-27.5,9.2-49.7,26.5-66.8s39.8-25.6,67.7-25.7c28,0,50.6,8.5,67.7,25.5c17.1,17,25.9,39.3,26.2,67c-0.4,27.5-9.1,49.8-26.2,67C1465,703.9,1442.5,712.5,1414.4,712.5z M1375.4,661.6c10.1,10.4,23.1,15.6,39,15.6c15.9,0,28.9-5.2,39.1-15.6c10.2-10.4,15.3-24.3,15.3-41.9s-5.1-31.6-15.3-42c-10.2-10.5-23.2-15.7-39.1-15.7s-28.9,5.2-39,15.7c-10.1,10.5-15.1,24.5-15.1,42C1360.3,637.2,1365.4,651.2,1375.4,661.6z"/><path fill="#1E1E1E" d="M1523.7,740.5v-66.7h16.5c7.2-16.7,12.3-34.1,15.4-52c3.2-18.2,4.8-42,4.8-71.3v-20.2h127.8v143.5h20.7v66.7h-35.6v-33.1h-114.1v33.1H1523.7z M1650.7,563.9h-54.4V583c0,33.6-5.6,63.9-16.8,90.8h71.2V563.9z"/>
          <path fill="#7B98B3" d="M336.9,552.5c0-12.7,10.3-23,23-23h113.4c12.7,0,23,10.3,23,23c0,12.7-10.3,23-23,23H359.9C347.2,575.5,336.9,565.2,336.9,552.5z"/><path fill="#7B98B3" d="M336.9,685.1c0-12.7,10.3-23,23-23h113.4c12.7,0,23,10.3,23,23c0,12.7-10.3,23-23,23H359.9C347.2,708.2,336.9,697.9,336.9,685.1z"/><path fill="#7B98B3" d="M336.9,618.9c0-12.7,10.3-23,23-23h113.4c12.7,0,23,10.3,23,23c0,12.7-10.3,23-23,23H359.9C347.2,641.9,336.9,631.6,336.9,618.9z"/>
        </svg>
      </div>
      <div class="print-header-title">Отчёт по тестированию оборудования</div>
      <div class="print-header-date">${new Date().toLocaleDateString("ru-RU")}</div>
    </div>`;
  html += `<h1>${escapeHtml(vendor.name)}</h1>`;

  const totalColor = total != null && total >= 7 ? "#10B981" : total != null && total >= 4 ? "#F59E0B" : "#7B97B2";
  html += `<div class="total" style="background:${totalColor}">${fmt(total)} / 10</div>`;

  const hasProductionInfo = Boolean(
    vendor.productionRating ||
    vendor.productionVerdict ||
    String(vendor.productionCapacity ?? "").trim()
  );
  if (hasProductionInfo) {
    const ratingText = escapeHtml(vendor.productionRating || "Не оценивалось");
    const capacityRaw = String(vendor.productionCapacity ?? "").trim();
    const capacityText = escapeHtml(capacityRaw ? `${capacityRaw} ед./мес.` : "—");
    const verdictText = escapeHtml(getProductionVerdictText(vendor));
    const ratingPalette = getProductionRatingPalette(vendor.productionRating);
    const capacityPalette = getProductionCapacityPalette(capacityRaw);
    const verdictPalette = getProductionVerdictPalette(vendor);
    html += `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-bottom:16px;padding:12px;border:1px solid #E5EAF0;border-radius:12px;background:#fff;break-inside:avoid">
        <div style="padding:10px 12px;border-radius:10px;border:1px solid ${ratingPalette.border};background:${ratingPalette.bg}">
          <div style="font-size:11px;color:#64748B;margin-bottom:4px">Оценка производства</div>
          <div style="font-size:13px;font-weight:700;color:${ratingPalette.text}">${ratingText}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;border:1px solid ${capacityPalette.border};background:${capacityPalette.bg}">
          <div style="font-size:11px;color:#64748B;margin-bottom:4px">Производственная мощность</div>
          <div style="font-size:13px;font-weight:700;color:${capacityPalette.text}">${capacityText}</div>
        </div>
        <div style="grid-column:1 / -1;padding:10px 12px;border-radius:10px;border:1px solid ${verdictPalette.border};background:${verdictPalette.bg}">
          <div style="font-size:11px;color:#64748B;margin-bottom:4px">Вывод</div>
          <div style="font-size:13px;font-weight:700;line-height:1.45;color:${verdictPalette.text}">${verdictText}</div>
        </div>
      </div>`;
  }

  let globalIndex = 0;
  scoringSections.forEach((sec) => {
    const rowHtmlList = [];
    sec.items.forEach((it) => {
      const score = vendor.scores[globalIndex];
      const note = vendor.notes[globalIndex] || "";
      const images = vendor.images?.[globalIndex] || null;
      const isRequired = it.w >= 1;
      const isCritical = it.w === 2;
      const typeBadge = isCritical
        ? `<span class="rtype" style="color:#DC2626">ПП</span>`
        : isRequired
          ? `<span class="rtype" style="color:#DC2626">ОП</span>`
          : `<span class="rtype" style="color:#2F9AFF">П</span>`;

      let scoreLabel = "—";
      let scoreColor = "#CBD5E1";
      if (score != null) {
        scoreLabel = scoreLabels[score];
        scoreColor = scoreColors[score];
      }

      let rowHtml = `<div class="row"><div class="rhead">${typeBadge}<span class="rname">${escapeHtml(it.n)}</span><span class="rscore" style="color:${scoreColor}">${scoreLabel}</span></div>`;
      if (note) rowHtml += `<div class="note">${note}</div>`;
      if (images && images.length) {
        rowHtml += `<div class="photos">`;
        images.forEach((im) => {
          rowHtml += `<img src="${im.data}" alt="${escapeHtml(im.name || "")}">`;
        });
        rowHtml += `</div>`;
      }
      rowHtml += `</div>`;
      rowHtmlList.push(rowHtml);
      globalIndex += 1;
    });

    const [firstRowHtml = "", ...restRowHtml] = rowHtmlList;
    const hasRestRows = restRowHtml.length > 0;
    html += `<div class="sec-block">
        <div class="sec-first-pack">
          <div class="sec">${escapeHtml(sec.n)}</div>
          <div class="items items-first ${hasRestRows ? "has-rest" : "single"}">${firstRowHtml}</div>
        </div>
        ${hasRestRows ? `<div class="items items-rest">${restRowHtml.join("")}</div>` : ""}
      </div>`;
  });

  html += `<div class="summary" style="break-inside:avoid">`;
  html += `<div class="srow" style="background:#334155;color:#fff;font-weight:700"><span>Раздел</span><span>Балл</span></div>`;
  scoringSections.forEach((sec, secIndex) => {
    const val = calcSec(vendor.scores, secIndex, scoringSections, offs);
    html += `<div class="srow"><span class="sn">${escapeHtml(sec.n)}</span><span class="sv">${fmt(val)}</span></div>`;
  });
  html += `<div class="srow" style="border-top:2px solid #E5EAF0;font-weight:700"><span>ИТОГО</span><span style="color:${totalColor}">${fmt(total)}</span></div>`;
  html += `</div>
    <script>
      (function(){
        const PX_PER_MM = 96 / 25.4;
        const PRINTABLE_WIDTH_MM = 210 - 12 - 12;
        const PRINTABLE_HEIGHT_MM = 297 - 15 - 15;
        const printableWidthPx = PRINTABLE_WIDTH_MM * PX_PER_MM;
        const printableHeightPx = PRINTABLE_HEIGHT_MM * PX_PER_MM;
        const EXTRA_SAFE_SPACE = 10;
        window.__adjustPrintLayout = function(){
          const blocks = Array.from(document.querySelectorAll('.sec-block'));
          if(!blocks.length) return;
          const bodyWidth = document.body.getBoundingClientRect().width || printableWidthPx;
          const scale = Math.min(1, printableWidthPx / bodyWidth);
          const pageHeightCss = printableHeightPx / scale;
          void EXTRA_SAFE_SPACE;
          void pageHeightCss;
        };
        window.__waitForPrintMedia = function(){
          const media = Array.from(document.querySelectorAll('img, video'));
          if (!media.length) return Promise.resolve();
          const waiters = media.map((el) => new Promise((resolve) => {
            if (el.tagName === 'IMG') {
              if (el.complete) { resolve(); return; }
              const done = () => resolve();
              el.addEventListener('load', done, { once: true });
              el.addEventListener('error', done, { once: true });
              return;
            }
            if (el.tagName === 'VIDEO') {
              if (el.readyState >= 2) { resolve(); return; }
              const done = () => resolve();
              el.addEventListener('loadeddata', done, { once: true });
              el.addEventListener('error', done, { once: true });
              return;
            }
            resolve();
          }));
          return Promise.race([
            Promise.all(waiters),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        };
        window.addEventListener('beforeprint', () => {
          if (typeof window.__adjustPrintLayout === 'function') {
            window.__adjustPrintLayout();
          }
        });
      })();
    </script>
    </body></html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Не удалось открыть окно печати. Разрешите всплывающие окна для этого сайта.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  const closePrintWindow = () => {
    try {
      printWindow.close();
    } catch {
      // ignored
    }
  };

  printWindow.onafterprint = closePrintWindow;
  setTimeout(async () => {
    try {
      const waitForLayout = () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      if (typeof printWindow.__waitForPrintMedia === "function") {
        await printWindow.__waitForPrintMedia();
      }
      await waitForLayout();
      if (typeof printWindow.__adjustPrintLayout === "function") {
        printWindow.__adjustPrintLayout();
      }
      await waitForLayout();
      if (typeof printWindow.__adjustPrintLayout === "function") {
        printWindow.__adjustPrintLayout();
      }
      printWindow.focus();
      printWindow.print();
    } catch {
      closePrintWindow();
    }
  }, 300);
}

