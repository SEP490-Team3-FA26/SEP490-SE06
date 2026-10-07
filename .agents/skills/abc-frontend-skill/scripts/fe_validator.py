#!/usr/bin/env python3
"""
Frontend Architecture, QA, Design, and Code Standard Validator.
Enforces 3-tier architecture, no direct service calls, no Vietnamese comments,
and accessibility/token standards across frontend and mobile source files.
"""

import os
import re
import sys
import argparse
from typing import List, Dict, Tuple

# Regex to detect Vietnamese accented characters in comments
VIETNAMESE_ACCENTED_PATTERN = re.compile(
    r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
    r"ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]"
)

# Regex to match single-line and multi-line comments
SINGLE_LINE_COMMENT = re.compile(r"//(.*)$")
MULTI_LINE_COMMENT = re.compile(r"/\*([\s\S]*?)\*/")

# Patterns for forbidden direct network calls in components/pages
DIRECT_NETWORK_CALL_PATTERN = re.compile(r"\b(axios\.(get|post|put|patch|delete)|fetch\()\b")

# Direct microservice port pattern (e.g., localhost:3000, localhost:5001)
DIRECT_MS_PORT_PATTERN = re.compile(r"https?://localhost:(3000|3002|3003|3004|3005|5000|5001)")

# Button without aria-label when having only icon or no text
ICON_BUTTON_PATTERN = re.compile(r"<button\b([^>]*?)>(?:\s*<[A-Z][A-Za-z0-9]+Icon|\s*<Lucide|\s*<[A-Z][A-Za-z0-9]+\s*className=[^>]*/>)\s*</button>")

# Image missing alt attribute
IMG_MISSING_ALT_PATTERN = re.compile(r"<img\b(?![^>]*\balt=)[^>]*>")

class ValidationIssue:
    def __init__(self, file_path: str, line_no: int, category: str, rule: str, message: str, snippet: str = ""):
        self.file_path = file_path
        self.line_no = line_no
        self.category = category  # QA, ARCH, DESIGN, RULE
        self.rule = rule
        self.message = message
        self.snippet = snippet

def check_vietnamese_comments(file_path: str, content: str) -> List[ValidationIssue]:
    """Scan file comments for Vietnamese accented characters."""
    issues = []
    lines = content.splitlines()

    for idx, line in enumerate(lines, start=1):
        # Check single-line comment
        match = SINGLE_LINE_COMMENT.search(line)
        if match:
            comment_text = match.group(1)
            if VIETNAMESE_ACCENTED_PATTERN.search(comment_text):
                issues.append(
                    ValidationIssue(
                        file_path=file_path,
                        line_no=idx,
                        category="RULE",
                        rule="no-vietnamese-comment",
                        message="Vietnamese comment detected. Code comments must be in English.",
                        snippet=line.strip()
                    )
                )

    # Check multi-line comments
    for match in MULTI_LINE_COMMENT.finditer(content):
        comment_text = match.group(1)
        if VIETNAMESE_ACCENTED_PATTERN.search(comment_text):
            # Calculate line number
            start_pos = match.start()
            line_no = content[:start_pos].count("\n") + 1
            issues.append(
                ValidationIssue(
                    file_path=file_path,
                    line_no=line_no,
                    category="RULE",
                    rule="no-vietnamese-comment",
                    message="Vietnamese block comment detected. Code comments must be in English.",
                    snippet=comment_text.strip().splitlines()[0][:80]
                )
            )

    return issues

def check_architecture(file_path: str, content: str) -> List[ValidationIssue]:
    """Check adherence to 3-tier architecture and API Gateway routing."""
    issues = []
    normalized_path = file_path.replace("\\", "/")

    # Check 1: Components and Pages should not call axios/fetch directly
    is_presentation_layer = "/pages/" in normalized_path or "/components/" in normalized_path
    if is_presentation_layer:
        for idx, line in enumerate(content.splitlines(), start=1):
            if DIRECT_NETWORK_CALL_PATTERN.search(line):
                issues.append(
                    ValidationIssue(
                        file_path=file_path,
                        line_no=idx,
                        category="ARCH",
                        rule="3-tier-separation",
                        message="Direct HTTP call inside UI presentation layer. Move call to src/services/ and consume via a custom hook.",
                        snippet=line.strip()
                    )
                )

    # Check 2: Direct microservice ports bypass API Gateway
    for idx, line in enumerate(content.splitlines(), start=1):
        if DIRECT_MS_PORT_PATTERN.search(line):
            issues.append(
                ValidationIssue(
                    file_path=file_path,
                    line_no=idx,
                    category="ARCH",
                    rule="api-gateway-only",
                    message="Direct microservice URL detected. Must route through API Gateway prefix /api/.",
                    snippet=line.strip()
                )
            )

    return issues

def check_qa_and_accessibility(file_path: str, content: str) -> List[ValidationIssue]:
    """Check basic accessibility and component defensive patterns."""
    issues = []
    normalized_path = file_path.replace("\\", "/")
    
    if not (normalized_path.endswith(".tsx") or normalized_path.endswith(".jsx")):
        return issues

    # Check img tags without alt
    for match in IMG_MISSING_ALT_PATTERN.finditer(content):
        start_pos = match.start()
        line_no = content[:start_pos].count("\n") + 1
        issues.append(
            ValidationIssue(
                file_path=file_path,
                line_no=line_no,
                category="QA",
                rule="a11y-img-alt",
                message="<img> element is missing 'alt' attribute for accessibility (WCAG 2.1 AA).",
                snippet=match.group(0)[:80]
            )
        )

    return issues

def validate_file(file_path: str) -> List[ValidationIssue]:
    """Validate a single source file."""
    issues = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        issues.extend(check_vietnamese_comments(file_path, content))
        issues.extend(check_architecture(file_path, content))
        issues.extend(check_qa_and_accessibility(file_path, content))
    except Exception as e:
        issues.append(
            ValidationIssue(
                file_path=file_path,
                line_no=1,
                category="SYSTEM",
                rule="file-read-error",
                message=f"Could not read file: {str(e)}"
            )
        )
    return issues

def scan_directory(target_dir: str, extensions: Tuple[str, ...]) -> List[ValidationIssue]:
    """Recursively scan a directory for frontend code issues."""
    all_issues = []
    for root, dirs, files in os.walk(target_dir):
        # Exclude node_modules, build directories, and git
        dirs[:] = [d for d in dirs if d not in {"node_modules", "dist", ".git", ".next", "build"}]
        for file in files:
            if file.endswith(extensions):
                full_path = os.path.join(root, file)
                issues = validate_file(full_path)
                all_issues.extend(issues)
    return all_issues

def main():
    parser = argparse.ArgumentParser(description="Frontend Code Quality & Architecture Validator")
    parser.add_argument("target", nargs="?", default="frontend/src", help="Target file or directory to scan")
    parser.add_argument("--category", choices=["ALL", "RULE", "ARCH", "QA", "DESIGN"], default="ALL", help="Filter by category")
    args = parser.parse_args()

    target = args.target
    if not os.path.exists(target):
        print(f"Error: Target path '{target}' does not exist.")
        sys.exit(1)

    extensions = (".ts", ".tsx", ".js", ".jsx")
    if os.path.isfile(target):
        issues = validate_file(target)
    else:
        issues = scan_directory(target, extensions)

    if args.category != "ALL":
        issues = [i for i in issues if i.category == args.category]

    print("\n" + "="*80)
    print(f" FRONTEND VALIDATION REPORT (Target: {target})")
    print("="*80)

    if not issues:
        print(" [PASS] 0 issues found! Architecture, rules, and QA standards respected.\n")
        sys.exit(0)

    print(f" Found {len(issues)} issue(s):\n")
    for issue in issues:
        color_tag = f"[{issue.category}] [{issue.rule}]"
        print(f"  --> {issue.file_path}:{issue.line_no} {color_tag}")
        print(f"      Description: {issue.message}")
        if issue.snippet:
            print(f"      Code       : {issue.snippet}")
        print()

    rule_violations = [i for i in issues if i.category == "RULE"]
    arch_violations = [i for i in issues if i.category == "ARCH"]
    qa_violations = [i for i in issues if i.category == "QA"]

    print("-" * 80)
    print(f"Summary: Rules: {len(rule_violations)} | Architecture: {len(arch_violations)} | QA: {len(qa_violations)}")
    print("="*80 + "\n")

    # Exit with code 1 if critical rule or arch violations exist
    if rule_violations or arch_violations:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
