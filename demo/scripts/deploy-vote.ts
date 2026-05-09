import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ConfidentialVote with:", deployer.address);
  const ConfidentialVote = await ethers.getContractFactory("ConfidentialVote");
  const vote = await ConfidentialVote.deploy(3, 86400);
  await vote.waitForDeployment();
  const addr = await vote.getAddress();
  console.log("ConfidentialVote deployed to:", addr);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
