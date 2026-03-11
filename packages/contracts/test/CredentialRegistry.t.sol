// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/InstitutionRegistry.sol";
import "../src/CredentialRegistry.sol";

contract CredentialRegistryTest is Test {

    InstitutionRegistry instRegistry;
    CredentialRegistry  credRegistry;

    address admin    = address(0xA11CE);
    address stranger = address(0xDEAD);

    bytes32 constant INST_ID_A = keccak256("unilag");

    bytes constant PUB_KEY_A = hex"0000000000000000000000000000000000000000000000000000000000000001"
                                hex"0000000000000000000000000000000000000000000000000000000000000002";

    function setUp() public {
        instRegistry = new InstitutionRegistry(admin);
        credRegistry = new CredentialRegistry(admin, address(instRegistry));

        // register an active institution. admin wallet = admin so tests can call from admin
        vm.prank(admin);
        instRegistry.registerInstitution(INST_ID_A, "University of Lagos", admin, PUB_KEY_A);
    }

    // --- registerSingle ---

    function test_register_single_credential() public {
        bytes32 nullifier  = keccak256("student-001");
        bytes32 commitment = keccak256("commitment-001");

        vm.prank(admin);  // admin is the institution admin wallet
        credRegistry.registerSingle(INST_ID_A, commitment, nullifier, 2023, 1);

        assertTrue(credRegistry.credentialExists(nullifier));
        assertEq(credRegistry.getCommitment(nullifier), commitment);

        (bytes32 issuingId,,,,) = credRegistry.getCredential(nullifier);
        assertEq(issuingId, INST_ID_A);
    }

    function test_register_single_reverts_for_stranger() public {
        vm.prank(stranger);
        vm.expectRevert();
        credRegistry.registerSingle(INST_ID_A, keccak256("c"), keccak256("n"), 2023, 1);
    }

    function test_register_single_reverts_on_duplicate_nullifier() public {
        bytes32 nullifier  = keccak256("student-001");
        bytes32 commitment = keccak256("commitment-001");

        vm.startPrank(admin);
        credRegistry.registerSingle(INST_ID_A, commitment, nullifier, 2023, 1);
        vm.expectRevert("credential already registered");
        credRegistry.registerSingle(INST_ID_A, keccak256("different"), nullifier, 2023, 1);
        vm.stopPrank();
    }

    function test_register_single_reverts_for_inactive_institution() public {
        vm.prank(admin);
        instRegistry.deactivateInstitution(INST_ID_A);

        vm.prank(admin);
        vm.expectRevert("institution is not active");
        credRegistry.registerSingle(INST_ID_A, keccak256("c"), keccak256("n"), 2023, 1);
    }

    // --- registerBatch ---

    function test_register_batch_succeeds() public {
        bytes32[] memory nullifiers    = new bytes32[](3);
        bytes32[] memory commitments   = new bytes32[](3);
        uint16[]  memory gradYears     = new uint16[](3);
        uint8[]   memory degreeCodes   = new uint8[](3);
        for (uint256 i = 0; i < 3; i++) {
            nullifiers[i]  = keccak256(abi.encodePacked("n", i));
            commitments[i] = keccak256(abi.encodePacked("c", i));
            gradYears[i]   = uint16(2023);
            degreeCodes[i] = 1;
        }

        vm.prank(admin);
        credRegistry.registerBatch(INST_ID_A, commitments, nullifiers, gradYears, degreeCodes);

        for (uint256 i = 0; i < 3; i++) {
            assertTrue(credRegistry.credentialExists(nullifiers[i]));
        }
    }

    function test_register_batch_reverts_on_any_duplicate_nullifier() public {
        // register one credential first
        bytes32 dupeNullifier = keccak256("dupe");
        vm.prank(admin);
        credRegistry.registerSingle(INST_ID_A, keccak256("c-initial"), dupeNullifier, 2023, 1);

        bytes32[] memory nullifiers  = new bytes32[](3);
        bytes32[] memory commitments = new bytes32[](3);
        uint16[]  memory gradYears   = new uint16[](3);
        uint8[]   memory degreeCodes = new uint8[](3);
        nullifiers[0]  = keccak256("fresh-1");
        nullifiers[1]  = dupeNullifier;  // <- the duplicate
        nullifiers[2]  = keccak256("fresh-2");
        for (uint256 i = 0; i < 3; i++) {
            commitments[i] = keccak256(abi.encodePacked("c", i));
            gradYears[i]   = 2023;
            degreeCodes[i] = 1;
        }

        // the whole batch must revert — nothing goes through
        vm.prank(admin);
        vm.expectRevert("duplicate nullifier in batch");
        credRegistry.registerBatch(INST_ID_A, commitments, nullifiers, gradYears, degreeCodes);

        // fresh nullifiers must not have been registered
        assertFalse(credRegistry.credentialExists(nullifiers[0]));
        assertFalse(credRegistry.credentialExists(nullifiers[2]));
    }

    function test_register_batch_reverts_on_array_length_mismatch() public {
        bytes32[] memory nullifiers  = new bytes32[](2);
        bytes32[] memory commitments = new bytes32[](3);
        uint16[]  memory gradYears   = new uint16[](2);
        uint8[]   memory degreeCodes = new uint8[](2);

        vm.prank(admin);
        vm.expectRevert("array lengths do not match");
        credRegistry.registerBatch(INST_ID_A, commitments, nullifiers, gradYears, degreeCodes);
    }

    function test_register_batch_reverts_on_empty_input() public {
        bytes32[] memory empty  = new bytes32[](0);
        uint16[]  memory emptyY = new uint16[](0);
        uint8[]   memory emptyD = new uint8[](0);
        vm.prank(admin);
        vm.expectRevert("batch cannot be empty");
        credRegistry.registerBatch(INST_ID_A, empty, empty, emptyY, emptyD);
    }

    // --- getCredential / credentialExists ---

    function test_get_credential_returns_issuing_institution() public {
        bytes32 nullifier = keccak256("student-xyz");
        vm.prank(admin);
        credRegistry.registerSingle(INST_ID_A, keccak256("c-xyz"), nullifier, 2023, 1);

        (bytes32 issuingId,,,,) = credRegistry.getCredential(nullifier);
        assertEq(issuingId, INST_ID_A);
    }

    function test_credential_exists_returns_false_for_unknown_nullifier() public {
        assertFalse(credRegistry.credentialExists(keccak256("unknown")));
    }
}
