import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import { isSupabaseConfigured } from "./lib/supabase.client";
import { seedDemoData } from "./lib/data-store";
import authRoutes from "./routes/auth.routes";
import notificationRoutes from "./routes/notification.routes";
import resumeRoutes from "./routes/resume.routes";
import statsRoutes from "./routes/stats.routes";
import annotationRoutes from "./routes/annotation.routes";
import templateRoutes from "./routes/template.routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../client/dist")));

// Seed demo data
seedDemoData();

// ============================================================
// Route Mounts
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/resumes", annotationRoutes);
app.use("/api/staff", statsRoutes);
app.use("/api", statsRoutes);
app.use("/api/templates", templateRoutes);

// Serve Modern React SPA
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 MyCareer API Server running at http://localhost:${PORT}`);
  if (isSupabaseConfigured()) {
    console.log("✅ Connected to Supabase");
  } else {
    console.log("⚠️  Running in DEMO MODE (in-memory storage)");
    console.log("   Set SUPABASE_URL and SUPABASE_ANON_KEY in .env for production");
  }
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST   /api/auth/signup`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/logout`);
  console.log(`   GET    /api/auth/me`);
  console.log(`   GET    /api/resumes`);
  console.log(`   POST   /api/resumes`);
  console.log(`   POST   /api/resumes/:id/submit`);
  console.log(`   PATCH  /api/resumes/:id/status`);
  console.log(`   PATCH  /api/resumes/:id/assign`);
  console.log(`   POST   /api/resumes/:id/upload`);
  console.log(`   GET    /api/resumes/:id/versions`);
  console.log(`   GET    /api/resumes/:id/versions/:vid/download`);
  console.log(`   GET    /api/resumes/:id/feedback`);
  console.log(`   POST   /api/resumes/:id/feedback`);
  console.log(`   GET    /api/staff/workload`);
  console.log(`   GET    /api/stats`);
  console.log(`   GET    /api/analytics`);
  console.log(`   GET    /api/notifications`);
  console.log(`   PATCH  /api/notifications/:id/read`);
  console.log(`   PATCH  /api/notifications/read-all`);
  console.log(`   GET    /api/templates`);
  console.log(`   POST   /api/templates`);
  console.log(`   GET    /api/templates/:id/download`);
  console.log(`   DELETE /api/templates/:id`);
  console.log(`   GET    /api/resumes/:id/annotations`);
  console.log(`   POST   /api/resumes/:id/annotations`);
  console.log(`   DELETE /api/annotations/:id\n`);
});
