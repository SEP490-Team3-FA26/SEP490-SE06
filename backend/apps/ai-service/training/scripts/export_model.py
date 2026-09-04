"""Export a trained Stage A (VietOCR) checkpoint for CPU inference in
production (Phase 3 concern — see plan doc "Inference production" section).

IMPORTANT CAVEAT: VietOCR's model is an autoregressive transformer decoder
(vietocr/model/transformerocr.py::VietOCR.forward expects tgt_input built
token-by-token), not a single feed-forward pass — a naive
`torch.onnx.export(model, ...)` of the whole model does not correctly capture
greedy/beam decoding. This script exports the CNN backbone (feature
extractor) to ONNX, which is the expensive, quantization-worthy part, and
documents the decoding loop as staying in PyTorch (small transformer decoder,
cheap enough on CPU once the CNN features are computed). Revisit this
approach when actually reaching Phase 3 — if CPU latency with a PyTorch
decoder loop proves too slow in practice, a full seq2seq ONNX export (with
explicit encoder/decoder graph separation, as HuggingFace's optimum library
does for similar architectures) is the fallback, not attempted here since
Phase 0 has no trained weights to validate export correctness against yet.

Usage:
    python scripts/export_model.py --checkpoint ../checkpoints/run_20260901_120000
"""

import argparse
from pathlib import Path

import torch
from vietocr.tool.config import Cfg
from vietocr.tool.translate import build_model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--base-checkpoint", type=str, default="vgg_transformer")
    args = parser.parse_args()

    run_dir = Path(args.checkpoint).resolve()
    weights_path = run_dir / "weights.pth"
    if not weights_path.exists():
        raise FileNotFoundError(f"{weights_path} not found — did training finish?")

    config = Cfg.load_config_from_name(args.base_checkpoint)
    config["device"] = "cpu"  # export always targets CPU inference (see plan: Railway has no GPU)

    model, vocab = build_model(config)
    state_dict = torch.load(weights_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    cnn = model.cnn
    dummy_input = torch.randn(1, 3, config["dataset"]["image_height"], 512)

    onnx_path = run_dir / "cnn_backbone.onnx"
    torch.onnx.export(
        cnn,
        dummy_input,
        str(onnx_path),
        input_names=["image"],
        output_names=["features"],
        dynamic_axes={"image": {0: "batch", 3: "width"}, "features": {0: "batch"}},
        opset_version=17,
    )
    print(f"Exported CNN backbone to {onnx_path}")

    # Quantize the CNN backbone (the bulk of the compute) to INT8 for faster
    # CPU inference. The transformer decoder stays in PyTorch (small, run in
    # a Python loop at serve time) — see module docstring caveat above.
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType

        quantized_path = run_dir / "cnn_backbone.int8.onnx"
        quantize_dynamic(str(onnx_path), str(quantized_path), weight_type=QuantType.QInt8)
        print(f"Quantized (INT8) CNN backbone: {quantized_path}")
    except ImportError:
        print("onnxruntime not installed — skipping quantization step.")

    # The decoder + vocab must ship alongside the ONNX backbone for
    # local_ocr_service.py to reconstruct full inference.
    decoder_path = run_dir / "decoder_state_dict.pth"
    torch.save(model.transformer.state_dict(), decoder_path)
    print(f"Saved decoder weights: {decoder_path}")
    print(
        "NOTE: full CPU-inference wiring (loading cnn_backbone.int8.onnx + "
        "decoder_state_dict.pth together) belongs in "
        "services/local_ocr_service.py, built in Phase 3 once accuracy "
        "justifies production integration (see plan doc rollout criteria)."
    )


if __name__ == "__main__":
    main()
