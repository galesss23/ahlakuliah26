
import { GoogleGenAI, Type } from "@google/genai";
import { Question, ExamType } from '../types';
import { fetchSubjects } from './storageService';

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY or API_KEY is not set. AI features will be disabled.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "Teks pertanyaan ujian" },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Tepat 4 pilihan jawaban"
    },
    correctAnswerIndex: { type: Type.INTEGER, description: "Index jawaban benar (0-3)" },
    subject: { type: Type.STRING },
    explanation: { type: Type.STRING, description: "Penjelasan singkat jawaban benar" }
  },
  required: ["text", "options", "correctAnswerIndex", "subject", "explanation"]
};

export const generateQuestions = async (subjectName: string, examType: ExamType = 'LATIHAN', allowAI: boolean = true): Promise<Question[]> => {
  if (!allowAI) {
    const subs = await fetchSubjects();
    const current = subs.find(s => s.name === subjectName);
    return current?.questions || [];
  }

  const ai = getAI();
  if (!ai) {
    throw new Error("API Key tidak konfigurasi. Hubungi Admin.");
  }

  const model = 'gemini-3-flash-preview';
  const count = 30;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Buatkan daftar 30 soal pilihan ganda (Multiple Choice) yang menantang untuk mata kuliah "${subjectName}". Tipe ujian: ${examType}. Pastikan variasi tingkat kesulitan dari mudah sampai sulit. Jawaban dalam Bahasa Indonesia.`,
      config: {
        systemInstruction: `Anda adalah profesor ahli di bidang ${subjectName}. Hasilkan tepat ${count} soal unik dalam format JSON array. Setiap soal harus memiliki 4 pilihan jawaban (A, B, C, D). Gunakan Bahasa Indonesia formal akademik.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: questionSchema
        }
      }
    });

    const rawText = response.text || "[]";
    const parsed = JSON.parse(rawText);
    
    if (Array.isArray(parsed)) {
      return parsed.map((q: any, i: number) => ({
        ...q,
        id: `ai-q-${Date.now()}-${i}`,
        subject: subjectName
      }));
    }
    throw new Error("Format soal AI tidak valid.");
  } catch (err: any) {
    console.error("Gemini failed to generate 30 questions:", err);
    if (err.message?.includes('429')) {
      throw new Error("Kuota AI harian telah habis (Limit 429). Silakan coba lagi besok.");
    }
    if (err.message?.includes('safety')) {
      throw new Error("Materi soal terfilter oleh sistem keamanan AI. Coba gunakan mata kuliah lain.");
    }
    throw new Error(err.message || "Gagal menghubungi AI.");
  }
};

export const generateQuestionsFromTopic = async (subject: string, topic: string, count: number, type: ExamType): Promise<Question[]> => {
  const ai = getAI();
  if (!ai) return [];

  const model = 'gemini-3-flash-preview';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Buatkan ${count} soal ${type} untuk ${subject} dengan fokus pada topik: ${topic}.`,
      config: {
        systemInstruction: "Hasilkan soal dalam format JSON array yang valid. Gunakan Bahasa Indonesia.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: questionSchema
        }
      }
    });
    const parsed = JSON.parse(response.text || "[]");
    return parsed.map((q: any, i: number) => ({ ...q, id: `ai-topic-${Date.now()}-${i}` }));
  } catch (err) {
    return [];
  }
};
