# Clinical Synthesis Hub Design

## Design Principles

### Extensibility

- Keep each document in a `ClinicalDoc` envelope so new OCR engines, classifiers, or file types can be added without changing synthesis input shape.
- Keep `Synthesis` independent from UI components so alternate renderers can consume the same case context.
- Isolate backend model calls behind `call_ollama()` so a hosted model gateway or another local runtime can replace Ollama.
- Use explicit document classes and timeline kinds rather than free-form UI-only labels.

### Determinism and factual fidelity

- The backend prompts Ollama to preserve names, dates, units, table rows, and diagnoses, and to use `[unreadable]` instead of guessing.
- Confidence and failure states are carried as data rather than hidden in UI text.
- The sample case is deterministic and does not require network access.
- The current synthesis engine is deterministic regex and rule-based logic; it does not rely on probabilistic report generation.

### Modular decoupling

- Intake knows how to stage files but not how to read them.
- The browser processing client knows the API contract but not OCR internals.
- The backend knows how to process one file but does not own patient-level session state.
- Synthesis knows translated records but not browser layout.
- Rendering knows `Synthesis` and source records but not OCR implementation details.

### Failure transparency

- Unreliable OCR cleanup and translation fail with explicit HTTP errors.
- The frontend continues processing remaining records while marking failed records as unanalyzed.
- Missing extracted values are represented by explicit text such as `Not specified` rather than fabricated clinical facts.

## Module Interfaces and Contracts

### Ingestion Service: `IngestDoc()`

The repository implements this contract through `IntakeView.ingest()` and `ClinicalStoreProvider.addFiles()` rather than a standalone service class.

```ts
type IntakeFile = {
  name: string;
  sizeKb: number;
  sourceFile?: File;
  language?: string;
  classification?: ClinicalDoc["classification"];
  originalText?: string;
  translatedText?: string;
};

function ingest(files: FileList | null): void;
function addFiles(files: IntakeFile[]): number;
```

**Preconditions:** `files` may be null or empty; unsupported selections should be rejected by the file input.

**Postconditions:** one `ClinicalDoc` is created per selected file, each receives a generated UUID, `processing: true`, `processed: false`, and the session flags `ocrComplete: false` and `reportReady: false`.

**Errors:** no exception is required for an empty selection. File-content failures occur later in the backend processing path.

### OCR and Translation Pipeline: `ProcessOCR()` and `Translate()`

The repository implements the client-side call in `OcrView.run()` and the server-side pipeline in `backend/app.py`.

```ts
async function processDocument(file: File): Promise<ProcessDocumentResponse>;

interface ProcessDocumentResponse {
  filename: string;
  file_type: string;
  language_detected: string;
  classification: DocClass;
  classifier_confidence: number;
  pages: number;
  ocr_confidence: number;
  translation_quality: number;
  ocr_text: string;
  translated_text: string;
  patient_name?: string;
  fields: Record<string, string>;
  status: "processed";
}
```

```py
def process_document(file: UploadFile) -> dict[str, Any]: ...
def clean_ocr_text(text: str) -> str: ...
def translate_text(text: str, source_lang: str) -> str: ...
def call_ollama(prompt: str, model: str = OLLAMA_MODEL) -> str: ...
```

**Contract:** processing returns a complete object only after OCR, cleanup when required, translation, field extraction, classification, and confidence estimation succeed. The endpoint returns HTTP 400, 422, 500, or 503 rather than returning partial translated content.

### Synthesis Engine: `BuildPrompt()` and `QueryOllama()`

The requested names are extension points; the current implementation uses deterministic client functions and does not query Ollama for synthesis.

```ts
function buildSynthesis(): Synthesis;
function extractSynthesisItems(text: string, pattern: RegExp): string[];
function extractMedicationItems(text: string): Synthesis["medications"];
function detectGaps(docs: ClinicalDoc[], combinedText: string): string[];
```

Current flow:

1. Filter for processed documents with translated text.
2. Clean translation boilerplate.
3. Extract the first available patient identity and demographics.
4. Extract physician, diagnosis, and medication candidates.
5. Convert each document into a dated timeline event.
6. Detect missing or inconsistent evidence.
7. Assign `ACTION REQUIRED` when gaps exist, otherwise `STABLE`.
8. Create a case ID and register a `CaseAsset`.

A future LLM-backed implementation should expose a separate contract:

```ts
function buildPrompt(context: ValidatedClinicalContext): string;
async function queryOllama(prompt: string, options: OllamaOptions): Promise<string>;
```

It must validate structured output against `Synthesis` before replacing the deterministic result.

### Report Formatter: `RenderReport()`

```ts
function markdownReport(
  hospital: { name: string; address: string },
  synthesis: Synthesis,
  docs: ClinicalDoc[],
): string;

async function wordDocument(markdown: string): Promise<Blob>;
function pdfDocument(text: string): string;
```

**Preconditions:** a non-null `Synthesis` and source document array.

**Postconditions:** Markdown includes all 13 numbered sections; tables have escaped cells; absent data is explicitly labeled.

**Output formats:**

- Canonical report: Markdown-shaped internal content with deterministic headings and tables.
- Word: real Office Open XML `.docx` bytes generated with the `docx` package.
- PDF: minimal PDF 1.4 text stream generated in the browser from the same canonical report content.

## Template Matching Logic

The Markdown renderer follows the reference template in this order:

1. Executive title and subtitle.
2. Four-column metadata table with case reference, issue date, patient name, age/sex, MRN, unavailable spouse field, record count, and facility.
3. Overall clinical risk heading and value.
4. Table of contents with entries 1 through 13.
5. Numbered sections with stable headings.
6. Fixed table column sets per section.
7. Scope, methodology, limitations, and intended-use closing text.

```text
[ClinicalDoc[] + Synthesis]
  -> [Metadata resolver]
  -> [Source narrative rewriter]
  -> [Section 1 summary]
  -> [Section 2 source index]
  -> [Sections 3-8 clinical tables]
  -> [Section 9 chronology]
  -> [Section 10 gaps]
  -> [Section 11 actions]
  -> [Section 12 coded summary]
  -> [Section 13 limitations]
  -> [Canonical report string]
  -> [DOCX or PDF artifact]
```

Template safeguards:

- `markdownCell()` escapes `|` and removes line breaks from cells.
- Missing source classes produce a row stating that the record type was not included.
- Unknown hospital, address, husband/spouse, and other fields are never synthesized from external knowledge.
- Source-specific prose is generated from the translated record summary, not from fixed sample values.

## Configuration and Environment Schema

| Setting | Location | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Frontend build environment | `/api` | Browser base path for the processing API |
| `OLLAMA_HOST` | Backend/Compose environment | `http://localhost:11434` | Ollama HTTP base URL |
| `OLLAMA_MODEL` | Backend/Compose environment | `llama3.1:8b` | Model sent to `/api/generate` |
| `chss.session.v9` | Browser storage key | Fixed key | Persisted frontend session state |
| `num_ctx` | Not currently implemented | None | Future Ollama context-size option |
| `temperature` | Not currently implemented | None | Future deterministic-generation option |
| `src/sample_data/` | Requested path | Not present | Current fixtures live in `src/lib/clinical/data.ts` and `src/sample_doc/` |
| `docker-compose.yml` | Compose deployment | `docker compose up --build` | Builds and connects frontend, Nginx, backend, and host Ollama |
| `Dockerfile.frontend` | Frontend image | Node 22 + Nginx | Builds the UI and serves/proxies it |
| `backend/Dockerfile` | Backend image | Python 3.12-slim | Installs OCR binaries and runs FastAPI |

## Recommended Future Contracts

1. Add Pydantic request/response models to replace untyped JSON dictionaries.
2. Add an explicit `ReportContext` schema between synthesis and rendering.
3. Add model options (`temperature: 0`, bounded `num_ctx`) to every LLM request.
4. Add a report validation step that checks all headings, table headers, and required metadata rows.
5. Move report generation to a backend endpoint only after authentication, audit, and PHI controls exist.
