#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/packages/contracts"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

MISSING=()
[[ -z "${BASESCAN_API_KEY:-}" ]] && MISSING+=("BASESCAN_API_KEY")
[[ -z "${INSTITUTION_REGISTRY_ADDRESS:-}" ]] && MISSING+=("INSTITUTION_REGISTRY_ADDRESS")
[[ -z "${CREDENTIAL_REGISTRY_ADDRESS:-}" ]] && MISSING+=("CREDENTIAL_REGISTRY_ADDRESS")
[[ -z "${REVOCATION_REGISTRY_ADDRESS:-}" ]] && MISSING+=("REVOCATION_REGISTRY_ADDRESS")
[[ -z "${PAYMASTER_VAULT_ADDRESS:-}" ]] && MISSING+=("PAYMASTER_VAULT_ADDRESS")
[[ -z "${SUBSCRIPTION_MANAGER_ADDRESS:-}" ]] && MISSING+=("SUBSCRIPTION_MANAGER_ADDRESS")
[[ -z "${ZK_VERIFIER_ADDRESS:-}" ]] && MISSING+=("ZK_VERIFIER_ADDRESS")

if (( ${#MISSING[@]} > 0 )); then
  echo "Missing required values in .env:"
  for key in "${MISSING[@]}"; do
    echo "  - $key"
  done
  exit 1
fi

cd "$CONTRACTS_DIR"

verify() {
  local address="$1"
  local contract="$2"
  shift 2

  echo "Verifying $contract at $address"
  forge verify-contract \
    --chain-id 84532 \
    --etherscan-api-key "$BASESCAN_API_KEY" \
    "$address" \
    "$contract" \
    "$@"
}

verify "$INSTITUTION_REGISTRY_ADDRESS" "src/InstitutionRegistry.sol:InstitutionRegistry" \
  --constructor-args "$(cast abi-encode 'constructor(address)' "$PLATFORM_ADMIN_ADDRESS" | sed 's/^0x//')"

verify "$CREDENTIAL_REGISTRY_ADDRESS" "src/CredentialRegistry.sol:CredentialRegistry" \
  --constructor-args "$(cast abi-encode 'constructor(address,address)' "$PLATFORM_ADMIN_ADDRESS" "$INSTITUTION_REGISTRY_ADDRESS" | sed 's/^0x//')"

verify "$REVOCATION_REGISTRY_ADDRESS" "src/RevocationRegistry.sol:RevocationRegistry" \
  --constructor-args "$(cast abi-encode 'constructor(address,address,address)' "$PLATFORM_ADMIN_ADDRESS" "$INSTITUTION_REGISTRY_ADDRESS" "$CREDENTIAL_REGISTRY_ADDRESS" | sed 's/^0x//')"

verify "$PAYMASTER_VAULT_ADDRESS" "src/PaymasterVault.sol:PaymasterVault" \
  --constructor-args "$(cast abi-encode 'constructor(address,address,address)' "$PLATFORM_ADMIN_ADDRESS" "$ENTRYPOINT_ADDRESS" "$INSTITUTION_REGISTRY_ADDRESS" | sed 's/^0x//')"

verify "$SUBSCRIPTION_MANAGER_ADDRESS" "src/SubscriptionManager.sol:SubscriptionManager" \
  --constructor-args "$(cast abi-encode 'constructor(address)' "$PLATFORM_ADMIN_ADDRESS" | sed 's/^0x//')"

verify "$ZK_VERIFIER_ADDRESS" "src/ZKVerifier.sol:Groth16Verifier"

echo "Submitted all verification requests."
