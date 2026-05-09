/**
 * Tier 2 — Sepolia Fork Tests: ConfidentialERC20 (non-FHE guards)
 *
 * Run with: npm run test:fork
 *
 * NOTE ON SCOPE: Tests that require FHE operations on a fresh deploy (mint(),
 * makeMyBalanceDecryptable() post-mint) are NOT here. The FHEVM coprocessor at
 * 0xe3a9105a3a932253a70f126eb1e3b589c643dd24 only accepts FHE calls from
 * contracts that were registered via a real Sepolia deployment — fresh Hardhat
 * fork deploys revert with "Transaction reverted without a reason string".
 *
 * FHE operation coverage (mint, ACL, makePubliclyDecryptable) is provided in
 * test/fork/ConfidentialERC20.deployed.fork.test.ts, which impersonates the
 * deployer of an ALREADY-DEPLOYED Sepolia contract.
 *
 * The tests here cover non-FHE guards that work on fresh fork deploys:
 *   - FHE-T2-004: balanceOf returns zero handle before first mint
 *   - FHE-T2-005: mint() is owner-only (Ownable revert fires before FHE op)
 *   - FHE-T2-006a: makeMyBalanceDecryptable reverts for zero handle (no ACL)
 *   - FHE-T2-008a: non-owner cannot unpause
 *   - FHE-T2-008b: owner can unpause a paused contract
 */

import { expect } from "chai";
import { ethers } from "hardhat";

function requireForkNetwork(ctx: Mocha.Context) {
  if (process.env.FORK !== "true") {
    ctx.skip();
  }
}

async function deployToken(name = "ConfToken", symbol = "CFT") {
  const [deployer] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("ConfidentialERC20");
  const token = await Factory.deploy(name, symbol);
  await token.waitForDeployment();
  return { token, deployer };
}

describe("ConfidentialERC20 — Fork Tests (Tier 2, non-FHE guards)", function () {
  this.timeout(60_000);

  before(function () {
    requireForkNetwork(this);
  });

  // -------------------------------------------------------------------------
  // FHE-T2-004: Zero handle before any mint
  // -------------------------------------------------------------------------
  describe("FHE-T2-004: balanceOf returns zero handle before first mint", function () {
    it("fresh account returns handle 0", async function () {
      const { token } = await deployToken();
      const [, alice] = await ethers.getSigners();
      const handle = await token.balanceOf(alice.address);
      expect(handle).to.equal(0n);
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-005: Non-owner cannot mint (Ownable guard fires before FHE op)
  // -------------------------------------------------------------------------
  describe("FHE-T2-005: mint() is owner-only", function () {
    it("should revert when called by non-owner", async function () {
      const { token } = await deployToken();
      const [, alice] = await ethers.getSigners();
      await expect(
        token.connect(alice).mint(alice.address, 1000n)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-006a: makeMyBalanceDecryptable — AP-015 guard (zero handle path)
  // No mint needed — handle is 0, FHE.isAllowed returns false immediately.
  // -------------------------------------------------------------------------
  describe("FHE-T2-006a: makeMyBalanceDecryptable reverts for zero handle", function () {
    it("should revert for account with zero handle (not allowed)", async function () {
      const { token } = await deployToken();
      const [, alice] = await ethers.getSigners();
      await expect(
        token.connect(alice).makeMyBalanceDecryptable()
      ).to.be.revertedWith("Not authorized");
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-008: Pause / unpause (no FHE ops required)
  // -------------------------------------------------------------------------
  describe("FHE-T2-008: pause() / unpause() access control", function () {
    it("non-owner cannot unpause", async function () {
      const { token } = await deployToken();
      const [, alice] = await ethers.getSigners();
      await (await token.pause()).wait();
      await expect(
        token.connect(alice).unpause()
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("owner can unpause a paused contract", async function () {
      const { token, deployer } = await deployToken();
      await (await token.pause()).wait();
      await expect(token.connect(deployer).unpause()).to.not.be.reverted;
    });
  });
});
