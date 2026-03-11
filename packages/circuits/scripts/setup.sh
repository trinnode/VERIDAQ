#!/usr/bin/env bash
# setup.sh
# Runs the full Groth16 trusted setup for the credential circuit.
#
# What happens here, step by step:
#   1. Powers of Tau ceremony (phase 1 setup, circuit-independent)
#   2. Phase 2 setup (ties the proving key to this specific circuit)
#   3. Export the verification key to JSON
#   4. Export the Solidity verifier contract for on-chain proof checking
#
# For development: we generate a fresh powers of tau here.
# For production: replace the pot file with the Hermez ceremony file.
#   Download it from:
#   https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
#   and rename it to pot_final.ptau in the build directory.
#
# NOTE: ptau files are in .gitignore because they are large.
# The final zkey and verificationKey.json ARE committed because they are
# the outputs of the setup that every other module depends on.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"
CONTRACTS_SRC="$CIRCUITS_DIR/../../packages/contracts/src"

# snarkjs is a local dep so we always call it through node_modules
SNARKJS="node $CIRCUITS_DIR/node_modules/snarkjs/cli.js"

cd "$BUILD_DIR"

# compile first if the r1cs is not there yet
if [ ! -f "credential.r1cs" ]; then
    echo ">>> r1cs not found, running compile first"
    bash "$SCRIPT_DIR/compile.sh"
fi

# powers of tau exponent. 2^15 = 32768 constraints max.
# our circuit is around 660 constraints so this is plenty of headroom.
POT_EXPONENT=15

echo ">>> phase 1: powers of tau ceremony (exponent $POT_EXPONENT)"
echo "    (this takes a moment but only needs to run once)"

if [ ! -f "pot_final.ptau" ]; then
    $SNARKJS powersoftau new bn128 $POT_EXPONENT pot_0000.ptau -v
    $SNARKJS powersoftau contribute pot_0000.ptau pot_0001.ptau \
        --name="veridaq_dev_contribution" -v \
        -e="$(date +%s%N | sha256sum | head -c 64)"
    $SNARKJS powersoftau prepare phase2 pot_0001.ptau pot_final.ptau -v
    echo ">>> phase 1 done"
else
    echo ">>> pot_final.ptau already exists, skipping phase 1"
fi

echo ">>> phase 2: circuit-specific setup (Groth16)"

$SNARKJS groth16 setup credential.r1cs pot_final.ptau credential_0000.zkey

$SNARKJS zkey contribute credential_0000.zkey credential_final.zkey \
    --name="veridaq_dev_phase2" -v \
    -e="$(date +%s%N | sha256sum | head -c 64)"

echo ">>> verifying the final zkey against the r1cs and ptau"
$SNARKJS zkey verify credential.r1cs pot_final.ptau credential_final.zkey

echo ">>> exporting verification key"
$SNARKJS zkey export verificationkey credential_final.zkey verificationKey.json

echo ">>> generating Solidity verifier contract"
mkdir -p "$CONTRACTS_SRC"
$SNARKJS zkey export solidityverifier credential_final.zkey "$CONTRACTS_SRC/ZKVerifier.sol"

echo ">>> setup complete"
echo "    verificationKey.json is in $BUILD_DIR"
echo "    ZKVerifier.sol is in $CONTRACTS_SRC"
echo ""
echo "    Set these in your .env:"
echo "    CIRCUIT_WASM_PATH=$BUILD_DIR/credential_js/credential.wasm"
echo "    CIRCUIT_ZKEY_PATH=$BUILD_DIR/credential_final.zkey"
echo "    VERIFICATION_KEY_PATH=$BUILD_DIR/verificationKey.json"
