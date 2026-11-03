#!/usr/bin/env python3
"""
Automated UI QA, Accessibility, and Test Coverage Auditor for WDP301 Frontend.
Audits React components for responsive layouts, accessibility (WCAG 2.1 AA),
defensive rendering, and E2E test coverage.
"""

import os
import re
import sys
import argparse
from typing import List, Dict

FIXED_PIXEL_WIDTH_PATTERN = re.compile(r'\b(w-\[\d{3,4}px\]|min-w-\[\d{3,4}px\])\b')
BUTTON_WITHOUT_TEXT_OR_ARIA = re.compile(r'<button(?![^>]*\baria-label=)[^>]*>(?:\s*<[A-Za-z0-9]+\s*className=[^>]*/>\s*)</button>')
INPUT_WITHOUT_ID_OR_LABEL = re.compile(r'<input(?![^>]*\b(id|aria-label|aria-labelledby)=)[^>]*>')
UNPROTECTED_ARRAY_MAP = re.compile(r'\{([a-zA-Z0-9_]+)\.map\(')

class QAFinding:
    def __init__(self, file_path: str, line_no: int, check_type: str, severity: str, message: str, snippet: str = ""):
        self.file_path = file_path
        self.line_no = line_no
        self.check_type = check_type  # A11Y, RESPONSIVE, DEFENSIVE, TEST_COVERAGE
        self.severity = severity      # HIGH, MEDIUM, LOW
        self.message = message
        self.snippet = snippet

def audit_file(file_path: str) -> List[QAFinding]:
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        return findings

    lines = content.splitlines()

    for idx, line in enumerate(lines, start=1):
        # 1. Responsive check: Flag hardcoded fixed pixel widths that break mobile viewports
        match_fixed = FIXED_PIXEL_WIDTH_PATTERN.search(line)
        if match_fixed:
            findings.append(
                QAFinding(
                    file_path=file_path,
                    line_no=idx,
                    check_type="RESPONSIVE",
                    severity="MEDIUM",
                    message=f"Hardcoded fixed width '{match_fixed.group(1)}' breaks mobile responsiveness. Use responsive classes (e.g., w-full max-w-4xl).",
                    snippet=line.strip()
                )
            )

        # 2. Accessibility check: Form inputs should have an id or aria-label for screen readers
        if "<input" in line and not any(attr in line for attr in ["id=", "aria-label=", "aria-labelledby="]):
            findings.append(
                QAFinding(
                    file_path=file_path,
                    line_no=idx,
                    check_type="A11Y",
                    severity="HIGH",
                    message="Form input missing 'id' or 'aria-label' attribute. Required for WCAG 2.1 AA accessibility.",
                    snippet=line.strip()
                )
            )

        # 3. Defensive rendering check: Direct array.map() without optional chaining or default fallback
        map_match = UNPROTECTED_ARRAY_MAP.search(line)
        if map_match:
            var_name = map_match.group(1)
            # Check if previous characters have ?.
            if not f"{var_name}?." in line and not f"({var_name} || [])" in line:
                findings.append(
                    QAFinding(
                        file_path=file_path,
                        line_no=idx,
                        check_type="DEFENSIVE",
                        severity="LOW",
                        message=f"Potential null pointer error: '{var_name}.map' without optional chaining or fallback array. Use '{var_name}?.map' or '({var_name} || []).map'.",
                        snippet=line.strip()
                    )
                )

    return findings

def audit_test_coverage(pages_dir: str, tests_dir: str) -> List[Dict[str, str]]:
    """Compare page files with E2E test files."""
    pages = []
    if os.path.exists(pages_dir):
        for root, _, files in os.walk(pages_dir):
            for file in files:
                if file.endswith((".tsx", ".jsx")) and not file.startswith("_"):
                    page_name = os.path.splitext(file)[0].lower()
                    rel_path = os.path.relpath(os.path.join(root, file), pages_dir)
                    pages.append({"name": page_name, "path": rel_path})

    existing_tests = []
    if os.path.exists(tests_dir):
        for root, _, files in os.walk(tests_dir):
            for file in files:
                if file.endswith((".spec.ts", ".test.ts", ".spec.js", ".test.js")):
                    existing_tests.append(file.lower())

    coverage_report = []
    for p in pages:
        has_test = any(p["name"] in t or t.replace(".spec.ts", "").replace("-", "") in p["name"].replace("-", "") for t in existing_tests)
        coverage_report.append({
            "page": p["path"],
            "covered": "YES" if has_test else "NO"
        })
    return coverage_report

def main():
    parser = argparse.ArgumentParser(description="Audits Frontend Code for QA, Accessibility, and Test Coverage")
    parser.add_argument("target", nargs="?", default="frontend/src", help="Directory to scan")
    parser.add_argument("--check-tests", action="store_true", default=True, help="Analyze E2E test coverage")
    args = parser.parse_args()

    target = args.target
    if not os.path.exists(target):
        print(f"Error: Target path '{target}' not found.")
        sys.exit(1)

    print("\n" + "="*80)
    print(f" UI QA & ACCESSIBILITY AUDIT REPORT ({target})")
    print("="*80)

    findings: List[QAFinding] = []
    for root, dirs, files in os.walk(target):
        dirs[:] = [d for d in dirs if d not in {"node_modules", "dist", ".git", ".next", "build"}]
        for file in files:
            if file.endswith((".tsx", ".jsx")):
                full_path = os.path.join(root, file)
                findings.extend(audit_file(full_path))

    if findings:
        print(f"\nDiscovered {len(findings)} potential UI/UX & QA recommendation(s):\n")
        for f in findings:
            print(f"  [{f.severity}] [{f.check_type}] {f.file_path}:{f.line_no}")
            print(f"     Problem: {f.message}")
            if f.snippet:
                print(f"     Snippet: {f.snippet}")
            print()
    else:
        print("\n [PASS] No accessibility, defensive, or fixed-width layout defects found.")

    if args.check_tests:
        pages_dir = "frontend/src/pages"
        tests_dir = "frontend/tests/e2e"
        coverage = audit_test_coverage(pages_dir, tests_dir)
        covered_count = sum(1 for c in coverage if c["covered"] == "YES")
        total_pages = len(coverage)

        print("-" * 80)
        print(f"E2E Test Coverage Summary: {covered_count}/{total_pages} pages mapped with E2E tests.")
        print("-" * 80)

    print("="*80 + "\n")

if __name__ == "__main__":
    main()
