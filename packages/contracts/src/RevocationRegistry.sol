// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./InstitutionRegistry.sol";
import "./CredentialRegistry.sol";

/**
 * RevocationRegistry
 *
 * Tracks which credentials have been revoked. When a credential is revoked,
 * the backend stops serving proofs for it immediately. The ZKVerifier will
 * still accept a proof for a revoked credential (it does not know about
 * revocation), so it is critical that the backend checks this contract
 * before running proof generation.
 *
 * Revocation is permanent. There is no un-revoke function. If an institution
 * needs to re-issue a credential (e.g. student's classification was corrected),
 * they issue a new credential with a new commitment and nullifier through
 * CredentialRegistry.
 *
 * Only the admin wallet of the institution that issued the credential can
 * revoke it. The contract checks InstitutionRegistry to enforce this.
 */
contract RevocationRegistry is AccessControl, Pausable {

    bytes32 public constant PLATFORM_ADMIN_ROLE = keccak256("PLATFORM_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE         = keccak256("PAUSER_ROLE");

    struct RevocationRecord {
        bytes32 institutionId;
        uint256 revokedAt;
        uint8   reasonCode;  // institution-defined category, e.g. 1=Error 2=Misconduct 3=Fraud
    }

    mapping(bytes32 => RevocationRecord) private _revocations;

    // cheaper to check existence separately
    mapping(bytes32 => bool) private _isRevoked;

    InstitutionRegistry public immutable institutionRegistry;
    CredentialRegistry  public immutable credentialRegistry;

    event CredentialRevoked(
        bytes32 indexed nullifier,
        bytes32 indexed institutionId,
        uint256 revokedAt,
        uint8   reasonCode
    );

    constructor(
        address platformAdmin,
        address institutionRegistryAddress,
        address credentialRegistryAddress
    ) {
        institutionRegistry = InstitutionRegistry(institutionRegistryAddress);
        credentialRegistry  = CredentialRegistry(credentialRegistryAddress);

        _grantRole(DEFAULT_ADMIN_ROLE,  platformAdmin);
        _grantRole(PLATFORM_ADMIN_ROLE, platformAdmin);
        _grantRole(PAUSER_ROLE,         platformAdmin);
    }

    /**
     * revokeCredential
     *
     * Only the admin wallet of the institution that issued the credential
     * can revoke it. We look up the credential's institutionId from
     * CredentialRegistry and then verify the caller is that institution's
     * registered admin wallet.
     */
    function revokeCredential(
        bytes32 nullifier,
        uint8   reasonCode
    ) external whenNotPaused {
        require(!_isRevoked[nullifier], "credential already revoked");
        require(credentialRegistry.credentialExists(nullifier), "credential not found");

        // find out which institution issued this credential
        (bytes32 issuingInstitutionId,,,, ) = credentialRegistry.getCredential(nullifier);

        // make sure the institution is still active
        require(
            institutionRegistry.isInstitutionActive(issuingInstitutionId),
            "institution is not active"
        );

        // make sure the caller is that institution's admin wallet
        require(
            msg.sender == institutionRegistry.getAdminWallet(issuingInstitutionId),
            "only the issuing institution admin wallet can revoke"
        );

        _revocations[nullifier] = RevocationRecord({
            institutionId: issuingInstitutionId,
            revokedAt:     block.timestamp,
            reasonCode:    reasonCode
        });
        _isRevoked[nullifier] = true;

        emit CredentialRevoked(nullifier, issuingInstitutionId, block.timestamp, reasonCode);
    }

    // ----------------------------------------------------------------
    // View functions
    // ----------------------------------------------------------------

    function isRevoked(bytes32 nullifier) external view returns (bool) {
        return _isRevoked[nullifier];
    }

    function getRevocation(bytes32 nullifier) external view returns (
        bytes32 institutionId,
        uint256 revokedAt,
        uint8   reasonCode
    ) {
        require(_isRevoked[nullifier], "credential not revoked");
        RevocationRecord storage r = _revocations[nullifier];
        return (r.institutionId, r.revokedAt, r.reasonCode);
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
