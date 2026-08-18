# Rasitu App Management Services — School ERP

Ek white-label, multi-tenant School ERP jisme har school apna naam/logo/colors ke sath
customize kar sakta hai. Web browser me chalta hai (PC/laptop/desktop) aur PWA hone ki
wajah se mobile pe "Add to Home Screen" karke app jaisa install bhi ho sakta hai —
offline bhi kaam karta hai aur connection wapas aate hi data automatically sync ho jata hai.

## Kya-kya bana hai (Modules)

- **Multi-tenant white-label**: Har school ek alag "tenant" hai apne naam/logo/colors ke
  sath. Rasitu (SUPER_ADMIN) naye school customers onboard karta hai `/schools` page se.
- **Sabhi department-wise logins**: School Admin, Accountant, Academic Staff (Teacher),
  Admin/Clerical, Reception, Security, IT, Store, Lab, Transport, Canteen, Librarian,
  Parent, Student — har role ka apna dashboard aur permissions hai.
- **Students**: Admission (SR No, Admission No, Roll No, DOB, Class/Section), family/
  guardian details, student + parent login auto-create.
- **Staff**: Employee code, department, designation, department ke hisaab se login role
  auto-assign.
- **Fees & Receipts**: Fee structure, invoices, payment collection, printable PDF receipt.
- **Attendance**: Class/section-wise student attendance (bulk marking), staff attendance
  (self check-in ya HR marking) — offline-first (neeche dekhein).
- **Exams / Marks / Marksheet**: Exam creation, subject-wise marks entry, auto-grade
  calculation, PDF marksheet generation jo parents ko diya ja sakta hai.
- **Online Homework**: Class/section/subject-wise homework assign, student submission,
  teacher grading.
- **Parent Communication**: Notices (audience-wise: all/class/section/staff/parents),
  direct messages.
- **Assets**: Computer sets (Monitor+CPU+Keyboard+Mouse breakdown), UPS, furniture, lab
  equipment, vehicles, aur bhi — sab track ho sakte hai. Store/Lab consumable inventory
  bhi.
- **Branding**: School Admin apne naam, logo, colors khud customize kar sakta hai.

## Offline-first (jaise Ritu Medical Store wala app)

Frontend ek **PWA** hai. Jab staff ka internet band ho (jaise bus me attendance lena),
form bhar sakte hai — data phone/laptop pe locally save ho jata hai. Jaise hi internet
wapas aata hai, `window.addEventListener('online', ...)` automatically saved data ko
server pe sync kar deta hai. School Management ko sync hone ke baad turant data dikh
jata hai. Yeh logic `frontend/src/api/client.ts` me `writeWithOfflineFallback` aur
`syncOfflineQueue` functions me hai. Abhi Attendance module isko use karta hai — aur
modules me bhi easily add ho sakta hai.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript, Drizzle ORM + PostgreSQL (Supabase in
  production, any Postgres locally), JWT auth, RBAC middleware, PDF generation
  (pdfkit) for receipts & marksheets. Deploys as-is to Render (see `render.yaml`).
- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4, React Router, PWA
  (vite-plugin-pwa) — installable app-like experience mobile aur desktop dono pe.

## Free Live Deployment (a real shareable link — Supabase + Render + Cloudflare Pages)

Sab free hai, koi credit card nahi chahiye. Teen accounts banane honge (sab free) — main
apni taraf se sab kuch ready kar chuka hu, bas aapko in steps ko follow karna hai.

### Step 1 — Database (Supabase, free, no card)
1. https://supabase.com pe free account banao.
2. "New Project" banao (koi bhi naam, region "South Asia (Mumbai)" chuno for speed).
3. Project ban jaane ke baad: **Project Settings → Database → Connection string → Transaction pooler** (port `6543`) copy karo — password apne project ke password se replace karo.
4. Yeh connection string safe rakho, agle step me chahiye hogi.

### Step 2 — Backend API (Render, free, no card)
1. Is poore project ko GitHub pe ek naya (public ya private) repo bana ke push karo — [repo.zip me README ke sath sab files hai].
2. https://render.com pe free account banao, GitHub se sign in karo.
3. **New → Blueprint**, apna repo select karo — is repo me already `render.yaml` hai jo backend ko auto-configure kar dega.
4. Deploy karte waqt jab `DATABASE_URL` maange, Step 1 wali Supabase connection string paste karo.
5. Deploy hone ke baad Render aapko ek URL dega jaisे `https://rasitu-backend.onrender.com` — yeh copy kar lo.

Note: Render ka free web service 15 min inactivity ke baad "so" jaata hai aur agli request pe ~30-60 second me wapas jaag jaata hai — pehli request thodi slow lag sakti hai, uske baad normal speed.

### Step 3 — Frontend (Cloudflare Pages, free, no card)
1. Apne computer pe (ya kisi bhi machine jaha Node ho):
   ```bash
   cd frontend
   echo "VITE_API_BASE=https://rasitu-backend.onrender.com" > .env.production   # Step 2 ka URL daalo
   npm install
   npm run build      # output frontend/dist me banega
   ```
2. https://dash.cloudflare.com pe free account banao (Workers & Pages section).
3. **Create → Pages → Upload assets** (drag-and-drop) — `frontend/dist` folder ki saari files upload karo.
4. Deploy hote hi ek live link milega jaisa `https://rasitu-erp.pages.dev` — yehi aapka shareable School ERP link hai, kisi bhi browser (mobile/desktop) se khul jayega.

Login same rahega jo demo credentials neeche diye hai — `greenwood-public-school` / `demo-school` dono tenants Render deploy ke waqt automatically seed ho jate hai.

## Local Setup

### Backend
Needs a Postgres database — either a free Supabase project (see deployment steps above,
just use that same connection string locally too) or a local Postgres (e.g. `apt install
postgresql` / Docker / Postgres.app).

```bash
cd backend
cp .env.example .env      # then edit .env and set DATABASE_URL to your Postgres connection string
npm install
npm run db:push            # creates tables from schema
npm run seed                # loads Greenwood Public School demo (1 class) + all dept logins
npm run seed:demo-school    # loads "Demo School" - Play Group to Class 12 (CBSE), 2 students/class
npm run dev                 # starts API on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # starts on http://localhost:5173, proxies /api to backend
```
Production build: `npm run build` (output in `frontend/dist`, deploy as static files
behind any web server/CDN — this same build is your "desktop web app" and, once
installed via "Add to Home Screen"/"Install App" in the browser, your mobile/desktop
app too).

## Demo School #2 — Full CBSE Structure (Play Group to Class 12)

Run `npm run seed:demo-school` for a second demo tenant, **"Demo School"**
(school code: `demo-school`), pre-loaded with all 16 CBSE classes (Play Group, Nursery,
LKG, UKG, Class 1–12), each with 2 test students, stage-appropriate subjects, and one
staff login per department. School Admin login: username `admin`, password
`Demo@Admin1`. All other staff/student/parent logins use password `Demo@123` —
usernames follow the pattern `DS-EMP-<DEPT>-01` for staff and `DS-<CLASSNAME>-1` /
`DS-<CLASSNAME>-2` for students (e.g. `DS-CLASS10-1`), printed in full by the seed
script's console output.

## Demo Login Credentials (Greenwood Public School)

(Seeded via `npm run seed` — school code: `greenwood-public-school`)

| Role | Username | Password |
|---|---|---|
| Rasitu Super Admin (tenant: `rasitu-platform`) | superadmin | Rasitu@Super1 |
| School Admin | admin | Rasitu@Admin1 |
| Academic Staff (Teacher) | EMP-ACD-01 | Rasitu@123 |
| Admin/Clerical | EMP-ADM-01 | Rasitu@123 |
| Reception | EMP-REC-01 | Rasitu@123 |
| Security | EMP-SEC-01 | Rasitu@123 |
| IT Staff | EMP-IT-01 | Rasitu@123 |
| Store Keeper | EMP-STR-01 | Rasitu@123 |
| Lab Assistant | EMP-LAB-01 | Rasitu@123 |
| Transport Staff | EMP-TRN-01 | Rasitu@123 |
| Canteen Staff | EMP-CAN-01 | Rasitu@123 |
| Librarian | EMP-LIB-01 | Rasitu@123 |
| Accountant | EMP-ACC-01 | Rasitu@123 |
| Student (Aarav Sharma) | ADM-2026-001 | Rasitu@123 |
| Parent (Aarav's parent) | p-9000000001 | Rasitu@123 |

All non-super-admin/demo passwords should be changed on first login in a real
deployment (`mustChangePassword` flag is already wired into the schema and `/api/auth/change-password`).

## Moving Beyond the Free Tier

1. **Database**: Already Postgres (Supabase). Supabase's free project pauses after 7
   days with zero requests — visiting the dashboard once un-pauses it, or upgrade
   ($25/mo) once real schools depend on it for uptime guarantees.
2. **Secrets**: `render.yaml` auto-generates a random `JWT_SECRET` on deploy — nothing
   to do, just don't reuse the same secret across environments.
3. **File uploads** (photos, homework attachments, logos): currently URL fields only —
   wire up S3/Cloudflare R2 and a real upload endpoint (multer is already a dependency).
4. **Native mobile apps**: The current app is a PWA (works great on mobile browsers,
   installable, offline-capable). If true native iOS/Android apps (App Store/Play Store
   listing, push notifications, etc.) are needed later, wrap this same API in
   React Native/Flutter — the backend does not need to change.
5. **Multi-tenant hosting**: One instance already serves every school, resolved by the
   `tenantCode` login field. If you want each school to have its own URL (e.g.
   `greenwood.rasitu.app`), add subdomain-based tenant resolution later.
6. **Render free tier sleeps after 15 min idle**: fine for a demo/pilot; for a school
   actually using it daily, upgrade to Render's paid "Starter" plan ($7/mo) so the API
   never sleeps.

### Note on Prisma vs Drizzle
The original plan was Prisma, but this sandbox environment blocks the network domain
Prisma uses to download its query-engine binary. Drizzle ORM was used instead — it's a
pure-JS/SQL library with no such binary dependency, and works identically well for this
use case, including against Postgres/Supabase as used here.

## API Overview

Base URL: `/api`. All endpoints except `/auth/login` require `Authorization: Bearer <token>`.

- `POST /auth/login` — `{ tenantCode, username, password }`
- `GET /auth/me`, `POST /auth/change-password`
- `POST/GET /tenants` (SUPER_ADMIN — onboard schools), `PATCH /tenants/:id/branding`
- `GET/POST /academic/classes|sections|subjects`
- `POST/GET/PATCH /students`, `GET /students/parent/my-children`
- `POST/GET/PATCH /staff`
- `POST/GET /fees/structure|invoices|payments`, `GET /fees/payments/:id/receipt.pdf`
- `POST/GET /attendance/students/bulk`, `POST/GET /attendance/staff/bulk`,
  `POST /attendance/staff/self-checkin`
- `POST/GET /exams`, `POST/GET /exams/:examId/marks/bulk`,
  `GET /exams/:examId/marksheet/:studentId.pdf`
- `POST/GET /homework`, `POST /homework/:id/submit`, `PATCH /homework/submissions/:id/grade`
- `POST/GET /notices`, `POST /notices/messages`
- `POST/GET/PATCH /assets`, `GET/POST /assets/inventory/items`

## Project Structure

```
rasitu-erp/
├── backend/
│   ├── src/
│   │   ├── db/          # Drizzle schema + connection
│   │   ├── routes/       # one file per module
│   │   ├── middleware/   # auth + RBAC
│   │   ├── utils/        # password hashing, JWT
│   │   ├── server.ts
│   │   ├── seed.ts              # Greenwood Public School demo data
│   │   └── seedDemoSchool.ts    # Demo School (Play Group - Class 12) demo data
│   └── render.yaml (repo root)  # Render Blueprint for one-click backend deploy
└── frontend/
    ├── src/
    │   ├── api/          # axios client + offline queue
    │   ├── context/      # auth context
    │   ├── components/   # Layout (role-based nav)
    │   └── pages/         # one page per module
    └── vite.config.ts     # PWA + Tailwind config
```

## What's a working prototype vs. what still needs building out for full production

Working end-to-end right now (backend tested via curl + full browser e2e test with
Playwright): login/RBAC for every role, student admission with auto-login creation,
staff onboarding, fee invoicing + payment + PDF receipt, class attendance, exam +
marks + PDF marksheet, homework assign, notices, asset registration with computer-set
components, white-label branding update, and school onboarding by Rasitu's super admin.

Still worth building out before a real school goes live: file/photo uploads to cloud
storage, SMS/WhatsApp/email notification delivery for notices, transport route maps,
canteen POS, library issue/return workflow, payroll, and a proper admin UI for managing
fee structures across many classes at once. All the database tables for these already
exist in the schema so the API layer can be extended without redesigning anything.
