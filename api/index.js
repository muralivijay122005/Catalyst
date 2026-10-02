// api/index.js
// Vercel Serverless Function entry point.
// package.json sets "type": "module", so this file must be an ES module (require() is not defined here).
// The backend itself is CommonJS (.cjs); importing it gives us its module.exports as the default export.
import backend from "../src/BACKEND/app.cjs";

export default backend.app;
