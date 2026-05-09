/**
 * SKILL.md — Structural Validation
 *
 * Confirms that every anti-pattern AP-001 through AP-020 is present in SKILL.md.
 * These are the core teaching patterns that the skill document must contain
 * to be useful for AI agents building FHEVM contracts.
 *
 * Run with: npm test
 */

import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

const SKILL_PATH = path.resolve(__dirname, "../../confidential-skill/SKILL.md");
const SKILL_CONTENT = fs.readFileSync(SKILL_PATH, "utf8");

describe("SKILL.md — Structural Validation", function () {
  it("SKILL.md should exist and be non-empty", function () {
    expect(SKILL_CONTENT.length).to.be.gt(1000, "SKILL.md should be at least 1KB");
  });

  // Validate AP-001 through AP-020 are all present
  for (let i = 1; i <= 20; i++) {
    const id = `AP-${String(i).padStart(3, "0")}`;
    it(`should contain anti-pattern ${id}`, function () {
      expect(SKILL_CONTENT).to.include(id, `${id} must be documented in SKILL.md`);
    });
  }

  it("should contain the FHEVM coprocessor address (AP verification)", function () {
    // The coprocessor address appears in the skill document as part of the
    // network configuration guidance
    expect(SKILL_CONTENT).to.include(
      "0xe3a9105a3a932253a70f126eb1e3b589c643dd24",
      "Coprocessor address should be documented"
    );
  });

  it("should contain FHE.fromExternal guidance (ZKPoK pattern)", function () {
    expect(SKILL_CONTENT).to.include("fromExternal");
  });

  it("should contain FHE.makePubliclyDecryptable guidance", function () {
    expect(SKILL_CONTENT).to.include("makePubliclyDecryptable");
  });
});
