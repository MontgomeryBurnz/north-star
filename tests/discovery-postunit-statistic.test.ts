import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscoveryMeasurementInventory, reviewDiscoveryEvidenceLedger } from "../src/lib/discovery-fidelity.ts";

function fixture(statistic = "Median") {
  const quote = `${statistic} request-to-assignment time | 3.8 calendar days | Under 4 business hours; business calendar needs confirmation`;
  return {
    sources: [{ id: "SRC1", text: `Measure | Current baseline | Target or decision\n${quote}` }],
    ledger: [
      { id: "BASE", sourceId: "SRC1", quote, kind: "fact" as const, statement: `${statistic} request-to-assignment time is 3.8 calendar days.` },
      { id: "VA-006", sourceId: "SRC1", quote, kind: "open-question" as const, statement: `The business calendar for the under-4-business-hours ${statistic.toLowerCase()} request-to-assignment target needs confirmation.` }
    ]
  };
}

test("the exact VA-006 immediate post-unit median modifier preserves the source statistic", () => {
  const value = fixture();
  const result = reviewDiscoveryEvidenceLedger(value.ledger, value.sources);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ledger[1].kind, "open-question");
});

test("whitespace and hyphen normalization retain directly bound median, mean and average modifiers", () => {
  for (const statistic of ["Median", "Mean", "Average"]) {
    const value = fixture(statistic);
    for (const unit of ["under-4-business-hours", "under 4 business hours"]) {
      value.ledger[1].statement = `The business calendar for the ${unit} ${statistic.toLowerCase()} request-to-assignment target needs confirmation.`;
      assert.deepEqual(reviewDiscoveryEvidenceLedger(value.ledger, value.sources).errors, [], value.ledger[1].statement);
    }
  }
});

test("a post-unit statistic cannot change the source median to mean or average, or mean to median", () => {
  for (const [sourceStatistic, assertedStatistic] of [["Median", "mean"], ["Median", "average"], ["Mean", "median"]]) {
    const value = fixture(sourceStatistic);
    value.ledger[1].statement = `The business calendar for the under-4-business-hours ${assertedStatistic} request-to-assignment target needs confirmation.`;
    assert.match(reviewDiscoveryEvidenceLedger(value.ledger, value.sources).errors.join(" "), /VA-006 changes or omits a source measurement statistic/);
  }
});

test("a directly bound changed statistic cannot hide behind an earlier source-matching prefix", () => {
  const value = fixture();
  value.ledger[1].statement = "Median reporting is reviewed before the under-4-business-hours mean request-to-assignment target; the business calendar needs confirmation.";
  assert.match(reviewDiscoveryEvidenceLedger(value.ledger, value.sources).errors.join(" "), /VA-006 changes or omits a source measurement statistic/);
});

test("a source-matching post-unit statistic cannot conceal a conflicting attached pre-unit statistic", () => {
  for (const [sourceStatistic, prefixStatistic] of [["Median", "mean"], ["Mean", "median"]]) {
    const value = fixture(sourceStatistic);
    value.ledger[1].statement = `The ${prefixStatistic} request-to-assignment time is under 4 business hours ${sourceStatistic.toLowerCase()} request-to-assignment target; the business calendar needs confirmation.`;
    assert.match(reviewDiscoveryEvidenceLedger(value.ledger, value.sources).errors.join(" "), /VA-006 changes or omits a source measurement statistic/);
  }
});

test("a separate preceding measurement cannot create a false attached-statistic conflict", () => {
  const baseline = "Mean case duration is 3.8 calendar days.";
  const target = "The business calendar for the under 4 business hours median request-to-assignment target needs confirmation.";
  const text = `${baseline} ${target}`;
  for (const joiner of ["; ", ", and ", " and "]) {
    const ledger = [
      { id: "BASE", sourceId: "SRC1", quote: baseline, kind: "fact" as const, statement: baseline },
      { id: "TARGET", sourceId: "SRC1", quote: text, kind: "open-question" as const, statement: `Mean case duration is 3.8 calendar days${joiner}${target}` }
    ];
    assert.deepEqual(reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text }]).errors, [], joiner);
  }
});

test("stacked conflicting post-unit statistics are not accepted as a measurement noun phrase", () => {
  const value = fixture();
  value.ledger[1].statement = "The business calendar for the under 4 business hours median mean request-to-assignment target needs confirmation.";
  assert.match(reviewDiscoveryEvidenceLedger(value.ledger, value.sources).errors.join(" "), /VA-006 changes or omits a source measurement statistic/);
});

test("a post-unit statistic cannot be borrowed across punctuation, another table cell or a new row", () => {
  for (const boundary of [", ", "; ", ". ", " | ", "\n"]) {
    const value = fixture();
    value.ledger[1].statement = `The business calendar for the under 4 business hours${boundary}median request-to-assignment target needs confirmation.`;
    assert.match(reviewDiscoveryEvidenceLedger(value.ledger, value.sources).errors.join(" "), /VA-006 changes or omits a source measurement statistic/, JSON.stringify(boundary));
  }
});

test("an unrelated baseline or observation statistic cannot qualify the preceding target", () => {
  for (const phrase of ["median baseline assignment time", "median observation time", "median request-to-assignment baseline target"]) {
    const value = fixture();
    value.ledger[1].statement = `The business calendar for the under 4 business hours ${phrase} needs confirmation.`;
    assert.match(reviewDiscoveryEvidenceLedger(value.ledger, value.sources).errors.join(" "), /VA-006 changes or omits a source measurement statistic/, phrase);
  }
});

test("source-derived measurement inventory recognizes the same direct prose modifier", () => {
  const text = "The business calendar for the under-4-business-hours median request-to-assignment target needs confirmation.";
  const inventory = buildDiscoveryMeasurementInventory([{ id: "POSTFIX", text }]);
  assert.equal(inventory[0].measurements[0].statistic, "median");
});
