const axios = require('axios');

/**
 * Executes student Java code against test cases using the Judge0 CE API (Public).
 * Uses Base64 encoding to ensure special characters don't break the request.
 */
async function runCode(code, testCases, functionName = 'Main', language = 'java') {
  const results = [];
  
  // Judge0 CE API configuration (Public Instance)
  // Note: base64_encoded=true tells Judge0 to expect b64 and return b64
  const JUDGE0_URL = 'https://ce.judge0.com/submissions?wait=true&base64_encoded=true';
  
  // Map our language names to Judge0 language IDs
  const LANGUAGE_IDS = {
    java: 62,     // OpenJDK 13.0.1
    python: 71,   // Python 3.8.1
    cpp: 54,      // GCC 9.2.0 (C++)
    c: 50         // GCC 9.2.0 (C)
  };
  
  const langId = LANGUAGE_IDS[language.toLowerCase()] || 62;

  for (const testCase of testCases) {
    try {
      const payload = {
        source_code: Buffer.from(code).toString('base64'),
        language_id: langId,
        stdin: Buffer.from(testCase.input || '').toString('base64'),
      };

      const response = await axios.post(JUDGE0_URL, payload);
      const data = response.data;
      
      const decode = (str) => {
        if (!str) return '';
        try {
          return Buffer.from(str, 'base64').toString('utf-8');
        } catch {
          return str;
        }
      };

      const stdout = decode(data.stdout).trim();
      const stderr = decode(data.stderr).trim();
      const compileOutput = decode(data.compile_output).trim();
      const message = decode(data.message).trim();
      
      const expected = String(testCase.output).trim();

      // Status 3 is "Accepted" in Judge0
      if (data.status?.id !== 3) {
        results.push({
          input: testCase.input,
          expected,
          actual: compileOutput || stderr || message || `Error: ${data.status?.description || 'Unknown Error'}`,
          passed: false,
          logs: [],
          error: compileOutput || stderr || message
        });
      } else {
        results.push({
          input: testCase.input,
          expected,
          actual: stdout,
          passed: stdout === expected,
          logs: [],
        });
      }
    } catch (apiError) {
      console.error('Judge0 API Error:', apiError.response?.data || apiError.message);
      results.push({
        input: testCase.input,
        expected: String(testCase.output).trim(),
        actual: `Cloud Execution Error: ${apiError.message}`,
        passed: false,
        logs: [],
        error: apiError.message
      });
    }
  }

  return results;
}

module.exports = { runCode };
