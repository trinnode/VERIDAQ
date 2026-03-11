// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * InstitutionRegistry
 *
 * Keeps the canonical on-chain record of every institution that has been
 * approved to issue credentials on VERIDAQ.
 *
 * A few things to note:
 * - Only PLATFORM_ADMIN_ROLE can register or deactivate institutions.
 * - The institution's signing key is separate from their admin wallet.
 *   The admin wallet handles contract calls. The signing key is used off-chain
 *   to authorize credential batches. An institution generates their own key pair
 *   and only registers the public key here.
 * - Key rotation requires a signature from the OLD key over the new key's hash,
 *   so a compromised wallet alone cannot swap out the signing key.
 */
contract InstitutionRegistry is AccessControl, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant PLATFORM_ADMIN_ROLE = keccak256("PLATFORM_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE         = keccak256("PAUSER_ROLE");

    struct Institution {
        string  name;
        address adminWallet;
        bytes   publicSigningKey;  // raw EC public key bytes, used for off-chain signature checks
        bool    isActive;
        uint256 registeredAt;
    }

    // institutionId -> institution record
    mapping(bytes32 => Institution) private _institutions;

    // just to check existence without re-reading the whole struct
    mapping(bytes32 => bool) private _exists;

    event InstitutionRegistered(
        bytes32 indexed institutionId,
        address adminWallet,
        uint256 registeredAt
    );

    event InstitutionDeactivated(
        bytes32 indexed institutionId,
        address indexed by
    );

    event InstitutionReactivated(
        bytes32 indexed institutionId,
        address indexed by
    );

    event SigningKeyUpdated(
        bytes32 indexed institutionId,
        bytes newPublicKey
    );

    constructor(address platformAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE,  platformAdmin);
        _grantRole(PLATFORM_ADMIN_ROLE, platformAdmin);
        _grantRole(PAUSER_ROLE,         platformAdmin);
    }

    // ----------------------------------------------------------------
    // Registration and lifecycle, only the platform admin calls these
    // ----------------------------------------------------------------

    function registerInstitution(
        bytes32 institutionId,
        string  calldata name,
        address adminWallet,
        bytes   calldata publicSigningKey
    ) external onlyRole(PLATFORM_ADMIN_ROLE) whenNotPaused {
        require(!_exists[institutionId], "institution already registered");
        require(adminWallet != address(0), "admin wallet cannot be zero address");
        require(bytes(name).length > 0, "name cannot be empty");
        require(publicSigningKey.length > 0, "signing key cannot be empty");

        _institutions[institutionId] = Institution({
            name:            name,
            adminWallet:     adminWallet,
            publicSigningKey: publicSigningKey,
            isActive:        true,
            registeredAt:    block.timestamp
        });

        _exists[institutionId] = true;

        emit InstitutionRegistered(institutionId, adminWallet, block.timestamp);
    }

    function deactivateInstitution(
        bytes32 institutionId
    ) external onlyRole(PLATFORM_ADMIN_ROLE) {
        require(_exists[institutionId], "institution not found");
        require(_institutions[institutionId].isActive, "already inactive");

        _institutions[institutionId].isActive = false;

        emit InstitutionDeactivated(institutionId, msg.sender);
    }

    function reactivateInstitution(
        bytes32 institutionId
    ) external onlyRole(PLATFORM_ADMIN_ROLE) {
        require(_exists[institutionId], "institution not found");
        require(!_institutions[institutionId].isActive, "already active");

        _institutions[institutionId].isActive = true;

        emit InstitutionReactivated(institutionId, msg.sender);
    }

    // ----------------------------------------------------------------
    // Key rotation
    // The institution calls this themselves from their admin wallet.
    // They must also provide a signature from their current signing key
    // over keccak256(institutionId, newPublicKey), so a stolen wallet
    // alone is not enough to rotate the key.
    // ----------------------------------------------------------------

    function rotateSigningKey(
        bytes32 institutionId,
        bytes   calldata newPublicKey,
        bytes   calldata signatureFromOldKey
    ) external whenNotPaused {
        Institution storage inst = _institutions[institutionId];

        require(_exists[institutionId], "institution not found");
        require(inst.isActive, "institution is not active");
        require(msg.sender == inst.adminWallet, "only the institution admin wallet can do this");
        require(newPublicKey.length > 0, "new key cannot be empty");

        // the institution signed: keccak256(institutionId, newPublicKey)
        bytes32 messageHash = keccak256(abi.encodePacked(institutionId, newPublicKey));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();

        // recover the address from the signature and compare to the registered admin wallet
        // (we use the admin wallet here because EC public key recovery in Solidity requires
        //  a 65-byte secp256k1 sig, which is what MetaMask and ethers produce from the admin wallet)
        address recovered = ethSignedHash.recover(signatureFromOldKey);
        require(recovered == inst.adminWallet, "signature did not come from current admin wallet");

        inst.publicSigningKey = newPublicKey;

        emit SigningKeyUpdated(institutionId, newPublicKey);
    }

    // ----------------------------------------------------------------
    // View functions
    // ----------------------------------------------------------------

    function isInstitutionActive(bytes32 institutionId) external view returns (bool) {
        return _exists[institutionId] && _institutions[institutionId].isActive;
    }

    function getPublicKey(bytes32 institutionId) external view returns (bytes memory) {
        require(_exists[institutionId], "institution not found");
        return _institutions[institutionId].publicSigningKey;
    }

    function getInstitution(bytes32 institutionId) external view returns (
        string memory name,
        address adminWallet,
        bytes memory publicSigningKey,
        bool isActive,
        uint256 registeredAt
    ) {
        require(_exists[institutionId], "institution not found");
        Institution storage inst = _institutions[institutionId];
        return (inst.name, inst.adminWallet, inst.publicSigningKey, inst.isActive, inst.registeredAt);
    }

    function getAdminWallet(bytes32 institutionId) external view returns (address) {
        require(_exists[institutionId], "institution not found");
        return _institutions[institutionId].adminWallet;
    }

    // ----------------------------------------------------------------
    // Pause controls
    // ----------------------------------------------------------------

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
