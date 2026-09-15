/* Check push subscriptions in DB */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const subs = await p.pushSubscription.findMany();
  console.log("total subscriptions:", subs.length);
  subs.forEach((s) => {
    console.log("-", s.id.slice(0, 8), "| user:", s.userId.slice(0, 8), "| endpoint:", (s.endpoint || "").slice(0, 60), "| keys:", !!s.p256dh && !!s.auth, "| createdAt:", s.createdAt);
  });
  await p.$disconnect();
})();
