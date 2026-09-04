# Dataset card — prescription OCR training data

Tracks what data exists, where it came from, and known limitations. Update
this whenever a new manifest is added to `splits/`.

## Versions

### `splits/synthetic_v1.jsonl` — 2026-08-31

- **Count**: 500 images
- **Source**: `training/scripts/generate_synthetic_prescriptions.py`
- **label_origin**: `synthetic_gt` (exact by construction — rendered from the
  same structured data used to draw the image, zero label noise)
- **Vocabulary**: drug names/dosage sourced live from MongoDB `medicines`
  collection (500 entries pulled), rendered into synthetic clinic/patient/
  prescription templates with light rotation augmentation (±1.5°)
- **Known limitations** (do not over-trust accuracy measured only on this
  set — see plan doc "Kiến trúc model được đề xuất"):
  - Printed text only — no handwriting simulation. Real prescriptions
    (especially doctor-written) look nothing like this.
  - Fixed set of 5 clinic names / 5 doctor names / 8 patient names — low
    diversity, will overfit fast on its own.
  - Single font, white background, no paper texture/lighting/scan artifacts.
  - Dosage/medication lines are heuristically shortened from full clinical
    monographs (`_short_dosage`/`_short_name` in the generator script) — not
    verified against how real doctors actually abbreviate on paper.
  - **Purpose**: Stage A warm-start (vocabulary + layout grammar) only. Not a
    substitute for real data. Do not use synthetic-only eval accuracy as a
    production readiness signal.

## Real data (Phase 1+)

No real collected images yet. When partner-clinic images arrive:
1. Run `training/scripts/ingest_raw_images.py` → `data/raw/{clinic_id}/{yyyymm}/`
2. Run `training/scripts/auto_label.py` → distilled labels via the existing
   production `services/ocr_service.py` pipeline (`label_origin: gemini_distill`)
3. Human-review a sample via `training/scripts/build_review_html.py` →
   `label_origin: human_corrected`
4. Snapshot a new `splits/real_v1.jsonl` manifest and add a section here.
