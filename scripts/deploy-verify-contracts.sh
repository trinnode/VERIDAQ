#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/packages/contracts"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Create it first: cp .env.example .env"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" && -n "${BUNDLER_PRIVATE_KEY:-}" ]]; then
  DEPLOYER_PRIVATE_KEY="$BUNDLER_PRIVATE_KEY"
fi

MISSING=()
[[ -z "${RPC_URL:-}" ]] && MISSING+=("RPC_URL")
[[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]] && MISSING+=("DEPLOYER_PRIVATE_KEY (or BUNDLER_PRIVATE_KEY)")
[[ -z "${ENTRYPOINT_ADDRESS:-}" ]] && MISSING+=("ENTRYPOINT_ADDRESS")
[[ -z "${BASESCAN_API_KEY:-}" ]] && MISSING+=("BASESCAN_API_KEY")

if (( ${#MISSING[@]} > 0 )); then
  echo "Missing required values in .env:"
  for key in "${MISSING[@]}"; do
    echo "  - $key"
  done
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "forge is not installed. Install Foundry first: https://book.getfoundry.sh/getting-started/installation"
  exit 1
fi

if [[ -z "${PLATFORM_ADMIN_ADDRESS:-}" ]]; then
  PLATFORM_ADMIN_ADDRESS="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
  echo "PLATFORM_ADMIN_ADDRESS not set. Using deployer address: $PLATFORM_ADMIN_ADDRESS"
fi

cd "$CONTRACTS_DIR"

echo "Building contracts..."
forge build

echo "Deploying + verifying on Base Sepolia..."
DEPLOYER_PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY" \
PLATFORM_ADMIN_ADDRESS="$PLATFORM_ADMIN_ADDRESS" \
ENTRYPOINT_ADDRESS="$ENTRYPOINT_ADDRESS" \
forge script script/DeployAll.s.sol:DeployAllScript \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --verify \
  --etherscan-api-key "$BASESCAN_API_KEY" \
  --chain base-sepolia \
  -vvvv

RUN_JSON="$CONTRACTS_DIR/broadcast/DeployAll.s.sol/84532/run-latest.json"
if [[ ! -f "$RUN_JSON" ]]; then
  echo "Could not find broadcast output at $RUN_JSON"
  exit 1
fi

ADDRESSES_JSON="$(node -e '
const fs = require("fs");
const p = process.argv[1];
const run = JSON.parse(fs.readFileSync(p, "utf8"));
const map = {};
for (const tx of run.transactions || []) {
  if (!tx.contractName || !tx.contractAddress) continue;
  map[tx.contractName] = tx.contractAddress;
}
const out = {
  INSTITUTION_REGISTRY_ADDRESS: map.InstitutionRegistry || "",
  CREDENTIAL_REGISTRY_ADDRESS: map.CredentialRegistry || "",
  REVOCATION_REGISTRY_ADDRESS: map.RevocationRegistry || "",
  PAYMASTER_VAULT_ADDRESS: map.PaymasterVault || "",
  SUBSCRIPTION_MANAGER_ADDRESS: map.SubscriptionManager || "",
  ZK_VERIFIER_ADDRESS: map.Groth16Verifier || ""
};
process.stdout.write(JSON.stringify(out));
' "$RUN_JSON")"

set_env() {
  local key="$1"
  local value="$2"

  if [[ -z "$value" ]]; then
    return
  fi

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf "\n%s=%s\n" "$key" "$value" >> "$ENV_FILE"
  fi
}

INSTITUTION_REGISTRY_ADDRESS="$(node -e "const d = JSON.parse(process.argv[1]); process.stdout.write(d.INSTITUTION_REGISTRY_ADDRESS || '')" "$ADDRESSES_JSON")"
CREDENTIAL_REGISTRY_ADDRESS="$(node -e "const d = JSON.parse(process.argv[1]); process.stdout.write(d.CREDENTIAL_REGISTRY_ADDRESS || '')" "$ADDRESSES_JSON")"
REVOCATION_REGISTRY_ADDRESS="$(node -e "const d = JSON.parse(process.argv[1]); process.stdout.write(d.REVOCATION_REGISTRY_ADDRESS || '')" "$ADDRESSES_JSON")"
PAYMASTER_VAULT_ADDRESS="$(node -e "const d = JSON.parse(process.argv[1]); process.stdout.write(d.PAYMASTER_VAULT_ADDRESS || '')" "$ADDRESSES_JSON")"
SUBSCRIPTION_MANAGER_ADDRESS="$(node -e "const d = JSON.parse(process.argv[1]); process.stdout.write(d.SUBSCRIPTION_MANAGER_ADDRESS || '')" "$ADDRESSES_JSON")"
ZK_VERIFIER_ADDRESS="$(node -e "const d = JSON.parse(process.argv[1]); process.stdout.write(d.ZK_VERIFIER_ADDRESS || '')" "$ADDRESSES_JSON")"

set_env "INSTITUTION_REGISTRY_ADDRESS" "$INSTITUTION_REGISTRY_ADDRESS"
set_env "CREDENTIAL_REGISTRY_ADDRESS" "$CREDENTIAL_REGISTRY_ADDRESS"
set_env "REVOCATION_REGISTRY_ADDRESS" "$REVOCATION_REGISTRY_ADDRESS"
set_env "PAYMASTER_VAULT_ADDRESS" "$PAYMASTER_VAULT_ADDRESS"
set_env "SUBSCRIPTION_MANAGER_ADDRESS" "$SUBSCRIPTION_MANAGER_ADDRESS"
set_env "ZK_VERIFIER_ADDRESS" "$ZK_VERIFIER_ADDRESS"

echo "Deployment and verification complete. Updated $ENV_FILE with deployed addresses."
printf "\nResolved addresses:\n"
printf "INSTITUTION_REGISTRY_ADDRESS=%s\n" "$INSTITUTION_REGISTRY_ADDRESS"
printf "CREDENTIAL_REGISTRY_ADDRESS=%s\n" "$CREDENTIAL_REGISTRY_ADDRESS"
printf "REVOCATION_REGISTRY_ADDRESS=%s\n" "$REVOCATION_REGISTRY_ADDRESS"
printf "PAYMASTER_VAULT_ADDRESS=%s\n" "$PAYMASTER_VAULT_ADDRESS"
printf "SUBSCRIPTION_MANAGER_ADDRESS=%s\n" "$SUBSCRIPTION_MANAGER_ADDRESS"
printf "ZK_VERIFIER_ADDRESS=%s\n" "$ZK_VERIFIER_ADDRESS"
