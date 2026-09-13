# IDEA SPECIFICATION: Personal Life OS (All-in-One PWA)

## 1. Overview & Vision
Sebuah aplikasi web Progressive Web App (PWA) berbasis fullstack yang dirancang khusus untuk berjalan optimal di Safari iPhone (Add to Home Screen). Aplikasi ini berfungsi sebagai "Personal Command Center" harian yang mengintegrasikan akademik, keuangan, investasi, kesehatan fisik, dan asistensi AI pintar.

---

## 2. Core Modules & Feature List

### A. Academic & Productivity (Sekolah & Jadwal)
* **Assignment & Task Tracker:** Pencatatan tugas sekolah lengkap dengan *deadline*, prioritas, dan status penyelesaian.
* **Daily Timetable:** Dashboard jadwal harian (sekolah, les, jam belajar, dan agenda pribadi).
* **Smart Study Reminder:** Pengingat otomatis sebelum deadline tugas berakhir.

### B. Wealth & Financial Management
* **Cash Flow Ledger:** Pencatatan pengeluaran dan pemasukan harian.
* **Smart Savings Goals:** Target tabungan khusus (misal: beli gadget, dana darurat, atau hobi) dengan indikator persentase progres.
* **Portfolio & Asset Growth Projection:** Kalkulasi dan visualisasi proyeksi nilai tabungan/investasi dalam jangka waktu 1–5 tahun ke depan.
* **"What-If" Purchase Simulator:** Simulator keputusan finansial. Pengguna menginput barang yang ingin dibeli, lalu sistem menghitung dampaknya terhadap target tabungan (misal: "Beli barang ini akan menunda target tabunganmu selama 2 minggu").
* **AI Health Check ("Sudah Ideal Belum?"):** Fitur interaktif di mana AI menganalisis sisa uang, riwayat pengeluaran, dan alokasi tabungan untuk memberikan kesimpulan apakah kondisi finansial saat ini sudah ideal atau belum.

### C. Physical Health & Wellness Tracker
* **Workout & Fitness Log:** Pencatatan sesi olahraga harian (jenis latihan, durasi, set/reps, atau jarak lari).
* **Daily Water Intake Tracker:** Pencatatan volume konsumsi air minum harian dengan indikator batas harian (misal: target 2,5 Liter/hari).
* **Sleep & Energy Tracker:** Monitoring jam tidur harian untuk memantau performa fisik dan tingkat fokus belajar.
* **Daily Habit Streaks:** Penghitung *streak* harian untuk konsistensi kebiasaan positif.

### D. iOS Native Integration & System Features
* **Web Push Notifications Native:** Notifikasi push langsung ke Lock Screen dan Notification Center iPhone untuk:
  - Pengingat tugas sekolah mendekati deadline.
  - Pengingat minum air dan jadwal olahraga.
  - Evaluasi keuangan dan pengingat catat pengeluaran di malam hari.
* **Full PWA Support:** Mendukung instalasi *Add to Home Screen*, berjalan tanpa address bar browser, dan terasa seperti aplikasi native iOS.

---

## 3. Core User Flows & Experience

1. **Morning Routine:** User membuka aplikasi dari Home Screen iPhone untuk melihat *digest* harian: tugas yang harus dikumpul hari ini, jadwal sekolah, target minum air, dan jadwal olahraga.
2. **Day-to-day Logging:** User mencatat pengeluaran secara cepat, menambah *water log* setiap kali minum, dan mencatat aktivitas workout.
3. **Evening Review & Financial Simulation:** User memanfaatkan fitur AI untuk mengecek status kesehatan keuangan harian dan mensimulasikan rencana pembelian barang sebelum membelinya.

---

## 4. Hermes Agent Execution Command

> **Instruksi untuk Hermes Agent:**
> "Berdasarkan spesifikasi di atas (`idea.md`), tolong buatkan Product Requirement Document lengkap di `PRD.md`, rancang arsitektur folder, skema database, dan lanjutkan ke pembuatan kode Fullstack PWA Next.js yang siap dideploy ke Vercel."
