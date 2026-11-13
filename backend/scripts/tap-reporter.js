// backend/scripts/tap-reporter.js
/**
 * Custom Jest Reporter - Compact & Clean Mode
 * Giảm thiểu tối đa console.log rác, hiển thị tiến trình theo Test Suite gọn gàng
 */

class TapReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this._testIndex = 0;
    this._verbose = process.env.VERBOSE === '1' || process.env.TAP_VERBOSE === '1';
  }

  onRunStart() {
    if (this._verbose) {
      console.log('TAP version 13');
    }
  }

  onTestResult(test, testResult) {
    const filePath = testResult.testFilePath || '';
    const fileName = filePath.split(/[\\/]/).pop() || '';
    const suiteName = testResult.testResults[0]?.ancestorTitles[0] || fileName.replace('.spec.ts', '');
    const duration = testResult.perfStats ? (testResult.perfStats.end - testResult.perfStats.start) : 15;
    const totalTests = testResult.testResults.length;
    const failedTests = testResult.testResults.filter(tc => tc.status === 'failed');

    if (this._verbose) {
      console.log(`# Subtest: ${suiteName}`);
      testResult.testResults.forEach((tc) => {
        this._testIndex++;
        const isPassed = tc.status === 'passed';
        const statusText = isPassed ? 'ok' : 'not ok';
        console.log(`${statusText} ${this._testIndex} - ${tc.title}`);
      });
      return;
    }

    // Chế độ Compact mặc định: In 1 dòng sạch đẹp cho mỗi Test Suite
    const hasError = testResult.testExecError || failedTests.length > 0 || (testResult.numFailingTests && testResult.numFailingTests > 0);
    if (!hasError) {
      console.log(`  ✔ [${suiteName}] (${totalTests} tests - ${duration.toFixed(0)}ms)`);
    } else {
      console.log(`  ❌ [${suiteName}] FAILED (${failedTests.length || testResult.numFailingTests || 1}/${totalTests || 1} tests fail):`);
      if (testResult.testExecError) {
        console.log(`     - ❌ Lỗi thực thi Suite: ${testResult.testExecError.message?.split('\n')[0] || testResult.testExecError}`);
      }
      failedTests.forEach(tc => {
        console.log(`     - ❌ ${tc.title}: ${tc.failureMessages?.[0]?.split('\n')[0] || ''}`);
      });
    }
  }

  onRunComplete(contexts, results) {
    if (this._verbose) {
      console.log(`\n1..${results.numTotalTests}`);
      console.log(`# tests ${results.numTotalTests}`);
      console.log(`# pass ${results.numPassedTests}`);
      console.log(`# fail ${results.numFailedTests}`);
      if (results.numFailedTests === 0) {
        console.log('# ok\n');
      }
      return;
    }

    const allPassed = results.numFailedTests === 0 && results.numFailedTestSuites === 0;
    if (allPassed) {
      console.log(`\n📊 [Backend Summary] ${results.numPassedTestSuites}/${results.numTotalTestSuites} Suites PASS | ${results.numPassedTests}/${results.numTotalTests} Tests PASS (100% OK)\n`);
    } else {
      console.log(`\n📊 [Backend Summary] ${results.numPassedTestSuites}/${results.numTotalTestSuites} Suites PASS | ${results.numPassedTests}/${results.numTotalTests} Tests PASS (❌ ${results.numFailedTests} Tests / ${results.numFailedTestSuites} Suites FAILED)\n`);
    }
  }
}

module.exports = TapReporter;
