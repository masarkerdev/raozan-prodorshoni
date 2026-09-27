import ExcelJS from "exceljs";

export type SheetColumn = { label: string; width?: number };

/** সাধারণ এক-শিটের এক্সেল ফাইল তৈরি: শিরোনাম, হেডার ও সারি */
export async function buildWorkbook(opts: {
  sheetName: string;
  titleLines: string[];
  columns: SheetColumn[];
  rows: (string | number | Date | null)[][];
  totals?: (string | number | null)[];
}): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "প্রদর্শনী রেজিস্টার, রাউজান";
  const ws = wb.addWorksheet(opts.sheetName, { views: [{ state: "frozen", ySplit: opts.titleLines.length + 1 }] });

  const colCount = opts.columns.length;
  opts.titleLines.forEach((line, i) => {
    const row = ws.addRow([line]);
    ws.mergeCells(row.number, 1, row.number, colCount);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(1).font = { bold: i === 0, size: i === 0 ? 14 : 11 };
  });

  const header = ws.addRow(opts.columns.map((c) => c.label));
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3EDE6" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin" } };
  });

  for (const r of opts.rows) ws.addRow(r.map((v) => (v === null ? "" : v)));

  if (opts.totals) {
    const t = ws.addRow(opts.totals.map((v) => (v === null ? "" : v)));
    t.font = { bold: true };
    t.eachCell((cell) => (cell.border = { top: { style: "thin" } }));
  }

  opts.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width ?? 14;
  });
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy";
    });
  });

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function xlsxResponse(buf: ArrayBuffer, filename: string) {
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
