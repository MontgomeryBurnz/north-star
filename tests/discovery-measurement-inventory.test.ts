import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscoveryMeasurementInventory, reviewDiscoveryEvidenceLedger } from "../src/lib/discovery-fidelity.ts";

const table = "Measure | Current baseline | Target or decision\nRegional offices | 12 | Pilot 3 before scale-up\nMedian request-to-assignment time | 3.8 calendar days | Under 4 business hours; business calendar needs confirmation";

test("inventory makes a verified bare baseline count explicit without supplying an unlabeled pilot unit", () => {
  const sources = [{ id: "VOLUME", text: table }];
  const before = structuredClone(sources);
  const [inventory] = buildDiscoveryMeasurementInventory(sources);
  assert.equal(inventory.totalMeasurements, 3);
  assert.equal(inventory.truncated, false);
  assert.deepEqual(inventory.measurements.map(({ value, unit, countScope, statistic, comparator }) => ({ value, unit, countScope, statistic, comparator })), [
    { value: 12, unit: "office", countScope: "baseline", statistic: undefined, comparator: "" },
    { value: 3.8, unit: "calendar day", countScope: undefined, statistic: "median", comparator: "" },
    { value: 4, unit: "business hour", countScope: undefined, statistic: "median", comparator: "<" }
  ]);
  assert.match(inventory.measurements[0].normalizedSourceContext, /measure \| current baseline.*\nregional offices \| 12 \| pilot 3/);
  assert.equal(inventory.measurements.some(item => item.value === 3), false);
  assert.deepEqual(sources, before);
});

test("missing, proposed and wrong baseline columns never manufacture a bare count", () => {
  for (const text of [
    "Regional offices | 12 | Pilot 3 before scale-up",
    table.replace("Current baseline", "Proposed baseline"),
    table.replace("Current baseline", "Target"),
    table.replace("Regional offices | 12", "Regional offices | Estimated 12")
  ]) assert.equal(buildDiscoveryMeasurementInventory([{ id: "S", text }])[0].measurements.some(item => item.value === 12), false, text);
  const regionTable = table.replace("Regional offices", "Regions");
  assert.equal(buildDiscoveryMeasurementInventory([{ id: "S", text: regionTable }])[0].measurements[0].unit, "region");
});

test("inventory preserves observation windows and flags bounded context and measurement truncation", () => {
  const text = "Median assignment time is 3.8 calendar days during the eight-week baseline.";
  const [ordinary] = buildDiscoveryMeasurementInventory([{ id: "S", text }]);
  assert.equal(ordinary.measurements[0].statistic, "median");
  assert.equal(ordinary.measurements[1].value, 8);
  assert.equal(ordinary.measurements[1].unit, "week");
  assert.equal(ordinary.measurements[1].statistic, undefined);
  const sources = Array.from({ length: 16 }, (_, index) => ({ id: `S${index}`, text: `${"source context ".repeat(60)}${Array.from({ length: 20 }, (_, day) => `${day + 1} days`).join("; ")}` }));
  const inventory = buildDiscoveryMeasurementInventory(sources);
  assert.equal(inventory.reduce((count, item) => count + item.measurements.length, 0), 128);
  assert.ok(inventory.every(item => item.totalMeasurements === 20 && item.truncated));
  assert.ok(inventory[0].measurements[0].contextTruncated);
  assert.ok(inventory.every(item => item.measurements.every(measurement => measurement.normalizedSourceContext.length <= 320)));
});

test("inventory cannot satisfy missing ledger statements, alter ledger entries or relax quantitative checks", () => {
  const source = { id: "S", text: "Measure | Current baseline | Target or decision\nRegional offices | 12 | Pilot 3 before scale-up" };
  buildDiscoveryMeasurementInventory([source]);
  const ledger = [{ id: "E1", sourceId: "S", kind: "fact" as const, quote: source.text, statement: "A pilot is under consideration." }];
  const before = structuredClone(ledger);
  assert.match(reviewDiscoveryEvidenceLedger(ledger, [source]).errors.join(" "), /Missing measurement: value=12; unit=office/);
  assert.deepEqual(ledger, before);
  ledger[0].statement = "The current baseline is 12 regions.";
  assert.match(reviewDiscoveryEvidenceLedger(ledger, [source]).errors.join(" "), /changes or invents a source measurement/);
});
