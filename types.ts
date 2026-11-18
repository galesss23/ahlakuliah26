
export enum Subject {
  UXD = 'User Experience Design',
  SISDIG = 'Sistem Digital',
  SBD = 'Sistem Basis Data',
  KALKULUS = 'Kalkulus',
  MATEMATIKA_DISKRET = 'Matematika Diskrit',
  DPL_UI_UX = 'Desain Perangkat Lunak UI & UX',
  COMPREHENSIVE = 'Ujian Komprehensif (Semua Mata Kuliah)'
}

export type UserRole = 'ADMIN' | 'DOSEN' | 'MAHASISWA';
export type ExamType = 'LATIHAN' | 'UTS' | 'UAS';
export type ExamMode = 'STANDARD' | 'LEARNING'; 

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number; 
  subject: string;
  explanation?: string; 
}

export interface LearningMaterial {
  id: string;
  title: string;
  description?: string;
  type: 'VIDEO' | 'PDF' | 'TEXT' | 'LINK';
  content: string; 
  createdAt: string;
}

export interface ForumMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  timestamp: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  duration?: number;
  token?: string;
  lecturerId?: string; 
  enrolledStudentIds?: string[]; 
  questions?: Question[];
  materials?: LearningMaterial[]; 
  forum?: ForumMessage[];
  assignments?: Assignment[];
}

export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  lecturerId: string;
  attachments?: string[]; 
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  content: string; 
  fileName?: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
}

export interface StudentRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  subject: string;
  examType: ExamType; 
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  startTime: string;
  endTime: string;
  violations: number; 
  snapshot?: string;
  confidenceScore?: number; 
  suspiciousPatterns?: string[]; 
  // Keep old fields for safety during transition
  nim?: string;
  name?: string;
  timestamp?: string;
}

export interface ExamConfig {
  studentId: string;
  studentName: string;
  studentNim: string;
  subject: string;
  examType: ExamType;
  mode: ExamMode;
  duration: number;
  startTime: string;
}

export interface AppSettings {
  appName: string;
  logoUrl: string;
  ogImageUrl?: string;
  backgroundUrl?: string;
  runningText?: string;
  footerText?: string;
}

export interface UserData {
  id: string;
  username: string; 
  password?: string; 
  fullName: string;
  role: UserRole;
  className?: string;
  followedSubjectIds?: string[];
  whatsapp?: string;
  createdAt: string;
}
