import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("---");

  // Deploy ConfidentialERC20
  const ConfidentialERC20 = await ethers.getContractFactory("ConfidentialERC20");
  const token = await ConfidentialERC20.deploy("ConfidentialToken", "CTOK");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("ConfidentialERC20 deployed to:", tokenAddress);

  // Deploy SealedBidAuction (24h duration so it doesn't expire during testing)
  const SealedBidAuction = await ethers.getContractFactory("SealedBidAuction");
  const auction = await SealedBidAuction.deploy(86400);
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("SealedBidAuction deployed to:", auctionAddress);

  // Deploy ConfidentialVote (3 options, 24h duration)
  const ConfidentialVote = await ethers.getContractFactory("ConfidentialVote");
  const vote = await ConfidentialVote.deploy(3, 86400);
  await vote.waitForDeployment();
  const voteAddress = await vote.getAddress();
  console.log("ConfidentialVote deployed to:", voteAddress);

  console.log("---");
  console.log("All contracts deployed.");
  console.log("ConfidentialERC20 :", tokenAddress);
  console.log("SealedBidAuction  :", auctionAddress);
  console.log("ConfidentialVote  :", voteAddress);
  console.log("Deployer (owner)  :", deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
