// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ConfidentialERC20
/// @notice ERC-20 token with encrypted balances using @fhevm/solidity v0.11.1
/// @dev Demonstrates: ZamaEthereumConfig, ACL, ZKPoK inputs, async decryption
contract ConfidentialERC20 is ZamaEthereumConfig, ReentrancyGuard, Pausable, Ownable {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    /// @dev Encrypted balances — each address holds an euint64
    mapping(address => euint64) private _balances;

    event Transfer(address indexed from, address indexed to);
    event Mint(address indexed to, uint64 amount);

    constructor(string memory _name, string memory _symbol) Ownable(msg.sender) {
        name = _name;
        symbol = _symbol;
    }

    /// @notice Mint plaintext amount to recipient (owner only)
    /// @param to Recipient address
    /// @param amount Plaintext amount to mint
    function mint(address to, uint64 amount) external onlyOwner {
        euint64 mintAmount = FHE.asEuint64(amount);
        _balances[to] = FHE.add(_balances[to], mintAmount);
        // Grant recipient access to their balance
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        emit Mint(to, amount);
    }

    /// @notice Transfer encrypted amount using ZKPoK-validated input
    /// @param to Recipient address
    /// @param encryptedAmount ZKPoK-verified encrypted transfer amount
    /// @param inputProof Zero-knowledge proof validating the encrypted input
    function transfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external nonReentrant whenNotPaused {
        // AP-007: Always validate ZKPoK proof via FHE.fromExternal
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // AP-008: Underflow guard — transfer 0 if sender has insufficient balance
        euint64 senderBal = _balances[msg.sender];
        ebool hasEnough = FHE.le(amount, senderBal);
        euint64 xferAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));

        // Update balances
        _balances[msg.sender] = FHE.sub(senderBal, xferAmount);
        _balances[to] = FHE.add(_balances[to], xferAmount);

        // AP-003: Grant ACL access after every state mutation
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);

        emit Transfer(msg.sender, to);
    }

    /// @notice Mark caller's balance as publicly decryptable (new v0.9+ pattern)
    /// @dev After calling this, off-chain relayer can decrypt via publicDecrypt()
    function makeMyBalanceDecryptable() external {
        // AP-015: verify caller has ACL access before granting public decryptability
        require(FHE.isAllowed(_balances[msg.sender], msg.sender), "Not authorized");
        FHE.makePubliclyDecryptable(_balances[msg.sender]);
    }

    /// @notice Get the encrypted balance handle for an address
    /// @param account Address to query
    /// @return Encrypted balance handle (euint64)
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Emergency pause (owner only)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause (owner only)
    function unpause() external onlyOwner {
        _unpause();
    }
}
