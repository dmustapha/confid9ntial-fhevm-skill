// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ConfidentialVote is ZamaEthereumConfig, Ownable {
    uint256 public voteEnd;
    uint256 public optionCount;
    bool    public tallied;

    mapping(address => bool)    public hasVoted;
    mapping(uint256 => euint32) private _tallies; // option → encrypted tally

    event VoteCast(address indexed voter);
    event TallyRevealed(uint256 optionIndex);

    constructor(uint256 _optionCount, uint256 durationSeconds) Ownable(msg.sender) {
        optionCount = _optionCount;
        voteEnd     = block.timestamp + durationSeconds;
        for (uint256 i = 0; i < _optionCount; i++) {
            _tallies[i] = FHE.asEuint32(0);
            FHE.allowThis(_tallies[i]);
        }
    }

    // Vote using an encrypted boolean per option (1 = voted for, 0 = not)
    function castVote(
        externalEbool[] calldata encVotes,
        bytes calldata proof
    ) external {
        require(block.timestamp < voteEnd, "Voting ended");
        require(!hasVoted[msg.sender], "Already voted");
        require(encVotes.length == optionCount, "Wrong option count");

        hasVoted[msg.sender] = true;

        for (uint256 i = 0; i < optionCount; i++) {
            ebool  voted    = FHE.fromExternal(encVotes[i], proof);
            euint32 voteVal = FHE.select(voted, FHE.asEuint32(1), FHE.asEuint32(0));
            euint32 newTally = FHE.add(_tallies[i], voteVal);
            _tallies[i] = newTally;
            FHE.allowThis(newTally);
            FHE.allow(newTally, owner());
        }

        emit VoteCast(msg.sender);
    }

    function revealTally(uint256 optionIndex) external onlyOwner {
        require(block.timestamp >= voteEnd, "Voting not ended");
        require(optionIndex < optionCount, "Invalid option");
        FHE.makePubliclyDecryptable(_tallies[optionIndex]);
        emit TallyRevealed(optionIndex);
    }

    function tallyHandleOf(uint256 optionIndex) external view returns (uint256) {
        require(optionIndex < optionCount, "Invalid option");
        return uint256(euint32.unwrap(_tallies[optionIndex]));
    }
}
