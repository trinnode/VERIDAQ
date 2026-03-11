// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/InstitutionRegistry.sol";

contract InstitutionRegistryTest is Test {

    InstitutionRegistry registry;

    address admin     = address(0xA11CE);
    address newAdmin  = address(0xB0B);
    address stranger  = address(0xDEAD);

    bytes32 constant INST_ID_A = keccak256("unilag");
    bytes32 constant INST_ID_B = keccak256("ui");

    // example 64-byte uncompressed public key (just filler for the tests)
    bytes constant PUB_KEY_A = hex"0000000000000000000000000000000000000000000000000000000000000001"
                                hex"0000000000000000000000000000000000000000000000000000000000000002";
    bytes constant PUB_KEY_B = hex"0000000000000000000000000000000000000000000000000000000000000003"
                                hex"0000000000000000000000000000000000000000000000000000000000000004";

    function setUp() public {
        registry = new InstitutionRegistry(admin);
    }

    // --- registerInstitution ---

    function test_register_institution_succeeds_as_admin() public {
        vm.prank(admin);
        // registerInstitution(id, name, adminWallet, publicKey) — 4 args
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);

        assertTrue(registry.isInstitutionActive(INST_ID_A));
        assertEq(registry.getAdminWallet(INST_ID_A), newAdmin);
    }

    function test_register_institution_reverts_for_stranger() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);
    }

    function test_register_institution_reverts_on_duplicate_id() public {
        vm.startPrank(admin);
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);
        vm.expectRevert("institution already registered");
        registry.registerInstitution(INST_ID_A, "UNILAG duplicate", newAdmin, PUB_KEY_A);
        vm.stopPrank();
    }

    // --- deactivateInstitution ---

    function test_deactivate_institution_succeeds_as_admin() public {
        vm.startPrank(admin);
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);
        registry.deactivateInstitution(INST_ID_A);
        vm.stopPrank();

        assertFalse(registry.isInstitutionActive(INST_ID_A));
    }

    function test_deactivate_institution_reverts_for_stranger() public {
        vm.prank(admin);
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);

        vm.prank(stranger);
        vm.expectRevert();
        registry.deactivateInstitution(INST_ID_A);
    }

    function test_deactivate_already_inactive_institution_reverts() public {
        vm.startPrank(admin);
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);
        registry.deactivateInstitution(INST_ID_A);
        vm.expectRevert("already inactive");
        registry.deactivateInstitution(INST_ID_A);
        vm.stopPrank();
    }

    // --- reactivateInstitution ---

    function test_reactivate_institution_succeeds() public {
        vm.startPrank(admin);
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);
        registry.deactivateInstitution(INST_ID_A);
        registry.reactivateInstitution(INST_ID_A);
        vm.stopPrank();

        assertTrue(registry.isInstitutionActive(INST_ID_A));
    }

    // --- getPublicKey ---

    function test_get_public_key_returns_registered_key() public {
        vm.prank(admin);
        registry.registerInstitution(INST_ID_A, "University of Lagos", newAdmin, PUB_KEY_A);

        bytes memory stored = registry.getPublicKey(INST_ID_A);
        assertEq(stored, PUB_KEY_A);
    }

    // --- rotateSigningKey ---

    function test_rotate_signing_key_succeeds_with_valid_signature() public {
        uint256 adminPk   = 0x1234;
        address adminAddr = vm.addr(adminPk);

        bytes32 INST_ID_C = keccak256("oau");
        vm.prank(admin);
        registry.registerInstitution(INST_ID_C, "Obafemi Awolowo University", adminAddr, PUB_KEY_A);

        // message hash matches what the contract expects: keccak256(institutionId, newPublicKey)
        bytes32 msgHash = keccak256(abi.encodePacked(INST_ID_C, PUB_KEY_B));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(adminPk, ethHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        // must call from the institution admin wallet
        vm.prank(adminAddr);
        registry.rotateSigningKey(INST_ID_C, PUB_KEY_B, sig);

        assertEq(registry.getPublicKey(INST_ID_C), PUB_KEY_B);
    }

    function test_rotate_signing_key_reverts_when_caller_is_not_admin_wallet() public {
        uint256 adminPk    = 0x1234;
        address adminAddr  = vm.addr(adminPk);
        bytes32 INST_ID_C  = keccak256("oau");

        vm.prank(admin);
        registry.registerInstitution(INST_ID_C, "OAU", adminAddr, PUB_KEY_A);

        // sign legitimately but call from the wrong address
        bytes32 msgHash = keccak256(abi.encodePacked(INST_ID_C, PUB_KEY_B));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(adminPk, ethHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.prank(stranger);
        vm.expectRevert("only the institution admin wallet can do this");
        registry.rotateSigningKey(INST_ID_C, PUB_KEY_B, sig);
    }

    // --- pause / unpause ---

    function test_pause_blocks_registration() public {
        vm.startPrank(admin);
        registry.pause();
        vm.expectRevert();
        registry.registerInstitution(INST_ID_B, "UI", newAdmin, PUB_KEY_B);
        vm.stopPrank();
    }

    function test_unpause_restores_registration() public {
        vm.startPrank(admin);
        registry.pause();
        registry.unpause();
        registry.registerInstitution(INST_ID_B, "UI", newAdmin, PUB_KEY_B);
        vm.stopPrank();
        assertTrue(registry.isInstitutionActive(INST_ID_B));
    }
}
