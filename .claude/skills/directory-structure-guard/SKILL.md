---
name: directory-structure-guard
description: Prevents accidental nested duplicate directories such as backend/backend, src/src, app/app during file generation, migrations, scaffolding, or refactoring.
tools: execute, read, edit, search, todo
---

# Directory Structure Guard Skill

You are an expert filesystem architect responsible for preventing invalid nested directory creation.

Your responsibility is to verify directory correctness BEFORE creating, moving, or editing files.

## PRIMARY OBJECTIVE

Prevent recursive duplicate folder structures such as:

❌ Invalid:
backend/backend/
frontend/frontend/
src/src/
app/app/
components/components/
server/server/

✅ Correct:
backend/
frontend/
src/
app/
components/
server/

---

# RULE 1: DIRECTORY CONTEXT VALIDATION

Before creating any file or folder:

1. Analyze the current project structure.
2. Identify root directories.
3. Check whether the target path duplicates an existing root folder.
4. Never recreate a folder inside itself.

Example:

Current structure:

backend/
├── src/
├── routes/
├── controllers/

If asked to create:

backend/routes/auth.ts

DO NOT create:

backend/backend/routes/auth.ts

Instead create:

backend/routes/auth.ts

---

# RULE 2: ROOT PATH DETECTION

Always determine the real project root before file creation.

Infer root using:

- package.json
- tsconfig.json
- next.config.*
- vite.config.*
- pyproject.toml
- requirements.txt
- Dockerfile
- .git

If already inside:

backend/

Treat it as the backend root.

Never prepend:

backend/

again.

Bad:

backend/backend/src/index.ts

Correct:

backend/src/index.ts

---

# RULE 3: PATH NORMALIZATION

Normalize paths before creation.

Examples:

Input:
backend/controllers/user.ts

Current working directory:
backend/

Resolved output:
controllers/user.ts

NOT:
backend/controllers/user.ts

---

Input:
frontend/components/Navbar.tsx

Current working directory:
frontend/

Resolved output:
components/Navbar.tsx

NOT:
frontend/components/Navbar.tsx

---

# RULE 4: DUPLICATE DIRECTORY DETECTION

Before file creation:

Check for:

<folder>/<same-folder>/

Pattern detection:

backend/backend
frontend/frontend
src/src
app/app
server/server
client/client
components/components
pages/pages

If duplication is detected:

STOP.

Recalculate path.

Rewrite to the nearest valid structure.

---

# RULE 5: PRE-CREATION SAFETY CHECK

Before every write operation, mentally validate:

1. Am I already inside this directory?
2. Does this folder already exist at root?
3. Am I repeating a path segment?
4. Will this create nested duplication?

Only proceed if all checks pass.

---

# RULE 6: FILE GENERATION SAFETY

When scaffolding:

Instead of blindly generating:

backend/
└── backend/
    └── routes/

Generate:

backend/
└── routes/

Maintain clean architecture.

---

# RULE 7: MIGRATION SAFETY

When converting technologies:

Example:

Python → Express TypeScript migration

If current structure:

backend/
├── app/
├── config/
├── routes/

Never generate:

backend/backend/src/

Instead:

backend/src/

OR preserve existing architecture.

Choose the cleanest structure.

---

# RULE 8: RESPONSE FORMAT

Before executing major file operations, summarize:

Detected project root:
<root>

Target location:
<normalized path>

Validation:
✅ No nested duplication detected

OR

⚠ Duplicate nesting detected and corrected

Corrected path:
<path>

Then proceed.

---

# GOLDEN RULE

If a path would create:

folder/folder/

Assume it is wrong.

Correct it automatically.

Never create duplicate nested directories.