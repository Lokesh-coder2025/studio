import * as XLSX from 'xlsx';

// Original simple export function
export const exportToExcel = (data: any[], sheetName: string, fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// New function to handle formulas
export const exportToExcelWithFormulas = (headers: string[], dataRows: (string | number)[][], sheetName: string, fileName: string) => {
  const ws_data = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(ws_data);

  const numDataRows = dataRows.length;
  const numCols = headers.length;
  const dutyColsStart = 3; // 'Sl No', 'Invigilator’s Name', 'Designation' are the first 3
  const dutyColsEnd = numCols - 2;

  // Add formulas for row totals
  for (let i = 0; i < numDataRows; i++) {
    const rowIndex = i + 2; // 1-based index, +1 for header row
    const startCell = XLSX.utils.encode_cell({c: dutyColsStart, r: rowIndex - 1});
    const endCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: rowIndex - 1});
    const formula = `SUM(${startCell}:${endCell})`;
    XLSX.utils.sheet_add_aoa(worksheet, [[{ f: formula }]], { origin: { c: numCols - 1, r: rowIndex - 1 } });
  }

  // Add "Total Duties" row with formulas
  const totalRowIndex = numDataRows + 2;
  const totalRowLabelCell = {c: dutyColsStart - 1, r: totalRowIndex - 1};
  XLSX.utils.sheet_add_aoa(worksheet, [['Total Duties']], { origin: totalRowLabelCell });

  for (let j = dutyColsStart; j <= dutyColsEnd; j++) {
    const startCell = XLSX.utils.encode_cell({c: j, r: 1}); // Starts from row 2 (index 1)
    const endCell = XLSX.utils.encode_cell({c: j, r: numDataRows}); // Ends at the last data row
    const formula = `SUM(${startCell}:${endCell})`;
    XLSX.utils.sheet_add_aoa(worksheet, [[{ f: formula }]], { origin: { c: j, r: totalRowIndex - 1 } });
  }
  
  // Add Grand Total formula
  const grandTotalRowStart = XLSX.utils.encode_cell({c: numCols - 1, r: 1});
  const grandTotalRowEnd = XLSX.utils.encode_cell({c: numCols - 1, r: numDataRows});
  const grandTotalFormula = `SUM(${grandTotalRowStart}:${grandTotalRowEnd})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{f: grandTotalFormula}]], { origin: { c: numCols - 1, r: totalRowIndex - 1 } });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
