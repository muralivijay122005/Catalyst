// src/BACKEND/seed/backup.cjs
// Dumps every collection to .db-backup/<timestamp>/<collection>.json (Extended JSON, restorable with mongoimport).
// Run: node src/BACKEND/seed/backup.cjs
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dns = require("dns");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
dns.setServers(["8.8.8.8", "1.1.1.1"]);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/catalyst");
  const { EJSON } = mongoose.mongo.BSON;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "../../../.db-backup", stamp);
  fs.mkdirSync(dir, { recursive: true });
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of collections) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), EJSON.stringify(docs, null, 2, { relaxed: false }));
    console.log(`${name}: ${docs.length}`);
  }
  console.log(`Backup written to ${dir}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
