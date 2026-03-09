// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title PrivateMessenger
 * @notice Send encrypted messages using CoFHE.
 *         Recipient decrypts client-side using FHE.sealoutput + cofhejs permit.
 */
contract PrivateMessenger {

    struct Message {
        address sender;
        address recipient;
        euint32 content;
        uint256 timestamp;
    }

    uint256 public messageCount;
    mapping(uint256 => Message) public messages;
    mapping(address => uint256[]) public inbox;
    mapping(address => uint256[]) public outbox;

    event MessageSent(uint256 indexed id, address indexed sender, address indexed recipient, uint256 timestamp);

    function sendMessage(address recipient, InEuint32 calldata encContent) external {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot message yourself");

        uint256 id = messageCount++;
        euint32 content = FHE.asEuint32(encContent);

        FHE.allow(content, recipient);
        FHE.allowThis(content);
        FHE.allowSender(content);

        messages[id] = Message({
            sender:    msg.sender,
            recipient: recipient,
            content:   content,
            timestamp: block.timestamp
        });

        inbox[recipient].push(id);
        outbox[msg.sender].push(id);

        emit MessageSent(id, msg.sender, recipient, block.timestamp);
    }

    // Recipient calls this with their cofhejs permit publicKey
    // Returns sealed ciphertext that only their wallet can decrypt via cofhejs
    function sealContent(uint256 messageId, bytes32 publicKey) external view returns (string memory) {
        require(messageId < messageCount, "Invalid message ID");
        Message storage m = messages[messageId];
        require(m.recipient == msg.sender, "Not the recipient");
        return FHE.sealoutput(m.content, publicKey);
    }

    function getInbox(address user) external view returns (uint256[] memory) {
        return inbox[user];
    }

    function getOutbox(address user) external view returns (uint256[] memory) {
        return outbox[user];
    }

    function getMessage(uint256 id) external view returns (
        address sender,
        address recipient,
        uint256 timestamp
    ) {
        Message storage m = messages[id];
        return (m.sender, m.recipient, m.timestamp);
    }
}
