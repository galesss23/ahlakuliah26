
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExamConfig, Question, AppSettings, UserData, ExamType, ExamMode } from './types';
import { generateQuestions } from './services/geminiService';
import { DEFAULT_SETTINGS, fetchSubjects, syncPendingData, fetchUsers, fetchAppSettings, addUser, addSubject, isCloudActive } from './services/storageService';
import Exam from './components/Exam';
import AdminDashboard from './components/AdminDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import StudentDashboard from './components/StudentDashboard';
import { RunningText } from './components/RunningText';
import { Loader2, GraduationCap, UserCog, LogIn, ArrowLeft, Cloud, Database, ShieldCheck, BrainCircuit, Sparkles } from 'lucide-react';

enum View { HOME, STUDENT_LOGIN, STUDENT_DASHBOARD, ADMIN_LOGIN, EXAM_LOADING, EXAM_SESSION, ADMIN_DASHBOARD, DOSEN_DASHBOARD }

const CenterLayout = ({ children, bg = "bg-slate-950", backgroundUrl }: { children?: React.ReactNode, bg?: string, backgroundUrl?: string }) => (
  <div className={`min-h-screen ${bg} flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden transition-all duration-700`}>
    {backgroundUrl && (
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-50 transition-opacity duration-1000"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${backgroundUrl})` }}
      />
    )}
    {/* Background Decorative Blurs */}
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
      className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none z-0"
    />
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, delay: 0.5 }}
      className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none z-0"
    />
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.3 }}
      transition={{ duration: 2, delay: 1 }}
      className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none z-0"
    />

    {/* Connection Badge */}
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-6 right-6 flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-[100] pointer-events-none"
    >
      {isCloudActive() ? (
        <><Cloud className="w-4 h-4 text-green-400" /><span className="text-[10px] font-black text-white uppercase tracking-widest">Cloud Active</span></>
      ) : (
        <><Database className="w-4 h-4 text-amber-400" /><span className="text-[10px] font-black text-white uppercase tracking-widest">Local Mode</span></>
      )}
    </motion.div>

    {/* Main Content Container */}
    <div className="w-full max-w-md relative z-[100]">
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </div>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingText, setLoadingText] = useState("");
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [studentName, setStudentName] = useState("");
  const [studentNim, setStudentNim] = useState("");
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);

  const [staffUsername, setStaffUsername] = useState(""); 
  const [staffPass, setStaffPass] = useState("");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isStaffLoginLoading, setIsStaffLoginLoading] = useState(false);

  const refreshCurrentUser = async () => {
    if (!currentUser) return;
    try {
      const users = await fetchUsers();
      const freshUser = users.find(u => u.id === currentUser.id);
      if (freshUser) {
        setCurrentUser({ ...freshUser });
      }
    } catch (err) {
      console.error("Error refreshing current user:", err);
    }
  };

  useEffect(() => {
    if (appSettings.appName) {
      document.title = appSettings.appName;
    }
    
    if (appSettings.logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = appSettings.logoUrl;
      
      // Update og:image for social sharing
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', appSettings.ogImageUrl || appSettings.logoUrl);
    }
  }, [appSettings.appName, appSettings.logoUrl, appSettings.ogImageUrl]);

  const refreshSettings = async () => {
    try {
      const settings = await fetchAppSettings();
      setAppSettings(settings);
    } catch (err) {
      console.error("Error refreshing settings:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await refreshSettings();
        
        const users = await fetchUsers();
        if (users.length === 0) {
          await addUser({ username: 'admin', password: '123', fullName: 'Super Admin', role: 'ADMIN' });
          await addUser({ username: 'dosen', password: '123', fullName: 'Dosen Pengampu', role: 'DOSEN' });
        }

        const subs = await fetchSubjects();
        if (subs.length === 0) {
          const defaultSubs = [
            { name: "User Experience Design", code: "UXD101" },
            { name: "Sistem Digital", code: "SD101" },
            { name: "Sistem Basis Data", code: "SBD101" }
          ];
          for (const s of defaultSubs) await addSubject(s.name, s.code, { duration: 90 });
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    init();
    syncPendingData();
  }, []);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNim = studentNim.trim();
    const cleanName = studentName.trim();
    if (!cleanName || !cleanNim) return;
    
    setIsLoginProcessing(true);
    try {
      const users = await fetchUsers();
      let found = users.find(u => u.username.toLowerCase() === cleanNim.toLowerCase());
      if (!found) {
        found = await addUser({
          username: cleanNim,
          password: '123',
          fullName: cleanName,
          role: 'MAHASISWA'
        });
      }
      setCurrentUser(found);
      setCurrentView(View.STUDENT_DASHBOARD);
    } catch (error) {
      alert("Login gagal, silakan coba lagi.");
    } finally { setIsLoginProcessing(false); }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = staffUsername.trim();
    const p = staffPass.trim();
    if (!u || !p) return;
    
    setIsStaffLoginLoading(true);
    try {
      const users = await fetchUsers();
      const found = users.find(user => 
        user.username.toLowerCase() === u.toLowerCase() && 
        user.password === p
      );
      if (found) {
        if (found.role === 'MAHASISWA') {
          alert("Akses ditolak: Gunakan Portal Mahasiswa.");
          return;
        }
        setCurrentUser(found);
        if (found.role === 'ADMIN') setCurrentView(View.ADMIN_DASHBOARD);
        else setCurrentView(View.DOSEN_DASHBOARD);
      } else {
        alert("ID atau Password salah.");
      }
    } catch (error) {
      alert("Kesalahan koneksi basis data.");
    } finally { setIsStaffLoginLoading(false); }
  };

  const startExam = async (subName: string, type: ExamType, mode: ExamMode, ai: boolean) => {
    setCurrentView(View.EXAM_LOADING);
    setLoadingText("Menyiapkan lembar ujian...");
    
    try {
      const allSubs = await fetchSubjects();
      const target = allSubs.find(s => s.name === subName);
      
      setExamConfig({ 
        studentId: currentUser?.id || `u-${Date.now()}`,
        studentName: currentUser?.fullName || studentName, 
        studentNim: currentUser?.username || studentNim, 
        subject: subName, 
        examType: type, 
        mode, 
        duration: target?.duration || 60,
        startTime: new Date().toISOString()
      });

      // Prefer Bank Soal if available
      if (target?.questions && target.questions.length > 0) {
        setLoadingText("Mengambil soal dari Bank Soal...");
        // Delay slightly for UX
        await new Promise(r => setTimeout(r, 800));
        setQuestions(target.questions);
        setCurrentView(View.EXAM_SESSION);
        return;
      }

      setLoadingText("AI sedang merumuskan 30 butir soal evaluasi...");
      const q = await generateQuestions(subName, type, ai);
      if (q && q.length > 0) {
        setQuestions(q);
        setCurrentView(View.EXAM_SESSION);
      } else {
        throw new Error("Gagal mendapatkan soal dari AI dan Bank Soal kosong.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal memuat soal. Periksa koneksi atau kuota API.");
      setCurrentView(View.STUDENT_DASHBOARD);
    }
  };

  const renderMainContent = () => {
    if (currentView === View.HOME) return (
      <CenterLayout bg="bg-slate-950" backgroundUrl={appSettings.backgroundUrl}>
        <motion.div 
          key="home"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="bg-white/5 backdrop-blur-3xl p-10 md:p-14 rounded-[56px] text-center border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)]"
        >
          <motion.div 
            whileHover={{ rotate: 0, scale: 1.05 }}
            className="w-24 h-24 bg-white rounded-[32px] mx-auto mb-10 flex items-center justify-center rotate-3 transition-all duration-500 p-5 shadow-2xl overflow-hidden"
          >
             {appSettings.logoUrl ? (
               <img src={appSettings.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
             ) : (
               <GraduationCap className="w-12 h-12 text-blue-600" />
             )}
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tighter uppercase leading-tight font-display">{appSettings.appName}</h1>
          <div className="flex items-center justify-center gap-2 mb-14">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <p className="text-indigo-400 font-bold text-xs tracking-[6px] uppercase opacity-80">Smart Assessment System</p>
          </div>
          <div className="space-y-5">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView(View.STUDENT_LOGIN)} 
              className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-4 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 cursor-pointer text-lg"
            >
              <GraduationCap className="w-7 h-7" /> PORTAL MAHASISWA
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView(View.ADMIN_LOGIN)} 
              className="w-full bg-white/10 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-4 border border-white/10 hover:bg-white/20 transition-all cursor-pointer text-lg"
            >
              <UserCog className="w-7 h-7" /> PORTAL STAF & DOSEN
            </motion.button>
          </div>
        </motion.div>
      </CenterLayout>
    );

    if (currentView === View.STUDENT_LOGIN) return (
      <CenterLayout bg="bg-blue-900" backgroundUrl={appSettings.backgroundUrl}>
        <motion.div 
          key="student-login"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white/90 backdrop-blur-2xl p-10 md:p-14 rounded-[56px] shadow-2xl w-full border border-white/20"
        >
          <button onClick={() => setCurrentView(View.HOME)} className="mb-10 flex items-center gap-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-blue-600 transition-colors cursor-pointer group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> KEMBALI
          </button>
          <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100"><LogIn className="w-8 h-8" /></div>
            <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter font-display">Login Siswa</h2><p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Masukkan NIM Aktif</p></div>
          </div>
          <form onSubmit={handleStudentLogin} className="space-y-8">
            <div className="space-y-4">
              <input type="text" placeholder="Nama Lengkap" autoFocus className="input-field" value={studentName} onChange={e => setStudentName(e.target.value)} required />
              <input type="text" placeholder="NIM / ID" className="input-field font-mono" value={studentNim} onChange={e => setStudentNim(e.target.value)} required />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={isLoginProcessing} 
              className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl hover:bg-blue-600 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoginProcessing ? <Loader2 className="animate-spin mx-auto" /> : 'MASUK DASHBOARD'}
            </motion.button>
          </form>
        </motion.div>
      </CenterLayout>
    );

    if (currentView === View.ADMIN_LOGIN) return (
      <CenterLayout bg="bg-slate-950" backgroundUrl={appSettings.backgroundUrl}>
        <motion.div 
          key="admin-login"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white/90 backdrop-blur-2xl p-10 md:p-14 rounded-[56px] shadow-2xl w-full border border-white/20"
        >
          <button onClick={() => setCurrentView(View.HOME)} className="mb-10 flex items-center gap-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors cursor-pointer group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> KEMBALI
          </button>
          <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-900 shadow-lg border border-slate-200"><ShieldCheck className="w-8 h-8" /></div>
            <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter font-display">Akses Staf</h2><p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Dosen & Administrator</p></div>
          </div>
          <form onSubmit={handleStaffLogin} className="space-y-8">
            <div className="space-y-4">
              <input type="text" placeholder="ID Pengguna" autoFocus className="input-field" value={staffUsername} onChange={e => setStaffUsername(e.target.value)} required />
              <input type="password" placeholder="Kata Sandi" className="input-field" value={staffPass} onChange={e => setStaffPass(e.target.value)} required />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={isStaffLoginLoading} 
              className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl hover:bg-blue-600 transition-all cursor-pointer"
            >
              {isStaffLoginLoading ? <Loader2 className="animate-spin mx-auto" /> : 'VERIFIKASI MASUK'}
            </motion.button>
          </form>
        </motion.div>
      </CenterLayout>
    );

    if (currentView === View.STUDENT_DASHBOARD && currentUser) return <StudentDashboard user={currentUser} onLogout={() => setCurrentView(View.HOME)} onStartExam={startExam} onViewHistory={() => {}} appSettings={appSettings} onUserUpdate={refreshCurrentUser} />;
    if (currentView === View.ADMIN_DASHBOARD && currentUser) return <AdminDashboard role="ADMIN" userName={currentUser.fullName} user={currentUser} onLogout={() => { refreshSettings(); setCurrentView(View.HOME); }} appSettings={appSettings} onUserUpdate={refreshCurrentUser} />;
    if (currentView === View.DOSEN_DASHBOARD && currentUser) return <LecturerDashboard lecturerName={currentUser.fullName} lecturerId={currentUser.id} user={currentUser} onLogout={() => setCurrentView(View.HOME)} appSettings={appSettings} onUserUpdate={refreshCurrentUser} />;
    
    if (currentView === View.EXAM_LOADING) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-10 text-center">
        <div className="relative mb-10">
          <Loader2 className="animate-spin text-blue-600 w-24 h-24" />
          <div className="absolute inset-0 flex items-center justify-center"><BrainCircuit className="w-10 h-10 text-blue-600 animate-pulse" /></div>
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">AI Sedang Merumuskan</h3>
        <p className="font-bold text-slate-400 text-xs tracking-[4px] uppercase animate-pulse">{loadingText}</p>
      </div>
    );
    
    if (currentView === View.EXAM_SESSION && examConfig) return <Exam questions={questions} config={examConfig} onFinish={() => setCurrentView(View.STUDENT_DASHBOARD)} />;

    return null;
  };

  const showRunningText = currentView !== View.EXAM_SESSION && currentView !== View.EXAM_LOADING;

  return (
    <>
      {renderMainContent()}
      {showRunningText && <RunningText />}
    </>
  );
}

export default App;
