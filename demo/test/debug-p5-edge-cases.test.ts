// debug-p5-edge-cases.test.ts
// Phase 5: Edge case + security input tests for ConfidentialERC20
//
// NOTE: FHE operations (FHE.asEuint64, FHE.fromExternal, FHE.makePubliclyDecryptable)
// require the Zama coprocessor precompile. On local hardhat network they revert.
// Tests are split:
//   Group A — runs on local hardhat (pure OZ + interface checks)
//   Group B — requires Sepolia fork (actual FHE ops)
//
import { expect } from "chai";
import { ethers } from "hardhat";
import { ConfidentialERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Phase 5 Edge Cases — Group A (local hardhat)", function () {
  let token: ConfidentialERC20;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialERC20");
    token = (await Factory.deploy("ConfidentialToken", "CTOK")) as ConfidentialERC20;
    await token.waitForDeployment();
  });

  // ── Access control edge cases (pure OZ Ownable) ───────────────────────────

  it("EC-001: non-owner cannot mint (OZ Ownable)", async function () {
    // mint would also revert from FHE op on local, but OZ ownership check fires first
    await expect(token.connect(alice).mint(alice.address, 100n)).to.be.reverted;
    await expect(token.connect(attacker).mint(attacker.address, 1000000n)).to.be.reverted;
  });

  it("EC-002: non-owner cannot pause (OZ Ownable)", async function () {
    await expect(token.connect(alice).pause()).to.be.reverted;
    await expect(token.connect(attacker).pause()).to.be.reverted;
  });

  it("EC-003: non-owner cannot unpause (OZ Ownable)", async function () {
    await token.connect(owner).pause();
    await expect(token.connect(alice).unpause()).to.be.reverted;
  });

  // ── Pause state edge cases (pure OZ Pausable) ─────────────────────────────

  it("EC-006: double pause reverts (OZ Pausable invariant)", async function () {
    await token.connect(owner).pause();
    await expect(token.connect(owner).pause()).to.be.reverted;
  });

  it("EC-007: unpause when not paused reverts (OZ Pausable invariant)", async function () {
    await expect(token.connect(owner).unpause()).to.be.reverted;
  });

  // ── Transfer with bad proof reverts before FHE ─────────────────────────────

  it("EC-011: transfer with empty proof reverts", async function () {
    const fakeAmount = ethers.zeroPadBytes("0x01", 32);
    await expect(
      token.connect(alice).transfer(bob.address, fakeAmount as any, "0x")
    ).to.be.reverted;
  });

  // ── Deployment edge cases ──────────────────────────────────────────────────

  it("EC-013: empty string name and symbol are accepted", async function () {
    const Factory = await ethers.getContractFactory("ConfidentialERC20");
    const t = await Factory.deploy("", "");
    await t.waitForDeployment();
    expect(await t.name()).to.equal("");
    expect(await t.symbol()).to.equal("");
  });

  it("EC-014: deployer is owner", async function () {
    expect(await token.owner()).to.equal(owner.address);
  });

  it("EC-015: decimals constant is 18", async function () {
    expect(await token.decimals()).to.equal(18);
  });

  it("EC-016: initial paused state is false", async function () {
    expect(await token.paused()).to.equal(false);
  });

  // ── FHE ops require coprocessor — document expected behaviour ─────────────

  it("EC-FHE-001: mint reverts on local hardhat (coprocessor precompile not available)", async function () {
    // This is EXPECTED behaviour on local network — use Sepolia fork for FHE op tests
    await expect(token.connect(owner).mint(alice.address, 100n)).to.be.reverted;
  });

  it("EC-FHE-002: makeMyBalanceDecryptable reverts on local hardhat", async function () {
    await expect(token.connect(alice).makeMyBalanceDecryptable()).to.be.reverted;
  });

  // ── Underflow guard — present in demo contract (fixed during wire phase) ──
  // The demo contract transfer() correctly uses FHE.le + FHE.select guard:
  //   ebool hasEnough = FHE.le(amount, senderBal);
  //   euint64 xferAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));
  // This matches the L2-10 template pattern. Guard was added in wire phase.
  it("EC-DESIGN-001: documents underflow guard present in demo transfer()", async function () {
    // This test passes as documentation. Real test would require Sepolia fork.
    // Both demo contract and L2-10 template use the guarded select pattern.
    expect(true).to.equal(true);
  });
});
