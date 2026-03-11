/**
 * credential.test.js
 *
 * Tests for the CredentialVerifier circuit.
 * Run setup.sh first so the wasm and zkey files exist in build/.
 * If they are not there, all tests skip gracefully with a message.
 */

const path = require("path");
const fs = require("fs");
const snarkjs = require("snarkjs");

const BUILD_DIR = path.join(__dirname, "../build");
const WASM_PATH = path.join(BUILD_DIR, "credential_js/credential.wasm");
const ZKEY_PATH = path.join(BUILD_DIR, "credential_final.zkey");
const VKEY_PATH = path.join(BUILD_DIR, "verificationKey.json");

function artifactsReady() {
  return (
    fs.existsSync(WASM_PATH) &&
    fs.existsSync(ZKEY_PATH) &&
    fs.existsSync(VKEY_PATH)
  );
}

// all values that depend on Poseidon hashes are filled in beforeAll
let poseidon;
let COMMITMENT_FIRST;
let COMMITMENT_LOWER;
let COMMIT_UPPER;
let COMMIT_LOW;
let NULLIFIER;

// raw credential field values
const STUDENT_NAME      = BigInt("12345678901234567890");
const MATRIC_NUMBER     = BigInt("98765432101234567890");
const CGPA              = BigInt(450);    // represents 4.50
const CLASSIFICATION_FIRST = BigInt(4);  // First Class
const CLASSIFICATION_UPPER = BigInt(3);  // Upper Second
const CLASSIFICATION_LOWER = BigInt(2);  // Lower Second
const COURSE_OF_STUDY   = BigInt("11111222223333344444");
const GRADUATION_YEAR   = BigInt(2025);
const BLINDING_FACTOR   = BigInt("999888777666555444333222111000");
const INSTITUTION_ID    = BigInt("777000111222333444555666777888");
const LOW_CGPA          = BigInt(250);   // represents 2.50

function hash(poseidonFn, inputs) {
  const result = poseidonFn(inputs.map((x) => BigInt(x)));
  return poseidonFn.F.toString(result);
}

beforeAll(async () => {
  const { buildPoseidon } = require("circomlibjs");
  poseidon = await buildPoseidon();

  COMMITMENT_FIRST = hash(poseidon, [
    STUDENT_NAME, MATRIC_NUMBER, CGPA, CLASSIFICATION_FIRST,
    COURSE_OF_STUDY, GRADUATION_YEAR, BLINDING_FACTOR,
  ]);

  COMMITMENT_LOWER = hash(poseidon, [
    STUDENT_NAME, MATRIC_NUMBER, CGPA, CLASSIFICATION_LOWER,
    COURSE_OF_STUDY, GRADUATION_YEAR, BLINDING_FACTOR,
  ]);

  COMMIT_UPPER = hash(poseidon, [
    STUDENT_NAME, MATRIC_NUMBER, CGPA, CLASSIFICATION_UPPER,
    COURSE_OF_STUDY, GRADUATION_YEAR, BLINDING_FACTOR,
  ]);

  COMMIT_LOW = hash(poseidon, [
    STUDENT_NAME, MATRIC_NUMBER, LOW_CGPA, CLASSIFICATION_LOWER,
    COURSE_OF_STUDY, GRADUATION_YEAR, BLINDING_FACTOR,
  ]);

  NULLIFIER = hash(poseidon, [MATRIC_NUMBER, INSTITUTION_ID]);
});

describe("CredentialVerifier circuit", () => {
  test("skip notice: run setup.sh if artifacts are missing", () => {
    if (!artifactsReady()) {
      console.log(
        "\n  Circuit artifacts not found. Run:\n" +
          "     cd packages/circuits && bash scripts/compile.sh && bash scripts/setup.sh\n" +
          "  then re-run the tests.\n"
      );
    }
    // not a hard failure — individual tests below guard themselves
  });

  describe("valid proofs", () => {
    test("proves Graduated claim (claimType 1)", async () => {
      if (!artifactsReady()) return;

      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           CGPA.toString(),
        classification: CLASSIFICATION_FIRST.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMITMENT_FIRST,
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "1",
        claimThreshold: "0",
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);
      const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
      const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

      expect(isValid).toBe(true);
    });

    test("proves First Class claim for a First Class student (claimType 4)", async () => {
      if (!artifactsReady()) return;

      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           CGPA.toString(),
        classification: CLASSIFICATION_FIRST.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMITMENT_FIRST,
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "4",
        claimThreshold: "0",
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);
      const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
      const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

      expect(isValid).toBe(true);
    });

    test("proves Minimum Upper Second claim for an Upper Second student (claimType 2)", async () => {
      if (!artifactsReady()) return;

      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           CGPA.toString(),
        classification: CLASSIFICATION_UPPER.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMIT_UPPER,
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "2",
        claimThreshold: "0",
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);
      const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
      const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

      expect(isValid).toBe(true);
    });

    test("proves CGPA above threshold claim (claimType 5)", async () => {
      if (!artifactsReady()) return;

      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           CGPA.toString(),          // 4.50
        classification: CLASSIFICATION_FIRST.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMITMENT_FIRST,
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "5",
        claimThreshold: "400",   // employer wants > 4.00, student has 4.50
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);
      const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
      const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

      expect(isValid).toBe(true);
    });
  });

  describe("invalid proofs are rejected by the circuit", () => {
    test("cannot prove First Class for a Lower Second student", async () => {
      if (!artifactsReady()) return;

      // classification 2 (Lower Second) but we try to prove claimType 4 (First Class)
      // the circuit constraint claimSatisfied === 1 will fail so fullProve throws
      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           CGPA.toString(),
        classification: CLASSIFICATION_LOWER.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMITMENT_LOWER,
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "4",
        claimThreshold: "0",
      };

      await expect(
        snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH)
      ).rejects.toThrow();
    });

    test("cannot prove CGPA above threshold when CGPA is too low", async () => {
      if (!artifactsReady()) return;

      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           LOW_CGPA.toString(),       // 2.50
        classification: CLASSIFICATION_LOWER.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMIT_LOW,
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "5",
        claimThreshold: "350",   // employer wants > 3.50, student only has 2.50
      };

      await expect(
        snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH)
      ).rejects.toThrow();
    });

    test("a valid proof fails verification when public signals are tampered", async () => {
      if (!artifactsReady()) return;

      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           CGPA.toString(),
        classification: CLASSIFICATION_FIRST.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMITMENT_FIRST,
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "1",
        claimThreshold: "0",
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);

      // signal order: commitment(0) nullifier(1) institutionId(2) claimType(3) claimThreshold(4)
      const tamperedSignals = [...publicSignals];
      tamperedSignals[3] = "4";

      const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
      const isValid = await snarkjs.groth16.verify(vKey, tamperedSignals, proof);

      expect(isValid).toBe(false);
    });

    test("a proof with wrong commitment is rejected by the circuit", async () => {
      if (!artifactsReady()) return;

      // private inputs say First Class but commitment was computed with Lower Second data
      const inputs = {
        studentName:    STUDENT_NAME.toString(),
        matricNumber:   MATRIC_NUMBER.toString(),
        cgpa:           CGPA.toString(),
        classification: CLASSIFICATION_FIRST.toString(),
        courseOfStudy:  COURSE_OF_STUDY.toString(),
        graduationYear: GRADUATION_YEAR.toString(),
        blindingFactor: BLINDING_FACTOR.toString(),
        commitment:     COMMITMENT_LOWER,   // wrong commitment for these private inputs
        nullifier:      NULLIFIER,
        institutionId:  INSTITUTION_ID.toString(),
        claimType:      "4",
        claimThreshold: "0",
      };

      await expect(
        snarkjs.groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH)
      ).rejects.toThrow();
    });
  });
});
