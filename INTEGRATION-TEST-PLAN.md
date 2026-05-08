# FHEVM SKILL.md — Deep Integration Test Plan

> Tests the SKILL.md from a real user's perspective.
> Each scenario simulates a developer loading SKILL.md into a fresh AI agent and running a specific prompt.
> Pass/fail is determined by whether the agent produces correct FHEVM code — not by whether it "runs".

---

## Pre-Flight Checklist

Run before any test scenario:

```bash
# 1. Confirm @fhevm/solidity is installed
ls demo/node_modules/@fhevm/solidity/lib/FHE.sol

# 2. Confirm relayer SDK is installed
ls demo/node_modules/@zama-fhe/relayer-sdk/

# 3. Confirm contracts compile clean (baseline)
cd demo && npx hardhat compile

# 4. Confirm SKILL.md exists and is readable
wc -l zama-fhevm-skill/SKILL.md   # should be ~2110
```

All 4 must pass before proceeding.

---

## How to Run Each Test

**Agent session setup:**
1. Open a fresh Claude Code session (new conversation — no prior context)
2. Add SKILL.md as context: reference `zama-fhevm-skill/SKILL.md` at the start of the session
3. Run the exact prompt below — copy verbatim, no additions
4. Capture the full output
5. Score against the pass criteria checklist
6. For Solidity outputs: paste into `demo/contracts/TEST-OUTPUT.sol`, run `npx hardhat compile`

**Scoring:** 1 point per criterion met. Record total per test.

---

## IT-01: Core ConfidentialERC20 Generation (Flow C)

**What it tests:** The primary use case. Does SKILL.md activate the 6 most critical AP codes on a real contract generation prompt?

**Exact prompt (copy verbatim):**
```
Using the FHEVM SKILL.md in this repo, write a ConfidentialERC20 contract with:
- Encrypted balances (euint64)
- ZKPoK transfer inputs (FHE.fromExternal)
- ACL so only the owner can decrypt balances
- Underflow guard in transfer()
Deploy to Sepolia using ZamaEthereumConfig.
```

**Pass Criteria (6 points):**

| # | Criterion | AP Code | Check |
|---|-----------|---------|-------|
| 1 | Import uses `@fhevm/solidity/lib/FHE.sol` (NOT `fhevm-solidity`) | AP-001 | grep `fhevm-solidity` → 0 results |
| 2 | Contract inherits `ZamaEthereumConfig` | AP-002 | grep `ZamaEthereumConfig` → present |
| 3 | After every `_balances[x] = ...` there is a `FHE.allowThis(...)` call | AP-003 | manual review of all state writes |
| 4 | Transfer inputs are `externalEuint64 encryptedAmount, bytes calldata inputProof` + `FHE.fromExternal(encryptedAmount, inputProof)` | AP-007 | grep `fromExternal` → present |
| 5 | Underflow guard uses `FHE.select(hasEnough, amount, FHE.asEuint64(0))` NOT `require(balance >= amount)` | AP-015 | grep `require.*balance` → 0 results |
| 6 | Recipient gets `FHE.allow(_balances[to], to)` after transfer | AP-011 | grep `FHE.allow` → present |

**Compilation check:**
```bash
# Paste agent output to demo/contracts/TEST-OUTPUT.sol, then:
cd demo && npx hardhat compile
# Expected: "Compiled 1 Solidity file successfully"
```

**Score to pass:** 5/6 minimum. Criterion 1 and 4 are mandatory (0 tolerance — they indicate the agent is using the archived package or skipping ZKPoK).

---

## IT-02: euint256 Arithmetic Trap

**What it tests:** AP-004. euint256 has no arithmetic operators in v0.12.3 — using FHE.add/sub/mul with euint256 panics silently. Does SKILL.md prevent this?

**Exact prompt (copy verbatim):**
```
Using the FHEVM SKILL.md in this repo, write a rewards contract where:
- Each user has a reward balance stored as an encrypted value
- Users can accumulate rewards (addition)
- Users can compound rewards (multiplication by a plaintext rate)
- The contract should handle large reward balances
```

**Pass Criteria (4 points):**

| # | Criterion | AP Code | Check |
|---|-----------|---------|-------|
| 1 | Reward balance is `euint64` or `euint128`, NOT `euint256` | AP-004 | grep `euint256` → 0 results in variable declarations |
| 2 | Agent explicitly explains that euint256 has no arithmetic support | AP-004 | review agent reasoning text |
| 3 | FHE.mul uses plaintext rate: `FHE.mul(balance, uint64(rate))` NOT `FHE.mul(balance, encRate)` | AP-006 | grep for encrypted divisor/multiplier pattern |
| 4 | FHE.allowThis called after every balance update | AP-003 | manual review |

**Compilation check:** Same as IT-01.

**Score to pass:** 3/4 minimum. Criterion 1 is mandatory.

**Fail signal:** If agent generates `euint256 rewardBalance` with `FHE.add(rewardBalance, newReward)`, SKILL.md AP-004 failed to activate.

---

## IT-03: Async Decryption Pattern

**What it tests:** AP-005. The entire TFHE.requestDecryption Oracle pattern was removed in v0.9. Does SKILL.md prevent the agent from generating it?

**Exact prompt (copy verbatim):**
```
Using the FHEVM SKILL.md in this repo, write a contract with a function
that allows a user to reveal their encrypted balance as a public value.
The balance is stored as euint64. Show both the Solidity contract side
and the TypeScript client side.
```

**Pass Criteria (5 points):**

| # | Criterion | AP Code | Check |
|---|-----------|---------|-------|
| 1 | Solidity uses `FHE.makePubliclyDecryptable(_balances[msg.sender])` | AP-005 | grep `makePubliclyDecryptable` → present |
| 2 | NO deprecated patterns: `TFHE.requestDecryption`, `TFHE.decrypt`, `Gateway.requestDecryption` | AP-005 | grep `requestDecryption\|TFHE.decrypt` → 0 results |
| 3 | TypeScript uses `createInstance(...)` from `@zama-fhe/relayer-sdk` (not `new FhevmInstance()`) | — | grep `new FhevmInstance` → 0 results |
| 4 | TypeScript calls `instance.publicDecrypt([handleHex])` as an instance method (not top-level export) | — | grep `publicDecrypt` → present as method call |
| 5 | TypeScript reads the handle from `balanceOf(address)` before decrypting | — | manual review of fetch-then-decrypt flow |

**Score to pass:** 4/5 minimum. Criteria 1 and 2 are mandatory.

**Fail signal:** Any appearance of `requestDecryption` or `TFHE.decrypt` in Solidity output means the agent is generating removed API patterns.

---

## IT-04: SealedBidAuction Generalization

**What it tests:** Can SKILL.md guide an agent to produce correct encrypted patterns for a NEW contract type it hasn't seen before? This tests generalization, not memorization of the demo contract.

**Exact prompt (copy verbatim):**
```
Using the FHEVM SKILL.md in this repo, write a blind auction for NFTs where:
- Bidders submit sealed (encrypted) bids
- The auction owner can reveal the winner after a deadline
- Bidders can reveal their own bid after the auction ends
- The contract prevents undercover bids (bids below a plaintext minimum)
- Deploy on Sepolia
```

**Pass Criteria (6 points):**

| # | Criterion | AP Code | Check |
|---|-----------|---------|-------|
| 1 | Bid inputs use ZKPoK: `externalEuint64 encBid, bytes calldata proof` + `FHE.fromExternal(encBid, proof)` | AP-007 | grep `fromExternal` → present |
| 2 | Winner comparison uses `FHE.gt(newBid, _highestBid)` NOT plaintext `>` | AP-012 | grep `_highestBid >` → 0 results |
| 3 | `revealWinner` has `onlyOwner` modifier | AP-019 | grep `onlyOwner` → present on reveal function |
| 4 | No synchronous decrypt anywhere | AP-005 | grep `TFHE.decrypt\|requestDecryption` → 0 results |
| 5 | Contract inherits `ZamaEthereumConfig` | AP-002 | grep `ZamaEthereumConfig` → present |
| 6 | FHE.allowThis after every bid state write | AP-003 | manual review |

**Compilation check:** Same as IT-01.

**Score to pass:** 5/6 minimum. Criteria 1, 2, and 4 are mandatory.

---

## IT-05: Frontend React Hook Integration

**What it tests:** The L2-12 frontend section. Does SKILL.md produce a correct React hook using the relayer SDK with proper instance binding?

**Exact prompt (copy verbatim):**
```
Using the FHEVM SKILL.md in this repo, write a React hook called
useEncryptedBalance(contractAddress: string) that:
- Reads an encrypted balance handle from a ConfidentialERC20 contract
- Calls makeMyBalanceDecryptable() on-chain to authorize the relayer
- Decrypts the balance using the Zama relayer SDK
- Returns { balance: bigint | null, isLoading: boolean, error: Error | null }
Use wagmi for the wallet connection.
```

**Pass Criteria (5 points):**

| # | Criterion | Check |
|---|-----------|-------|
| 1 | Uses `createInstance(...)` from `@zama-fhe/relayer-sdk` (NOT `new FhevmInstance()`) | grep `new FhevmInstance` → 0 results |
| 2 | `publicDecrypt` is called as `instance.publicDecrypt([handleHex])` (instance method, array arg) | grep pattern check |
| 3 | `createEncryptedInput` is bound with BOTH `(contractAddress, userAddress)` for replay prevention | grep `createEncryptedInput` → has 2 args |
| 4 | Hook calls `makeMyBalanceDecryptable()` before reading the decrypted value | manual review of execution order |
| 5 | TypeScript types are correct: hook returns `{ balance: bigint \| null, isLoading: boolean, error: Error \| null }` | review return type |

**TypeScript check:**
```bash
# Save agent output to a .tsx file and run:
cd demo && npx tsc --noEmit
# Expected: exit code 0, no errors
```

**Pre-flight for IT-05:**
```bash
ls demo/node_modules/@zama-fhe/relayer-sdk/
# Must exist before running this test
```

**Score to pass:** 4/5 minimum. Criteria 1 and 2 are mandatory.

---

## Overall Scoring

| Test | Max Points | Pass Threshold | Weight |
|------|-----------|---------------|--------|
| IT-01: Core ConfidentialERC20 | 6 | 5/6 | Critical |
| IT-02: euint256 Trap | 4 | 3/4 | High |
| IT-03: Async Decryption | 5 | 4/5 | Critical |
| IT-04: SealedBidAuction Generalization | 6 | 5/6 | High |
| IT-05: Frontend Hook | 5 | 4/5 | Medium |
| **Total** | **26** | **21/26** | |

**SKILL.md passes the integration test suite if:**
- Total score >= 21/26 AND
- All mandatory criteria pass (no hard failures on AP-001, AP-005, AP-007)

**If any mandatory criterion fails:** Fix SKILL.md Layer 1 Quick Start for that AP code before submission.

---

## Failure Analysis Guide

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| Agent uses `fhevm-solidity` import | AP-001 not in Layer 1 or activation failed | Move AP-001 to first line of Quick Start section |
| Agent uses `euint256` for arithmetic | AP-004 wording not strong enough | Add "euint256 has NO arithmetic support — will panic silently" to Quick Start |
| Agent uses `TFHE.requestDecryption` | AP-005 not in Layer 1 | Add deprecated pattern callout to Layer 1 with REMOVED label |
| Agent skips `FHE.allowThis` | AP-003 position too far down | Move AP-003 example directly after first `_balances[x] =` example in Layer 1 |
| Agent misses `FHE.fromExternal` | AP-007 activation weak | Bold the ZKPoK pattern in Quick Start, add "REQUIRED for all external inputs" |

---

## Test Log Template

Copy this for each run:

```
## Test Run — [DATE]

**Tester:** [your name]
**Agent:** Claude Code / Cursor / Windsurf / other
**SKILL.md version:** [git hash or date]

### IT-01 Results
Score: /6
Mandatory pass: AP-001 [Y/N] | AP-007 [Y/N]
Compilation: [PASS/FAIL]
Notes:

### IT-02 Results
Score: /4
Mandatory pass: AP-004 [Y/N]
Compilation: [PASS/FAIL]
Notes:

### IT-03 Results
Score: /5
Mandatory pass: AP-005 [Y/N]
Notes:

### IT-04 Results
Score: /6
Mandatory pass: AP-007 [Y/N] | AP-005 [Y/N]
Compilation: [PASS/FAIL]
Notes:

### IT-05 Results
Score: /5
Mandatory pass: createInstance [Y/N]
TypeScript check: [PASS/FAIL]
Notes:

**Total: /26**
**Overall: PASS / FAIL**
**Action items:**
```
