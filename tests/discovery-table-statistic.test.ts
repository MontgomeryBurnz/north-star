import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryEvidenceLedger } from "../src/lib/discovery-fidelity.ts";
import type { DiscoveryEvidenceLedgerItem } from "../src/lib/discovery-fidelity.ts";

const sourceId = "sample-volume-analysis";
const header = "Measure | Current baseline | Target or decision";
const row = "Median request-to-assignment time | 3.8 calendar days | Under 4 business hours; business calendar needs confirmation";

function entries(quote = row): DiscoveryEvidenceLedgerItem[] {
  return [
    { id: "VA-004", sourceId, quote, kind: "fact", statement: "The baseline median request-to-assignment time is 3.8 calendar days." },
    { id: "VA-005", sourceId, quote, kind: "proposal", statement: "The target for median request-to-assignment time is under 4 business hours." }
  ];
}

function review(ledger = entries(), text = `${header}\n${row}`) {
  return reviewDiscoveryEvidenceLedger(ledger, [{ id: sourceId, text }]);
}

test("VA-005 inherits median from its verified table Measure label, not the preceding baseline cell", () => {
  assert.deepEqual(review().errors, []);
  assert.deepEqual(review(entries(`${header}\n${row}`)).errors, []);
});

test("a table statistic fix does not permit median/mean, calendar, value or comparator changes", () => {
  for (const [index, before, after] of [
    [0, "median", "mean"], [1, "median", "mean"], [1, "median ", ""],
    [0, "calendar", "business"], [1, "business", "calendar"], [1, "4", "5"], [1, "under", "at most"]
  ] as const) {
    const changed = entries();
    changed[index].statement = changed[index].statement.replace(before, after);
    assert.ok(review(changed).errors.length > 0, `Unsupported mutation ${before} → ${after} must remain a hard failure.`);
  }
});

test("an unheaded or unrelated table cannot lend its measure statistic to a target", () => {
  for (const source of [row, `Measure | Current condition | Decision\n${row}`, `${header}\nOther measure | 2 days | Under 1 day\n\n${row}`]) {
    const ledger = entries();
    if (source.includes("Other measure")) ledger.push(
      { id: "OTHER-BASE", sourceId, quote: "Other measure | 2 days | Under 1 day", kind: "fact", statement: "The other baseline is 2 days." },
      { id: "OTHER-TARGET", sourceId, quote: "Other measure | 2 days | Under 1 day", kind: "proposal", statement: "The other target is under 1 day." }
    );
    assert.ok(review(ledger, source).errors.some((error) => error.startsWith("VA-005 changes or omits a source measurement statistic")));
  }
});

test("a statistic inside the baseline cell is not the target's measure statistic or modality", () => {
  const localRow = "Request-to-assignment time | Median 3.8 calendar days | Under 4 business hours; business calendar needs confirmation";
  const ledger = entries(localRow);
  ledger[1].statement = "The proposed request-to-assignment target is under 4 business hours.";
  assert.deepEqual(review(ledger, `${header}\n${localRow}`).errors, []);
  ledger[1].statement = "The proposed median request-to-assignment target is under 4 business hours.";
  assert.ok(review(ledger, `${header}\n${localRow}`).errors.some((error) => error.startsWith("VA-005 changes or omits a source measurement statistic")));
});

test("an explicit target-cell statistic overrides the shared measure label and cannot be silently changed", () => {
  for (const target of ["Mean under 4 business hours", "Under 4 business hours (mean)"]) {
    const localRow = `Median request-to-assignment time | 3.8 calendar days | ${target}; business calendar needs confirmation`;
    const ledger = entries(localRow);
    ledger[1].statement = "The proposed mean request-to-assignment target is under 4 business hours.";
    assert.deepEqual(review(ledger, `${header}\n${localRow}`).errors, []);
    ledger[1].statement = ledger[1].statement.replace("mean", "median");
    assert.ok(review(ledger, `${header}\n${localRow}`).errors.some((error) => error.startsWith("VA-005 changes or omits a source measurement statistic")));
  }
});

test("equal-valued measures in different rows retain their own statistics rather than borrowing across rows", () => {
  const other = "Mean callback time | 3.8 calendar days | Under 4 business hours";
  const ledger = [...entries(),
    { id: "OTHER-BASE", sourceId, quote: other, kind: "fact" as const, statement: "The baseline mean callback time is 3.8 calendar days." },
    { id: "OTHER-TARGET", sourceId, quote: other, kind: "proposal" as const, statement: "The proposed mean callback target is under 4 business hours." }
  ];
  const source = `${header}\n${row}\n${other}`;
  assert.deepEqual(review(ledger, source).errors, []);
  ledger[1].statement = ledger[1].statement.replace("median", "mean");
  assert.ok(review(ledger, source).errors.some((error) => error.startsWith("VA-005 changes or omits a source measurement statistic")));
});

test("an eight-week observation window does not become a second median statistic", () => {
  const source = `The baseline observation window is eight weeks.\n${header}\n${row}`;
  const ledger = entries();
  ledger[0].statement += " The observation window is eight weeks.";
  assert.deepEqual(review(ledger, source).errors, []);
  ledger[0].statement = "The baseline median request-to-assignment time is 3.8 calendar days during the eight-week baseline.";
  assert.deepEqual(review(ledger, source).errors, []);
});

test("missing quantitative facts identify their value, unit, comparator and bounded measure context", () => {
  const missing = review(entries().slice(0, 1)).errors.find((error) => error.startsWith(`${sourceId} has a quantitative fact or target missing from the atomic evidence statements.`));
  assert.ok(missing);
  assert.match(missing, /value=4/);
  assert.match(missing, /unit=business hour/);
  assert.match(missing, /comparator=</);
  assert.match(missing, /median request to assignment time/i);
  assert.ok(missing.length < 450);
});

test("a measured observation period in the next row cannot borrow the previous target's statistic", () => {
  const first = "Assignment time | Median 3.8 calendar days | Mean under 4 business hours";
  const second = "Eight-week observation window | Complete | No change";
  const ledger: DiscoveryEvidenceLedgerItem[] = [
    { id: "BASE", sourceId, quote: first, kind: "fact", statement: "The median assignment baseline is 3.8 calendar days." },
    { id: "TARGET", sourceId, quote: first, kind: "proposal", statement: "The proposed mean assignment target is under 4 business hours." },
    { id: "WINDOW", sourceId, quote: second, kind: "fact", statement: "The baseline observation window is eight weeks." }
  ];
  assert.deepEqual(review(ledger, `${header}\n${first}\n${second}`).errors, []);
});
