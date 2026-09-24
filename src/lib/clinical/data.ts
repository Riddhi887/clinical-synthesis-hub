export type DocClass =
  | "Discharge Summary"
  | "Outpatient Prescription"
  | "Lab Test Panel"
  | "Surgical Note"
  | "Diagnostic Imaging Report"
  | "Unclassified Clinical Document";

export interface ClinicalDoc {
  id: string;
  name: string;
  origin?: "sample" | "upload";
  patientName?: string;
  fields?: Record<string, string>;
  processing?: boolean;
  analyzed?: boolean;
  sourceFile?: File;
  language: string;
  pages: number;
  sizeKb: number;
  classification?: DocClass;
  classifierConfidence: number;
  originalText: string;
  translatedText: string;
  ocrConfidence: number;
  translationQuality: number;
  processed: boolean;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  facility: string;
  detail: string;
  kind: "admission" | "lab" | "surgery" | "followup" | "imaging";
}

export interface Synthesis {
  caseId: string;
  patientName: string;
  age: number;
  sex: string;
  mrn: string;
  physicians: string[];
  diagnoses: { code: string; label: string }[];
  medications: { name: string; dosage: string; frequency: string; since: string }[];
  vitals: { label: string; trend: string; value: string; status: "normal" | "watch" | "high" }[];
  timeline: TimelineEvent[];
  gaps: string[];
  risk: "STABLE" | "ACTION REQUIRED" | "CRITICAL RISK";
  createdAt: number;
}

const LOREM_TA = `நோயாளி பெயர்: இரமேஷ் குமார் | வயது: 58
மருந்துச் சீட்டு – பொது மருத்துவப் பிரிவு
நாள்: 14/03/2024
அறிகுறிகள்: மார்பு இறுக்கம், மூச்சுத் திணறல், இரவு வியர்வை.
மருந்துகள்:
1. Tab. Metformin 500mg – காலை மற்றும் இரவு உணவுக்குப் பின்
2. Tab. Atorvastatin 20mg – இரவில் ஒரு முறை
3. Tab. Aspirin 75mg – காலை உணவுக்குப் பின்
ஆலோசனை: இரண்டு வாரங்களில் மீண்டும் பரிசோதனை. உப்பு குறைந்த உணவு.
மருத்துவர்: டாக்டர் எஸ். வெங்கடேசன், MD (பொது மருத்துவம்)`;

const LOREM_TE = `రోగి పేరు: రమేష్ కుమార్ | వయస్సు: 58
డిశ్చార్జ్ సారాంశం – కార్డియాలజీ విభాగం
ప్రవేశ తేదీ: 02/08/2023 | డిశ్చార్జ్ తేదీ: 09/08/2023
నిర్ధారణ: తీవ్రమైన కరోనరీ సిండ్రోమ్, టైప్ 2 మధుమేహం.
చికిత్స: LAD ధమనికి యాంజియోప్లాస్టీ మరియు స్టెంట్ అమర్చడం జరిగింది.
డిశ్చార్జ్ సమయంలో స్థిరంగా ఉన్నారు. 4 వారాలలో తిరిగి పరీక్ష.
వైద్యుడు: డా. కె. లక్ష్మి రెడ్డి, DM (కార్డియాలజీ)`;

const LOREM_ES = `Nombre del paciente: Ramesh Kumar | Edad: 58
Informe de Laboratorio – Panel Metabólico y Lipídico
Fecha de la muestra: 21/01/2024
Glucosa en ayunas: 168 mg/dL (elevada)
HbA1c: 8.4 % (control deficiente)
Colesterol LDL: 142 mg/dL (elevado)
Creatinina sérica: 1.3 mg/dL (límite superior)
Hemoglobina: 12.1 g/dL
Observaciones: Se recomienda ajuste de la terapia hipoglucemiante y control renal.
Firmado: Dra. M. Alvarez, Patología Clínica`;

const LOREM_HI = `रोगी का नाम: रमेश कुमार | आयु: 58
शल्य चिकित्सा नोट – कार्डियक कैथ लैब
दिनांक: 03/08/2023
प्रक्रिया: कोरोनरी एंजियोप्लास्टी, LAD में ड्रग-एल्यूटिंग स्टेंट।
एनेस्थीसिया: स्थानीय, रोगी सचेत रहा। रक्तस्राव न्यूनतम।
प्रक्रिया के बाद रोगी स्थिर, कोई जटिलता नहीं।
सर्जन: डॉ. के. लक्ष्मी रेड्डी, DM (कार्डियोलॉजी)`;

const EN_IMAGING = `Patient: Ramesh Kumar | Age: 58 | MRN 8839201
DIAGNOSTIC IMAGING REPORT — Chest Radiograph (PA view)
Study date: 11/02/2024
Findings: Mild cardiomegaly with cardiothoracic ratio 0.54. No focal consolidation,
pleural effusion or pneumothorax. Aortic knuckle mildly prominent.
Impression: Mild cardiomegaly consistent with known ischaemic heart disease.
Recommend echocardiographic correlation.
Reported by: Dr. A. Nair, MD (Radiodiagnosis)`;

const TRANSLATIONS = {
  ta: `Patient: Ramesh Kumar | Age: 58
OUTPATIENT PRESCRIPTION — Department of General Medicine
Date of consultation: 14 March 2024
Presenting complaints: Chest tightness, exertional dyspnoea, nocturnal diaphoresis.
Prescribed pharmacotherapy:
1. Tab. Metformin 500 mg — twice daily, after breakfast and dinner
2. Tab. Atorvastatin 20 mg — once nightly
3. Tab. Aspirin 75 mg — once daily after breakfast
Advice: Review in two weeks. Low-sodium diet; monitor capillary glucose.
Treating physician: Dr. S. Venkatesan, MD (General Medicine)`,
  te: `Patient: Ramesh Kumar | Age: 58
DISCHARGE SUMMARY — Department of Cardiology
Admission: 02 August 2023 | Discharge: 09 August 2023
Diagnosis: Acute coronary syndrome; Type 2 diabetes mellitus.
Course of treatment: Percutaneous coronary angioplasty performed with stent
deployment to the left anterior descending artery. Patient maintained on dual
antiplatelet therapy and remained haemodynamically stable through discharge.
Condition at discharge: Stable. Review advised in four weeks.
Treating physician: Dr. K. Lakshmi Reddy, DM (Cardiology)`,
  es: `Patient: Ramesh Kumar | Age: 58
LABORATORY REPORT — Metabolic and Lipid Panel
Specimen date: 21 January 2024
Fasting plasma glucose: 168 mg/dL (elevated)
HbA1c: 8.4 % (poor glycaemic control)
LDL cholesterol: 142 mg/dL (elevated)
Serum creatinine: 1.3 mg/dL (upper limit of normal)
Haemoglobin: 12.1 g/dL
Interpretation: Escalation of hypoglycaemic therapy advised with renal monitoring.
Signed: Dr. M. Alvarez, Clinical Pathology`,
  hi: `Patient: Ramesh Kumar | Age: 58
SURGICAL / PROCEDURE NOTE — Cardiac Catheterisation Laboratory
Date: 03 August 2023
Procedure: Coronary angioplasty with drug-eluting stent to the LAD artery.
Anaesthesia: Local infiltration; patient conscious throughout. Blood loss minimal.
Post-procedure status: Haemodynamically stable, no immediate complications.
Operating surgeon: Dr. K. Lakshmi Reddy, DM (Cardiology)`,
  en: EN_IMAGING,
};

export const SAMPLE_CASE: Omit<ClinicalDoc, "id" | "processed">[] = [
  {
    name: "outpatient_prescription_TA_14032024.pdf",
    language: "Tamil (ta-IN)",
    pages: 2,
    sizeKb: 486,
    classification: "Outpatient Prescription",
    classifierConfidence: 91.4,
    originalText: LOREM_TA,
    translatedText: TRANSLATIONS["ta"],
    ocrConfidence: 86.4,
    translationQuality: 89.8,
  },
  {
    name: "discharge_summary_TE_cardiology.pdf",
    language: "Telugu (te-IN)",
    pages: 5,
    sizeKb: 1284,
    classification: "Discharge Summary",
    classifierConfidence: 93.1,
    originalText: LOREM_TE,
    translatedText: TRANSLATIONS["te"],
    ocrConfidence: 88.1,
    translationQuality: 90.2,
  },
  {
    name: "lab_panel_ES_metabolic.pdf",
    language: "Spanish (es-ES)",
    pages: 3,
    sizeKb: 742,
    classification: "Lab Test Panel",
    classifierConfidence: 89.7,
    originalText: LOREM_ES,
    translatedText: TRANSLATIONS["es"],
    ocrConfidence: 84.9,
    translationQuality: 92.5,
  },
  {
    name: "surgical_note_HI_cathlab.jpg",
    language: "Hindi (hi-IN)",
    pages: 1,
    sizeKb: 2210,
    classification: "Surgical Note",
    classifierConfidence: 87.6,
    originalText: LOREM_HI,
    translatedText: TRANSLATIONS["hi"],
    ocrConfidence: 82.7,
    translationQuality: 88.4,
  },
  {
    name: "chest_xray_report_EN.pdf",
    language: "English (en-IN)",
    pages: 2,
    sizeKb: 559,
    classification: "Diagnostic Imaging Report",
    classifierConfidence: 95.2,
    originalText: EN_IMAGING,
    translatedText: TRANSLATIONS["en"],
    ocrConfidence: 89.6,
    translationQuality: 96.1,
  },
];

export const SYNTHESIS_BASE: Omit<Synthesis, "caseId" | "createdAt"> = {
  patientName: "Ramesh Kumar",
  age: 58,
  sex: "Male",
  mrn: "MRN-8839201",
  physicians: [
    "Dr. K. Lakshmi Reddy, DM (Cardiology)",
    "Dr. S. Venkatesan, MD (General Medicine)",
    "Dr. M. Alvarez, MD (Clinical Pathology)",
    "Dr. A. Nair, MD (Radiodiagnosis)",
  ],
  diagnoses: [
    { code: "I25.10", label: "Atherosclerotic heart disease of native coronary artery" },
    { code: "E11.65", label: "Type 2 diabetes mellitus with hyperglycaemia" },
    { code: "E78.5", label: "Hyperlipidaemia, unspecified" },
    { code: "I51.7", label: "Cardiomegaly" },
  ],
  medications: [
    { name: "Metformin", dosage: "500 mg", frequency: "Twice daily, post-meal", since: "Aug 2023" },
    { name: "Atorvastatin", dosage: "20 mg", frequency: "Once nightly", since: "Aug 2023" },
    { name: "Aspirin", dosage: "75 mg", frequency: "Once daily", since: "Aug 2023" },
    { name: "Clopidogrel", dosage: "75 mg", frequency: "Once daily (12 months post-stent)", since: "Aug 2023" },
  ],
  vitals: [
    { label: "Fasting glucose", trend: "▲ rising", value: "168 mg/dL", status: "high" },
    { label: "HbA1c", trend: "▲ rising", value: "8.4 %", status: "high" },
    { label: "LDL cholesterol", trend: "▲ rising", value: "142 mg/dL", status: "watch" },
    { label: "Serum creatinine", trend: "→ stable", value: "1.3 mg/dL", status: "watch" },
    { label: "Blood pressure", trend: "→ stable", value: "132/84 mmHg", status: "normal" },
    { label: "Haemoglobin", trend: "▼ falling", value: "12.1 g/dL", status: "watch" },
  ],
  timeline: [
    {
      id: "t1",
      date: "02 Aug 2023",
      title: "Emergency admission — Acute coronary syndrome",
      facility: "Cardiology Inpatient Unit",
      detail:
        "Presented with retrosternal chest pain of four hours duration. Troponin-I elevated; ECG showed anterior ST-segment changes.",
      kind: "admission",
    },
    {
      id: "t2",
      date: "03 Aug 2023",
      title: "Coronary angioplasty with LAD stenting",
      facility: "Cardiac Catheterisation Laboratory",
      detail:
        "Drug-eluting stent deployed to the proximal LAD. Procedure uneventful; dual antiplatelet therapy commenced.",
      kind: "surgery",
    },
    {
      id: "t3",
      date: "09 Aug 2023",
      title: "Discharged in stable condition",
      facility: "Cardiology Inpatient Unit",
      detail: "Ambulatory, chest pain free. Four-week cardiology review advised.",
      kind: "admission",
    },
    {
      id: "t4",
      date: "21 Jan 2024",
      title: "Metabolic & lipid panel",
      facility: "Clinical Pathology Laboratory",
      detail: "HbA1c 8.4 %, LDL 142 mg/dL, creatinine 1.3 mg/dL — deteriorating metabolic control.",
      kind: "lab",
    },
    {
      id: "t5",
      date: "11 Feb 2024",
      title: "Chest radiograph (PA view)",
      facility: "Department of Radiodiagnosis",
      detail: "Mild cardiomegaly, CT ratio 0.54. Echocardiographic correlation recommended.",
      kind: "imaging",
    },
    {
      id: "t6",
      date: "14 Mar 2024",
      title: "Outpatient follow-up — General Medicine",
      facility: "General Medicine OPD",
      detail:
        "Chest tightness and nocturnal diaphoresis reported. Therapy continued unchanged; two-week review advised.",
      kind: "followup",
    },
  ],
  gaps: [
    "⚠️ Gap Detected: Missing post-operative blood panel between Admission Aug 2023 and Follow-Up Jan 2024 (no haematology within 150 days of stenting).",
    "⚠️ Gap Detected: Echocardiogram recommended on 11 Feb 2024 has no corresponding report in the intake set.",
    "⚠️ Unverified History: No documented four-week cardiology review after discharge; continuity of antiplatelet therapy unconfirmed.",
    "⚠️ Reconciliation Risk: Clopidogrel duration (12 months post-stent) not restated in the March 2024 prescription.",
  ],
  risk: "ACTION REQUIRED",
};

export const DOC_TYPE_DISTRIBUTION = [
  { type: "Prescriptions", count: 412 },
  { type: "Discharge", count: 286 },
  { type: "Lab Results", count: 508 },
  { type: "Imaging", count: 197 },
  { type: "Surgical", count: 134 },
];

export const INTAKE_SERIES = [
  { period: "W-06", weekly: 118, monthly: 402 },
  { period: "W-05", weekly: 146, monthly: 448 },
  { period: "W-04", weekly: 132, monthly: 476 },
  { period: "W-03", weekly: 178, monthly: 512 },
  { period: "W-02", weekly: 204, monthly: 588 },
  { period: "W-01", weekly: 231, monthly: 641 },
  { period: "Now", weekly: 258, monthly: 703 },
];

export const TELEMETRY_SCRIPT = (doc: ClinicalDoc): string[] => [
  `[pytesseract / easyocr] Rasterizing PDF pages (1240x1753px) — ${doc.name}`,
  `[easyocr] Loading ${doc.language} glyph recogniser + detector weights (CRAFT)...`,
  `[layoutlm_v3] Segmenting page layout: ${doc.pages} page(s), 14 text blocks, 2 table regions`,
  `[clinical_ner_model] Scanning medical entity bounding boxes...`,
  `[auto_classify] Identified document as '${doc.classification}' - confidence ${doc.classifierConfidence}%`,
  `[huggingface_marianmt] Translating regional medical notes to English via MarianMT/FB-BART API...`,
  `[medical_ner:Clinical-AI-Apollo] Extracted entities → DRUG(4) DOSAGE(4) DIAGNOSIS(3) DATE(6)`,
  `[confidence_evaluator] Raw OCR Confidence: ${doc.ocrConfidence}% | Neural Translation Quality: ${doc.translationQuality}%`,
  `[persistence] Committed artefact row → asset_slot(raw_documents) uuid constraint OK`,
];
