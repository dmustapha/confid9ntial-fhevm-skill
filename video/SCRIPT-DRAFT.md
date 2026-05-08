# Demo Script — confidential-skill
> FHEVM SKILL.md: Build confidential smart contracts with any AI coding agent
> Target: 150–180 seconds | Format: recorded | Tone: technical, confident

---

## Scene 1 — The Problem (0–20s)

**Screen:** Terminal window. Developer runs `npm install fhevm-solidity`. Error: "deprecated, archived, use @fhevm/solidity instead."

**Voiceover:**
"Every AI coding agent fails at FHEVM. They reach for fhevm-solidity — a package archived since June 2025. They use deprecated types, wrong import paths, APIs that no longer exist. The contract compiles, the deploy fails, and you've lost hours."

---

## Scene 2 — The Solution (20–35s)

**Screen:** Claude Code terminal. User types a prompt. SKILL.md visible in file tree.

**Voiceover:**
"FHEVM SKILL.md is a production-ready reference document that loads into any AI coding agent and corrects all of this before a single line of code is written."

**On screen — the exact prompt:**
```
Using the FHEVM SKILL.md in this repo, write a ConfidentialERC20 contract with:
- Encrypted balances (euint64)
- ZKPoK transfer inputs (FHE.fromExternal)
- ACL so only the owner can decrypt balances
- Underflow guard in transfer()
Deploy to Sepolia using ZamaEthereumConfig.
```

---

## Scene 3 — Agent Generates Contract (35s–1:45s)

**Screen:** Claude Code terminal — animated output showing the agent reading SKILL.md and generating ConfidentialERC20.sol.

**Voiceover (overlaid during generation):**
"The agent reads the Quick Start layer first — 20 activation patterns in the top 400 lines. Pattern AP-001: the correct import path. Pattern AP-007: ZKPoK input handling with FHE.fromExternal. Pattern AP-015: the FHE underflow guard instead of a plaintext require."

**Key code visible on screen:**

```solidity
// AP-001: correct import
import { FHE } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaEthereumConfig.sol";

// AP-007: ZKPoK inputs
function transfer(
    address to,
    externalEuint64 encryptedAmount,
    bytes calldata inputProof
) external {
    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

// AP-015: FHE underflow guard
    ebool hasEnough = FHE.le(amount, _balances[msg.sender]);
    euint64 safeAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));

// AP-016: ACL access control
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);
```

**Voiceover (end of scene 3):**
"The agent generates a complete, compilable contract — correct on the first attempt."

---

## Scene 4 — Compilation (1:45s–2:10s)

**Screen:** Terminal running `npx hardhat compile`

**Output visible:**
```
Compiling 1 file with 0.8.24
contracts/ConfidentialERC20.sol: Compilation successful

Compiled 1 Solidity file successfully (evm target: paris).
```

**Voiceover:**
"Compiles clean. No deprecated imports, no type errors."

---

## Scene 5 — Tests Pass (2:10s–2:40s)

**Screen:** Terminal running `npx hardhat test`

**Output visible (truncated for screen):**
```
  ConfidentialERC20
    ✓ deploys and mints initial supply
    ✓ transfer emits Transfer event
    ✓ transfer with invalid proof reverts
    ✓ pause blocks transfers
    ✓ only owner can mint

  Edge cases
    ✓ transfer of zero amount
    ✓ transfer to self
    ✓ underflow guard prevents drain
    ... 14 more passing

  22 passing (642ms)
```

**Voiceover:**
"22 tests passing — access control, pause invariants, FHE underflow guards, and deployment edge cases."

---

## Scene 6 — SKILL.md & Close (2:40s–3:00s)

**Screen:** Split. Left: SKILL.md Quick Start section open. Right: GitHub repo + Sepolia Etherscan (contract 0xb3ec6C97420b1495C1979d628D9fDC0B89Bce406).

**Voiceover:**
"SKILL.md. 2110 lines. 20 anti-patterns. 3 production templates. One file that makes any AI agent write correct FHEVM contracts. The demo contracts are deployed on Sepolia — every pattern in this document compiles and runs. Available now on GitHub."

**End card:**
- `github.com/dmustapha/confidential-skill`
- Zama Developer Program — Mainnet Season 2

---

## Timing Summary

| Scene | Start | End | Duration |
|-------|-------|-----|----------|
| 1 — The Problem | 0s | 20s | 20s |
| 2 — The Solution | 20s | 35s | 15s |
| 3 — Agent Generates | 35s | 105s | 70s |
| 4 — Compilation | 105s | 130s | 25s |
| 5 — Tests Pass | 130s | 160s | 30s |
| 6 — Close | 160s | 180s | 20s |
| **Total** | | | **180s** |

## Notes for demo-video

- **Project type:** Documentation / developer tooling (not a DeFi app, not a frontend)
- **Dominant scene:** Scene 3 is 39% of runtime — the core value demonstration
- **Visual style:** Dark terminal aesthetic. Monospace font. Purple Zama brand accent (#6B46C1).
- **No web app screenshots** — this is a terminal + code demo
- **Scene 3 animation:** Animated typing in a terminal component (Remotion), not a real screen recording
- **Key differentiator:** Emphasize "first attempt" — most agents fail, this one succeeds
- **Social clip:** 10–12s from Scene 3 peak (agent generating correct code) + Scene 5 "22 passing"
