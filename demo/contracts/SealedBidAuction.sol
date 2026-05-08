// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SealedBidAuction is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    uint256 public auctionEnd;
    bool    public revealed;

    // Encrypted bids: bidder → encrypted amount
    mapping(address => euint64) private _bids;
    address[] public bidders;

    // Encrypted tracking of highest bid
    euint64  private _highestBid;
    eaddress private _highestBidder;

    event BidPlaced(address indexed bidder);
    event AuctionRevealed(address winner);

    constructor(uint256 durationSeconds) Ownable(msg.sender) {
        auctionEnd = block.timestamp + durationSeconds;
        _highestBid    = FHE.asEuint64(0);
        _highestBidder = FHE.asEaddress(address(0));
        FHE.allowThis(_highestBid);
        FHE.allowThis(_highestBidder);
    }

    function placeBid(
        externalEuint64 encBid,
        bytes calldata proof
    ) external {
        require(block.timestamp < auctionEnd, "Auction ended");

        euint64 bid = FHE.fromExternal(encBid, proof);

        // Update encrypted max bid and bidder (fully private)
        ebool   isHigher    = FHE.gt(bid, _highestBid);
        euint64 newHighBid  = FHE.select(isHigher, bid, _highestBid);
        eaddress newHighder = FHE.select(isHigher,
            FHE.asEaddress(msg.sender), _highestBidder);

        _bids[msg.sender]  = bid;
        _highestBid        = newHighBid;
        _highestBidder     = newHighder;

        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);
        FHE.allowThis(newHighBid);
        FHE.allowThis(newHighder);
        FHE.allow(newHighBid, owner());
        FHE.allow(newHighder, owner());

        if (euint64.unwrap(_bids[msg.sender]) == 0) bidders.push(msg.sender);
        emit BidPlaced(msg.sender);
    }

    function revealWinner() external onlyOwner {
        require(block.timestamp >= auctionEnd, "Auction not ended");
        require(!revealed, "Already revealed");
        revealed = true;
        FHE.makePubliclyDecryptable(_highestBid);
        FHE.makePubliclyDecryptable(_highestBidder);
        emit AuctionRevealed(address(0)); // actual winner revealed via relayer
    }

    function revealMyBid() external {
        require(block.timestamp >= auctionEnd, "Auction not ended");
        FHE.makePubliclyDecryptable(_bids[msg.sender]);
    }
}
