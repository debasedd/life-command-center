// Baterai test notifikasi LifeCC — jalankan: node scripts/test-notifications.js
// Menguji: test push, milestone tabungan, peringatan tugas terlambat,
// tugas deadline, rekap harian, pengingat air, pengingat olahraga.
const fs = require("fs");

const BASE = process.env.TEST_BASE || "https://life-command-center-red.vercel.app";
const env = fs.readFileSync(".env", "utf8");
const secret = (env.match(/^CRON_SECRET=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, "") || "";

const j = async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) });
const api = (path, opts) => fetch(BASE + path, opts).then(j);

function iso(d) {
  return d.toISOString();
}

(async () => {
  const out = [];
  const log = (s) => { out.push(s); console.log(s); };

  // 0) kondisi awal
  const me0 = await api("/api/settings");
  log(`settings awal: aiModel=${JSON.stringify(me0.body.settings?.aiModel)}, quiet=${me0.body.settings?.quietStartMinute}-${me0.body.settings?.quietEndMinute}`);
  const prefs0 = (await api("/api/push/prefs")).body.prefs || [];
  log(`prefs awal: ${prefs0.map((p) => `${p.type}:${p.enabled ? "on" : "off"}@${p.minuteOfDay}`).join(", ") || "(kosong)"}`);

  // 1) test push dasar
  const t1 = await api("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  log(`1) test push: HTTP ${t1.status} sent=${t1.body.sent} failed=${t1.body.failed}`);

  // 2) siapkan semua pref aktif, waktu utk tipe terjadwal = sekarang-10menit
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  const nowMin = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  for (const type of Object.keys({ TASK_DEADLINE: 1, WATER_REMINDER: 1, WORKOUT_REMINDER: 1, DAILY_RECAP: 1, WEEKLY_EVAL: 1, MISSED_DEADLINE: 1, MILESTONE: 1 })) {
    const patch = { type, enabled: true };
    if (["WATER_REMINDER", "DAILY_RECAP", "WORKOUT_REMINDER", "MISSED_DEADLINE"].includes(type)) patch.minuteOfDay = Math.max(0, nowMin - 10);
    await api("/api/push/prefs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }
  log("2) semua pref diaktifkan, window waktu digeser ke sekarang-10m");

  // 3) tugas terlambat (deadline kemarin)
  const y = new Date(Date.now() - 26 * 3600 * 1000);
  const t3 = await api("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "[TEST-QA] Tugas telat", priority: "HIGH", deadline: iso(y) }) });
  log(`3) tugas telat dibuat: HTTP ${t3.status} id=${t3.body.task?.id?.slice(0, 8) || t3.body.error}`);

  // 3b) tugas deadline besok (memicu TASK_DEADLINE reminders terjadwal)
  const tom = new Date(Date.now() + 30 * 3600 * 1000);
  const t3b = await api("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "[TEST-QA] Deadline besok", priority: "MEDIUM", deadline: iso(tom) }) });
  log(`3b) tugas besok dibuat: HTTP ${t3b.status} id=${t3b.body.task?.id?.slice(0, 8) || t3b.body.error}`);

  // 4) milestone tabungan: goal baru 100k, setor 30k (25%) lali 30k (60% > 50%)
  const t4 = await api("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "[TEST-QA] Milestone", targetAmount: 100000, icon: "target" }) });
  const goalId = t4.body.goal?.id || t4.body.id;
  log(`4) goal dibuat: HTTP ${t4.status} id=${goalId?.slice(0, 8) || JSON.stringify(t4.body).slice(0, 80)}`);
  if (goalId) {
    await api("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: goalId, action: "deposit", amount: 30000 }) });
    await api("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: goalId, action: "deposit", amount: 60000 }) });
    log("4b) setoran 30k lalu 60k (lewati ambang 25% & 50% & 75%)");
  }

  // 5) tunggu sendAt (now+2s) lalu panggil cron utk dispatch + generate
  await new Promise((r) => setTimeout(r, 3500));
  const t5 = await api(`/api/cron?secret=${encodeURIComponent(secret)}`);
  log(`5) cron: HTTP ${t5.status} dispatched=${t5.body.dispatched} generated=${t5.body.generated}`);
  log(`   detail: ${JSON.stringify(t5.body.detail || t5.body.error || {}).slice(0, 300)}`);

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({ goalId, taskLate: t3.body.task?.id, taskTomorrow: t3b.body.task?.id, sent: t1.body.sent }, null, 1));
})().catch((e) => {
  console.error("TEST ERROR:", e.message);
  process.exit(1);
});
