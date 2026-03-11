#!/usr/bin/env bash
# compile.sh
# Compiles the Circom circuit to R1CS and WASM.
# Run this from packages/circuits/. Output goes to build/.
#
# We output r1cs, wasm, and sym. The wasm is what snarkjs uses at runtime
# to compute the witness from the input signals.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"

echo ">>> compiling credential.circom"
echo "    output dir: $BUILD_DIR"

mkdir -p "$BUILD_DIR"

circom "$CIRCUITS_DIR/credential.circom" \
    --r1cs \
    --wasm \
    --sym \
    --output "$BUILD_DIR" \
    -l "$CIRCUITS_DIR/node_modules"

echo ">>> done. files in $BUILD_DIR:"
ls -lh "$BUILD_DIR"
