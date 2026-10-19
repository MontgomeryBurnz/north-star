import test from "node:test";
import assert from "node:assert/strict";
import { buildDiscoveryResearchInstructions, researchCitationKey, reviewDiscoveryResearch } from "../src/lib/discovery-research-policy.ts";

test("research instructions require live edition, applicability, direct support and date checks", () => {
  const prompt = buildDiscoveryResearchInstructions("2026-10-18", "Public-sector service requests");
  for (const term of ["2026-10-18", "withdrawn/superseded", "not proof", "Never invent dates", "federal rules are not automatically", "Cybersecurity incident handling is not authority", "source register"]) assert.ok(prompt.includes(term));
  assert.match(prompt, /set-up-and-manage-user-support/);
  assert.match(prompt, /a130revised\.pdf/);
});

test("non-government research is not restricted to a public-sector reference list", () => {
  const prompt = buildDiscoveryResearchInstructions("2026-10-18", "Retail inventory replenishment");
  assert.doesNotMatch(prompt, /primary starting points/);
  assert.match(prompt, /current, directly relevant/);
});

test("known withdrawn NIST editions are rejected across canonical and PDF URLs", () => {
  for (const url of ["https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf?utm_source=openai", "https://csrc.nist.gov/pubs/sp/800/61/r2/final", "https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final", "https://doi.org/10.6028/NIST.SP.800-61r2"]) {
    assert.match(reviewDiscoveryResearch([{ title: "Guide", url }], "Research").errors.join(" "), /withdrawn/);
  }
});

test("superseded A-130 HTML is rejected but the 2016 archive PDF remains eligible", () => {
  const old = "https://obamawhitehouse.archives.gov/sites/default/files/omb/assets/omb/circulars/a130/a130.html?utm_source=openai";
  assert.match(reviewDiscoveryResearch([{ title: "A-130", url: old }], "Research").errors.join(" "), /1996/);
  for (const url of ["https://www.whitehouse.gov/wp-content/uploads/legacy_drupal_files/omb/circulars/A130/a130revised.pdf", "https://obamawhitehouse.archives.gov/sites/default/files/omb/assets/OMB/circulars/a130/a130revised.pdf", "https://csrc.nist.gov/pubs/sp/800/61/r3/final"]) {
    assert.deepEqual(reviewDiscoveryResearch([{ title: "Current primary source", url }], "Research").errors, []);
  }
});

test("plain obsolete links cannot bypass annotation checks; empty/insecure citations fail", () => {
  const current = [{ title: "Form", url: "https://designsystem.digital.gov/components/form/" }];
  assert.match(reviewDiscoveryResearch(current, "See https://csrc.nist.gov/pubs/sp/800/61/r2/final for current practice").errors.join(" "), /withdrawn/);
  assert.match(reviewDiscoveryResearch(current, "Guide: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf.").errors.join(" "), /withdrawn/);
  assert.match(reviewDiscoveryResearch(current, "  ").errors.join(" "), /empty brief/);
  assert.equal(reviewDiscoveryResearch([], "Uncited claims").errors.length, 1);
  assert.match(reviewDiscoveryResearch([{ title: "Insecure", url: "http://example.org" }], "Research").errors.join(" "), /HTTPS/);
});

test("citation keys remove tracking without dropping meaningful query parameters", () => {
  assert.equal(researchCitationKey("https://example.org/policy?edition=2016&utm_source=openai&trk=post#section"), "https://example.org/policy?edition=2016");
  const overLimit = Array.from({ length: 13 }, (_, index) => ({ title: "Source", url: `https://example.org/${index}` }));
  assert.match(reviewDiscoveryResearch(overLimit, "Research").errors.join(" "), /silently truncated/);
});
