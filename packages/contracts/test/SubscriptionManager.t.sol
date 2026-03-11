// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/SubscriptionManager.sol";

contract SubscriptionManagerTest is Test {

    SubscriptionManager subManager;

    address admin   = address(0xA11CE);
    address bundler = address(0xBEEF);
    address employer = address(0xEEEE);
    address stranger = address(0xDEAD);

    bytes32 constant INST_ID_A = keccak256("unilag");

    function setUp() public {
        subManager = new SubscriptionManager(admin);

        // grant bundler its role — use startPrank so the prank stays active
        // through the BUNDLER_ROLE() staticcall AND the grantRole call
        vm.startPrank(admin);
        subManager.grantRole(subManager.BUNDLER_ROLE(), bundler);
        vm.stopPrank();
    }

    // --- setInstitutionTier ---

    function test_set_institution_tier_free() public {
        vm.prank(admin);
        subManager.setInstitutionTier(INST_ID_A, 0);  // 0 = FREE

        assertEq(subManager.getInstitutionTier(INST_ID_A), 0);
    }

    function test_set_institution_tier_paid() public {
        vm.prank(admin);
        subManager.setInstitutionTier(INST_ID_A, 1);  // 1 = PAID

        assertEq(subManager.getInstitutionTier(INST_ID_A), 1);
    }

    function test_set_institution_tier_reverts_for_stranger() public {
        vm.prank(stranger);
        vm.expectRevert();
        subManager.setInstitutionTier(INST_ID_A, 0);
    }

    function test_set_institution_tier_reverts_for_unknown_tier_value() public {
        vm.prank(admin);
        vm.expectRevert("unknown institution tier");
        subManager.setInstitutionTier(INST_ID_A, 99);
    }

    // default tier for unregistered institution is FREE (0)
    function test_get_institution_tier_defaults_to_free() public {
        assertEq(subManager.getInstitutionTier(keccak256("unregistered")), 0);
    }

    // --- incrementVerificationCount ---

    function test_increment_allows_first_three_verifications() public {
        assertEq(subManager.getRemainingFreeVerifications(employer), 3);

        vm.startPrank(bundler);
        subManager.incrementVerificationCount(employer);
        subManager.incrementVerificationCount(employer);
        subManager.incrementVerificationCount(employer);
        vm.stopPrank();

        assertEq(subManager.getVerificationCount(employer), 3);
        assertEq(subManager.getRemainingFreeVerifications(employer), 0);
    }

    function test_increment_reverts_on_fourth_verification_for_free_tier() public {
        vm.startPrank(bundler);
        subManager.incrementVerificationCount(employer);
        subManager.incrementVerificationCount(employer);
        subManager.incrementVerificationCount(employer);

        // the 4th call must revert
        vm.expectRevert("employer has used all free verifications");
        subManager.incrementVerificationCount(employer);
        vm.stopPrank();
    }

    function test_increment_reverts_for_caller_without_bundler_role() public {
        vm.prank(stranger);
        vm.expectRevert();
        subManager.incrementVerificationCount(employer);
    }

    // --- upgradeEmployerToPaid ---

    function test_upgrade_employer_to_paid_removes_limit() public {
        // exhaust free tier
        vm.startPrank(bundler);
        subManager.incrementVerificationCount(employer);
        subManager.incrementVerificationCount(employer);
        subManager.incrementVerificationCount(employer);
        vm.stopPrank();

        // upgrade to paid
        vm.prank(admin);
        subManager.upgradeEmployerToPaid(employer);

        // can now call increment indefinitely
        vm.startPrank(bundler);
        subManager.incrementVerificationCount(employer);
        subManager.incrementVerificationCount(employer);
        vm.stopPrank();

        assertEq(subManager.getVerificationCount(employer), 5);
    }

    function test_upgrade_employer_reverts_for_stranger() public {
        vm.prank(stranger);
        vm.expectRevert();
        subManager.upgradeEmployerToPaid(employer);
    }

    // --- getRemainingFreeVerifications ---

    function test_remaining_returns_max_uint_for_paid_employer() public {
        vm.prank(admin);
        subManager.upgradeEmployerToPaid(employer);

        assertEq(subManager.getRemainingFreeVerifications(employer), type(uint256).max);
    }

    // --- isEmployerPaidTier ---

    function test_is_employer_paid_tier_starts_false() public {
        assertFalse(subManager.isEmployerPaidTier(employer));
    }

    function test_is_employer_paid_tier_true_after_upgrade() public {
        vm.prank(admin);
        subManager.upgradeEmployerToPaid(employer);
        assertTrue(subManager.isEmployerPaidTier(employer));
    }

    // --- pause ---

    function test_pause_blocks_increment() public {
        vm.prank(admin);
        subManager.pause();

        vm.prank(bundler);
        vm.expectRevert();
        subManager.incrementVerificationCount(employer);
    }

    function test_unpause_restores_increment() public {
        vm.startPrank(admin);
        subManager.pause();
        subManager.unpause();
        vm.stopPrank();

        vm.prank(bundler);
        subManager.incrementVerificationCount(employer);
        assertEq(subManager.getVerificationCount(employer), 1);
    }
}
