// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * SubscriptionManager
 *
 * Tracks subscription tier and employer verification counts on chain.
 * Tiers are also tracked in the backend database, but the on-chain record
 * is authoritative for gas sponsorship decisions in PaymasterVault.
 *
 * Institution tiers:
 *   0 = FREE  -> platform sponsors gas for batches under 1000 records
 *   1 = PAID  -> institution always funds their own gas
 *
 * Employer verification counter:
 *   Free tier employers get 3 lifetime verifications. Once consumed,
 *   BUNDLER_ROLE tries to increment and gets the FreeVerificationsExhausted revert,
 *   which the backend catches and returns a 402 to the employer.
 *   The counter never resets.
 */
contract SubscriptionManager is AccessControl, Pausable {

    bytes32 public constant PLATFORM_ADMIN_ROLE = keccak256("PLATFORM_ADMIN_ROLE");
    bytes32 public constant BUNDLER_ROLE        = keccak256("BUNDLER_ROLE");
    bytes32 public constant PAUSER_ROLE         = keccak256("PAUSER_ROLE");

    uint8 public constant INSTITUTION_TIER_FREE = 0;
    uint8 public constant INSTITUTION_TIER_PAID = 1;

    uint256 public constant EMPLOYER_FREE_VERIFICATION_LIMIT = 3;

    // institution subscription tiers
    mapping(bytes32 => uint8) private _institutionTier;

    // employer on-chain verification counts.
    // we use the employer's wallet address as the key so the backend
    // can check this without needing to know our internal employer ID.
    mapping(address => uint256) private _employerVerificationCount;

    // mark employers who have upgraded past free tier
    mapping(address => bool) private _employerPaidTier;

    event InstitutionTierUpdated(bytes32 indexed institutionId, uint8 tier);
    event EmployerVerificationConsumed(address indexed employer, uint256 totalUsed);
    event FreeVerificationsExhausted(address indexed employer);
    event EmployerUpgradedToPaid(address indexed employer);

    constructor(address platformAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE,  platformAdmin);
        _grantRole(PLATFORM_ADMIN_ROLE, platformAdmin);
        _grantRole(BUNDLER_ROLE,        platformAdmin);  // platform admin is also bundler initially
        _grantRole(PAUSER_ROLE,         platformAdmin);
    }

    // ----------------------------------------------------------------
    // Institution tier management
    // ----------------------------------------------------------------

    function setInstitutionTier(
        bytes32 institutionId,
        uint8   tier
    ) external onlyRole(PLATFORM_ADMIN_ROLE) {
        require(tier == INSTITUTION_TIER_FREE || tier == INSTITUTION_TIER_PAID, "unknown institution tier");
        _institutionTier[institutionId] = tier;
        emit InstitutionTierUpdated(institutionId, tier);
    }

    function getInstitutionTier(bytes32 institutionId) external view returns (uint8) {
        return _institutionTier[institutionId];
    }

    // ----------------------------------------------------------------
    // Employer verification counting
    // ----------------------------------------------------------------

    /**
     * incrementVerificationCount
     *
     * Called by the backend (via BUNDLER_ROLE) when an employer submits a
     * verification request. If the employer is on free tier and has used all
     * 3 verifications, this reverts. The backend catches the revert and sends
     * a 402 back to the employer.
     *
     * Paid tier employers bypass this check.
     */
    function incrementVerificationCount(address employer) external onlyRole(BUNDLER_ROLE) whenNotPaused {
        if (_employerPaidTier[employer]) {
            // paid tier: just count, no limit
            _employerVerificationCount[employer] += 1;
            emit EmployerVerificationConsumed(employer, _employerVerificationCount[employer]);
            return;
        }

        // free tier
        if (_employerVerificationCount[employer] >= EMPLOYER_FREE_VERIFICATION_LIMIT) {
            emit FreeVerificationsExhausted(employer);
            revert("employer has used all free verifications");
        }

        _employerVerificationCount[employer] += 1;
        emit EmployerVerificationConsumed(employer, _employerVerificationCount[employer]);
    }

    /**
     * upgradeEmployerToPaid
     *
     * Platform admin marks an employer as paid tier after their subscription
     * is activated in the database.
     */
    function upgradeEmployerToPaid(address employer) external onlyRole(PLATFORM_ADMIN_ROLE) {
        _employerPaidTier[employer] = true;
        emit EmployerUpgradedToPaid(employer);
    }

    function getRemainingFreeVerifications(address employer) external view returns (uint256) {
        if (_employerPaidTier[employer]) {
            // paid tier has no hard limit tracked here
            return type(uint256).max;
        }
        uint256 used = _employerVerificationCount[employer];
        if (used >= EMPLOYER_FREE_VERIFICATION_LIMIT) {
            return 0;
        }
        return EMPLOYER_FREE_VERIFICATION_LIMIT - used;
    }

    function getVerificationCount(address employer) external view returns (uint256) {
        return _employerVerificationCount[employer];
    }

    function isEmployerPaidTier(address employer) external view returns (bool) {
        return _employerPaidTier[employer];
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
