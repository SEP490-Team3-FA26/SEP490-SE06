#!/usr/bin/env python3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

def validate_drawio(file_path: str) -> bool:
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        return False

    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
    except ET.ParseError as err:
        print(f"XML Parse Error in {file_path}: {err}", file=sys.stderr)
        return False

    if root.tag != "mxfile":
        print(f"Warning: Root tag is <{root.tag}> instead of <mxfile>", file=sys.stderr)

    cells = root.findall(".//mxCell")
    cell_ids = set()
    duplicates = []
    edges = []
    vertices = []

    for cell in cells:
        cid = cell.get("id")
        if cid:
            if cid in cell_ids:
                duplicates.append(cid)
            cell_ids.add(cid)

        if cell.get("edge") == "1":
            edges.append(cell)
        elif cell.get("vertex") == "1":
            vertices.append(cell)

    if duplicates:
        print(f"Error: Found duplicate cell IDs: {duplicates}", file=sys.stderr)
        return False

    # Check broken edge references
    broken_edges = []
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source and source not in cell_ids:
            broken_edges.append((edge.get("id"), f"source '{source}' not found"))
        if target and target not in cell_ids:
            broken_edges.append((edge.get("id"), f"target '{target}' not found"))

    if broken_edges:
        print(f"Warning: Found broken edge references: {broken_edges}", file=sys.stderr)

    print("========================================")
    print(f"Draw.io Validation SUCCESS: {path.name}")
    print(f"Total cells:    {len(cells)}")
    print(f"Total vertices: {len(vertices)}")
    print(f"Total edges:    {len(edges)}")
    print("========================================")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 drawio_validator.py <path_to_drawio_file>")
        sys.exit(1)

    file_to_check = sys.argv[1]
    success = validate_drawio(file_to_check)
    sys.exit(0 if success else 1)
