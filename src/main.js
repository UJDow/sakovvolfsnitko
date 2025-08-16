console.log("Original readable code - before obfuscation");

function secretAlgorithm() {
  const a = 10;
  const b = 25;
  const result = `${a} + ${b} = ${a + b}`;
  
  console.log("Result:", result);
  alert(result);
  return result;
}

secretAlgorithm();
