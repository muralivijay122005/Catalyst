// src/Components/Docs.jsx
import React, { useState, useEffect } from "react";
import {
  FiSearch,
  FiBookOpen,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiFileText,
  FiFolder,
  FiFolderMinus,
  FiTag,
  FiClock,
  FiUser,
  FiArrowRight,
  FiCopy,
  FiCheck,
  FiEye,
  FiCode,
  FiInfo,
  FiAlertTriangle,
  FiList,
  FiBold,
  FiChevronsRight,
  FiLayers,
  FiExternalLink
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

// Initial professional seed documents
const SEED_DOCS = [
  {
    id: "welcome-catalyst",
    title: "Welcome to Catalyst Platform",
    category: "🚀 Getting Started",
    icon: "🚀",
    description: "Learn the fundamentals of Catalyst, our product philosophy, and how to maximize your project velocity.",
    author: "Catalyst Core Team",
    lastUpdated: "May 20, 2026",
    readingTime: "3 min read",
    tags: ["Onboarding", "Introduction", "Overview"],
    content: `# Welcome to Catalyst! 🚀

Catalyst is a premium, real-time collaboration workspace designed to unify project management, instant messaging, and technical documentation into a single, cohesive experience. 

Whether you're a Project Manager planning a sprint or a Team Member delivering high-quality modules, Catalyst is engineered to accelerate your workflow.

## Key Interface Pillars

1. **Dashboard**: A bird's-eye view of your project health, task progress analytics, and active member directory.
2. **Real-time Inbox**: Threaded chatrooms, direct messaging, and quick channel creation to reduce synchronous meeting overhead.
3. **Docs (You are here)**: Centralized wiki for team handbooks, architectural blueprints, API documentation, and code reviews.
4. **Kanban & Spreadsheet**: Highly functional task boards and lists to track Ongoing vs. Pending deliverables.

> [!NOTE]
> All documentation changes in this Wiki are persistent. Feel free to customize this article or add new ones by clicking the **"Create Document"** button at the top of the sidebar.

## Quick Tips for Getting Started
- Pick a project from the sidebar to visualize its corresponding spreadsheet, calendar, or Kanban board.
- Check the Inbox to coordinate real-time with team members.
- Use the categories below to dive deeper into the technical stack or API endpoints!`
  },
  {
    id: "tech-architecture",
    title: "System Architecture & Core Technologies",
    category: "💻 Tech Stack",
    icon: "💻",
    description: "Deep dive into our single-page application structure, state management, and backend database layers.",
    author: "Lead Architect",
    lastUpdated: "May 18, 2026",
    readingTime: "5 min read",
    tags: ["React", "Express", "NodeJS", "Architecture"],
    content: `# System Architecture & Core Stack 💻

This document provides a technical overview of Catalyst's technology suite and structural patterns. 

Our core philosophy is **high performance**, **minimum abstraction overhead**, and **rich, dynamic UI presentation**.

## The Architecture Diagram

\`\`\`
+------------------+     WebSockets     +----------------------+
|  React Client    |<==================>|  Express Gateway     |
|  (Tailwind CSS)  |      REST APIs     |  (Node.js Server)    |
+------------------+                    +----------------------+
                                                    ||
                                                    || Mongoose
                                                    \/
                                        +----------------------+
                                        |   MongoDB Database   |
                                        +----------------------+
\`\`\`

## Frontend Architecture

The frontend is a single-page application (SPA) scaffolded with **Vite** and built using **React**.

- **Styling**: Tailored with Tailwind CSS using fluid utility models and modern, cohesive color systems (Slate, Indigo, and Emerald).
- **Icons**: React Icons (specifically \`react-icons/fi\`, \`react-icons/hi\`, \`react-icons/go\`, and \`react-icons/rx\`) providing lightweight SVG vectors.
- **Routing**: Client-side navigation managed via \`react-router-dom\`.
- **State Management**: React Context APIs (\`AuthContext\`) to secure user state and feed global variables.

> [!TIP]
> Keep components lean. Separate heavy business logic into pure hooks or dedicated API utilities located under \`src/BACKEND/utils/api.js\`.

## Backend Stack

- **Server Engine**: Node.js utilizing **Express** in standard CommonJS format (\`server.cjs\`).
- **Database Engine**: **MongoDB** paired with **Mongoose** schemas for rapid, flexible schema modeling.
- **Real-Time Layer**: Bidirectional communication for Inbox features using direct server-side hooks.
- **Auth Strategy**: Stateless **JSON Web Tokens (JWT)** passed securely through standard HTTP \`Authorization\` Bearer headers.`
  },
  {
    id: "api-specs",
    title: "REST API Endpoint Reference",
    category: "💡 API Reference",
    icon: "💡",
    description: "Detailed documentation of REST endpoints, parameters, header values, and JSON payload structures.",
    author: "Backend Dev Group",
    lastUpdated: "May 19, 2026",
    readingTime: "8 min read",
    tags: ["API", "Endpoints", "Backend", "JSON"],
    content: `# REST API Endpoint Reference 💡

All resource endpoints are prefixed by \`http://localhost:5000/api\`. All API endpoints expect dynamic Bearer Tokens in the authorization header.

> [!IMPORTANT]
> **Authorization Header Format:**
> \`Authorization: Bearer <your_jwt_token>\`

---

### 1. Authentication Router (\`/auth\`)

| Method | Endpoint | Description | Scope |
| :--- | :--- | :--- | :--- |
| \`POST\` | \`/auth/register\` | Create a new user account | Public |
| \`POST\` | \`/auth/login\` | Authenticate user & receive JWT token | Public |
| \`GET\` | \`/auth/me\` | Verify current token and retrieve user payload | Authenticated |

#### Sample Login Request:
\`\`\`json
{
  "email": "admin@catalyst.com",
  "password": "Password123"
}
\`\`\`

---

### 2. Projects Router (\`/projects\`)

| Method | Endpoint | Description | Scope |
| :--- | :--- | :--- | :--- |
| \`GET\` | \`/projects\` | Retrieve all projects and modules for the workspace | Authenticated |
| \`POST\` | \`/projects\` | Create a new project (title, desc) | Admin Only |
| \`DELETE\` | \`/projects/:id\` | Delete project and nested modules permanently | Admin Only |

---

### 3. Inbox Router (\`/channels\` & \`/messages\`)

| Method | Endpoint | Description | Scope |
| :--- | :--- | :--- | :--- |
| \`GET\` | \`/channels\` | Fetch all communication channels | Authenticated |
| \`POST\` | \`/channels\` | Create a new project channel | Admin / Member |
| \`GET\` | \`/messages/:channelId\` | Fetch message history for selected channel | Authenticated |
| \`POST\` | \`/messages\` | Post a new message | Authenticated |

> [!WARNING]
> Ensure that \`channelId\` is valid. Attempting to fetch or send messages to non-existent channels will return a \`404 Not Found\` response status.`
  },
  {
    id: "team-guidelines",
    title: "Team Onboarding & Code Guidelines",
    category: "👥 Team Guidelines",
    icon: "👥",
    description: "Standard practices for git branch management, pull requests, styling rules, and workspace ethics.",
    author: "Engineering VP",
    lastUpdated: "May 15, 2026",
    readingTime: "4 min read",
    tags: ["Standards", "Git", "Onboarding", "CSS"],
    content: `# Team Onboarding & Code Guidelines 👥

Ensuring a clean, high-velocity engineering workspace requires consistency. This document covers our coding guidelines, styling conventions, and version control procedures.

## Style Conventions

1. **Keep CSS Clean**: Leverage Tailwind utility classes where possible. For custom layouts, leverage the standard premium CSS variables mapped inside \`src/index.css\`.
2. **React Coding Model**:
   - Prefer functional components utilizing React hooks.
   - Separate styles and presentation from business controllers.
   - Use dynamic JSX keys responsibly (avoid array indices as keys).

## Git & Deployment Workflow

We leverage a trunk-based branch model with high PR velocity.

\`\`\`
main   -------------------------------------> [Prod]
         \                              /
dev       +----------------------------+----> [Staging]
            \                        /
feature      +-- [feature/chat-ui] -+
\`\`\`

1. **Branch Names**: Format your branches as \`feature/short-desc\` or \`bugfix/short-desc\`.
2. **Commits**: Follow conventional commits (e.g., \`feat: add dynamic channel creation\`, \`fix: resolve message overlap issue\`).
3. **Pull Requests**: Every PR must undergo review by at least one peer. Ensure your local code compiles and has zero linter errors before requesting reviews.

> [!CAUTION]
> Never push directly to the \`main\` or \`dev\` branches. Doing so will bypass the automated test pipelines and disrupt the staging environment.`
  }
];

const CATEGORIES = [
  "All Articles",
  "🚀 Getting Started",
  "💻 Tech Stack",
  "💡 API Reference",
  "👥 Team Guidelines"
];

const Docs = () => {
  const { currentUser } = useAuth();
  const isAdminOrManager = currentUser?.role === "admin" || currentUser?.role === "projectManager";

  // State Management
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Articles");
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("🚀 Getting Started");
  const [editIcon, setEditIcon] = useState("🚀");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editAuthor, setEditAuthor] = useState("");

  const [editorTab, setEditorTab] = useState("edit"); // "edit" | "preview"
  const [copySuccess, setCopySuccess] = useState("");

  // Load from localStorage or seed
  useEffect(() => {
    const saved = localStorage.getItem("catalyst_docs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDocs(parsed);
        if (parsed.length > 0) setSelectedDoc(parsed[0]);
      } catch (e) {
        console.error("Failed parsing docs, seeding...", e);
        setDocs(SEED_DOCS);
        setSelectedDoc(SEED_DOCS[0]);
      }
    } else {
      setDocs(SEED_DOCS);
      setSelectedDoc(SEED_DOCS[0]);
      localStorage.setItem("catalyst_docs", JSON.stringify(SEED_DOCS));
    }
  }, []);

  const saveDocsToStorage = (updatedDocs) => {
    setDocs(updatedDocs);
    localStorage.setItem("catalyst_docs", JSON.stringify(updatedDocs));
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(""), 2000);
  };

  // Modern regex-based markdown to styled HTML parser
  const renderMarkdown = (text) => {
    if (!text) return "";
    
    // Escape simple HTML characters first to make parsing safe
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Re-allow blockquote markers &gt; for parsing
    html = html.replace(/^&gt; (.*)$/gm, "> $1");

    // 1. Process custom GitHub-style notice blocks / callouts
    // Pattern: > [!NOTE] or > [!TIP] etc.
    const calloutRegex = /^&gt;\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n([\s\S]*?)(?=(?:^&gt; [!|\n]|\n\n|\n*$))/gm;
    html = html.replace(calloutRegex, (match, type, content) => {
      const cleanContent = content.replace(/^&gt;\s?/gm, "").trim();
      let alertClass = "";
      let icon = null;
      let title = type;

      switch (type) {
        case "NOTE":
          alertClass = "border-l-4 border-blue-500 bg-blue-50 text-blue-900";
          icon = `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
          break;
        case "TIP":
          alertClass = "border-l-4 border-emerald-500 bg-emerald-50 text-emerald-900";
          icon = `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;
          break;
        case "IMPORTANT":
          alertClass = "border-l-4 border-indigo-500 bg-indigo-50 text-indigo-900";
          icon = `<svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`;
          break;
        case "WARNING":
          alertClass = "border-l-4 border-amber-500 bg-amber-50 text-amber-900";
          icon = `<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
          break;
        case "CAUTION":
          alertClass = "border-l-4 border-rose-500 bg-rose-50 text-rose-900";
          icon = `<svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
          break;
        default:
          alertClass = "border-l-4 border-slate-500 bg-slate-50 text-slate-900";
          icon = `<svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      }

      return `<div class="my-4 p-4 rounded-r-lg ${alertClass} flex gap-3 items-start select-none">
        <div class="mt-0.5 shrink-0">${icon}</div>
        <div>
          <div class="font-bold text-xs uppercase tracking-wider mb-1">${title}</div>
          <div class="text-sm font-normal">${cleanContent}</div>
        </div>
      </div>`;
    });

    // 2. Standard blockquotes
    html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote class="border-l-4 border-slate-300 pl-4 py-1 my-3 text-slate-600 italic font-medium bg-slate-50/50 rounded-r">$1</blockquote>');

    // 3. Code Blocks: ```language ... ```
    // We capture code blocks carefully and render a code component mock with copy action
    let codeBlockIndex = 0;
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const codeId = `code-block-${codeBlockIndex++}`;
      const language = lang || "code";
      const cleanCode = code.trim();
      codeBlocks.push({ id: codeId, code: cleanCode });
      
      return `<div class="my-5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 overflow-hidden shadow-md">
        <div class="flex items-center justify-between px-4 py-2 bg-neutral-800 text-xs text-neutral-400 select-none">
          <span class="font-mono uppercase tracking-widest text-[10px] font-semibold text-neutral-300">${language}</span>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('copy-doc-code', {detail: {id: '${codeId}', code: \`${cleanCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` } }))"
            class="flex items-center gap-1 hover:text-white transition font-medium focus:outline-none"
            id="btn-${codeId}"
          >
            Copy Code
          </button>
        </div>
        <pre class="p-4 overflow-x-auto font-mono text-sm leading-relaxed text-slate-200"><code>${cleanCode}</code></pre>
      </div>`;
    });

    // 4. Headers: #, ##, ###
    html = html.replace(/^### (.*)$/gm, '<h3 class="text-lg font-bold text-slate-800 mt-6 mb-2 flex items-center gap-1.5">$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h2 class="text-xl font-extrabold text-slate-800 mt-8 mb-3 pb-1 border-b border-neutral-100 flex items-center gap-2">$1</h2>');
    html = html.replace(/^# (.*)$/gm, '<h1 class="text-3xl font-black text-slate-900 mt-2 mb-5 select-none">$1</h1>');

    // 5. Tables
    // Simply render clean tables
    const tableRegex = /^\|(.+)\|$\n^\|([-:| ]+)\|$\n((?:^\|.+\|$\n?)+)/gm;
    html = html.replace(tableRegex, (match, header, separator, body) => {
      const headers = header.split('|').map(h => h.trim()).filter(h => h);
      const rows = body.trim().split('\n').map(row => {
        return row.split('|').map(r => r.trim()).filter(r => r);
      });

      let tableHtml = `<div class="my-5 overflow-x-auto rounded-lg border border-neutral-200 shadow-sm"><table class="w-full text-sm text-left text-neutral-600">`;
      
      // Header
      tableHtml += `<thead class="text-xs text-neutral-700 uppercase bg-neutral-50 font-bold select-none"><tr>`;
      headers.forEach(h => {
        tableHtml += `<th scope="col" class="px-6 py-3 border-b border-neutral-200">${h}</th>`;
      });
      tableHtml += `</tr></thead><tbody>`;

      // Rows
      rows.forEach((row, idx) => {
        tableHtml += `<tr class="bg-white border-b hover:bg-slate-50 transition">`;
        row.forEach(cell => {
          // Format markdown inline in tables
          let cleanCell = cell.replace(/`([^`]+)`/g, '<code class="bg-neutral-100 text-neutral-800 font-mono text-xs px-1.5 py-0.5 rounded border border-neutral-200">$1</code>');
          tableHtml += `<td class="px-6 py-4 font-normal text-neutral-800">${cleanCell}</td>`;
        });
        tableHtml += `</tr>`;
      });

      tableHtml += `</tbody></table></div>`;
      return tableHtml;
    });

    // 6. Horizontal Rule
    html = html.replace(/^---$/gm, '<hr class="my-6 border-neutral-200 opacity-70" />');

    // 7. Lists (ordered and unordered)
    // Bullet lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-5 list-disc pl-1.5 my-1 text-slate-700 leading-relaxed">$1</li>');
    // Numbered lists
    html = html.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li class="ml-5 list-decimal pl-1.5 my-1 text-slate-700 leading-relaxed">$2</li>');

    // Inline elements:
    // Bold **bold**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
    // Italic *italic* or _italic_
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');
    // Inline Code `code`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-100 text-indigo-600 font-mono text-xs px-1.5 py-0.5 rounded border border-neutral-200">$1</code>');

    // Convert newlines in standard blocks to break tags if not inside structured blocks
    // But HTML block elements will manage their own margins.
    return html;
  };

  // Listen to the custom event for code copying
  useEffect(() => {
    const handleCopyEvent = (e) => {
      const { id, code } = e.detail;
      handleCopyCode(code, id);
    };
    window.addEventListener("copy-doc-code", handleCopyEvent);
    return () => window.removeEventListener("copy-doc-code", handleCopyEvent);
  }, []);

  // Filter docs based on search queries and category choices
  const filteredDocs = docs.filter((doc) => {
    const matchesCategory =
      selectedCategory === "All Articles" || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle Edit Action
  const startEdit = () => {
    if (!selectedDoc) return;
    setEditId(selectedDoc.id);
    setEditTitle(selectedDoc.title);
    setEditCategory(selectedDoc.category);
    setEditIcon(selectedDoc.icon || "📄");
    setEditDescription(selectedDoc.description || "");
    setEditTags(selectedDoc.tags ? selectedDoc.tags.join(", ") : "");
    setEditContent(selectedDoc.content || "");
    setEditAuthor(selectedDoc.author || currentUser?.firstName || "Team Member");
    setIsEditing(true);
    setIsCreating(false);
    setEditorTab("edit");
  };

  // Handle Create Action
  const startCreate = () => {
    setEditId("");
    setEditTitle("");
    setEditCategory(selectedCategory !== "All Articles" ? selectedCategory : "🚀 Getting Started");
    setEditIcon("📄");
    setEditDescription("");
    setEditTags("");
    setEditContent("");
    setEditAuthor(currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Team Member");
    setIsCreating(true);
    setIsEditing(false);
    setEditorTab("edit");
  };

  // Submit Edit or Create form
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return alert("Document title is required.");

    const formattedTags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const readTime = `${Math.max(1, Math.ceil(editContent.split(/\s+/).length / 180))} min read`;

    if (isCreating) {
      const newDoc = {
        id: `custom-doc-${Date.now()}`,
        title: editTitle.trim(),
        category: editCategory,
        icon: editIcon || "📄",
        description: editDescription.trim(),
        author: editAuthor.trim() || "Anonymous",
        lastUpdated: formattedDate,
        readingTime: readTime,
        tags: formattedTags,
        content: editContent,
      };

      const updated = [newDoc, ...docs];
      saveDocsToStorage(updated);
      setSelectedDoc(newDoc);
      setIsCreating(false);
    } else {
      const updated = docs.map((doc) => {
        if (doc.id === editId) {
          return {
            ...doc,
            title: editTitle.trim(),
            category: editCategory,
            icon: editIcon || "📄",
            description: editDescription.trim(),
            author: editAuthor.trim(),
            lastUpdated: formattedDate,
            readingTime: readTime,
            tags: formattedTags,
            content: editContent,
          };
        }
        return doc;
      });

      saveDocsToStorage(updated);
      const matchingDoc = updated.find((d) => d.id === editId);
      if (matchingDoc) setSelectedDoc(matchingDoc);
      setIsEditing(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = (idToDelete) => {
    if (!window.confirm("Are you sure you want to permanently delete this document?")) return;

    const updated = docs.filter((doc) => doc.id !== idToDelete);
    saveDocsToStorage(updated);
    if (updated.length > 0) {
      setSelectedDoc(updated[0]);
    } else {
      setSelectedDoc(null);
    }
  };

  // Quick helper to insert Markdown helper syntax templates
  const insertTemplate = (templateType) => {
    let codeToInsert = "";
    switch (templateType) {
      case "code":
        codeToInsert = "\n```javascript\n// Write your sample function here\nconst catalyst = () => {\n  console.log(\"Boost velocity!\");\n};\n```\n";
        break;
      case "note":
        codeToInsert = "\n> [!NOTE]\n> Put your helpful supplementary tip or notes right here.\n";
        break;
      case "warning":
        codeToInsert = "\n> [!WARNING]\n> Use this block to warn users of high risk procedures.\n";
        break;
      case "table":
        codeToInsert = "\n| Parameter | Type | Required | Description |\n| :--- | :--- | :--- | :--- |\n| name | String | Yes | Name of module |\n| priority | Number | No | Default priority level |\n";
        break;
      default:
        break;
    }
    setEditContent((prev) => prev + codeToInsert);
  };

  return (
    <div className="flex h-full w-full bg-slate-50/50 text-slate-800 antialiased font-sans select-none overflow-hidden rounded-lg">
      
      {/* 1. DOCUMENT INDEX PANEL (Left sidebar inside docs) */}
      <div className="w-[30%] min-w-[280px] max-w-[360px] border-r border-slate-200 bg-white flex flex-col h-full shrink-0">
        
        {/* Search & Action bar */}
        <div className="p-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FiBookOpen size={16} />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-800">Catalyst Docs</span>
            </div>
            
            <button
              onClick={startCreate}
              className="group flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 shadow-sm hover:shadow"
            >
              <FiPlus size={14} className="group-hover:scale-110 transition" />
              <span>Create Doc</span>
            </button>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search wiki articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-lg py-2 pl-9 pr-4 text-xs placeholder-slate-400 transition"
            />
          </div>
        </div>

        {/* Categories Carousel / Tabs */}
        <div className="px-4 pb-2">
          <div className="flex gap-1 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-200 custom-scroll-hidden select-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-full shrink-0 transition duration-150 ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {cat.includes(" ") ? cat.split(" ")[1] : cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of articles */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin select-none">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <FiFolderMinus className="text-slate-300 mb-2" size={32} />
              <p className="text-xs font-semibold text-slate-500">No documents found</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">
                Create a new article or search another term.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 mt-2">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDoc && selectedDoc.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-indigo-50/70 border-l-4 border-indigo-600 text-slate-900"
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <span className="text-lg mt-0.5 select-none">{doc.icon || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                        {doc.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {doc.description || "No description provided."}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 py-0.5 px-1.5 rounded uppercase tracking-wider">
                          {doc.category.replace(/[^a-zA-Z0-9 ]/g, "").trim()}
                        </span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                          <FiClock size={10} />
                          {doc.readingTime || "1 min read"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. DOCUMENT VIEWER / WRITER INTERFACE (Right Panel) */}
      <div className="flex-1 bg-white h-full overflow-hidden flex flex-col">
        {isEditing || isCreating ? (
          
          /* ================== EDITOR VIEW ================== */
          <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Editor Header Toolbar */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {isCreating ? "Drafting New Document" : `Editing: ${selectedDoc?.title}`}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Write beautiful custom pages utilizing lightweight markdown elements.
                </p>
              </div>

              {/* View / Edit Mode Toggles */}
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 rounded-md p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${
                      editorTab === "edit" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FiCode size={13} />
                    <span>Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${
                      editorTab === "preview" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FiEye size={13} />
                    <span>Live Preview</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 text-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm hover:shadow transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Editor Workspace */}
            <div className="flex-1 flex overflow-hidden">
              {/* Form Input Area */}
              <div className={`flex-1 flex flex-col p-6 overflow-y-auto gap-4 ${editorTab === "preview" ? "hidden" : ""}`}>
                
                {/* Meta Inputs Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Title */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Coding Guidelines & Linting"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Icon Select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accent Emoji / Icon</label>
                    <div className="flex gap-2">
                      <select
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="flex-1 border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="🚀">🚀 Launch / Info</option>
                        <option value="💻">💻 Technical / Stack</option>
                        <option value="💡">💡 Idea / Reference</option>
                        <option value="👥">👥 Team / Rules</option>
                        <option value="📄">📄 File / Blank</option>
                        <option value="🔑">🔑 Resources / Creds</option>
                        <option value="⚙️">⚙️ Settings / Configs</option>
                        <option value="📅">📅 Schedule / Planning</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Wiki Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none focus:border-indigo-500 bg-white"
                    >
                      {CATEGORIES.slice(1).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. React, Onboarding, CSS"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Description input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Short Abstract / Description</label>
                  <input
                    type="text"
                    placeholder="Provide a concise 1-sentence abstract of this guide..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Markdown Toolbar Helper */}
                <div className="bg-slate-100/70 border border-slate-200/50 rounded-lg p-3 flex flex-wrap gap-2 items-center justify-between select-none">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <FiLayers size={13} className="text-slate-400" />
                    <span>Quick Markdown Injectors:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertTemplate("note")}
                      className="px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded text-[10px] font-bold border border-slate-200 transition"
                    >
                      + Notice Box
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplate("warning")}
                      className="px-2 py-1 bg-white hover:bg-amber-50 hover:text-amber-600 rounded text-[10px] font-bold border border-slate-200 transition"
                    >
                      + Warning Box
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplate("code")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 rounded text-[10px] font-bold border border-slate-200 transition"
                    >
                      + Code Snippet
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplate("table")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 rounded text-[10px] font-bold border border-slate-200 transition"
                    >
                      + Data Table
                    </button>
                  </div>
                </div>

                {/* Document Body (Text Area) */}
                <div className="flex-1 flex flex-col gap-1.5 min-h-[300px]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Document Body (Markdown Supported)</span>
                    <span className="text-[9px] font-normal text-slate-400 capitalize">
                      Use standard headings (#, ##), bullet points (-), bold (**), or code blocks (\`\`\`)
                    </span>
                  </label>
                  <textarea
                    placeholder="# Main Title Goes Here&#10;&#10;Use headings, paragraphs, and markdown blockquotes to structure your document."
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 w-full border border-slate-200 rounded-lg p-4 text-xs font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Rendered markdown Live Preview */}
              <div className={`flex-1 p-8 overflow-y-auto bg-white ${editorTab === "edit" ? "hidden" : ""}`}>
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-2 select-none">
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 py-0.5 px-2 rounded uppercase tracking-wider">
                      {editCategory}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <FiClock size={11} />
                      Live Document Preview
                    </span>
                  </div>

                  <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2">
                    <span className="text-4xl select-none">{editIcon}</span>
                    <span>{editTitle || "Untitled Document"}</span>
                  </h1>

                  <p className="text-sm text-slate-500 italic mb-6">
                    {editDescription || "No abstract provided."}
                  </p>

                  <div className="prose prose-sm max-w-none text-slate-800">
                    {editContent ? (
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(editContent) }} />
                    ) : (
                      <div className="text-center py-20 text-slate-400 italic text-xs">
                        Start typing in the Markdown tab to preview your documentation...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          
          /* ================== VIEWER VIEW ================== */
          selectedDoc ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden select-text">
              
              {/* Document Header Panel */}
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30 select-none">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl select-none">{selectedDoc.icon || "📄"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 py-0.5 px-2 rounded uppercase tracking-wider">
                        {selectedDoc.category}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <FiClock size={10} />
                        {selectedDoc.readingTime || "3 min read"}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mt-1 truncate max-w-xl">
                      {selectedDoc.title}
                    </h2>
                  </div>
                </div>

                {/* Edit / Delete action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold py-1.5 px-3 rounded-md text-xs transition duration-200"
                  >
                    <FiEdit size={13} />
                    <span>Edit Article</span>
                  </button>

                  {isAdminOrManager && (
                    <button
                      onClick={() => handleDeleteDoc(selectedDoc.id)}
                      className="flex items-center gap-1.5 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-semibold py-1.5 px-3 rounded-md text-xs transition duration-200"
                    >
                      <FiTrash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Doc Content Area */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="max-w-2xl mx-auto pb-16">
                  
                  {/* Article Metadata Card */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200/50 p-4 mb-8 flex items-center justify-between select-none">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold uppercase">
                        {selectedDoc.author ? selectedDoc.author.charAt(0) : "T"}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{selectedDoc.author || "Team Member"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Author & Contributor</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-medium">Last Modified</div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">{selectedDoc.lastUpdated}</div>
                    </div>
                  </div>

                  {/* Abstract Section */}
                  {selectedDoc.description && (
                    <div className="text-sm font-medium text-slate-500 italic border-l-2 border-indigo-600 pl-4 py-0.5 mb-8 select-text leading-relaxed">
                      {selectedDoc.description}
                    </div>
                  )}

                  {/* Rendered HTML */}
                  <div className="prose prose-slate max-w-none text-slate-800 select-text font-normal leading-relaxed">
                    <div 
                      className="markdown-body"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.content) }} 
                    />
                  </div>

                  {/* Document tags footer */}
                  {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                    <div className="mt-12 pt-6 border-t border-slate-100 flex flex-wrap gap-1.5 items-center select-none">
                      <FiTag size={12} className="text-slate-400 mr-1" />
                      {selectedDoc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-slate-100 text-slate-600 text-[10px] font-semibold py-1 px-2.5 rounded-md hover:bg-slate-200 cursor-pointer transition"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center mb-4 text-slate-400 shadow-sm">
                <FiBookOpen size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Document Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select an article from the wiki tree or create a new one to begin documentation.
              </p>
              <button
                onClick={startCreate}
                className="mt-4 flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3.5 rounded-lg shadow transition"
              >
                <FiPlus size={14} />
                <span>Create First Doc</span>
              </button>
            </div>
          )
        )}
      </div>

    </div>
  );
};

export default Docs;
