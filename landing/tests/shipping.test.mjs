import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateWeight, validPincode } from "../lib/shipping.mjs";
test("volumetric weight wins for light bulky parcels", () =>
  assert.deepEqual(calculateWeight(1, 30, 20, 20), {
    actual: 1,
    volumetric: 2.4,
    chargeable: 2.4,
  }));
test("actual weight wins for dense parcels", () =>
  assert.equal(calculateWeight(5, 10, 10, 10).chargeable, 5));
test("carrier divisors change volumetric weight", () =>
  assert.equal(calculateWeight(1, 30, 20, 20, 6000).volumetric, 2));
test("invalid dimensions are rejected", () => {
  for (const n of [0, -1, NaN, Infinity])
    assert.throws(() => calculateWeight(1, n, 20, 20));
});
test("Indian pincodes have six digits and nonzero prefix", () => {
  assert.equal(validPincode("110001"), true);
  for (const p of ["000001", "12345", "110001a", ""])
    assert.equal(validPincode(p), false);
});
