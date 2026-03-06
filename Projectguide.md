# 🌐 NIRAIVA HEALTH — MULTI-HOSPITAL PLATFORM DEVELOPMENT PLAN (30 DAYS)

---

---

## 🔗 PROJECT LINKS (ACCESS CONTROLLED)

📄 **ENV Keys / Secrets (Restricted Access)**

Store all production keys securely.

https://docs.google.com/spreadsheets/d/1Z2OVvl8Pyn260Chs6jxEgaJO6PZpDFDaZDEwU2elG6A/edit?usp=sharing

💻 **GitHub Repository**

https://github.com/bhuvan-advantix/Helathcare.git

---

## 🚀 LIVE ENVIRONMENTS

### ✅ Production URL

helathcare-nrivaa.vercel.app

### ✅ Staging / Testing

helathcare-git-test-bhuvan-advantixs-projects.vercel.app

### ✅ Development

helathcare-git-dev-bhuvan-advantixs-projects.vercel.app

⚠️ Never test experimental features in production.

---

# 🌍 REFERENCE PLATFORMS (STUDY WORKFLOWS — DO NOT COPY UI)

* [https://www.practo.com](https://www.practo.com)
* [https://www.zocdoc.com](https://www.zocdoc.com)
* [https://www.open-emr.org](https://www.open-emr.org)
* [https://www.athenahealth.com](https://www.athenahealth.com)
* [https://www.eclinicalworks.com](https://www.eclinicalworks.com)
* [https://www.carecloud.com](https://www.carecloud.com)
* [https://www.drchrono.com](https://www.drchrono.com)
* [https://www.nextgen.com](https://www.nextgen.com)
* [https://www.healow.com](https://www.healow.com)
* [https://www.epic.com](https://www.epic.com)

Focus on:

✅ Patient flow

✅ Doctor workflow

✅ Speed

✅ Data structure

NOT visual cloning.

---

# 🎨 PLATFORM BRAND COLORS

| Purpose      | Color | Hex         |
| ------------ | ----- | ----------- |
| Primary Teal | 🟩    | `#A7DCDC` |
| Accent Teal  | 🟦    | `#6EC5C0` |
| Background   | ⚪    | `#F7F9FA` |
| Card         | ⚪    | `#FFFFFF` |
| Text Dark    | ⚫    | `#1E293B` |
| Borders      | ➖    | `#E5E7EB` |

### Font Recommendation:

👉 **Inter**

---

# 🛠 CORE TECH STACK (LOCKED — DO NOT CHANGE)

### Frontend + Backend

✅ Next.js (App Router + TypeScript)

### Database

✅ Neon PostgreSQL

### ORM

✅ Prisma

### Authentication

✅ NextAuth

Supports:

* Google Login
* Email + Password

### Hosting

✅ Vercel

### File Storage

✅ Cloudflare R2

### Validation

✅ Zod

### Forms

✅ React Hook Form

### UI Components

✅ shadcn/ui

⚠️ Changing stack mid-project is prohibited.

---

# 🔐 AUTHENTICATION STRATEGY

### Login Methods:

* Google Sign-In
* Email + Password

### Future Ready:

* OTP Login
* Enterprise SSO

### UX Rules:

* One-click login
* Secure sessions
* Auto logout on token expiry

---

# 🧠 SYSTEM ARCHITECTURE

## ✅ Multi-Tenant Design (CRITICAL)

Every database table MUST include:

<pre class="overflow-visible! px-0!" data-start="2582" data-end="2601"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>hospital_id</span><span>
</span></span></code></div></div></pre>

### Why?

Prevents cross-hospital data leaks.

⚠️ Failure here = catastrophic security breach.

---

# 👥 USER ROLES

* Patient
* Doctor
* Admin
* Lab (Admin Controlled)

Implement strict role-based access control.

---

# 📱 PLATFORM SUPPORT

✅ Desktop First

✅ Mobile Responsive

✅ Tablet Friendly

Hospitals primarily operate on desktops.

Mobile optimization is mandatory but secondary.

---

# 👤 DEV A — PATIENT PANEL (3 PAGES ONLY)

Keep patients UI extremely simple.

---

## ✅ 1. Health Dashboard / Timeline

⭐ **Signature Feature**

Displays lifelong medical history:

* Reports
* Diagnoses
* Medications
* Allergies
* Surgeries
* Visits
* Vitals

👉 Doctors should understand a patient within **10 seconds.**

---

## ✅ 2. Upload Reports

Patients can upload missing medical documents.

### Mandatory Approval Flow:

<pre class="overflow-visible! px-0!" data-start="3455" data-end="3529"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>Patient Upload → Pending → </span><span>Admin</span><span>/Doctor Approval → Official </span><span>Record</span><span>
</span></span></code></div></div></pre>

Track:

* approved_by
* timestamp
* version history

Never allow uncontrolled medical records.

---

## ✅ 3. Access Control

Patients decide who can view their data.

Example:

Allow Hospital A ✅

Block Hospital B ❌

Trust-driven design increases adoption.

---

# 👨‍⚕️ DEV B — DOCTOR PANEL (ONLY 2 SCREENS)

Doctors prioritize **speed over features.**

Avoid complex dashboards.

---

## ✅ 1. Patient Explorer

Search by:

* Health ID
* Phone
* Name

⚡ Must load instantly.

Speed is a product feature.

---

## ✅ 2. Consultation Workspace

Single-screen workflow where doctors can:

* View full timeline
* Write prescriptions
* Compare reports
* Add notes
* Order tests
* View AI insights

⚠️ Avoid tab-heavy UI.

Everything should feel fluid.

---

# 🛡 DEV C — ADMIN PANEL (CONTROL TOWER)

### Modules:

✅ Hospital onboarding

✅ User management

✅ Doctor verification

✅ Lab access

✅ Approval queue

✅ Audit logs

---

## Audit Logs MUST Track:

* Who viewed records
* Who edited
* Who approved

Medical compliance requires traceability.

---

# 🤖 AI REPORT SCANNING

AI assists doctors — NEVER replaces them.

### AI SHOULD:

✅ Highlight abnormalities

✅ Detect trends

✅ Compare historical reports

### AI MUST NOT:

❌ Diagnose

❌ Prescribe

Always display:

> **"AI-assisted insight — Doctor review required."**

---

# 📅 PROJECT TIMELINE (30 DAYS)

| Phase                   | Duration | Description                                                     |
| ----------------------- | -------- | --------------------------------------------------------------- |
| **Foundation**    | 7 Days   | Setup Next.js, Neon DB, Prisma, Auth, Multi-tenant architecture |
| **Core Modules**  | 10 Days  | Patient, Doctor, Admin panels + Approval workflow               |
| **AI + Security** | 6 Days   | Report scanning, audit logs, validation                         |
| **Testing**       | 4 Days   | Full workflow testing                                           |
| **Deployment**    | 3 Days   | Vercel deploy, domain setup, production QA                      |

👉 **Goal: Launch Functional MVP in 30 Days**

---

# 🌿 BRANCH & COMMIT RULES

* Create a new branch for every feature
* Use meaningful commit messages
* Push only required files
* Never commit secrets
* Review before merge

---

# 📁 FILE STRUCTURE RULES

✅ Clean architecture

✅ No unused files

✅ Consistent naming

✅ Modular components

Messy structure = slow development.

---

# 🔒 SECURITY PRINCIPLES

* Encrypt sensitive data
* Validate all inputs
* Use role-based permissions
* Prevent cross-tenant access
* Maintain audit trails

Treat healthcare data as highly sensitive.

---

# 💡 ENGINEERING RULES

## ✅ DO:

* Design database BEFORE UI
* Use strict TypeScript
* Optimize queries
* Build scalable schemas

## ❌ DO NOT:

* Change database randomly
* Mix hospital data
* Store reports locally
* Overbuild early

---

# 🚀 PRODUCT PHILOSOPHY

## **Speed > Perfection**

Launch fast.

Improve with real hospital feedback.

Do NOT wait for perfect.

---

# 🔮 FUTURE EXPANSION

* Video consultations
* Billing
* Insurance integrations
* Pharmacy connectivity
* Wearable device sync
* Predictive AI

Architect TODAY so these require minimal rewrites.

---

# ⚠️ FINAL NOTE

This platform must be engineered like a **serious funded health-tech product — not a side project.**

The architecture decisions made now will determine whether the system scales to:

👉 **5 hospitals**

or

👉 **500 hospitals**
