import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { StudentData, CurriculumData } from "../types";

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parseExcelKQGD(file: File): Promise<StudentData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

        // 1. Find the header block
        let headerStartRow = -1;
        for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
          const row = jsonData[i];
          if (row && row.some(cell => {
            const val = cell?.toString().toLowerCase().replace(/\s/g, "") || "";
            return (val.includes("họ") && val.includes("tên")) || val.includes("họtên");
          })) {
            headerStartRow = i;
            break;
          }
        }

        if (headerStartRow === -1) {
          throw new Error("Không tìm thấy cột 'Họ Tên' trong file Excel (Kiểm tra xem file có chứa cột 'Họ và tên' không).");
        }

        // 2. Find the data start row (first row with a numeric STT after header)
        let dataStartRow = -1;
        for (let i = headerStartRow + 1; i < Math.min(jsonData.length, 50); i++) {
          const sttValue = jsonData[i][0]; // Assuming STT is in the first column
          if (sttValue !== undefined && sttValue !== "" && !isNaN(Number(sttValue))) {
            dataStartRow = i;
            break;
          }
        }

        if (dataStartRow === -1) {
          dataStartRow = headerStartRow + 2; // Fallback to skip common double-headers
        }

        // 3. Pre-process headers (handle merged cells by filling forward)
        const headerBlock = jsonData.slice(headerStartRow, dataStartRow);
        const filledHeaders: string[][] = [];
        
        for (let r = 0; r < headerBlock.length; r++) {
          const row = [...headerBlock[r]];
          const filledRow: string[] = [];
          let lastVal = "";
          for (let c = 0; c < row.length; c++) {
            const val = row[c]?.toString().trim();
            if (val) {
              lastVal = val;
              filledRow[c] = val;
            } else {
              filledRow[c] = lastVal;
            }
          }
          filledHeaders.push(filledRow);
        }

        // 4. Map columns
        // We check across all header rows to find the best match for each key column
        const getColumnIndex = (keywords: string[]) => {
          const clean = (s: string) => s.toLowerCase().replace(/[\s,.\-_/]/g, "");
          for (let r = 0; r < filledHeaders.length; r++) {
            const row = filledHeaders[r];
            const idx = row.findIndex(cell => {
              const val = clean(cell || "");
              return keywords.some(k => val.includes(clean(k)));
            });
            if (idx !== -1) return idx;
          }
          return -1;
        };
        
        const sttIdx = getColumnIndex(["stt"]);
        const nameIdx = getColumnIndex(["họvàtên", "họtên", "hộtên", "tên học sinh"]);
        const dobIdx = getColumnIndex(["ngàysinh", "ngàythángnămsinh"]);
        const genderIdx = getColumnIndex(["nữ"]);

        // 5. Parse student data
        const students: StudentData[] = [];
        const dataRows = jsonData.slice(dataStartRow);

        dataRows.forEach((row) => {
          const sttValue = row[sttIdx]?.toString().trim();
          if (row[nameIdx] && sttValue && !isNaN(Number(sttValue))) {
            const details: string[] = [];
            const parsedResults: Record<string, string> = {};
            
            // Collect results from after "Nữ" column
            for (let col = genderIdx + 1; col < row.length; col++) {
              const val = row[col]?.toString().trim();
              if (val !== undefined && val !== "") {
                // Build composite label from filled headers
                let compositeLabel = "";
                const seenLabels = new Set<string>();
                
                for (let r = 0; r < filledHeaders.length; r++) {
                  const hVal = filledHeaders[r][col];
                  if (hVal && !seenLabels.has(hVal)) {
                    // Check if this label is just a repeat of a column name identifier like "1", "2" etc.
                    if (hVal.length > 2 || isNaN(Number(hVal))) {
                      compositeLabel += (compositeLabel ? " - " : "") + hVal.replace(/\r?\n|\r/g, " ");
                      seenLabels.add(hVal);
                    }
                  }
                }
                
                const finalLabel = compositeLabel || `Cột ${col}`;
                details.push(`${finalLabel}: ${val}`);
                parsedResults[finalLabel] = val;
              }
            }

            students.push({
              stt: Number(sttValue),
              id: "",
              name: row[nameIdx]?.toString().trim() || "",
              dob: row[dobIdx]?.toString().trim() || "",
              gender: row[genderIdx]?.toString().toUpperCase() === "X" ? "Nữ" : "Nam",
              results: details.join("; "),
              parsedResults
            });
          }
        });

        resolve(students);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function parseCurriculumExcel(file: File): Promise<CurriculumData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const curriculum: CurriculumData[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const text = XLSX.utils.sheet_to_txt(worksheet);
          if (text.trim()) {
            curriculum.push({
              subject: sheetName,
              content: text.slice(0, 5000) // Limit content per sheet
            });
          }
        });

        resolve(curriculum);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function parseCurriculumPDF(file: File): Promise<CurriculumData[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return [{
    subject: "Tổng hợp từ PDF",
    content: fullText.slice(0, 10000)
  }];
}
