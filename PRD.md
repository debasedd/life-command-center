# Product Requirement Document (PRD)
# Personal Life & Fitness Command Center

| | |
|---|---|
| **Nama Produk** | Personal Life & Fitness Command Center |
| **Tipe Aplikasi** | Fullstack PWA (Progressive Web App), Responsive, Mobile-First untuk iPhone Safari |
| **Versi Dokumen** | 1.0 |
| **Tanggal** | 13 September 2026 |
| **Status** | Draft — Ready for Implementation |

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES

### 1.1 Ringkasan Eksekutif

**Personal Life & Fitness Command Center** adalah aplikasi *All-in-One Life OS* berbasis PWA fullstack yang dirancang untuk mengelola seluruh aspek kehidupan personal dalam satu antarmuka terpadu: produktivitas sekolah, keuangan harian, proyeksi investasi, kesehatan harian, dan notifikasi native di iPhone.

Aplikasi dibangun sebagai PWA yang dapat di-*install* ke Home Screen iPhone via Safari, dengan dukungan Service Worker untuk offline mode, Web Push Notification untuk pengingat real-time, dan desain mobile-first yang terasa seperti native app (fullscreen, tanpa browser chrome, safe-area aware).

Integrasi AI menjadi pembeda utama: kategorisasi otomatis transaksi keuangan, simulasi "What-If" pembelian, dan AI Financial Advisor yang mengevaluasi kesehatan keuangan user secara berkala.

### 1.2 Masalah yang Diselesaikan

| # | Pain Point | Solusi di Aplikasi |
|---|---|---|
| 1 | Tugas sekolah tersebar di catatan/ingatan, sering kelewat deadline | Todo list tugas dengan prioritas, deadline, dan push reminder |
| 2 | Jadwal harian (sekolah, les, kegiatan) tidak terlihat utuh | Dashboard jadwal harian terpadu |
| 3 | Pengeluaran/pemasukan tidak tercatat, tidak tahu uang kemana | Ledger harian dengan auto-categorization AI |
| 4 | Tidak ada gambaran progres tabungan & proyeksi masa depan | Savings Goals + proyeksi portofolio jangka panjang |
| 5 | Ragu sebelum beli barang: "apakah ini merusak target saya?" | What-If Purchase Simulator dengan dampak langsung ke goal |
| 6 | Tidak tahu apakah pola keuangan sudah sehat | AI Financial Advisor dengan evaluasi otomatis berkala |
| 7 | Olahraga, minum air, tidur, habit tidak terlacak konsisten | Fitness tracker, water tracker, sleep & habit streaks |
| 8 | Lupa pengingat karena tidak ada notifikasi dari web app | Integrated Web Push Notifications |

### 1.3 Objectives (Tujuan Terukur)

1. **Single Source of Truth** — 100% aktivitas harian user (tugas, uang, kesehatan) terekam di satu aplikasi dalam ≤ 3 tap per entri.
2. **Native Feel di iOS** — Install ke Home Screen, fullscreen standalone, push notification berfungsi, tetap usable saat offline (cache + local queue).
3. **Financial Awareness** — Setiap transaksi terkategori otomatis (AI) dengan akurasi target ≥ 85%; user dapat melihat proyeksi kekayaan hingga 10 tahun ke depan.
4. **Health Consistency** — Streak tracking mendorong kebiasaan: target retensi pencatatan harian ≥ 70% hari dalam sebulan.
5. **Proactive AI** — Aplikasi tidak pasif: AI memberi evaluasi finansial mingguan dan rekomendasi actionable.

### 1.4 Success Metrics (KPI)

| Metrik | Target |
|---|---|
| Waktu buka app → first meaningful action | < 2 detik (cached shell) |
| Akurasi auto-categorization AI | ≥ 85% (dapat dikoreksi manual, koreksi jadi training signal) |
| Push notification delivered (iOS, app terinstall) | ≥ 95% |
| Adopsi fitur harian (≥ 1 entri/hari) | ≥ 70% hari dalam sebulan |
| Lighthouse PWA score | ≥ 90 |

### 1.5 Non-Goals (Di Luar Scope v1)

- ❌ Sinkronisasi dengan bank/e-wallet API (input manual + AI parsing saja).
- ❌ Integrasi Apple Health / HealthKit (tracker mandiri).
- ❌ Multi-user / kolaborasi / sharing sosial — strictly personal, single-user per akun.
- ❌ Eksekusi trading / pembelian investasi riil — hanya proyeksi & simulasi.
- ❌ Desktop-first experience — mobile-first, desktop sekunder (responsive tapi dioptimalkan untuk iPhone).

### 1.6 Target User

- **Primary:** Pelajar/mahasiswa (SMA–kuliah) di Indonesia, usia 15–22, pengguna iPhone, aktif di sekolah + les + kegiatan, punya uang jajan/tabungan pribadi yang ingin dikelola.
- **Context:** Bahasa UI: Indonesia (dapat disiapkan i18n ke Inggris). Zona waktu: Asia/Jakarta (WIB). Mata uang default: IDR.

---

## 2. FEATURE SPECIFICATIONS & USER STORIES

> Legenda prioritas: **P0** = must-have MVP · **P1** = should-have · **P2** = nice-to-have

### 2.A Academic & Productivity Module

#### F-A1. Todo List Tugas Sekolah — **P0**

Manajemen tugas dengan prioritas, deadline, status, dan mata pelajaran.

**Spesifikasi fungsional:**
- Field tugas: `title`, `description` (opsional), `subject` (mapel, dari daftar custom user), `priority` (`LOW` / `MEDIUM` / `HIGH` / `URGENT`), `deadline` (datetime), `status` (`TODO` / `IN_PROGRESS` / `DONE`), `estimated_minutes` (opsional).
- View utama: daftar tugas grup by deadline (Hari Ini / Besok / Minggu Ini / Terlambat / Nanti), sorted by deadline lalu prioritas.
- Interaksi cepat: swipe-to-complete (mobile), checkbox satu tap, edit via bottom sheet.
- Tugas terlambat otomatis ditandai merah + badge counter di dashboard.
- Filter & search: by subject, by priority, by status.
- Recurring tasks (P1): tugas berulang mingguan (PR, jadwal les) yang auto-regenerate setelah selesai.
- Subtasks checklist (P2).

**User Stories:**
- Sebagai pelajar, saya ingin menambahkan tugas baru dengan deadline dan prioritas dalam waktu < 15 detik, agar saya tidak malas mencatat.
- Sebagai pelajar, saya ingin melihat tugas yang paling mendesak hari ini di bagian atas dashboard, agar saya tahu harus mengerjakan apa duluan.
- Sebagai pelajar, saya ingin diberi tahu via push notification sebelum deadline (H-1 dan H-0 pagi), agar tugas tidak pernah kelewat.
- Sebagai pelajar, saya ingin tugas terlambat otomatis ditandai, agar saya segera tahu apa yang perlu diprioritaskan ulang.

#### F-A2. Dashboard Jadwal Harian — **P0**

Timeline aktivitas harian terpadu: sekolah, les, kegiatan ekstrakurikuler, dan block waktu pribadi.

**Spesifikasi fungsional:**
- Model `ScheduleBlock`: `title`, `type` (`SCHOOL` / `LESSON` / `ACTIVITY` / `PERSONAL`), `start_time`, `end_time`, `day_of_week` (untuk jadwal rutin) atau `date` (untuk event sekali), `location` (opsional), `color` (otomatis per type).
- **View "Hari Ini"**: timeline vertikal jam 05:00–23:00, menampilkan blok jadwal rutin (berdasarkan hari) + event spesifik tanggal + tugas ber-deadline hari ini (dari F-A1) dalam satu timeline.
- **View Mingguan** (P1): grid 7 kolom dengan blok jadwal.
- CRUD jadwal rutin via halaman "Jadwal Saya" (template mingguan).
- Overlap detection: peringatan visual jika dua blok bertabrakan.
- "Sekarang" indicator: garis waktu bergerak menandai jam berjalan + highlight blok aktif.
- Integrasi ringan: tugas ber-deadline hari ini muncul sebagai blok saran "waktu kerjakan" di sisa jam kosong (P2).

**User Stories:**
- Sebagai pelajar, saya ingin membuka app dan langsung melihat timeline hari ini (sekolah jam 7, les jam 4, tugas deadline malam ini), agar saya punya peta hari yang utuh.
- Sebagai pelajar, saya ingin mengatur jadwal rutin mingguan sekali, agar tidak perlu input berulang.
- Sebagai pelajar, saya ingin indikator "sekarang" di timeline, agar saya tahu posisi saya dalam hari.
- Sebagai pelajar, saya ingin diperingatkan jika jadwal baru bertabrakan dengan jadwal lama, agar tidak dobel-booked.

---

### 2.B Finance & Investment Module

#### F-B1. Ledger Pengeluaran & Pemasukan Harian — **P0**

Buku kas harian dengan pencatatan cepat dan auto-categorization via AI.

**Spesifikasi fungsional:**
- Field transaksi: `type` (`INCOME` / `EXPENSE`), `amount` (IDR, integer), `category_id`, `note` (opsional), `date` (default hari ini), `source` (`MANUAL` / `AI_PARSED`).
- **Quick Add**: bottom sheet dengan numeric keypad custom, kategori grid ber-ikon, satu tap pilih → simpan. Target: ≤ 3 tap per transaksi.
- **Auto-categorization via AI** (P0):
  - Saat user mengetik note (mis. "beli nasi padang", "uang jajan", "buku matematika"), AI mengusulkan kategori secara real-time/otomatis saat submit.
  - Implementasi: LLM call (chat completion dengan structured output / JSON mode) memetakan note → salah satu kategori user. Fallback deterministik: keyword matching lokal saat offline/limit.
  - Confidence rendah → kategori disorot "AI suggestion, tap untuk ubah".
  - **Learning loop**: setiap koreksi manual user disimpan sebagai contoh few-shot untuk request berikutnya (simpan mapping note→kategori di DB, kirim sebagai konteks).
- Kategori default seed (bisa ditambah/hapus user): Makanan & Minuman, Transportasi, Uang Jajan/Masuk, Sekolah & Alat Tulis, Hiburan, Tabungan, Lain-lain.
- Ringkasan: total pemasukan/pengeluaran hari ini, minggu ini, bulan ini; breakdown per kategori (bar/donut chart).
- Edit & hapus transaksi; histori dengan filter tanggal/kategori; pencarian.
- **Parsing struktural** (P2): input natural "habis 25rb buat gojek" → AI ekstrak amount + kategori + note.

**User Stories:**
- Sebagai user, saya ingin mencatat pengeluaran dalam ≤ 3 tap, agar pencatatan jadi kebiasaan, bukan beban.
- Sebagai user, saya ingin AI otomatis menebak kategori dari catatan saya, agar saya tidak perlu memilih kategori setiap kali.
- Sebagai user, saya ingin melihat ke mana uang saya habis bulan ini per kategori, agar saya bisa memotong pemborosan.
- Sebagai user, saya bisa mengoreksi kategori salah, dan aplikasi belajar dari koreksi saya, agar akurasi makin tinggi seiring waktu.

#### F-B2. Target Tabungan (Savings Goals) — **P0**

**Spesifikasi fungsional:**
- Model `SavingsGoal`: `name`, `target_amount` (IDR), `current_amount`, `deadline` (opsional), `monthly_commitment` (opsional), `status` (`ACTIVE` / `ACHIEVED` / `ARCHIVED`), `icon`/`color`.
- Setor dana ke goal: alokasikan dari "uang tersedia" (pemasukan − pengeluaran − alokasi lain), atau langsung input nominal setoran.
- Progress bar visual + tanggal perkiraan tercapai (forecast: `sisa target / rata-rata setoran bulanan`, berdasarkan histori nyata user).
- Milestone notification: 25% / 50% / 75% / 100% → push notification perayaan.
- Multiple goals aktif bersamaan; alokasi dapat dibagi (P1: "distribute" slider membagi jumlah uang masuk ke beberapa goal dengan proporsi).

**User Stories:**
- Sebagai user, saya ingin membuat target tabungan (misal "Beli Sepeda — Rp2.500.000 — target 6 bulan"), agar saya punya tujuan yang konkret.
- Sebagai user, saya ingin melihat progress bar dan estimasi kapan target tercapai berdasarkan kebiasaan nabung saya yang nyata, agar motivasi saya realistis.
- Sebagai user, saya ingin di-rayakan lewat notifikasi saat mencapai milestone, agar saya tetap termotivasi.

#### F-B3. Proyeksi Portofolio Jangka Panjang — **P1**

**Spesifikasi fungsional:**
- Konfigurasi profil investasi: `monthly_investment` (nominal), `assets` (alokasi % per instrumen: Deposito ~4%, Obligasi/Reksadana Pendapatan Tetap ~6%, Reksadana Saham/S&P500 ~10%, Emas ~5%, Saham individual — return asumsi dapat diedit user, prefilled dengan rata-rata historis sebagai default).
- **Compound growth projection**: simulasi bulanan hingga N tahun (default 5/10/20 tahun) dengan compound monthly. Formula: `FV = P × [((1+i)^n − 1) / i] + PV×(1+i)^n` dihitung per aset lalu diagregasi.
- Grafik area/line: total portofolio per tahun, breakdown per aset (stacked), garis total kontribusi (principal) vs hasil investasi (gain) — highlight "uang kerja".
- Skenario konservatif/moderat/agresif (toggle preset asumsi return).
- Inflation toggle (P2): tampilkan nilai riil (dicolok inflasi asumsi ~3.5%).
- Tabel per-tahun di bawah grafik untuk angka eksak.
- Disclaimer visible: "Simulasi edukasi, bukan saran investasi; return tidak dijamin."

**User Stories:**
- Sebagai user, saya ingin mensimulasikan "kalau saya investasikan Rp500.000/bulan selama 10 tahun dengan return 8%, jadi berapa?", agar saya melihat kekuatan compound interest.
- Sebagai user, saya ingin melihat porsi gain vs modal saya di grafik, agar termotivasi menginvestasikan lebih awal.
- Sebagai user, saya ingin mengubah asumsi return dan nominal, agar simulasi sesuai kondisi saya.

#### F-B4. "What-If" Purchase Simulator — **P1** (P0 dari sisi UX impact)

Simulasi dampak sebuah pembelian terhadap target finansial — fitur "pembeda" aplikasi.

**Spesifikasi fungsional:**
- Entry point: tombol "Simulasi Pembelian" di halaman keuangan + shortcut di quick-add (saat user ragu sebelum mencatat pembelian besar).
- Flow: user input barang (`nama barang`, `harga`, opsional `metode`: cash / cicilan n bulan).
- Mesin simulasi menghitung dan menampilkan, dalam satu layar hasil:
  1. **Dampak ke Savings Goals**: berapa %/Rp dari tiap goal aktif yang tertunda; estimasi keterlambatan tanggal tercapai (in hari/minggu/bulan) berdasarkan rata-rata setoran user.
  2. **Dampak ke budget bulan ini**: sisa budget setelah pembelian, apakah defisit.
  3. **Dampak ke proyeksi portofolio** (jika F-B3 aktif): opportunity cost — "kalau uang ini diinvestasikan 10 tahun → Rp X".
  4. **Verdict AI**: skor kesehatan keputusan (mis. "AMAN", "HATI-HATI", "BERISIKO") + satu kalimat penjelasan + alternatif ("menabung 3 bulan lagi membuat pembelian ini bebas dampak").
- Cicilan: breakdown dampak bulanan berulang terhadap sisa uang bulanan.
- Simpan riwayat simulasi (P2) — "Barang yang hampir kamu beli" untuk refleksi.

**User Stories:**
- Sebagai user, sebelum membeli sepatu Rp1.500.000, saya ingin tahu "tabungan sepeda saya mundur berapa bulan?", agar keputusan saya terinformasi.
- Sebagai user, saya ingin AI memberi verdict jujur (aman/tidak) + alternatif, agar saya dibantu berpikir, bukan hanya diberi angka.
- Sebagai user, saya ingin melihat opportunity cost investasi dari pembelian, agar saya memahami biaya kesempatan.

#### F-B5. AI Financial Advisor — **P1**

Evaluasi otomatis kesehatan alokasi keuangan & tabungan user.

**Spesifikasi fungsional:**
- **Evaluasi otomatis mingguan** (setiap Minggu malam / Senin pagi, via scheduled job): agregasi data 30 hari terakhir → dikirim ke LLM dengan prompt terstruktur → hasil disimpan dan ditampilkan di halaman "Advisor".
- Input evaluasi ke LLM (agregat, tanpa data mentah berlebih): total pemasukan/pengeluaran 30 hari, breakdown per kategori + %, rasio tabungan (savings rate), progres goals vs commitment, jumlah goal aktif, kebiasaan spending (kategori tumbuh/menurun vs bulan lalu).
- **Kerangka evaluasi** (dipandu system prompt, output JSON terstruktur):
  - `health_score` (0–100) dengan komponen: savings rate (bobot 40%), konsistensi pencatatan (20%), rasio kebutuhan-vs-wants (20%), progres goals (20%).
  - `diagnosis`: 2–4 temuan utama (mis. "Savings rate kamu 5% — idealnya ≥ 20% untuk pelajar", "Pengeluaran jajan naik 40% vs bulan lalu").
  - `recommendations`: 3–5 aksi konkret & spesifik (bukan generik), masing-masing dengan dampak estimasi (mis. "Kurangi kategori Hiburan Rp150rb/bln → savings rate naik ke 18%").
  - `allocation_verdict`: apakah alokasi uang sudah ideal ("SUDAH IDEAL" / "PERLU PERBAIKAN" / "BERISIKO") + rationale.
- Evaluasi on-demand: tombol "Evaluasi Sekarang" kapan pun.
- Riwayat evaluasi disimpan → grafik health_score per minggu (trend).
- Push notification ringkasan tiap evaluasi mingguan selesai ("Evaluasi keuangan mingguanmu siap: skor 62, 3 rekomendasi baru").
- Guardrails: LLM hanya menerima agregat anonim; output divalidasi (JSON schema) sebelum disimpan; fallback ke rules-based advisor sederhana saat AI unavailable.

**User Stories:**
- Sebagai user, saya ingin mendapat evaluasi otomatis tiap minggu apakah alokasi uang saya sudah ideal, agar saya dikoreksi sebelum kebiasaan buruk menahun.
- Sebagai user, saya ingin health score keuangan yang bisa saya pantau trennya, agar perbaikan saya terukur.
- Sebagai user, saya ingin rekomendasi yang spesifik dengan angka dampaknya, bukan nasihat generik ("hematlah uangmu").
- Sebagai user, saya bisa minta evaluasi kapan pun, agar saya dapat cek kesehatan sebelum keputusan besar.

---

### 2.C Health, Fitness & Habit Module

#### F-C1. Workout & Fitness Tracker — **P0**

**Spesifikasi fungsional:**
- Model `Workout`: `type` (dari katalog: Lari, Jogging, Push-up, Sit-up, Gym/Angkat beban, Sepeda, Futsal, Basket, Renang, Yoga, Custom — user dapat menambah type), `duration_minutes`, `intensity` (`RINGAN` / `SEDANG` / `BERAT`), `date`, `notes` (opsional), `calories_estimate` (auto dari type×durasi×intensity, tabel MET sederhana; P2).
- Log cepat: pilih type → durasi (stepper/preset chip 15/30/45/60 mnt) → intensitas → simpan. ≤ 4 tap.
- Riwayat: list per hari, kalender heatmap bulanan (hari dengan workout = hijau, intensitas = gradasi).
- Statistik: total sesi & menit minggu ini vs minggu lalu, streak workout, distribusi per type, chart tren mingguan.
- Target mingguan (P1): "3× olahraga/minggu" dengan progress ring; reminder hari yang belum tercapai.

**User Stories:**
- Sebagai user, saya ingin mencatat olahraga dalam < 10 detik setelah selesai, agar tracking tidak jadi penghalang.
- Sebagai user, saya ingin melihat kalender heatmap konsistensi olahraga saya, agar terlihat seberapa rajin saya bulan ini.
- Sebagai user, saya ingin diberi tahu jika belum olahraga sesuai target mingguan, agar target saya terjaga.

#### F-C2. Daily Water Intake Tracker — **P0**

**Spesifikasi fungsional:**
- Target harian default 8 gelas (2000 ml), dapat diubah user (ml per gelas custom).
- **Quick log**: tombol besar satu-tap "+1 gelas" di dashboard; chip preset (+250 ml / +500 ml / custom); undo untuk salah tap.
- Visual: progress ring / baris ikon gelas yang terisi; warna berubah saat target tercapai.
- Histori harian + chart 7 hari terakhir; rata-rata harian mingguan.
- Smart reminder: push notification berkala pada jam aktif (default 10:00, 13:00, 16:00, jam konfigurable) **hanya jika** target hari itu belum tercapai; auto-berhenti setelah target tercapai.
- Reset otomatis tiap tengah malam WIB.

**User Stories:**
- Sebagai user, saya ingin mencatat minum air dengan satu tap, agar tracking tidak mengganggu.
- Sebagai user, saya ingin diingatkan minum hanya jika saya belum capai target, agar notifikasi tidak jadi spam.
- Sebagai user, saya ingin melihat tren konsumsi air 7 hari, agar tahu apakah cukup hidrasi.

#### F-C3. Sleep & Habit Streak Tracker — **P1**

**Spesifikasi fungsional:**
- **Sleep log**: `bed_time`, `wake_time`, `date`; durasi dihitung otomatis; target durasi default 7–9 jam dengan indikator (kurang/cukup/berlebih); input cepat via preset waktu atau time picker; kualitas tidur optional (1–5).
- **Habit tracker**: user membuat habit custom (mis. "Baca 15 menit", "Stretching", "Tidak begadang"); check-in harian satu tap; frekuensi target per minggu (mis. 5/7).
- **Streak engine**: hitung streak berjalan & streak terbaik per habit, per workout type, dan water-goal tercapai; tampilkan di dashboard sebagai 🔥 counter; freeze/lupa satu hari (streak repair, P2 — konsumsi "streak freeze" terbatas).
- **Habit dashboard**: grid habit hari ini dengan checkbox besar; kalender konsistensi per habit.
- Statistik tidur: rata-rata durasi mingguan, chart bedtime/wake consistency, tren kualitas.

**User Stories:**
- Sebagai user, saya ingin mencatat jam tidur & bangun, agar saya tahu apakah tidur saya cukup.
- Sebagai user, saya ingin membuat habit sendiri dan check-in harian satu tap, agar kebiasaan baik saya terlacak.
- Sebagai user, saya ingin melihat streak 🔥 yang tumbuh, agar termotivasi tidak putus rantai.
- Sebagai user, saya ingin statistik tidur mingguan, agar bisa memperbaiki jam tidur saya.

---

### 2.D Notification System & Mobile Experience

#### F-D1. Integrated Web Push Notifications — **P0**

**Spesifikasi fungsional:**
- **Teknologi**: Web Push Protocol (VAPID), service worker `push` + `notificationclick` handlers. Di iOS ≥ 16.4, push bekerja untuk PWA yang ditambahkan ke Home Screen (`display: standalone`) — permission diminta dari user gesture di dalam installed app.
- **Permission flow**: banner in-app "Aktifkan pengingat" → tap → `Notification.requestPermission()` → simpan subscription endpoint ke server. Soft-ask sebelum native prompt (explain value dulu). Status permission tampil di Settings; handle `denied` dengan instruksi buka Settings iOS.
- **Jenis notifikasi (scheduled + trigger-based):**

| Trigger | Jadwal/Kondisi | Contoh copy |
|---|---|---|
| Reminder tugas | H-1 deadline (19:00) & hari-H (07:00) | "⏰ Tugas 'Laporan Fisika' dikumpulkan beserta besok!" |
| Reminder olahraga | Jika target mingguan belum tercapai, sore hari ( configurable, default 16:30) | "💪 Belum olahraga hari ini. 30 menit joging, yuk?" |
| Reminder minum air | Jam terjadwal, hanya jika target belum tercapai | "💧 Sudah 4/8 gelas hari ini." |
| Evaluasi harian malam | Default 21:30, configurable | "🌙 Rekap hari ini: 2 tugas selesai, 6/8 gelas, 0 transaksi dicatat. Isi yang kosong?" |
| Evaluasi keuangan mingguan | Saat job AI Advisor selesai | "📊 Evaluasi keuanganmu siap: skor 68 (+5 dari minggu lalu)" |
| Deadline terlewat | Realtime saat terdeteksi | "⚠️ 'Laporan Fisika' sudah lewat deadline." |
| Milestone savings | 25/50/75/100% | "🎉 Tabungan Sepeda 50%!" |

- **Infrastruktur**: scheduler server-side (cron per menit mengecek due reminders dari tabel `scheduled_notifications`, atau lib seperti node-cron/BullMQ) → kirim via Web Push (lib `web-push`) → simpan delivery log → retry on 4xx/5xx sementara, hapus subscription saat 410 Gone.
- **Preferensi**: Settings → per-jenis notifikasi on/off, jam custom, quiet hours (mis. 22:00–06:00 tidak ada notifikasi non-kritis).
- **In-app notification center** (P1): feed notifikasi dalam app untuk yang terlewat saat offline.

**User Stories:**
- Sebagai user, saya ingin menerima push notification untuk tugas mendekati deadline, agar tidak pernah kelewat pengumpulan.
- Sebagai user, saya ingin reminder minum air dan olahraga yang cerdas (tidak dikirim kalau sudah tercapai), agar notifikasi terasa membantu bukan mengganggu.
- Sebagai user, saya ingin rekap harian malam hari, agar saya bisa menutup hari dengan rapi.
- Sebagai user, saya bisa mengatur jam quiet hours, agar tidak dibangunkan notifikasi.

#### F-D2. PWA Manifest & Service Worker (iOS Native Experience) — **P0**

**Spesifikasi fungsional:**
- **Manifest**: `name`, `short_name`, `start_url` (`/`), `display: "standalone"`, `orientation: portrait`, `theme_color`, `background_color`, ikon lengkap (192/512 + maskable + apple-touch-icon 180×180), `id` & `scope` benar.
- **iOS meta tags**: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-touch-icon`, safe-area handling (`env(safe-area-inset-*)`) untuk notch/Dynamic Island & home indicator.
- **Service Worker strategy**:
  - App shell (HTML skeleton, CSS, JS bundle): cache-first, precache saat install → instant load & offline open.
  - Data API: network-first dengan fallback ke cache + queue mutasi offline (Background Sync di mana didukung; di iOS, flush queue saat app dibuka lagi — optimistic UI + indikator "tersimpan saat online").
  - Stale asset (font, ikon): stale-while-revalidate.
  - Versioning & cleanup cache lama saat SW update; skipWaiting + prompt "Update tersedia".
- **Offline UX**: halaman tetap terbuka penuh; input yang membutuhkan server (AI categorize) fallback lokal (keyword matching); badge "Offline" kecil; data tersinkron otomatis saat online.
- **Install guidance**: halaman/banner onboarding berisi langkah Share → Add to Home Screen khusus Safari (karena iOS tidak punya auto-install prompt), muncul saat pertama kali & dari Settings.
- **Performa**: cold start dari home screen < 2s (cached shell), transisi halaman client-side (App Router prefetch), animasi 60fps, tap target ≥ 44px, no layout shift.

**User Stories:**
- Sebagai user, saya ingin meng-install app ke Home Screen dan membukanya fullscreen seperti app native, agar terasa profesional dan cepat diakses.
- Sebagai user, saya ingin app tetap bisa dibuka dan dicatat saat tidak ada internet, agar pencatatan tidak terputus.
- Sebagai user, saya ingin dibimbing cara install di Safari, karena prosesnya tidak otomatis di iPhone.

---

## 3. STEP-BY-STEP IMPLEMENTATION ROADMAP

> Urutan pengerjaan bertahap, tiap fase menghasilkan sesuatu yang bisa dijalankan & dites. Estimasi adalah effort relatif (S = kecil, M = sedang, L = besar).

### Fase 0 — Fondasi Proyek & Infrastruktur (S–M)

1. **Inisialisasi proyek fullstack**
   - Next.js 15 (App Router) + TypeScript + Tailwind CSS.
   - PostgreSQL via Prisma ORM; skema awal: User, Task, ScheduleBlock, Transaction, Category, SavingsGoal, InvestmentProfile, Workout, WaterLog, SleepLog, Habit, HabitCheckin, PushSubscription, ScheduledNotification, Evaluation, StreakState.
   - Auth: NextAuth (email/password; simple, single-device friendly).
   - Deployment target + env vars (DATABASE_URL, VAPID keys, LLM API key).
2. **Design system dasar**
   - Token: warna (light/dark), tipografi, spacing; komponen primitif: Button, Card, BottomSheet, Input, Chip, ProgressRing, Toast.
   - Layout mobile-first dengan safe-area inset; bottom navigation (Beranda, Akademik, Keuangan, Kesehatan, Profil).
3. **Verifikasi PWA skeleton sejak awal**
   - Manifest + Service Worker basic (precache shell) + apple meta tags — dipasang sejak fase 0 agar tidak jadi afterthought.
   - **Checkpoint:** app terinstall di Home Screen iPhone, buka fullscreen, offline shell load.

### Fase 1 — Academic & Productivity Module (M)

4. CRUD Task + prioritas/deadline/status; list view grup by deadline; swipe actions.
5. CRUD ScheduleBlock (template mingguan) + Timeline "Hari Ini" dengan current-time indicator + merge tugas ber-deadline hari ini.
6. Dashboard akademik: counter tugas terlambat, "tugas berikutnya", blok jadwal aktif.
   - **Checkpoint:** user bisa mencatat tugas & jadwal dan melihat timeline hari ini utuh.

### Fase 2 — Finance Core (M–L)

7. Kategori (seed + CRUD) + Quick Add sheet transaksi (keypad, kategori grid).
8. Ledger: list histori, filter, edit/hapus, summary harian/mingguan/bulanan.
9. Chart breakdown kategori (donut/bar) + tren bulanan.
10. **Savings Goals**: CRUD, setoran, progress bar, forecast tanggal tercapai.
    - **Checkpoint:** pencatatan keuangan harian berfungsi end-to-end, goals terlihat progresnya.

### Fase 3 — Investment Projection & What-If Simulator (M)

11. InvestmentProfile + proyeksi compound growth (fungsi murni, unit-tested) + grafik area/stacked per tahun + tabel.
12. Preset skenario konservatif/moderat/agresif; editor asumsi return.
13. **What-If Purchase Simulator**: mesin perhitungan dampak (goals delay, budget, opportunity cost) + layar hasil + verdict skor (rules-based dulu).
    - **Checkpoint:** simulasi "beli barang → target mundur X bulan" akurat terhadap data nyata user.

### Fase 4 — Health, Fitness & Habit (M)

14. Workout tracker: log cepat, riwayat, kalender heatmap, statistik.
15. Water tracker: quick log +1 gelas, progress, histori, reset harian WIB.
16. Sleep log + habit custom + check-in + **streak engine** (unit-tested: perhitungan streak, best streak, reset).
17. Dashboard kesehatan: ring gabungan hari ini (air, workout, habit, tidur).
    - **Checkpoint:** semua tracker harian dapat dicatat cepat dan terlihat di satu dashboard.

### Fase 5 — Integrasi AI (L)

18. **Auto-categorization**: service LLM (structured output) + fallback keyword; kirim few-shot dari koreksi user; UI suggestion + koreksi; metrics akurasi.
19. **AI Financial Advisor**: job mingguan terjadwal agregasi 30 hari → prompt evaluasi → validasi JSON → simpan; halaman Advisor (score, diagnosis, rekomendasi, trend chart); tombol evaluasi on-demand.
20. Upgrade verdict What-If Simulator dengan penjelasan AI.
    - **Checkpoint:** transaksi terkategorikan otomatis ≥ 85% pada data uji; advisor menghasilkan evaluasi valid mingguan.

### Fase 6 — Notification System & PWA Polish (M–L)

21. Web Push infra: VAPID keys, endpoint subscription, `web-push` sender, SW push/click handlers, permission soft-ask flow.
22. Scheduler + tabel scheduled_notifications + job generator (tugas H-1/H-0, air, olahraga, rekap harian 21:30, advisor mingguan); kondisi bersyarat (skip jika target tercapai); quiet hours; preferensi per-jenis.
23. Delivery log, retry, cleanup subscription 410.
24. PWA hardening: offline queue mutasi, SW versioning/update prompt, install guidance Safari, Lighthouse audit ≥ 90.
    - **Checkpoint:** semua jenis notifikasi terkirim di iPhone (PWA installed), aplikasi usable offline.

### Fase 7 — Stabilisasi & Launch (S–M)

25. End-to-end QA di iPhone Safari riil (instal, notifikasi, offline, performa); perbaikan bug.
26. Seed data demo/onboarding tour first-run.
27. Optimasi akhir: cold start, bundle size, aksesibilitas, dark mode penuh.
28. **Launch v1.0.** Backlog v1.1: recurring tasks, parsing struktural transaksi natural, streak freeze, in-app notification center, i18n EN.

### Ketergantungan Utama (Critical Path)

```
Fase 0 → Fase 1 ─┐
        Fase 2 ──┼→ Fase 5 (AI butuh data transaksi & goals) → Fase 6 (notifikasi butuh semua modul) → Fase 7
        Fase 3 ──┤
        Fase 4 ──┘
```

Catatan: Fase 1–4 dapat dikerjakan paralel setelah Fase 0; Fase 5 bergantung pada Fase 2 (data finansial); Fase 6 bergantung pada semua modul (reminder lintas modul). PWA skeleton ditarik ke Fase 0 agar setiap fase langsung tertes di iPhone sejak dini.
