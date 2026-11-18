import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- INSTRUKSI KONEKSI GOOGLE CLOUD (FIREBASE) ---
// 1. Buka https://console.firebase.google.com/
// 2. Buat Project baru.
// 3. Masuk ke menu "Build" -> "Firestore Database" -> "Create Database" -> Pilih "Start in test mode".
// 4. Masuk ke "Project Settings" -> Scroll ke bawah ke "Your apps" -> Klik icon Web (</>).
// 5. Salin nilai config yang muncul dan tempelkan di bawah ini menggantikan teks placeholder.

const firebaseConfig = {
  // GANTI NILAI DI BAWAH INI DENGAN DATA DARI FIREBASE CONSOLE ANDA
  apiKey: "ISI_API_KEY_DARI_FIREBASE",
  authDomain: "project-id.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let db: any = null;

try {
  // Cek apakah user sudah mengganti placeholder
  if (firebaseConfig.apiKey !== "ISI_API_KEY_DARI_FIREBASE") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("✅ Terhubung ke Google Cloud Firestore");
  } else {
    console.warn("⚠️ Konfigurasi Firebase belum diisi. Aplikasi berjalan dalam mode Offline (LocalStorage).");
    console.warn("Silakan edit file 'services/firebase.ts' untuk menghubungkan ke Cloud.");
  }
} catch (error) {
  console.error("❌ Gagal menghubungkan ke Firebase:", error);
}

export { db };