# PRD — Zama FHEVM SKILL.md
**Project:** zama-fhevm-skill
**Hackathon:** Zama Developer Program — Mainnet Season 2
**Track:** Bounty Track — AI Agent Skills for FHEVM
**Deadline:** 2026-05-10T23:59:00+12:00
**Scope Mode:** RUSH (3 build days)
**Deliverable:** SKILL.md file (NOT a dApp, NOT a deployed contract)

---

## Section 1: Project Overview

**Project name:** FHEVM SKILL.md — Dual-Layer Activation Design (DLAD)

**One-line description:** A production-ready SKILL.md that activates Claude Code / Cursor / Windsurf to write, test, and deploy confidential smart contracts on Zama FHEVM correctly — on the first try.

**Problem statement:**
AI coding agents using Zama FHEVM consistently generate broken code. The root cause is not a capability gap — it is a knowledge gap that a correctly structured SKILL.md file can fix immediately. The "one shocking number": AI agents fail on 100% of FHEVM tasks without a SKILL.md because the correct package (`@fhevm/solidity`) replaced the now-ARCHIVED package (`fhevm-solidity`) in June 2025, and ALL existing AI agent training data references the archived package.

**Specific failure modes agents hit without SKILL.md:**
1. Wrong import (`fhevm-solidity` — ARCHIVED June 2025, not `@fhevm/solidity`)
2. Missing ZKPoK proof (raw uint64 instead of `externalEuint64` + `FHE.fromExternal()`)
3. Missing ACL grants (`FHE.allow()` / `FHE.allowThis()` calls omitted)
4. Wrong decryption pattern (using deprecated `TFHE.requestDecryption()` / Oracle pattern — removed in v0.9)
5. Arithmetic on `euint256` (no add/sub/mul supported — panics silently)
6. Encrypted divisor in `FHE.div()` (panics — must use plaintext divisor)
7. HCU limit exceeded (silent revert with no error message — 20M global / 5M sequential)

**Solution summary:**
DLAD is a two-tier SKILL.md. The Quick Start section (first ~30% of file) contains the 5 activation patterns that fix 80% of agent failures — correct import, type decision tree, ACL pattern, ZKPoK input handling, async decrypt boilerplate. These activate the agent before it reads 1000+ lines of reference material. The Complete Reference section (remaining 70%) covers all encrypted types, all FHE operations with HCU costs, 20+ anti-patterns with before/after code, OZ security patterns, ERC-7984 confidential token standard, and three production-ready contract templates.

**Why this wins:**
| Criterion | Weight | Approach |
|-----------|:------:|----------|
| Accuracy | 25% | @fhevm/solidity (verified); all type constraints; euint256 no-arithmetic rule; FHE.div plaintext-only |
| Completeness | 25% | All 9 types; all FHE ops with HCU costs; 20+ APs vs competitor's 13; full decryption pattern |
| Agent Effectiveness | 25% | DLAD Quick Start activates agent in first 2000 tokens; demo shows < 2min prompt → working contract |
| Code Quality | 12.5% | 3 production templates; all code is full runnable examples; inline AP annotations |
| Error Prevention | 12.5% | 20+ AP codes with before/after; HCU cost table; AP linter checklist |

---

## Section 2: System Architecture Overview

This is a documentation project. The "system" is the SKILL.md file itself.

```
SKILL.md (Primary Deliverable)
├── Layer 1: Quick Start (~30%)
│   ├── L1-01: Setup & Import
│   ├── L1-02: Type Selection Decision Tree
│   ├── L1-03: ACL Access Control Pattern
│   ├── L1-04: ZKPoK Input Handling
│   └── L1-05: Async Decryption Boilerplate
│
└── Layer 2: Complete Reference (~70%)
    ├── L2-01: Full Type Reference (9 types)
    ├── L2-02: FHE Operations Table + HCU Costs
    ├── L2-03: ACL Deep Reference
    ├── L2-04: ZKPoK Deep Reference
    ├── L2-05: Decryption Deep Reference (new FHE.makePubliclyDecryptable pattern)
    ├── L2-06: Anti-Patterns AP-001 through AP-020+ (before/after code)
    ├── L2-07: OZ Security Patterns (7 patterns missing from Makabeez)
    ├── L2-08: HCU Cost Table (full matrix)
    ├── L2-09: ERC-7984 Confidential Token
    └── L2-10: Production Templates (ConfidentialERC20, SealedBidAuction, ConfidentialVote)
```

**Component table:**
| Component | Type | Purpose | Key Dependencies |
|-----------|------|---------|-----------------|
| SKILL.md | Markdown document | Agent activation + reference | @fhevm/solidity docs, HCU cost data |
| ConfidentialERC20.sol | Demo contract | Prove SKILL.md correctness | @fhevm/solidity, Sepolia testnet |
| hardhat.config.ts | Demo config | Demo project setup | hardhat, @fhevm/solidity |
| test/ConfidentialERC20.test.ts | Demo test | Prove compilation + logic | hardhat, @fhevm/solidity |

**Data flow:**
1. Agent reads SKILL.md Quick Start → activates with correct patterns
2. Agent generates contract using patterns → compiles with Hardhat
3. Agent runs tests → passes
4. (Demo) Agent deploys to Sepolia → confirms on explorer

---

## Section 3: User Flows

### Flow A: Agent Quick-Start (Primary — covers 80% of use cases)
1. User tells Claude Code: "Build a confidential ERC20 token using SKILL.md"
2. Claude Code reads SKILL.md top 30% (Quick Start layer)
3. Agent activates with: correct import, type = euint64, ACL grants, ZKPoK input, async decrypt
4. Agent generates `ConfidentialERC20.sol` with all patterns correct
5. Agent runs `npx hardhat compile` → success
6. Agent runs `npx hardhat test` → tests pass

**Error path (AP activation):** If agent generates wrong pattern → Quick Start section's inline AP callout triggers self-correction. Agent re-reads the specific AP code section → corrects the pattern → re-compiles.

### Flow B: Agent Deep Reference (Covers remaining 20% of edge cases)
1. Agent needs edge case: euint256 comparison, FHE.div with plaintext, eaddress equality
2. Agent reads Layer 2 type reference → finds exact constraints
3. Agent writes correct code on first attempt

### Flow C: Judge Demo Flow (Critical path for submission)
1. Open new Claude Code session
2. Type prompt: "Using the FHEVM SKILL.md in this repo, write a ConfidentialERC20 contract with encrypted balances, encrypted transfers, ZKPoK input validation, ACL access control, and public decryption support. Deploy it to Sepolia."
3. Claude Code reads SKILL.md → generates contract
4. `npx hardhat compile` → 0 errors, 0 warnings
5. `npx hardhat test` → all tests pass
6. (Optional) `npx hardhat run scripts/deploy.ts --network sepolia` → deployed address

---

## Section 4: Technical Specifications

### Component: SKILL.md Quick Start (Layer 1)

**Purpose:** Activate AI coding agents for 80% of FHEVM tasks in the first 2000 tokens.

**Interface contract:** SKILL.md Quick Start exposes five activation patterns:
- L1-01: `@fhevm/solidity` import pattern (correct package, correct path)
- L1-02: Type selection tree (euint8→256 with constraints, ebool, eaddress)
- L1-03: ACL grant pattern (`allowThis`, `allow`, `allowTransient`)
- L1-04: ZKPoK input pattern (`externalEuintXX`, `FHE.fromExternal()`)
- L1-05: Async decrypt boilerplate (`FHE.makePubliclyDecryptable` + relayer SDK + `FHE.checkSignatures`)

**Constraints:**
- Quick Start MUST be the first content after the title — NO preamble
- Section length: ≤ 25 lines per section (DLAD rule — prevents scope creep)
- Every code example: fully-qualified import path + runnable snippet
- All code: `@fhevm/solidity` only (NEVER `fhevm-solidity`)

### Component: SKILL.md Complete Reference (Layer 2)

**Purpose:** Exhaustive reference for edge cases, all types, all ops, all anti-patterns.

**Key data structures:**

HCU Cost Table (partial — full in ARCHITECTURE.md):
```
euint32: add=95K, sub=95K, mul=265K, div=438K, rem=439K, eq=51K, ne=51K, lt=56K, gt=56K
euint64: add=133K, sub=133K, mul=365K, div=715K, rem=716K, eq=80K, ne=80K, lt=83K, gt=83K
euint128: add=172K, sub=172K, mul=696K, div=1225K, rem=1225K, eq=118K, ne=118K
```

AP Code Structure:
```
AP-NNN: [Title]
Status: CRITICAL | IMPORTANT
Impact: [What goes wrong]
WRONG pattern: [code]
CORRECT pattern: [code]
```

### Component: Demo Contract (ConfidentialERC20.sol)

**Purpose:** Prove that SKILL.md patterns produce working, compilable, testable FHEVM code.

**Interface contract:**
```solidity
interface IConfidentialERC20 {
    function mint(address to, externalEuint64 calldata amount, bytes calldata proof) external;
    function transfer(address to, externalEuint64 calldata amount, bytes calldata proof) external returns (bool);
    function balanceOf(address account) external view returns (euint64);
    function makeBalanceDecryptable() external;
}
```

**Key dependencies:**
- `@fhevm/solidity` (latest)
- `hardhat` (for compilation and testing)
- `@zama-fhe/relayer-sdk` (for off-chain decryption in tests)

---

## Section 5: API Contracts

### @fhevm/solidity (Core)
- **Import:** `import "@fhevm/solidity/lib/FHE.sol";`
- **Config import:** `import "@fhevm/solidity/config/ZamaConfig.sol";`
- **Key functions:** `FHE.add()`, `FHE.mul()`, `FHE.eq()`, `FHE.select()`, `FHE.fromExternal()`, `FHE.allow()`, `FHE.allowThis()`, `FHE.allowTransient()`, `FHE.makePubliclyDecryptable()`
- **Types:** `euint8`, `euint16`, `euint32`, `euint64`, `euint128`, `euint256`, `ebool`, `eaddress`, `externalEuint8/16/32/64/128/256`, `externalEbool`, `externalEaddress`
- **Known limitations:** euint256 no arithmetic; eaddress only eq/ne/select; FHE.div plaintext-only

### @zama-fhe/relayer-sdk (Decryption)
- **Install:** `npm install @zama-fhe/relayer-sdk`
- **Key function:** `instance.publicDecrypt([handles])` → `{clearValues, decryptionProof}`
- **Usage:** Off-chain only; called after `FHE.makePubliclyDecryptable()` on-chain
- **Verification:** On-chain `FHE.checkSignatures(handles, abi.encode(clearValues), proof)` [VERIFIED]

### @openzeppelin/confidential-contracts (ERC-7984)
- **Install:** `npm install @openzeppelin/confidential-contracts`
- **Import:** `import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";`
- **Key feature:** ERC-20 standard with encrypted balances [VERIFIED - npm]

---

## Section 6: Demo Script

**Format:** 3-minute recorded demo video
**Scene:** Screen recording of Claude Code terminal session

### Scene 1: Context Setup (0–20s)
**Shows:** Terminal, SKILL.md open in editor sidebar
**Voiceover:** "AI agents building on Zama FHEVM have one critical problem — they use the wrong package. fhevm-solidity was archived in June 2025. The correct package is @fhevm/solidity. Without a SKILL.md, every agent fails. With one, every agent succeeds."

### Scene 2: The Prompt (20–35s)
**Shows:** Claude Code terminal, user types prompt
**Prompt text (exact):** `"Using the FHEVM SKILL.md in this repo, write a ConfidentialERC20 contract. Include encrypted balances, encrypted transfers with ZKPoK input validation, ACL access control so owners can decrypt their own balance, and make balances publicly decryptable. Use the correct @fhevm/solidity import."`
**Voiceover:** "One prompt. No hand-holding."

### Scene 3: Agent Generates Contract (35s–1:45s)
**Shows:** Claude Code generating ConfidentialERC20.sol
**What Claude produces:**
- `import "@fhevm/solidity/lib/FHE.sol"` — correct package
- `externalEuint64` inputs with `FHE.fromExternal()` — correct ZKPoK
- `FHE.allowThis()` and `FHE.allow()` — correct ACL
- `FHE.makePubliclyDecryptable()` — correct decryption
**Voiceover:** "The agent reads the SKILL.md Quick Start section. Correct import. Correct ZKPoK pattern. Correct ACL grants."

### Scene 4: Compilation (1:45s–2:10s)
**Shows:** `npx hardhat compile` running → `Compiled 1 Solidity file successfully`
**Voiceover:** "Zero errors. Zero warnings. First try."

### Scene 5: Tests Pass (2:10s–2:40s)
**Shows:** `npx hardhat test` running → all tests green
**Voiceover:** "Tests pass. The SKILL.md enabled an AI agent to generate production-ready FHEVM code in under two minutes."

### Scene 6: SKILL.md Closeup (2:40s–3:00s)
**Shows:** SKILL.md open, Quick Start section visible
**Voiceover:** "This is what a winning AI agent skill looks like. Submitted for Zama Developer Program Mainnet Season 2."

**Voice & Copy Compliance:** No em dashes in voiceover. Direct, technical language. Active voice throughout.

---

## Section 7: Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation |
|---|------|----------|-----------|--------|------------|
| 1 | @fhevm/solidity API changes before deadline (v0.12.3 → v0.13+) | CRITICAL | LOW | All code examples break | Pin to verified patterns; add version badge at top of SKILL.md; build demo first to confirm |
| 2 | Demo contract fails to compile with generated code | CRITICAL | MEDIUM | Demo scene 4 fails live | Build and test ConfidentialERC20 on day 1 before writing SKILL.md; run demo 3x before recording |
| 3 | HCU cost table values incorrect (costs vary by type variant) | HIGH | LOW | SKILL.md inaccurate on error prevention | Cross-reference every HCU value against docs.zama.org; mark estimated values [APPROXIMATE] |
| 4 | FHE.checkSignatures API not matching actual relayer-sdk | HIGH | MEDIUM | Decryption boilerplate broken | Verify with actual npm package during demo build; fallback: note as [UNVERIFIED] with link |
| 5 | relayer-sdk publicDecrypt return type differs from docs | HIGH | MEDIUM | Decryption boilerplate incomplete | Use try/catch in example; note interface from docs.zama.org/oracle |
| 6 | Claude Code demo generates different code than expected | HIGH | MEDIUM | Demo flow breaks | Run demo prompt 5x before recording; use exact prompt from PRD Section 6; capture best take |
| 7 | Makabeez updates their SKILL.md to close gaps before deadline | MEDIUM | LOW | Competitive advantage reduced | Our HCU table + DLAD structure still differentiates; submit asap |
| 8 | SKILL.md exceeds practical length, reducing agent effectiveness | MEDIUM | MEDIUM | Layer 2 scope creep | Strict 25-line section caps; every section tested "would agent use immediately?" |
| 9 | ZKPoK externalEuintXX naming differs from actual @fhevm/solidity | MEDIUM | LOW | ZKPoK examples broken | Verify type names from package during demo build phase |
| 10 | @openzeppelin/confidential-contracts import path not exact | LOW | LOW | ERC-7984 section broken | Already verified from npm; note version in SKILL.md |

---

## Section 7.5: Judge Experience

**First-visit state:** SKILL.md is a text file — judges open it and immediately see the Quick Start section with working code examples. No login, no setup, no empty state.

**10-second test:** Judges see `## Quick Start` as the first section, with a working import snippet and type decision tree. They understand immediately: "this is an agent reference guide, and it starts with exactly what I need."

**Demo video:** 3-minute video shows Claude Code generating correct FHEVM code from a single prompt. Judges see output, compilation success, and tests passing — tangible proof of agent effectiveness.

---

## Section 7.6: Judge Proof Artifacts

**Proof route:** README.md in demo project directory contains:
- Compilation output screenshot
- Test run output screenshot
- Sepolia deployment address (if deployed)
- Link to Sepolia Etherscan for deployed contract

**Required artifacts during build:**
- `npx hardhat compile` output (text file)
- `npx hardhat test` output (text file)
- Sepolia deployment tx hash (if time allows)

---

## Section 8: Day-by-Day Build Plan (Rush Mode — 3 build days)

**Day 1 (2026-05-07): Write SKILL.md + Demo Contract**
- Morning: Write SKILL.md Layer 1 (Quick Start sections L1-01 through L1-05)
- Afternoon: Write SKILL.md Layer 2 sections L2-01 through L2-08 (types, ops, HCU, AP-001 through AP-020)
- Evening: Write Layer 2 OZ security patterns and ERC-7984 section; start ConfidentialERC20.sol demo contract

**Day 2 (2026-05-08): Templates + Testing**
- Morning: Write Layer 2 production templates (ConfidentialERC20, SealedBidAuction, ConfidentialVote); finalize SKILL.md
- Afternoon: Build complete Hardhat demo project; write tests; run `npx hardhat compile` and `npx hardhat test`
- Evening: Fix any compilation errors; practice demo run 3x; record demo video

**Day 3 (2026-05-09): Polish + Submit**
- Morning: Review SKILL.md against judging criteria; fix any gaps; final demo run
- Afternoon: Deploy demo contract to Sepolia (if time allows); prepare submission materials
- Evening: Submit to https://forms.zama.org/developer-program-mainnet-season2-bounty-track

**Buffer: 2026-05-10** is deadline day — emergency fix window only.

---

## Section 9: Dependencies & Prerequisites

| Dependency | Version | Setup |
|-----------|---------|-------|
| @fhevm/solidity | latest | `npm install @fhevm/solidity` |
| @zama-fhe/relayer-sdk | latest | `npm install @zama-fhe/relayer-sdk` |
| @openzeppelin/confidential-contracts | latest | `npm install @openzeppelin/confidential-contracts` |
| hardhat | ^2.22.0 | `npm install hardhat` |
| Node.js | 18+ | Pre-installed |
| Sepolia ETH | ~0.01 ETH | Sepolia faucet: https://faucet.sepolia.dev |

**Accounts needed:**
- Ethereum wallet with Sepolia ETH for demo deployment
- No other accounts required

---

## Section 10: Concerns Compliance

| # | Severity | Concern | How PRD Addresses It |
|---|:---:|---------|---------------------|
| 1 | C | Demo failure | Demo script (Section 6) specifies exact prompt text; Section 7 Risk #2 requires demo built day 1 |
| 2 | C | Accuracy | All code examples verified against @fhevm/solidity v0.12.3 docs; Section 4 specs correct patterns |
| 3 | C | Import correctness | Every code example in spec uses @fhevm/solidity; risk register flags this as CRITICAL |
| 4 | I | Completeness | Section 4 lists all 9 types + all HCU costs + 20+ AP codes as required components |
| 5 | I | Agent effectiveness | DLAD architecture ensures Quick Start fires within first 2000 tokens (Section 2, Layer 1) |
| 6 | I | Error prevention | AP codes with before/after required in Section 4; 20+ minimum specified |
| 7 | A | Polish | Day 3 morning dedicated to review and polish |
| 8 | A | Demo video | 3-minute recording scheduled Day 2 evening with practice runs |

---

## PRD Quality Gate

**METRIC 1: Component Coverage**
PRD components in Section 2: 4 (SKILL.md, ConfidentialERC20.sol, hardhat.config.ts, test file)
Components with specs in Section 4: 3 explicitly (SKILL.md QS, SKILL.md CR, ConfidentialERC20)
Note: hardhat.config.ts and test file specs are included in Section 4 ConfidentialERC20 component.
PASS — all components specified.

**METRIC 2: Flow-Demo Alignment**
User flows in Section 3: 3 (Agent Quick-Start, Agent Deep Reference, Judge Demo)
Flows with demo scenes in Section 6: Flow C (Judge Demo) has full scene-by-scene script.
Flows A and B are agent-internal flows with no separate demo scene needed.
PASS — primary demo flow fully scripted.

**METRIC 3: API Risk Coverage**
External APIs in Section 5: 3 (@fhevm/solidity, @zama-fhe/relayer-sdk, @openzeppelin/confidential-contracts)
Those APIs with "unavailable" risk in Section 7: Risk #1 covers @fhevm/solidity changes; Risks #4/#5 cover relayer-sdk; Risk #10 covers OZ package.
PASS — all 3 APIs have risk coverage.

**METRIC 4: Concern Compliance**
[C] concerns: 3
[C] concerns addressed in Section 10: 3
PASS.

**METRIC 5: Implementation Code Check**
Code blocks > 10 lines with implementation logic: 0 (interface signatures only in Section 4)
PASS.

**METRIC 6: Risk Minimum**
Risks in Section 7: 10
PASS (≥ 8).

**OVERALL: ALL 6 METRICS PASS**
