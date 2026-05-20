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
    3. KHÔNG đưa con số điểm cụ thể (ví dụ: không viết "đạt 9 điểm", "Toán 10") vào lời nhận xét. Chỉ lấy điểm số làm cơ sở ngầm để đánh giá một cách sát sao.
    4. Lời văn: Tự nhiên, mộc mạc, chân phương, phù hợp với đời sống học sinh vùng cao. Tránh dùng từ ngữ hoa mỹ, sáo rỗng.
    5. TUYỆT ĐỐI KHÔNG sử dụng các cụm từ sáo rỗng kiểu hành chính như: "Xứng đáng được khen thưởng vì những nỗ lực vượt bậc...", v.v.
    6. Phân tích kết quả - BẮT BUỘC PHẢI LUẬN TỪ ĐIỂM (Điểm KTĐK) VÀ MỨC ĐẠT ĐƯỢC:
       - Phân tích Điểm KTĐK (thang điểm 10): Điểm 9-10 (nắm chắc kiến thức, học rất tốt), Điểm 7-8 (học khá, hiểu bài nhưng có thể còn sơ suất), Điểm 5-6 (học trung bình, tiếp thu chậm), <5 (cần cố gắng rất nhiều).
       - Phân tích Mức đạt được chữ cái: Môn học (T: Tốt, H: Hoàn thành, C: Chưa hoàn thành); Năng lực/Phẩm chất (T: Tốt, Đ: Đạt, C: Cần cố gắng).
       - Tổng hợp chéo: Ví dụ Toán cao nhưng Tiếng Việt thấp, thì nhận xét có thế mạnh tính toán nhưng đọc/viết cần rèn thêm; hoặc phẩm chất đều T nhưng điểm số chỉ H thì nhận xét ngoan ngoãn, chăm chỉ nhưng cần tăng cường học tập. Hãy luân phiên linh hoạt để mỗi học sinh có lời nhận xét cá nhân hóa và sát nhất.
    7. Khen thưởng: Nếu có khen thưởng (đánh dấu 'x'), hãy lồng ghép sự ghi nhận nỗ lực vào mạch văn chung tự nhiên, tuyệt đối không tách riêng thành một câu khen thưởng cứng nhắc ở cuối.
    8. Độ dài: Khoảng 3-5 câu (tối đa 850 ký tự), ngắn gọn, đúng trọng tâm.
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
