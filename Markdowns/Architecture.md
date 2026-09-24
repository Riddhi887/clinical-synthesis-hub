# Clinical Synthesis Hub Architecture

## Architectural Style

The project is a modular pipeline with a layered single-page client and a stateless processing API. It is not currently a microservice system: the frontend, FastAPI backend, and optional Ollama service are the deployable boundaries. Browser `localStorage` acts as the prototype persistence layer. The design separates file staging, document processing, patient-level synthesis, and report rendering so each layer can later be replaced without changing the user workflow.

```text
[Browser SPA]
  [Auth and navigation]
       -> [Intake layer]
       -> [Processing client]
       -> [Synthesis store]
       -> [Report renderer and export]
             |
             v
[FastAPI processing service]
       -> [File detection]
       -> [PDF/image extraction]
       -> [OCR confidence selection]
       -> [Ollama cleanup and translation]
```

## Deployment Components

| Component | Runtime | Boundary | Primary responsibility |
| --- | --- | --- | --- |
| Frontend | Node.js 22, React 19, TanStack Start, Vite | Browser and frontend container | UI workflow, session state, synthesis, report rendering, downloads |
| Nginx | Nginx in `Dockerfile.frontend` image | Container ingress | Serves/proxies frontend traffic and rewrites `/api/*` to the backend |
| Backend | Python 3.12, FastAPI, Uvicorn | HTTP service on port 8000 | File validation, rasterization, OCR, language detection, Ollama calls, JSON response |
| Ollama | Local model runtime | HTTP service on port 11434 | OCR cleanup and translation prompts issued by the backend |
| Browser persistence | `localStorage` | Client storage | Session, documents, logs, cases, folders, synthesis, report state |

## High-Level Component Decomposition

### 1. Intake Layer

**Modules:** `IntakeView.tsx`, `ClinicalStoreProvider.addFiles()`, `ClinicalDoc`.

**Responsibilities:**

1. Accept multiple files through file input or drag-and-drop.
2. Restrict the UI selection to `.pdf`, `.png`, `.jpg`, `.jpeg`, `.tiff`, and `.webp`.
3. Calculate client-side size metadata.
4. Allocate a UUID per staged record.
5. Retain the browser `File` object for upload processing.
6. Reset OCR completion and report readiness whenever intake changes.

**Boundary contract:** intake produces `ClinicalDoc` objects with file metadata and empty or fixture text. It does not run OCR or infer patient facts.

### 2. Processing Engine

**Modules:** `OcrView.tsx`, `backend/app.py`, `rapidocr_onnxruntime`, `pytesseract`, `fitz`, `pypdf`, `langdetect`, `httpx`.

**Responsibilities:**

1. Process records sequentially in the browser.
2. Submit uploaded files as multipart data to `/process-document`.
3. Detect PDF versus image content using file signatures.
4. Extract embedded PDF text when reliable.
5. Rasterize PDF pages at the configured target scale and run OCR candidates.
6. Normalize, score, and select OCR text.
7. Use Ollama only when cleanup or translation is needed.
8. Return original-language OCR, English translation, field extraction, class, confidence, and page count.

**Boundary contract:** the backend returns one JSON object per file or an HTTP error. The browser marks failed uploads as unanalyzed and does not substitute synthetic fallback text.

### 3. Context Synthesis Engine

**Modules:** `ClinicalStoreProvider.buildSynthesis()`, helper functions in `src/lib/clinical/store.tsx`, `SynthesisView.tsx`.

**Responsibilities:**

1. Select records with `processed` set and non-empty translated text.
2. Remove known translation boilerplate.
3. Combine translated records into one patient-level context string.
4. Extract patient name, age, sex, clinicians, diagnoses, medications, dates, facilities, and event summaries.
5. Detect record gaps from document coverage and content.
6. Create a stable in-session `Synthesis` object and a generated case ID.
7. Register a `CaseAsset` for workspace navigation.

**Boundary contract:** synthesis consumes only translated records already accepted by the OCR stage. It does not query Ollama in the current implementation.

### 4. Rendering Engine

**Modules:** `ReportView.tsx`, `markdownReport()`, `wordDocument()`, `pdfDocument()`.

**Responsibilities:**

1. Resolve available hospital/facility header values from source text.
2. Build the fixed metadata block and risk block.
3. Render all 13 numbered sections.
4. Preserve table headers and column order for the canonical report structure.
5. Rewrite source snippets into concise, context-setting prose without hardcoded patient facts.
6. Parse the canonical structure into real DOCX and PDF browser artifacts.

**Boundary contract:** rendering consumes `Synthesis` plus the source `ClinicalDoc[]`. It does not invent unavailable values; it emits `Not identified in submitted records` or `Not specified` where appropriate.

## Structural Mapping for Diagrams

```text
[Analyst] --(selects files)--> [IntakeView]
[IntakeView] --(ClinicalDoc metadata)--> [ClinicalStoreProvider]
[ClinicalStoreProvider] --(persist session)--> [Browser localStorage]
[OcrView] --(multipart file)--> [Nginx /api proxy]
[Nginx /api proxy] --(HTTP POST /process-document)--> [FastAPI backend]
[FastAPI backend] --(file signature)--> [PDF/Image branch]
[PDF branch] --(embedded text or rendered page)--> [OCR selector]
[Image branch] --(image pixels)--> [OCR selector]
[OCR selector] --(cleaned source text)--> [Language detector]
[Language detector] --(source language and text)--> [Ollama /api/generate]
[Ollama /api/generate] --(cleaned or translated text)--> [FastAPI response builder]
[FastAPI response builder] --(document JSON)--> [OcrView]
[OcrView] --(updated ClinicalDoc)--> [ClinicalStoreProvider]
[ClinicalStoreProvider] --(processed translated records)--> [buildSynthesis()]
[buildSynthesis()] --(Synthesis and CaseAsset)--> [SynthesisView]
[SynthesisView] --(Synthesis)--> [ReportView]
[ReportView] --(canonical report structure)--> [DOCX/PDF builders]
[DOCX/PDF builders] --(browser Blob)--> [Browser download]
```

## State and Ownership

| State | Owner | Persistence | Lifecycle |
| --- | --- | --- | --- |
| Login email and active view | `ClinicalStoreProvider` | `localStorage` | Session/navigation |
| Raw uploaded `File` | Browser memory | Not serializable in storage | Until page/session reload |
| OCR and translated strings | `ClinicalDoc` | `localStorage` when serializable | Until intake clear or logout |
| Synthesis | `ClinicalStoreProvider` | `localStorage` | Rebuilt when requested |
| Report readiness | Store flag | `localStorage` | Set after report generation UI completes |
| Backend temporary file | FastAPI request handler | Temporary filesystem | Deleted in `finally` block |

## Extension Boundary: LLM Report Generation

The requested architecture may include an LLM report writer, but the current system does not call Ollama from `ReportView` or `buildSynthesis()`. To add that capability without disturbing the UI, introduce a backend endpoint such as `POST /generate-report` that accepts a validated `Synthesis` and source references, then returns structured Markdown. The renderer should still validate section presence and table schemas before allowing export.

## Docker Runtime Flow

1. `docker-compose.yml` builds the backend from `backend/Dockerfile` and the frontend from `Dockerfile.frontend`.
2. The backend container installs Python dependencies, Tesseract binaries, regional language packs, and the FastAPI application.
3. The frontend build injects `VITE_API_BASE_URL=/api`, then packages the compiled output with Nginx and the TanStack server.
4. Port `8080` on the host maps to port `80` in the frontend container.
5. Nginx sends `/api/` traffic to the Compose service named `backend`; all other traffic goes to the internal frontend server.
6. The backend reaches Ollama on the host using `host.docker.internal:11434`.
7. Uploaded files are temporary request artifacts and are deleted by the backend after each request; Compose defines no persistent clinical-data volume.
