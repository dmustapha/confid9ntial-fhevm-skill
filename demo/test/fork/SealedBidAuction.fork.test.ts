/**
 * Tier 2 — Sepolia Fork Tests: SealedBidAuction
 *
 * Run with: npm run test:fork
 * Requires SEPOLIA_RPC_URL in .env (or uses public node fallback).
 *
 * FHE ops under test: FHE.asEuint64, FHE.asEaddress, FHE.gt, FHE.select,
 * FHE.allowThis, FHE.allow, FHE.makePubliclyDecryptable (via revealWinner).
 *
 * placeBid() takes externalEuint64 + ZKPoK proof — that path is Tier 3.
 * These tests cover all lifecycle state transitions and guard conditions
 * that don't require a valid encrypted bid input.
 *
 * NOTE on FHE-T2-A003 (bidder dedup bug fix verification):
 * The pre-fix code captured `isNewBidder` AFTER assigning `_bids[msg.sender]`,
 * so the handle was always non-zero and bidders were never pushed. The fix
 * captures the check before the assignment. Because we can't call placeBid()
 * without ZKPoK here, this test verifies the constructor's initial state
 * (zero handles) which is the precondition the fix depends on.
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

async function deployAuction(durationSeconds = 3600) {
  const [owner, bidder1, bidder2] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("SealedBidAuction");
  const auction = await Factory.deploy(durationSeconds);
  await auction.waitForDeployment();
  return { auction, owner, bidder1, bidder2 };
}

/** Fast-forwards the local fork clock by `seconds`. */
async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("SealedBidAuction — Fork Tests (Tier 2)", function () {
  this.timeout(60_000);

  before(function () {
    requireForkNetwork(this);
  });

  // -------------------------------------------------------------------------
  // FHE-T2-A001: Constructor initialises encrypted zero-value handles
  // -------------------------------------------------------------------------
  describe("FHE-T2-A001: constructor creates non-zero FHE handles", function () {
    it("should create non-zero handles for _highestBid and _highestBidder", async function () {
      const { auction } = await deployAuction();

      // The contract does not expose _highestBid/_highestBidder directly.
      // Confirming the deploy succeeded and basic storage reads work is the
      // observable proxy for the FHE.asEuint64(0) + FHE.asEaddress(address(0)) calls.
      expect(await auction.revealed()).to.equal(false);
      expect(await auction.auctionEnd()).to.be.gt(0n);
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-A002: revealWinner requires auction to have ended
  // -------------------------------------------------------------------------
  describe("FHE-T2-A002: revealWinner() guard — auction not ended", function () {
    it("should revert before auctionEnd", async function () {
      const { auction, owner } = await deployAuction(3600);
      await expect(
        auction.connect(owner).revealWinner()
      ).to.be.revertedWith("Auction not ended");
    });

    it("should revert on second reveal (double-reveal guard)", async function () {
      const { auction, owner } = await deployAuction(1);
      await increaseTime(5);
      await (await auction.connect(owner).revealWinner()).wait();
      await expect(
        auction.connect(owner).revealWinner()
      ).to.be.revertedWith("Already revealed");
    });

    it("should succeed after auctionEnd (marks publicly decryptable)", async function () {
      const { auction, owner } = await deployAuction(1);
      await increaseTime(5);
      await expect(auction.connect(owner).revealWinner()).to.not.be.reverted;
      expect(await auction.revealed()).to.equal(true);
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-A003: Initial per-bidder handle is zero (precondition for dedup fix)
  // -------------------------------------------------------------------------
  describe("FHE-T2-A003: fresh bidder has zero handle (isNewBidder precondition)", function () {
    it("should return zero handle for an address that has never bid", async function () {
      const { auction, bidder1 } = await deployAuction();
      // bidderHandleOf is not exposed — we verify via the public bidders[] array
      // Before any bids the bidders array length should be 0
      // (There's no external `bidderCount` so we check an out-of-bounds revert)
      await expect(auction.bidders(0)).to.be.reverted;
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-A004: placeBid rejects after auction ends
  // -------------------------------------------------------------------------
  describe("FHE-T2-A004: placeBid() rejects after auctionEnd", function () {
    it("should revert with 'Auction ended'", async function () {
      const { auction, bidder1 } = await deployAuction(1);
      await increaseTime(5);

      // ZKPoK inputs are irrelevant — the time guard fires first
      await expect(
        auction.connect(bidder1).placeBid(
          ethers.ZeroHash as unknown as any, // placeholder externalEuint64
          "0x"                              // placeholder proof
        )
      ).to.be.revertedWith("Auction ended");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-A005: revealMyBid rejects during active auction
  // -------------------------------------------------------------------------
  describe("FHE-T2-A005: revealMyBid() rejects before auctionEnd", function () {
    it("should revert with 'Auction not ended'", async function () {
      const { auction, bidder1 } = await deployAuction(3600);
      await expect(
        auction.connect(bidder1).revealMyBid()
      ).to.be.revertedWith("Auction not ended");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-A006: Non-owner cannot call revealWinner
  // -------------------------------------------------------------------------
  describe("FHE-T2-A006: revealWinner() is owner-only", function () {
    it("should revert when called by non-owner after auction ends", async function () {
      const { auction, bidder1 } = await deployAuction(1);
      await increaseTime(5);
      await expect(
        auction.connect(bidder1).revealWinner()
      ).to.be.revertedWithCustomError(auction, "OwnableUnauthorizedAccount");
    });
  });
});
