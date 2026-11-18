
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, HelpCircle, BookOpen, UserCheck, 
  GraduationCap, ClipboardList, BarChart3, 
  Settings, LogOut, CheckCircle2, ChevronRight,
  MessageSquare, UserPlus, FileText
} from 'lucide-react';

interface HelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpGuide: React.FC<HelpGuideProps> = ({ isOpen, onClose }) => {
  const guides = [
    {
      title: "Untuk Mahasiswa",
      icon: <GraduationCap className="w-6 h-6 text-blue-600" />,
      steps: [
        {
          title: "Login",
          desc: "Gunakan NIM sebagai username dan password yang diberikan oleh admin.",
          icon: <UserCheck className="w-4 h-4" />
        },
        {
          title: "Ikuti Mata Kuliah",
          desc: "Klik tombol 'Ikuti' pada mata kuliah yang ingin Anda ambil untuk melihat materi dan tugas.",
          icon: <BookOpen className="w-4 h-4" />
        },
        {
          title: "Mengerjakan Ujian",
          desc: "Pilih mata kuliah, lalu klik 'Mulai Ujian'. Pastikan koneksi stabil selama ujian berlangsung.",
          icon: <ClipboardList className="w-4 h-4" />
        },
        {
          title: "Melihat Hasil",
          desc: "Hasil ujian dapat dilihat langsung setelah selesai atau melalui menu 'Statistik'.",
          icon: <BarChart3 className="w-4 h-4" />
        }
      ]
    },
    {
      title: "Untuk Dosen & Admin",
      icon: <Settings className="w-6 h-6 text-indigo-600" />,
      steps: [
        {
          title: "Kelola Mata Kuliah",
          desc: "Admin dapat menambah atau menghapus mata kuliah serta mengunggah materi belajar.",
          icon: <FileText className="w-4 h-4" />
        },
        {
          title: "Bank Soal & AI",
          desc: "Gunakan fitur 'Generate Soal AI' untuk membuat soal secara otomatis dari materi yang diunggah.",
          icon: <MessageSquare className="w-4 h-4" />
        },
        {
          title: "Manajemen Pengguna",
          desc: "Admin dapat menambah user (Mahasiswa/Dosen) dan mengatur kelas masing-masing.",
          icon: <UserPlus className="w-4 h-4" />
        },
        {
          title: "Monitoring Hasil",
          desc: "Pantau integritas ujian dan lihat laporan nilai lengkap di dashboard admin.",
          icon: <CheckCircle2 className="w-4 h-4" />
        }
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[48px] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 md:p-12 pb-0 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Panduan Penggunaan</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[3px]">Bantuan EMYE EDU System</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                {guides.map((section, idx) => (
                  <div key={idx} className="space-y-8">
                    <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                      {section.icon}
                      <h3 className="text-xl font-black text-slate-900">{section.title}</h3>
                    </div>
                    <div className="space-y-6">
                      {section.steps.map((step, sIdx) => (
                        <div key={sIdx} className="group flex gap-5 p-6 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                          <div className="w-12 h-12 shrink-0 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                            {step.icon}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-sm mb-1">{step.title}</h4>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Info */}
              <div className="bg-blue-600 rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl font-black mb-2">Butuh Bantuan Lebih Lanjut?</h3>
                    <p className="text-blue-100 font-medium max-w-md">Jika Anda mengalami kendala teknis, silakan hubungi tim IT atau Admin instansi Anda.</p>
                  </div>
                  <button className="px-10 py-5 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-3">
                    HUBUNGI ADMIN <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 text-center border-t border-slate-100 bg-slate-50/50">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-[4px]">EMYE EDU - Learning Management System v2.0</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HelpGuide;
