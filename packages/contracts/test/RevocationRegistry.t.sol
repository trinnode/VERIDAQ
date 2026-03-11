// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/InstitutionRegistry.sol";
import "../src/CredentialRegistry.sol";
import "../src/RevocationRegistry.sol";

contract RevocationRegistryTest is Test {

    InstitutionRegistry instRegistry;
    CredentialRegistry  credRegistry;
    RevocationRegistry  revokeRegistry;

    address admin      = address(0xA11CE);
    address adminOther = address(0xB0B);
    address stranger   = address(0xDEAD);

    bytes32 constant INST_ID_A = keccak256("unilag");
    bytes32 constant INST_ID_B = keccak256("ui");

    bytes constant PUB_KEY = hex"0000000000000000000000000000000000000000000000000000000000000001"
                              hex"0000000000000000000000000000000000000000000000000000000000000002";

    bytes32 nullifierA;
    bytes32 commitmentA;

    function setUp() public {
        instRegistry   = new InstitutionRegistry(admin);
        credRegistry   = new CredentialRegistry(admin, address(instRegistry));
        revokeRegistry = new RevocationRegistry(admin, address(instRegistry), address(credRegistry));

        // register institution A with admin as the admin wallet
        vm.prank(admin);
        instRegistry.registerInstitution(INST_ID_A, "University of Lagos", admin, PUB_KEY);

        // register institution B with adminOther as its admin wallet
        vm.prank(admin);
        instRegistry.registerInstitution(INST_ID_B, "University of Ibadan", adminOther, PUB_KEY);

        // register a credential for institution A
        // must call as the institution's admin wallet (admin)
        nullifierA  = keccak256("student-from-unilag");
        commitmentA = keccak256("commitment-a");
        vm.prank(admin);
        credRegistry.registerSingle(INST_ID_A, commitmentA, nullifierA, 2023, 1);
    }

    // --- revoke ---

    // revokeCredential(nullifier, reasonCode) — takes a uint8 reason code, not a string

    function test_revoke_succeeds_from_issuing_institution_admin() public {
        vm.prank(admin);  // admin is the admin wallet for INST_ID_A
        revokeRegistry.revokeCredential(nullifierA, 1);

        assertTrue(revokeRegistry.isRevoked(nullifierA));
    }

    function test_revoke_reverts_when_called_by_wrong_institution_admin() public {
        // adminOther is the admin wallet for INST_ID_B, not INST_ID_A
        vm.prank(adminOther);
        vm.expectRevert("only the issuing institution admin wallet can revoke");
        revokeRegistry.revokeCredential(nullifierA, 1);
    }

    function test_revoke_reverts_when_called_by_stranger() public {
        vm.prank(stranger);
        vm.expectRevert("only the issuing institution admin wallet can revoke");
        revokeRegistry.revokeCredential(nullifierA, 1);
    }

    function test_revoke_reverts_for_unregistered_nullifier() public {
        vm.prank(admin);
        vm.expectRevert("credential not found");
        revokeRegistry.revokeCredential(keccak256("nonexistent"), 1);
    }

    function test_revoke_already_revoked_credential_reverts() public {
        vm.startPrank(admin);
        revokeRegistry.revokeCredential(nullifierA, 1);
        vm.expectRevert("credential already revoked");
        revokeRegistry.revokeCredential(nullifierA, 1);
        vm.stopPrank();
    }

    // --- isRevoked ---

    function test_is_revoked_returns_false_for_active_credential() public {
        assertFalse(revokeRegistry.isRevoked(nullifierA));
    }

    function test_is_revoked_returns_true_after_revocation() public {
        vm.prank(admin);
        revokeRegistry.revokeCredential(nullifierA, 1);
        assertTrue(revokeRegistry.isRevoked(nullifierA));
    }

    // --- getRevocationRecord ---

    function test_revocation_record_stores_reason_code() public {
        vm.prank(admin);
        revokeRegistry.revokeCredential(nullifierA, 3);

        (, , uint8 code) = revokeRegistry.getRevocation(nullifierA);
        assertEq(code, 3);
    }

    // --- pause ---

    function test_pause_blocks_revoke() public {
        vm.startPrank(admin);
        revokeRegistry.pause();
        vm.expectRevert();
        revokeRegistry.revokeCredential(nullifierA, 1);
        vm.stopPrank();
    }
}
