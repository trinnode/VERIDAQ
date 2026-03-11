// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./InstitutionRegistry.sol";

/**
 * CredentialRegistry
 *
 * Stores the commitment+nullifier pairs for every student credential that has
 * been issued through VERIDAQ. Nothing in here is personal data.
 * A commitment is Poseidon(all 7 private credential fields) and the nullifier
 * is Poseidon(matricNumber, institutionId). Both are opaque to anyone who does
 * not have the private inputs from the credential record.
 *
 * Once a credential is registered here it cannot be changed or deleted.
 * Revocation is handled in RevocationRegistry. This contract only handles
 * the initial registration of commitments.
 */
contract CredentialRegistry is AccessControl, Pausable, ReentrancyGuard {

    bytes32 public constant PLATFORM_ADMIN_ROLE = keccak256("PLATFORM_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE         = keccak256("PAUSER_ROLE");

    struct CredentialRecord {
        bytes32 institutionId;
        bytes32 commitment;
        uint16  graduationYear;
        uint8   degreeTypeCode;  // matches classification codes: 1=Third 2=Lower 3=Upper 4=First
        uint256 registeredAt;
    }

    // nullifier -> credential record
    // we index by nullifier so the backend can look up a commitment by nullifier
    mapping(bytes32 => CredentialRecord) private _credentials;

    // track which nullifiers we have so we can check existence cheaply
    mapping(bytes32 => bool) private _nullifierExists;

    InstitutionRegistry public immutable institutionRegistry;

    event CredentialRegistered(
        bytes32 indexed institutionId,
        bytes32 indexed nullifier,
        bytes32 commitment,
        uint16  graduationYear
    );

    event CredentialsBatchRegistered(
        bytes32 indexed institutionId,
        uint256 count,
        uint256 timestamp
    );

    constructor(address platformAdmin, address institutionRegistryAddress) {
        institutionRegistry = InstitutionRegistry(institutionRegistryAddress);

        _grantRole(DEFAULT_ADMIN_ROLE,  platformAdmin);
        _grantRole(PLATFORM_ADMIN_ROLE, platformAdmin);
        _grantRole(PAUSER_ROLE,         platformAdmin);
    }

    // ----------------------------------------------------------------
    // Registration functions
    // Only callable by a registered, active institution admin wallet.
    // We check this against the InstitutionRegistry.
    // ----------------------------------------------------------------

    /**
     * registerBatch
     *
     * This is the main entry point for uploading a graduating class.
     * The backend batches all commitments and nullifiers from the Excel upload
     * into one transaction to minimise gas cost.
     *
     * If ANY nullifier in the batch already exists, the entire batch reverts.
     * This matches the behavior required by the edge case spec: a duplicate row
     * fails the whole batch, nothing gets registered.
     */
    function registerBatch(
        bytes32          institutionId,
        bytes32[] calldata commitments,
        bytes32[] calldata nullifiers,
        uint16[]  calldata graduationYears,
        uint8[]   calldata degreeTypeCodes
    ) external nonReentrant whenNotPaused {
        require(institutionRegistry.isInstitutionActive(institutionId), "institution is not active");
        require(
            msg.sender == institutionRegistry.getAdminWallet(institutionId),
            "only the institution admin wallet can register credentials"
        );

        uint256 count = commitments.length;
        require(count > 0, "batch cannot be empty");
        require(
            nullifiers.length == count &&
            graduationYears.length == count &&
            degreeTypeCodes.length == count,
            "array lengths do not match"
        );

        // check every nullifier first before writing anything
        // so a duplicate near the end does not leave a partial batch
        for (uint256 i = 0; i < count; i++) {
            require(!_nullifierExists[nullifiers[i]], "duplicate nullifier in batch");
            require(commitments[i] != bytes32(0), "commitment cannot be zero");
            require(nullifiers[i] != bytes32(0), "nullifier cannot be zero");
        }

        // all checks passed, now write
        for (uint256 i = 0; i < count; i++) {
            _credentials[nullifiers[i]] = CredentialRecord({
                institutionId:  institutionId,
                commitment:     commitments[i],
                graduationYear: graduationYears[i],
                degreeTypeCode: degreeTypeCodes[i],
                registeredAt:   block.timestamp
            });
            _nullifierExists[nullifiers[i]] = true;

            emit CredentialRegistered(institutionId, nullifiers[i], commitments[i], graduationYears[i]);
        }

        emit CredentialsBatchRegistered(institutionId, count, block.timestamp);
    }

    /**
     * registerSingle
     *
     * For adding individual credentials outside of batch upload cycles.
     * Same access control rules as registerBatch.
     */
    function registerSingle(
        bytes32 institutionId,
        bytes32 commitment,
        bytes32 nullifier,
        uint16  graduationYear,
        uint8   degreeTypeCode
    ) external nonReentrant whenNotPaused {
        require(institutionRegistry.isInstitutionActive(institutionId), "institution is not active");
        require(
            msg.sender == institutionRegistry.getAdminWallet(institutionId),
            "only the institution admin wallet can register credentials"
        );
        require(!_nullifierExists[nullifier], "credential already registered");
        require(commitment != bytes32(0), "commitment cannot be zero");
        require(nullifier != bytes32(0), "nullifier cannot be zero");

        _credentials[nullifier] = CredentialRecord({
            institutionId:  institutionId,
            commitment:     commitment,
            graduationYear: graduationYear,
            degreeTypeCode: degreeTypeCode,
            registeredAt:   block.timestamp
        });
        _nullifierExists[nullifier] = true;

        emit CredentialRegistered(institutionId, nullifier, commitment, graduationYear);
    }

    // ----------------------------------------------------------------
    // View functions
    // ----------------------------------------------------------------

    function credentialExists(bytes32 nullifier) external view returns (bool) {
        return _nullifierExists[nullifier];
    }

    function getCommitment(bytes32 nullifier) external view returns (bytes32) {
        require(_nullifierExists[nullifier], "credential not found");
        return _credentials[nullifier].commitment;
    }

    function getCredential(bytes32 nullifier) external view returns (
        bytes32 institutionId,
        bytes32 commitment,
        uint16  graduationYear,
        uint8   degreeTypeCode,
        uint256 registeredAt
    ) {
        require(_nullifierExists[nullifier], "credential not found");
        CredentialRecord storage cr = _credentials[nullifier];
        return (cr.institutionId, cr.commitment, cr.graduationYear, cr.degreeTypeCode, cr.registeredAt);
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
