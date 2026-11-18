
import React, { useState, useEffect } from 'react';
import { SubjectItem, StudentRecord, ExamType, Question, UserData, ForumMessage, LearningMaterial, Assignment, AssignmentSubmission, AppSettings } from '../types';
import { LinkifiedText } from './LinkifiedText';
import { fetchSubjects, addSubject, deleteSubject, getResults, fetchUsers, addUser, deleteUser, updateUser, addMaterialToSubject, deleteMaterialFromSubject, addForumMessage, fetchForumMessages, deleteResult, addAssignmentToSubject, deleteAssignmentFromSubject, updateAssignmentInSubject, fetchSubmissions, gradeSubmission, deleteSubmission, updateSubjectQuestions } from '../services/storageService';
import { generateQuestions } from '../services/geminiService';
import { 
  BookOpen, Plus, Trash2, Briefcase, BarChart3, 
  X, Clock, BrainCircuit, Search, Loader2, RefreshCw, 
  ChevronRight, Users, User, Award, Star, Settings, LayoutGrid, 
  Filter, Download, MoreHorizontal, Activity, PieChart as PieChartIcon, FileText, Link as LinkIcon, Video, File, FileUp,
  TrendingUp, CheckCircle2, AlertCircle, MessageSquare, Send, Eye, Calendar, ClipboardList, CheckSquare, Camera, HelpCircle, LogOut
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import HelpGuide from './HelpGuide';

interface LecturerDashboardProps {
  lecturerName: string;
  lecturerId: string;
  user: UserData;
  onLogout: () => void;
  appSettings: AppSettings;
  onUserUpdate?: () => void;
}

const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ lecturerName, lecturerId, user, onLogout, appSettings, onUserUpdate }) => {
  const backgroundUrl = appSettings.backgroundUrl;
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [results, setResults] = useState<StudentRecord[]>([]);
  const [allStudents, setAllStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY_COURSES' | 'RESULTS' | 'ANALYTICS' | 'STUDENTS' | 'MATERIALS' | 'ASSIGNMENTS' | 'GALLERY'>('MY_COURSES');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserData | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [submissionViewMode, setSubmissionViewMode] = useState<'SUBMITTED' | 'MONITORING'>('SUBMITTED');
  const [gradingSubmission, setGradingSubmission] = useState<{id: string, grade: number, feedback: string} | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({ title: "", description: "", dueDate: "", subjectId: "" });
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    loading: boolean;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: async () => {},
    loading: false
  });
  const [selectedResult, setSelectedResult] = useState<StudentRecord | null>(null);
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [forumMessage, setForumMessage] = useState("");
  const [forumMessages, setForumMessages] = useState<ForumMessage[]>([]);
  const [isForumLoading, setIsForumLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [newSub, setNewSub] = useState({ name: "", code: "", duration: 60 });
  const [newStudent, setNewStudent] = useState({ fullName: "", username: "", password: "123", className: "" });
  const [newMaterial, setNewMaterial] = useState<Omit<LearningMaterial, 'id' | 'createdAt'>>({
    title: "",
    description: "",
    type: "TEXT",
    content: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingForSubject, setGeneratingForSubject] = useState<string | null>(null);
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [editingSubjectForQuestions, setEditingSubjectForQuestions] = useState<SubjectItem | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [selectedResultClassFilter, setSelectedResultClassFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

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
    if (showForumModal && selectedSubject) {
      loadForum(selectedSubject.id);
    }
  }, [showForumModal, selectedSubject]);

  useEffect(() => { loadData(); }, []);

  const [isExporting, setIsExporting] = useState(false);

  const downloadAllSnapshots = async () => {
    const snapResults = results.filter(r => !!r.snapshot);
    if (!snapResults.length) return;
    
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("snapshots_pengerjaan");
      
      for (const res of snapResults) {
        if (!res.snapshot) continue;
        // Base64 to blob/arraybuffer
        const base64Data = res.snapshot.split(',')[1];
        const fileName = `${res.name.replace(/\s+/g, '_')}_${res.subject.replace(/\s+/g, '_')}_${res.id.substring(0, 5)}.webp`;
        folder?.file(fileName, base64Data, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `SNAPSHOTS_${new Date().toISOString().split('T')[0]}.zip`);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSingleSnapshot = (snapshotUrl: string, name: string) => {
    saveAs(snapshotUrl, `SNAPSHOT_${name.replace(/\s+/g, '_')}_${Date.now()}.webp`);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, r, u] = await Promise.all([fetchSubjects(), getResults(), fetchUsers()]);
      const mySubjects = s.filter(sub => sub.lecturerId === lecturerId || !sub.lecturerId);
      setSubjects(mySubjects); 
      const mySubjectNames = mySubjects.map(sub => sub.name);
      setResults(r.filter(res => mySubjectNames.includes(res.subject)));
      setAllStudents(u.filter(user => user.role === 'MAHASISWA'));
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.fullName || !newStudent.username) return;
    setIsSaving(true);
    try {
      if (editingStudent) {
        await updateUser(editingStudent.id, {
          fullName: newStudent.fullName,
          username: newStudent.username,
          password: newStudent.password,
          className: newStudent.className
        });
        if (onUserUpdate && editingStudent.id === user.id) onUserUpdate();
      } else {
        await addUser({ ...newStudent, role: 'MAHASISWA' });
      }
      await loadData();
      setShowStudentModal(false);
      setEditingStudent(null);
      setNewStudent({ fullName: "", username: "", password: "123", className: "" });
    } finally { setIsSaving(false); }
  };

  const handleEditStudent = (student: UserData) => {
    setEditingStudent(student);
    setNewStudent({
      fullName: student.fullName,
      username: student.username,
      password: student.password,
      className: student.className || ""
    });
    setShowStudentModal(true);
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    setDeleteModal({
      show: true,
      title: "Hapus Mahasiswa",
      message: `Hapus mahasiswa "${name}"? Semua data nilai dan progres mahasiswa ini akan tetap ada namun mahasiswa tidak bisa login lagi.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteUser(id);
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleAddSubject = async () => {
    if (!newSub.name || !newSub.code) return;
    setIsSaving(true);
    try {
      await addSubject(newSub.name, newSub.code, { duration: newSub.duration, lecturerId });
      await loadData();
      setShowAddModal(false);
      setNewSub({ name: "", code: "", duration: 60 });
    } finally { setIsSaving(false); }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    setDeleteModal({
      show: true,
      title: "Hapus Mata Kuliah",
      message: `Hapus mata kuliah "${name}"? Semua materi dan data terkait akan hilang.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteSubject(id);
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleAddMaterial = async () => {
    if (!selectedSubjectId || !newMaterial.title || !newMaterial.content) return;
    setIsSaving(true);
    try {
      await addMaterialToSubject(selectedSubjectId, newMaterial);
      await loadData();
      setShowMaterialModal(false);
      setNewMaterial({ title: "", description: "", type: "TEXT", content: "" });
    } finally { setIsSaving(false); }
  };

  const handleDeleteMaterial = async (subId: string, matId: string) => {
    const sub = subjects.find(s => s.id === subId);
    const mat = sub?.materials?.find(m => m.id === matId);
    setDeleteModal({
      show: true,
      title: "Hapus Materi",
      message: `Apakah Anda yakin ingin menghapus materi "${mat?.title}"?`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteMaterialFromSubject(subId, matId);
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleDeleteResult = async (id: string) => {
    const result = results.find(r => r.id === id);
    setDeleteModal({
      show: true,
      title: "Hapus Hasil Ujian",
      message: `Hapus hasil ujian mahasiswa "${result?.name}"? Tindakan ini permanen.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteResult(id);
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.title || !newAssignment.subjectId || !newAssignment.dueDate) return;
    setIsSaving(true);
    try {
      if (editingAssignment) {
        await updateAssignmentInSubject(newAssignment.subjectId, editingAssignment.id, {
          title: newAssignment.title,
          description: newAssignment.description,
          dueDate: newAssignment.dueDate
        });
      } else {
        await addAssignmentToSubject(newAssignment.subjectId, {
          title: newAssignment.title,
          description: newAssignment.description,
          dueDate: newAssignment.dueDate,
          subjectId: newAssignment.subjectId,
          lecturerId
        });
      }
      await loadData();
      setShowAssignmentModal(false);
      setEditingAssignment(null);
      setNewAssignment({ title: "", description: "", dueDate: "", subjectId: "" });
    } finally { setIsSaving(false); }
  };

  const handleEditAssignment = (subjectId: string, asg: Assignment) => {
    setEditingAssignment(asg);
    setNewAssignment({
      title: asg.title,
      description: asg.description || "",
      dueDate: asg.dueDate,
      subjectId: subjectId
    });
    setShowAssignmentModal(true);
  };

  const handleDeleteAssignment = async (subjectId: string, assignmentId: string) => {
    const sub = subjects.find(s => s.id === subjectId);
    const asg = sub?.assignments?.find(a => a.id === assignmentId);
    setDeleteModal({
      show: true,
      title: "Hapus Tugas",
      message: `Hapus tugas "${asg?.title}"? Semua pengumpulan mahasiswa juga akan hilang.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteAssignmentFromSubject(subjectId, assignmentId);
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionViewMode('SUBMITTED');
    setIsForumLoading(true);
    try {
      const subs = await fetchSubmissions(assignment.id);
      setSubmissions(subs);
      setShowSubmissionsModal(true);
    } finally { setIsForumLoading(false); }
  };

  const getWAUrl = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleGradeSubmission = async () => {
    if (!gradingSubmission) return;
    setIsSaving(true);
    try {
      await gradeSubmission(gradingSubmission.id, gradingSubmission.grade, gradingSubmission.feedback);
      const updated = await fetchSubmissions(selectedAssignment!.id);
      setSubmissions(updated);
      setGradingSubmission(null);
    } finally { setIsSaving(false); }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setDeleteModal({
      show: true,
      title: "Hapus Pengumpulan",
      message: "Apakah Anda yakin ingin menghapus pengumpulan ini? Mahasiswa harus mengumpulkan ulang jika data ini dihapus.",
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteSubmission(submissionId);
        const updated = await fetchSubmissions(selectedAssignment!.id);
        setSubmissions(updated);
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setNewMaterial({ ...newMaterial, content: base64, type: file.type.includes('pdf') ? 'PDF' : 'TEXT' });
    };
    reader.readAsDataURL(file);
  };

  const handleExportPDF = () => {
    const filteredResults = results.filter(r => {
      const subjectMatch = selectedSubjectFilter === "ALL" || r.subject === selectedSubjectFilter;
      const student = allStudents.find(s => s.username === r.nim);
      const classMatch = selectedResultClassFilter === "ALL" || student?.className === selectedResultClassFilter;
      const searchMatch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.nim.includes(searchTerm);
      return subjectMatch && classMatch && searchMatch;
    });

    if (filteredResults.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const doc = new jsPDF();
    const tableColumn = ["No", "Mahasiswa", "NIM", "Kelas", "Mata Kuliah", "Tipe", "Skor", "Waktu"];
    const tableRows: any[] = [];

    filteredResults.forEach((r, index) => {
      const student = allStudents.find(s => s.username === r.nim);
      const resultData = [
        index + 1,
        r.name,
        r.nim,
        student?.className || '-',
        r.subject,
        r.examType,
        r.score,
        r.timestamp
      ];
      tableRows.push(resultData);
    });

    doc.setFontSize(18);
    doc.text("Laporan Hasil Ujian Mahasiswa", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Dosen: ${lecturerName}`, 14, 30);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 35);
    
    if (selectedSubjectFilter !== "ALL") doc.text(`Mata Kuliah: ${selectedSubjectFilter}`, 14, 40);
    if (selectedResultClassFilter !== "ALL") doc.text(`Kelas: ${selectedResultClassFilter}`, 14, 45);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Laporan_Nilai_${selectedSubjectFilter}_${selectedResultClassFilter}_${Date.now()}.pdf`);
  };

  const generateAIQuestions = async (subject: SubjectItem) => {
    setGeneratingForSubject(subject.name);
    try {
      const q = await generateQuestions(subject.name, 'UTS', true);
      const questionsWithIds = q.map((question, idx) => ({
        ...question,
        id: `q-${Date.now()}-${idx}`
      }));
      setEditingQuestions(questionsWithIds);
      setEditingSubjectForQuestions(subject);
      setShowQuestionBankModal(true);
      alert(`AI Berhasil merumuskan 30 soal evaluasi. Silakan tinjau dan simpan ke database.`);
    } catch (err: any) {
      alert(err.message || "Gagal merumuskan soal AI. Periksa koneksi internet.");
    } finally {
      setGeneratingForSubject(null);
    }
  };

  const handleSaveQuestions = async () => {
    if (!editingSubjectForQuestions) return;
    setIsSaving(true);
    try {
      await updateSubjectQuestions(editingSubjectForQuestions.id, editingQuestions);
      alert("Berhasil menyimpan ke Bank Soal!");
      await loadData();
      setShowQuestionBankModal(false);
    } catch (err) {
      alert("Gagal menyimpan ke database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendForumMessage = async () => {
    if (!selectedSubject || !forumMessage.trim()) return;
    setIsSending(true);
    try {
      await addForumMessage(selectedSubject.id, {
        userId: lecturerId,
        userName: lecturerName,
        userRole: 'DOSEN',
        text: forumMessage.trim()
      });
      setForumMessage("");
      await loadForum(selectedSubject.id);
    } finally { setIsSending(false); }
  };

  const stats = {
    totalCourses: subjects.length,
    totalStudents: Array.from(new Set(results.map(r => r.nim))).length,
    avgScore: results.length ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length) : 0,
    examPassRate: results.length ? Math.round((results.filter(r => r.score >= 60).length / results.length) * 100) : 0
  };

  const renderContent = () => {
    if (activeTab === 'MY_COURSES') {
      return (
        <section className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Bank Mata Kuliah</h3>
            <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-8 py-5 rounded-3xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
               <Plus className="w-5 h-5" /> TAMBAH MK
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {subjects.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(sub => (
              <div key={sub.id} className="bg-white rounded-[48px] border border-slate-100 p-10 hover:shadow-2xl transition-all duration-500 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -mr-10 -mt-10 group-hover:bg-indigo-600 group-hover:w-full group-hover:h-full group-hover:rounded-none transition-all duration-700 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-50 group-hover:rotate-6 transition-all">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id, sub.name); }} className="p-3 bg-white/50 backdrop-blur rounded-xl border border-slate-100 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mb-3 group-hover:text-white/60">{sub.code}</p>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight mb-8 group-hover:text-white transition-colors">{sub.name}</h3>
                  <div className="flex items-center gap-6 mb-10">
                     <div className="flex items-center gap-2 text-slate-400 group-hover:text-white/70"><Clock className="w-4 h-4" /> <span className="text-xs font-bold">{sub.duration || 60}m</span></div>
                     <div className="flex items-center gap-2 text-slate-400 group-hover:text-white/70"><BrainCircuit className="w-4 h-4" /> <span className="text-xs font-bold">{sub.questions?.length || 0} Soal</span></div>
                  </div>
                  <div className="flex flex-col gap-3 mb-10">
                    <button disabled={generatingForSubject === sub.name} onClick={() => generateAIQuestions(sub)} className="w-full py-5 bg-indigo-50 text-indigo-600 group-hover:bg-white group-hover:text-indigo-600 rounded-[24px] font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                      {generatingForSubject === sub.name ? <Loader2 className="animate-spin w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />} RUMUSKAN 30 SOAL AI
                    </button>
                    <button onClick={() => { setEditingQuestions(sub.questions || []); setEditingSubjectForQuestions(sub); setShowQuestionBankModal(true); }} className="w-full py-5 bg-white border border-slate-100 text-slate-600 group-hover:bg-white/20 group-hover:text-white rounded-[24px] font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                      <BookOpen className="w-4 h-4" /> KELOLA BANK SOAL ({sub.questions?.length || 0})
                    </button>
                    <button onClick={() => { setSelectedSubject(sub); setShowForumModal(true); }} className="w-full py-5 bg-slate-50 text-slate-600 group-hover:bg-white/20 group-hover:text-white rounded-[24px] font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" /> DISKUSI FORUM
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === 'RESULTS') {
      return (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="animate-in fade-in duration-500"
        >
           <div className="bg-white rounded-[56px] border border-slate-100 overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evaluasi Mahasiswa</h3>
                   <p className="text-slate-400 font-bold text-sm">Monitoring pengerjaan ujian real-time.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                   <div className="w-full sm:w-40">
                     <select 
                       value={selectedSubjectFilter} 
                       onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                       className="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none cursor-pointer text-xs"
                     >
                       <option value="ALL">SEMUA MK</option>
                       {subjects.map(s => (
                         <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>
                       ))}
                     </select>
                   </div>
                   <div className="w-full sm:w-40">
                     <select 
                       value={selectedResultClassFilter} 
                       onChange={(e) => setSelectedResultClassFilter(e.target.value)}
                       className="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none cursor-pointer text-xs"
                     >
                       <option value="ALL">SEMUA KELAS</option>
                       {Array.from(new Set(allStudents.map(u => u.className).filter(Boolean))).sort().map(cls => (
                         <option key={cls} value={cls}>{cls}</option>
                       ))}
                     </select>
                   </div>
                   <div className="w-full sm:w-40">
                     <input 
                       type="date"
                       value={dateFilter}
                       onChange={(e) => setDateFilter(e.target.value)}
                       className="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none cursor-pointer text-xs px-4"
                     />
                   </div>
                   <button onClick={loadData} className="w-full sm:w-auto p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center">
                     <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                   </button>
                   <button onClick={handleExportPDF} className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                     <Download className="w-4 h-4" /> EXPORT PDF
                   </button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mahasiswa</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Kuliah</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hasil</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results
                      .filter(r => {
                        const subjectMatch = selectedSubjectFilter === "ALL" || r.subject === selectedSubjectFilter;
                        const student = allStudents.find(s => s.username === r.nim);
                        const classMatch = selectedResultClassFilter === "ALL" || student?.className === selectedResultClassFilter;
                        
                        let dateMatch = true;
                        if (dateFilter) {
                          const recordDate = r.timestamp || r.endTime || r.startTime || "";
                          dateMatch = recordDate.includes(dateFilter);
                          if (!dateMatch && recordDate.includes('/') && dateFilter.includes('-')) {
                            const [y, m, d] = dateFilter.split('-');
                            const formattedFilter = `${d}/${m}/${y}`;
                            dateMatch = recordDate.includes(formattedFilter);
                          }
                        }
                        
                        const searchMatch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.nim.includes(searchTerm);
                        return subjectMatch && classMatch && dateMatch && searchMatch;
                      })
                      .sort((a, b) => {
                        const dateA = new Date(a.timestamp || a.endTime || a.startTime || 0).getTime();
                        const dateB = new Date(b.timestamp || b.endTime || b.startTime || 0).getTime();
                        return dateB - dateA;
                      })
                      .map(r => {
                        const student = allStudents.find(s => s.username === r.nim);
                        return (
                      <tr key={r.id} className="hover:bg-slate-50/30 transition-all">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                             {r.snapshot ? (
                               <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm flex-shrink-0 cursor-pointer hover:scale-110 transition-transform" onClick={() => setViewingSnapshot(r.snapshot!)}>
                                 <img src={r.snapshot} alt="Thumb" className="max-w-full max-h-full object-contain" />
                               </div>
                             ) : (
                               <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">{r.name.charAt(0)}</div>
                             )}
                             <div><p className="font-black text-slate-800 text-base uppercase tracking-tight">{r.name}</p><p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{r.nim}</p></div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                           <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider">{student?.className || '-'}</span>
                        </td>
                        <td className="px-10 py-8"><p className="font-black text-indigo-600 text-sm">{r.subject}</p><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{r.examType}</p></td>
                        <td className="px-10 py-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                             <div className={`text-3xl font-black tracking-tighter ${r.score >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.score}</div>
                             {r.snapshot && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setViewingSnapshot(r.snapshot!); }}
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                               >
                                 <Camera className="w-3.5 h-3.5" /> Lihat Foto
                               </button>
                             )}
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex gap-2">
                            <button onClick={() => { setSelectedResult(r); setShowResultDetail(true); }} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDeleteResult(r.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                    {results.filter(r => {
                      const subjectMatch = selectedSubjectFilter === "ALL" || r.subject === selectedSubjectFilter;
                      const student = allStudents.find(s => s.username === r.nim);
                      const classMatch = selectedResultClassFilter === "ALL" || student?.className === selectedResultClassFilter;
                      const searchMatch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.nim.includes(searchTerm);
                      return subjectMatch && classMatch && searchMatch;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center text-slate-400 font-bold italic">
                          Tidak ada data nilai yang ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </motion.section>
      );
    }

    if (activeTab === 'STUDENTS') {
      return (
        <section className="animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Daftar Mahasiswa</h3>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <div className="w-full md:w-64">
                <select 
                  value={selectedClassFilter} 
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white border-none ring-1 ring-slate-200 font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none cursor-pointer text-xs"
                >
                  <option value="ALL">SEMUA KELAS</option>
                  {Array.from(new Set(allStudents.map(u => u.className).filter(Boolean))).sort().map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setShowStudentModal(true)} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">
                <Plus className="w-5 h-5" /> TAMBAH MAHASISWA
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[56px] border border-slate-100 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">NIM / Username</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Terdaftar Pada</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allStudents.filter(s => 
                    (selectedClassFilter === "ALL" || s.className === selectedClassFilter) &&
                    (s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.username.includes(searchTerm))
                  ).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/30 transition-all">
                      <td className="px-10 py-8 font-black text-slate-800 uppercase tracking-tight">{s.fullName}</td>
                      <td className="px-10 py-8 font-mono font-bold text-slate-400">{s.username}</td>
                      <td className="px-10 py-8 font-bold text-xs text-emerald-600 uppercase">{s.className || '-'}</td>
                      <td className="px-10 py-8 text-slate-400 text-xs">{new Date(s.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="px-10 py-8">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditStudent(s)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteStudent(s.id, s.fullName)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === 'MATERIALS') {
      return (
        <section className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Materi Pembelajaran</h3>
          </div>

          <div className="space-y-10">
            {subjects.map(sub => (
              <div key={sub.id} className="bg-white rounded-[48px] border border-slate-100 p-10 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">{sub.name}</h4>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{sub.code}</p>
                  </div>
                  <button onClick={() => { setSelectedSubjectId(sub.id); setShowMaterialModal(true); }} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-indigo-100 transition-all">
                    <Plus className="w-4 h-4" /> TAMBAH MATERI
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sub.materials?.map(mat => (
                    <div key={mat.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                      <button onClick={() => handleDeleteMaterial(sub.id, mat.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                          {mat.type === 'VIDEO' ? <Video className="w-5 h-5" /> : mat.type === 'PDF' ? <FileText className="w-5 h-5" /> : mat.type === 'LINK' ? <LinkIcon className="w-5 h-5" /> : <File className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm truncate max-w-[150px]">{mat.title}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{mat.type}</p>
                        </div>
                      </div>
                      <LinkifiedText text={mat.description || 'Tidak ada deskripsi.'} className="text-xs text-slate-500 font-medium line-clamp-2 mb-4" />
                      <a href={mat.content} target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Buka Materi</a>
                    </div>
                  ))}
                  {(!sub.materials || sub.materials.length === 0) && (
                    <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      <p className="text-slate-400 font-bold text-sm italic">Belum ada materi untuk mata kuliah ini.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === 'GALLERY') {
      const snapResults = results.filter(r => !!r.snapshot);
      return (
        <section className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Galeri Snapshot Mahasiswa</h3>
              <div className="text-slate-400 font-bold uppercase tracking-widest text-xs font-mono mt-1">Total: {snapResults.length} Snapshots</div>
            </div>
            {snapResults.length > 0 && (
              <button 
                onClick={downloadAllSnapshots} 
                disabled={isExporting}
                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-[24px] font-black text-sm tracking-widest uppercase transition-all shadow-xl hover:shadow-indigo-200 active:scale-95"
              >
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                UNDUH SEMUA ZIP
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-8">
            {snapResults.map((r, idx) => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 cursor-pointer"
              >
                <div className="aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-50 relative">
                  <img src={r.snapshot} className="max-w-full max-h-full object-contain" alt={r.name} loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => setViewingSnapshot(r.snapshot!)}
                      className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110"
                      title="Lihat Detail"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadSingleSnapshot(r.snapshot!, r.name); }}
                      className="p-3 bg-white hover:bg-slate-50 rounded-full text-slate-900 shadow-xl transition-all transform hover:scale-110"
                      title="Unduh Foto"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6" onClick={() => setViewingSnapshot(r.snapshot!)}>
                  <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight mb-1">{r.name}</p>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{r.subject}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">{r.timestamp || r.endTime}</p>
                </div>
                <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.div>
            ))}
            {snapResults.length === 0 && (
              <div className="col-span-full py-24 text-center bg-white rounded-[64px] border-2 border-dashed border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="w-10 h-10 text-slate-200" />
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Galeri Kosong</h4>
                <p className="text-slate-400 font-bold text-sm tracking-wide">Belum ada foto snapshot pengerjaan mahasiswa yang terekam.</p>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activeTab === 'ANALYTICS') {
      const scoreDistribution = [
        { name: '0-20', count: results.filter(r => r.score <= 20).length },
        { name: '21-40', count: results.filter(r => r.score > 20 && r.score <= 40).length },
        { name: '41-60', count: results.filter(r => r.score > 40 && r.score <= 60).length },
        { name: '61-80', count: results.filter(r => r.score > 60 && r.score <= 80).length },
        { name: '81-100', count: results.filter(r => r.score > 80).length },
      ];

      const passFailData = [
        { name: 'Lulus', value: results.filter(r => r.score >= 60).length, color: '#10b981' },
        { name: 'Gagal', value: results.filter(r => r.score < 60).length, color: '#ef4444' },
      ];

      const subjectPerformance = subjects.map(s => {
        const subResults = results.filter(r => r.subject === s.name);
        const avg = subResults.length ? Math.round(subResults.reduce((a, b) => a + b.score, 0) / subResults.length) : 0;
        return { name: s.code, average: avg };
      });

      return (
        <section className="animate-in fade-in duration-500 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Score Distribution Chart */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Distribusi Nilai</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seluruh Mata Kuliah</p>
                </div>
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pass/Fail Ratio */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Rasio Kelulusan</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Batas Nilai: 60</p>
                </div>
                <PieChartIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="h-80 w-full flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={passFailData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {passFailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4 pr-10">
                  {passFailData.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</p>
                        <p className="text-lg font-black text-slate-800">{item.value} Mhs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Subject Performance Comparison */}
          <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Performa Antar Mata Kuliah</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rata-rata Nilai per Kode MK</p>
              </div>
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={subjectPerformance}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                  <Area type="monotone" dataKey="average" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAvg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Integrity Alert Section */}
          <div className="bg-slate-900 p-10 rounded-[48px] text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="w-24 h-24 bg-white/10 rounded-[32px] flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-2xl font-black tracking-tight mb-2">Deteksi Anomali Integritas</h4>
                <p className="text-white/50 font-bold leading-relaxed">Sistem AI kami mendeteksi {results.filter(r => r.violations > 3).length} pengerjaan dengan tingkat pelanggaran tinggi. Silakan tinjau log monitoring untuk detail lebih lanjut.</p>
              </div>
              <button onClick={() => setActiveTab('RESULTS')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs tracking-widest uppercase hover:scale-105 transition-all">Tinjau Log</button>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === 'ASSIGNMENTS') {
      return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Manajemen Tugas</h3>
              <p className="text-slate-400 font-bold text-sm">Berikan tugas dan pantau pengumpulan mahasiswa.</p>
            </div>
            <button onClick={() => setShowAssignmentModal(true)} className="bg-indigo-600 text-white px-8 py-5 rounded-3xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
               <Plus className="w-5 h-5" /> BUAT TUGAS BARU
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {subjects.map(sub => (
              <div key={sub.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{sub.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">{sub.code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sub.assignments && sub.assignments.length > 0 ? (
                    sub.assignments.map(asg => (
                      <div key={asg.id} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <h5 className="text-lg font-black text-slate-800 uppercase leading-tight">{asg.title}</h5>
                          <div className="flex gap-1">
                            <button onClick={() => handleEditAssignment(sub.id, asg)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                              <FileText className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteAssignment(sub.id, asg.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <LinkifiedText text={asg.description || ""} className="text-slate-500 text-sm font-medium mb-6 line-clamp-2" />
                        <div className="flex items-center gap-2 text-slate-400 mb-6">
                          <Calendar className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Deadline: {new Date(asg.dueDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleViewSubmissions(asg)} className="w-full py-4 bg-white border border-slate-200 text-indigo-600 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2">
                            <Eye className="w-4 h-4" /> Lihat Pengumpulan
                          </button>
                          <a 
                            href={getWAUrl("", `Halo, pengingat tugas "${asg.title}" untuk mata kuliah ini akan segera berakhir pada ${new Date(asg.dueDate).toLocaleString('id-ID')}. Mohon segera dikumpulkan ya.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" /> Broadcast WA
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">Belum ada tugas untuk mata kuliah ini.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="animate-in fade-in duration-500">
        <div className="bg-white p-20 rounded-[60px] border border-slate-100 text-center shadow-xl">
           <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-10"><PieChartIcon className="w-12 h-12" /></div>
           <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Analisa Akademik</h3>
           <p className="text-slate-400 font-bold max-w-lg mx-auto leading-relaxed">Fitur ini sedang dalam pengembangan AI. Segera hadir visualisasi sebaran nilai dan deteksi kecurangan sistematis.</p>
        </div>
      </section>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin w-16 h-16 text-indigo-600 mb-6" />
      <p className="font-black text-slate-400 tracking-[6px] uppercase text-[10px] animate-pulse">Memuat Panel Dosen...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Briefcase className="w-5 h-5" />
          </div>
          <h1 className="font-black text-lg tracking-tighter uppercase">Dosen</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-[56] h-screen bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
        w-72 lg:w-80 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-[20px] flex items-center justify-center shadow-xl rotate-6">
            <Briefcase className="w-7 h-7" />
          </div>
          <div><h1 className="font-black text-2xl tracking-tighter font-display uppercase">DOSEN PANEL</h1><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[3px] mt-1">EMYE EDU V2</p></div>
        </div>

        <div className="px-6 py-4">
          <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 flex items-center gap-5">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5"><User className="w-6 h-6 text-indigo-300" /></div>
            <div className="overflow-hidden"><p className="font-black text-sm truncate uppercase tracking-tight">{lecturerName}</p><p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">NIDN Terverifikasi</p></div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8 overflow-y-auto scrollbar-hide">
          <button onClick={() => { setActiveTab('MY_COURSES'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === 'MY_COURSES' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutGrid className="w-5 h-5" /> MATA KULIAH
          </button>
          <button onClick={() => { setActiveTab('STUDENTS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === 'STUDENTS' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Users className="w-5 h-5" /> MAHASISWA
          </button>
          <button onClick={() => { setActiveTab('MATERIALS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === 'MATERIALS' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <FileText className="w-5 h-5" /> MATERI
          </button>
          <button onClick={() => { setActiveTab('ASSIGNMENTS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === 'ASSIGNMENTS' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <ClipboardList className="w-5 h-5" /> TUGAS
          </button>
          <button onClick={() => { setActiveTab('RESULTS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === 'RESULTS' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Activity className="w-5 h-5" /> MONITORING NILAI
          </button>
          <button onClick={() => { setActiveTab('GALLERY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === 'GALLERY' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Camera className="w-5 h-5" /> GALERI FOTO
          </button>
          <button onClick={() => { setActiveTab('ANALYTICS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === 'ANALYTICS' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <BarChart3 className="w-5 h-5" /> ANALISA DATA
          </button>
        </nav>

        <div className="p-8">
           <button onClick={() => setShowHelpGuide(true)} className="w-full flex items-center gap-5 px-6 py-5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-[24px] font-black text-xs tracking-widest transition-all cursor-pointer mb-2"><HelpCircle className="w-5 h-5" /> BANTUAN</button>
           <button onClick={onLogout} className="w-full flex items-center gap-5 px-6 py-5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-[24px] font-black text-xs tracking-widest transition-all cursor-pointer"><LogOut className="w-5 h-5" /> KELUAR</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 lg:p-14 overflow-y-auto pb-24 relative">
        {backgroundUrl && (
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-20 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
        )}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10 md:mb-16 relative z-10">
          <div><h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-2">Dashboard Dosen</h2><p className="text-slate-400 font-bold uppercase tracking-[4px] text-[10px]">E-Learning Management System</p></div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none"><Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><input type="text" placeholder="Cari..." className="pl-14 pr-6 py-4 bg-white rounded-2xl border-none ring-1 ring-slate-100 outline-none shadow-sm font-bold text-sm w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <button onClick={() => loadData()} className="p-4 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0"><RefreshCw className="w-5 h-5 text-slate-400" /></button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8 mb-10 md:mb-16">
           {[
             { label: 'TOTAL MK', val: stats.totalCourses, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
             { label: 'MAHASISWA', val: stats.totalStudents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'SKOR RATA', val: stats.avgScore, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
             { label: 'LULUS', val: `${stats.examPassRate}%`, icon: Award, color: 'text-rose-600', bg: 'bg-rose-50' }
           ].map((s, i) => (
             <div key={i} className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                <div className={`w-12 h-12 md:w-14 md:h-14 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-4 md:mb-6`}><s.icon className="w-6 h-6 md:w-7 md:h-7" /></div>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{s.val}</h3>
             </div>
           ))}
        </section>

        {renderContent()}
        
        <footer className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{appSettings?.footerText || `© ${new Date().getFullYear()} ${appSettings?.appName || 'EMYE EDU'}`}</p>
          <div className="flex gap-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors">Bantuan Teknis</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors">Panduan Dosen</span>
          </div>
        </footer>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[60px] max-w-lg w-full p-12 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter">BUAT MATA KULIAH</h3>
               <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full cursor-pointer"><X className="w-8 h-8" /></button>
            </div>
            <div className="space-y-8">
              <input type="text" placeholder="Nama Mata Kuliah" className="w-full p-6 rounded-[32px] bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-slate-800 text-lg shadow-inner" value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} />
              <input type="text" placeholder="Kode MK (Contoh: UX-101)" className="w-full p-6 rounded-[32px] bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-mono font-bold text-slate-800 text-lg shadow-inner uppercase" value={newSub.code} onChange={e => setNewSub({...newSub, code: e.target.value.toUpperCase()})} />
              <button onClick={handleAddSubject} disabled={isSaving} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[32px] shadow-2xl hover:scale-105 transition-all disabled:opacity-50 text-lg flex items-center justify-center">
                {isSaving ? <Loader2 className="animate-spin" /> : 'SIMPAN DATA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[60px] max-w-lg w-full p-12 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{editingStudent ? 'EDIT DATA' : 'TAMBAH'} MAHASISWA</h3>
               <button onClick={() => { setShowStudentModal(false); setEditingStudent(null); setNewStudent({ fullName: "", username: "", password: "123", className: "" }); }} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full cursor-pointer"><X className="w-8 h-8" /></button>
            </div>
            <div className="space-y-8">
              <input type="text" placeholder="Nama Lengkap" className="w-full p-6 rounded-[32px] bg-slate-50 border-2 border-transparent focus:border-emerald-600 outline-none transition-all font-bold text-slate-800 text-lg shadow-inner" value={newStudent.fullName} onChange={e => setNewStudent({...newStudent, fullName: e.target.value})} />
              <input type="text" placeholder="NIM / Username" className="w-full p-6 rounded-[32px] bg-slate-50 border-2 border-transparent focus:border-emerald-600 outline-none transition-all font-mono font-bold text-slate-800 text-lg shadow-inner" value={newStudent.username} onChange={e => setNewStudent({...newStudent, username: e.target.value})} />
              <input type="text" placeholder="Kelas (Contoh: TI-A)" className="w-full p-6 rounded-[32px] bg-slate-50 border-2 border-transparent focus:border-emerald-600 outline-none transition-all font-bold text-slate-800 text-lg shadow-inner uppercase" value={newStudent.className} onChange={e => setNewStudent({...newStudent, className: e.target.value.toUpperCase()})} />
              <input type="password" placeholder="Password (Kosongkan jika tidak ingin diubah)" className="w-full p-6 rounded-[32px] bg-slate-50 border-2 border-transparent focus:border-emerald-600 outline-none transition-all font-bold text-slate-800 text-lg shadow-inner" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
              <button onClick={handleAddStudent} disabled={isSaving} className="w-full py-6 bg-emerald-600 text-white font-black rounded-[32px] shadow-2xl hover:scale-105 transition-all disabled:opacity-50 text-lg flex items-center justify-center">
                {isSaving ? <Loader2 className="animate-spin" /> : editingStudent ? 'PERBARUI MAHASISWA' : 'SIMPAN MAHASISWA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter uppercase">{deleteModal.title}</h3>
            <p className="text-slate-500 font-bold text-sm mb-10 leading-relaxed">
              {deleteModal.message}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                disabled={deleteModal.loading}
                onClick={deleteModal.onConfirm} 
                className="w-full py-5 bg-red-600 text-white font-black rounded-3xl shadow-xl shadow-red-100 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteModal.loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'YA, HAPUS SEKARANG'}
              </button>
              <button 
                onClick={() => setDeleteModal(prev => ({ ...prev, show: false }))} 
                className="w-full py-5 bg-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition-all"
              >
                BATALKAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forum Modal */}
      <AnimatePresence>
        {showQuestionBankModal && editingSubjectForQuestions && (
        <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[48px] p-10 max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Bank Soal ({editingQuestions.length})</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{editingSubjectForQuestions.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const newQ: Question = {
                      id: `q-${Date.now()}`,
                      text: "Pertanyaan baru...",
                      options: ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
                      correctAnswerIndex: 0,
                      subject: editingSubjectForQuestions.name
                    };
                    setEditingQuestions([newQ, ...editingQuestions]);
                  }}
                  className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <Plus className="w-4 h-4" /> TAMBAH MANUAL
                </button>
                <button onClick={() => setShowQuestionBankModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar mb-8">
              {editingQuestions.length > 0 ? (
                editingQuestions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 relative group">
                    <button 
                      onClick={() => setEditingQuestions(editingQuestions.filter((_, i) => i !== qIdx))}
                      className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Pertanyaan #{qIdx + 1}</label>
                        <textarea 
                          className="w-full p-6 rounded-2xl bg-white border-none ring-1 ring-slate-100 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-800 text-sm h-24 resize-none"
                          value={q.text}
                          onChange={e => {
                            const newQs = [...editingQuestions];
                            newQs[qIdx].text = e.target.value;
                            setEditingQuestions(newQs);
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3">
                            <button 
                              onClick={() => {
                                const newQs = [...editingQuestions];
                                newQs[qIdx].correctAnswerIndex = oIdx;
                                setEditingQuestions(newQs);
                              }}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${q.correctAnswerIndex === oIdx ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300 border border-slate-100'}`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </button>
                            <input 
                              type="text"
                              className="flex-1 p-4 rounded-xl bg-white border-none ring-1 ring-slate-100 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-700 text-xs"
                              value={opt}
                              onChange={e => {
                                const newQs = [...editingQuestions];
                                newQs[qIdx].options[oIdx] = e.target.value;
                                setEditingQuestions(newQs);
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Penjelasan (Opsional)</label>
                        <input 
                          type="text"
                          className="w-full p-4 rounded-xl bg-white border-none ring-1 ring-slate-100 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-600 text-xs"
                          placeholder="Berikan penjelasan kenapa jawaban tersebut benar..."
                          value={q.explanation || ''}
                          onChange={e => {
                            const newQs = [...editingQuestions];
                            newQs[qIdx].explanation = e.target.value;
                            setEditingQuestions(newQs);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <BrainCircuit className="w-16 h-16 text-slate-200 mb-6" />
                  <p className="text-slate-400 font-bold">Belum ada soal. Gunakan AI atau tambah manual.</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowQuestionBankModal(false)}
                className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[24px] font-black tracking-widest uppercase hover:bg-slate-200 transition-all"
              >
                BATAL
              </button>
              <button 
                onClick={handleSaveQuestions}
                disabled={isSaving || editingQuestions.length === 0}
                className="flex-[2] py-5 bg-indigo-600 text-white rounded-[24px] font-black tracking-widest uppercase shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                SIMPAN KE DATABASE BANK SOAL
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showForumModal && selectedSubject && (
          <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[48px] p-10 max-w-3xl w-full h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Forum Diskusi</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{selectedSubject.name}</p>
                </div>
                <button onClick={() => setShowForumModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar mb-8">
                {isForumLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : forumMessages.length > 0 ? (
                  forumMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.userId === lecturerId ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-5 rounded-[24px] shadow-sm ${msg.userId === lecturerId ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${msg.userId === lecturerId ? 'text-indigo-100' : 'text-slate-400'}`}>{msg.userName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${msg.userRole === 'DOSEN' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>{msg.userRole}</span>
                        </div>
                        <LinkifiedText text={msg.text} className="text-sm font-medium leading-relaxed" />
                        <p className={`text-[8px] font-mono mt-3 ${msg.userId === lecturerId ? 'text-indigo-200' : 'text-slate-300'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <MessageSquare className="w-16 h-16 text-slate-200 mb-6" />
                    <p className="text-slate-400 font-bold">Belum ada diskusi di mata kuliah ini.</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Tulis balasan atau pesan baru..." 
                  className="w-full pl-8 pr-20 py-5 bg-slate-50 rounded-[24px] border-none focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-sm transition-all"
                  value={forumMessage}
                  onChange={e => setForumMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendForumMessage()}
                />
                <button 
                  onClick={handleSendForumMessage}
                  disabled={isSending || !forumMessage.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Detail Modal */}
      <AnimatePresence>
        {/* Snapshot Preview Modal */}
      {viewingSnapshot && (
        <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-10 max-w-lg w-full text-center shadow-2xl relative">
            <button onClick={() => setViewingSnapshot(null)} className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tighter uppercase">SNAPSHOT PENGERJAAN</h3>
            <div className="aspect-video bg-black rounded-[32px] overflow-hidden border-4 border-slate-50 shadow-inner mb-8 flex items-center justify-center">
               <img src={viewingSnapshot} alt="Student Snapshot" className="max-w-full max-h-full object-contain" />
            </div>
            <button 
              onClick={() => downloadSingleSnapshot(viewingSnapshot!, "SNAPSHOT_EXAM")}
              className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-sm tracking-widest uppercase transition-all shadow-xl mb-6"
            >
              <Download className="w-5 h-5" /> UNDUH FOTO INI
            </button>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">FOTO INI DIAMBIL SECARA OTOMATIS OLEH SISTEM SAAT MAHASISWA MENYELESAIKAN UJIAN.</p>
          </div>
        </div>
      )}

      {showResultDetail && selectedResult && (
          <div className="fixed inset-0 z-[400] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[48px] p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full"></div>
              
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Detail Monitoring</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{selectedResult.name} • {selectedResult.nim}</p>
                </div>
                <button onClick={() => setShowResultDetail(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-10 relative z-10">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nilai Akhir</p>
                  <p className="text-4xl font-black text-indigo-600">{selectedResult.score}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Integritas</p>
                  <p className={`text-4xl font-black ${selectedResult.confidenceScore && selectedResult.confidenceScore > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedResult.confidenceScore || 100}%
                  </p>
                </div>
              </div>

              {selectedResult.snapshot && (
                <div className="mb-10 relative z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Bukti Foto Pengerjaan
                  </p>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="w-24 h-16 bg-slate-900 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0 flex items-center justify-center">
                      <img src={selectedResult.snapshot} alt="Thumbnail" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Presensi Wajah</p>
                      <button 
                        onClick={() => setViewingSnapshot(selectedResult.snapshot!)}
                        className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition shadow-lg shadow-indigo-100"
                      >
                        Lihat Foto Full
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6 relative z-10">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" /> Log Pelanggaran ({selectedResult.violations})
                </h4>
                <div className="max-h-60 overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                  {selectedResult.suspiciousPatterns && selectedResult.suspiciousPatterns.length > 0 ? (
                    selectedResult.suspiciousPatterns.map((p, i) => (
                      <div key={i} className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
                        <div className="w-2 h-2 bg-rose-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <p className="text-sm font-bold text-rose-700 leading-relaxed">{p}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold text-sm">Tidak ada pelanggaran terdeteksi.</p>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => setShowResultDetail(false)} className="w-full mt-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-sm tracking-widest uppercase hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">Tutup Detail</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showAssignmentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] md:rounded-[60px] max-w-lg w-full p-8 md:p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-white z-10 pb-4">
               <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">{editingAssignment ? 'EDIT TUGAS' : 'BUAT TUGAS'}</h3>
               <button onClick={() => { setShowAssignmentModal(false); setEditingAssignment(null); setNewAssignment({ title: "", description: "", dueDate: "", subjectId: "" }); }} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full cursor-pointer"><X className="w-6 h-6 md:w-8 h-8" /></button>
            </div>
            <div className="space-y-6">
              {!editingAssignment && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Pilih Mata Kuliah</label>
                  <select className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-black text-slate-700 appearance-none cursor-pointer" value={newAssignment.subjectId} onChange={e => setNewAssignment({...newAssignment, subjectId: e.target.value})}>
                    <option value="">Pilih Mata Kuliah</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
              <input type="text" placeholder="Judul Tugas" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-slate-800 shadow-inner" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} />
              <textarea placeholder="Instruksi Tugas" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-medium text-slate-800 shadow-inner h-32 resize-none" value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Batas Waktu (Deadline)</label>
                <input type="datetime-local" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-slate-800 shadow-inner" value={newAssignment.dueDate} onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})} />
              </div>
              <button onClick={handleAddAssignment} disabled={isSaving} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[32px] shadow-2xl hover:scale-105 transition-all disabled:opacity-50 text-lg flex items-center justify-center">
                {isSaving ? <Loader2 className="animate-spin" /> : (editingAssignment ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN TUGAS')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmissionsModal && selectedAssignment && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[60px] max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl relative overflow-hidden custom-scrollbar">
            <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 gap-6">
               <div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Pengumpulan Tugas</h3>
                 <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{selectedAssignment.title}</p>
               </div>
               <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-sm">
                 <button 
                  onClick={() => setSubmissionViewMode('SUBMITTED')}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${submissionViewMode === 'SUBMITTED' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                 >
                   Sudah Kumpul
                 </button>
                 <button 
                  onClick={() => setSubmissionViewMode('MONITORING')}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${submissionViewMode === 'MONITORING' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                 >
                   Monitoring (Belum)
                 </button>
               </div>
               <button onClick={() => setShowSubmissionsModal(false)} className="p-4 bg-white text-slate-400 hover:text-rose-600 rounded-3xl shadow-sm border border-slate-100 transition-all"><X className="w-8 h-8" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
               {isForumLoading ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                   <Loader2 className="w-12 h-12 animate-spin" />
                   <p className="font-black text-xs uppercase tracking-widest">Memuat...</p>
                 </div>
               ) : submissionViewMode === 'MONITORING' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {allStudents
                     .filter(s => s.followedSubjectIds?.includes(selectedAssignment.subjectId))
                     .map(student => {
                       const isSubmitted = submissions.some(subm => subm.studentNim === student.username);
                       if (isSubmitted) return null;
                       return (
                         <div key={student.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-black">
                               {student.fullName.charAt(0)}
                             </div>
                             <div>
                               <p className="font-black text-slate-900 text-sm uppercase tracking-tight line-clamp-1">{student.fullName}</p>
                               <p className="text-[10px] text-slate-400 font-mono">{student.username}</p>
                             </div>
                           </div>
                           {student.whatsapp && (
                             <a 
                               href={getWAUrl(student.whatsapp, `Halo ${student.fullName}, pengingat tugas "${selectedAssignment.title}" belum Anda kumpulkan. Batas waktu: ${new Date(selectedAssignment.dueDate).toLocaleString('id-ID')}. Mohon segera dikerjakan ya.`)}
                               target="_blank"
                               rel="noreferrer"
                               className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                               title="Kirim Pengingat WA"
                             >
                               <MessageSquare className="w-5 h-5" />
                             </a>
                           )}
                         </div>
                       );
                     })}
                 </div>
               ) : submissions.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-50">
                   <ClipboardList className="w-20 h-20" />
                   <p className="font-black text-xs uppercase tracking-widest">Belum ada mahasiswa yang mengumpulkan.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6">
                   {submissions.map((subm) => (
                     <div key={subm.id} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-6">
                           <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                               {subm.studentName.charAt(0)}
                             </div>
                             <div>
                               <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{subm.studentName}</h4>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">{subm.studentNim}</p>
                             </div>
                           </div>
                           
                           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Konten Pengumpulan:</p>
                             <LinkifiedText text={subm.content} className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed" />
                             {subm.fileName && (
                               <div className="mt-6 pt-6 border-t border-slate-200 flex items-center gap-3">
                                 <FileText className="w-5 h-5 text-indigo-500" />
                                 <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{subm.fileName}</span>
                               </div>
                             )}
                           </div>
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Dikumpulkan pada: {new Date(subm.submittedAt).toLocaleString('id-ID')}</p>
                        </div>

                        <div className="w-full md:w-80 space-y-6 bg-slate-50/50 p-8 rounded-[40px] border border-slate-100">
                           <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                             <CheckSquare className="w-4 h-4 text-indigo-600" /> Penilaian
                           </h5>
                           
                           {gradingSubmission?.id === subm.id ? (
                             <div className="space-y-4">
                               <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nilai (0-100)</label>
                                 <input 
                                   type="number" 
                                   className="w-full p-4 rounded-2xl bg-white border-2 border-indigo-100 outline-none focus:border-indigo-600 transition-all font-black text-slate-800"
                                   value={gradingSubmission.grade}
                                   onChange={(e) => setGradingSubmission({...gradingSubmission, grade: parseInt(e.target.value) || 0})}
                                 />
                               </div>
                               <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Umpan Balik</label>
                                 <textarea 
                                   className="w-full p-4 rounded-2xl bg-white border-2 border-indigo-100 outline-none focus:border-indigo-600 transition-all font-medium text-slate-800 h-24 resize-none"
                                   value={gradingSubmission.feedback}
                                   onChange={(e) => setGradingSubmission({...gradingSubmission, feedback: e.target.value})}
                                 />
                               </div>
                               <div className="flex gap-2">
                                 <button onClick={() => setGradingSubmission(null)} className="flex-1 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] tracking-widest uppercase">Batal</button>
                                 <button onClick={handleGradeSubmission} disabled={isSaving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-indigo-100">
                                   {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan'}
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <div className="space-y-6">
                               <div className="flex items-center justify-between">
                                 <p className="text-xs font-bold text-slate-500">Skor:</p>
                                 <p className={`text-3xl font-black ${subm.grade !== undefined ? 'text-indigo-600' : 'text-slate-300 italic'}`}>
                                   {subm.grade !== undefined ? subm.grade : 'N/A'}
                                 </p>
                               </div>
                               {subm.feedback && (
                                 <div className="space-y-2">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Umpan Balik:</p>
                                   <div className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                     <LinkifiedText text={subm.feedback} />
                                   </div>
                                 </div>
                               )}
                               <div className="flex flex-col gap-2">
                                 <button 
                                   onClick={() => setGradingSubmission({ id: subm.id, grade: subm.grade || 0, feedback: subm.feedback || "" })}
                                   className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-600 hover:text-white transition-all"
                                 >
                                   {subm.grade !== undefined ? 'Ubah Nilai' : 'Beri Nilai'}
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteSubmission(subm.id)}
                                   className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                 >
                                   <Trash2 className="w-4 h-4" /> Hapus Pengumpulan
                                 </button>
                               </div>
                             </div>
                           )}
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] md:rounded-[60px] max-w-lg w-full p-8 md:p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-white z-10 pb-4">
               <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">TAMBAH MATERI</h3>
               <button onClick={() => setShowMaterialModal(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full cursor-pointer"><X className="w-6 h-6 md:w-8 h-8" /></button>
            </div>
            <div className="space-y-6">
              <input type="text" placeholder="Judul Materi" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-slate-800 shadow-inner" value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} />
              <textarea placeholder="Deskripsi Singkat" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-medium text-slate-800 shadow-inner h-24 resize-none" value={newMaterial.description} onChange={e => setNewMaterial({...newMaterial, description: e.target.value})} />
              
              <div className="flex gap-2">
                {(['TEXT', 'LINK', 'VIDEO', 'PDF'] as const).map(type => (
                  <button key={type} onClick={() => setNewMaterial({...newMaterial, type})} className={`flex-1 py-3 rounded-xl font-black text-[10px] tracking-widest transition-all ${newMaterial.type === type ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{type}</button>
                ))}
              </div>

              {newMaterial.type === 'LINK' || newMaterial.type === 'VIDEO' ? (
                <input type="text" placeholder="URL Materi (Youtube / Drive / Web)" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-mono text-sm text-slate-600 shadow-inner" value={newMaterial.content} onChange={e => setNewMaterial({...newMaterial, content: e.target.value})} />
              ) : newMaterial.type === 'TEXT' ? (
                <textarea placeholder="Isi Materi / Teks" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-medium text-slate-800 shadow-inner h-32 resize-none" value={newMaterial.content} onChange={e => setNewMaterial({...newMaterial, content: e.target.value})} />
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                  <label className="cursor-pointer">
                    <FileUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">Klik untuk upload PDF</p>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {newMaterial.content && <p className="mt-2 text-[10px] font-black text-emerald-600 uppercase">File Terpilih!</p>}
                </div>
              )}

              <button onClick={handleAddMaterial} disabled={isSaving} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[32px] shadow-2xl hover:scale-105 transition-all disabled:opacity-50 text-lg flex items-center justify-center">
                {isSaving ? <Loader2 className="animate-spin" /> : 'SIMPAN MATERI'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Snapshot Preview Modal */}
      {viewingSnapshot && (
        <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-10 max-w-lg w-full text-center shadow-2xl relative">
            <button onClick={() => setViewingSnapshot(null)} className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tighter uppercase">SNAPSHOT PENGERJAAN</h3>
            <div className="aspect-video bg-black rounded-[32px] overflow-hidden border-4 border-slate-50 shadow-inner mb-8 flex items-center justify-center">
               <img src={viewingSnapshot} alt="Student Snapshot" className="max-w-full max-h-full object-contain" />
            </div>
            <button 
              onClick={() => downloadSingleSnapshot(viewingSnapshot!, "SNAPSHOT_GALLERY")}
              className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-sm tracking-widest uppercase transition-all shadow-xl mb-6"
            >
              <Download className="w-5 h-5" /> UNDUH FOTO INI
            </button>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">FOTO DIAMBIL OTOMATIS OLEH SISTEM UNTUK VERIFIKASI IDENTITAS MAHASISWA.</p>
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

export default LecturerDashboard;
