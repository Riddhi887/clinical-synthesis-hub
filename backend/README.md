# Clinical OCR + Translation Backend

This backend provides free and open-source OCR, language detection, and local model-based translation for uploaded clinical documents.

## Features
- Detect uploaded file type.
- OCR PDFs and images using RapidOCR.
- Detect language with `langdetect`.
- Use free local open-source models via Ollama for translation and clinical extraction.
- CORS-enabled FastAPI API for frontend integration.

## Local model requirement

Install Ollama and pull a free model, for example:

```bash
ollama pull llama3.1:8b
```

Then start the local Ollama service with the default port `11434`.

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoint

```http
POST /process-document
```

Multipart form field: `file`

Returns a structured JSON payload with OCR text, translated text, language, and document classification.

## Notes
- This is intended for prototype and research workflows.
- For production clinical use, manual clinical review is still required.
- OCR quality depends on scan clarity and PDF rendering quality.
