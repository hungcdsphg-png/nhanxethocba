import { GoogleGenAI, Type } from "@google/genai";
import { StudentData, CurriculumData, GradeLevel } from "../types";

export async function generateStudentComment(
  apiKey: string,
  student: StudentData,
  curriculum: CurriculumData[],
  grade: GradeLevel,
  className: string
): Promise<string> {
  const genAI = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  const curriculumContext = curriculum
    .map((c) => `Môn ${c.subject}: ${c.content}`)
    .join("\n");

  const prompt = `
    Bạn là một giáo viên chủ nhiệm lớp ${className || grade} tại một trường tiểu học vùng cao, vùng dân tộc thiểu số Việt Nam. 
    Hãy viết lời nhận xét học bạ cuối năm cho một học sinh dựa trên dữ liệu sau.
    
    Dữ liệu đầu vào:
    - Giới tính: ${student.gender}
    - Khối lớp: ${grade}
    - Tên lớp: ${className || grade}
    - Kết quả học tập & Rèn luyện chi tiết: ${student.results || "Chưa có dữ liệu chi tiết"}
    
    Bối cảnh chương trình học (Phân phối chương trình):
    ${curriculumContext}
    
    YÊU CẦU NGHIÊM NGẶT VỀ CẤU TRÚC VÀ LỜI VĂN:
    1. KHÔNG nhắc tên học sinh trong lời nhận xét.
    2. KHÔNG xưng hô "con", "em", "học sinh" hay bất kỳ đại từ nhân xưng nào. Hãy viết trực tiếp vào hành động và kết quả (Ví dụ: thay vì "Em học tốt", hãy viết "Học tập chuyên cần, tiếp thu bài nhanh...").
    3. KHÔNG nhắc đến điểm số cụ thể (ví dụ: không viết "đạt 9 điểm", "Toán 10"). Chỉ nhận xét dựa trên mức độ hoàn thành và năng lực thực tế.
    4. Lời văn: Mộc mạc, giản dị, chân phương, phù hợp với đời sống học sinh vùng cao. Tránh dùng từ ngữ hoa mỹ, hàn lâm.
    5. TUYỆT ĐỐI KHÔNG sử dụng các cụm từ sáo rỗng, hào nhoáng như: "Xứng đáng được khen thưởng vì những nỗ lực vượt bậc và thành tích tiêu biểu trong năm học" hoặc các biến thể tương tự mang tính chất hành chính, máy móc.
    6. Phân tích kết quả:
       - Nếu đa số đạt mức 'T': Nhận xét theo hướng Hoàn thành tốt/Xuất sắc.
       - Nếu đa số đạt mức 'Đ': Nhận xét theo hướng Hoàn thành.
       - Nếu có môn 'C': Nhận xét thẳng thắn nhưng nhẹ nhàng về những phần chưa đạt.
    7. Khen thưởng: Nếu có khen thưởng (đánh dấu 'x'), hãy lồng ghép sự ghi nhận nỗ lực và kết quả tốt vào mạch văn chung một cách tự nhiên. TUYỆT ĐỐI KHÔNG thêm câu chốt về khen thưởng hay phần khen thưởng riêng biệt ở cuối nội dung nhận xét.
    8. Độ dài: Tối đa 850 ký tự.
    9. Định dạng: Chỉ trả về nội dung lời nhận xét.
  `;

  try {
    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text || "Không thể tạo nhận xét.";
  } catch (error) {
    console.error("Error generating comment:", error);
    return "Lỗi khi tạo nhận xét.";
  }
}
