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
                                desc: "Implement a secure JWT login system with encrypted access and refresh tokens.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Ongoing",
                                start: "2026-05-01",
                                due: "2026-05-10",
                            },
                            {
                                name: "OAuth2 Integration",
                                desc: "Configure passport strategies to add Google and GitHub social login integrations.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-05",
                                due: "2026-05-15",
                            },
                            {
                                name: "Session Management",
                                desc: "Manage active sessions securely with dynamic Redis-backed session token storage.",
                                assignee: users[2],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-05-03",
                                due: "2026-05-12",
                            },
                            {
                                name: "Login Rate Limiting",
                                desc: "Use express-rate-limit middleware to prevent brute-force attacks on login endpoints.",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Integration Tests",
                                desc: "Run end-to-end integration tests to verify safe client authentication requests.",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Not Started",
                                start: "2026-05-12",
                                due: "2026-05-22",
                            },
                            {
                                name: "Code Review",
                                desc: "Perform a detailed code review on the authentication system security guidelines.",
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
                                desc: "Upgrade password hashing schemes to utilize modern secure Argon2 hashing rules.",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-05-06",
                                due: "2026-05-16",
                            },
                            {
                                name: "API Rate Throttling",
                                desc: "Throttles request calls per key to avoid service degradation across endpoints.",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-09",
                                due: "2026-05-20",
                            },
                            {
                                name: "Security Headers Setup",
                                desc: "Configure robust HTTP security response headers utilizing the helmet node package.",
                                assignee: users[4],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-05-10",
                                due: "2026-05-21",
                            },
                            {
                                name: "Token Expiry Validation",
                                desc: "Verify access token expiration limits and trigger silent token refresh processes.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-13",
                                due: "2026-05-23",
                            },
                            {
                                name: "System Performance Report",
                                desc: "Analyze overall response latency and compile detailed database performance audit reports.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-05-16",
                                due: "2026-05-26",
                            },
                            {
                                name: "Penetration Testing",
                                desc: "Execute regular penetration testing to proactively locate system security issues safely.",
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
                                desc: "Create comprehensive profile management dashboards that support secure avatar uploads perfectly.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-05-02",
                                due: "2026-05-12",
                            },
                            {
                                name: "Role Assignment",
                                desc: "Assign project roles securely and enforce strict validator rules for system managers.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-05",
                                due: "2026-05-14",
                            },
                            {
                                name: "User List Pagination",
                                desc: "Implement efficient server-side pagination to limit database response query payload sizes.",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-05-04",
                                due: "2026-05-13",
                            },
                            {
                                name: "Email Notification Service",
                                desc: "Configure automated welcome letter emails and safe verification link distribution scripts.",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Activity Logs",
                                desc: "Audit interactive system interaction logs to monitor critical action history details.",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-05-06",
                                due: "2026-05-16",
                            },
                            {
                                name: "Admin Panel Review",
                                desc: "Review overall dashboard styling layouts and optimize loading speeds for admin tables.",
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
                                desc: "Establish clear role permission maps to protect critical administrative endpoint paths.",
                                assignee: users[1],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-05-07",
                                due: "2026-05-17",
                            },
                            {
                                name: "Session Timeout Logic",
                                desc: "Automatically terminate inactive user sessions and clear corresponding security cookies safely.",
                                assignee: users[2],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-09",
                                due: "2026-05-19",
                            },
                            {
                                name: "Data Encryption Policy",
                                desc: "Encrypt sensitive user details in database models utilizing secure encryption libraries.",
                                assignee: users[3],
                                priority: "Low",
                                status: "Not Started",
                                start: "2026-05-11",
                                due: "2026-05-21",
                            },
                            {
                                name: "API Permission Testing",
                                desc: "Run automated integration tests verifying that basic accounts cannot perform deletions.",
                                assignee: users[4],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-13",
                                due: "2026-05-23",
                            },
                            {
                                name: "Password Policy Enforcement",
                                desc: "Enforce strict complex password guidelines during initial user account registration phases.",
                                assignee: users[0],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Audit Log Testing",
                                desc: "Test the user logger resilience against sudden system disconnects and errors.",
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
                                desc: "Map secure internal service routes and expose modern public endpoints to microservices.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Completed",
                                start: "2026-05-01",
                                due: "2026-05-08",
                            },
                            {
                                name: "Load Balancer Configuration",
                                desc: "Configure high-availability load balancing algorithms across core cluster nodes for traffic.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-05",
                                due: "2026-05-15",
                            },
                            {
                                name: "Rate Limiting Rules",
                                desc: "Set up traffic limits of hundred requests per minute for standard IPs.",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-05-04",
                                due: "2026-05-14",
                            },
                            {
                                name: "API Logging Middleware",
                                desc: "Design high-speed logging middleware to capture and record detailed API system telemetry.",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Gateway Integration Testing",
                                desc: "Run end-to-end integration workflows connecting frontend calls through secure gateway proxies.",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Halted",
                                start: "2026-05-11",
                                due: "2026-05-21",
                            },
                            {
                                name: "Endpoint Failover Simulation",
                                desc: "Conduct systematic failure simulations to verify robust automated routing recovery setups safely.",
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
                                desc: "Perform advanced vulnerability scanning of proxy paths and block common security injections.",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "Traffic Monitoring Setup",
                                desc: "Integrate dashboard monitoring systems to graph inbound traffic rates and latency changes.",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-05-10",
                                due: "2026-05-20",
                            },
                            {
                                name: "Error Handling Framework",
                                desc: "Create uniform global error response templates and return standard REST error codes.",
                                assignee: users[4],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-05-06",
                                due: "2026-05-16",
                            },
                            {
                                name: "Token Verification Optimization",
                                desc: "Optimize processing performance of incoming security token checkers using cache storage databases.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-05-13",
                                due: "2026-05-23",
                            },
                            {
                                name: "Deployment Automation",
                                desc: "Automate gateway build pipelines using modern container configurations and safe deployment checks.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-05-08",
                                due: "2026-05-18",
                            },
                            {
                                name: "API Audit Logging",
                                desc: "Keep comprehensive records of all inbound proxy requests and chronological administrative updates.",
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
                                desc: "Draft beautiful interactive wireframes for workspace views to establish core visual layouts.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Ongoing",
                                start: "2026-06-01",
                                due: "2026-06-08",
                            },
                            {
                                name: "Color Scheme Finalization",
                                desc: "Establish cohesive brand-aligned palettes and dynamic CSS properties for dark light modes.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-04",
                                due: "2026-06-12",
                            },
                            {
                                name: "Typography Guidelines",
                                desc: "Document complete design typography rules for all text scales and responsive settings.",
                                assignee: users[2],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-06-02",
                                due: "2026-06-09",
                            },
                            {
                                name: "Interactive Prototype Build",
                                desc: "Build modern functional Figma prototypes of task management screens for visual preview.",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "User Flow Mapping",
                                desc: "Map exhaustive step-by-step user journeys for account setup and dashboard edits safely.",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Not Started",
                                start: "2026-06-08",
                                due: "2026-06-18",
                            },
                            {
                                name: "Design System Documentation",
                                desc: "Document clean UI design guidelines and reusable component specifications for developers.",
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
                                desc: "Design and implement a highly responsive header navigation navbar with mobile drawer.",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-06-05",
                                due: "2026-06-15",
                            },
                            {
                                name: "Card Component Styling",
                                desc: "Apply premium glassmorphic stylings to interactive cards and configure smooth animations.",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Modal Dialog Enhancements",
                                desc: "Optimize the modal popup layouts with clean background backdrops and transitions.",
                                assignee: users[4],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-06-09",
                                due: "2026-06-19",
                            },
                            {
                                name: "Button Variants Creation",
                                desc: "Create reusable buttons supporting diverse sizing and style configurations for interfaces.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-11",
                                due: "2026-06-21",
                            },
                            {
                                name: "Form Layout Polish",
                                desc: "Apply clean modern styling and robust visual focus states to inputs.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Responsive Grid Testing",
                                desc: "Run visual tests of layout grids across various modern mobile device viewports.",
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
                                desc: "Implement backend API service mappings for front-end actions and database records.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-06-01",
                                due: "2026-06-10",
                            },
                            {
                                name: "Data Sync Protocols",
                                desc: "Configure real-time web sockets for direct message communications and channel updates.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-04",
                                due: "2026-06-14",
                            },
                            {
                                name: "Error Response Handling",
                                desc: "Design user-friendly notification alerts for database connection losses and API errors.",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-06-03",
                                due: "2026-06-12",
                            },
                            {
                                name: "Webhook Setup for Real-Time",
                                desc: "Establish real-time webhook subscriptions for task state modifications and user updates.",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Cache Layer Integration",
                                desc: "Add in-memory database query caches using ultra-fast Redis layers to accelerate loading.",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Completed",
                                start: "2026-06-05",
                                due: "2026-06-14",
                            },
                            {
                                name: "Auth Token Passing",
                                desc: "Configure axios client interceptors to automatically forward JWT keys on requests.",
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
                                desc: "Build comprehensive end-to-end testing scripts for frontend actions to verify endpoints.",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Halted",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Mock API Endpoints",
                                desc: "Create localized mock server handlers for rapid prototype reviews and testing.",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-08",
                                due: "2026-06-18",
                            },
                            {
                                name: "Data Validation Rules",
                                desc: "Define strict input data validation rules inside the router request payload layer.",
                                assignee: users[4],
                                priority: "Low",
                                status: "Not Started",
                                start: "2026-06-09",
                                due: "2026-06-19",
                            },
                            {
                                name: "Performance Benchmarking",
                                desc: "Run comprehensive load tests to measure overall frontend page loading speeds.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-11",
                                due: "2026-06-21",
                            },
                            {
                                name: "Cross-Service Logging",
                                desc: "Implement centralized tracking systems to monitor multi-service calls and verify logs.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Rollback Strategy Review",
                                desc: "Draft fallback workflows and safe recovery procedures for critical API backend services.",
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
                                desc: "Provision production-ready EC2 servers and configure secure RDS databases for backend applications.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Completed",
                                start: "2026-06-01",
                                due: "2026-06-08",
                            },
                            {
                                name: "Environment Config Files",
                                desc: "Generate secure production configurations and store API secrets inside environment variables safely.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-04",
                                due: "2026-06-13",
                            },
                            {
                                name: "Database Migration Scripts",
                                desc: "Write automated schema migration scripts for databases to safely execute structural updates.",
                                assignee: users[2],
                                priority: "Low",
                                status: "Ongoing",
                                start: "2026-06-03",
                                due: "2026-06-12",
                            },
                            {
                                name: "SSL Certificate Setup",
                                desc: "Generate Let's Encrypt certificates using automated Certbot tools and force HTTPS routing.",
                                assignee: users[3],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Load Balancer Rules",
                                desc: "Create traffic distribution configurations for production server groups to maintain peak capacity.",
                                assignee: users[4],
                                priority: "Normal",
                                status: "Halted",
                                start: "2026-06-09",
                                due: "2026-06-18",
                            },
                            {
                                name: "Backup Policy Definition",
                                desc: "Configure automated daily snapshot backups for production databases to encrypted cloud storage.",
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
                                desc: "Design and implement direct CI/CD deployment pipelines on repository push events automatically.",
                                assignee: users[2],
                                priority: "Urgent",
                                status: "Not Started",
                                start: "2026-06-06",
                                due: "2026-06-16",
                            },
                            {
                                name: "Automated Testing Stage",
                                desc: "Integrate automatic unit and interface checks into deployment pipelines to block failures.",
                                assignee: users[3],
                                priority: "Normal",
                                status: "Pending",
                                start: "2026-06-08",
                                due: "2026-06-18",
                            },
                            {
                                name: "Staging Environment Deploy",
                                desc: "Set up isolated staging servers to test final builds before production release.",
                                assignee: users[4],
                                priority: "Low",
                                status: "Completed",
                                start: "2026-06-05",
                                due: "2026-06-14",
                            },
                            {
                                name: "Production Rollout Plan",
                                desc: "Formulate gradual rolling release strategies to minimize customer impact and service downtime.",
                                assignee: users[0],
                                priority: "Urgent",
                                status: "Pending",
                                start: "2026-06-11",
                                due: "2026-06-21",
                            },
                            {
                                name: "Monitoring Alerts Config",
                                desc: "Establish systematic alerts for server memory limits and request drops using channels.",
                                assignee: users[1],
                                priority: "Normal",
                                status: "Ongoing",
                                start: "2026-06-07",
                                due: "2026-06-17",
                            },
                            {
                                name: "Rollback Automation Script",
                                desc: "Write high-reliability scripts for rapid one-click deployment rollbacks to stable initial builds.",
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

            // HELPER TO GENERATE UNIQUE ATTACHMENTS AND COMMENTS ACCORDING TO TASK NEEDS
            const getSeedCommentsAndAttachments = (taskName, users) => {
                const murali = { _id: users[0]._id, firstName: users[0].firstName, lastName: users[0].lastName };
                const sarah = { _id: users[1]._id, firstName: users[1].firstName, lastName: users[1].lastName };
                const michael = { _id: users[2]._id, firstName: users[2].firstName, lastName: users[2].lastName };
                const emily = { _id: users[3]._id, firstName: users[3].firstName, lastName: users[3].lastName };
                const daniel = { _id: users[4]._id, firstName: users[4].firstName, lastName: users[4].lastName };

                if (taskName.includes("JWT")) {
                    return {
                        attachments: [
                            { id: 1, name: "jwt_architecture_spec.pdf", type: "PDF", size: "1.2 MB", user: "Murali", time: "1d ago" },
                            { id: 2, name: "jwt_flow_diagram.png", type: "Image", size: "3.4 MB", user: "Sarah", time: "12h ago" }
                        ],
                        comments: [
                            {
                                id: "c1",
                                user: michael,
                                text: "Are we using cookies or local storage for the tokens?",
                                time: "3h ago",
                                isYou: false,
                                reactions: { "👍": [murali._id.toString()] }
                            },
                            {
                                id: "c2",
                                user: murali,
                                text: "Let's stick to HTTP-only secure cookies for top-tier security.",
                                time: "2h ago",
                                isYou: true,
                                reactions: { "❤️": [michael._id.toString()] }
                            }
                        ]
                    };
                }
                if (taskName.includes("OAuth")) {
                    return {
                        attachments: [
                            { id: 1, name: "oauth2_credentials_config.json", type: "JSON", size: "4 KB", user: "Emily", time: "2d ago" }
                        ],
                        comments: [
                            {
                                id: "c1",
                                user: murali,
                                text: "I set up Google and GitHub developers client IDs in the dev portal.",
                                time: "2d ago",
                                isYou: true,
                                reactions: {}
                            },
                            {
                                id: "c2",
                                user: emily,
                                text: "Added client secrets in env template. Will link button click to passport routing.",
                                time: "1d ago",
                                isYou: false,
                                reactions: { "🔥": [murali._id.toString()] }
                            }
                        ]
                    };
                }
                if (taskName.includes("Session")) {
                    return {
                        attachments: [
                            { id: 1, name: "redis_store_config.yml", type: "YAML", size: "2 KB", user: "Michael", time: "3d ago" }
                        ],
                        comments: [
                            {
                                id: "c1",
                                user: michael,
                                text: "Session data will be stored in Redis to support horizontal scalability.",
                                time: "3d ago",
                                isYou: false,
                                reactions: {}
                            },
                            {
                                id: "c2",
                                user: sarah,
                                text: "Excellent choice! This keeps auth stateless and incredibly fast.",
                                time: "2d ago",
                                isYou: false,
                                reactions: { "👍": [michael._id.toString(), murali._id.toString()] }
                            }
                        ]
                    };
                }
                if (taskName.includes("Rate Limiting")) {
                    return {
                        attachments: [
                            { id: 1, name: "rate_limiting_test.sh", type: "Shell", size: "800 B", user: "Emily", time: "4h ago" }
                        ],
                        comments: [
                            {
                                id: "c1",
                                user: emily,
                                text: "Used express-rate-limit to lock down /api/auth/login to max 5 attempts per 15 minutes.",
                                time: "4h ago",
                                isYou: false,
                                reactions: { "👍": [murali._id.toString()] }
                            },
                            {
                                id: "c2",
                                user: murali,
                                text: "Perfect. We should also add custom warning messages for user clarity.",
                                time: "2h ago",
                                isYou: true,
                                reactions: {}
                            }
                        ]
                    };
                }
                if (taskName.includes("Wireframe") || taskName.includes("Navbar") || taskName.includes("Design") || taskName.includes("Typography")) {
                    return {
                        attachments: [
                            { id: 1, name: "brand_ui_mockups_v1.fig", type: "Figma", size: "5.4 MB", user: "Daniel", time: "1d ago" },
                            { id: 2, name: "wireframes_flow_v2.pdf", type: "PDF", size: "2.1 MB", user: "Sarah", time: "18h ago" }
                        ],
                        comments: [
                            {
                                id: "c1",
                                user: daniel,
                                text: "Choosing Google Fonts Inter and Outfit. Looks clean and modern.",
                                time: "1d ago",
                                isYou: false,
                                reactions: { "👍": [sarah._id.toString()] }
                            },
                            {
                                id: "c2",
                                user: sarah,
                                text: "Agreed. Make sure we also configure dark mode gradients.",
                                time: "12h ago",
                                isYou: false,
                                reactions: { "❤️": [daniel._id.toString()] }
                            }
                        ]
                    };
                }
                if (taskName.includes("REST") || taskName.includes("Sync") || taskName.includes("Integration") || taskName.includes("API")) {
                    return {
                        attachments: [
                            { id: 1, name: "api_endpoint_routes.xlsx", type: "Excel", size: "120 KB", user: "Daniel", time: "2d ago" }
                        ],
                        comments: [
                            {
                                id: "c1",
                                user: daniel,
                                text: "Hooked up dashboard statistics to backend API. Charts are rendering correctly.",
                                time: "2d ago",
                                isYou: false,
                                reactions: { "🚀": [murali._id.toString()] }
                            },
                            {
                                id: "c2",
                                user: murali,
                                text: "Awesome work! Response times look extremely fast on my end.",
                                time: "1d ago",
                                isYou: true,
                                reactions: { "👍": [daniel._id.toString()] }
                            }
                        ]
                    };
                }
                if (taskName.includes("AWS") || taskName.includes("Deploy") || taskName.includes("GitHub") || taskName.includes("Pipeline")) {
                    return {
                        attachments: [
                            { id: 1, name: "aws_cloudformation_template.yml", type: "YAML", size: "18 KB", user: "Daniel", time: "3d ago" },
                            { id: 2, name: "github_actions_workflow.yml", type: "YAML", size: "5 KB", user: "Murali", time: "1d ago" }
                        ],
                        comments: [
                            {
                                id: "c1",
                                user: murali,
                                text: "Configured GitHub Actions runner with the AWS secrets. Deploy is fully automated on main push.",
                                time: "1d ago",
                                isYou: true,
                                reactions: { "🔥": [daniel._id.toString()] }
                            },
                            {
                                id: "c2",
                                user: michael,
                                text: "Just did a test push and the pipeline built and deployed in 1m 45s. Incredible setup!",
                                time: "12h ago",
                                isYou: false,
                                reactions: { "👍": [murali._id.toString(), daniel._id.toString()] }
                            }
                        ]
                    };
                }

                // Fallback for general tasks
                const cleanName = taskName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                return {
                    attachments: [
                        { id: 1, name: `${cleanName}_spec.pdf`, type: "PDF", size: "850 KB", user: "Sarah", time: "2d ago" }
                    ],
                    comments: [
                        {
                            id: "c1",
                            user: sarah,
                            text: `Starting implementation work on ${taskName} today. Let's touch base on the sync call.`,
                            time: "1d ago",
                            isYou: false,
                            reactions: {}
                        },
                        {
                            id: "c2",
                            user: murali,
                            text: "Sounds like a solid plan. Keep me updated!",
                            time: "5h ago",
                            isYou: true,
                            reactions: { "👍": [sarah._id.toString()] }
                        }
                    ]
                };
            };

            // CREATE TASK GROUPS AND TASKS
            for (const config of groupConfigs) {
                const taskGroup = await TaskGroup.create({
                    title: config.title,
                    projectId: mod.projectId,
                    moduleId: mod._id,
                    subtasks: [],
                });
                const tasks = config.tasks.map((t) => {
                    const extra = getSeedCommentsAndAttachments(t.name, users);
                    return {
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
                        comments: extra.comments,
                        attachments: extra.attachments,
                    };
                });
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
            { channelId: designChannel._id, sender: users[5]._id, text: "Checking them now! Love the indigo accents." },
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