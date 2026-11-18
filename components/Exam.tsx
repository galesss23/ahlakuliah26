
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question, ExamConfig, StudentRecord } from '../types';
import { saveResult } from '../services/storageService';
import { 
  CheckCircle, Clock, AlertOctagon, Save, Home, XCircle, Check, X, 
  AlertTriangle, Loader2, FileDown, HelpCircle, Cloud, Type, Palette, 
  Moon, Sun, BookOpen, User, BarChart3, Camera, Settings2, 
  ChevronLeft, ChevronRight, Flag, Grid3X3, Info, AlertCircle, Eye, EyeOff,
  ShieldAlert
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ExamProps {
  questions: Question[];
  config: ExamConfig;
  onFinish: () => void;
}

interface ExamResultState {
  score: number;
  correct: number;
  wrong: number;
  empty: number;
  confidenceScore: number;
  suspiciousPatterns: string[];
  violationLog: { type: string; timestamp: string }[];
}

const Exam: React.FC<ExamProps> = ({ questions, config, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({}); 
  const [timeLeft, setTimeLeft] = useState(config.duration * 60); 
  const [violations, setViolations] = useState(0);
  const [violationLog, setViolationLog] = useState<{ type: string; timestamp: string }[]>([]);
  const [isCheatDetected, setIsCheatDetected] = useState(false);
  const [violationReason, setViolationReason] = useState(""); 
  const [isFlashing, setIsFlashing] = useState(false); 
  const [submitted, setSubmitted] = useState(false);
  const [examResult, setExamResult] = useState<ExamResultState | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - cameraPos.x,
      y: clientY - cameraPos.y
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setCameraPos({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y
      });
    };
    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);
  
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xl'>(() => (localStorage.getItem('cbt_text_size') as any) || 'normal');
  const [colorTheme, setColorTheme] = useState<'light' | 'sepia' | 'dark'>(() => (localStorage.getItem('cbt_theme') as any) || 'light');
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('cbt_theme', colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    localStorage.setItem('cbt_text_size', textSize);
  }, [textSize]);
  
  const answersRef = useRef(answers);
  const violationsRef = useRef(violations);
  const submittedRef = useRef(submitted);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const appearanceMenuRef = useRef<HTMLDivElement>(null);

  const sessionKey = `cbt_session_${config.studentNim}_${config.subject.replace(/\s+/g, '_')}`;
  const isLearningMode = config.mode === 'LEARNING';

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  const handleViolation = useCallback((reason: string) => {
    if (submittedRef.current || isLearningMode) return;
    const newCount = violationsRef.current + 1;
    const timestamp = new Date().toLocaleTimeString();
    
    setViolations(newCount);
    setViolationReason(reason);
    setViolationLog(prev => [...prev, { type: reason, timestamp }]);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 500);

    if (newCount < 5) {
      setIsCheatDetected(true);
    } else {
      handleSubmit(true);
    }
  }, [isLearningMode]);

  useEffect(() => {
    if (submitted || isLearningMode) return;
    const startCamera = async () => {
      setCameraError(null);
      try {
        // Use more standard constraints
        const constraints = {
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: "user"
          }, 
          audio: false 
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraActive(true);
      } catch (err: any) {
        console.error("Camera access error:", err);
        let errorMsg = "Akses Kamera Ditolak / Kamera Tidak Ditemukan";
        
        if (err.name === 'NotAllowedError') {
          errorMsg = "Izin Kamera Ditolak. Harap izinkan akses kamera di pengaturan browser Anda dan segarkan halaman.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = "Perangkat Kamera tidak ditemukan. Gunakan perangkat dengan kamera untuk mengikuti ujian.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = "Kamera sedang digunakan oleh aplikasi lain. Harap tutup aplikasi lain dan segarkan halaman.";
        }
        
        setCameraError(errorMsg);
        handleViolation(errorMsg);
      }
    };
    startCamera();

    const handleVisibility = () => {
      if (document.hidden) handleViolation("Beralih Tab / Meninggalkan Halaman");
    };
    const handleBlur = () => handleViolation("Fokus Browser Hilang");
    
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [submitted, isLearningMode, handleViolation]);

  const captureSnapshot = useCallback(() => {
    if (videoRef.current && cameraActive) {
      const video = videoRef.current;
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      
      if (!vWidth || !vHeight) return undefined;
      
      const canvas = document.createElement('canvas');
      
      // Target a reasonable size while strictly preserving aspect ratio
      const targetWidth = 480; 
      const ratio = vWidth / vHeight;
      
      canvas.width = targetWidth;
      canvas.height = targetWidth / ratio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Record non-mirrored for natural look in dashboard
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', 0.8);
      }
    }
    return undefined;
  }, [cameraActive]);

  const handleSubmit = useCallback((forced = false) => {
    if (submittedRef.current) return;
    const snapshot = captureSnapshot();
    submittedRef.current = true;
    
    let correct = 0;
    let filled = 0;
    questions.forEach(q => {
      const ans = answersRef.current[q.id];
      if (ans !== undefined) {
        filled++;
        if (ans === q.correctAnswerIndex) correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    const result: ExamResultState = {
      score,
      correct,
      wrong: filled - correct,
      empty: questions.length - filled,
      confidenceScore: Math.max(0, 100 - (violationsRef.current * 20)),
      suspiciousPatterns: violationLog.map(v => `${v.type} pada ${v.timestamp}`),
      violationLog
    };

    setExamResult(result);
    setSubmitted(true);
    localStorage.removeItem(sessionKey);
    saveResult({
      id: Date.now().toString(),
      studentId: config.studentId,
      studentName: config.studentName,
      studentNim: config.studentNim,
      subject: config.subject,
      examType: config.examType,
      score,
      totalQuestions: questions.length,
      correctAnswers: correct,
      startTime: config.startTime,
      endTime: new Date().toISOString(),
      violations: violationsRef.current,
      snapshot,
      confidenceScore: result.confidenceScore,
      suspiciousPatterns: result.suspiciousPatterns
    });
  }, [questions, config, sessionKey, violationLog, captureSnapshot]);

  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted, handleSubmit]);

  const handleAnswer = (idx: number) => {
    if (submitted) return;
    const qId = questions[currentIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: idx }));
  };

  const toggleMarked = () => {
    const qId = questions[currentIndex].id;
    setMarked(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const getThemeClasses = () => {
    if (colorTheme === 'sepia') return { 
      bg: 'bg-[#f4ecd8]', 
      text: 'text-[#433422]', 
      card: 'bg-[#fdf6e3] border-[#eaddc5]', 
      btn: 'bg-[#433422] text-[#f4ecd8]',
      header: 'bg-[#fdf6e3]/80 border-[#eaddc5]',
      footer: 'bg-[#fdf6e3]/95 border-[#eaddc5]',
      option: 'bg-[#f8f1e1] border-[#eaddc5] text-[#433422]',
      optionActive: 'border-[#433422] bg-[#efdfb8] shadow-lg',
      optionNumber: 'bg-[#433422]/10 text-[#433422]',
      optionNumberActive: 'bg-[#433422] text-[#f4ecd8]',
      nav: 'bg-[#fdf6e3] border-[#eaddc5]'
    };
    if (colorTheme === 'dark') return { 
      bg: 'bg-slate-950', 
      text: 'text-slate-100', 
      card: 'bg-slate-900 border-slate-800', 
      btn: 'bg-blue-600 text-white',
      header: 'bg-slate-900/80 border-slate-800',
      footer: 'bg-slate-900/95 border-slate-800',
      option: 'bg-slate-800/50 border-slate-800 text-slate-100',
      optionActive: 'border-blue-600 bg-blue-900/20 shadow-xl shadow-blue-950/50',
      optionNumber: 'bg-slate-700 text-slate-400',
      optionNumberActive: 'bg-blue-600 text-white',
      nav: 'bg-slate-900 border-slate-800'
    };
    return { 
      bg: 'bg-slate-50', 
      text: 'text-slate-900', 
      card: 'bg-white border-slate-200', 
      btn: 'bg-blue-600 text-white',
      header: 'bg-white/80 border-slate-200',
      footer: 'bg-white/95 border-slate-200',
      option: 'bg-white border-slate-100 text-slate-700',
      optionActive: 'border-blue-600 bg-blue-50/50 shadow-xl',
      optionNumber: 'bg-slate-100 text-slate-400',
      optionNumberActive: 'bg-blue-600 text-white',
      nav: 'bg-white border-slate-200'
    };
  };

  const theme = getThemeClasses();
  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;

  if (submitted && examResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
        <div ref={resultRef} className="bg-white p-6 md:p-12 rounded-[32px] md:rounded-[48px] shadow-2xl max-w-4xl w-full border border-slate-200 my-4 md:my-8 animate-in fade-in zoom-in duration-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-10 pb-6 md:pb-8 border-b gap-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-slate-800 flex items-center gap-3"><CheckCircle className="text-green-500 w-8 h-8 md:w-10 md:h-10" /> Ujian Selesai</h2>
              <p className="text-slate-400 font-bold text-[10px] md:text-sm uppercase tracking-widest mt-1 md:mt-2">{config.subject} • {config.examType}</p>
            </div>
            <div className="sm:text-right">
              <p className="font-black text-lg md:text-xl text-slate-800">{config.studentName}</p>
              <p className="text-xs md:text-sm font-mono text-slate-400">{config.studentNim}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
            <div className="bg-slate-50 p-8 md:p-10 rounded-[32px] md:rounded-[40px] border border-slate-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Nilai Akhir</p>
              <h3 className={`text-5xl md:text-7xl font-black ${examResult.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>{examResult.score}</h3>
              <div className={`mt-3 md:mt-4 px-4 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase ${examResult.score >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{examResult.score >= 60 ? 'LULUS' : 'GAGAL'}</div>
            </div>
            <div className="md:col-span-2 bg-slate-900 p-8 md:p-10 rounded-[32px] md:rounded-[40px] text-white flex flex-col justify-center">
              <p className="text-[10px] md:text-xs font-black text-white/40 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Integritas Sistem</p>
              <div className="space-y-4 md:space-y-6">
                <div>
                  <div className="flex justify-between text-xs md:text-sm font-black mb-2"><span>Confidence Score</span><span>{examResult.confidenceScore}%</span></div>
                  <div className="w-full h-2 md:h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${examResult.confidenceScore > 80 ? 'bg-green-500' : examResult.confidenceScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${examResult.confidenceScore}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
                  <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl"><p className="text-[8px] md:text-[10px] font-bold text-white/40 mb-1 uppercase">BENAR</p><p className="text-lg md:text-xl font-black text-green-400">{examResult.correct}</p></div>
                  <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl"><p className="text-[8px] md:text-[10px] font-bold text-white/40 mb-1 uppercase">SALAH</p><p className="text-lg md:text-xl font-black text-red-400">{examResult.wrong}</p></div>
                  <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl"><p className="text-[8px] md:text-[10px] font-bold text-white/40 mb-1 uppercase">KOSONG</p><p className="text-lg md:text-xl font-black text-slate-400">{examResult.empty}</p></div>
                </div>
              </div>
            </div>
          </div>

          {examResult.suspiciousPatterns.length > 0 && (
            <div className="mb-8 md:mb-12 bg-red-50 p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-red-100">
              <h4 className="text-red-800 font-black text-[10px] md:text-sm uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Log Aktivitas Mencurigakan</h4>
              <ul className="space-y-1 md:space-y-2">
                {examResult.suspiciousPatterns.map((p, i) => (
                  <li key={i} className="text-xs md:text-sm text-red-600 font-medium flex gap-2"><span>•</span> {p}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={onFinish} className="w-full bg-slate-900 text-white py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-base md:text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform active:scale-[0.98] shadow-2xl shadow-slate-200">
            <Home className="w-5 h-5 md:w-6 md:h-6" /> SELESAI & KEMBALI
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const userAns = answers[currentQ.id];
  const isMarked = marked[currentQ.id];

  return (
    <div className={`min-h-screen flex flex-col relative transition-colors duration-500 overflow-hidden select-none ${theme.bg} ${theme.text}`}>
      {isFlashing && <div className="fixed inset-0 z-[120] border-[12px] border-red-600 animate-pulse pointer-events-none bg-red-600/10"></div>}
      
      {/* Real-time Time Progress Bar at the very top */}
      {!submitted && (
        <div className="fixed top-0 left-0 w-full h-1.5 z-[120] bg-slate-200/50 backdrop-blur-sm">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 300 ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'}`} 
            style={{ width: `${(timeLeft / (config.duration * 60)) * 100}%` }}
          ></div>
        </div>
      )}

      {isCheatDetected && (
        <div className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-12 max-w-lg w-full text-center shadow-[0_0_100px_rgba(239,68,68,0.3)]">
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 animate-bounce">
              <AlertOctagon className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900 uppercase tracking-tighter">PERINGATAN KERAS!</h2>
            <div className="bg-red-50 p-6 rounded-3xl mb-8 border border-red-100">
              <p className="text-red-800 font-bold leading-relaxed">{violationReason}</p>
            </div>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed">Pelanggaran telah dicatat dalam sistem dan akan dilaporkan ke pengawas ujian. Pelanggaran ke-5 akan membatalkan ujian Anda secara otomatis.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setIsCheatDetected(false)} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-red-200 hover:bg-red-700 transition active:scale-95">SAYA MENGERTI</button>
              {cameraError && (
                <button onClick={() => { setIsCheatDetected(false); window.location.reload(); }} className="w-full bg-slate-100 text-slate-600 py-4 rounded-3xl font-bold text-sm hover:bg-slate-200 transition">MUAT ULANG HALAMAN</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proctoring Monitor (Draggable) */}
      {!submitted && !isLearningMode && (
        <div 
          style={{ transform: `translate(${cameraPos.x}px, ${cameraPos.y}px)` }}
          className={`fixed bottom-24 right-4 md:bottom-32 md:right-8 z-[100] w-32 md:w-48 bg-slate-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700 group transition-shadow ${isDragging ? 'shadow-[0_0_50px_rgba(0,0,0,0.3)] scale-105' : ''}`}
        >
          <div 
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="relative aspect-video bg-black cursor-move active:cursor-grabbing"
          >
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-1000 pointer-events-none ${cameraActive ? 'opacity-100' : 'opacity-0'}`} />
            <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-white tracking-widest bg-black/40 px-2 py-0.5 rounded-full">PROCTOR LIVE</span>
            </div>
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                <Camera className="w-8 h-8 mb-2 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest">Searching Cam...</span>
              </div>
            )}
          </div>
          <div className="p-3 flex justify-between items-center text-white/40 pointer-events-none">
             <div className="flex gap-1"><div className="w-1 h-3 bg-blue-500 rounded-full"></div><div className="w-1 h-5 bg-blue-500 rounded-full"></div><div className="w-1 h-2 bg-blue-500 rounded-full"></div></div>
             <span className="text-[9px] font-bold">ENC: AES-256</span>
          </div>
        </div>
      )}

      <header className={`backdrop-blur-md border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-[110] shadow-sm transition-all duration-500 ${theme.header}`}>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
            <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="max-w-[120px] sm:max-w-[200px] md:max-w-none">
            <h1 className={`font-black leading-tight text-sm md:text-lg truncate ${theme.text}`}>{config.subject}</h1>
            <p className="text-[8px] md:text-[10px] opacity-50 font-black uppercase tracking-[1px] md:tracking-[2px] truncate">{config.studentName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className={`flex flex-col items-center px-4 md:px-8 py-1.5 md:py-2 rounded-2xl md:rounded-[28px] font-mono font-black border-2 transition-all shadow-lg min-w-[120px] md:min-w-[180px] ${timeLeft < 300 ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-slate-900 text-white border-slate-700'}`}>
            <span className={`text-[7px] md:text-[9px] uppercase tracking-[2px] md:tracking-[4px] mb-0.5 md:mb-1 ${timeLeft < 300 ? 'text-white/80' : 'text-slate-500'}`}>Sisa Waktu</span>
            <div className="flex items-center gap-2 md:gap-3 text-lg md:text-3xl">
              <Clock className={`w-4 h-4 md:w-6 md:h-6 ${timeLeft < 300 ? 'text-white' : 'text-blue-400'}`} />
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={() => setShowNav(!showNav)} className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition shadow-sm ${showNav ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Grid3X3 className="w-5 h-5 md:w-6 md:h-6" /></button>
            <button onClick={() => setShowAppearanceMenu(!showAppearanceMenu)} className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition shadow-sm ${showAppearanceMenu ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Settings2 className="w-5 h-5 md:w-6 md:h-6" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 md:p-10 relative z-10 overflow-y-auto custom-scrollbar">
        <div className="mb-6 md:mb-10 animate-in fade-in duration-700">
          <div className="flex justify-between items-end mb-3 md:mb-4">
            <span className="text-[8px] md:text-[10px] font-black text-blue-600 uppercase tracking-[2px] md:tracking-[3px]">Kemajuan Ujian</span>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"></div><span className="text-[8px] font-black text-slate-400">DIJAWAB</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200"></div><span className="text-[8px] font-black text-slate-400">BELUM</span></div>
              </div>
              <span className="text-xs md:text-sm font-black text-slate-400 tabular-nums">{Object.keys(answers).length} / {questions.length} Terjawab</span>
            </div>
          </div>
          
          <div className="w-full h-2 md:h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner mb-6 md:mb-8">
            <div className="bg-blue-600 h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}></div>
          </div>

          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = currentIndex === idx;
              return (
                <div 
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`
                    w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center text-[10px] font-black cursor-pointer transition-all
                    ${isCurrent ? 'ring-2 ring-blue-600 scale-110 z-10' : ''}
                    ${isAnswered ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}
                  `}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`flex-1 rounded-[32px] md:rounded-[48px] p-6 md:p-16 shadow-2xl border transition-all duration-700 flex flex-col animate-in slide-in-from-bottom-8 ${theme.card}`}>
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <span className="bg-blue-600/10 text-blue-600 text-[8px] md:text-[10px] font-black px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase tracking-widest border border-blue-600/20">Pertanyaan Ke-{currentIndex + 1}</span>
              <button onClick={toggleMarked} className={`flex items-center gap-2 text-[10px] md:text-xs font-black transition-all px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl ${isMarked ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`}>
                <Flag className={`w-3 h-3 md:w-4 md:h-4 ${isMarked ? 'fill-current' : ''}`} /> {isMarked ? 'RAGU' : 'TANDAI'}
              </button>
            </div>
            <h2 className={`font-black leading-[1.4] transition-all ${textSize === 'xl' ? 'text-2xl md:text-4xl' : textSize === 'large' ? 'text-xl md:text-3xl' : 'text-lg md:text-2xl'}`}>
              {currentQ.text}
            </h2>
          </div>

          <div className="space-y-3 md:space-y-4">
            {currentQ.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(idx)}
                className={`w-full text-left p-4 md:p-8 rounded-[24px] md:rounded-[32px] border-2 transition-all flex items-center gap-4 md:gap-6 group relative overflow-hidden
                  ${userAns === idx ? theme.optionActive : theme.option}`}>
                {userAns === idx && <div className="absolute left-0 top-0 w-1.5 md:w-2 h-full bg-blue-600"></div>}
                <div className={`w-10 h-10 md:w-16 md:h-16 rounded-[18px] md:rounded-[24px] flex items-center justify-center font-black text-lg md:text-xl transition-all duration-500
                  ${userAns === idx ? theme.optionNumberActive : theme.optionNumber + ' group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className={`font-bold transition-colors ${userAns === idx ? 'text-blue-600 font-black' : ''} ${textSize === 'xl' ? 'text-lg md:text-xl' : 'text-base md:text-lg'}`}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className={`backdrop-blur-xl border-t p-4 md:p-6 sticky bottom-0 z-[110] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transition-all duration-500 ${theme.footer}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 md:gap-6">
          <button onClick={() => setCurrentIndex(p => Math.max(0, p-1))} disabled={currentIndex === 0}
            className={`px-4 md:px-8 py-3 md:py-5 rounded-[16px] md:rounded-[24px] font-black disabled:opacity-30 transition active:scale-95 flex items-center gap-2 text-xs md:text-base ${colorTheme === 'sepia' ? 'bg-[#433422]/10 text-[#433422] hover:bg-[#433422]/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" /> <span className="hidden sm:inline">KEMBALI</span>
          </button>
          
          <div className="hidden lg:flex gap-2">
            {questions.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-500 ${currentIndex === i ? 'bg-blue-600 w-10' : i < currentIndex ? 'bg-blue-200 w-2' : 'bg-slate-200 w-2'}`}></div>
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <button onClick={() => setShowConfirmModal(true)} className="px-6 md:px-12 py-3 md:py-5 rounded-[16px] md:rounded-[24px] bg-green-600 text-white font-black text-sm md:text-lg hover:bg-green-700 shadow-2xl shadow-green-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 md:gap-3">
              <Save className="w-4 h-4 md:w-6 md:h-6" /> KUMPULKAN
            </button>
          ) : (
            <button onClick={() => setCurrentIndex(p => Math.min(questions.length-1, p+1))}
              className="px-6 md:px-12 py-3 md:py-5 rounded-[16px] md:rounded-[24px] bg-blue-600 text-white font-black text-sm md:text-lg hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 md:gap-3">
              LANJUT <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          )}
        </div>
      </footer>

      {showNav && (
        <div className="fixed inset-0 z-[160] bg-slate-950/60 backdrop-blur-md flex justify-end animate-in fade-in duration-300">
          <div className={`${theme.nav} w-full md:w-96 h-full p-6 md:p-10 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col`}>
            <div className="flex justify-between items-center mb-10">
              <h3 className={`font-black text-2xl tracking-tighter ${theme.text}`}>Lembar Jawaban</h3>
              <button onClick={() => setShowNav(false)} className={`p-2 rounded-full transition ${colorTheme === 'sepia' ? 'hover:bg-[#433422]/10' : 'hover:bg-slate-100'}`}><X className="w-8 h-8" /></button>
            </div>
            <div className="grid grid-cols-5 gap-3 overflow-y-auto pr-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isQMarked = marked[q.id];
                return (
                  <button key={q.id} onClick={() => { setCurrentIndex(idx); setShowNav(false); }}
                    className={`aspect-square rounded-2xl text-sm font-black transition-all border-2 flex flex-col items-center justify-center relative
                      ${currentIndex === idx ? 'border-blue-600 ring-4 ring-blue-50 scale-110' : 'border-transparent'}
                      ${isQMarked ? 'bg-amber-400 text-white shadow-lg shadow-amber-100' : isAnswered ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-slate-100 text-slate-400'}`}>
                    {idx + 1}
                    {isQMarked && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto space-y-4 pt-10 border-t">
              <div className="flex items-center gap-4 text-xs font-black text-slate-500"><div className="w-5 h-5 bg-green-500 rounded-lg"></div> TERJAWAB</div>
              <div className="flex items-center gap-4 text-xs font-black text-slate-500"><div className="w-5 h-5 bg-amber-400 rounded-lg"></div> RAGU-RAGU</div>
              <div className="flex items-center gap-4 text-xs font-black text-slate-500"><div className="w-5 h-5 bg-slate-100 rounded-lg"></div> BELUM DIISI</div>
            </div>
          </div>
        </div>
      )}

      {showAppearanceMenu && (
        <div className="fixed top-24 right-6 z-[160] bg-white rounded-[40px] shadow-2xl border p-10 w-80 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mb-6">Visual Font</p>
              <div className="flex gap-3">
                {['normal', 'large', 'xl'].map(size => (
                  <button key={size} onClick={() => setTextSize(size as any)} className={`flex-1 py-3 rounded-2xl text-xs font-black border-2 transition-all ${textSize === size ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'}`}>{size.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mb-6">Tema Antarmuka</p>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => setColorTheme('light')} className={`group flex flex-col items-center gap-2 transition-all ${colorTheme === 'light' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full bg-white border-2 shadow-sm ${colorTheme === 'light' ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-200'}`}></div>
                  <span className="text-[8px] font-black text-slate-400">LIGHT</span>
                </button>
                <button onClick={() => setColorTheme('sepia')} className={`group flex flex-col items-center gap-2 transition-all ${colorTheme === 'sepia' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full bg-[#fdf6e3] border-2 shadow-sm ${colorTheme === 'sepia' ? 'border-blue-600 ring-4 ring-blue-50' : 'border-[#eaddc5]'}`}></div>
                  <span className="text-[8px] font-black text-slate-400">SEPIA</span>
                </button>
                <button onClick={() => setColorTheme('dark')} className={`group flex flex-col items-center gap-2 transition-all ${colorTheme === 'dark' ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full bg-slate-900 border-2 shadow-sm ${colorTheme === 'dark' ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-700'}`}></div>
                  <span className="text-[8px] font-black text-slate-400">DARK</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[60px] p-12 max-w-lg w-full text-center shadow-2xl animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl">
              <div className="relative">
                <Info className="w-12 h-12" />
              </div>
            </div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter text-slate-900">KIRIM JAWABAN SEKARANG?</h3>
            <p className="text-slate-400 font-bold mb-10 leading-relaxed">Anda telah menyelesaikan <span className="text-blue-600 font-black">{Object.keys(answers).length}</span> dari <span className="text-blue-600 font-black">{questions.length}</span> pertanyaan. Anda tidak dapat kembali setelah mengirim.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => { setShowConfirmModal(false); handleSubmit(); }} className="w-full py-6 rounded-[32px] font-black text-xl bg-blue-600 text-white hover:bg-blue-700 shadow-2xl shadow-blue-100 transition active:scale-95">YA, SAYA YAKIN</button>
              <button onClick={() => setShowConfirmModal(false)} className="w-full py-5 rounded-[32px] font-bold text-slate-500 hover:bg-slate-100 transition">KEMBALI KE SOAL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exam;
