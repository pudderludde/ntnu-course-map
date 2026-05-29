#!/usr/bin/env python3
"""
Scrape TMA course data from ntnu.edu and output courses.json.
Run from the project root: python3 scraper/scrape.py
"""

import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.ntnu.edu/studies/courses"

# Matches shorthand like TMA4100/05/10/15 or TMA4110/4115
_SHORTHAND_RE = re.compile(r"\b([A-Z]{2,5}\d{2})(\d{2})((?:/\d{2,4})+)")
# Matches standalone full codes like TMA4100
_STANDALONE_RE = re.compile(r"\b([A-Z]{2,5}\d{4,5})\b")
# Matches "Calculus 1-4" or "Mathematics 1-4" style ranges
_CALC_RANGE_RE = re.compile(r"(?:calculus|mathematics)\s+(\d+)\s*[-–]\s*(\d+)", re.I)
# Matches "Calculus 1" or "Mathematics 2" style singles (for building the lookup)
_CALC_SINGLE_RE = re.compile(r"(?:calculus|mathematics)\s+(\d+)", re.I)

SEED_CODES = [
    "TMA4100", "TMA4105", "TMA4106", "TMA4110", "TMA4115", "TMA4120",
    "TMA4125", "TMA4130", "TMA4135", "TMA4140", "TMA4145",
    "TMA4150", "TMA4160", "TMA4165", "TMA4175", "TMA4180",
    "TMA4185", "TMA4190", "TMA4195", "TMA4200", "TMA4205", "TMA4210",
    "TMA4212", "TMA4215", "TMA4220", "TMA4225", "TMA4230", "TMA4235",
    "TMA4240", "TMA4245", "TMA4250", "TMA4255", "TMA4260", "TMA4265",
    "TMA4267", "TMA4268", "TMA4270", "TMA4275", "TMA4280", "TMA4285",
    "TMA4290", "TMA4295", "TMA4300", "TMA4305", "TMA4310", "TMA4315",
    "TMA4320", "TMA4325",
]


# Splits at "Alternatively, the courses …" or ". or the courses …" etc.
_ALT_SPLIT_RE = re.compile(
    r"(?:[.;]\s+|\s+)(?:Alternatively|or the courses?|or equivalent[,.]?\s+[Tt]he courses?)[,:]?\s+",
    re.IGNORECASE,
)


def primary_prereq_text(text: str) -> str:
    """Return only the first (primary) alternative from a prerequisite string."""
    parts = _ALT_SPLIT_RE.split(text, maxsplit=1)
    return parts[0].strip()


# ── Code extraction ────────────────────────────────────────────────────────────

def extract_codes(text: str, self_code: str) -> list[str]:
    """Extract course codes from text, expanding shorthands like TMA4100/05/10/15."""
    codes: list[str] = []
    shorthand_spans: list[tuple[int, int]] = []

    for m in _SHORTHAND_RE.finditer(text):
        prefix = m.group(1)
        codes.append(prefix + m.group(2))
        for extra in re.findall(r"\d{2,4}", m.group(3)):
            codes.append(prefix + extra[-2:])
        shorthand_spans.append((m.start(), m.end()))

    for m in _STANDALONE_RE.finditer(text):
        if not any(s <= m.start() < e for s, e in shorthand_spans):
            codes.append(m.group(1))

    seen: set[str] = set()
    result: list[str] = []
    for c in codes:
        if c != self_code and c not in seen:
            seen.add(c)
            result.append(c)
    return result


# ── Credit reductions ──────────────────────────────────────────────────────────

def parse_full_equivalents(soup: BeautifulSoup, course_credits: float) -> list[str]:
    """Return codes whose credit reduction equals the full course credits (i.e. fully equivalent)."""
    h3 = soup.find("h3", string=lambda t: t and "credit reduction" in t.lower())
    if not h3:
        return []
    table = h3.find_next("table")
    if not table:
        return []

    equivalents: list[str] = []
    for row in table.find_all("tr")[1:]:
        cols = row.find_all("td")
        if len(cols) < 2:
            continue
        code = cols[0].get_text(strip=True)
        m = re.search(r"(\d+[.,]\d+|\d+)", cols[1].get_text())
        if m:
            reduction = float(m.group(1).replace(",", "."))
            if abs(reduction - course_credits) < 0.05:
                equivalents.append(code)
    return equivalents


# ── Fetch a single course page ─────────────────────────────────────────────────

def fetch_course(code: str) -> dict | None:
    url = f"{BASE_URL}/{code}"
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "ntnu-course-map/1.0 (github.com/ludvikbraathen/ntnu-course-map)"})
        if resp.status_code != 200:
            print(f"  SKIP {code}: HTTP {resp.status_code}")
            return None
    except Exception as e:
        print(f"  ERROR {code}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Course name
    portlet_h2 = soup.find("h2", string="course-details-portlet")
    name_h1 = portlet_h2.find_next("h1") if portlet_h2 else None
    name = name_h1.get_text(strip=True) if name_h1 else ""
    if not name or name.lower() in {"navigation", "studies", "about"}:
        print(f"  SKIP {code}: could not parse name (got {name!r})")
        return None

    page_text = soup.get_text(" ")
    if "no courses with this code" in page_text.lower():
        print(f"  SKIP {code}: no courses for this code")
        return None

    # Credits
    credits_val = 0.0
    credits_label = soup.find("span", class_="course-fact-label")
    if credits_label:
        credits_span = credits_label.find_next_sibling("span", class_="course-fact-value")
        if credits_span:
            m = re.search(r"(\d+[.,]\d+|\d+)", credits_span.get_text())
            if m:
                credits_val = float(m.group(1).replace(",", "."))

    # Prerequisites text
    prereq_text = ""
    h3_prereq = soup.find("h3", string=lambda t: t and "previous knowledge" in t.lower())
    if h3_prereq:
        sib = h3_prereq.find_next_sibling()
        if sib:
            prereq_text = sib.get_text(strip=True)

    primary_text = primary_prereq_text(prereq_text)
    prereq_codes = extract_codes(primary_text, code)

    # Full equivalents from credit reductions table
    raw_equivalents = parse_full_equivalents(soup, credits_val)

    # Description
    description = ""
    h3_content = soup.find("h3", string=lambda t: t and "course content" in t.lower())
    if h3_content:
        for p in h3_content.find_next_siblings(["p", "div"]):
            text = p.get_text(strip=True)
            if len(text) > 60:
                description = text[:400]
                break

    print(f"  OK  {code}: {name!r} ({credits_val} sp) | prereqs: {prereq_codes} | equiv: {raw_equivalents}")
    return {
        "code": code,
        "name": name,
        "credits": credits_val,
        "description": description,
        "prerequisites": prereq_text,
        "prerequisiteCodes": prereq_codes,
        "_primaryPrereqText": primary_text,
        "_rawEquivalents": raw_equivalents,
    }


# ── Post-processing ────────────────────────────────────────────────────────────

def build_equivalence_groups(courses: list[dict]) -> dict[str, str]:
    """Union-Find over courses linked by full credit reductions. Returns code→canonical map."""
    known = {c["code"] for c in courses}
    parent: dict[str, str] = {c["code"]: c["code"] for c in courses}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for c in courses:
        for eq in c["_rawEquivalents"]:
            if eq in known:
                union(c["code"], eq)

    # For each root group, pick canonical = most referenced as a prerequisite (ties: TMA-prefix wins)
    prereq_counts: dict[str, int] = {}
    for c in courses:
        for dep in c["prerequisiteCodes"]:
            prereq_counts[dep] = prereq_counts.get(dep, 0) + 1

    groups: dict[str, list[str]] = {}
    for code in parent:
        groups.setdefault(find(code), []).append(code)

    canonical_map: dict[str, str] = {}
    for members in groups.values():
        if len(members) == 1:
            canonical_map[members[0]] = members[0]
        else:
            tma = [m for m in members if m.startswith("TMA")]
            pool = tma if tma else members
            canonical = max(pool, key=lambda c: prereq_counts.get(c, 0))
            for m in members:
                canonical_map[m] = canonical

    return canonical_map


def build_calculus_lookup(courses: list[dict], canonical_map: dict[str, str]) -> dict[str, list[str]]:
    """Map "mathematics 1", "calculus 2", etc. to canonical course codes by name matching."""
    lookup: dict[str, list[str]] = {}
    for c in courses:
        if canonical_map.get(c["code"]) != c["code"]:
            continue  # only index canonical courses
        for m in _CALC_SINGLE_RE.finditer(c["name"].lower()):
            key = m.group(0)  # e.g. "mathematics 1"
            if c["code"] not in lookup.get(key, []):
                lookup.setdefault(key, []).append(c["code"])
    return lookup


def expand_calculus_ranges(prereq_text: str, calc_lookup: dict[str, list[str]]) -> list[str]:
    """Turn 'Calculus 1-4' into a list of canonical course codes."""
    codes: list[str] = []
    for m in _CALC_RANGE_RE.finditer(prereq_text):
        start, end = int(m.group(1)), int(m.group(2))
        for n in range(start, end + 1):
            for prefix in ("calculus", "mathematics"):
                codes.extend(calc_lookup.get(f"{prefix} {n}", []))
    return list(dict.fromkeys(codes))


def postprocess(raw: list[dict]) -> list[dict]:
    canonical_map = build_equivalence_groups(raw)
    calc_lookup = build_calculus_lookup(raw, canonical_map)

    courses = []
    for c in raw:
        canon = canonical_map[c["code"]]

        # Remap prerequisite codes to their canonical codes (drop unknown)
        remapped: list[str] = []
        seen: set[str] = set()
        for dep in c["prerequisiteCodes"]:
            mapped = canonical_map.get(dep, dep)
            if mapped != canon and mapped not in seen and mapped in canonical_map:
                seen.add(mapped)
                remapped.append(mapped)

        # Add codes from "Calculus N-M" patterns (primary path only)
        for extra in expand_calculus_ranges(c["_primaryPrereqText"], calc_lookup):
            if extra != canon and extra not in seen and extra in canonical_map:
                seen.add(extra)
                remapped.append(extra)

        # Equivalents in same group (excluding self)
        equiv = sorted(
            {m for m, can in canonical_map.items() if can == canon and m != c["code"]}
            & {x["code"] for x in raw}
        )

        courses.append({
            "code": c["code"],
            "name": c["name"],
            "credits": c["credits"],
            "description": c["description"],
            "prerequisites": c["prerequisites"],
            "prerequisiteCodes": remapped,
            "equivalentCodes": equiv,
            "canonicalCode": canon,
        })


    return courses


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    visited: set[str] = set()
    queue: list[str] = list(SEED_CODES)
    raw: list[dict] = []

    while queue:
        code = queue.pop(0)
        if code in visited:
            continue
        visited.add(code)
        print(f"Fetching {code}...")
        course = fetch_course(code)
        if course:
            raw.append(course)
            for dep in course["prerequisiteCodes"] + course["_rawEquivalents"]:
                if dep not in visited:
                    queue.append(dep)
        time.sleep(0.5)

    print("\nPost-processing equivalence groups and calculus ranges...")
    courses = postprocess(raw)

    # Report groups
    groups: dict[str, list[str]] = {}
    for c in courses:
        groups.setdefault(c["canonicalCode"], []).append(c["code"])
    for canon, members in groups.items():
        if len(members) > 1:
            print(f"  Group [{canon}]: {members}")

    out_path = Path(__file__).parent.parent / "src" / "data" / "courses.json"
    out_path.write_text(json.dumps(courses, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(courses)} courses to {out_path}")


if __name__ == "__main__":
    main()
