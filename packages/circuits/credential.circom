pragma circom 2.2.3;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
    CredentialVerifier proves two things at once:
    1. The prover knows private credential data that hashes to a specific commitment stored on chain.
    2. The specific academic claim requested by the employer is satisfied by that private data.

    We never reveal the student's name, matric number, CGPA, or any other field.
    The verifier only learns: "yes, this claim is true" or "the proof is invalid".

    claimType codes (must match the backend constants):
        1  -> Graduated (commitment existence is sufficient proof)
        2  -> Minimum Upper Second  (classification >= 3)
        3  -> Minimum Lower Second  (classification >= 2)
        4  -> First Class           (classification == 4)
        5  -> CGPA above threshold  (cgpa > claimThreshold)
        99 -> Custom (handled off-circuit by institution review, never reaches this circuit)

    classification codes:
        1 -> Third Class
        2 -> Lower Second
        3 -> Upper Second
        4 -> First Class

    cgpa is stored as an integer scaled by 100, so 3.50 -> 350.
*/
template CredentialVerifier() {

    // ----------------------------------------------------------------
    // Private inputs, known only to the backend proof service
    // ----------------------------------------------------------------
    signal input studentName;      // Poseidon hash of the raw name string, kept as a field element
    signal input matricNumber;     // field element encoding of the matric number string
    signal input cgpa;             // integer, e.g. 350 means 3.50
    signal input classification;   // 1, 2, 3, or 4
    signal input courseOfStudy;    // Poseidon hash of the course title string
    signal input graduationYear;   // four digit year, e.g. 2024
    signal input blindingFactor;   // random 128-bit value added at issuance so the commitment is not brute-forceable

    // ----------------------------------------------------------------
    // Public inputs, visible to any verifier checking the proof
    // ----------------------------------------------------------------
    signal input commitment;       // Poseidon(all 7 private inputs), stored on chain in CredentialRegistry
    signal input nullifier;        // Poseidon(matricNumber, institutionId), stored on chain as the revocation handle
    signal input institutionId;    // the bytes32 slug of the issuing institution cast to a field element
    signal input claimType;        // which claim the employer is checking (see codes above)
    signal input claimThreshold;   // only meaningful for claimType 5, the CGPA floor the employer wants to test

    // ================================================================
    // Step 1: verify the commitment
    // Poseidon(studentName, matricNumber, cgpa, classification,
    //          courseOfStudy, graduationYear, blindingFactor)
    // must equal the commitment the employer looked up on chain.
    // If these don't match, the proof cannot be built.
    // ================================================================
    component commitHasher = Poseidon(7);
    commitHasher.inputs[0] <== studentName;
    commitHasher.inputs[1] <== matricNumber;
    commitHasher.inputs[2] <== cgpa;
    commitHasher.inputs[3] <== classification;
    commitHasher.inputs[4] <== courseOfStudy;
    commitHasher.inputs[5] <== graduationYear;
    commitHasher.inputs[6] <== blindingFactor;

    // hard constraint: the hash must match
    commitment === commitHasher.out;

    // ================================================================
    // Step 2: verify the nullifier
    // Poseidon(matricNumber, institutionId) must match the nullifier
    // that the backend looked up in CredentialRegistry.
    // This ties the proof to the specific institution so the nullifier
    // can be used for revocation checks across every institution independently.
    // ================================================================
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== matricNumber;
    nullifierHasher.inputs[1] <== institutionId;

    nullifier === nullifierHasher.out;

    // ================================================================
    // Step 3: evaluate the claim
    //
    // We compute a result for every possible claimType and then pick
    // the right one using IsEqual selectors. This is how you do
    // conditional logic in R1CS circuits.
    // ================================================================

    // -- classification checks --

    // classification >= 3 means Upper Second or First Class
    // classification fits in 3 bits (range 0-7), that is enough
    component isMinUpperSecond = GreaterEqThan(3);
    isMinUpperSecond.in[0] <== classification;
    isMinUpperSecond.in[1] <== 3;

    // classification >= 2 means Lower Second or better
    component isMinLowerSecond = GreaterEqThan(3);
    isMinLowerSecond.in[0] <== classification;
    isMinLowerSecond.in[1] <== 2;

    // classification == 4 exactly means First Class
    component isFirstClass = IsEqual();
    isFirstClass.in[0] <== classification;
    isFirstClass.in[1] <== 4;

    // -- CGPA check --
    // cgpa is 0-500, claimThreshold is also 0-500, 10 bits covers range 0-1023
    component isAboveThreshold = GreaterThan(10);
    isAboveThreshold.in[0] <== cgpa;
    isAboveThreshold.in[1] <== claimThreshold;

    // -- claimType selectors --
    // each one is 1 if claimType equals that code, 0 otherwise

    component isType1 = IsEqual();
    isType1.in[0] <== claimType;
    isType1.in[1] <== 1;

    component isType2 = IsEqual();
    isType2.in[0] <== claimType;
    isType2.in[1] <== 2;

    component isType3 = IsEqual();
    isType3.in[0] <== claimType;
    isType3.in[1] <== 3;

    component isType4 = IsEqual();
    isType4.in[0] <== claimType;
    isType4.in[1] <== 4;

    component isType5 = IsEqual();
    isType5.in[0] <== claimType;
    isType5.in[1] <== 5;

    // -- per-type satisfaction signals --
    // Each one is 1 only when both: (a) this is the active claimType
    //                               (b) the matching condition holds.
    // The multiplication is a valid R1CS quadratic constraint.

    signal type1Satisfied <== isType1.out * 1;           // Graduated: always true once commitment matches
    signal type2Satisfied <== isType2.out * isMinUpperSecond.out;
    signal type3Satisfied <== isType3.out * isMinLowerSecond.out;
    signal type4Satisfied <== isType4.out * isFirstClass.out;
    signal type5Satisfied <== isType5.out * isAboveThreshold.out;

    // sum them up. All but one term will be 0.
    // if the active claim is satisfied, the sum is 1.
    // if the active claim is NOT satisfied, the sum is 0 and the proof fails.
    // if claimType is 99 (custom) or any unlisted code, all terms are 0 and the proof fails.
    signal claimSatisfied <== type1Satisfied + type2Satisfied + type3Satisfied + type4Satisfied + type5Satisfied;

    claimSatisfied === 1;
}

component main {public [commitment, nullifier, institutionId, claimType, claimThreshold]} = CredentialVerifier();
