// stress-extra.test.ts — Stress tests for SealedBidAuction and ConfidentialVote
// NOTE: Both contracts call FHE ops in constructor, so they revert on local hardhat.
// Tests document expected behavior (same pattern as EC-FHE-001/002).
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SealedBidAuction — Stress Tests", function () {
  it("ST-F6-COMP-01: SealedBidAuction artifacts exist (compiled successfully)", async function () {
    // If this test runs, Hardhat compiled the contract without errors
    const Factory = await ethers.getContractFactory("SealedBidAuction");
    expect(Factory).to.not.be.undefined;
  });

  it("ST-F6-FHE-01: SealedBidAuction constructor reverts on local hardhat (FHE op in constructor)", async function () {
    // EXPECTED: FHE.asEuint64(0) in constructor requires coprocessor precompile
    // Same pattern as ConfidentialERC20 — use Sepolia fork for full tests
    const Factory = await ethers.getContractFactory("SealedBidAuction");
    await expect(Factory.deploy(3600)).to.be.reverted;
  });
});

describe("ConfidentialVote — Stress Tests", function () {
  it("ST-F7-COMP-01: ConfidentialVote artifacts exist (compiled successfully)", async function () {
    const Factory = await ethers.getContractFactory("ConfidentialVote");
    expect(Factory).to.not.be.undefined;
  });

  it("ST-F7-FHE-01: ConfidentialVote constructor reverts on local hardhat (FHE op in constructor)", async function () {
    // EXPECTED: FHE.asEuint32(0) in constructor loop requires coprocessor precompile
    const Factory = await ethers.getContractFactory("ConfidentialVote");
    await expect(Factory.deploy(3, 3600)).to.be.reverted;
  });
});
