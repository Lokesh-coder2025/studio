
import * as XLSX from 'xlsx';

// Original simple export function
export const exportToExcel = (data: any[], sheetName: string, fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

type ExportWithFormulasParams = {
  headers: string[];
  dataRows: (string | number)[][];
  footerRows: (string | number)[][];
  collegeName: string;
  examTitle: string;
  sheetName: string;
  fileName:string;
};

// New function to handle formulas and headers
export const exportToExcelWithFormulas = ({ headers, dataRows, footerRows, collegeName, examTitle, sheetName, fileName }: ExportWithFormulasParams) => {
  const titleRows = [
    [collegeName],
    [examTitle],
    ["Invigilation Duty Allotment Sheet"],
    [], // Empty row for spacing
  ];
  
  const ws_data = [...titleRows, headers, ...dataRows, ...footerRows];
  const worksheet = XLSX.utils.aoa_to_sheet(ws_data);

  // Merge cells for the main titles
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, // College Name
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }, // Exam Title
    { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }, // Allotment Sheet Title
  ];
  
  const titleRowOffset = titleRows.length;
  const numDataRows = dataRows.length;
  const numCols = headers.length;
  const dutyColsStart = 3; 
  const dutyColsEnd = numCols - 2;

  // Add formulas for row totals (Total duties per invigilator)
  for (let i = 0; i < numDataRows; i++) {
    const rowIndex = i + titleRowOffset + 1; // 1-based index, plus title rows, plus header
    const startCell = XLSX.utils.encode_cell({c: dutyColsStart, r: rowIndex - 1});
    const endCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: rowIndex - 1});
    const formula = `SUM(${startCell}:${endCell})`;
    XLSX.utils.sheet_add_aoa(worksheet, [[{ f: formula }]], { origin: { c: numCols - 1, r: rowIndex - 1 } });
  }
  
  // --- FOOTER FORMULAS ---
  const footerStartRow = titleRowOffset + numDataRows + 1;
  const roomsRow = footerStartRow;
  const relieversRow = footerStartRow + 1;
  const totalInvigilatorsRow = footerStartRow + 2;
  const totalAllottedRow = footerStartRow + 3;
  
  for (let j = dutyColsStart; j <= dutyColsEnd; j++) {
    const colLetter = XLSX.utils.encode_col(j);
    
    // Formula for "Total Invigilators" (Rooms + Relievers)
    const roomsCell = `${colLetter}${roomsRow}`;
    const relieversCell = `${colLetter}${relieversRow}`;
    const totalInvigilatorsFormula = `${roomsCell}+${relieversCell}`;
    XLSX.utils.sheet_add_aoa(worksheet, [[{ f: totalInvigilatorsFormula }]], { origin: { c: j, r: totalInvigilatorsRow - 1 } });

    // Formula for "Total Duties Allotted" (SUM of assigned duties in that column)
    const dataStartRow = titleRowOffset + 2;
    const dataEndRow = titleRowOffset + numDataRows + 1;
    const allottedFormula = `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`;
    XLSX.utils.sheet_add_aoa(worksheet, [[{ f: allottedFormula }]], { origin: { c: j, r: totalAllottedRow - 1 } });
  }

  // --- GRAND TOTALS (LAST COLUMN) ---
  const grandTotalCol = numCols - 1;

  // Grand total for No of Rooms
  const roomsStartCell = XLSX.utils.encode_cell({c: dutyColsStart, r: roomsRow - 1});
  const roomsEndCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: roomsRow - 1});
  const roomsGrandTotalFormula = `SUM(${roomsStartCell}:${roomsEndCell})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{ f: roomsGrandTotalFormula }]], { origin: { c: grandTotalCol, r: roomsRow - 1 }});

  // Grand total for No of Relievers
  const relieversStartCell = XLSX.utils.encode_cell({c: dutyColsStart, r: relieversRow - 1});
  const relieversEndCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: relieversRow - 1});
  const relieversGrandTotalFormula = `SUM(${relieversStartCell}:${relieversEndCell})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{ f: relieversGrandTotalFormula }]], { origin: { c: grandTotalCol, r: relieversRow - 1 }});

  // Grand total for Total Invigilators
  const totalInvStartCell = XLSX.utils.encode_cell({c: dutyColsStart, r: totalInvigilatorsRow - 1});
  const totalInvEndCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: totalInvigilatorsRow - 1});
  const totalInvGrandTotalFormula = `SUM(${totalInvStartCell}:${totalInvEndCell})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{ f: totalInvGrandTotalFormula }]], { origin: { c: grandTotalCol, r: totalInvigilatorsRow - 1 }});
  
  // Grand total for Total Duties Allotted
  const allottedStartCell = XLSX.utils.encode_cell({c: dutyColsStart, r: totalAllottedRow - 1});
  const allottedEndCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: totalAllottedRow - 1});
  const allottedGrandTotalFormula = `SUM(${allottedStartCell}:${allottedEndCell})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{ f: allottedGrandTotalFormula }]], { origin: { c: grandTotalCol, r: totalAllottedRow - 1 }});


  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
