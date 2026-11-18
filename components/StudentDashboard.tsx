
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectItem, ExamType, ExamMode, StudentRecord, ForumMessage, Assignment, AssignmentSubmission, AppSettings, UserData } from '../types';
import { LinkifiedText } from './LinkifiedText';
import { fetchSubjects, fetchUsers, getResults, addForumMessage, fetchForumMessages, fetchSubmissions, submitAssignment, updateUser } from '../services/storageService';
import { 
  BookOpen, Clock, ChevronRight, LogOut, 
  Search, User, GraduationCap, LayoutDashboard, BrainCircuit, 
  History, Award, CheckCircle, Flame, BarChart3, Star, AlertCircle,
  Loader2, Trophy, FileText, X, LayoutGrid, TrendingUp, Target, MessageSquare, Send, Calendar, ClipboardList, FileUp, CheckSquare, RefreshCw, Link as LinkIcon, Filter, Settings, HelpCircle
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import HelpGuide from './HelpGuide';

interface StudentDashboardProps {
  user: UserData;
  onLogout: () => void;
  onStartExam: (subject: string, examType: ExamType, mode: ExamMode, allowAI: boolean) => void;
  onViewHistory: () => void;
  appSettings: AppSettings;
  onUserUpdate?: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  user, onLogout, onStartExam, onViewHistory, appSettings, onUserUpdate
}) => {
  const studentName = user.fullName;
  const studentNim = user.username;
  const backgroundUrl = appSettings.backgroundUrl;
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [results, setResults] = useState<StudentRecord[]>([]);
  const [allResults, setAllResults] = useState<StudentRecord[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'EXAMS' | 'LEADERBOARD' | 'STATISTICS' | 'FORUM' | 'ASSIGNMENTS'>('MATERIALS');
  const [loading, setLoading] = useState(true);
  const [mySubmissions, setMySubmissions] = useState<AssignmentSubmission[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionFileName, setSubmissionFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentSubjectFilter, setAssignmentSubjectFilter] = useState<string>("");
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState("");
  const [forumMessage, setForumMessage] = useState("");
  const [forumMessages, setForumMessages] = useState<ForumMessage[]>([]);
  const [isForumLoading, setIsForumLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [followedSubjectIds, setFollowedSubjectIds] = useState<string[]>([]);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  const loadForum = async (subjectId: string) => {
    setIsForumLoading(true);
    try {
      const msgs = await fetchForumMessages(subjectId);
      setForumMessages(msgs);
    } finally {
      setIsForumLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubject) {
      loadForum(selectedSubject.id);
    }
  }, [selectedSubject]);

  const [examType, setExamType] = useState<ExamType>('LATIHAN');
  const [examMode, setExamMode] = useState<ExamMode>('STANDARD');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [allSubs, allUsers, allResultsData, allSubmissions] = await Promise.all([
          fetchSubjects(), fetchUsers(), getResults(), fetchSubmissions()
        ]);
        
        // Update local states from prop user as primary source
        setFollowedSubjectIds(user.followedSubjectIds || []);
        setWhatsappNumber(user.whatsapp || "");
        
        setSubjects(allSubs.filter(s => s.isActive));
        setAllResults(allResultsData);
        setResults(allResultsData.filter(r => r.nim === studentNim));
        setMySubmissions(allSubmissions.filter(s => s.studentNim === studentNim));
      } finally { setLoading(false); }
    };
    load();
  }, [studentNim, user.id]);

  useEffect(() => {
    setFollowedSubjectIds(user.followedSubjectIds || []);
    setWhatsappNumber(user.whatsapp || "");
  }, [user]);

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || (!submissionContent.trim() && !submissionFileName)) return;
    setIsSubmitting(true);
    try {
      await submitAssignment({
        assignmentId: selectedAssignment.id,
        studentId: studentNim, // Using NIM as ID for simplicity
        studentName: studentName,
        studentNim: studentNim,
        content: submissionContent.trim(),
        fileName: submissionFileName || undefined
      });
      const updated = await fetchSubmissions();
      setMySubmissions(updated.filter(s => s.studentNim === studentNim));
      setShowSubmitModal(false);
      setSubmissionContent("");
      setSubmissionFileName("");
    } finally { setIsSubmitting(false); }
  };

  const stats = {
    avgScore: results.length ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length) : 0,
    totalExams: results.length,
    streak: results.length
  };

  const handleSendForumMessage = async () => {
    if (!selectedSubject || !forumMessage.trim()) return;
    setIsSending(true);
    try {
      await addForumMessage(selectedSubject.id, {
        userId: studentNim,
        userName: studentName,
        userRole: 'MAHASISWA',
        text: forumMessage.trim()
      });
      setForumMessage("");
      await loadForum(selectedSubject.id);
    } finally { setIsSending(false); }
  };

  const handleFollowToggle = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if (isUpdatingFollow) return;
    setIsUpdatingFollow(true);
    try {
      const isFollowing = followedSubjectIds.includes(subjectId);
      const newFollowed = isFollowing 
        ? followedSubjectIds.filter(id => id !== subjectId)
        : [...followedSubjectIds, subjectId];
        
      await updateUser(user.id, { followedSubjectIds: newFollowed });
      setFollowedSubjectIds(newFollowed);
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      console.error("Follow toggle failed:", err);
      alert("Gagal memperbarui status ikuti. Pastikan koneksi internet stabil.");
    } finally {
      setIsUpdatingFollow(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setIsUpdatingFollow(true);
    try {
      await updateUser(user.id, { whatsapp: whatsappNumber });
      if (onUserUpdate) onUserUpdate();
      setShowSettings(false);
      alert("Pengaturan profil berhasil disimpan.");
    } catch (err) {
      alert("Gagal menyimpan pengaturan profil.");
    } finally {
      setIsUpdatingFollow(false);
    }
  };

  const getLeaderboard = (subjectName: string) => {
    const subjectResults = allResults.filter(r => r.subject === subjectName);
    return subjectResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <Loader2 className="text-blue-600 w-16 h-16" />
        <div className="absolute inset-0 flex items-center justify-center"><GraduationCap className="w-6 h-6 text-blue-600" /></div>
      </motion.div>
      <p className="mt-6 font-black text-slate-400 tracking-widest uppercase text-xs animate-pulse">Initializing Portal...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans selection:bg-indigo-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h1 className="font-black text-lg tracking-tighter uppercase text-slate-900 font-display">EMYE EDU</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
          >
            <Settings className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-600"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[55] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed lg:sticky top-0 left-0 z-[56] h-screen bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-in-out
        w-72 lg:w-80 shadow-[20px_0_60px_rgba(0,0,0,0.02)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-10 flex items-center gap-4">
          <motion.div 
            whileHover={{ rotate: 0, scale: 1.1 }}
            className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-6 transition-transform duration-500"
          >
            <GraduationCap className="w-8 h-8" />
          </motion.div>
          <div>
            <h1 className="font-black text-2xl text-slate-900 tracking-tighter font-display">EMYE EDU</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[3px] mt-1">LMS / CBT V2</p>
          </div>
        </div>

        <div className="px-8 mb-10">
          <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex items-center gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
              <User className="w-7 h-7 text-slate-400" />
            </div>
            <div className="overflow-hidden">
              <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{studentName}</p>
              <p className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">{studentNim}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3 overflow-y-auto scrollbar-hide">
          <button onClick={() => { setSelectedSubject(null); setActiveTab('MATERIALS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-sm ${!selectedSubject && activeTab !== 'STATISTICS' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>
            <LayoutDashboard className="w-6 h-6" /> BERANDA
          </button>
          <button onClick={() => { setSelectedSubject(null); setActiveTab('STATISTICS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-sm ${activeTab === 'STATISTICS' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>
            <BarChart3 className="w-6 h-6" /> STATISTIK
          </button>
          <button onClick={() => { setSelectedSubject(null); setActiveTab('ASSIGNMENTS'); setAssignmentSubjectFilter(""); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-sm ${activeTab === 'ASSIGNMENTS' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>
            <ClipboardList className="w-6 h-6" /> TUGAS
          </button>
          <button onClick={() => { onViewHistory(); setIsSidebarOpen(false); }} className="w-full flex items-center gap-5 px-6 py-5 rounded-[24px] text-slate-400 hover:bg-slate-50 font-black text-sm transition-all">
            <History className="w-6 h-6" /> RIWAYAT
          </button>
          <div className="pt-10 px-6">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[4px] mb-6">AKADEMIK</p>
            <div className="space-y-6">
               <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Streak</span> <span className="text-xs font-black text-slate-800">{stats.streak} Hari</span></div>
               <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Skor Rata</span> <span className="text-xs font-black text-slate-800">{stats.avgScore}</span></div>
            </div>
          </div>
        </nav>

        <div className="p-8 space-y-3">
          <button onClick={() => setShowHelpGuide(true)} className="w-full flex items-center gap-5 px-6 py-5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-[24px] font-black text-sm transition-all group mb-2">
            <HelpCircle className="w-6 h-6" /> BANTUAN
          </button>
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-5 px-6 py-5 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-[24px] font-black text-sm transition-all group">
            <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" /> PENGATURAN
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-5 px-6 py-5 text-red-600 bg-red-50 hover:bg-red-100 rounded-[24px] font-black text-sm transition-all">
            <LogOut className="w-6 h-6" /> KELUAR
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 lg:p-16 overflow-y-auto pb-24 relative">
        {backgroundUrl && (
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-20 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
        )}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'ASSIGNMENTS' && !selectedSubject ? (
            <motion.div
              key="all-assignments-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">Daftar Tugas</h2>
                  <p className="text-slate-400 font-bold max-w-md leading-relaxed">Kelola dan kumpulkan tugas kuliah Anda tepat waktu.</p>
                </div>
                <div className="w-full md:flex-1 max-w-2xl flex flex-col md:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Cari Judul Tugas..." 
                      className="w-full pl-16 pr-8 py-5 bg-white rounded-[24px] border-none ring-1 ring-slate-100 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm font-bold text-sm transition-all" 
                      value={assignmentSearchTerm} 
                      onChange={e => setAssignmentSearchTerm(e.target.value)} 
                    />
                  </div>
                  <div className="w-full md:w-80 space-y-3">
                    <select 
                      value={assignmentSubjectFilter} 
                      onChange={(e) => setAssignmentSubjectFilter(e.target.value)}
                      className="w-full p-5 bg-white rounded-2xl border-none ring-1 ring-slate-100 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-sm transition-all shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Semua Mata Kuliah</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {(() => {
                  const filteredAssignments = subjects
                    .filter(s => !assignmentSubjectFilter || s.id === assignmentSubjectFilter)
                    .filter(s => followedSubjectIds.includes(s.id))
                    .flatMap(s => (s.assignments || []).map(a => ({...a, subjectName: s.name, subjectCode: s.code})))
                    .filter(asg => 
                      asg.title.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) || 
                      asg.description?.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) ||
                      asg.subjectCode.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
                    );

                  if (filteredAssignments.length === 0) {
                    return (
                      <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-slate-100 flex flex-col items-center justify-center gap-6 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                          <ClipboardList className="w-10 h-10" />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <p className="text-slate-900 font-black text-lg mb-2">Tidak Ada Tugas</p>
                          <p className="text-slate-400 font-bold text-sm">Ikuti mata kuliah terlebih dahulu di tab Beranda untuk melihat daftar tugas yang perlu dikerjakan.</p>
                        </div>
                      </div>
                    );
                  }

                  return filteredAssignments.map(asg => {
                   const submission = mySubmissions.find(s => s.assignmentId === asg.id);
                   const isOverdue = new Date(asg.dueDate) < new Date() && !submission;
                   return (
                     <div key={asg.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{asg.subjectCode}</p>
                            <h5 className="text-xl font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{asg.title}</h5>
                          </div>
                          {submission ? (
                            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-2xl">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          ) : isOverdue ? (
                            <div className="bg-rose-100 text-rose-600 p-2 rounded-2xl">
                              <AlertCircle className="w-5 h-5" />
                            </div>
                          ) : null}
                        </div>
                        <LinkifiedText text={asg.description || ""} className="text-slate-500 text-sm font-medium mb-8 line-clamp-2" />
                        <div className="flex items-center gap-3 text-slate-400 mb-8">
                          <Calendar className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Deadline: {new Date(asg.dueDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const sub = subjects.find(s => s.assignments?.some(a => a.id === asg.id));
                            if (sub) {
                              setSelectedSubject(sub);
                              setActiveTab('ASSIGNMENTS');
                            }
                          }}
                          className="w-full py-5 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3"
                        >
                          LIHAT DETAIL
                        </button>
                     </div>
                   );
                  });
                })()}
              </div>
            </motion.div>
          ) : activeTab === 'STATISTICS' && !selectedSubject ? (
            <motion.div
              key="statistics-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-10"
            >
              <div className="mb-16">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Analisa Belajar</h2>
                <p className="text-slate-400 font-bold max-w-md leading-relaxed">Pantau perkembangan akademik Anda melalui visualisasi data real-time.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">Progress Nilai</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Riwayat 10 Ujian Terakhir</p>
                    </div>
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results.slice(-10).map((r, i) => ({ name: `Ujian ${i+1}`, score: r.score }))}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                        <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 p-10 rounded-[48px] text-white flex flex-col justify-between">
                  <div>
                    <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-8">
                      <Target className="w-8 h-8 text-blue-400" />
                    </div>
                    <h4 className="text-2xl font-black tracking-tight mb-4">Target Akademik</h4>
                    <p className="text-white/40 font-bold leading-relaxed mb-10">Pertahankan rata-rata di atas 80 untuk mendapatkan sertifikat kompetensi EMYE EDU.</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-black mb-2"><span>Pencapaian</span><span>{stats.avgScore}%</span></div>
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stats.avgScore}%` }}></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-3xl">
                        <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Total Ujian</p>
                        <p className="text-xl font-black">{stats.totalExams}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-3xl">
                        <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Streak</p>
                        <p className="text-xl font-black">{stats.streak}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !selectedSubject ? (
            <motion.div 
              key="subjects-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-8">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">Mata Kuliah</h2>
                  <p className="text-slate-400 font-bold max-w-md leading-relaxed">Pilih mata kuliah untuk memulai proses pembelajaran atau menempuh ujian akademik.</p>
                </div>
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input type="text" placeholder="Cari Kode atau Mata Kuliah..." className="w-full pl-16 pr-8 py-5 bg-white rounded-[32px] border-none ring-1 ring-slate-100 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm font-bold text-sm transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-10">
                {subjects.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase())).map(sub => {
                  const isFinished = results.some(r => r.subject === sub.name);
                  return (
                    <motion.div 
                      key={sub.id} 
                      layoutId={sub.id}
                      whileHover={{ y: -8, shadow: "0 40px 100px rgba(0,0,0,0.08)" }}
                      onClick={() => setSelectedSubject(sub)} 
                      className="bg-white rounded-[48px] border border-slate-100 p-8 md:p-10 transition-all duration-500 group cursor-pointer relative overflow-hidden"
                    >
                      {isFinished && <div className="absolute top-6 right-6 bg-green-500 text-white p-2 rounded-2xl shadow-lg shadow-green-100 z-10"><CheckCircle className="w-5 h-5" /></div>}
                      <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:rotate-6 shadow-sm">
                          <BookOpen className="w-8 h-8" />
                        </div>
                        <button 
                          onClick={(e) => handleFollowToggle(e, sub.id)}
                          disabled={isUpdatingFollow}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            followedSubjectIds.includes(sub.id) 
                            ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {followedSubjectIds.includes(sub.id) ? 'Batal Ikuti' : 'Ikuti'}
                        </button>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">{sub.code}</p>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{sub.name}</h3>
                        <div className="flex items-center gap-6 pt-4">
                          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-300" /> <span className="text-xs font-bold text-slate-500">{sub.duration || 60}m</span></div>
                          <div className="flex items-center gap-2"><Award className="w-4 h-4 text-slate-300" /> <span className="text-xs font-bold text-slate-500">SKS: 3</span></div>
                        </div>
                      </div>
                      <div className="mt-10 pt-8 border-t border-slate-50 flex justify-between items-center">
                         <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Akses Sekarang</span>
                         <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-2 transition-all" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="subject-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-5xl mx-auto"
            >
              <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-3 text-slate-400 font-black text-xs uppercase tracking-widest mb-8 md:mb-12 hover:text-blue-600 transition-all group">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:-translate-x-2 transition-all"><ChevronRight className="w-5 h-5 rotate-180" /></div> KEMBALI KE BERANDA
              </button>
              
              <div className="bg-white rounded-[40px] md:rounded-[60px] border border-slate-100 overflow-hidden shadow-2xl">
                <div className="bg-slate-900 p-8 md:p-16 text-white relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full"></div>
                  <div className="relative z-10">
                    <p className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-[6px] mb-4 md:mb-6">{selectedSubject.code}</p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{selectedSubject.name}</h1>
                    <p className="mt-4 md:mt-6 text-white/40 font-bold max-w-2xl leading-relaxed text-sm md:text-base">Selamat datang di modul perkuliahan terintegrasi. Silakan pelajari materi yang tersedia sebelum mengambil ujian evaluasi.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row bg-slate-50 p-2 md:p-3 mx-4 md:mx-8 mt-[-30px] md:mt-[-40px] rounded-[24px] md:rounded-[32px] shadow-xl relative z-20 border-4 border-white gap-1">
                  {[
                    { id: 'MATERIALS', label: 'MODUL BELAJAR', icon: BookOpen },
                    { id: 'ASSIGNMENTS', label: 'TUGAS KULIAH', icon: ClipboardList },
                    { id: 'EXAMS', label: 'EVALUASI CBT', icon: BrainCircuit },
                    { id: 'FORUM', label: 'FORUM DISKUSI', icon: MessageSquare },
                    { id: 'LEADERBOARD', label: 'PERINGKAT', icon: Trophy }
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 md:py-5 rounded-[18px] md:rounded-[24px] text-[10px] md:text-xs font-black flex items-center justify-center gap-2 md:gap-3 transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                      <tab.icon className="w-4 h-4 md:w-5 md:h-5" /> {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6 md:p-16 min-h-[400px] md:min-h-[500px]">
                  <AnimatePresence mode="wait">
                    {activeTab === 'ASSIGNMENTS' ? (
                      <motion.div 
                        key="assignments-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {selectedSubject.assignments && selectedSubject.assignments.length > 0 ? (
                            selectedSubject.assignments.map(asg => {
                              const submission = mySubmissions.find(s => s.assignmentId === asg.id);
                              const isOverdue = new Date(asg.dueDate) < new Date() && !submission;

                              return (
                                <div key={asg.id} className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 flex flex-col hover:bg-white hover:shadow-xl transition-all duration-500 group">
                                  <div className="flex justify-between items-start mb-6">
                                    <h5 className="text-xl font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{asg.title}</h5>
                                    {submission ? (
                                      <div className="bg-emerald-100 text-emerald-600 p-2 rounded-2xl">
                                        <CheckCircle className="w-5 h-5" />
                                      </div>
                                    ) : isOverdue ? (
                                      <div className="bg-rose-100 text-rose-600 p-2 rounded-2xl">
                                        <AlertCircle className="w-5 h-5" />
                                      </div>
                                    ) : (
                                      <div className="bg-blue-100 text-blue-600 p-2 rounded-2xl">
                                        <Clock className="w-5 h-5" />
                                      </div>
                                    )}
                                  </div>
                                  <LinkifiedText text={asg.description || ""} className="text-slate-500 text-sm font-medium mb-8 line-clamp-3 leading-relaxed" />
                                  
                                  <div className="mt-auto space-y-6">
                                    <div className="flex items-center gap-3 text-slate-400">
                                      <Calendar className="w-5 h-5" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Deadline: {new Date(asg.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(asg.dueDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {submission ? (
                                      <div className="space-y-4">
                                        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                          <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                              <CheckSquare className="w-3 h-3" /> Terkumpul
                                            </span>
                                            {submission.grade !== undefined && (
                                              <div className="flex flex-col items-end">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nilai Akhir</span>
                                                <span className="text-xl font-black text-blue-600">{submission.grade}</span>
                                              </div>
                                            )}
                                          </div>
                                          {submission.feedback && (
                                            <div className="pt-3 border-t border-slate-50">
                                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Umpan Balik Dosen:</p>
                                              <div className="text-xs text-slate-600 italic font-medium leading-relaxed">
                                                <LinkifiedText text={submission.feedback} />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        {!isOverdue && submission.grade === undefined && (
                                          <button onClick={() => { 
                                            setSelectedAssignment(asg); 
                                            setSubmissionContent(submission.content); 
                                            setSubmissionFileName(submission.fileName || "");
                                            setShowSubmitModal(true); 
                                          }} className="w-full py-5 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-indigo-100 transition-all">
                                            <RefreshCw className="w-5 h-5" /> EDIT PENGUMPULAN
                                          </button>
                                        )}
                                      </div>
                                    ) : isOverdue ? (
                                      <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Waktu pengumpulan telah berakhir</p>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setSelectedAssignment(asg); setShowSubmitModal(true); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200">
                                        <FileUp className="w-5 h-5" /> KERJAKAN TUGAS
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[40px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-6">
                              <ClipboardList className="w-16 h-16 text-slate-200" />
                              <p className="text-slate-400 font-black text-sm uppercase tracking-widest italic">Belum ada tugas untuk mata kuliah ini.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : activeTab === 'EXAMS' ? (
                      <motion.div 
                        key="exams-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="max-w-lg mx-auto text-center space-y-8 md:space-y-10"
                      >
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-50 text-blue-600 rounded-[28px] md:rounded-[32px] flex items-center justify-center mx-auto shadow-inner"><BrainCircuit className="w-10 h-10 md:w-12 md:h-12" /></div>
                        <div>
                          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">Sistem Ujian Akademik</h3>
                          <p className="text-slate-400 font-bold leading-relaxed text-sm md:text-base">Pastikan koneksi internet stabil dan kamera aktif selama proses ujian berlangsung.</p>
                        </div>
                        <div className="space-y-6">
                          <div className="grid grid-cols-3 gap-3 md:gap-4">
                            {['LATIHAN', 'UTS', 'UAS'].map(t => (
                              <button key={t} onClick={() => setExamType(t as any)} className={`py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs tracking-widest transition-all border-4 ${examType === t ? 'bg-blue-600 text-white border-blue-100 shadow-xl scale-110' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-100'}`}>{t}</button>
                            ))}
                          </div>
                          <div className="bg-slate-50 p-4 md:p-6 rounded-[24px] md:rounded-[32px] space-y-4">
                            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase block tracking-widest text-left px-2">Mode Pengerjaan</label>
                            <select value={examMode} onChange={e => setExamMode(e.target.value as any)} className="w-full p-4 md:p-5 rounded-xl md:rounded-2xl bg-white border-none ring-1 ring-slate-200 font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer text-sm">
                              <option value="STANDARD">Ujian Standar (Proctored)</option>
                              <option value="LEARNING">Mode Belajar (Pembahasan Langsung)</option>
                            </select>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onStartExam(selectedSubject.name, examType, examMode, true)} 
                            className="w-full py-5 md:py-6 bg-slate-900 text-white font-black text-lg md:text-xl rounded-[24px] md:rounded-[32px] shadow-2xl shadow-slate-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-4"
                          >
                            MULAI UJIAN <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : activeTab === 'FORUM' ? (
                      <motion.div 
                        key="forum-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col h-full max-w-3xl mx-auto"
                      >
                        <div className="bg-slate-50 rounded-[32px] p-6 md:p-10 flex-1 flex flex-col min-h-[500px] border border-slate-100">
                          <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar mb-8">
                            {isForumLoading ? (
                              <div className="h-full flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                              </div>
                            ) : forumMessages.length > 0 ? (
                              forumMessages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.userId === studentNim ? 'items-end' : 'items-start'}`}>
                                  <div className={`max-w-[80%] p-5 rounded-[24px] shadow-sm ${msg.userId === studentNim ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-[9px] font-black uppercase tracking-widest ${msg.userId === studentNim ? 'text-blue-100' : 'text-slate-400'}`}>{msg.userName}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${msg.userRole === 'DOSEN' ? 'bg-indigo-100 text-indigo-600' : msg.userId === studentNim ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{msg.userRole}</span>
                                    </div>
                                    <LinkifiedText text={msg.text} className="text-sm font-medium leading-relaxed" />
                                    <p className={`text-[8px] font-mono mt-3 ${msg.userId === studentNim ? 'text-blue-200' : 'text-slate-300'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                <MessageSquare className="w-16 h-16 text-slate-200 mb-6 animate-bounce" />
                                <p className="text-slate-400 font-bold">Belum ada diskusi. Mulai percakapan sekarang!</p>
                              </div>
                            )}
                          </div>

                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="Tulis pesan diskusi..." 
                              className="w-full pl-8 pr-20 py-5 bg-white rounded-[24px] border-none ring-1 ring-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-sm transition-all shadow-lg"
                              value={forumMessage}
                              onChange={e => setForumMessage(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSendForumMessage()}
                            />
                            <button 
                              onClick={handleSendForumMessage}
                              disabled={isSending || !forumMessage.trim()}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : activeTab === 'LEADERBOARD' ? (
                      <motion.div 
                        key="leaderboard-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="text-center mb-8 md:mb-12">
                           <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Papan Peringkat</h3>
                           <p className="text-slate-400 font-bold text-sm md:text-base">5 Peserta dengan nilai tertinggi di mata kuliah ini.</p>
                        </div>
                        <div className="space-y-4 max-w-2xl mx-auto">
                           {getLeaderboard(selectedSubject.name).map((r, idx) => (
                             <motion.div 
                               key={r.id} 
                               initial={{ opacity: 0, x: -20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: idx * 0.1 }}
                               className="bg-white p-5 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-100 flex items-center gap-4 md:gap-6 shadow-sm hover:shadow-md transition-all"
                             >
                               <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-500' : idx === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300'}`}>
                                 {idx + 1}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="font-black text-slate-800 uppercase tracking-tight truncate text-sm md:text-base">{r.studentName || r.name || 'Siswa'}</div>
                                 <div className="text-[9px] md:text-[10px] font-mono text-slate-400">{r.studentNim || r.nim}</div>
                               </div>
                               <div className="text-right">
                                 <div className="text-2xl md:text-3xl font-black text-blue-600">{r.score}</div>
                                 <div className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase">{r.examType}</div>
                               </div>
                             </motion.div>
                           ))}
                           {getLeaderboard(selectedSubject.name).length === 0 && (
                             <div className="text-center py-16 md:py-20 bg-slate-50 rounded-[32px] md:rounded-[40px] border-2 border-dashed border-slate-200">
                               <Award className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-slate-200" />
                               <p className="text-slate-400 font-bold text-sm">Belum ada data pengerjaan.</p>
                             </div>
                           )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="materials-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 md:space-y-8"
                      >
                        {selectedSubject.materials?.map((m, idx) => (
                          <motion.div 
                            key={m.id} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start gap-6 md:gap-10 group hover:shadow-2xl hover:border-blue-100 transition-all duration-500"
                          >
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-600 rounded-[24px] md:rounded-[32px] flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner"><FileText className="w-8 h-8 md:w-10 md:h-10" /></div>
                            <div className="flex-1">
                              <h4 className="text-xl md:text-2xl font-black mb-2 md:mb-3 tracking-tight group-hover:text-blue-600 transition-colors">{m.title}</h4>
                              <LinkifiedText text={m.description || "Klik tombol di bawah untuk mempelajari materi perkuliahan ini secara detail."} className="text-slate-400 font-medium text-base md:text-lg leading-relaxed mb-6 md:mb-8" />
                              <motion.a 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                href={m.content} 
                                target="_blank" 
                                className="inline-flex items-center justify-center w-full md:w-auto gap-3 text-white font-black text-[10px] md:text-xs uppercase bg-blue-600 px-8 md:px-10 py-4 rounded-[16px] md:rounded-[20px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                              >
                                PELAJARI MODUL
                              </motion.a>
                            </div>
                          </motion.div>
                        ))}
                        {(!selectedSubject.materials || selectedSubject.materials.length === 0) && (
                           <div className="text-center py-20 md:py-32 bg-slate-50 rounded-[40px] md:rounded-[60px] border-4 border-dashed border-slate-100">
                             <BookOpen className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 text-slate-200 animate-pulse" />
                             <p className="text-slate-400 font-black text-lg md:text-xl px-4">Modul sedang disiapkan oleh dosen pengampu.</p>
                           </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <footer className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{appSettings?.footerText || `© ${new Date().getFullYear()} ${appSettings?.appName || 'EMYE EDU'}`}</p>
          <div className="flex gap-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Syarat & Ketentuan</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Bantuan</span>
          </div>
        </footer>
        </div>
      </main>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[48px] p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowSettings(false)} 
                className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full transition-colors"
                id="close-settings-button"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tighter uppercase" id="settings-title">PENGATURAN PROFIL</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nomor WhatsApp</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Contoh: 08123456789" 
                      className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-slate-800 shadow-inner" 
                      value={whatsappNumber} 
                      onChange={e => setWhatsappNumber(e.target.value)} 
                      id="whatsapp-input"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                      <MessageSquare className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 px-2 leading-relaxed">Masukkan nomor WhatsApp aktif Anda untuk menerima notifikasi pengingat tugas dari dosen.</p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isUpdatingFollow}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:scale-105 transition-all disabled:opacity-50 text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                    id="save-settings-button"
                  >
                    {isUpdatingFollow ? <Loader2 className="animate-spin" /> : 'SIMPAN PERUBAHAN'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] md:rounded-[60px] max-w-2xl w-full p-8 md:p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-white z-10 pb-4">
               <div>
                 <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Kumpulkan Tugas</h3>
                 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{selectedAssignment.title}</p>
               </div>
               <button onClick={() => setShowSubmitModal(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full cursor-pointer transition-colors"><X className="w-6 h-6 md:w-8 h-8" /></button>
            </div>
            
            <div className="space-y-8">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <p className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-2 flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Drive Link / Jawaban</p>
                <p className="text-xs font-bold text-indigo-600/80 leading-relaxed">Silakan masukkan link Google Drive atau ketikkan jawaban Anda di bawah ini. Pastikan link Drive sudah di-set ke "Anyone with the link can view".</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Link Drive / Jawaban Teks</label>
                  <textarea 
                    placeholder="Ketikkan jawaban Anda di sini atau tempelkan link Google Drive..." 
                    className="w-full p-6 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-medium text-slate-800 shadow-inner h-40 resize-none" 
                    value={submissionContent} 
                    onChange={e => setSubmissionContent(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Atau Unggah Dokumen (PDF, Word)</label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <label className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 cursor-pointer hover:bg-slate-100 transition shadow-sm">
                      <FileUp className="w-4 h-4" /> PILIH FILE
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSubmissionFileName(file.name);
                        }
                      }} />
                    </label>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 truncate">
                        {submissionFileName || "Belum ada file dipilih (Maks 5MB)"}
                      </p>
                    </div>
                    {submissionFileName && (
                      <button onClick={() => setSubmissionFileName("")} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => { setShowSubmitModal(false); setSubmissionContent(""); setSubmissionFileName(""); }} className="flex-1 py-6 bg-slate-100 text-slate-600 font-black rounded-[32px] hover:bg-slate-200 transition-all uppercase tracking-widest text-sm">Batal</button>
                <button onClick={handleSubmitAssignment} disabled={isSubmitting || (!submissionContent.trim() && !submissionFileName)} className="flex-[2] py-6 bg-indigo-600 text-white font-black rounded-[32px] shadow-2xl hover:scale-105 transition-all disabled:opacity-50 text-sm uppercase tracking-widest flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />} {mySubmissions.some(s => s.assignmentId === selectedAssignment.id) ? 'PERBARUI TUGAS' : 'KIRIM TUGAS SEKARANG'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <HelpGuide 
        isOpen={showHelpGuide} 
        onClose={() => setShowHelpGuide(false)} 
      />
    </div>
  );
};

export default StudentDashboard;
