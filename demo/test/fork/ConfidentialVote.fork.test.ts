/**
 * Tier 2 — Sepolia Fork Tests: ConfidentialVote
 *
 * Run with: npm run test:fork
 * Requires SEPOLIA_RPC_URL in .env (or uses public node fallback).
 *
 * FHE ops under test: FHE.asEuint32(0) in constructor (creates tally handles),
 * FHE.allowThis on each tally handle, FHE.makePubliclyDecryptable (revealTally),
 * FHE.fromExternal + FHE.select + FHE.add (castVote — Tier 3 with ZKPoK).
 *
 * castVote() takes externalEbool[] + proof — that path is Tier 3.
 * These tests cover constructor FHE handle creation, tally reveal lifecycle,
 * and all guard conditions.
 *
 * Key fix verified here: `tallied` is now a mapping(uint256 => bool) so each
 * option can be independently revealed and double-reveal is prevented per option.
 */

import { expect } from "chai";
import { ethers } from "hardhat";

function requireForkNetwork(ctx: Mocha.Context) {
  if (process.env.FORK !== "true") {
    ctx.skip();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deployVote(optionCount = 3, durationSeconds = 3600) {
  const [owner, voter1, voter2] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("ConfidentialVote");
  const vote = await Factory.deploy(optionCount, durationSeconds);
  await vote.waitForDeployment();
  return { vote, owner, voter1, voter2 };
}

async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ConfidentialVote — Fork Tests (Tier 2)", function () {
  this.timeout(60_000);

  before(function () {
    requireForkNetwork(this);
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V001: Constructor initialises tally handles for each option
  // -------------------------------------------------------------------------
  describe("FHE-T2-V001: constructor creates encrypted tally handles", function () {
    it("should return non-zero handles from tallyHandleOf for each option", async function () {
      const { vote } = await deployVote(3);

      for (let i = 0; i < 3; i++) {
        const handle = await vote.tallyHandleOf(i);
        // FHE.asEuint32(0) creates a ciphertext — handle must be non-zero
        expect(handle).to.not.equal(0n, `handle for option ${i} should be non-zero`);
      }
    });

    it("should revert tallyHandleOf for out-of-range index", async function () {
      const { vote } = await deployVote(2);
      await expect(vote.tallyHandleOf(2)).to.be.revertedWith("Invalid option");
      await expect(vote.tallyHandleOf(999)).to.be.revertedWith("Invalid option");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V002: Each option gets a distinct tally handle
  // -------------------------------------------------------------------------
  describe("FHE-T2-V002: tally handles are distinct per option", function () {
    it("should return different handles for different options", async function () {
      const { vote } = await deployVote(3);
      const h0 = await vote.tallyHandleOf(0);
      const h1 = await vote.tallyHandleOf(1);
      const h2 = await vote.tallyHandleOf(2);
      expect(h0).to.not.equal(h1);
      expect(h1).to.not.equal(h2);
      expect(h0).to.not.equal(h2);
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V003: revealTally requires voting period to end
  // -------------------------------------------------------------------------
  describe("FHE-T2-V003: revealTally() guard — voting not ended", function () {
    it("should revert during active voting period", async function () {
      const { vote, owner } = await deployVote(3, 3600);
      await expect(
        vote.connect(owner).revealTally(0)
      ).to.be.revertedWith("Voting not ended");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V004: revealTally succeeds after voting ends
  // -------------------------------------------------------------------------
  describe("FHE-T2-V004: revealTally() succeeds after voteEnd", function () {
    it("should not revert and emit TallyRevealed", async function () {
      const { vote, owner } = await deployVote(3, 1);
      await increaseTime(5);
      const tx = await vote.connect(owner).revealTally(0);
      const receipt = await tx.wait();
      // Verify TallyRevealed event was emitted
      const iface = vote.interface;
      const revealed = receipt?.logs.some((log) => {
        try {
          const parsed = iface.parseLog(log as any);
          return parsed?.name === "TallyRevealed";
        } catch {
          return false;
        }
      });
      expect(revealed).to.equal(true);
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V005: tallied mapping prevents double-reveal per option (fix verify)
  // -------------------------------------------------------------------------
  describe("FHE-T2-V005: tallied mapping — per-option idempotency guard", function () {
    it("should allow revealing option 0 and option 1 independently", async function () {
      const { vote, owner } = await deployVote(3, 1);
      await increaseTime(5);
      await (await vote.connect(owner).revealTally(0)).wait();
      await expect(vote.connect(owner).revealTally(1)).to.not.be.reverted;
    });

    it("should revert on double-reveal of the same option", async function () {
      const { vote, owner } = await deployVote(3, 1);
      await increaseTime(5);
      await (await vote.connect(owner).revealTally(0)).wait();
      await expect(
        vote.connect(owner).revealTally(0)
      ).to.be.revertedWith("Already revealed");
    });

    it("tallied mapping reflects revealed state per option", async function () {
      const { vote, owner } = await deployVote(3, 1);
      await increaseTime(5);

      expect(await vote.tallied(0)).to.equal(false);
      expect(await vote.tallied(1)).to.equal(false);

      await (await vote.connect(owner).revealTally(0)).wait();

      expect(await vote.tallied(0)).to.equal(true);
      expect(await vote.tallied(1)).to.equal(false); // option 1 untouched
      expect(await vote.tallied(2)).to.equal(false); // option 2 untouched
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V006: revealTally is owner-only
  // -------------------------------------------------------------------------
  describe("FHE-T2-V006: revealTally() is owner-only", function () {
    it("should revert when called by non-owner after voting ends", async function () {
      const { vote, voter1 } = await deployVote(3, 1);
      await increaseTime(5);
      await expect(
        vote.connect(voter1).revealTally(0)
      ).to.be.revertedWithCustomError(vote, "OwnableUnauthorizedAccount");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V007: castVote rejects after voting ends
  // -------------------------------------------------------------------------
  describe("FHE-T2-V007: castVote() rejects after voteEnd", function () {
    it("should revert with 'Voting ended'", async function () {
      const { vote, voter1 } = await deployVote(3, 1);
      await increaseTime(5);

      // ZKPoK inputs irrelevant — time guard fires first
      const fakeVotes = [ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash];
      await expect(
        vote.connect(voter1).castVote(fakeVotes as unknown as any[], "0x")
      ).to.be.revertedWith("Voting ended");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V008: castVote rejects wrong option count
  // -------------------------------------------------------------------------
  describe("FHE-T2-V008: castVote() rejects mismatched option count", function () {
    it("should revert with 'Wrong option count' during voting period", async function () {
      const { vote, voter1 } = await deployVote(3, 3600);

      // Only 2 votes provided for a 3-option ballot
      const fakeVotes = [ethers.ZeroHash, ethers.ZeroHash];
      await expect(
        vote.connect(voter1).castVote(fakeVotes as unknown as any[], "0x")
      ).to.be.revertedWith("Wrong option count");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-V009: revealTally rejects invalid option index
  // -------------------------------------------------------------------------
  describe("FHE-T2-V009: revealTally() rejects invalid option index", function () {
    it("should revert with 'Invalid option' for out-of-range index", async function () {
      const { vote, owner } = await deployVote(3, 1);
      await increaseTime(5);
      await expect(
        vote.connect(owner).revealTally(3)
      ).to.be.revertedWith("Invalid option");
      await expect(
        vote.connect(owner).revealTally(999)
      ).to.be.revertedWith("Invalid option");
    });
  });
});
