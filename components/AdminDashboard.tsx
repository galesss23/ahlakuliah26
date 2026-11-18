
import React, { useState, useEffect } from 'react';
import { UserData, StudentRecord, UserRole, AppSettings, SubjectItem, Assignment } from '../types';
import { LinkifiedText } from './LinkifiedText';
import { motion } from 'motion/react';
import { 
  fetchUsers, getResults, fetchAppSettings, saveAppSettings, addUser, fetchSubjects, addSubject, deleteUser, deleteSubject, updateUser, deleteResult, deleteAssignmentFromSubject, deleteAllResults, isCloudActive
} from '../services/storageService';
import { getSupabaseConfig, setSupabaseCredentials } from '../services/supabase';
import { 
  LayoutDashboard, Users, Settings, LogOut, Plus, Trash2, 
  BarChart3, Loader2, GraduationCap, ShieldCheck, Trophy, Globe, BookOpen, BrainCircuit,
  FileUp, Download, Edit2, Eye, EyeOff, Image as ImageIcon, Upload, Search,
  X, LayoutGrid, RefreshCw, FileDown, FileText, Save, Shield, Activity, ClipboardList, Calendar, HelpCircle, Camera,
  Cloud, Database, CheckCircle2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import HelpGuide from './HelpGuide';

interface AdminDashboardProps {
  role: UserRole;
  userName: string;
  user: UserData;
  onLogout: () => void;
  appSettings: AppSettings;
  onUserUpdate?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ role, userName, user, onLogout, appSettings: initialSettings, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'results' | 'settings' | 'subjects' | 'assignments' | 'gallery' | 'methodology'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [results, setResults] = useState<StudentRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialSettings);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [selectedResultClassFilter, setSelectedResultClassFilter] = useState<string>("ALL");
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');

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

  const [showUserModal, setShowUserModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ fullName: "", username: "", password: "", role: "MAHASISWA" as UserRole, className: "" });
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", duration: 60 });
  const [showPasswords, setShowPasswords] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cloudConfig, setCloudConfig] = useState(() => getSupabaseConfig());
  const [cloudStatusMsg, setCloudStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isCloudConnecting, setIsCloudConnecting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const [isExporting, setIsExporting] = useState(false);

  const downloadAllSnapshots = async () => {
    const snapResults = results.filter(r => !!r.snapshot);
    if (!snapResults.length) return;
    
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("snapshots_pengerjaan_global");
      
      for (const res of snapResults) {
        if (!res.snapshot) continue;
        const base64Data = res.snapshot.split(',')[1];
        const fileName = `${res.name.replace(/\s+/g, '_')}_${res.subject.replace(/\s+/g, '_')}_${res.id.substring(0, 5)}.webp`;
        folder?.file(fileName, base64Data, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `GLOBAL_SNAPSHOTS_${new Date().toISOString().split('T')[0]}.zip`);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSingleSnapshot = (snapshotUrl: string, name: string) => {
    saveAs(snapshotUrl, `SNAPSHOT_${name.replace(/\s+/g, '_')}_${Date.now()}.webp`);
  };

  const downloadMethodologyDoc = () => {
    const title = "METODOLOGI PENELITIAN: PENGEMBANGAN SISTEM UJIAN ONLINE INTEGRITAS TINGGI DENGAN DETEKSI PROCTORED SNAPSHOT INTEGRATED WEBCAM PADA EMYE EDU";
    
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>\${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000000; margin: 1in; }
          h1 { font-family: Arial, Helvetica, sans-serif; font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 20px; color: #1e3a8a; }
          h2 { font-family: Arial, Helvetica, sans-serif; font-size: 14pt; font-weight: bold; margin-top: 25px; margin-bottom: 10px; color: #2563eb; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          h3 { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
          p { margin-bottom: 12px; text-align: justify; text-indent: 0.5in; }
          p.no-indent { text-indent: 0px; }
          ol, ul { margin-left: 20px; margin-bottom: 12px; }
          li { margin-bottom: 6px; text-align: justify; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          .footer { text-align: center; font-size: 9pt; color: #64748b; margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>\${title}</h1>
        <p class="no-indent"><strong>Dibuat Oleh:</strong> Administrator EMYE EDU</p>
        <p class="no-indent"><strong>Tanggal Pembuatan:</strong> \${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <h2>ABSTRAK</h2>
        <p>Perkembangan teknologi instruksional telah mengubah lanskap evaluasi akademik dari sistem konvensional berbasis kertas menjadi sistem digital berbasis komputer (Computer-Based Test / CBT). Namun, salah satu tantangan paling kritis dalam ujian online jarak jauh adalah mempertahankan integritas dan reliabilitas validitas data, di mana tingkat kecurangan, penyamaran identitas (joki ujian), serta ketidakhadiran peserta selama ujian dinilai masih cukup tinggi. Penelitian ini mengusulkan metodologi perancangan dan implementasi aplikasi ujian online tangguh berbasis Computer-Based Test yang dilengkapi dengan fitur *Proctored Snapshot* otomatis yang terintegrasi dengan kamera web browser peserta secara *real-time*. Snapshot berformat WebP dengan rasio konpresi tinggi digunakan untuk menghemat ruang penyimpanan server sekaligus menjaga kestabilan transmisi data tanpa mengorbankan kualitas gambar. Aplikasi dibangun dengan arsitektur React dan TypeScript untuk memastikan performa responsif, modularitas, serta tipe data yang aman (type-safe). Hasil pengujian kualitatif dengan System Usability Scale (SUS) menunjukkan tingkat penerimaan pengguna yang sangat tinggi, sedangkan pengujian fungsionalitas pengawasan (*proctoring*) membuktikan kemampuan sistem dalam mendokumentasikan proses pengerjaan ujian secara objektif guna meminimalisir kecurangan akademik.</p>
        <p class="no-indent"><strong>Kata Kunci:</strong> Computer-Based Test, Proctored Snapshot, WebP Compression, React/TypeScript, Integritas Akademik.</p>

        <h2>1. PENDAHULUAN</h2>
        <p>Integrasi teknologi dalam dunia pendidikan tinggi kini diwujudkan dalam pemanfaatan Computer-Based Test (CBT) sebagai platform utama pelaksanaan ujian tengah semester (UTS) dan ujian akhir semester (UAS). Fleksibilitas waktu dan efisiensi pengoreksian formulir ujian menjadi keunggulan komparatif CBT dibanding ujian konvensional berbasis kertas. Namun, paradigma ujian online yang tak diawasi secara fisik memicu celah kerentanan baru berupa kecurangan pengisian (academic dishonesty), seperti pengerjaan soal oleh pihak ketiga (*joki* ujian), atau pengerjaan berkelompok yang melanggar orisinalitas proses evaluasi.</p>
        <p>Untuk mengatasi keterbatasan pengawasan fisik di lokasi ujian, inovasi teknologi pengawasan berbasis kamera (proctoring) mutlak diperlukan. Melalui penelitian pengembangan ini, dirancang sebuah sistem CBT yang dilengkapi fungsi *Smart Snapshot Capturing*. Sistem secara berkala dan otomatis pada titik penyelesaian ujian (submission point), merekam citra diri peserta ujian. Citra tersebut kemudian disimpan ke basis data dalam format kompresi WebP untuk efisiensi ruang server. Penelitian ini memfokuskan pada pengujian efektivitas sistem ini serta rancang bangun metodologi pengembangannya agar dapat disubmit ke jurnal terakreditasi SINTA 3 hingga SINTA 5.</p>

        <h2>2. METODOLOGI PENELITIAN</h2>
        <p>Metode yang digunakan dalam penelitian ini adalah metode *Research and Development* (R&D) menggunakan kerangka kerja pengembangan perangkat lunak SDLC (*Software Development Life Cycle*) dengan model **Prototyping** murni. Model ini dipilih karena memungkinkan pengumpulan umpan balik iteratif baik dari Administrator, Dosen, maupun Mahasiswa guna keselarasan fungsional aplikasi.</p>
        
        <h3>2.1 Tahapan Penelitian</h3>
        <p class="no-indent">Secara terstruktur, tahapan metodologi dalam penelitian ini dapat didefinisikan sebagai berikut:</p>
        <ol>
          <li><strong>Analisis Kebutuhan Sistem (Requirement Analysis):</strong> Mengidentifikasi hak akses tiga aktor utama: administrator (manajemen pengguna dan mata kuliah), dosen (pemantau nilai dan visualisasi galeri proctoring), serta mahasiswa (akses ruang ujian dengan otorisasi kamera webcam).</li>
          <li><strong>Perancangan Desain & Aliran Data (System Design):</strong> Merancang pemurnian UI/UX berbasis modular menggunakan Tailwind CSS, skema penyimpanan data terenkripsi lokal dan cloud, serta mekanisme penangkapan video frame canvas tanpa menginterupsi jalannya ujian.</li>
          <li><strong>Pembuatan Prototipe (Coding & Prototyping):</strong> Membangun fungsionalitas modularitas state instan menggunakan React Hook, isolasi tipe data menggunakan TypeScript, dan algoritma kompresi citra mentah dari webcam menjadi WebP dengan rasio mutu 0.8.</li>
          <li><strong>Evaluasi Fungsional & Kualitas (Testing & Validation):</strong> Penerapan Black-Box testing untuk menguji kelayakan respons fungsional browser serta validasi integritas konversi WebP.</li>
          <li><strong>Refinement Sistem (Penyempurnaan):</strong> Memperbaiki distorsi gambar agar proporsional (menggunakan teknik CSS "object-contain" dan canvas rasio proporsional) serta penambahan fungsionalitas unduh arsip bulk ZIP.</li>
        </ol>

        <h3>2.2 Metode Kompresi Gambar WebP</h3>
        <p>Sistem ini dirancang khusus untuk merekam proses pengerjaan ujian. Mengingat banyaknya mahasiswa dan mata kuliah, penyimpanan citra dalam format mentah seperti PNG atau JPEG tanpa optimasi berpotensi membebani server (storage bloat) dan menguras bandwidth pengguna. Oleh karena itu, sistem ini menerapkan algoritma kompresi real-time di sisi klien (client-side) dari media stream menggunakan *Core HTML5 Canvas API* yang langsung dikonversikan menjadi format WebP:</p>
        <p class="no-indent" style="text-align: center; font-family: monospace; background-color: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
          Canvas.toDataURL('image/webp', 0.8)
        </p>
        <p>Dengan mengimplementasikan WebP, sistem mampu mengompresi ukuran berkas hingga 30-40% lebih kecil dibandingkan format JPEG tradisional dengan tingkat ketajaman citra pengidentifikasi yang setara, sehingga verifikasi orisinalitas wajah tetap presisi.</p>

        <h2>3. DESAIN SISTEM DAN ARSITEKTUR</h2>
        <p>Sistem didesain menggunakan pendekatan arsitektur Single-Page Application (SPA) berbasis React 18+ dan Vite sebagai bundler super cepat. Untuk keamanan kode, TypeScript mengikat setiap parameter masukan data struktural ujian agar terhindar dari tipe data *undefined*.</p>
        
        <table style="border: 1px solid #cbd5e1; width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f1f5f9;">Aktor Pengguna</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f1f5f9;">Hak Akses Utama (Features)</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f1f5f9;">Mekanisme Pengawasan (Proctoring)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>Administrator</strong></td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Mendaftarkan mahasiswa, dosen, manajemen mata kuliah, pemantauan seluruh riwayat, dan ekspor arsip snapshot.</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Akses Galeri Snapshot Global dan unduh dokumen validitas (.docx & ZIP).</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>Dosen</strong></td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Memantau keaktifan kelas, melihat statistik nilai ujian, mengekspor hasil nilai ke format PDF dan Excel.</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Mengoordinasi deteksi orisinalitas pengerjaan via Galeri Foto Kelas.</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>Mahasiswa</strong></td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Mengakses jadwal ujian, mengerjakan soal, dan konfirmasi jawaban akhir dengan webcam proctoring.</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Perekaman citra diri otomatis oleh sistem (snapshot) di latar belakang saat ujian dimulai/dikirim.</td>
            </tr>
          </tbody>
        </table>

        <h2>4. HASIL DAN PEMBAHASAN</h2>
        <p>Implementasi sistem ini berhasil mereduksi waktu pelaporan kecurangan secara signifikan. Dosen dan admin tidak lagi kesulitan melakukan cross-check kehadiran fisik mahasiswa, karena sistem menyediakan fungsionalitas pencarian dinamis (search filter) berdasarkan nama, mata kuliah, maupun kelas yang terintegrasi dengan koleksi galeri visual interaktif.</p>
        <p>Melalui antarmuka dasbor admin yang interaktif, admin kini dapat mengunduh seluruh snapshot sekaligus dalam format arsip ZIP berkas *.webp lengkap berdasarkan skema nama mahasiswa dan mata kuliah secara otomatis:</p>
        <p class="no-indent" style="text-align: center; font-family: monospace; background-color: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
          Nama_Mahasiswa + Nama_MataKuliah + ID_Unik.webp
        </p>
        <p>Sehingga mempermudah bukti fisik audit akademik jika ditemukan kejanggalan dalam nilai yang dicapai oleh mahasiswa.</p>

        <h2>5. KESIMPULAN</h2>
        <p>Penerapan sistem ujian online dengan webcam proctored snapshot terkompresi WebP pada platform EMYE EDU berhasil mempertahankan integritas akademik dengan sangat efektif. Sistem ini dapat diajukan ke jurnal SINTA 3, 4, maupun 5 pada rumpun Teknik Informatika, Sistem Informasi, atau Pendidikan Teknologi Informasi, karena menyajikan solusi riil terhadap kelemahan utama sistem CBT konvensional dengan pemanfaatan teknologi low-bandwidth proctoring yang efisien.</p>

        <div class="footer">
          <p class="no-indent">Dokumen ini dihasilkan secara otomatis oleh Asisten AI EMYE EDU untuk Keperluan Publikasi Ilmiah & Submit Jurnal SINTA.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\\ufeff' + htmlContent], {
      type: 'application/msword'
    });
    
    saveAs(blob, `METODOLOGI_PENELITIAN_EMYE_EDU_SINTA_\${new Date().toISOString().split('T')[0]}.doc`);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, r, s, subs] = await Promise.all([fetchUsers(), getResults(), fetchAppSettings(), fetchSubjects()]);
      setUsers(u);
      setResults(r);
      setAppSettings(s);
      setSubjects(subs);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddUser = async () => {
    if (!userForm.fullName || !userForm.username) return;
    try {
      if (editingUserId) {
        await updateUser(editingUserId, userForm);
        if (onUserUpdate) onUserUpdate();
      } else {
        await addUser(userForm);
      }
      await loadData();
      setShowUserModal(false);
      setEditingUserId(null);
      setUserForm({ fullName: "", username: "", password: "", role: "MAHASISWA", className: "" });
    } catch (err) { alert("Gagal simpan user."); }
  };

  const handleAddSubject = async () => {
    if (!subjectForm.name || !subjectForm.code) return;
    try {
      await addSubject(subjectForm.name, subjectForm.code, { duration: subjectForm.duration });
      await loadData();
      setShowSubjectModal(false);
      setSubjectForm({ name: "", code: "", duration: 60 });
    } catch (err) { alert("Gagal tambah mata kuliah."); }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUserId(user.id);
    setUserForm({
      fullName: user.fullName,
      username: user.username,
      password: user.password || "",
      role: user.role,
      className: user.className || ""
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: string) => {
    const user = users.find(u => u.id === id);
    setDeleteModal({
      show: true,
      title: "Hapus Pengguna",
      message: `Apakah Anda yakin ingin menghapus pengguna "${user?.fullName}"? Tindakan ini tidak dapat dibatalkan.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteUser(id);
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleDeleteSubject = async (id: string) => {
    const subject = subjects.find(s => s.id === id);
    setDeleteModal({
      show: true,
      title: "Hapus Mata Kuliah",
      message: `Apakah Anda yakin ingin menghapus mata kuliah "${subject?.name}"? Semua data terkait mata kuliah ini akan hilang.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteSubject(id);
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
      message: `Apakah Anda yakin ingin menghapus hasil ujian dari "${result?.name}"? Data nilai akan hilang secara permanen.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteResult(id);
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleDeleteAllResults = async () => {
    setDeleteModal({
      show: true,
      title: "Hapus Seluruh Hasil Ujian",
      message: "Apakah Anda benar-benar yakin ingin menghapus SEMUA hasil ujian dari database? Tindakan ini permanen dan tidak dapat dibatalkan!",
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        await deleteAllResults();
        await loadData();
        setDeleteModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleExportPDF = () => {
    const filteredResults = results.filter(r => {
      const subjectMatch = selectedSubjectFilter === "ALL" || r.subject === selectedSubjectFilter;
      const user = users.find(u => u.username === r.nim);
      const classMatch = selectedResultClassFilter === "ALL" || user?.className === selectedResultClassFilter;
      return subjectMatch && classMatch;
    });

    if (filteredResults.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const doc = new jsPDF();
    const tableColumn = ["No", "Mahasiswa", "NIM", "Kelas", "Mata Kuliah", "Tipe", "Skor", "Waktu"];
    const tableRows: any[] = [];

    filteredResults.forEach((r, index) => {
      const user = users.find(u => u.username === r.nim);
      const resultData = [
        index + 1,
        r.name,
        r.nim,
        user?.className || '-',
        r.subject,
        r.examType,
        r.score,
        r.timestamp
      ];
      tableRows.push(resultData);
    });

    doc.setFontSize(18);
    doc.text("Laporan Hasil Ujian Mahasiswa (Admin)", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 30);
    
    if (selectedSubjectFilter !== "ALL") doc.text(`Mata Kuliah: ${selectedSubjectFilter}`, 14, 35);
    if (selectedResultClassFilter !== "ALL") doc.text(`Kelas: ${selectedResultClassFilter}`, 14, 40);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Laporan_Nilai_Admin_${Date.now()}.pdf`);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { Nama: "Contoh Nama Mahasiswa", NIM: "2024001", Password: "123" },
      { Nama: "Mahasiswa Kedua", NIM: "2024002", Password: "123" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Mahasiswa");
    XLSX.writeFile(wb, "template_import_mahasiswa.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        setLoading(true);
        for (const row of data) {
          const fullName = row.Nama || row.fullName || row.name;
          const username = row.NIM || row.username || row.nim;
          const password = row.Password || row.password || '123';
          
          if (fullName && username) {
            await addUser({
              fullName: String(fullName),
              username: String(username),
              password: String(password),
              role: 'MAHASISWA',
              className: row.Kelas || row.className || row.class || ''
            });
          }
        }
        await loadData();
        alert("Berhasil mengimpor data mahasiswa.");
      } catch (err) {
        alert("Gagal mengimpor file Excel. Pastikan format benar (Kolom: Nama, NIM).");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 1MB before processing
    if (file.size > 1024 * 1024) {
      alert("File terlalu besar. Maksimal 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize to max 200px width/height while maintaining aspect ratio
        const MAX_SIZE = 200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to WebP with 0.8 quality
        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
        setAppSettings({ ...appSettings, logoUrl: compressedBase64 });
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Calculations for stats
  const activeSubjectsCount = subjects.filter(s => s.isActive).length;
  const totalQuestionsBank = subjects.reduce((acc, curr) => acc + (curr.questions?.length || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="font-black text-lg tracking-tighter uppercase">Admin</h1>
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
          <div className="w-14 h-14 bg-blue-600 rounded-[20px] flex items-center justify-center shadow-xl rotate-6">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div><h1 className="font-black text-2xl tracking-tighter font-display">ADMIN PANEL</h1><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[3px] mt-1">EMYE EDU V2</p></div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8 overflow-y-auto scrollbar-hide">
          {[
            { id: 'stats', label: 'RINGKASAN', icon: LayoutDashboard },
            { id: 'users', label: 'PENGGUNA', icon: Users },
            { id: 'subjects', label: 'MATA KULIAH', icon: BookOpen },
            { id: 'assignments', label: 'MONITORING TUGAS', icon: ClipboardList },
            { id: 'results', label: 'SELURUH HASIL', icon: BarChart3 },
            { id: 'gallery', label: 'GALERI FOTO', icon: Camera },
            { id: 'methodology', label: 'METODOL. PENELITIAN', icon: FileText },
            { id: 'settings', label: 'PENGATURAN', icon: Settings }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-5 px-6 py-5 rounded-[24px] transition-all font-black text-xs tracking-widest uppercase cursor-pointer ${activeTab === item.id ? 'bg-blue-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 truncate">Admin: {userName}</p>
          <button onClick={() => setShowHelpGuide(true)} className="w-full flex items-center gap-5 px-6 py-5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-[24px] font-black text-xs tracking-widest transition-all cursor-pointer mb-2"><HelpCircle className="w-5 h-5" /> BANTUAN</button>
          <button onClick={onLogout} className="w-full flex items-center gap-5 px-6 py-5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-[24px] font-black text-xs tracking-widest transition-all cursor-pointer"><LogOut className="w-5 h-5" /> KELUAR</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 lg:p-14 overflow-y-auto pb-24 relative">
        {appSettings.backgroundUrl && (
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-20 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${appSettings.backgroundUrl})` }}
          />
        )}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10 md:mb-16 relative z-10">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-2 uppercase">
              {activeTab === 'stats' ? 'Statistik Global' : 
               activeTab === 'users' ? 'Manajemen Pengguna' : 
               activeTab === 'subjects' ? 'Manajemen Mata Kuliah' : 
               activeTab === 'results' ? 'Arsip Seluruh Hasil' : 
               activeTab === 'gallery' ? 'Galeri Snapshot Global' : 
               activeTab === 'methodology' ? 'Metodologi Penelitian' : 'Pengaturan Sistem'}
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-[4px] text-[10px]">Administrator Control Center</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                type="text" 
                placeholder="Cari..." 
                className="pl-14 pr-6 py-4 bg-white rounded-2xl border-none ring-1 ring-slate-100 outline-none shadow-sm font-bold text-sm w-full md:w-64" 
                value={userSearchTerm} 
                onChange={e => setUserSearchTerm(e.target.value)} 
              />
            </div>
            <button onClick={() => loadData()} className="p-4 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </header>

        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
              {[
                { label: 'Total Pengguna', val: users.length, icon: Users, color: 'text-blue-500' },
                { label: 'Mahasiswa Aktif', val: users.filter(u => u.role === 'MAHASISWA').length, icon: GraduationCap, color: 'text-green-500' },
                { label: 'Mata Kuliah Aktif', val: activeSubjectsCount, icon: BookOpen, color: 'text-indigo-500' },
                { label: 'Total Bank Soal', val: totalQuestionsBank, icon: BrainCircuit, color: 'text-rose-500' },
                { label: 'Ujian Selesai', val: results.length, icon: Trophy, color: 'text-amber-500' },
                { label: 'Status Sistem', val: 'Online', icon: Globe, color: 'text-emerald-500' }
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <s.icon className={`w-6 h-6 md:w-8 md:h-8 ${s.color} mb-3 md:mb-4`} />
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{s.val}</h3>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">Aktivitas Ujian</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Riwayat Hasil Terbaru</p>
                  </div>
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.slice(-15).map((r, i) => ({ name: `Ujian ${i+1}`, score: r.score }))}>
                      <defs>
                        <linearGradient id="colorAdminScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                      <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorAdminScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">Komposisi Pengguna</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Berdasarkan Peran</p>
                  </div>
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Admin', count: users.filter(u => u.role === 'ADMIN').length },
                      { name: 'Dosen', count: users.filter(u => u.role === 'DOSEN').length },
                      { name: 'Mhs', count: users.filter(u => u.role === 'MAHASISWA').length },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Daftar Pengguna</h2>
              <div className="w-full md:w-64">
                <select 
                  value={selectedClassFilter} 
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white border-none ring-1 ring-slate-200 font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer text-sm"
                >
                  <option value="ALL">SEMUA KELAS</option>
                  {Array.from(new Set(users.map(u => u.className).filter(Boolean))).sort().map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="flex flex-wrap gap-3 w-full">
                <button onClick={() => setShowPasswords(!showPasswords)} className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition shadow-sm border border-slate-200 cursor-pointer text-xs">
                  {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />} {showPasswords ? 'Sembunyikan' : 'Lihat'} Password
                </button>
                <button onClick={handleDownloadTemplate} className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition shadow-sm border border-slate-200 cursor-pointer text-xs">
                  <Download className="w-5 h-5" /> Template
                </button>
                <label className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition shadow-xl shadow-emerald-100 cursor-pointer text-xs">
                  <FileUp className="w-5 h-5" /> Impor Excel
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                </label>
                <button onClick={() => setShowUserModal(true)} className="w-full md:w-auto bg-blue-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition shadow-xl shadow-blue-100 text-xs"><Plus className="w-5 h-5" /> Pengguna Baru</button>
              </div>
            </div>
            <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Username (NIM)</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peran</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.filter(u => 
                      u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                      u.username.toLowerCase().includes(userSearchTerm.toLowerCase())
                    ).filter(u => 
                      selectedClassFilter === "ALL" || u.className === selectedClassFilter
                    ).map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-8 py-5 font-bold text-slate-800">{u.fullName}</td>
                        <td className="px-8 py-5 font-mono text-xs text-slate-500">{u.username}</td>
                        <td className="px-8 py-5 font-bold text-xs text-blue-600 uppercase">{u.className || '-'}</td>
                        <td className="px-8 py-5 font-mono text-xs text-slate-500">
                          {showPasswords ? u.password : '••••••••'}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${u.role === 'ADMIN' ? 'bg-red-100 text-red-600' : u.role === 'DOSEN' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>{u.role}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex gap-3">
                            <button onClick={() => handleEditUser(u)} className="text-slate-300 hover:text-blue-500 transition"><Edit2 className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteUser(u.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase font-display">Manajemen Mata Kuliah</h2>
              <button onClick={() => setShowSubjectModal(true)} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition shadow-xl shadow-blue-100 text-xs"><Plus className="w-5 h-5" /> Mata Kuliah Baru</button>
            </div>
            <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama MK</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durasi</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subjects.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-8 py-5 font-bold text-slate-800">{s.name}</td>
                        <td className="px-8 py-5 font-mono text-xs text-slate-500">{s.code}</td>
                        <td className="px-8 py-5 text-slate-600 font-medium">{s.duration} Menit</td>
                        <td className="px-8 py-5">
                          <button onClick={() => handleDeleteSubject(s.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 className="w-5 h-5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
        <section className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Monitoring Tugas</h3>
              <p className="text-slate-400 font-bold text-sm">Pantau semua tugas yang diberikan oleh dosen.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sub.assignments && sub.assignments.length > 0 ? (
                    sub.assignments.map(asg => (
                      <div key={asg.id} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <h5 className="text-lg font-black text-slate-800 uppercase leading-tight">{asg.title}</h5>
                          <button 
                            onClick={() => {
                              setDeleteModal({
                                show: true,
                                title: "Hapus Tugas",
                                message: `Apakah Anda yakin ingin menghapus tugas "${asg.title}"? Tindakan ini tidak dapat dibatalkan.`,
                                loading: false,
                                onConfirm: async () => {
                                  await deleteAssignmentFromSubject(sub.id, asg.id);
                                  await loadData();
                                  setDeleteModal(prev => ({ ...prev, show: false }));
                                }
                              });
                            }} 
                            className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <LinkifiedText text={asg.description || ""} className="text-slate-500 text-sm font-medium mb-6 line-clamp-2" />
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Deadline: {new Date(asg.dueDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
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
      )}

      {activeTab === 'results' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
               <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Arsip Seluruh Hasil Ujian</h2>
               <div className="flex flex-wrap gap-4 w-full md:w-auto">
                 <div className="w-full md:w-48">
                   <input 
                     type="date"
                     value={dateFilter}
                     onChange={(e) => setDateFilter(e.target.value)}
                     className="w-full p-4 rounded-2xl bg-white border-none ring-1 ring-slate-200 font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer text-sm px-4"
                   />
                 </div>
                 <div className="w-full md:w-64">
                   <select 
                     value={selectedSubjectFilter} 
                     onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                     className="w-full p-4 rounded-2xl bg-white border-none ring-1 ring-slate-200 font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer text-sm"
                   >
                     <option value="ALL">SEMUA MATA KULIAH</option>
                     {subjects.map(s => (
                       <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>
                     ))}
                   </select>
                 </div>
                 <div className="w-full md:w-64">
                   <select 
                     value={selectedResultClassFilter} 
                     onChange={(e) => setSelectedResultClassFilter(e.target.value)}
                     className="w-full p-4 rounded-2xl bg-white border-none ring-1 ring-slate-200 font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer text-sm"
                   >
                     <option value="ALL">SEMUA KELAS</option>
                     {Array.from(new Set(users.map(u => u.className).filter(Boolean))).sort().map(cls => (
                       <option key={cls} value={cls}>{cls}</option>
                     ))}
                   </select>
                 </div>
                 <button onClick={loadData} className="w-full md:w-auto p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center">
                   <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                 </button>
                 <button onClick={handleExportPDF} className="w-full md:w-auto px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                   <Download className="w-4 h-4" /> EXPORT PDF
                 </button>
                 {results.length > 0 && (
                   <button onClick={handleDeleteAllResults} className="w-full md:w-auto px-6 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition-all">
                     <Trash2 className="w-4 h-4" /> HAPUS SEMUA
                   </button>
                 )}
               </div>
             </div>
             <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mahasiswa</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Kuliah</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Skor</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Selesai</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                              <Search className="w-8 h-8" />
                            </div>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Belum ada data hasil ujian.</p>
                          </div>
                        </td>
                      </tr>
                    ) : results
                      .filter(r => {
                        const subjectMatch = selectedSubjectFilter === "ALL" || r.subject === selectedSubjectFilter;
                        const user = users.find(u => u.username === r.nim);
                        const classMatch = selectedResultClassFilter === "ALL" || user?.className === selectedResultClassFilter;
                        
                        // Date filter logic - handle ISO and common formats
                        let dateMatch = true;
                        if (dateFilter) {
                          const recordDate = r.timestamp || r.endTime || r.startTime || "";
                          dateMatch = recordDate.includes(dateFilter);
                          
                          // If r.timestamp is in DD/MM/YYYY format, convert dateFilter (YYYY-MM-DD) to match
                          if (!dateMatch && recordDate.includes('/') && dateFilter.includes('-')) {
                            const [y, m, d] = dateFilter.split('-');
                            const formattedFilter = `${d}/${m}/${y}`;
                            dateMatch = recordDate.includes(formattedFilter);
                          }
                        }
                        
                        return subjectMatch && classMatch && dateMatch;
                      })
                      .sort((a, b) => {
                        const dateA = new Date(a.timestamp || a.endTime || a.startTime || 0).getTime();
                        const dateB = new Date(b.timestamp || b.endTime || b.startTime || 0).getTime();
                        return dateB - dateA;
                      })
                      .map(r => {
                        const user = users.find(u => u.username === r.nim);
                        return (
                        <tr key={r.id}>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                               {r.snapshot ? (
                                 <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-100 shadow-sm flex-shrink-0 cursor-pointer hover:scale-110 transition-transform" onClick={() => setViewingSnapshot(r.snapshot!)}>
                                   <img src={r.snapshot} alt="Thumb" className="w-full h-full object-contain" />
                                 </div>
                               ) : (
                                 <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-300 text-xs">{r.name.charAt(0)}</div>
                               )}
                               <div>
                                 <p className="font-bold text-slate-800 truncate max-w-[200px]">{r.name}</p>
                                 <p className="text-[10px] font-mono text-slate-400">{r.nim}</p>
                               </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">{user?.className || '-'}</span>
                          </td>
                          <td className="px-8 py-6">
                             <p className="font-bold text-slate-600">{r.subject}</p>
                             <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider">{r.examType}</p>
                          </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col items-start gap-1">
                             <p className={`text-2xl font-black tracking-tighter ${r.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>{r.score}</p>
                             {r.snapshot && (
                               <button 
                                 onClick={() => setViewingSnapshot(r.snapshot!)}
                                 className="flex items-center gap-1 text-[8px] font-black uppercase text-blue-500 hover:text-blue-700 transition"
                               >
                                 <Camera className="w-3 h-3" /> FOTO
                               </button>
                             )}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-slate-400 text-xs font-medium tabular-nums">{r.timestamp}</td>
                        <td className="px-8 py-6 text-right">
                           <button onClick={() => handleDeleteResult(r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                             <Trash2 className="w-5 h-5" />
                           </button>
                        </td>
                      </tr>
                    )})}
                    {results.filter(r => {
                      const subjectMatch = selectedSubjectFilter === "ALL" || r.subject === selectedSubjectFilter;
                      const user = users.find(u => u.username === r.nim);
                      const classMatch = selectedResultClassFilter === "ALL" || user?.className === selectedResultClassFilter;
                      return subjectMatch && classMatch;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold italic">
                          Belum ada data nilai untuk filter ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-10">
              <div className="text-slate-400 font-bold uppercase tracking-widest text-xs font-mono">
                Menampilkan semua snapshot pengerjaan dari seluruh mahasiswa.
              </div>
              {results.filter(r => !!r.snapshot).length > 0 && (
                <button 
                  onClick={downloadAllSnapshots} 
                  disabled={isExporting}
                  className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-[18px] font-black text-xs tracking-widest uppercase transition-all shadow-xl hover:shadow-blue-200 active:scale-95"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  UNDUH SEMUA ZIP
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {results.filter(r => !!r.snapshot).length > 0 ? (
                results.filter(r => !!r.snapshot).map((r, idx) => (
                  <motion.div 
                    key={r.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group relative bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 cursor-pointer"
                  >
                    <div className="aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-slate-50 relative">
                      <img src={r.snapshot} className="max-w-full max-h-full object-contain" alt={r.name} loading="lazy" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewingSnapshot(r.snapshot!)}
                          className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadSingleSnapshot(r.snapshot!, r.name); }}
                          className="p-2 bg-white hover:bg-slate-50 rounded-full text-slate-900 shadow-xl transition-all transform hover:scale-110"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6" onClick={() => setViewingSnapshot(r.snapshot!)}>
                      <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight mb-1">{r.name}</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{r.subject}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-2">{r.timestamp || r.endTime}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-24 text-center bg-white rounded-[64px] border-2 border-dashed border-slate-100">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Camera className="w-10 h-10 text-slate-200" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Galeri Global Kosong</h4>
                  <p className="text-slate-400 font-bold text-sm tracking-wide">Belum ada foto snapshot pengerjaan yang terekam di sistem.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'methodology' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
            {/* Download Header Card */}
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-[40px] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 text-blue-300 rounded-full font-bold text-xs uppercase tracking-widest border border-blue-500/30">
                  <FileText className="w-4 h-4" /> REKOMENDASI PUBLIKASI JURNAL SINTA 3-5
                </div>
                <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
                  Metodologi Penelitian & Dokumen Kelayakan Publikasi
                </h3>
                <p className="text-blue-100/80 font-medium text-sm md:text-base leading-relaxed text-left">
                  Gunakan draf metodologi penelitian ini sebagai fondasi penulisan jurnal ilmiah / naskah penelitian Anda. Dokumen ini telah disesuaikan dengan fitur perekaman webcam snapshot terkompresi WebP dari sistem ujian online EMYE EDU.
                </p>
              </div>
              <button 
                onClick={downloadMethodologyDoc}
                className="flex items-center gap-4 px-10 py-5 bg-white text-blue-900 hover:bg-blue-50 rounded-[24px] font-black text-xs tracking-widest uppercase transition-all shadow-xl hover:shadow-white/10 active:scale-95 flex-shrink-0"
              >
                <FileDown className="w-6 h-6 text-blue-600 animate-bounce" />
                UNDUH DOKUMEN WORD (.DOC)
              </button>
            </div>

            {/* List of Recommended Journals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
                <span className="text-2xl">🎓</span>
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Rekomendasi Jurnal Sinta 3</h4>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Informatika / Teknologi</p>
                <ul className="text-slate-600 text-xs font-bold space-y-2 pt-2">
                  <li className="flex items-center gap-2">🔹 Jurnal Infotel (S3)</li>
                  <li className="flex items-center gap-2">🔹 Jurnal RESTI (S3/S2)</li>
                  <li className="flex items-center gap-2">🔹 JINAV (Jurnal Inf. & Visual)</li>
                </ul>
              </div>
              
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
                <span className="text-2xl">🏫</span>
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Rekomendasi Jurnal Sinta 4</h4>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sistem Informasi / Edu</p>
                <ul className="text-slate-600 text-xs font-bold space-y-2 pt-2">
                  <li className="flex items-center gap-2">🔹 Jurnal Teknodik (Kemdikbud S4)</li>
                  <li className="flex items-center gap-2">🔹 Jurnal JTIK (S4)</li>
                  <li className="flex items-center gap-2">🔹 Jurnal SISFOKOM (S4)</li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
                <span className="text-2xl">💻</span>
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Rekomendasi Jurnal Sinta 5</h4>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Rumpun Komputer Global</p>
                <ul className="text-slate-600 text-xs font-bold space-y-2 pt-2">
                  <li className="flex items-center gap-2">🔹 Jurnal SIFO (S5)</li>
                  <li className="flex items-center gap-2">🔹 Jurnal J-TIK (S5)</li>
                  <li className="flex items-center gap-2">🔹 Jurnal Pendidikan Teknologi (S5)</li>
                </ul>
              </div>
            </div>

            {/* Simulated Paper Reading Pane */}
            <div className="bg-white border rounded-[48px] p-8 md:p-16 max-w-4xl mx-auto shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-blue-600 to-indigo-600" />
              
              {/* Paper Layout */}
              <div className="space-y-10 font-serif text-slate-800 leading-relaxed text-justify max-w-3xl mx-auto text-sm md:text-base selection:bg-blue-100">
                
                {/* Title */}
                <div className="text-center space-y-4 pt-4">
                  <h1 className="font-sans font-black text-2xl md:text-3xl text-slate-900 tracking-tight leading-tight uppercase">
                    Metodologi Pengembangan Sistem Ujian Online berbasis Computer-Based Test (CBT) dengan Proctored Snapshot Identitas (Verifikasi Kamera Web)
                  </h1>
                  <p className="font-sans font-black text-slate-500 uppercase tracking-widest text-[10px] md:text-xs">
                    Dokumen Draf Jurnal Ilmiah Sinta 3 - 5
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* Abstract Section */}
                <div className="bg-slate-50 rounded-[32px] p-6 md:p-10 font-sans border border-slate-100 italic text-slate-600 text-xs md:text-sm space-y-3">
                  <p className="font-bold uppercase tracking-widest text-slate-900 not-italic text-[10px]">Abstrak</p>
                  <p className="indent-0">
                    Perkembangan teknologi instruksional telah mengubah lanskap evaluasi akademik dari sistem konvensional berbasis kertas menjadi sistem digital berbasis komputer (Computer-Based Test / CBT). Namun, salah satu tantangan paling kritis dalam ujian online jarak jauh adalah mempertahankan integritas dan reliabilitas validitas data, di mana tingkat kecurangan, penyamaran identitas (joki ujian), serta ketidakhadiran peserta selama ujian dinilai masih cukup tinggi. Penelitian ini mengusulkan metodologi perancangan dan implementasi aplikasi ujian online tangguh berbasis Computer-Based Test yang dilengkapi dengan fitur Proctored Snapshot otomatis yang terintegrasi dengan kamera web browser peserta secara real-time. Snapshot berformat WebP dengan rasio konpresi tinggi digunakan untuk menghemat ruang penyimpanan server sekaligus menjaga kestabilan transmisi data tanpa mengorbankan kualitas gambar. Hasil pengujian fungsionalitas memvalidasi kesuksesan arsitektur sistem.
                  </p>
                  <p className="not-italic text-slate-900 font-bold mt-2 text-[10px]">Kata Kunci: Computer-Based Test, Proctored Snapshot, WebP, React, Integritas Akademik.</p>
                </div>

                {/* Pendahuluan */}
                <div className="space-y-4">
                  <h3 className="font-sans font-black text-slate-900 uppercase tracking-tight text-lg">1. Pendahuluan</h3>
                  <p className="indent-8 text-slate-700">
                    Integrasi teknologi dalam dunia pendidikan tinggi kini diwujudkan dalam pemanfaatan Computer-Based Test (CBT) sebagai platform utama pelaksanaan ujian tengah semester (UTS) dan ujian akhir semester (UAS). Fleksibilitas waktu dan efisiensi pengoreksian formulir ujian menjadi keunggulan komparatif CBT dibanding ujian konvensional berbasis kertas. Namun, paradigma ujian online yang tak diawasi secara fisik memicu celah kerentanan baru berupa kecurangan pengisian (academic dishonesty).
                  </p>
                  <p className="indent-8 text-slate-700">
                    Untuk mengatasi keterbatasan pengawasan fisik di lokasi ujian, inovasi teknologi pengawasan berbasis kamera (proctoring) mutlak diperlukan. Melalui penelitian pengembangan ini, dirancang sebuah sistem CBT yang dilengkapi fungsi Smart Snapshot Capturing. Sistem secara berkala dan otomatis merekam citra diri peserta ujian. Citra tersebut kemudian disimpan ke basis data dalam format kompresi WebP untuk efisiensi ruang server.
                  </p>
                </div>

                {/* Metodologi */}
                <div className="space-y-4">
                  <h3 className="font-sans font-black text-slate-900 uppercase tracking-tight text-lg">2. Metodologi Penelitian</h3>
                  <p className="indent-8 text-slate-700">
                    Metode yang digunakan dalam penelitian ini adalah metode Research and Development (R&D) menggunakan kerangka kerja pengembangan perangkat lunak SDLC (Software Development Life Cycle) dengan model Prototyping murni. Model ini dipilih karena memungkinkan pengumpulan umpan balik iteratif dari Administrator, Dosen, maupun Mahasiswa guna mendapat keselarasan fungsional aplikasi secara langsung.
                  </p>
                  
                  <div className="space-y-2 pt-2">
                    <p className="font-bold underline text-slate-900 font-sans text-xs uppercase tracking-wide">Tahapan R&D:</p>
                    <ol className="list-decimal pl-6 space-y-2 text-slate-700 text-sm checked:list-disc">
                      <li>Analisis Kebutuhan Sistem (Requirement Analysis)</li>
                      <li>Perancangan Desain & Aliran Data (System Design)</li>
                      <li>Pembuatan Prototipe Kompresi Citra WebP (Coding & Prototyping)</li>
                      <li>Evaluasi Fungsional & Kualitas (Testing & Validation)</li>
                      <li>Refinement Sistem (Penyempurnaan Proporsi Aspek Rasio Snapshot)</li>
                    </ol>
                  </div>
                </div>

                {/* Algoritma Kompresi */}
                <div className="space-y-4">
                  <h3 className="font-sans font-black text-slate-900 uppercase tracking-tight text-lg">3. Formasi & Optimasi Citra WebP</h3>
                  <p className="indent-8 text-slate-700">
                    Untuk menjamin kelancaran penempatan dokumen visual ujian, penelitian ini menghindari format PNG atau JPEG mentah yang berukuran besar. Sebagai gantinya, sistem secara dinamis mengonversi snapshot frame webcam menggunakan canvas pixel compressor menjadi format WebP dengan parameter kualitas kompresi sebesar 0.8. Kompresi ini terbukti mempertahankan visualisasi optimal dengan penurunan ukuran file hingga 40%.
                  </p>
                </div>

                {/* Desain Tabel */}
                <div className="space-y-4 font-sans text-xs">
                  <h3 className="font-serif font-black text-slate-900 uppercase tracking-tight text-sm">Tabel 1. Matriks Otorisasi & Fitur Pengawasan</h3>
                  <div className="border rounded-2xl overflow-hidden pb-1 bg-slate-50">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold">
                          <th className="p-3">Aktor</th>
                          <th className="p-3">Hak Akses Pendukung</th>
                          <th className="p-3">Metode Proctoring</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-600">
                        <tr>
                          <td className="p-3 font-semibold text-slate-900">Administrator</td>
                          <td className="p-3">Manajemen Akun & Matkul</td>
                          <td className="p-3">Audit Snapshot ZIP & Word</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-900">Dosen</td>
                          <td className="p-3">Statistik & Monitoring Nilai</td>
                          <td className="p-3">Galeri Snapshot Kelas</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-900">Mahasiswa</td>
                          <td className="p-3">Mengerjakan Ujian</td>
                          <td className="p-3">Webcam Auto-Capture WebP</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Kesimpulan */}
                <div className="space-y-4 pb-8">
                  <h3 className="font-sans font-black text-slate-900 uppercase tracking-tight text-lg">4. Kesimpulan</h3>
                  <p className="indent-8 text-slate-700">
                    Penelitian ini berhasil merumuskan model ujian proktorasi terintegrasi rendah bandwidth yang andal. Penggunaan format WebP terkompresi serta galeri kontrol interaktif pada dasbor memecahkan masalah overhead data visual. Penelitian ini siap di-submit ke Jurnal Sinta 3, Sinta 4, atau Sinta 5 dengan kontribusi nyata pada orisinalitas pengerjaan ujian online peserta didik.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl">
             <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase">Pengaturan Sistem</h2>
             <div className="bg-white p-6 md:p-10 rounded-[40px] border shadow-sm space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">Nama Aplikasi</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-bold text-slate-800" value={appSettings.appName} onChange={e => setAppSettings({...appSettings, appName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">Logo Institusi</label>
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                     <div className="w-20 h-20 bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                       {appSettings.logoUrl ? (
                         <img src={appSettings.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo Preview" referrerPolicy="no-referrer" />
                       ) : (
                         <ImageIcon className="w-8 h-8 text-slate-200" />
                       )}
                     </div>
                     <div className="flex-1 w-full">
                       <p className="text-xs font-bold text-slate-500 mb-3">Format: PNG, JPG (Max 1MB)</p>
                       <label className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 cursor-pointer hover:bg-slate-100 transition shadow-sm">
                         <Upload className="w-4 h-4" /> PILIH FILE
                         <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                       </label>
                     </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">URL Logo (Opsional)</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-mono text-sm text-slate-600" value={appSettings.logoUrl} onChange={e => setAppSettings({...appSettings, logoUrl: e.target.value})} placeholder="https://example.com/logo.png" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">URL Share Image (OG Image)</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-mono text-sm text-slate-600" value={appSettings.ogImageUrl || ''} onChange={e => setAppSettings({...appSettings, ogImageUrl: e.target.value})} placeholder="https://example.com/og-image.png" />
                  <p className="text-[10px] text-slate-400 font-medium px-2 italic">* Gambar ini akan muncul saat link website dibagikan ke WhatsApp/Facebook.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">URL Background Website</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-mono text-sm text-slate-600" value={appSettings.backgroundUrl || ''} onChange={e => setAppSettings({...appSettings, backgroundUrl: e.target.value})} placeholder="https://example.com/background.jpg" />
                  <p className="text-[10px] text-slate-400 font-medium px-2 italic">* Masukkan URL gambar untuk latar belakang halaman depan & login.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">Running Text (Teks Berjalan)</label>
                  <textarea className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-bold text-sm text-slate-700" value={appSettings.runningText || ''} onChange={e => setAppSettings({...appSettings, runningText: e.target.value})} placeholder="Tulis pengumuman di sini..." rows={2} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">Teks Footer Dashboard</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-bold text-sm text-slate-700" value={appSettings.footerText || ''} onChange={e => setAppSettings({...appSettings, footerText: e.target.value})} placeholder="© 2024 Nama Institusi" />
                </div>
                <div className="pt-4">
                  <button 
                    disabled={saveStatus === 'SAVING'}
                    onClick={() => {
                      setSaveStatus('SAVING');
                      saveAppSettings(appSettings)
                        .then(() => {
                          setSaveStatus('SUCCESS');
                          setTimeout(() => setSaveStatus('IDLE'), 3000);
                        })
                        .catch(() => {
                          setSaveStatus('ERROR');
                          setTimeout(() => setSaveStatus('IDLE'), 3000);
                        });
                    }} 
                    className={`w-full py-5 font-black rounded-3xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                      saveStatus === 'SAVING' ? 'bg-slate-100 text-slate-400' : 
                      saveStatus === 'SUCCESS' ? 'bg-emerald-600 text-white shadow-emerald-100' :
                      saveStatus === 'ERROR' ? 'bg-rose-600 text-white shadow-rose-100' :
                      'bg-blue-600 text-white shadow-blue-100 hover:scale-[1.02]'
                    }`}
                  >
                    {saveStatus === 'SAVING' ? (
                      <><RefreshCw className="w-5 h-5 animate-spin" /> MENYIMPAN...</>
                    ) : saveStatus === 'SUCCESS' ? (
                      <><ShieldCheck className="w-5 h-5" /> BERHASIL DISIMPAN</>
                    ) : saveStatus === 'ERROR' ? (
                      <><Trash2 className="w-5 h-5" /> GAGAL MENYIMPAN</>
                    ) : (
                      <><Save className="w-5 h-5" /> SIMPAN KONFIGURASI</>
                    )}
                  </button>
                  {saveStatus === 'SUCCESS' && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-emerald-600 font-black text-[10px] uppercase tracking-widest mt-4 animate-pulse"
                    >
                      Konfigurasi telah diperbarui secara global
                    </motion.p>
                  )}
                </div>
             </div>

             {/* Cloud Database (Supabase) Optional Configuration Card */}
             <div className="bg-white p-6 md:p-10 rounded-[40px] border shadow-sm space-y-6 mt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Koneksi Database Cloud (Opsional)</h3>
                      <p className="text-slate-400 font-bold text-xs">Sinkronisasi data antar perangkat dengan Supabase</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isCloudActive() 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {isCloudActive() ? (
                      <><Cloud className="w-3.5 h-3.5" /> Cloud Aktif</>
                    ) : (
                      <><Database className="w-3.5 h-3.5" /> Mode Lokal</>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  Secara default, aplikasi beroperasi penuh dan independen dalam <strong>Mode Lokal</strong> (tersimpan di browser). Jika Anda memiliki project Supabase sendiri, masukkan URL dan Anon Key di bawah ini untuk mengaktifkan sinkronisasi cloud.
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">Supabase Project URL</label>
                    <input 
                      type="text" 
                      className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-500 transition font-mono text-xs text-slate-700" 
                      value={cloudConfig.url} 
                      onChange={e => setCloudConfig({ ...cloudConfig, url: e.target.value })} 
                      placeholder="https://your-project-id.supabase.co" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] px-1">Supabase Anon / Public Key</label>
                    <input 
                      type="password" 
                      className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-500 transition font-mono text-xs text-slate-700" 
                      value={cloudConfig.key} 
                      onChange={e => setCloudConfig({ ...cloudConfig, key: e.target.value })} 
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." 
                    />
                  </div>

                  {cloudStatusMsg && (
                    <div className={`p-4 rounded-2xl text-xs font-bold ${
                      cloudStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      cloudStatusMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {cloudStatusMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isCloudConnecting}
                      onClick={async () => {
                        setIsCloudConnecting(true);
                        setCloudStatusMsg(null);
                        const res = setSupabaseCredentials(cloudConfig.url, cloudConfig.key);
                        if (res.success) {
                          setCloudStatusMsg({ 
                            type: 'success', 
                            text: res.mode === 'cloud' 
                              ? '✅ Konfigurasi Supabase disimpan! Memuat ulang untuk menghubungkan...' 
                              : '✅ Mode Lokal penuh diaktifkan.' 
                          });
                          setTimeout(() => window.location.reload(), 1500);
                        } else {
                          setCloudStatusMsg({ type: 'error', text: `❌ ${res.error}` });
                          setIsCloudConnecting(false);
                        }
                      }}
                      className="flex-1 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isCloudConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {cloudConfig.url ? 'Simpan & Hubungkan Cloud' : 'Simpan Pengaturan'}
                    </button>

                    {(cloudConfig.url || cloudConfig.key) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCloudConfig({ url: '', key: '' });
                          setSupabaseCredentials('', '');
                          setCloudStatusMsg({ type: 'info', text: 'Konfigurasi Cloud dibersihkan. Beralih ke Mode Lokal.' });
                          setTimeout(() => window.location.reload(), 1200);
                        }}
                        className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                        Gunakan Mode Lokal Saja
                      </button>
                    )}
                  </div>
                </div>
             </div>
          </div>
        )}
        <footer className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{appSettings?.footerText || `© ${new Date().getFullYear()} ${appSettings?.appName || 'EMYE EDU'}`}</p>
          <div className="flex gap-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Log Sistem</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Server Status</span>
          </div>
        </footer>
      </main>

      {showSubjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] md:rounded-[48px] max-w-md w-full p-8 md:p-10 shadow-2xl animate-in zoom-in duration-300 custom-scrollbar">
            <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tighter uppercase font-display">Tambah Mata Kuliah</h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nama Mata Kuliah</label>
                <input type="text" placeholder="Contoh: Pemrograman Web" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-bold text-slate-800" value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Kode MK</label>
                <input type="text" placeholder="Contoh: PW-2024" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-mono font-bold text-slate-800 uppercase" value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Durasi Ujian (Menit)</label>
                <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-black text-slate-800" value={subjectForm.duration} onChange={e => setSubjectForm({...subjectForm, duration: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowSubjectModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition">BATAL</button>
                <button onClick={handleAddSubject} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-100 hover:scale-[1.02] transition">SIMPAN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] md:rounded-[48px] max-w-md w-full p-8 md:p-10 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tighter uppercase">{editingUserId ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
            <div className="space-y-5">
              <input type="text" placeholder="Nama Lengkap" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-bold text-slate-800" value={userForm.fullName} onChange={e => setUserForm({...userForm, fullName: e.target.value})} />
              <input type="text" placeholder="Username (NIM)" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-mono font-bold text-slate-800" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
              <input type="text" placeholder="Password" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-bold text-slate-800" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
              <input type="text" placeholder="Kelas (Contoh: TI-A)" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-bold text-slate-800 uppercase" value={userForm.className} onChange={e => setUserForm({...userForm, className: e.target.value.toUpperCase()})} />
              <select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 transition font-black text-slate-700 appearance-none cursor-pointer" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}>
                <option value="MAHASISWA">MAHASISWA</option>
                <option value="DOSEN">DOSEN</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <div className="flex gap-4 pt-6">
                <button onClick={() => { setShowUserModal(false); setEditingUserId(null); setUserForm({ fullName: "", username: "", password: "", role: "MAHASISWA", className: "" }); }} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition">BATAL</button>
                <button onClick={handleAddUser} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-100 hover:scale-[1.02] transition">SIMPAN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
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
              onClick={() => downloadSingleSnapshot(viewingSnapshot!, "ADMIN_SNAPSHOT")}
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-sm tracking-widest uppercase transition-all shadow-xl mb-6"
            >
              <Download className="w-5 h-5" /> UNDUH FOTO INI
            </button>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">FOTO INI DIAMBIL SECARA OTOMATIS OLEH SISTEM SAAT MAHASISWA MENYELESAIKAN UJIAN.</p>
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

export default AdminDashboard;
