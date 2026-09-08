#!/usr/bin/env python3
"""Validate and summarize raw synthetic controller/Redis trials, not video or HTTP load."""
import collections
import gzip
import json
import math
from pathlib import Path
import sys

SCENARIOS = {"delayed-poll-after-match", "six-entry-and-poll",
             "duplicate-first-entry", "stale-room-cleanup"}

def p95(values):
    ordered = sorted(values)
    return ordered[math.ceil(len(ordered) * .95) - 1] / 1_000_000 if ordered else None

def summarize(directory):
    report = {"scope": "synthetic local controller + real Redis; no HTTP network/video",
              "latency_definition": "System.nanoTime around real controller call; barrier wait excluded except controlled delay scenario",
              "versions": {}}
    denominators = set()
    for version in ("before", "after", "candidate"):
        raw = directory / (version + ".jsonl")
        if raw.exists():
            lines = raw.read_text().splitlines()
        else:
            with gzip.open(raw.with_suffix(".jsonl.gz"), "rt") as stream:
                lines = stream.read().splitlines()
        records = [json.loads(line) for line in lines]
        grouped = collections.defaultdict(list)
        for record in records:
            if record.get("harnessError"):
                raise ValueError("Harness failure: " + str(record))
            if record["version"] != version:
                raise ValueError("Mismatched version")
            grouped[record["scenario"]].append(record)
        if set(grouped) != SCENARIOS:
            raise ValueError("Missing/unexpected scenarios")
        result = {}
        for scenario, all_trials in grouped.items():
            warmup = [r for r in all_trials if r["warmup"]]
            trials = [r for r in all_trials if not r["warmup"]]
            if sorted(r["iteration"] for r in warmup) != [-3, -2, -1]:
                raise ValueError("Expected exactly three warmup trials")
            if sorted(r["iteration"] for r in trials) != list(range(len(trials))) or not trials:
                raise ValueError("Missing/duplicate measured iteration")
            denominators.add(len(trials))
            calls = [c for r in trials for c in r["requests"]]
            expected_calls = {"delayed-poll-after-match": 7, "six-entry-and-poll": 22,
                              "duplicate-first-entry": 16, "stale-room-cleanup": 0}[scenario]
            for trial in all_trials:
                if sorted(c["call"] for c in trial["requests"]) != list(range(expected_calls)):
                    raise ValueError("Missing/duplicate controller call")
            failures = sum("exception" in c for c in calls)
            rejected = sum(c.get("success") is False for c in calls)
            item = {
                "trials": len(trials),
                "invariant_violation_trials": sum(r["invariantViolation"] for r in trials),
                "matched_in_queue_trials": sum(r["state"]["matchedUsersInQueue"] > 0 for r in trials),
                "multiple_room_trials": sum(r["state"]["usersInMultipleRooms"] > 0 for r in trials),
                "capacity_violation_trials": sum(r["state"]["capacityViolations"] > 0 for r in trials),
                "lost_new_assignment_trials": sum(r["lostNewRoomAssignment"] for r in trials),
                "controller_calls": len(calls),
                "controller_exceptions": failures,
                "business_rejections": rejected,
                "business_rejection_rate": rejected / len(calls) if calls else None,
            }
            if scenario in {"six-entry-and-poll", "duplicate-first-entry"}:
                item["all_calls_p95_ms"] = p95([c["durationNanos"] for c in calls])
                item["successful_calls_p95_ms"] = p95([c["durationNanos"] for c in calls if c.get("success")])
                item["trial_p95_ms"] = [p95([c["durationNanos"] for c in r["requests"]]) for r in trials]
            result[scenario] = item
        report["versions"][version] = result
    if len(denominators) != 1:
        raise ValueError("Unequal conditions: iteration counts differ")
    return report

if __name__ == "__main__":
    print(json.dumps(summarize(Path(sys.argv[1])), indent=2, ensure_ascii=False))
