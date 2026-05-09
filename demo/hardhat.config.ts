import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // Enable Sepolia fork when FORK=true env var is set.
      // `npm run test:fork` sets this automatically.
      forking: process.env.FORK === "true" ? {
        url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
        blockNumber: process.env.FORK_BLOCK ? parseInt(process.env.FORK_BLOCK) : undefined,
      } : undefined,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  mocha: {
    // Exclude fork tests from the default `npm test` run.
    // Fork tests require `--network hardhatFork` to reach the Sepolia coprocessor.
    // Run them with: npm run test:fork
    spec: "test/*.test.ts",
  },
};

export default config;
