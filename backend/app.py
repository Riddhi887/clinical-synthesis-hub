from __future__ import annotations

import os
import re
<<<<<<< HEAD
import shutil
=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
import tempfile
from pathlib import Path
from typing import Any

import filetype
import httpx
import numpy as np
import pytesseract
<<<<<<< HEAD
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
=======
from fastapi import FastAPI, File, HTTPException, UploadFile
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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
<<<<<<< HEAD
OCR_TIMEOUT_SECONDS = int(os.environ.get("OCR_TIMEOUT_SECONDS", "60"))
OLLAMA_TIMEOUT_SECONDS = float(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "120"))

RECORDS_DIR = Path(os.environ.get("RECORDS_DIR", Path(__file__).resolve().parent / "records"))
RECORDS_DIR.mkdir(parents=True, exist_ok=True)


def pipeline_log(event: str, filename: str, case_id: str | None, document_id: str | None, detail: str = "") -> None:
    identifiers = f"case={case_id or '-'} doc={document_id or '-'} file={filename}"
    suffix = f" | {detail}" if detail else ""
    print(f"[pipeline] {event} | {identifiers}{suffix}", flush=True)


try:
    installed_tesseract_languages = set(pytesseract.get_languages(config=""))
    missing_tesseract_languages = {"tam", "tel"} - installed_tesseract_languages
    if missing_tesseract_languages:
        print(
            f"[pipeline] tesseract-language-warning | missing={','.join(sorted(missing_tesseract_languages))}",
            flush=True,
        )
    else:
        print("[pipeline] tesseract-language-check | tam,tel available", flush=True)
except Exception as exc:
    print(f"[pipeline] tesseract-language-check-failed | error={exc}", flush=True)
=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba


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


<<<<<<< HEAD
def tesseract_text(image: Image.Image, source_text: str = "", filename: str = "", case_id: str | None = None, document_id: str | None = None) -> str:
=======
def tesseract_text(image: Image.Image, source_text: str = "") -> str:
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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
<<<<<<< HEAD
    errors: list[str] = []
    for variant in variants:
        for psm in (6, 11):
            try:
                outputs.append(
                    normalize_text(
                        pytesseract.image_to_string(
                            variant,
                            lang=languages,
                            config=f"--psm {psm}",
                            timeout=OCR_TIMEOUT_SECONDS,
                        )
                    )
                )
            except Exception as exc:
                errors.append(str(exc))
    if not outputs:
        detail = errors[-1] if errors else "no OCR output"
        pipeline_log("ocr-failed", filename, case_id, document_id, f"languages={languages} error={detail}")
        raise RuntimeError(f"Tesseract could not read this document using {languages}: {detail}")
    return max(outputs, key=ocr_candidate_score, default="")


def best_ocr_text(rapid_text: str, image: Image.Image, filename: str = "", case_id: str | None = None, document_id: str | None = None) -> str:
    tesseract = tesseract_text(image, rapid_text, filename, case_id, document_id)
=======
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
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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


<<<<<<< HEAD
def extract_medications(text: str) -> list[dict[str, str]]:
    medications: list[dict[str, str]] = []
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    non_drugs = {
        "bilirubin", "creatinine", "glucose", "hba1c", "ldl", "hdl",
        "hemoglobin", "haemoglobin", "sodium", "potassium", "platelet", "urea"
    }

    for line in lines:
        if not re.search(r"\b(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu)|tablet|tab\.?|capsule|cap\.?|dose)\b", line, re.I):
            continue

        dose_m = re.search(r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu)|\d+\s*(?:tablets?|capsules?))\b", line, re.I)
        dosage = dose_m.group(1) if dose_m else "As directed"

        freq = "As directed"
        if re.search(r"\b(?:1-0-1)\b", line):
            freq = "Twice daily (2 per day: morning & night)"
        elif re.search(r"\b(?:1-1-1)\b", line):
            freq = "Three times daily (3 per day)"
        elif re.search(r"\b(?:1-0-0)\b", line):
            freq = "Once daily (1 per day: morning)"
        elif re.search(r"\b(?:0-0-1)\b", line):
            freq = "Once nightly (1 per day: at bedtime)"
        elif re.search(r"\b(?:twice\s+daily|twice\s+a\s+day|2\s+times\s+(?:a|per)\s+day|bd|bid)\b", line, re.I):
            freq = "Twice daily (2 per day)"
        elif re.search(r"\b(?:three\s+times\s+daily|thrice\s+daily|3\s+times\s+(?:a|per)\s+day|tid|tds)\b", line, re.I):
            freq = "Three times daily (3 per day)"
        elif re.search(r"\b(?:once\s+nightly|nightly|at\s+night|at\s+bedtime|hs)\b", line, re.I):
            freq = "Once nightly (1 per day: at bedtime)"
        elif re.search(r"\b(?:once\s+daily|once\s+a\s+day|daily|od)\b", line, re.I):
            freq = "Once daily (1 per day)"
        elif re.search(r"\b(?:as\s+needed|prn|sos)\b", line, re.I):
            freq = "As needed (SOS / PRN)"

        dur = "As directed"
        dur_m = re.search(
            r"\b(?:for\s+(\d+\s*(?:days?|weeks?|months?))|(\d+\s*(?:days?|weeks?|months?)\s*post-stent)|(ongoing|long\s*term)|review in\s+(\d+\s*(?:days?|weeks?|months?)))\b",
            line,
            re.I,
        )
        if dur_m:
            if dur_m.group(1):
                dur = f"For {dur_m.group(1)}"
            elif dur_m.group(2):
                dur = dur_m.group(2)
            elif dur_m.group(3):
                dur = "Ongoing"
            elif dur_m.group(4):
                dur = f"{dur_m.group(4)} (until review)"

        inst = "Follow prescription instructions"
        inst_m = re.search(
            r"\b(?:after\s+(?:breakfast\s+and\s+dinner|breakfast|dinner|lunch|meals?|food)|before\s+(?:meals?|food)|empty\s+stomach|post-meal|with\s+(?:food|water))\b",
            line,
            re.I,
        )
        if inst_m:
            inst = inst_m.group(0).capitalize()

        clean = re.sub(r"^\s*[-*•|\d.)]+\s*", "", line)
        name_m = re.search(r"^(?:tab\.?|tablet|cap\.?|capsule|syr\.?|syrup|inj\.?)\s+([A-Za-z0-9\-]+)", clean, re.I)
        if name_m:
            name = name_m.group(1)
        elif dose_m:
            before = clean[: dose_m.start()].strip(" :–—,-")
            tokens = [
                t for t in re.split(r"[\s,–—:-]+", before)
                if len(t) > 2 and t.lower() not in {"tab", "tablet", "cap", "capsule", "prescribed", "rx"}
            ]
            name = tokens[-1] if tokens else ""
        else:
            name = ""

        if name and name.lower() not in non_drugs and len(name) > 2:
            medications.append({
                "name": name.capitalize(),
                "dosage": dosage,
                "frequency": freq,
                "duration": dur,
                "since": dur,
                "instructions": inst,
            })
    return medications


=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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


<<<<<<< HEAD
def ocr_image(path: str, filename: str, case_id: str | None = None, document_id: str | None = None) -> str:
    pipeline_log("page-start", filename, case_id, document_id, "page=1/1 stage=ocr-started")
    image = Image.open(path)
    text = best_ocr_text(ocr_image_from_array(np.array(image)), image, filename, case_id, document_id)
    pipeline_log("page-complete", filename, case_id, document_id, f"page=1/1 stage=ocr-complete chars={len(text)}")
    return text


def ocr_pdf(path: str, filename: str, case_id: str | None = None, document_id: str | None = None) -> tuple[str, int]:
=======
def ocr_image(path: str, filename: str) -> str:
    print(f"[rasterize] {filename} page 1/1 -> OCR started", flush=True)
    image = Image.open(path)
    text = best_ocr_text(ocr_image_from_array(np.array(image)), image)
    print(f"[rasterize] {filename} page 1/1 -> OCR complete ({len(text)} chars)", flush=True)
    return text


def ocr_pdf(path: str, filename: str) -> tuple[str, int]:
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
    reader = PdfReader(path)
    pages: list[str] = []
    total_pages = len(reader.pages)
    import fitz  # type: ignore

    rendered_doc = None
    for page_number, page in enumerate(reader.pages, start=1):
<<<<<<< HEAD
        pipeline_log("page-start", filename, case_id, document_id, f"page={page_number}/{total_pages} stage=retrieving-text")
=======
        print(f"[rasterize] {filename} page {page_number}/{total_pages} -> retrieving text", flush=True)
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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
<<<<<<< HEAD
            pipeline_log("page-stage", filename, case_id, document_id, f"page={page_number}/{total_pages} stage=rasterizing target=1240x1753")
            pix = rendered_doc[page_number - 1].get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            raster_text = best_ocr_text(ocr_image_from_array(np.array(image)), image, filename, case_id, document_id)
            text = choose_text(embedded_text, raster_text)
            pages.append(text)
            source = "embedded" if embedded_text.strip() else "ocr"
            pipeline_log("page-stage", filename, case_id, document_id, f"page={page_number}/{total_pages} stage=ocr-complete source={source} chars={len(text)}")
        except Exception as exc:
            pipeline_log("page-failed", filename, case_id, document_id, f"page={page_number}/{total_pages} error={exc}")
            raise RuntimeError(f"OCR failed on page {page_number}/{total_pages}: {exc}") from exc
=======
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
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba

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
<<<<<<< HEAD
    response = httpx.post(url, json=payload, timeout=OLLAMA_TIMEOUT_SECONDS)
=======
    response = httpx.post(url, json=payload, timeout=120.0)
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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
<<<<<<< HEAD
        raise HTTPException(status_code=503, detail=f"Translation service unavailable for detected language {source_lang}; no fallback translation was used") from exc
    if not output.strip():
        raise HTTPException(status_code=503, detail=f"Translation service returned no text for detected language {source_lang}; no fallback translation was used")
    translated = clean_model_output(output)
    if not translated:
        raise HTTPException(status_code=503, detail=f"Translation returned no clean English text for detected language {source_lang}; no fallback translation was used")
=======
        raise HTTPException(status_code=503, detail="Translation service unavailable; no fallback translation was used") from exc
    if not output.strip():
        raise HTTPException(status_code=503, detail="Translation service returned no text; no fallback translation was used")
    translated = clean_model_output(output)
    if not translated:
        raise HTTPException(status_code=503, detail="Translation service returned no clean English text; no fallback translation was used")
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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
<<<<<<< HEAD
            raise HTTPException(status_code=503, detail=f"English translation validation failed for detected language {source_lang}; no non-English fallback was used") from exc
    if has_non_english_script(translated):
        raise HTTPException(status_code=503, detail=f"Translation for detected language {source_lang} was not English; no non-English fallback was used")
=======
            raise HTTPException(status_code=503, detail="English translation validation failed; no non-English fallback was used") from exc
    if has_non_english_script(translated):
        raise HTTPException(status_code=503, detail="Translation was not English; no non-English fallback was used")
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
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
<<<<<<< HEAD
async def process_document(
    file: UploadFile = File(...),
    case_id: str | None = Form(None),
    document_id: str | None = Form(None),
) -> dict[str, Any]:
=======
async def process_document(file: UploadFile = File(...)) -> dict[str, Any]:
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename supplied")

    suffix = Path(file.filename).suffix.lower() or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    try:
<<<<<<< HEAD
        pipeline_log("document-start", file.filename, case_id, document_id, "stage=request-received")
        safe_case_id = re.sub(r"[^A-Za-z0-9_-]", "", case_id) if case_id else None
        if safe_case_id and file.filename:
            case_records_dir = RECORDS_DIR / safe_case_id
            case_records_dir.mkdir(parents=True, exist_ok=True)
            dest_file = case_records_dir / Path(file.filename).name
            try:
                shutil.copyfile(temp_path, dest_file)
            except Exception as e:
                print(f"[warning] Could not store copy to case records: {e}")

        mime = detect_file_kind(temp_path)
        pipeline_log("document-stage", file.filename, case_id, document_id, f"stage=file-detected mime={mime}")
        try:
            if mime == "application/pdf":
                extracted_text, page_count = ocr_pdf(temp_path, file.filename, case_id, document_id)
            elif mime.startswith("image/"):
                extracted_text = ocr_image(temp_path, file.filename, case_id, document_id)
                page_count = 1
            else:
                extracted_text = ""
                page_count = 0
        except RuntimeError as exc:
            pipeline_log("document-failed", file.filename, case_id, document_id, f"stage=ocr error={exc}")
            raise HTTPException(status_code=422, detail=f"OCR failed for {file.filename}: {exc}") from exc
=======
        mime = detect_file_kind(temp_path)
        if mime == "application/pdf":
            extracted_text, page_count = ocr_pdf(temp_path, file.filename)
        elif mime.startswith("image/"):
            extracted_text = ocr_image(temp_path, file.filename)
            page_count = 1
        else:
            extracted_text = ""
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba

        if not extracted_text.strip():
            raise HTTPException(status_code=422, detail="No readable text found in uploaded document")

        ocr_confidence = estimate_confidence(extracted_text)
<<<<<<< HEAD
        pipeline_log("document-stage", file.filename, case_id, document_id, f"stage=ocr-complete pages={page_count} confidence={ocr_confidence}%")
        pipeline_log("document-stage", file.filename, case_id, document_id, "stage=ocr-cleanup-started")
        cleaned_text = extracted_text if is_reliable_text(extracted_text) else clean_ocr_text(extracted_text)
        pipeline_log("document-stage", file.filename, case_id, document_id, "stage=ocr-cleanup-complete")
        source_lang = get_language_label(cleaned_text)
        pipeline_log("document-stage", file.filename, case_id, document_id, f"stage=translation-started language={source_lang}")
        translated_text = translate_text(cleaned_text, source_lang)
        pipeline_log("document-stage", file.filename, case_id, document_id, "stage=translation-complete")
        fields = extract_fields(cleaned_text)
        translated_fields = extract_fields(translated_text)
        patient_name = translated_fields.get("patient_name") or fields.get("patient_name")
        medications = extract_medications(translated_text) or extract_medications(cleaned_text)

        text_classification = classify_document_from_text(translated_text)
        translation_quality = estimate_confidence(translated_text)
        pipeline_log("document-complete", file.filename, case_id, document_id, f"classification={text_classification['classification']} confidence={text_classification['confidence'] * 100:.1f}% patient={patient_name or 'not found'}")
=======
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
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba

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
<<<<<<< HEAD
            "medications": medications,
            "fields": {**fields, **translated_fields, "medications": medications},
            "status": "processed",
        }
    except HTTPException as exc:
        pipeline_log("document-failed", file.filename, case_id, document_id, f"status={exc.status_code} error={exc.detail}")
        raise
    except Exception as exc:
        pipeline_log("document-failed", file.filename, case_id, document_id, f"status=500 error={exc}")
=======
            "fields": {**fields, **translated_fields},
            "status": "processed",
        }
    except HTTPException:
        raise
    except Exception as exc:
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(exc)}") from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
<<<<<<< HEAD


@app.delete("/cases/{case_id}")
@app.delete("/records/{case_id}")
@app.delete("/api/cases/{case_id}")
@app.delete("/api/records/{case_id}")
def delete_patient_case(case_id: str) -> dict[str, Any]:
    safe_id = re.sub(r"[^A-Za-z0-9_-]", "", case_id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Invalid case ID")

    case_folder = RECORDS_DIR / safe_id
    folder_removed = False
    if case_folder.exists() and case_folder.is_dir():
        shutil.rmtree(case_folder, ignore_errors=True)
        folder_removed = True
        print(f"[storage] Case records folder deleted: {case_folder}", flush=True)

    return {
        "status": "deleted",
        "case_id": safe_id,
        "folder_removed": folder_removed,
        "message": f"Case records folder {safe_id} deleted from backend storage.",
    }


@app.get("/cases/{case_id}/records")
@app.get("/api/cases/{case_id}/records")
def list_case_records(case_id: str) -> dict[str, Any]:
    safe_id = re.sub(r"[^A-Za-z0-9_-]", "", case_id)
    case_folder = RECORDS_DIR / safe_id
    if not case_folder.exists():
        return {"case_id": safe_id, "files": []}
    files = [f.name for f in case_folder.iterdir() if f.is_file()]
    return {"case_id": safe_id, "files": files}


@app.post("/cases/{case_id}/records")
@app.post("/api/cases/{case_id}/records")
async def upload_case_record(case_id: str, file: UploadFile = File(...)) -> dict[str, str]:
    safe_id = re.sub(r"[^A-Za-z0-9_-]", "", case_id)
    safe_name = Path(file.filename or "").name
    if not safe_id or not safe_name or safe_name in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid case ID or filename")

    case_folder = RECORDS_DIR / safe_id
    case_folder.mkdir(parents=True, exist_ok=True)
    destination = case_folder / safe_name
    with destination.open("wb") as output:
        shutil.copyfileobj(file.file, output)
    return {"status": "stored", "case_id": safe_id, "filename": safe_name}


@app.delete("/cases/{case_id}/records/{filename}")
@app.delete("/api/cases/{case_id}/records/{filename}")
def delete_case_record(case_id: str, filename: str) -> dict[str, str]:
    safe_id = re.sub(r"[^A-Za-z0-9_-]", "", case_id)
    safe_name = Path(filename).name
    if not safe_id or not safe_name or safe_name in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid case ID or filename")

    record_path = RECORDS_DIR / safe_id / safe_name
    if not record_path.is_file():
        raise HTTPException(status_code=404, detail="Case record not found")
    record_path.unlink()
    return {"status": "deleted", "case_id": safe_id, "filename": safe_name}
=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
