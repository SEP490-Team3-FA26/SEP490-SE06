# Training pipeline — custom prescription OCR

This directory holds the training/evaluation code for a self-hosted Vietnamese
prescription OCR model intended to eventually replace the third-party Vision
OCR calls in `services/ocr_service.py` (HuggingFace Inkling / OpenRouter
Gemini). See `/Users/tranhongphuoc/.claude/plans/c-d-n-hi-n-calm-pine.md` for
the full staged plan (Phase 0-3, rollout criteria, architecture rationale).

## Why this is a separate dependency universe

`backend/apps/ai-service/requirements.txt` (the production API's deps) stays
free of ML/DS libraries — it's a thin FastAPI service that calls hosted APIs.
Training needs torch, vietocr, etc., which are heavy and irrelevant to the
serving container. `Dockerfile` never installs `requirements-training.txt`.

## Setup

```bash
cd backend/apps/ai-service/training
python3 -m venv .venv-train
source .venv-train/bin/activate
pip install -r requirements-training.txt
```

## Architecture (2-stage, see plan for full rationale)

- **Stage A — text/line recognition**: fine-tune VietOCR (`vietocr` PyPI
  package, pretrained Vietnamese checkpoints) on cropped prescription text
  lines. Paired with an off-the-shelf text detector (not trained initially).
- **Stage B — structuring**: raw OCR text → the same JSON schema
  `services/ocr_service.py::PRESCRIPTION_OCR_PROMPT` already defines
  (patient_info / clinic_info / diagnosis / medications[] / ...). Starts as a
  rule-based parser extending `_raw_ocr_text_to_prescription_schema`.

## Directory layout

```
training/
  requirements-training.txt
  configs/            # model/training hyperparameters
  datasets/           # PyTorch Dataset/Dataloader code, reads data/splits/*.jsonl
  scripts/            # ingest, auto-label, review, synthetic generation, train, eval, export
  checkpoints/         # gitignored — local run outputs (config + metrics.jsonl + weights)
```

Real/synthetic images and labels live in `../data/` (sibling directory, also
gitignored except for lightweight `data/splits/*.jsonl` manifests).

## Phase 0 exit criteria

Run the full loop end to end on synthetic + the 8 sample images already in
`static/dataSamplePresition/`, even if accuracy is still poor:

```bash
python scripts/generate_synthetic_prescriptions.py --count 500
python scripts/train_stage_a.py --config configs/stage_a_ocr.yaml
python scripts/eval_stage_a.py --checkpoint checkpoints/<run_id>
python scripts/export_model.py --checkpoint checkpoints/<run_id>
```
