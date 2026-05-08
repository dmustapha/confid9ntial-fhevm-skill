# concerns.md — GENERATED-STUB (No warroom concerns file found. Expanded with project-specific risks.)

[C] Demo failure: Claude Code must generate correct ConfidentialERC20 code from a natural language prompt referencing SKILL.md, with all tests passing and deployment to Sepolia completing without manual intervention
[C] Accuracy: Every code example in SKILL.md must use @fhevm/solidity (not fhevm-solidity), FHE.makePubliclyDecryptable pattern (not deprecated TFHE.requestDecryption), and correct ACL grants
[C] Import correctness: NEVER reference fhevm-solidity (archived package) anywhere in SKILL.md — only @fhevm/solidity
[I] Completeness: SKILL.md must cover all verified types (euint8/16/32/64/128/160/256, ebool, eaddress), full HCU cost table, and 20+ anti-patterns
[I] Agent effectiveness: Quick Start section must enable Claude Code to generate correct FHEVM code before reading 1000+ lines — activation within first 2000 tokens
[I] Error prevention: AP codes must include before/after code examples showing the wrong pattern and the corrected pattern side-by-side
[A] Polish: SKILL.md formatting, section headers, and navigation anchors should be clean and professional
[A] Demo video: 3-minute recording showing Claude Code prompt → ConfidentialERC20 contract generation → compilation success
