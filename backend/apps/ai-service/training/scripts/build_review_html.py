"""Generate a static HTML page showing each real distilled (image, label)
pair side-by-side with an editable JSON textarea, for manual review/
correction — deliberately not a hosted web app, just a local file a human
opens in a browser.

Corrections are saved back as *.reviewed.json (label_origin: human_corrected)
alongside the original *.json (label_origin: gemini_distill), so disagreement
rate stays auditable (see data/DATASET_CARD.md).

The page has no backend — "Save" writes the edited JSON to the browser's
download folder; the reviewer then moves it into place manually. This keeps
the tool a single static file with zero server/dependency footprint.

Usage:
    python scripts/build_review_html.py --manifest ../../data/splits/real_distilled_v1.jsonl
"""

import argparse
import base64
import html
import json
from pathlib import Path

PAGE_TEMPLATE = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Prescription OCR label review</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 0; background: #f4f4f4; }}
  header {{ padding: 12px 20px; background: #1f2937; color: white; position: sticky; top: 0; }}
  .sample {{ display: flex; gap: 16px; padding: 16px 20px; background: white; margin: 12px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.15); }}
  .sample img {{ max-width: 45%; max-height: 600px; object-fit: contain; border: 1px solid #ddd; }}
  .sample .right {{ flex: 1; display: flex; flex-direction: column; }}
  .sample textarea {{ flex: 1; min-height: 500px; font-family: ui-monospace, monospace; font-size: 12px; }}
  .sample .path {{ font-size: 12px; color: #666; margin-bottom: 6px; word-break: break-all; }}
  .sample button {{ margin-top: 8px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }}
  .sample button:hover {{ background: #1d4ed8; }}
</style>
</head>
<body>
<header><h2>Prescription OCR label review ({count} samples)</h2>
<p>Edit JSON, click Save to download corrected label as *.reviewed.json — then move it next to the original label file.</p></header>
{samples}
<script>
function saveLabel(idx, filename) {{
  const text = document.getElementById('ta-' + idx).value;
  try {{ JSON.parse(text); }} catch (e) {{ alert('Invalid JSON: ' + e.message); return; }}
  const blob = new Blob([text], {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}}
</script>
</body>
</html>
"""

SAMPLE_TEMPLATE = """
<div class="sample">
  <img src="data:{mime};base64,{img_b64}" alt="{alt}">
  <div class="right">
    <div class="path">{image_path}</div>
    <textarea id="ta-{idx}">{label_json}</textarea>
    <button onclick="saveLabel({idx}, '{reviewed_filename}')">Download reviewed label</button>
  </div>
</div>
"""

MIME_MAP = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


def build_sample_html(idx: int, image_path: Path, label_path: Path, data_root: Path) -> str:
    mime = MIME_MAP.get(image_path.suffix.lower(), "image/jpeg")
    img_b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    label_json = label_path.read_text(encoding="utf-8")
    return SAMPLE_TEMPLATE.format(
        mime=mime,
        img_b64=img_b64,
        alt=html.escape(image_path.name),
        image_path=html.escape(str(image_path.relative_to(data_root))),
        idx=idx,
        label_json=html.escape(label_json),
        reviewed_filename=f"{label_path.stem}.reviewed.json",
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=str, required=True)
    parser.add_argument("--out", type=str, default="../../data/review.html")
    parser.add_argument("--limit", type=int, default=50, help="Max samples per page (large pages get slow)")
    args = parser.parse_args()

    manifest_path = (Path(__file__).resolve().parent / args.manifest).resolve()
    if not manifest_path.exists():
        print(f"Manifest not found: {manifest_path}")
        return

    # Manifest rows store paths relative to the ai-service/ root (e.g.
    # "data/synthetic/images/xyz.png"), matching the convention used by
    # generate_synthetic_prescriptions.py and auto_label.py.
    data_root = Path(__file__).resolve().parents[2]
    rows = []
    with open(manifest_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    rows = rows[: args.limit]
    samples_html = []
    for idx, row in enumerate(rows):
        image_path = data_root / row["image_path"]
        label_path = data_root / row["label_path"]
        if not image_path.exists() or not label_path.exists():
            print(f"skip missing: {row}")
            continue
        samples_html.append(build_sample_html(idx, image_path, label_path, data_root))

    out_path = (Path(__file__).resolve().parent / args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        PAGE_TEMPLATE.format(count=len(samples_html), samples="\n".join(samples_html)),
        encoding="utf-8",
    )
    print(f"Wrote review page ({len(samples_html)} samples) to {out_path}")
    print("Open it in a browser, edit JSON as needed, download corrections, then move")
    print("*.reviewed.json files next to their originals in data/labels/.")


if __name__ == "__main__":
    main()
