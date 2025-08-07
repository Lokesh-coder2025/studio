
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
  const mergeOptions = { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } };
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
  
  // Footer starts after titles, header, and data rows
  const footerStartIndex = titleRowOffset + numDataRows + 1;
  const roomsRowIndex = footerStartIndex;
  const relieversRowIndex = footerStartIndex + 1;
  const totalAllottedRowIndex = footerStartIndex + 2;
  
  for (let j = dutyColsStart; j <= dutyColsEnd; j++) {
    const colLetter = XLSX.utils.encode_col(j);
    // Formula for Total Duties Allotted column: SUM of duties assigned in that column
    const allottedFormula = `SUM(${colLetter}${titleRowOffset + 2}:${colLetter}${titleRowOffset + numDataRows + 1})`;
    XLSX.utils.sheet_add_aoa(worksheet, [[{ f: allottedFormula }]], { origin: { c: j, r: totalAllottedRowIndex - 1 } });
  }

  // Add formulas for grand totals in the last column
  // Grand total for No of Rooms
  const roomsStartCell = XLSX.utils.encode_cell({c: dutyColsStart, r: roomsRowIndex - 1});
  const roomsEndCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: roomsRowIndex - 1});
  const roomsGrandTotalFormula = `SUM(${roomsStartCell}:${roomsEndCell})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{ f: roomsGrandTotalFormula }]], { origin: { c: numCols - 1, r: roomsRowIndex - 1 }});

  // Grand total for No of Relievers
  const relieversStartCell = XLSX.utils.encode_cell({c: dutyColsStart, r: relieversRowIndex - 1});
  const relieversEndCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: relieversRowIndex - 1});
  const relieversGrandTotalFormula = `SUM(${relieversStartCell}:${relieversEndCell})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{ f: relieversGrandTotalFormula }]], { origin: { c: numCols - 1, r: relieversRowIndex - 1 }});

  // Grand total for Total Duties Allotted
  const allottedStartCell = XLSX.utils.encode_cell({c: dutyColsStart, r: totalAllottedRowIndex - 1});
  const allottedEndCell = XLSX.utils.encode_cell({c: dutyColsEnd, r: totalAllottedRowIndex - 1});
  const allottedGrandTotalFormula = `SUM(${allottedStartCell}:${allottedEndCell})`;
  XLSX.utils.sheet_add_aoa(worksheet, [[{ f: allottedGrandTotalFormula }]], { origin: { c: numCols - 1, r: totalAllottedRowIndex - 1 }});

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
