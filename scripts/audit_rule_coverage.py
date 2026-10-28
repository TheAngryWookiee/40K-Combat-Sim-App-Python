"""Generate a conservative audit of combat-rule coverage across faction JSON files."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


EXCLUDED_JSON_FILES = {"package.json", "package-lock.json", "skills-lock.json", "vercel.json"}
COMBAT_PATTERN = re.compile(
    r"hit roll|wound roll|damage|attacks? (?:have|characteristic)|armour penetration|"
    r"\bap\b|saving throw|save characteristic|feel no pain|lethal hits|sustained hits|"
    r"devastating wounds|precision|ignores cover|torrent|twin-linked|hazardous|anti-|"
    r"critical hit|critical wound|invulnerable save|re-roll (?:hit|wound|damage)|"
    r"subtract 1 from.*hit|add 1 to.*hit|add 1 to.*wound",
    re.IGNORECASE,
)
OPTIONAL_PATTERN = re.compile(
    r"once per (?:battle|phase|turn)|\byou can (?:use|select|choose|activate|attempt|"
    r"replace|change|set)\b|select one of the following",
    re.IGNORECASE,
)


def iter_rules(data: dict[str, Any]) -> Iterable[dict[str, Any]]:
    faction = data.get("faction", {})
    faction_name = faction.get("name", "Unknown")
    for rule in faction.get("army_rules", []):
        if not isinstance(rule, dict):
            continue
        yield {"faction": faction_name, "source": "Army Rule", "kind": "army_rule", "rule": rule}
    for detachment in faction.get("detachments", []):
        detachment_name = detachment.get("name", "Unknown Detachment")
        if detachment.get("rule"):
            yield {
                "faction": faction_name,
                "source": f"{detachment_name} / Detachment Rule",
                "kind": "detachment_rule",
                "rule": detachment["rule"],
            }
        for field, label in (
            ("additional_rules", "Additional Rule"),
            ("enhancements", "Enhancement"),
            ("stratagems", "Stratagem"),
        ):
            for rule in detachment.get(field, []):
                if not isinstance(rule, dict):
                    continue
                yield {
                    "faction": faction_name,
                    "source": f"{detachment_name} / {label}",
                    "kind": field,
                    "rule": rule,
                }
    for unit in data.get("units", []):
        for field, label in (
            ("abilities", "Ability"),
            ("wargear_abilities", "Wargear Ability"),
            ("selectable_abilities", "Selectable Ability"),
        ):
            for rule in unit.get(field, []):
                if not isinstance(rule, dict):
                    continue
                yield {
                    "faction": faction_name,
                    "source": f"{unit.get('name', 'Unknown Unit')} / {label}",
                    "kind": field,
                    "rule": rule,
                }


def rule_text(rule: dict[str, Any]) -> str:
    return " ".join(str(rule.get(field, "")) for field in ("name", "rules_text", "timing", "effect"))


def activation_kind(rule: dict[str, Any], kind: str) -> str:
    explicit = str(rule.get("activation_type", rule.get("activation", ""))).strip().lower()
    if explicit in {"activated", "optional", "selectable"}:
        return "activated"
    if explicit in {"triggered", "automatic", "passive", "mandatory"}:
        return "automatic"
    if kind in {"stratagems", "selectable_abilities"}:
        return "activated"
    return "activated" if OPTIONAL_PATTERN.search(rule_text(rule)) else "automatic"


def quoted_name_is_referenced(name: str, source_code: str) -> bool:
    normalized = name.strip().lower()
    if not normalized:
        return False
    return f'"{normalized}"' in source_code or f"'{normalized}'" in source_code


def audit(root: Path) -> list[dict[str, Any]]:
    source_code = "\n".join(
        path.read_text(encoding="utf-8").lower()
        for path in (root / "combat_engine.py", root / "data_loader.py", root / "frontend" / "src" / "App.jsx")
    )
    findings: list[dict[str, Any]] = []
    for path in sorted(root.glob("*.json")):
        if path.name in EXCLUDED_JSON_FILES:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or "faction" not in data or "units" not in data:
            continue
        for entry in iter_rules(data):
            rule = entry["rule"]
            text = rule_text(rule)
            if not COMBAT_PATTERN.search(text):
                continue
            structured = bool(rule.get("effects"))
            referenced = quoted_name_is_referenced(str(rule.get("name", "")), source_code)
            declared = rule.get("implemented") is True
            if structured or referenced:
                status = "wired"
            elif declared:
                status = "declared_only"
            else:
                status = "missing"
            findings.append(
                {
                    "faction": entry["faction"],
                    "source": entry["source"],
                    "name": rule.get("name", "Unnamed Rule"),
                    "activation": activation_kind(rule, entry["kind"]),
                    "status": status,
                    "implemented_flag": rule.get("implemented"),
                }
            )
    return findings


def write_markdown(path: Path, findings: list[dict[str, Any]]) -> None:
    unresolved = [finding for finding in findings if finding["status"] != "wired"]
    status_counts = Counter(finding["status"] for finding in findings)
    faction_counts = Counter(finding["faction"] for finding in unresolved)
    lines = [
        "# Combat Rule Coverage Audit",
        "",
        "This is a conservative static audit. A rule is `wired` when it has structured effects or its exact name is referenced by the loader, engine, or combat UI. Generic parsers can make some unresolved rows false positives; each row still requires a behavioral test before being marked complete.",
        "",
        "## Summary",
        "",
        f"- Combat-relevant rules scanned: {len(findings)}",
        f"- Wired: {status_counts['wired']}",
        f"- Declared implemented without execution evidence: {status_counts['declared_only']}",
        f"- Missing or unset without execution evidence: {status_counts['missing']}",
        "",
        "## Unresolved By Faction",
        "",
        "| Faction | Candidates |",
        "| --- | ---: |",
    ]
    lines.extend(f"| {faction} | {count} |" for faction, count in faction_counts.most_common())
    lines.extend(
        [
            "",
            "## Unresolved Rules",
            "",
            "| Faction | Source | Rule | Classification | Status | Flag |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for finding in unresolved:
        values = [
            finding["faction"],
            finding["source"],
            finding["name"],
            finding["activation"],
            finding["status"],
            str(finding["implemented_flag"]),
        ]
        lines.append("| " + " | ".join(str(value).replace("|", "\\|") for value in values) + " |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    findings = audit(args.root)
    output = args.output or args.root / "docs" / "rule-coverage-audit.md"
    write_markdown(output, findings)
    counts = Counter(finding["status"] for finding in findings)
    print(f"Scanned {len(findings)} combat-relevant rules: {dict(counts)}")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
