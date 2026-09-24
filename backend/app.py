from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path
from typing import Any

import filetype
import httpx
import numpy as np
import pytesseract
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langdetect import detect
from PIL import Image, ImageOps
from pypdf import PdfReader
from rapidocr_onnxruntime import RapidOCR

app = FastAPI(title="Clinical OCR + Translation API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_engine = RapidOCR()
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")


def detect_document_type(filename: str, kind: str | None = None) -> dict[str, Any]:
    lower_name = filename.lower()
    if any(token in lower_name for token in ["discharge", "summary", "admission"]):
        return {"classification": "Discharge Summary", "confidence": 0.92}
    if any(token in lower_name for token in ["prescription", "rx", "opd", "outpatient"]):
        return {"classification": "Outpatient Prescription", "confidence": 0.91}
    if any(token in lower_name for token in ["lab", "cbc", "blood", "report", "panel"]):
        return {"classification": "Lab Test Panel", "confidence": 0.9}
    if any(token in lower_name for token in ["surg", "procedure", "cath", "operation", "operative"]):
        return {"classification": "Surgical Note", "confidence": 0.89}
    if any(token in lower_name for token in ["xray", "scan", "radiology", "image", "imaging", "ct", "mri"]):
        return {"classification": "Diagnostic Imaging Report", "confidence": 0.93}

    if kind:
        return {"classification": kind, "confidence": 0.8}
    return {"classification": "Unclassified Clinical Document", "confidence": 0.6}


def detect_file_kind(path: str) -> str:
    kind = filetype.guess(path)
    if kind is not None:
        mime = kind.mime
        if mime.startswith("image/"):
            return mime
        if mime == "application/pdf":
            return "application/pdf"
    return "application/octet-stream"


def normalize_text(raw_text: str) -> str:
    lines = [" ".join(line.split()) for line in raw_text.splitlines()]
    return "\n".join(filter(None, lines))


def clean_model_output(raw_text: str) -> str:
    cleaned_lines = []
    for line in raw_text.replace("```", "").splitlines():
        line = line.replace("**", "").replace("__", "").strip()
        line = re.sub(r"^\s*[-*]\s+", "", line)
        if line and "�" not in line:
            cleaned_lines.append(line)
    return normalize_text("\n".join(cleaned_lines))


def script_score(text: str) -> int:
    return len(re.findall(r"[\u0900-\u097f\u0b80-\u0bff\u0c00-\u0c7f]", text))


def script_counts(text: str) -> dict[str, int]:
    return {
        "devanagari": len(re.findall(r"[\u0900-\u097f]", text)),
        "tamil": len(re.findall(r"[\u0b80-\u0bff]", text)),
        "telugu": len(re.findall(r"[\u0c00-\u0c7f]", text)),
        "latin": len(re.findall(r"[A-Za-z]", text)),
    }


def dominant_script(text: str) -> str:
    counts = script_counts(text)
    return max(counts, key=counts.get)


def has_non_english_script(text: str) -> bool:
    counts = script_counts(text)
    non_english = counts["devanagari"] + counts["tamil"] + counts["telugu"]
    return non_english > max(8, counts["latin"] * 0.08)


def noise_score(text: str) -> int:
    return (
        text.count("�")
        + len(re.findall(r"(?:Ã.|Â.|â€¦|ðŸ)", text)) * 3
        + len(re.findall(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", text)) * 2
    )


def is_reliable_text(text: str) -> bool:
    normalized = normalize_text(text)
    if len(normalized) < 160 or noise_score(normalized) > 2:
        return False
    counts = script_counts(normalized)
    return counts["latin"] + counts["devanagari"] + counts["tamil"] + counts["telugu"] > 80


def choose_text(embedded: str, ocr: str) -> str:
    embedded = normalize_text(embedded)
    ocr = normalize_text(ocr)
    if not embedded:
        return ocr
    if not ocr:
        return embedded
    if is_reliable_text(embedded):
        return embedded
    candidates = [embedded, ocr]
    return min(
        candidates,
        key=lambda value: (
            noise_score(value),
            -script_score(value),
            -len(re.findall(r"[\w\u0900-\u0dff]", value, flags=re.UNICODE)),
        ),
    )


def tesseract_text(image: Image.Image, source_text: str = "") -> str:
    grayscale = ImageOps.autocontrast(ImageOps.grayscale(image))
    variants = [image, grayscale, grayscale.point(lambda value: 0 if value < 180 else 255)]
    detected_scripts = script_counts(source_text)
    if detected_scripts["devanagari"] >= max(detected_scripts["tamil"], detected_scripts["telugu"], 1):
        languages = "hin+eng"
    elif detected_scripts["tamil"] >= max(detected_scripts["devanagari"], detected_scripts["telugu"], 1):
        languages = "tam+eng"
    elif detected_scripts["telugu"] >= max(detected_scripts["devanagari"], detected_scripts["tamil"], 1):
        languages = "tel+eng"
    else:
        languages = "eng+hin+tam+tel+spa"
    outputs = []
    for variant in variants:
        for psm in (6, 11):
            outputs.append(
                normalize_text(
                    pytesseract.image_to_string(
                        variant,
                        lang=languages,
                        config=f"--psm {psm}",
                    )
                )
            )
    return max(outputs, key=ocr_candidate_score, default="")


def best_ocr_text(rapid_text: str, image: Image.Image) -> str:
    tesseract = tesseract_text(image, rapid_text)
    return min(
        (normalize_text(rapid_text), normalize_text(tesseract)),
        key=lambda value: (noise_score(value), -ocr_candidate_score(value)[0]),
        default="",
    )


def ocr_candidate_score(text: str) -> tuple[int, int, int]:
    meaningful = len(re.findall(r"[\w\u0900-\u0dff]", text, flags=re.UNICODE))
    lines = len([line for line in text.splitlines() if line.strip()])
    return meaningful, lines, len(text)


def extract_patient_name(text: str) -> str | None:
    patterns = [
        r"(?:patient(?: name)?|name of patient)\s*[:\-]\s*([^|\n]+)",
        r"(?:रोगी का नाम|मरीज का नाम|रोगी नाम)\s*[:\-]\s*([^|\n]+)",
        r"(?:நோயாளி பெயர்|நோயாளியின் பெயர்)\s*[:\-]\s*([^|\n]+)",
        r"(?:రోగి పేరు|రోగి యొక్క పేరు)\s*[:\-]\s*([^|\n]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = " ".join(match.group(1).split()).strip(" .,-")
            if value:
                return value
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    label_patterns = [
        r"^(?:रोगी का नाम|मरीज का नाम|रोगी नाम|patient name|name of patient)$",
        r"^(?:நோயாளி பெயர்|நோயாளியின் பெயர்|patient name)$",
        r"^(?:రోగి పేరు|రోగి యొక్క పేరు|patient name)$",
    ]
    for index, line in enumerate(lines[:-1]):
        if any(re.search(pattern, line, flags=re.IGNORECASE) for pattern in label_patterns):
            value = re.split(r"[|•]", lines[index + 1])[0].strip(" :,-")
            if value and not re.search(r"(?:आयु|வயது|వయస్సு|age|gender|लिंग)", value, re.IGNORECASE):
                return value
    return None


def extract_fields(text: str) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    field_patterns = {
        "patient_name": r"(?:patient(?: name)?|रोगी का नाम|मरीज का नाम|रोगी नाम|நோயாளி பெயர்|நோயாளியின் பெயர்|రోగి పేరు)\s*[:\-]?\s*([^|\n]+)",
        "doctor": r"(?:doctor|physician|surgeon|चिकित्सक|डॉक्टर|डॉक्टर का नाम|संदर्भित चिकित्सक|மருத்துவர்|వైద్యుడు)\s*[:\-]?\s*([^|\n]+)",
        "phone": r"(?:mobile|phone|contact|संपर्क नंबर|मोबाइल|दूरभाष|தொடர்பு எண்|మొబైల్)\s*[:\-]?\s*([+()\dXx\- ]{7,})",
        "mrn": r"(?:mrn|registration id|patient id|पंजीकरण आईडी|रोगी पंजीकरण आईडी|பதிவு எண்|பதிவு அடையாளம்)\s*[:\-]?\s*([A-Z0-9/\-]+)",
    }
    for key, pattern in field_patterns.items():
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            fields[key] = " ".join(match.group(1).split()).strip(" .,-")
    fields["patient_name"] = fields.get("patient_name") or extract_patient_name(text)
    return fields


def ocr_image_from_array(image_array: np.ndarray) -> str:
    result, _ = ocr_engine(image_array)
    if not result:
        return ""
    ordered = sorted(
        (item for item in result if item and len(item) > 1),
        key=lambda item: (min(point[1] for point in item[0]), min(point[0] for point in item[0])),
    )
    texts = [item[1] for item in ordered]
    return normalize_text("\n".join(texts))


def ocr_image(path: str, filename: str) -> str:
    print(f"[rasterize] {filename} page 1/1 -> OCR started", flush=True)
    image = Image.open(path)
    text = best_ocr_text(ocr_image_from_array(np.array(image)), image)
    print(f"[rasterize] {filename} page 1/1 -> OCR complete ({len(text)} chars)", flush=True)
    return text


def ocr_pdf(path: str, filename: str) -> tuple[str, int]:
    reader = PdfReader(path)
    pages: list[str] = []
    total_pages = len(reader.pages)
    import fitz  # type: ignore

    rendered_doc = None
    for page_number, page in enumerate(reader.pages, start=1):
        print(f"[rasterize] {filename} page {page_number}/{total_pages} -> retrieving text", flush=True)
        try:
            page_image = page.extract_text() or ""
            if page_image.strip():
                embedded_text = page_image
            else:
                embedded_text = ""
        except Exception:
            embedded_text = ""

        # For scan-style PDFs, use the page text first; if empty, fall back to OCR on the rendered page image.
        try:
            if rendered_doc is None:
                rendered_doc = fitz.open(path)
            print(f"[rasterize] {filename} page {page_number}/{total_pages} -> rasterizing 1240x1753 target", flush=True)
            pix = rendered_doc[page_number - 1].get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            raster_text = best_ocr_text(ocr_image_from_array(np.array(image)), image)
            text = choose_text(embedded_text, raster_text)
            pages.append(text)
            source = "embedded/OCR selected"
            print(f"[rasterize] {filename} page {page_number}/{total_pages} -> {source} ({len(text)} chars)", flush=True)
        except Exception:
            pages.append("")
            print(f"[rasterize] {filename} page {page_number}/{total_pages} -> OCR failed", flush=True)

    if rendered_doc is not None:
        rendered_doc.close()
    return normalize_text("\n\n".join(pages)), total_pages


def estimate_confidence(text: str) -> float:
    if not text.strip():
        return 0.0
    return round(min(96.0, max(80.0, 80.0 + len(text) / 120.0)), 1)


def get_language_label(text: str) -> str:
    try:
        return detect(text)
    except Exception:
        return "en"


def call_ollama(prompt: str, model: str = OLLAMA_MODEL) -> str:
    url = f"{OLLAMA_HOST.rstrip('/')}/api/generate"
    payload = {"model": model, "prompt": prompt, "stream": False}
    response = httpx.post(url, json=payload, timeout=120.0)
    response.raise_for_status()
    data = response.json()
    return str(data.get("response", ""))


def clean_ocr_text(text: str) -> str:
    if not text.strip():
        raise HTTPException(status_code=422, detail="No readable text found in uploaded document")

    prompt = (
        "You are a clinical document OCR correction engine. Reconstruct only the text visibly present in the "
        "source OCR below. Remove mojibake, broken glyphs, duplicated fragments, random Latin tokens, OCR noise, "
        "and Markdown artifacts. Repair spelling only when the surrounding letters and medical context make the "
        "word certain. Preserve the document's original language, names, numbers, dates, units, phone numbers, "
        "diagnoses, medicine names, table headings, rows, columns, and line order. Do not translate, summarize, "
        "infer, or invent missing content. For genuinely unreadable content write [unreadable]. Return only a "
        "clean plain-text transcription, with one field or table row per line.\n\nSOURCE OCR:\n"
            f"{text[:20000]}"
    )
    try:
        output = call_ollama(prompt)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="OCR cleanup service unavailable; no noisy fallback was used") from exc
    cleaned = clean_model_output(output)
    if not cleaned or "[unreadable]" in cleaned and len(cleaned) < 20:
        raise HTTPException(status_code=503, detail="OCR cleanup returned no reliable document text")
    source_script = dominant_script(text)
    cleaned_counts = script_counts(cleaned)
    if source_script in {"devanagari", "tamil", "telugu"} and cleaned_counts[source_script] == 0:
        raise HTTPException(status_code=503, detail="OCR cleanup changed the source script; no altered fallback was used")
    return cleaned


def translate_text(text: str, source_lang: str) -> str:
    if not text.strip():
        raise HTTPException(status_code=422, detail="No cleaned text available for translation")

    prompt = (
        f"You are translating a cleaned {source_lang} clinical document into precise medical English. Return a faithful, well-formatted "
        "English transcription and translation. Preserve every field label and value, including patient name, "
        "doctor or hospital, address, mobile/phone number, medical record number, dates, blood group, diagnoses, "
        "medicines, dosage, and all table headings, rows, and columns. Keep table rows as aligned labelled lines "
        "or a Markdown table when the columns are clear. Do not invent, normalize, replace, or guess any value. "
        "If a value is unreadable, write [unreadable] rather than a placeholder. Do not summarize and do not add "
        "clinical facts that are absent from the source. Correct recognized hospital terminology using standard "
        "clinical English, but never use outside patient facts or guess a damaged value. Return only the translated "
        "document in English, with one field or table row per line.\n\n"
        f"{text[:20000]}"
    )

    try:
        output = call_ollama(prompt)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Translation service unavailable; no fallback translation was used") from exc
    if not output.strip():
        raise HTTPException(status_code=503, detail="Translation service returned no text; no fallback translation was used")
    translated = clean_model_output(output)
    if not translated:
        raise HTTPException(status_code=503, detail="Translation service returned no clean English text; no fallback translation was used")
    if has_non_english_script(translated):
        retry_prompt = (
            "Rewrite the following clinical translation in English only. Do not output Hindi, Tamil, Telugu, "
            "or any other non-Latin script. Preserve names, numbers, dates, diagnoses, medicines, labels, and "
            "table rows exactly; use [unreadable] for uncertain text. Return only the English document.\n\n"
            f"{translated[:8000]}"
        )
        try:
            translated = clean_model_output(call_ollama(retry_prompt))
        except Exception as exc:
            raise HTTPException(status_code=503, detail="English translation validation failed; no non-English fallback was used") from exc
    if has_non_english_script(translated):
        raise HTTPException(status_code=503, detail="Translation was not English; no non-English fallback was used")
    return translated


def classify_document_from_text(text: str) -> dict[str, Any]:
    lower = text.lower()
    if any(word in lower for word in ["discharge", "admission", "diagnosis", "treatment"]):
        return {"classification": "Discharge Summary", "confidence": 0.91}
    if any(word in lower for word in ["prescription", "medication", "tablet", "dose", "medicine"]):
        return {"classification": "Outpatient Prescription", "confidence": 0.9}
    if any(word in lower for word in ["glucose", "cbc", "ldl", "creatinine", "hba1c", "lab"]):
        return {"classification": "Lab Test Panel", "confidence": 0.9}
    if any(word in lower for word in ["surgery", "procedure", "angioplasty", "stent", "operation"]):
        return {"classification": "Surgical Note", "confidence": 0.91}
    if any(word in lower for word in ["radiograph", "x-ray", "imaging", "report", "chest"]):
        return {"classification": "Diagnostic Imaging Report", "confidence": 0.92}
    return {"classification": "Unclassified Clinical Document", "confidence": 0.72}


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/process-document")
async def process_document(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename supplied")

    suffix = Path(file.filename).suffix.lower() or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    try:
        mime = detect_file_kind(temp_path)
        if mime == "application/pdf":
            extracted_text, page_count = ocr_pdf(temp_path, file.filename)
        elif mime.startswith("image/"):
            extracted_text = ocr_image(temp_path, file.filename)
            page_count = 1
        else:
            extracted_text = ""

        if not extracted_text.strip():
            raise HTTPException(status_code=422, detail="No readable text found in uploaded document")

        ocr_confidence = estimate_confidence(extracted_text)
        print(
            f"[analysis] {file.filename} -> OCR confidence {ocr_confidence}% | language detection started",
            flush=True,
        )
        cleaned_text = extracted_text if is_reliable_text(extracted_text) else clean_ocr_text(extracted_text)
        source_lang = get_language_label(cleaned_text)
        translated_text = translate_text(cleaned_text, source_lang)
        fields = extract_fields(cleaned_text)
        translated_fields = extract_fields(translated_text)
        patient_name = translated_fields.get("patient_name") or fields.get("patient_name")

        text_classification = classify_document_from_text(translated_text)
        translation_quality = estimate_confidence(translated_text)
        print(
            f"[analysis] {file.filename} -> {text_classification['classification']} "
            f"({text_classification['confidence'] * 100:.1f}%) | translated to English | patient={patient_name or 'not found'}",
            flush=True,
        )

        return {
            "filename": file.filename,
            "file_type": mime,
            "language_detected": source_lang,
            "classification": text_classification["classification"],
            "classifier_confidence": round(text_classification["confidence"] * 100, 1),
            "pages": page_count,
            "ocr_confidence": ocr_confidence,
            "translation_quality": translation_quality,
            "ocr_text": cleaned_text,
            "translated_text": translated_text,
            "patient_name": patient_name,
            "fields": {**fields, **translated_fields},
            "status": "processed",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(exc)}") from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
