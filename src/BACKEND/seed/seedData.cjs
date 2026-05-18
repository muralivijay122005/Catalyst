// src/BACKEND/seed/seedData.cjs
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

const {
    User,
    Project,
    Module,
    TaskGroup,
    Task,
    Channel,
    Message
} = require("../models/index.cjs");

(async () => {
    try {
        const MONGO_URI =
            process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/projectDB";
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB Connected");

        // CLEAR ALL DATA
        await Promise.all([
            User.deleteMany({}),
            Project.deleteMany({}),
            Module.deleteMany({}),
            TaskGroup.deleteMany({}),
            Task.deleteMany({}),
            Channel.deleteMany({}),
            Message.deleteMany({})
        ]);
        console.log("Old data cleared");

        // USERS
        const users = await User.insertMany([
            {
                firstName: "Murali",
                lastName: "Vijay",
                username: "mvijay",
                email: "murali.123@company.com",
                password: await bcrypt.hash("murali123", 12),
                role: "admin",
            },
            {
                firstName: "Sarah",
                lastName: "Johnson",
                username: "sarahj",
                email: "sarah.johnson@company.com",
                password: await bcrypt.hash("sarah123", 12),
                role: "projectManager",
            },
            {
                firstName: "Michael",
                lastName: "Davis",
                username: "michaeld",
                email: "michael.davis@company.com",
                password: await bcrypt.hash("michael123", 12),
                role: "teamMember",
            },
            {
                firstName: "Emily",
                lastName: "Clark",
                username: "emilyc",
                email: "emily.clark@company.com",
                password: await bcrypt.hash("emily123", 12),
                role: "teamMember",
            },
            {
                firstName: "Daniel",
                lastName: "Harris",
                username: "danielh",
                email: "daniel.harris@company.com",
                password: await bcrypt.hash("daniel123", 12),
                role: "teamMember",
            },
            {
                firstName: "Olivia",
                lastName: "Turner",
                username: "oliviat",
                email: "olivia.turner@company.com",
                password: await bcrypt.hash("olivia123", 12),
                role: "teamMember",
            },
        ]);
        console.log("Users seeded");

        // PROJECTS
        const projects = await Project.insertMany([
            {
                name: "API & Auth System",
                description: "Develop secure APIs with JWT and OAuth authentication.",
                owner: users[0]._id,
                members: [
                    { user: users[0]._id, role: "owner" },
                    { user: users[1]._id, role: "manager" },
                    { user: users[2]._id, role: "member" },
                    { user: users[3]._id, role: "member" },
                    { user: users[4]._id, role: "member" },
                    { user: users[5]._id, role: "member" },
                ],
                workspace: "Backend Suite",
            },
            {
                name: "Website Revamp & Deployment",
                description:
                    "Redesign the company website and deploy it to AWS with monitoring and CI/CD pipelines.",
                owner: users[1]._id,
                members: [
                    { user: users[1]._id, role: "owner" },
                    { user: users[0]._id, role: "manager" },
                    { user: users[2]._id, role: "member" },
                    { user: users[3]._id, role: "member" },
                    { user: users[4]._id, role: "member" },
                    { user: users[5]._id, role: "member" },
                ],
                workspace: "Frontend Suite",
            },
        ]);
        console.log("Projects seeded");

        // MODULES
        const projectModules = {
            "API & Auth System": [
                "Authentication Service",
                "User Management",
                "API Gateway",
            ],
            "Website Revamp & Deployment": [
                "Frontend UI",
                "Backend Integration",
                "Deployment Setup",
            ],
        };
        const allModules = [];
        for (const project of projects) {
            const names = projectModules[project.name] || [];
            const created = await Module.insertMany(
                names.map((name) => ({
                    name,
                    description: `${name} module for ${project.name}`,
                    projectId: project._id,
                }))
            );
            await Project.findByIdAndUpdate(project._id, {
                $push: { modules: { $each: created.map((m) => m._id) } },
            });
            allModules.push(...created);
        }
        console.log("Modules seeded");

        // ALL TASK GROUPS & TASKS
        for (const mod of allModules) {
            let groupConfigs = [];
            if (mod.name === "Authentication Service") {
                groupConfigs = [
                    {
                        title: "Implementation & Testing",
                        tasks: [
                            {
                                name: "JWT Authentication Setup",
                                desc: "Implement secure JWT login system",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Ongoing",
                                start: "2026-05-01",
                                due: "2026-05-10",
                            },
                            {
                                name: "OAuth2 Integration",
                                desc: "Add Google/GitHub login support",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-05",
                                due: "2026-05-15",
                            },
                            {
                                name: "Session Management",
                                desc: "Manage user sessions securely",
                                assignee: users[2],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-05-03",
                                due: "2026-05-12",
                            },
                            {
                                name: "Login Rate Limiting",
                                desc: "Prevent brute force attacks",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Integration Tests",
                                desc: "Test auth with frontend",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Not Started",
                                start: "2026-05-12",
                                due: "2026-05-22",
                            },
                            {
                                name: "Code Review",
                                desc: "Review authentication code",
                                assignee: users[1],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-05-15",
                                due: "2026-05-25",
                            },
                        ],
                    },
                    {
                        title: "Security & Optimization",
                        tasks: [
                            {
                                name: "Password Hashing Audit",
                                desc: "Upgrade to Argon2 hashing",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-05-06",
                                due: "2026-05-16",
                            },
                            {
                                name: "API Rate Throttling",
                                desc: "Limit API calls per minute",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-09",
                                due: "2026-05-20",
                            },
                            {
                                name: "Security Headers Setup",
                                desc: "Add CSP, HSTS headers",
                                assignee: users[4],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-05-10",
                                due: "2026-05-21",
                            },
                            {
                                name: "Token Expiry Validation",
                                desc: "Auto expire old tokens",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-13",
                                due: "2026-05-23",
                            },
                            {
                                name: "System Performance Report",
                                desc: "Analyze auth speed",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-05-16",
                                due: "2026-05-26",
                            },
                            {
                                name: "Penetration Testing",
                                desc: "Full security scan",
                                assignee: users[3],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-05-20",
                                due: "2026-05-30",
                            },
                        ],
                    },
                ];
            } else if (mod.name === "User Management") {
                groupConfigs = [
                    {
                        title: "Development",
                        tasks: [
                            {
                                name: "User Profile CRUD",
                                desc: "Create/edit/delete user profiles",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-05-02",
                                due: "2026-05-12",
                            },
                            {
                                name: "Role Assignment",
                                desc: "Assign admin/manager roles",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-05",
                                due: "2026-05-14",
                            },
                            {
                                name: "User List Pagination",
                                desc: "Load users in pages",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-05-04",
                                due: "2026-05-13",
                            },
                            {
                                name: "Email Notification Service",
                                desc: "Send welcome/reset emails",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Activity Logs",
                                desc: "Track user actions",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-05-06",
                                due: "2026-05-16",
                            },
                            {
                                name: "Admin Panel Review",
                                desc: "Review user dashboard",
                                assignee: users[0],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-05-14",
                                due: "2026-05-24",
                            },
                        ],
                    },
                    {
                        title: "Policies & Audits",
                        tasks: [
                            {
                                name: "User Access Policy",
                                desc: "Define role permissions",
                                assignee: users[1],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-05-07",
                                due: "2026-05-17",
                            },
                            {
                                name: "Session Timeout Logic",
                                desc: "Auto logout after 30min",
                                assignee: users[2],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-09",
                                due: "2026-05-19",
                            },
                            {
                                name: "Data Encryption Policy",
                                desc: "Encrypt sensitive fields",
                                assignee: users[3],
                                priority: "Low",
                                status: "Not Started",
                                start: "2026-05-11",
                                due: "2026-05-21",
                            },
                            {
                                name: "API Permission Testing",
                                desc: "Test role-based access",
                                assignee: users[4],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-13",
                                due: "2026-05-23",
                            },
                            {
                                name: "Password Policy Enforcement",
                                desc: "Min 12 chars + symbols",
                                assignee: users[0],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Audit Log Testing",
                                desc: "Verify logs recorded",
                                assignee: users[2],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-05-20",
                                due: "2026-05-30",
                            },
                        ],
                    },
                ];
            } else if (mod.name === "API Gateway") {
                groupConfigs = [
                    {
                        title: "Gateway Engineering",
                        tasks: [
                            {
                                name: "Gateway Routing Setup",
                                desc: "Define all API routes",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Completed",
                                start: "2026-05-01",
                                due: "2026-05-08",
                            },
                            {
                                name: "Load Balancer Configuration",
                                desc: "Balance traffic across servers",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-05",
                                due: "2026-05-15",
                            },
                            {
                                name: "Rate Limiting Rules",
                                desc: "100 req/min per IP",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-05-04",
                                due: "2026-05-14",
                            },
                            {
                                name: "API Logging Middleware",
                                desc: "Log all API calls",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Gateway Integration Testing",
                                desc: "Test with frontend",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Halted",
                                start: "2026-05-11",
                                due: "2026-05-21",
                            },
                            {
                                name: "Endpoint Failover Simulation",
                                desc: "Test backup server",
                                assignee: users[1],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-05-14",
                                due: "2026-05-24",
                            },
                        ],
                    },
                    {
                        title: "Gateway Resilience & Monitoring",
                        tasks: [
                            {
                                name: "API Gateway Security Scan",
                                desc: "Scan for vulnerabilities",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Traffic Monitoring Setup",
                                desc: "Monitor API traffic",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-10",
                                due: "2026-05-20",
                            },
                            {
                                name: "Error Handling Framework",
                                desc: "Standard error responses",
                                assignee: users[4],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-05-06",
                                due: "2026-05-16",
                            },
                            {
                                name: "Token Verification Optimization",
                                desc: "Faster JWT check",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-13",
                                due: "2026-05-23",
                            },
                            {
                                name: "Deployment Automation",
                                desc: "Auto deploy gateway",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "API Audit Logging",
                                desc: "Log all API usage",
                                assignee: users[2],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-05-20",
                                due: "2026-05-30",
                            },
                        ],
                    },
                ];
            } else if (mod.name === "Frontend UI") {
                groupConfigs = [
                    {
                        title: "Design & Prototyping",
                        tasks: [
                            {
                                name: "Wireframe Creation",
                                desc: "Design app layout",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Ongoing",
                                start: "2026-06-01",
                                due: "2026-06-08",
                            },
                            {
                                name: "Color Scheme Finalization",
                                desc: "Choose brand colors",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-04",
                                due: "2026-06-12",
                            },
                            {
                                name: "Typography Guidelines",
                                desc: "Define font system",
                                assignee: users[2],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-06-02",
                                due: "2026-06-09",
                            },
                            {
                                name: "Interactive Prototype Build",
                                desc: "Figma prototype",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "User Flow Mapping",
                                desc: "Map user journey",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Not Started",
                                start: "2026-06-08",
                                due: "2026-06-18",
                            },
                            {
                                name: "Design System Documentation",
                                desc: "Document components",
                                assignee: users[1],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-06-10",
                                due: "2026-06-20",
                            },
                        ],
                    },
                    {
                        title: "Component Development",
                        tasks: [
                            {
                                name: "Navigation Bar Implementation",
                                desc: "Build responsive navbar",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-06-05",
                                due: "2026-06-15",
                            },
                            {
                                name: "Card Component Styling",
                                desc: "Task cards design",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Modal Dialog Enhancements",
                                desc: "Better modal UX",
                                assignee: users[4],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-06-09",
                                due: "2026-06-19",
                            },
                            {
                                name: "Button Variants Creation",
                                desc: "Primary/secondary buttons",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-11",
                                due: "2026-06-21",
                            },
                            {
                                name: "Form Layout Polish",
                                desc: "Final UI polish",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Responsive Grid Testing",
                                desc: "Test on all devices",
                                assignee: users[3],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-06-15",
                                due: "2026-06-25",
                            },
                        ],
                    },
                ];
            } else if (mod.name === "Backend Integration") {
                groupConfigs = [
                    {
                        title: "API Connectivity",
                        tasks: [
                            {
                                name: "REST Endpoint Mapping",
                                desc: "Connect to backend APIs",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-06-01",
                                due: "2026-06-10",
                            },
                            {
                                name: "Data Sync Protocols",
                                desc: "Real-time data sync",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-04",
                                due: "2026-06-14",
                            },
                            {
                                name: "Error Response Handling",
                                desc: "Show user-friendly errors",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-06-03",
                                due: "2026-06-12",
                            },
                            {
                                name: "Webhook Setup for Real-Time",
                                desc: "Live updates via webhooks",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Cache Layer Integration",
                                desc: "Redis caching layer",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-06-05",
                                due: "2026-06-14",
                            },
                            {
                                name: "Auth Token Passing",
                                desc: "Pass JWT to backend",
                                assignee: users[1],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-06-10",
                                due: "2026-06-20",
                            },
                        ],
                    },
                    {
                        title: "Testing & Validation",
                        tasks: [
                            {
                                name: "Integration Test Suite",
                                desc: "Test frontend-backend",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Mock API Endpoints",
                                desc: "Mock data for dev",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-08",
                                due: "2026-06-18",
                            },
                            {
                                name: "Data Validation Rules",
                                desc: "Validate form inputs",
                                assignee: users[4],
                                priority: "Low",
                                status: "Not Started",
                                start: "2026-06-09",
                                due: "2026-06-19",
                            },
                            {
                                name: "Performance Benchmarking",
                                desc: "Test load times",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-11",
                                due: "2026-06-21",
                            },
                            {
                                name: "Cross-Service Logging",
                                desc: "Log frontend errors",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Rollback Strategy Review",
                                desc: "Plan rollback process",
                                assignee: users[2],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-06-16",
                                due: "2026-06-26",
                            },
                        ],
                    },
                ];
            } else if (mod.name === "Deployment Setup") {
                groupConfigs = [
                    {
                        title: "Infrastructure Prep",
                        tasks: [
                            {
                                name: "AWS Instance Provisioning",
                                desc: "Launch production server",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Completed",
                                start: "2026-06-01",
                                due: "2026-06-08",
                            },
                            {
                                name: "Environment Config Files",
                                desc: "Setup env variables",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-04",
                                due: "2026-06-13",
                            },
                            {
                                name: "Database Migration Scripts",
                                desc: "Migrate old data",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-06-03",
                                due: "2026-06-12",
                            },
                            {
                                name: "SSL Certificate Setup",
                                desc: "Free HTTPS with Let's Encrypt",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Load Balancer Rules",
                                desc: "Route traffic properly",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Halted",
                                start: "2026-06-09",
                                due: "2026-06-18",
                            },
                            {
                                name: "Backup Policy Definition",
                                desc: "Daily automated backup",
                                assignee: users[1],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-06-11",
                                due: "2026-06-21",
                            },
                        ],
                    },
                    {
                        title: "CI/CD Pipeline",
                        tasks: [
                            {
                                name: "GitHub Actions Workflow",
                                desc: "Auto deploy on push",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Automated Testing Stage",
                                desc: "Run tests before deploy",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-08",
                                due: "2026-06-18",
                            },
                            {
                                name: "Staging Environment Deploy",
                                desc: "Test before production",
                                assignee: users[4],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-06-05",
                                due: "2026-06-14",
                            },
                            {
                                name: "Production Rollout Plan",
                                desc: "Safe production deploy",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-11",
                                due: "2026-06-21",
                            },
                            {
                                name: "Monitoring Alerts Config",
                                desc: "Setup uptime alerts",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Rollback Automation Script",
                                desc: "One-click rollback",
                                assignee: users[3],
                                priority: "Low",
                                status: "Pending",
                                start: "2026-06-16",
                                due: "2026-06-26",
                            },
                        ],
                    },
                ];
            }

            // CREATE TASK GROUPS AND TASKS
            for (const config of groupConfigs) {
                const taskGroup = await TaskGroup.create({
                    title: config.title,
                    projectId: mod.projectId,
                    moduleId: mod._id,
                    subtasks: [],
                });
                const tasks = config.tasks.map((t) => ({
                    name: t.name,
                    description: t.desc,
                    assignee: t.assignee._id,
                    projectId: mod.projectId,
                    moduleId: mod._id,
                    groupId: taskGroup._id,
                    priority: t.priority,
                    status: t.status,
                    startDate: new Date(`${t.start}T00:00:00Z`),
                    dueDate: new Date(`${t.due}T00:00:00Z`),
                }));
                const createdTasks = await Task.insertMany(tasks);
                await TaskGroup.findByIdAndUpdate(taskGroup._id, {
                    $set: { subtasks: createdTasks.map((t) => t._id) },
                });
                await Module.findByIdAndUpdate(mod._id, {
                    $push: { taskGroups: taskGroup._id },
                });
            }
        }

        // ====================== CHANNELS & DIRECT MESSAGES ======================
        const channelsData = [
            { name: "General", locked: false, isDM: false, participants: [] },
            { name: "Product Design", locked: false, isDM: false, participants: [] },
            { name: "Dev Team", locked: false, isDM: false, participants: [] },
            { name: "Announcements", locked: true, isDM: false, participants: [] },
        ];

        const seededChannels = await Channel.insertMany(channelsData);
        const generalChannel = seededChannels.find(c => c.name === "General");
        const designChannel = seededChannels.find(c => c.name === "Product Design");
        const devChannel = seededChannels.find(c => c.name === "Dev Team");

        const publicMessages = [
            { channelId: generalChannel._id, sender: users[0]._id, text: "Welcome to Catalyst everyone! Let's get started on the new sprint." },
            { channelId: generalChannel._id, sender: users[1]._id, text: "Excited to be here! The design system is looking great." },
            { channelId: designChannel._id, sender: users[1]._id, text: "Hey Sarah, I've updated the figma files with the new palette." },
            { channelId: designChannel._id, sender: users[5]._id, text: "Checking them now! Love the violet accents." },
            { channelId: devChannel._id, sender: users[2]._id, text: "The API gateway is now supporting JWT auth. Check the docs." },
            { channelId: devChannel._id, sender: users[3]._id, text: "Awesome, I'll start the frontend integration today." },
        ];

        // Specific DMs for key users
        const dmPairs = [
            { u1: users[0], u2: users[1], msgs: ["Hi Sarah, do you have the project roadmap ready?", "Yes Murali, just finishing the final touches on the Gantt chart."] },
            { u1: users[2], u2: users[3], msgs: ["Hey Emily, is the login form ready for testing?", "Almost! Just fixing a small CSS bug on mobile."] },
            { u1: users[0], u2: users[2], msgs: ["Michael, how's the backend migration going?", "Going well! No major blockers so far."] },
        ];

        const dmMessages = [];
        for (const pair of dmPairs) {
            const newDM = await Channel.create({
                name: `${pair.u1.firstName} & ${pair.u2.firstName}`,
                isDM: true,
                participants: [pair.u1._id, pair.u2._id]
            });
            dmMessages.push(
                { channelId: newDM._id, sender: pair.u1._id, text: pair.msgs[0] },
                { channelId: newDM._id, sender: pair.u2._id, text: pair.msgs[1] }
            );
        }

        await Message.insertMany([...publicMessages, ...dmMessages]);
        console.log(`Seeded ${publicMessages.length + dmMessages.length} messages across channels and DMs.`);

    
        console.log("");
        console.log("=== SEEDING COMPLETED ===");
        console.log("Admin Login:");
        console.log("Email: murali.123@company.com");
        console.log("Password: murali123");
        console.log("All DMs between every user pair have been created.");

    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await mongoose.connection.close();
        console.log("DB connection closed");
    }
})();