// Kiểm thử dịch vụ tải ảnh qua Gateway với phản hồi giả lập ở biên HTTP.
const assert = require('node:assert/strict');
const { File } = require('node:buffer');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadTs(path, loadDependency = require) {
  const source = readFileSync(resolve(__dirname, path), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('exports', 'require', outputText)(exports, loadDependency);
  return exports;
}

const endpoints = loadTs('../../src/constants/apiEndpoints.ts');

function loadService(post) {
  return loadTs('../../src/services/purchase/roboflowVision.service.ts', (id) => {
    if (id === '../core/api') return { default: { post } };
    assert.equal(id, '../../constants/apiEndpoints');
    return endpoints;
  }).RoboflowVisionService;
}

const photo = new File(['image bytes'], 'package.jpg', { type: 'image/jpeg' });

test('Gửi ảnh multipart qua Gateway và giữ kết quả thực của backend', async () => {
  const result = { detectedCount: 2, confidence: 85, boxes: [] };
  const service = loadService(async (url, body) => {
    assert.equal(url, '/api/goods-receipts/vision/count-boxes');
    assert.deepEqual([...body.keys()], ['file']);
    assert.equal(body.get('file').name, photo.name);
    assert.equal(await body.get('file').text(), await photo.text());
    return { data: result };
  });

  assert.deepEqual(await service.analyzeImage(photo), result);
});

test('Giữ nguyên kết quả không phát hiện hộp nào', async () => {
  const result = { detectedCount: 0, confidence: 0, boxes: [] };
  const service = loadService(async () => ({ data: result }));
  assert.deepEqual(await service.analyzeImage(photo), result);
});

test('Từ chối tệp rỗng trước khi gửi yêu cầu', async () => {
  const service = loadService(() => assert.fail('Không được gửi tệp rỗng'));
  await assert.rejects(service.analyzeImage(new File([], 'empty.jpg')), /hình ảnh không hợp lệ/);
});

test('Trả lỗi Gateway về giao diện khi dịch vụ AI không khả dụng', async () => {
  const gatewayError = new Error('HTTP 503');
  const service = loadService(async () => { throw gatewayError; });
  await assert.rejects(service.analyzeImage(photo), (error) => error === gatewayError);
});
