# FHEVM SKILL.md: Build confidential smart contracts with any AI coding agent

A production-ready reference document that enables AI coding agents (Claude Code, Cursor, Windsurf) to write, test, and deploy Zama FHEVM confidential smart contracts correctly on the first attempt.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![FHEVM](https://img.shields.io/badge/@fhevm/solidity-0.11.1-purple)](https://www.npmjs.com/package/@fhevm/solidity)
[![Tests](https://img.shields.io/badge/tests-67%20passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## What Is This?

Most AI agents fail when writing FHEVM code because they use archived packages, deprecated APIs, and nonexistent types. This SKILL.md uses a Dual-Layer Activation Design (DLAD): a dense Quick Start section that loads into the agent's context first, covering the three fatal anti-patterns and five correct patterns, followed by a full reference layer with all types, operations, and templates.

The result: an agent that reads this file generates compilable, deployable FHEVM contracts without the common pitfalls.

---

## Contents

```
confid9ntial-fhevm-skill/
  SKILL.md          AI agent skill document (2150+ lines, 20 APs, 3 templates)
  tools/
    ap-lint.js      Static linter: detects 14 of 20 AP violations statically
demo/               Working contracts on Sepolia (proves patterns compile and run)
```

---

## SKILL.md

The skill document covers:

- **20 Anti-Patterns** (AP-001 through AP-020): the most common FHEVM mistakes, with before/after code
- **5 Quick Start activation patterns**: correct import, types, ZKPoK, ACL, async decrypt
- **8 reference sections**: full type system, operation table, HCU cost guide, config patterns
- **3 contract templates**: ConfidentialERC20, SealedBidAuction, ConfidentialVote
- **L2-12 Frontend integration**: relayer init, encrypted input binding, public decrypt, user-private decrypt (EIP-712), React hooks
- **20-item pre-submission checklist**: AP codes in checkbox format
- **AP linter** (`tools/ap-lint.js`): statically detects 14 of 20 anti-patterns (AP-008, 010, 011, 014, 017, 018 require manual review); scans any Solidity directory

### Using the Skill

Open a new AI coding agent session. Provide the SKILL.md file as context, then prompt:

```
Using SKILL.md, build a ConfidentialERC20 token with:
- Encrypted balances (euint64)
- ZKPoK transfer inputs (FHE.fromExternal)
- ACL so only the owner can decrypt balances
- Underflow guard in transfer()
Deploy to Sepolia using ZamaEthereumConfig.
```

The agent reads the Quick Start layer, activates the correct patterns, and generates compilable code before reaching the 1000-line mark.

---

## Demo Contracts

The `demo/` directory contains a reference implementation proving every SKILL.md pattern compiles and runs on Sepolia.

### Deployed Contract

| Network | Address | Explorer |
|---------|---------|---------|
| Sepolia | `0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406` | [View on Etherscan](https://sepolia.etherscan.io/address/0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406) |

Contract name: `ConfidentialToken`, verified via `eth_call` on Sepolia.

### Contracts

| Contract | Description |
|----------|-------------|
| `ConfidentialERC20.sol` | ERC20 with encrypted balances, ZKPoK transfers, and FHE underflow guard |
| `SealedBidAuction.sol` | Sealed-bid auction with encrypted bids |
| `ConfidentialVote.sol` | On-chain voting with encrypted tallies |

### Run Tests

```bash
cd demo
npm install
npx hardhat compile
npx hardhat test
npm run lint        # AP linter: 0 violations expected
```

```
67 passing (non-fork)
```

Tests cover access control, pause invariants, deployment edge cases, and documented FHE behavior on local Hardhat (coprocessor operations revert as expected without Sepolia fork). Fork tests require `SEPOLIA_RPC_URL` and run via `npm run test:fork`.

---

## Key Patterns

### Correct import (AP-001)
```solidity
import { FHE } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaEthereumConfig.sol";
// NOT: fhevm-solidity (archived since June 2025)
```

### ZKPoK input handling (AP-007)
```solidity
function transfer(address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
    // NOT: euint64 amount = euint64.wrap(rawAmount);
}
```

### FHE underflow guard (AP-015)
```solidity
ebool hasEnough = FHE.le(amount, senderBalance);
euint64 safeAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));
// NOT: require(balance >= amount) — balances are encrypted
```

### ACL access control (AP-016)
```solidity
FHE.allow(balance, msg.sender);     // user can decrypt their own balance
FHE.allowThis(balance);             // contract retains access
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Confidential contracts | @fhevm/solidity v0.11.1 |
| Network | Sepolia testnet (Zama coprocessor active) |
| Config | ZamaEthereumConfig (auto-detects Sepolia vs mainnet) |
| Testing | Hardhat + TypeScript + Chai |
| Frontend SDK | @zama-fhe/relayer-sdk (documented in L2-12) |

---

## Project Structure

```
confid9ntial-fhevm-skill/
  SKILL.md                       AI agent skill document (2150+ lines, 20 APs, 3 templates)
  tools/
    ap-lint.js                   Static linter: detects 14 of 20 AP violations statically

demo/
  contracts/
    ConfidentialERC20.sol        Reference implementation (encrypted balances + ZKPoK)
    SealedBidAuction.sol         Auction template (encrypted bids)
    ConfidentialVote.sol         Voting template (encrypted tallies)
  test/
    ConfidentialERC20.test.ts    Core tests
    debug-p5-edge-cases.test.ts  Edge case + security tests
    stress-extra.test.ts         Compilation + FHE behavior tests
    skill-validation.test.ts     SKILL.md structural integrity (20 APs present)
    skill-linter.test.ts         ap-lint.js functional tests (21 checks)
  fork-tests/                    Sepolia fork tests (requires SEPOLIA_RPC_URL + FORK=true)
  hardhat.config.ts
  .env.example
```

---

## Running Locally

```bash
git clone https://github.com/dmustapha/confid9ntial-fhevm-skill
cd confid9ntial-fhevm-skill/demo
npm install
npx hardhat compile
npx hardhat test
```

To deploy to Sepolia:

```bash
cp .env.example .env
# Fill in SEPOLIA_RPC_URL and PRIVATE_KEY
npx hardhat run scripts/deploy.ts --network sepolia
```

---

## License

MIT
