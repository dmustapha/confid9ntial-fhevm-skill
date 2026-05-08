import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying ConfidentialERC20 with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const ConfidentialERC20 = await ethers.getContractFactory("ConfidentialERC20");
  const token = await ConfidentialERC20.deploy("ConfidentialToken", "CTOK");
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("ConfidentialERC20 deployed to:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  return address;
}

main()
  .then((address) => {
    console.log("Deployment complete:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
