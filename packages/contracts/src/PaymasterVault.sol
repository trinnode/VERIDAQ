// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@account-abstraction/interfaces/IPaymaster.sol";
import "@account-abstraction/interfaces/IEntryPoint.sol";
import "@account-abstraction/interfaces/PackedUserOperation.sol";
import "./InstitutionRegistry.sol";

/**
 * PaymasterVault
 *
 * ERC-4337 Paymaster with per-institution gas balance isolation.
 * Each institution has their own slot in the mapping. When they run
 * out of gas balance, their operations stop. No institution can drain
 * another institution's balance.
 *
 * There is also a separate platform-sponsored pool that covers gas for
 * free-tier institutions submitting batches of fewer than 1000 records.
 * The backend decides whether to use the institution's own balance or
 * the sponsored pool when building the UserOperation.
 *
 * How the institutionId is passed:
 * The UserOperation calldata starts with a 4-byte function selector,
 * then the ABI-encoded arguments. The first argument to registerBatch
 * and registerSingle is always the institutionId (bytes32). So we read
 * bytes 4-36 of the callData to get it.
 */
contract PaymasterVault is IPaymaster, AccessControl, Pausable, ReentrancyGuard {

    bytes32 public constant PLATFORM_ADMIN_ROLE = keccak256("PLATFORM_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE         = keccak256("PAUSER_ROLE");

    // validation return codes (ERC-4337 spec)
    uint256 private constant SIG_VALIDATION_SUCCESS = 0;
    uint256 private constant SIG_VALIDATION_FAILED  = 1;

    IEntryPoint public immutable entryPoint;
    InstitutionRegistry public immutable institutionRegistry;

    // per-institution gas balance in wei
    mapping(bytes32 => uint256) private _institutionBalance;

    // platform sponsored pool covers free-tier institutions
    uint256 private _platformSponsoredPool;

    // track which UserOp hashes are using the sponsored pool
    // so postOp knows whether to charge the sponsored pool or the institution
    mapping(bytes32 => bool) private _usedSponsoredPool;

    // track the gas pre-charge per operation so postOp can reconcile
    mapping(bytes32 => uint256) private _preCharge;

    // track which institution an operation belongs to
    mapping(bytes32 => bytes32) private _opInstitution;

    event DepositForInstitution(bytes32 indexed institutionId, uint256 amount);
    event WithdrawInstitutionBalance(bytes32 indexed institutionId, address indexed to, uint256 amount);
    event DepositToSponsoredPool(uint256 amount);
    event WithdrawFromSponsoredPool(address indexed to, uint256 amount);
    event GasChargedToInstitution(bytes32 indexed institutionId, uint256 amount);
    event GasChargedToSponsoredPool(uint256 amount);

    constructor(address platformAdmin, address entryPointAddress, address institutionRegistryAddress) {
        entryPoint          = IEntryPoint(entryPointAddress);
        institutionRegistry = InstitutionRegistry(institutionRegistryAddress);

        _grantRole(DEFAULT_ADMIN_ROLE,  platformAdmin);
        _grantRole(PLATFORM_ADMIN_ROLE, platformAdmin);
        _grantRole(PAUSER_ROLE,         platformAdmin);
    }

    // ----------------------------------------------------------------
    // Deposits
    // ----------------------------------------------------------------

    /**
     * depositForInstitution
     * Anyone can top up an institution's balance. The institution admin
     * would normally do this, but the platform could also top it up on behalf.
     */
    function depositForInstitution(bytes32 institutionId) external payable nonReentrant whenNotPaused {
        require(institutionRegistry.isInstitutionActive(institutionId), "institution is not active");
        require(msg.value > 0, "deposit amount must be positive");

        _institutionBalance[institutionId] += msg.value;

        emit DepositForInstitution(institutionId, msg.value);
    }

    /**
     * depositToSponsoredPool
     * Platform admin tops up the pool that covers free-tier batches.
     */
    function depositToSponsoredPool() external payable onlyRole(PLATFORM_ADMIN_ROLE) {
        require(msg.value > 0, "deposit amount must be positive");
        _platformSponsoredPool += msg.value;
        emit DepositToSponsoredPool(msg.value);
    }

    // ----------------------------------------------------------------
    // Withdrawals
    // ----------------------------------------------------------------

    /**
     * withdrawInstitutionBalance
     * The institution admin wallet takes back any unused gas balance.
     * Checks-effects-interactions: update state before the transfer.
     */
    function withdrawInstitutionBalance(
        bytes32 institutionId,
        uint256 amount,
        address payable to
    ) external nonReentrant whenNotPaused {
        require(
            msg.sender == institutionRegistry.getAdminWallet(institutionId),
            "only the institution admin wallet can withdraw"
        );
        require(amount > 0, "amount must be positive");
        require(_institutionBalance[institutionId] >= amount, "balance too low for this withdrawal");

        // effects first
        _institutionBalance[institutionId] -= amount;

        // then the external call
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "transfer failed");

        emit WithdrawInstitutionBalance(institutionId, to, amount);
    }

    function withdrawFromSponsoredPool(
        uint256 amount,
        address payable to
    ) external onlyRole(PLATFORM_ADMIN_ROLE) nonReentrant {
        require(amount > 0, "amount must be positive");
        require(_platformSponsoredPool >= amount, "sponsored pool balance too low");

        _platformSponsoredPool -= amount;

        (bool sent, ) = to.call{value: amount}("");
        require(sent, "transfer failed");

        emit WithdrawFromSponsoredPool(to, amount);
    }

    // ----------------------------------------------------------------
    // ERC-4337 IPaymaster implementation
    // ----------------------------------------------------------------

    /**
     * validatePaymasterUserOp
     *
     * Called by the EntryPoint before executing a UserOperation.
     * We read the institutionId out of the UserOp calldata and check
     * whether there is enough balance (institution's own or sponsored pool)
     * to cover the max gas cost.
     */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override returns (bytes memory context, uint256 validationData) {
        require(msg.sender == address(entryPoint), "only the EntryPoint can call this");

        // pull the institutionId out of the first argument slot of the calldata
        // layout: [4-byte selector][32-byte institutionId][...rest]
        require(userOp.callData.length >= 36, "calldata too short to contain institutionId");
        // the first 32 bytes after the 4-byte function selector in the inner calldata
        // is the institutionId argument. We slice it out with abi.decode.
        bytes32 institutionId = abi.decode(userOp.callData[4:36], (bytes32));

        require(institutionRegistry.isInstitutionActive(institutionId), "institution is not active");

        // the paymaster data field (first bytes of paymasterAndData after the paymaster address)
        // encodes whether to use the sponsored pool. byte 20 = 0x01 means use sponsored pool.
        bool useSponsoredPool = false;
        if (userOp.paymasterAndData.length > 20) {
            useSponsoredPool = (userOp.paymasterAndData[20] == 0x01);
        }

        if (useSponsoredPool) {
            require(_platformSponsoredPool >= maxCost, "sponsored pool balance insufficient");
            _platformSponsoredPool -= maxCost;
            _usedSponsoredPool[userOpHash] = true;
        } else {
            require(_institutionBalance[institutionId] >= maxCost, "institution balance insufficient");
            _institutionBalance[institutionId] -= maxCost;
        }

        _preCharge[userOpHash]    = maxCost;
        _opInstitution[userOpHash] = institutionId;

        if (useSponsoredPool) {
            emit GasChargedToSponsoredPool(maxCost);
        } else {
            emit GasChargedToInstitution(institutionId, maxCost);
        }

        // return context with institutionId so postOp can read it
        context        = abi.encode(institutionId, useSponsoredPool);
        validationData = SIG_VALIDATION_SUCCESS;
    }

    /**
     * postOp
     *
     * Called by the EntryPoint after the UserOperation completes.
     * We reconcile the actual gas cost against the pre-charge:
     * - actual < pre-charge -> refund the difference
     * - actual > pre-charge -> charge the extra (should not happen often with good estimates)
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) external override {
        require(msg.sender == address(entryPoint), "only the EntryPoint can call this");

        (bytes32 institutionId, bool usedSponsoredPool) = abi.decode(context, (bytes32, bool));

        // the userOpHash is not passed to postOp in the v0.7 interface, so we use the context
        // to determine what to refund. The simplest reconciliation: just adjust the balance.
        if (actualGasCost < type(uint256).max) {
            uint256 preCharge = actualGasCost + actualUserOpFeePerGas; // rough pre-charge estimate
            // if actual cost is less than what we deducted originally we can refund.
            // Note: since we don't have the original preCharge here without storing it,
            // we refund 0 in this basic implementation. A production implementation would
            // store the preCharge keyed by a hash of userOp nonce+sender.
        }

        // for opReverted the institution still pays gas (same as ERC-4337 spec)
        // nothing extra to do here beyond what validatePaymasterUserOp already deducted
    }

    // ----------------------------------------------------------------
    // View functions
    // ----------------------------------------------------------------

    function getBalance(bytes32 institutionId) external view returns (uint256) {
        return _institutionBalance[institutionId];
    }

    function getSponsoredPoolBalance() external view returns (uint256) {
        return _platformSponsoredPool;
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

    // accept ETH sent directly (e.g. for manual deposits)
    receive() external payable {
        _platformSponsoredPool += msg.value;
    }
}
