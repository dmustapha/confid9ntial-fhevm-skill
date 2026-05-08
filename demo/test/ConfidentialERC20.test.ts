import { expect } from "chai";
import { ethers } from "hardhat";
import { ConfidentialERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ConfidentialERC20", function () {
  let token: ConfidentialERC20;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const ConfidentialERC20Factory = await ethers.getContractFactory("ConfidentialERC20");
    token = (await ConfidentialERC20Factory.deploy("ConfidentialToken", "CTOK")) as ConfidentialERC20;
    await token.waitForDeployment();
  });

  it("Test 1: should deploy with correct name and symbol", async function () {
    expect(await token.name()).to.equal("ConfidentialToken");
    expect(await token.symbol()).to.equal("CTOK");
    expect(await token.decimals()).to.equal(18);
  });

  it("Test 2: should expose required interface functions", async function () {
    // Verify key functions are accessible on the deployed contract
    expect(typeof token.mint).to.equal("function");
    expect(typeof token.transfer).to.equal("function");
    expect(typeof token.balanceOf).to.equal("function");
    expect(typeof token.makeMyBalanceDecryptable).to.equal("function");
    expect(typeof token.pause).to.equal("function");
    expect(typeof token.unpause).to.equal("function");
  });

  it("Test 3: should set deployer as owner", async function () {
    expect(await token.owner()).to.equal(owner.address);
  });

  it("Test 4: owner can pause and unpause", async function () {
    // Should not be paused initially
    expect(await token.paused()).to.equal(false);

    // Owner can pause
    await token.connect(owner).pause();
    expect(await token.paused()).to.equal(true);

    // Owner can unpause
    await token.connect(owner).unpause();
    expect(await token.paused()).to.equal(false);
  });

  it("Test 5: non-owner cannot pause", async function () {
    // Alice (non-owner) should not be able to pause
    await expect(token.connect(alice).pause()).to.be.reverted;
  });
});
