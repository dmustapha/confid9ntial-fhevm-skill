# FHEVM Demo — ConfidentialERC20

Reference implementation demonstrating the patterns documented in [SKILL.md](../confidential-skill/SKILL.md). Built with [`@fhevm/solidity`](https://www.npmjs.com/package/@fhevm/solidity) v0.11.1 on Sepolia testnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `ConfidentialERC20.sol` | ERC20 with encrypted balances and encrypted transfers. Uses `ZamaEthereumConfig`, FHE underflow guard, and ACL access control. |
| `SealedBidAuction.sol` | Sealed-bid auction where bid amounts are FHE-encrypted. Template 2 from SKILL.md L2-10. |
| `ConfidentialVote.sol` | On-chain voting with encrypted tallies. Template 3 from SKILL.md L2-10. |

## Deployed Contract

| Network | Address | Explorer |
|---------|---------|---------|
| Sepolia | `0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406` | [View on Etherscan](https://sepolia.etherscan.io/address/0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406) |

Contract name: `ConfidentialToken` — verified via `eth_call` on Sepolia (block 0xa4e56f).

## Build

```
npm install
npx hardhat compile
```

Output:
```
Generating typings for: 20 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 66 typings!
Compiled 15 Solidity files successfully (evm target: paris).
```

## Test

```
npx hardhat test
```

Output:
```
  ConfidentialERC20
    ✔ Test 1: should deploy with correct name and symbol
    ✔ Test 2: should expose required interface functions
    ✔ Test 3: should set deployer as owner
    ✔ Test 4: owner can pause and unpause
    ✔ Test 5: non-owner cannot pause

  Phase 5 Edge Cases — Group A (local hardhat)
    ✔ EC-001: non-owner cannot mint (OZ Ownable)
    ✔ EC-002: non-owner cannot pause (OZ Ownable)
    ✔ EC-003: non-owner cannot unpause (OZ Ownable)
    ✔ EC-006: double pause reverts (OZ Pausable invariant)
    ✔ EC-007: unpause when not paused reverts (OZ Pausable invariant)
    ✔ EC-011: transfer with empty proof reverts
    ✔ EC-013: empty string name and symbol are accepted
    ✔ EC-014: deployer is owner
    ✔ EC-015: decimals constant is 18
    ✔ EC-016: initial paused state is false
    ✔ EC-FHE-001: mint reverts on local hardhat (coprocessor precompile not available)
    ✔ EC-FHE-002: makeMyBalanceDecryptable reverts on local hardhat
    ✔ EC-DESIGN-001: documents underflow guard present in demo transfer()
    ✔ ST-F6-COMP-01: SealedBidAuction artifacts compiled
    ✔ ST-F6-FHE-01: SealedBidAuction constructor reverts on local hardhat (FHE op in ctor)
    ✔ ST-F7-COMP-01: ConfidentialVote artifacts compiled
    ✔ ST-F7-FHE-01: ConfidentialVote constructor reverts on local hardhat (FHE op in ctor)

  22 passing (1s)
```

> **Note on FHE tests:** Mint, transfer, and decryption operations require the FHEVM coprocessor available only on Sepolia (or a Sepolia fork). Tests EC-FHE-001 and EC-FHE-002 verify that these operations correctly revert on local Hardhat — this is expected behavior.

## Key Patterns Demonstrated

### Encrypted balances
```solidity
mapping(address => euint64) private _balances;
```

### FHE underflow guard (transfer safety)
```solidity
euint64 senderBal = _balances[msg.sender];
ebool   hasFunds  = FHE.le(amount, senderBal);
euint64 newSender = FHE.select(hasFunds, FHE.sub(senderBal, amount), senderBal);
```

### ACL access control (owner-only decryption)
```solidity
FHE.allow(bal, msg.sender);
FHE.makePubliclyDecryptable(bal);
```

### Config inheritance
```solidity
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaEthereumConfig.sol";
contract ConfidentialERC20 is ZamaEthereumConfig, Ownable, Pausable { ... }
```

## Setup

```bash
cp .env.example .env
# Fill in SEPOLIA_RPC_URL and PRIVATE_KEY
npx hardhat run scripts/deploy.ts --network sepolia
```
