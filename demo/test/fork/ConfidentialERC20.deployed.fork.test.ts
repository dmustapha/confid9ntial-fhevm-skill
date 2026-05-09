/**
 * Tier 2 — Sepolia Fork Tests: ConfidentialERC20 (deployed contract)
 *
 * Run with: npm run test:fork
 *
 * These tests interact with the ALREADY-DEPLOYED ConfidentialERC20 contract
 * on Sepolia (0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406) via a Sepolia fork.
 *
 * Unlike the other fork tests that deploy fresh instances, this file impersonates
 * the original deployer and calls the deployed contract directly. Because this
 * contract is already registered with the FHEVM coprocessor, FHE operations
 * (trivialEncrypt, FHE.add, etc.) succeed on the fork — providing genuine
 * FHE operation coverage without a ZKPoK.
 *
 * DEPLOYED CONTRACT:
 *   Address : 0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406
 *   Name    : ConfidentialToken (CTOK)
 *   Owner   : 0xc211c942946011859ca634f22400d80570ed12a5
 *   Network : Sepolia (chainId 11155111)
 *   Explorer: https://sepolia.etherscan.io/address/0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406
 *
 * FHE OPS TESTED: FHE.asEuint64 (via mint plaintext path), FHE.add (balance accumulation),
 *                 FHE.allowThis, FHE.allow, FHE.isAllowed (AP-015 guard),
 *                 FHE.makePubliclyDecryptable (makeMyBalanceDecryptable).
 */

import { expect } from "chai";
import hre, { ethers } from "hardhat";

// ---------------------------------------------------------------------------
// Constants — live Sepolia deployment
// ---------------------------------------------------------------------------

const DEPLOYED_ADDRESS = "0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406";
const DEPLOYER_ADDRESS = "0xc211c942946011859ca634f22400d80570ed12a5";

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

function requireForkNetwork(ctx: Mocha.Context) {
  if (process.env.FORK !== "true") {
    ctx.skip();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function impersonateDeployer() {
  // Fund the impersonated account with ETH for gas
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [DEPLOYER_ADDRESS],
  });
  await hre.network.provider.send("hardhat_setBalance", [
    DEPLOYER_ADDRESS,
    "0x56BC75E2D63100000", // 100 ETH
  ]);
  return await ethers.getImpersonatedSigner(DEPLOYER_ADDRESS);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ConfidentialERC20 — Deployed Contract Fork Tests (Tier 2)", function () {
  this.timeout(120_000);

  before(function () {
    requireForkNetwork(this);
  });

  // -------------------------------------------------------------------------
  // FHE-T2-D001: Attach to deployed contract — verify name + symbol
  // -------------------------------------------------------------------------
  describe("FHE-T2-D001: deployed contract is reachable on fork", function () {
    it("should return correct name and symbol from deployed contract", async function () {
      const token = await ethers.getContractAt("ConfidentialERC20", DEPLOYED_ADDRESS);
      expect(await token.name()).to.equal("ConfidentialToken");
      expect(await token.symbol()).to.equal("CTOK");
    });

    it("should return deployer as owner", async function () {
      const token = await ethers.getContractAt("ConfidentialERC20", DEPLOYED_ADDRESS);
      expect((await token.owner()).toLowerCase()).to.equal(DEPLOYER_ADDRESS.toLowerCase());
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-D002: FHE.asEuint64 + FHE.add — mint creates real ciphertext handle
  // -------------------------------------------------------------------------
  describe("FHE-T2-D002: mint() invokes FHE.asEuint64 + FHE.add via coprocessor", function () {
    it("should produce a non-zero encrypted handle after mint", async function () {
      const owner = await impersonateDeployer();
      const token = await ethers.getContractAt("ConfidentialERC20", DEPLOYED_ADDRESS, owner);

      const [, alice] = await ethers.getSigners();

      // balanceOf before mint should be zero handle
      const handleBefore = await token.balanceOf(alice.address);
      expect(handleBefore).to.equal(0n);

      // mint() calls FHE.asEuint64(amount) + FHE.add(_balances[to], mintAmount)
      const tx = await token.mint(alice.address, 500n);
      await tx.wait();

      const handleAfter = await token.balanceOf(alice.address);
      // Non-zero handle proves FHE.asEuint64 + FHE.add executed against the coprocessor
      expect(handleAfter).to.not.equal(0n);
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-D003: FHE.add accumulates — two mints produce a new handle
  // -------------------------------------------------------------------------
  describe("FHE-T2-D003: two mints invoke FHE.add twice, producing distinct handles", function () {
    it("handle should change after a second mint to the same address", async function () {
      const owner = await impersonateDeployer();
      const token = await ethers.getContractAt("ConfidentialERC20", DEPLOYED_ADDRESS, owner);

      const [, , bob] = await ethers.getSigners();

      await (await token.mint(bob.address, 100n)).wait();
      const h1 = await token.balanceOf(bob.address);
      expect(h1).to.not.equal(0n);

      await (await token.mint(bob.address, 100n)).wait();
      const h2 = await token.balanceOf(bob.address);
      expect(h2).to.not.equal(0n);
      // FHE.add creates a new ciphertext — handle must differ
      expect(h2).to.not.equal(h1);
    });
  });

  // -------------------------------------------------------------------------
  // FHE-T2-D004: FHE.isAllowed (AP-015) + FHE.makePubliclyDecryptable
  // -------------------------------------------------------------------------
  describe("FHE-T2-D004: makeMyBalanceDecryptable after mint — FHE.isAllowed passes", function () {
    it("should succeed for a recipient who was just minted to", async function () {
      const owner = await impersonateDeployer();
      const token = await ethers.getContractAt("ConfidentialERC20", DEPLOYED_ADDRESS, owner);

      const [, , , carol] = await ethers.getSigners();

      await (await token.mint(carol.address, 250n)).wait();

      // carol was granted FHE.allow() in mint() — isAllowed passes, makePubliclyDecryptable succeeds
      const carolToken = token.connect(carol);
      await expect(carolToken.makeMyBalanceDecryptable()).to.not.be.reverted;
    });
  });
});
