const axios = require('axios');

/**
 * Executes student code against test cases using Judge0 CE API.
 * Runs ALL test cases in parallel for faster execution under concurrent load.
 */
async function runCode(code, testCases, functionName = 'Main', language = 'java') {
  // Judge0 CE API configuration
  const JUDGE0_URL = 'https://ce.judge0.com/submissions?wait=true&base64_encoded=true';

  // Map language names to Judge0 language IDs
  const LANGUAGE_IDS = {
    java: 62,   // OpenJDK 13.0.1
    python: 71, // Python 3.8.1
    cpp: 54,    // GCC 9.2.0 (C++)
    c: 50       // GCC 9.2.0 (C)
  };

  const langId = LANGUAGE_IDS[language.toLowerCase()] || 62;
  const encodedCode = Buffer.from(code).toString('base64');

  const decode = (str) => {
    if (!str) return '';
    try { return Buffer.from(str, 'base64').toString('utf-8'); } catch { return str; }
  };

  // Run all test cases in parallel instead of sequentially
  const results = await Promise.all(
    testCases.map(async (testCase) => {
      try {
        const payload = {
          source_code: encodedCode,
          language_id: langId,
          stdin: Buffer.from(testCase.input || '').toString('base64'),
        };

        const response = await axios.post(JUDGE0_URL, payload, { timeout: 15000 });
        const data = response.data;

        const stdout = decode(data.stdout).trim();
        const stderr = decode(data.stderr).trim();
        const compileOutput = decode(data.compile_output).trim();
        const message = decode(data.message).trim();
        const expected = String(testCase.output).trim();

        // Status 3 = "Accepted" in Judge0
        if (data.status?.id !== 3) {
          const errorMsg = compileOutput || stderr || message || `Error: ${data.status?.description || 'Unknown Error'}`;
          return {
            input: testCase.input,
            expected,
            actual: errorMsg,
            passed: false,
            logs: errorMsg ? errorMsg.split('\n').filter(Boolean) : [],
            error: errorMsg,
            time: data.time ? parseFloat(data.time) * 1000 : null,
          };
        }

        return {
          input: testCase.input,
          expected,
          actual: stdout,
          passed: stdout === expected,
          logs: stdout ? stdout.split('\n').filter(Boolean) : [],
          time: data.time ? parseFloat(data.time) * 1000 : null,
        };
      } catch (apiError) {
        console.error('Judge0 API Error:', apiError.response?.data || apiError.message);
        const errMsg = `Cloud Execution Error: ${apiError.message}`;
        return {
          input: testCase.input,
          expected: String(testCase.output).trim(),
          actual: errMsg,
          passed: false,
          logs: [errMsg],
          error: apiError.message,
          time: null,
        };
      }
    })
  );

  return results;
}

module.exports = { runCode };
