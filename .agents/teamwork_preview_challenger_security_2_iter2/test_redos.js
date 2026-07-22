// test_redos.js

const newPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)\/?$/i;
const oldPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

// Let's build a malicious payload designed to exploit the old regex's nested quantifier
// e.g. path segment containing spaces/dashes/slashes followed by an invalid character at the end.
const maliciousPayload = 'http://example.com/' + 'a '.repeat(50) + '!';

console.log('Testing old pattern with malicious payload...');
const startOld = Date.now();
try {
  const resultOld = oldPattern.test(maliciousPayload);
  const endOld = Date.now();
  console.log(`Old pattern finished in ${endOld - startOld}ms. Result: ${resultOld}`);
} catch (e) {
  console.log(`Old pattern errored: ${e.message}`);
}

console.log('Testing new pattern with malicious payload...');
const startNew = Date.now();
try {
  const resultNew = newPattern.test(maliciousPayload);
  const endNew = Date.now();
  console.log(`New pattern finished in ${endNew - startNew}ms. Result: ${resultNew}`);
} catch (e) {
  console.log(`New pattern errored: ${e.message}`);
}

// Let's test with a super long input for the new pattern (e.g. 100,000 characters)
const superLongInput = 'http://example.com/' + 'a'.repeat(100000) + '!';
console.log('Testing new pattern with 100,000 characters...');
const startLong = Date.now();
const resultLong = newPattern.test(superLongInput);
const endLong = Date.now();
console.log(`New pattern on long input finished in ${endLong - startLong}ms. Result: ${resultLong}`);
