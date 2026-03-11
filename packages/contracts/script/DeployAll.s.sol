// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/InstitutionRegistry.sol";
import "../src/CredentialRegistry.sol";
import "../src/RevocationRegistry.sol";
import "../src/PaymasterVault.sol";
import "../src/SubscriptionManager.sol";
import "../src/ZKVerifier.sol";

contract DeployAllScript is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address platformAdmin = vm.envOr("PLATFORM_ADMIN_ADDRESS", vm.addr(deployerPk));
        address entryPoint = vm.envAddress("ENTRYPOINT_ADDRESS");

        vm.startBroadcast(deployerPk);

        InstitutionRegistry institutionRegistry = new InstitutionRegistry(platformAdmin);
        CredentialRegistry credentialRegistry = new CredentialRegistry(
            platformAdmin,
            address(institutionRegistry)
        );
        RevocationRegistry revocationRegistry = new RevocationRegistry(
            platformAdmin,
            address(institutionRegistry),
            address(credentialRegistry)
        );
        PaymasterVault paymasterVault = new PaymasterVault(
            platformAdmin,
            entryPoint,
            address(institutionRegistry)
        );
        SubscriptionManager subscriptionManager = new SubscriptionManager(platformAdmin);
        Groth16Verifier zkVerifier = new Groth16Verifier();

        vm.stopBroadcast();

        console2.log("INSTITUTION_REGISTRY_ADDRESS", address(institutionRegistry));
        console2.log("CREDENTIAL_REGISTRY_ADDRESS", address(credentialRegistry));
        console2.log("REVOCATION_REGISTRY_ADDRESS", address(revocationRegistry));
        console2.log("PAYMASTER_VAULT_ADDRESS", address(paymasterVault));
        console2.log("SUBSCRIPTION_MANAGER_ADDRESS", address(subscriptionManager));
        console2.log("ZK_VERIFIER_ADDRESS", address(zkVerifier));
    }
}
