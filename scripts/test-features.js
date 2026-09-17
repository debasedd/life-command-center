/* Feature test suite — hits every API, verifies contract, cleans up. */
const BASE = process.env.BASE || "https://life-command-center-red.vercel.app";
const TAG = "TEST-" + Math.random().toString(36).slice(2, 7);
let pass = 0, fail = 0;
const failures = [];

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; failures.push(name + (detail ? " :: " + detail : "")); console.log("FAIL " + name + (detail ? " :: " + detail : "")); }
}

(async () => {
  // 1. ME
  let r = await call("GET", "/api/me");
  check("me GET", r.status === 200 && r.json?.id, JSON.stringify(r.json).slice(0, 80));
  const USER = r.json?.id;

  // 2. TASKS CRUD
  r = await call("POST", "/api/tasks", { title: TAG + " tugas uji", subject: "Fisika", priority: "HIGH", deadline: new Date(Date.now() + 86400000).toISOString(), recurring: false });
  check("tasks POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 120));
  const taskId = r.json?.task?.id || r.json?.id;
  r = await call("GET", "/api/tasks");
  check("tasks GET list", r.status === 200 && Array.isArray(r.json?.tasks));
  const task = r.json?.tasks?.find((t) => t.title === TAG + " tugas uji");
  check("tasks created visible", !!task, "not in list");
  r = await call("PATCH", "/api/tasks", { id: task?.id, status: "DONE" });
  check("tasks PATCH status", r.status === 200, JSON.stringify(r.json).slice(0, 100));
  r = await call("DELETE", "/api/tasks?id=" + task?.id);
  check("tasks DELETE", r.status === 200, String(r.status));

  // 3. SCHEDULE
  r = await call("POST", "/api/schedule", { title: TAG + " jadwal uji", type: "ACTIVITY", startTime: "08:00", endTime: "09:00", weekday: 3, date: null });
  check("schedule POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 120));
  r = await call("GET", "/api/schedule");
  const block = r.json?.blocks?.find((b) => b.title === TAG + " jadwal uji");
  check("schedule GET visible", !!block);
  if (block) {
    r = await call("DELETE", "/api/schedule?id=" + block.id);
    check("schedule DELETE", r.status === 200, String(r.status));
  }

  // 4. CATEGORIES
  r = await call("GET", "/api/categories");
  check("categories GET", r.status === 200 && Array.isArray(r.json?.categories) && r.json.categories.length > 0);
  r = await call("POST", "/api/categories", { name: TAG + " kat", icon: "package" });
  const catId = r.json?.category?.id || r.json?.id;
  check("categories POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 120));
  if (catId) {
    r = await call("DELETE", "/api/categories?id=" + catId);
    check("categories DELETE", r.status === 200, String(r.status));
  }

  // 5. TRANSACTIONS (AI categorize)
  r = await call("POST", "/api/transactions", { type: "EXPENSE", amount: 15000, note: "nasi goreng jajan siang", categoryId: undefined, day: undefined });
  check("transactions POST (AI cat)", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 160));
  const tx = r.json?.transaction;
  check("transactions AI categorized", !!tx, "no transaction returned");
  r = await call("GET", "/api/transactions");
  check("transactions GET", r.status === 200 && Array.isArray(r.json?.transactions));
  const txLive = r.json?.transactions?.find((t) => t.id === tx?.id);
  check("transactions AI has category", txLive && txLive.category && !!txLive.category.id, JSON.stringify(txLive?.category).slice(0, 80));
  if (txLive) {
    r = await call("PATCH", "/api/transactions", { id: txLive.id, categoryId: txLive.categoryId });
    check("transactions PATCH category", r.status === 200, String(r.status));
    r = await call("DELETE", "/api/transactions?id=" + txLive.id);
    check("transactions DELETE", r.status === 200, String(r.status));
  }

  // 6. GOALS + deposit
  r = await call("POST", "/api/goals", { name: TAG + " target", targetAmount: 1000000, icon: "target", deadline: null });
  check("goals POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 140));
  r = await call("GET", "/api/goals");
  const goal = r.json?.goals?.find((g) => g.name === TAG + " target");
  check("goals GET visible", !!goal);
  if (goal) {
    r = await call("PATCH", "/api/goals", { id: goal.id, action: "deposit", amount: 100000 });
    check("goals deposit PATCH", r.status === 200, JSON.stringify(r.json).slice(0, 120));
    r = await call("GET", "/api/goals");
    const g2 = r.json?.goals?.find((g) => g.id === goal.id);
    check("goals deposit reflected", g2 && g2.currentAmount >= 100000, "amount=" + g2?.currentAmount);
  }

  // 7. WATER
  r = await call("POST", "/api/water", { glasses: 1 });
  check("water POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 120));
  r = await call("GET", "/api/water?days=7");
  check("water GET history", r.status === 200 && Array.isArray(r.json?.history));
  r = await call("DELETE", "/api/water");
  check("water DELETE undo", r.status === 200, String(r.status));

  // 8. WORKOUTS
  r = await call("POST", "/api/workouts", { type: "Jogging", durationMinutes: 20, intensity: "SEDANG" });
  check("workouts POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 120));
  r = await call("GET", "/api/workouts?days=35");
  const wo = r.json?.workouts?.[0];
  check("workouts GET + stats", r.status === 200 && r.json?.stats && Array.isArray(r.json?.workouts));
  if (wo) {
    r = await call("DELETE", "/api/workouts?id=" + wo.id);
    check("workouts DELETE", r.status === 200, String(r.status));
  }

  // 9. SLEEP
  r = await call("POST", "/api/sleep", { bedTime: "22:30", wakeTime: "05:30", quality: 4 });
  check("sleep POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 140));
  r = await call("GET", "/api/sleep?days=14");
  check("sleep GET", r.status === 200 && Array.isArray(r.json?.logs));

  // 10. HABITS
  r = await call("POST", "/api/habits", { name: TAG + " habit", icon: "check", targetPerWeek: 5 });
  check("habits POST", r.status === 200 || r.status === 201, JSON.stringify(r.json).slice(0, 140));
  r = await call("GET", "/api/habits");
  const habit = r.json?.habits?.find((h) => h.name === TAG + " habit");
  check("habits GET + streaks", r.status === 200 && r.json?.streaks && r.json?.weeklyCount);
  if (habit) {
    r = await call("PATCH", "/api/habits", { id: habit.id });
    check("habits PATCH checkin", r.status === 200, JSON.stringify(r.json).slice(0, 120));
    r = await call("DELETE", "/api/habits?id=" + habit.id);
    check("habits DELETE", r.status === 200, String(r.status));
  }

  // 11. DASHBOARD aggregate
  r = await call("GET", "/api/dashboard");
  check("dashboard GET", r.status === 200 && r.json?.today && r.json?.tasks && r.json?.finance && r.json?.water, JSON.stringify(r.json).slice(0, 100));

  // 12. WHATIF
  r = await call("POST", "/api/whatif", { name: "Test Sepatu", price: 500000, installmentMonths: 0 });
  check("whatif POST simulate", r.status === 200 && r.json?.verdict && typeof r.json?.opportunity10y === "number", JSON.stringify(r.json).slice(0, 120));

  // 13. INVEST
  r = await call("GET", "/api/invest");
  check("invest GET", r.status === 200 && r.json?.profile?.assets, JSON.stringify(r.json).slice(0, 100));
  r = await call("PATCH", "/api/invest", { monthlyInvestment: 500000, years: 10, assets: r.json?.profile?.assets || [] });
  check("invest PATCH", r.status === 200, JSON.stringify(r.json).slice(0, 100));

  // 14. SETTINGS
  r = await call("GET", "/api/settings");
  check("settings GET", r.status === 200 && r.json?.settings?.waterTargetMl, JSON.stringify(r.json).slice(0, 100));
  r = await call("PATCH", "/api/settings", { waterTargetMl: 2000, glassMl: 250, workoutPerWeek: 3 });
  check("settings PATCH", r.status === 200, String(r.status));

  // 15. PUSH PREFS
  r = await call("GET", "/api/push/prefs");
  check("push prefs GET", r.status === 200 && Array.isArray(r.json?.prefs));
  if (r.json?.prefs?.[0]) {
    const p0 = r.json.prefs[0];
    r = await call("PATCH", "/api/push/prefs", { type: p0.type, enabled: p0.enabled });
    check("push prefs PATCH", r.status === 200, JSON.stringify(r.json).slice(0, 120));
  }

  // 16. AUTH endpoints must be gone
  r = await call("POST", "/api/auth/login", { email: "x@x.com", password: "x" });
  check("auth endpoints removed", r.status === 404, String(r.status));

  // 17. ADVISOR (runs full evaluation — heavier)
  r = await call("POST", "/api/advisor", {});
  check("advisor POST evaluate", r.status === 200 && r.json?.evaluation?.healthScore !== undefined, JSON.stringify(r.json).slice(0, 140));
  r = await call("GET", "/api/advisor");
  check("advisor GET history", r.status === 200 && Array.isArray(r.json?.evaluations));

  console.log("\n===== RESULT: " + pass + " pass, " + fail + " fail =====");
  if (failures.length) console.log("FAILURES:\n" + failures.join("\n"));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("SUITE ERROR:", e.message); process.exit(2); });
