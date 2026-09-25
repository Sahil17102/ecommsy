export function calculateWeight(weight, length, width, height, divisor = 5000) {
  if (
    ![weight, length, width, height, divisor].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  )
    throw new Error("Enter a positive value in every field.");
  const volumetric = (length * width * height) / divisor;
  return {
    actual: weight,
    volumetric,
    chargeable: Math.max(weight, volumetric),
  };
}
export function validPincode(value) {
  return /^[1-9][0-9]{5}$/.test(value);
}
