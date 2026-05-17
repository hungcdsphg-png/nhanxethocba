import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileSpreadsheet, 
  BookOpen, 
  Sparkles, 
  Download, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Square,
  Key,
  ExternalLink
} from "lucide-react";
import * as XLSX from "xlsx";
import { FileUpload } from "./components/FileUpload";
import { StudentData, CurriculumData, GradeLevel } from "./types";
import { parseExcelKQGD, parseCurriculumExcel, parseCurriculumPDF } from "./lib/parsers";
import { generateStudentComment } from "./lib/gemini";
import { cn } from "./lib/utils";

export default function App() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumData[]>([]);
  const [grade, setGrade] = useState<GradeLevel>("1");
  const [className, setClassName] = useState("");
  const [isProcessingKQGD, setIsProcessingKQGD] = useState(false);
  const [isProcessingCurriculum, setIsProcessingCurriculum] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stopRef = useRef(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleKQGDUpload = async (file: File) => {
    setIsProcessingKQGD(true);
    setError(null);
    try {
      const data = await parseExcelKQGD(file);
      setStudents(data);
    } catch (err: any) {
      setError("Lỗi khi đọc file KQGD: " + err.message);
    } finally {
      setIsProcessingKQGD(false);
    }
  };

  const handleCurriculumUpload = async (file: File) => {
    setIsProcessingCurriculum(true);
    setError(null);
    try {
      let data: CurriculumData[] = [];
      if (file.name.endsWith(".pdf")) {
        data = await parseCurriculumPDF(file);
      } else {
        data = await parseCurriculumExcel(file);
      }
      setCurriculum(data);
    } catch (err: any) {
      setError("Lỗi khi đọc file Phân phối chương trình: " + err.message);
    } finally {
      setIsProcessingCurriculum(false);
    }
  };

  const generateAllComments = async () => {
    if (students.length === 0) return;
    if (!userApiKey.trim()) {
      setError("Vui lòng nhập mã Gemini API Key để sử dụng tính năng này.");
      return;
    }
    
    localStorage.setItem("gemini_api_key", userApiKey);
    setIsAnalyzing(true);
    stopRef.current = false;
    setProgress({ current: 0, total: students.length });
    setError(null);

    const updatedStudents = [...students];
    
    for (let i = 0; i < updatedStudents.length; i++) {
      if (stopRef.current) break;
      
      let success = false;
      let retries = 0;
      const maxRetries = 2; // Thử lại tối đa 2 lần (tổng cộng 3 lần thử)

      while (!success && retries <= maxRetries && !stopRef.current) {
        try {
          const comment = await generateStudentComment(
            userApiKey,
            updatedStudents[i], 
            curriculum, 
            grade, 
            className
          );
          updatedStudents[i] = { 
            ...updatedStudents[i], 
            comment,
            generatedForGrade: grade,
            generatedForClass: className
          };
          setStudents([...updatedStudents]);
          setProgress(prev => ({ ...prev, current: i + 1 }));
          success = true;
        } catch (err) {
          retries++;
          console.error(`Lỗi tạo nhận xét cho ${updatedStudents[i].name} (Lần thử ${retries}):`, err);
          
          if (retries <= maxRetries && !stopRef.current) {
            // Đợi 1 giây trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // Nếu đã thử hết số lần mà vẫn lỗi, bỏ qua và tiếp tục học sinh tiếp theo
            console.warn(`Đã thử ${retries} lần cho ${updatedStudents[i].name} nhưng vẫn thất bại. Chuyển sang học sinh kế tiếp.`);
            setProgress(prev => ({ ...prev, current: i + 1 }));
            break; 
          }
        }
      }
    }
    
    setIsAnalyzing(false);
  };

  const stopAnalysis = () => {
    stopRef.current = true;
    setIsAnalyzing(false);
  };

  const updateStudentComment = (index: number, newComment: string) => {
    const updatedStudents = [...students];
    updatedStudents[index] = { ...updatedStudents[index], comment: newComment };
    setStudents(updatedStudents);
  };

  const exportToExcel = () => {
    const dataToExport = students.map(s => ({
      "STT": s.stt,
      "Mã định danh": s.id,
      "Họ và tên": s.name,
      "Ngày sinh": s.dob,
      "Giới tính": s.gender,
      "Nhận xét của GVCN": s.comment || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NhanXet");
    XLSX.writeFile(workbook, "Nhan_Xet_Hoc_Ba.xlsx");
  };

  const clearAll = () => {
    setStudents([]);
    setCurriculum([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Trợ lý Nhận xét Học bạ</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Hệ thống hỗ trợ GVCN Tiểu học</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            {students.length > 0 && (
              <button
                onClick={clearAll}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Xóa tất cả dữ liệu"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="font-semibold flex items-center gap-2 text-slate-800">
                <Key className="w-5 h-5 text-amber-500" />
                Cấu hình Gemini API
              </h2>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Gemini API Key</label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    Lấy mã miễn phí <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => {
                      setUserApiKey(e.target.value);
                      localStorage.setItem("gemini_api_key", e.target.value);
                    }}
                    placeholder="Dán mã API vào đây..."
                    className="w-full px-4 py-2 pr-10 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-mono text-sm"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Mã API được lưu trên trình duyệt của bạn và không gửi đi đâu khác ngoài Google Gemini.
                </p>
              </div>

              <div className="h-px bg-slate-100" />

              <h2 className="font-semibold flex items-center gap-2 text-slate-800">
                <Layers className="w-5 h-5 text-blue-500" />
                Cấu hình chung
              </h2>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Chọn khối lớp</label>
                <div className="grid grid-cols-5 gap-2">
                  {(["1", "2", "3", "4", "5"] as GradeLevel[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrade(g)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-bold transition-all border",
                        grade === g
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                          : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-500"
                      )}
                    >
                      Lớp {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Tên lớp (Ví dụ: 2B, 3A...)</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Nhập tên lớp..."
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="h-px bg-slate-100" />

              <h2 className="font-semibold flex items-center gap-2 text-slate-800">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                Tải lên dữ liệu
              </h2>
              
              <FileUpload
                label="1. File Tổng hợp KQGD (Excel)"
                accept=".xlsx, .xls"
                onFileSelect={handleKQGDUpload}
                isProcessing={isProcessingKQGD}
                status={students.length > 0 ? "success" : "idle"}
                fileName={students.length > 0 ? `Đã tải ${students.length} học sinh` : undefined}
              />

              <FileUpload
                label="2. Phân phối chương trình (PDF/Excel)"
                accept=".pdf, .xlsx, .xls"
                onFileSelect={handleCurriculumUpload}
                isProcessing={isProcessingCurriculum}
                status={curriculum.length > 0 ? "success" : "idle"}
                fileName={curriculum.length > 0 ? `Đã tải dữ liệu chương trình` : undefined}
              />

              <div className="pt-4 border-t border-slate-100 space-y-3">
                {isAnalyzing ? (
                  <button
                    onClick={stopAnalysis}
                    className="w-full py-3 px-4 bg-rose-50 text-rose-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-rose-100 transition-all border border-rose-200 active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Dừng lại
                  </button>
                ) : (
                  <button
                    onClick={generateAllComments}
                    disabled={students.length === 0}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md",
                      students.length === 0
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                    )}
                  >
                    <Sparkles className="w-5 h-5" />
                    Tạo nhận xét tự động
                  </button>
                )}
                
                {students.some(s => s.comment) && !isAnalyzing && (
                  <button
                    onClick={exportToExcel}
                    className="w-full mt-3 py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98]"
                  >
                    <Download className="w-5 h-5" />
                    Xuất file Excel
                  </button>
                )}
              </div>
            </section>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 leading-relaxed">
                <p className="font-semibold mb-1">Hướng dẫn:</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio</a> để lấy mã API miễn phí.</li>
                  <li>Dán mã API vào mục "Cấu hình Gemini API" để kích hoạt tính năng tạo nhận xét.</li>
                  <li>Tải lên file kết quả giáo dục để lấy danh sách học sinh.</li>
                  <li>Tải lên phân phối chương trình để AI có ngữ cảnh môn học.</li>
                  <li>Lời nhận xét sẽ bám sát chương trình và kết quả riêng của từng em.</li>
                  <li>Độ dài nhận xét được tối ưu khoảng 850 ký tự.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content - Table */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="font-semibold text-slate-800">Bảng Tổng hợp KQGD & Nhận xét</h2>
                {students.length > 0 && (
                  <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full uppercase">
                    {students.length} Học sinh
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-x-auto">
                {students.length > 0 ? (
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-[5]">
                      <tr>
                        <th className="px-4 py-3 border-b border-slate-100 w-12 text-center">STT</th>
                        <th className="px-4 py-3 border-b border-slate-100 min-w-[180px]">Học sinh</th>
                        <th className="px-4 py-3 border-b border-slate-100 min-w-[350px]">Kết quả đánh giá chi tiết</th>
                        <th className="px-4 py-3 border-b border-slate-100 min-w-[400px]">Lời nhận xét (850 ký tự)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence mode="popLayout">
                        {students.map((student, idx) => (
                          <motion.tr
                            key={student.id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-4 py-4 text-sm text-slate-400 font-mono text-center">{student.stt}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-700">{student.name}</span>
                                <span className="text-[10px] text-slate-400">{student.dob} • {student.gender}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {student.parsedResults && Object.entries(student.parsedResults).map(([key, val], i) => (
                                  <div key={i} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex gap-1">
                                    <span className="text-slate-500 font-medium">{key.split(' - ').pop()}:</span>
                                    <span className={cn(
                                      "font-bold",
                                      val === 'T' || val === 'x' ? "text-blue-600" : 
                                      val === 'Đ' ? "text-emerald-600" : 
                                      val === 'C' ? "text-rose-600" : "text-slate-700"
                                    )}>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {student.comment !== undefined ? (
                                <div className="relative">
                                  <textarea
                                    value={student.comment}
                                    onChange={(e) => updateStudentComment(idx, e.target.value)}
                                    className="w-full text-xs text-slate-600 leading-relaxed whitespace-pre-wrap italic bg-blue-50/30 p-2 rounded-lg border border-blue-100/50 focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[100px] resize-y"
                                    placeholder="Nhập lời nhận xét..."
                                  />
                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                                        student.comment.length > 850 ? "bg-rose-100 text-rose-600" : 
                                        student.comment.length > 800 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                                      )}>
                                        {student.comment.length} / 850 ký tự
                                      </span>
                                      {student.generatedForClass && (
                                        <span className="text-[9px] text-slate-400 italic">
                                          Lớp: {student.generatedForClass}
                                        </span>
                                      )}
                                    </div>
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-300 italic text-xs">
                                  {isAnalyzing && progress.current <= idx ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                      <span>Đang tạo...</span>
                                    </div>
                                  ) : (
                                    "Chờ phân tích"
                                  )}
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-slate-600 font-semibold mb-2">Chưa có dữ liệu học sinh</h3>
                    <p className="text-slate-400 text-sm max-w-xs">
                      Vui lòng tải lên file Excel kết quả giáo dục ở cột bên trái để bắt đầu.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Overlay */}
      {isAnalyzing && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xl flex flex-col gap-4 min-w-[280px]">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="4"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * progress.current) / progress.total}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-blue-600">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Đang xử lý...</p>
                <p className="text-xs text-slate-400">{progress.current} / {progress.total} học sinh</p>
              </div>
            </div>
            
            <button
              onClick={stopAnalysis}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Square className="w-3 h-3 fill-current" />
              Dừng lại & Chọn khối khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
