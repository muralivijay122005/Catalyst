# Catalyst

Task management with a memory. Projects, boards and approvals, plus a Knowledge Base that captures your team's decisions as you work and answers questions from them.

## Run it

```bash
npm install
npm run server     # API on http://localhost:5000 (MongoDB from src/BACKEND/.env)
npm run dev        # app on http://localhost:5173
```

Seed a demo workspace (this **replaces all data**, so back up first):

```bash
npm run db:backup  # writes .db-backup/<timestamp>/*.json
npm run seed
```

Demo accounts (password is the first name + `123`, e.g. `murali123`):

| Person | Email | Role |
|---|---|---|
| Murali Vijay | murali.vijay@catalyst.dev | Admin |
| Sarah Mitchell | sarah.mitchell@catalyst.dev | Manager |
| James Carter | james.carter@catalyst.dev | Manager |
| Emily Brooks, Michael Turner, Olivia Bennett, Daniel Hayes, Grace Sullivan, Hannah Price | first.last@catalyst.dev | Member |
| Ryan Cooper | ryan.cooper@catalyst.dev | Guest |

## Knowledge Base

Search, related-knowledge suggestions, duplicate detection, auto-tagging and distillation run on a local engine (`src/BACKEND/utils/knowledge.cjs`: BM25 ranking with TF-IDF similarity), so they work with no external AI. If `GROQ_API_KEY` is set, answers, enrichment and distillation use the Groq model in `GROQ_MODEL` on top of the same retrieval, and fall back to the local engine if the call fails.

## Access control

- **Workspace roles:** admin, manager, member, guest.
- **Project roles:** owner, manager, member, viewer.
- Admins act as owners everywhere. Managers get read-only oversight of every project.
- Guests are always viewers and only see knowledge from their own projects.
- Members edit the tasks assigned to them. When a project requires approval, their finished work goes to review.
- Nobody can approve their own work.
- Only admins change workspace roles, and the last admin can't be demoted.

The server sends per-object permissions (`can`) and the UI reads them, so the interface always matches what the API allows. The rules live in `src/BACKEND/utils/permissions.cjs`.

## Keyboard

`Ctrl/⌘ K` opens the command menu (end a query with `?` to ask the Knowledge Base). `C` creates a task, `G` then `H/I/T/A/K/C/P/S` navigates, `1–5` switches project views, `[` toggles the sidebar, and `?` lists all shortcuts.
