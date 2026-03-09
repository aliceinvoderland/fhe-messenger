// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title PrivateMessenger
 * @notice Send encrypted secret codes/numbers to any address using CoFHE.
 *         Only the recipient can decrypt the message content.
 */
contract PrivateMessenger {

    struct Message {
        address sender;
        address recipient;
        euint32 content;       // encrypted message content
        uint256 timestamp;
        uint256 revealedValue; // 0 until decrypted
        bool revealed;
    }

    uint256 public messageCount;
    mapping(uint256 => Message) public messages;
    mapping(address => uint256[]) public inbox;
    mapping(address => uint256[]) public outbox;

    event MessageSent(uint256 indexed id, address indexed sender, address indexed recipient, uint256 timestamp);
    event DecryptRequested(uint256 indexed id, address indexed recipient);

    // ── Send ─────────────────────────────────────────────────────────────────
    function sendMessage(address recipient, InEuint32 calldata encContent) external {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot message yourself");

        uint256 id = messageCount++;
        euint32 content = FHE.asEuint32(encContent);

        // Allow recipient and this contract to access the encrypted value
        FHE.allow(content, recipient);
        FHE.allowThis(content);
        FHE.allowSender(content);

        messages[id] = Message({
            sender:        msg.sender,
            recipient:     recipient,
            content:       content,
            timestamp:     block.timestamp,
            revealedValue: 0,
            revealed:      false
        });

        inbox[recipient].push(id);
        outbox[msg.sender].push(id);

        emit MessageSent(id, msg.sender, recipient, block.timestamp);
    }

    // ── Request decrypt ───────────────────────────────────────────────────────
    function requestDecrypt(uint256 messageId) external {
        require(messageId < messageCount, "Invalid message ID");
        Message storage m = messages[messageId];
        require(m.recipient == msg.sender, "Not the recipient");
        require(!m.revealed, "Already revealed");

        FHE.decrypt(m.content);
        emit DecryptRequested(messageId, msg.sender);
    }

    // ── Check decrypt result ──────────────────────────────────────────────────
    function getDecryptedContent(uint256 messageId) external view returns (uint256 value, bool ready) {
        require(messageId < messageCount, "Invalid message ID");
        Message storage m = messages[messageId];
        require(m.recipient == msg.sender || m.sender == msg.sender, "Not authorized");

        (uint32 v, bool r) = FHE.getDecryptResultSafe(m.content);
        return (uint256(v), r);
    }

    // ── Read helpers ──────────────────────────────────────────────────────────
    function getInbox(address user) external view returns (uint256[] memory) {
        return inbox[user];
    }

    function getOutbox(address user) external view returns (uint256[] memory) {
        return outbox[user];
    }

    function getMessage(uint256 id) external view returns (
        address sender,
        address recipient,
        uint256 timestamp,
        bool revealed,
        uint256 revealedValue
    ) {
        Message storage m = messages[id];
        return (m.sender, m.recipient, m.timestamp, m.revealed, m.revealedValue);
    }
}
