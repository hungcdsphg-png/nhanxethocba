export interface StudentData {
  stt: number;
  id: string;
  name: string;
  dob: string;
  gender: string;
  results?: string; // Raw data string for AI
  parsedResults?: Record<string, string>; // Structured data for display
  comment?: string;
  generatedForGrade?: string;
  generatedForClass?: string;
}

export interface CurriculumData {
  subject: string;
  content: string;
}

export type GradeLevel = "1" | "2" | "3" | "4" | "5";

export interface AppState {
  students: StudentData[];
  curriculum: CurriculumData[];
  grade: GradeLevel;
  className: string;
  isAnalyzing: boolean;
  error?: string;
}
