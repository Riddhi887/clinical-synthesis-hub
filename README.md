# Clinical Synthesis Hub

Build a full-stack single-page web application (SPA) for a "Clinical History & Medical Records Synthesis Platform". 
The app must be anonymous/white-label with NO vendor or corporate logos.

---

### 🎨 DESIGN, THEME & UI SPECIFICATIONS:
1. Color Scheme:
   - Primary Background: Wheat White / Warm Off-White (`#FDFBF7` / `#F8F5EE`).
   - Primary Accent & Headers: Deep Navy Blue (`#0A192F` / `#1E3A8A`).
   - Secondary Cards/Borders: Slate Blue / Light Navy (`#334155` / `#E2E8F0`).
   - Text & Highlights: Crisp Navy (`#0A192F`), Muted Slate (`#64748B`), and Status Badges (Emerald Green `#10B981`, Amber Gold `#F59E0B`).
2. Layout & Shell Structure:
   - Header Bar:
     - Title: "Clinical Health Synthesis System"
     - Status Indicator: Live System Status (Auto-sync active)
     - Top-Right Profile Menu: Displays Avatar Icon, User Role ("Clinical Data Analyst"), and interactive "Logout" trigger (returns user to Mock Auth screen).
   - Navigation Sidebar:
     - Section A (Main Views): 
       1. 📊 Dashboard
       2. 💼 Workspace & Cases
     - Section B (4-Step Pipeline Workflow):
       1. 📁 Step 1: Document Intake (Bulk Upload)
       2. 🔍 Step 2: OCR & Neural Translation Engine
       3. 🔗 Step 3: Clinical Synthesis & Timeline Builder
       4. 📄 Step 4: Medical Evaluation Report
3. Feedback & Micro-Interactions:
   - Include Toast Notifications (via Sonner / Radix Toast) for actions like file upload, classification complete, report export, and logout.
   - Use Skeleton Loaders and Spinner Overlay States whenever processing OCR, rendering steps, or authenticating.
   - Disable buttons during invalid states (e.g., disable "Run OCR" if no files uploaded).

---

### ⚙️ DETAILED FUNCTIONAL & PIPELINE REQUIREMENTS:

#### Module 0: Authentication & Session Management
- Mock Authentication view with pre-filled demo login ("dr.smith@clinical.ai").
- Session Persistence: Logged-in state persists across page changes and navigation. Navigating between Sidebar sections preserves uploaded files, terminal logs, and generated report states.

#### Module 1: Auto-Syncing Clinical Dashboard
- Metrics Cards (KPIs):
  - Total Reports Generated
  - Active Patient Workspaces
  - Total Intake Pages Processed
  - Extraction & Translation Pipeline Accuracy (displays overall metric e.g., 88.6%)
- Interactive Visualizations (via Recharts or Chart.js):
  - Line Chart: Weekly vs. Monthly Intake & Extraction Volume.
  - Bar Chart: Document Type Distribution (Prescriptions, Discharge Summaries, Lab Results, Imaging).
- Live Auto-Sync:
  - Dashboard updates KPI metrics and sync timestamp every 5 seconds (simulated background polling with visual "Syncing..." pulse).

#### Module 2: Bulk Document Intake & Open-Source Auto-Classification
- Multi-file drag-and-drop uploader supporting bilingual/regional medical PDFs, scans, and doctor notes.
- Open-Source Automated Classifier (Simulating Hugging Face Clinical-NER & LayoutLM):
  - Auto-analyzes incoming files and classifies them without user selection: Discharge Summary, Outpatient Prescription, Lab Test Panel, Surgical Note, or Diagnostic Imaging Report.
- Button: "Load Regional Sample Patient Case" (instantly populates 4-5 realistic patient documents in regional scripts like Tamil/Telugu/Spanish alongside English).

#### Module 3: OCR Processing, Neural Translation & Terminal Telemetry
- Realistic Processing Simulation (~15-30 seconds accelerated execution with live step-by-step telemetry).
- Live Telemetry Console (Bottom / Side Drawer):
  - Streams real-time operational logs:
    - `[pytesseract / easyocr] Rasterizing PDF pages (1240x1753px)...`
    - `[clinical_ner_model] Scanning medical entity bounding boxes...`
    - `[auto_classify] Identified document as 'Regional Outpatient Prescription' - confidence 91.4%`
    - `[huggingface_marianmt] Translating regional medical notes to English via MarianMT/FB-BART API...`
    - `[confidence_evaluator] Raw OCR Confidence: 87.2% | Neural Translation Quality: 89.8%`
- Dual Preview Panel:
  - Left Panel: Original Regional Document view.
  - Right Panel: Translated formal English clinical text.
  - Extraction Confidence Badge: Prominently displays explicit OCR confidence (strictly 80–90%, e.g., 86.4%).

#### Module 4: Clinical Synthesis, Entity Resolution & Dual-Asset Workspace
- Automated Clinical Synthesis Engine:
  - Entity Extraction: Auto-extracts Patient Name, Age, ICD Diagnosis Codes, Prescribed Medications (Dosage/Frequency), Vital Trends, and Treating Physicians.
  - Patient Health Timeline: Renders a vertical chronological timeline mapping the patient's medical journey across admissions and lab results.
  - Gap & Risk Analysis: Highlights missing medical data or unverified history (e.g., "⚠️ Gap Detected: Missing Post-Operative Blood Panel between Admission 2023 and Follow-Up 2024").
- Dual-Asset Workspace Storage (Requirement 9 & 11):
  - Once synthesized, the system automatically registers a unique database Asset Slot ID (e.g., `CASE-PAT-8839201-UUID`).
  - The Asset Slot renders two distinct tabs/sub-slots:
    - Sub-Asset Slot A: Raw Input Documents (Original scanned PDFs & image files).
    - Sub-Asset Slot B: Generated Clinical Synthesis & Executive Medical Report.

#### Module 5: Executive Medical Evaluation Report Generation
- Layout & Continuous Flow:
  - Cover Header / Page 1: Corporate-style Medical Header, Unique Case UUID, Patient Identifier, Date, Executive Health Summary, and Overall Clinical Risk Rating Badge (STABLE / ACTION REQUIRED / CRITICAL RISK).
  - Subsequent Sections (Continuous prose generated via simulated Free LLM API like Hugging Face Mixtral/Llama):
    1. Comprehensive Clinical Summary & History of Present Illness (HPI)
    2. Document-by-Document Extraction Breakdown
    3. Chronological Patient Care Timeline & Treatment Progression
    4. Diagnostic & Medication Reconciliation (Gaps & Contraindications)
    5. Physician Recommendations & Legal Evaluation Summary
- Export Actions: "Download Formal Report (.docx / .pdf)" button.

---

### 🛡️ STABILITY, ARCHITECTURE & TECHNICAL TRANSPARENCY:
1. Pure Client-Side Fallback: Use deterministic data fallback mechanisms so that API timeouts or missing token keys NEVER produce runtime exceptions, empty screens, or broken UI elements.
2. Technology & Architecture Explanation Panel:
   - In the sidebar or footer, add an expandable "Architecture & Technology Stack" drawer that explicitly outlines the open-source libraries, models, and free APIs integrated:
     - **OCR & Rasterization:** `Tesseract.js` / `PyTesseract` / `EasyOCR`
     - **Auto-Classification & Medical Entity Extraction:** Hugging Face Inference Providers (`Clinical-AI-Apollo/Medical-NER`, `samant/medical-ner`)
     - **Neural Language Translation:** `Hugging Face MarianMT` (`HuggingFaceH4` translation pipeline)
     - **Sentence Formatting & Report Synthesis:** `Hugging Face Inference Providers API` (`meta-llama/Llama-3.3-70B-Instruct` / `Mixtral-8x7B`)
     - **Database & Persistence:** Browser LocalStorage / IndexedDB session state provider simulating PostgreSQL / Supabase schema with unique UUID primary key constraints.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/35366308-57cc-4b14-88fe-3835c3be9155).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
