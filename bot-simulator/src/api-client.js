// Module thực hiện các request HTTP tới API Gateway với cơ chế Retry và Latency Tracking
class ApiClient {
  constructor(baseUrl, defaultTimeoutMs = 8000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.lastLatencyMs = null;
    this.onUnauthorized = null; // Hook tự động xử lý 401: (oldToken, roleContext) => Promise<newToken>
  }

  async request(method, endpoint, body = null, token = null, extraHeaders = {}, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = options.retries !== undefined ? options.retries : 1;

    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const startTime = Date.now();

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        this.lastLatencyMs = Date.now() - startTime;

        const text = await response.text();
        let parsedData = null;
        try {
          parsedData = JSON.parse(text);
        } catch {
          parsedData = text;
        }

        if (!response.ok) {
          // Tự động phục hồi khi token hết hạn (401 Unauthorized)
          if (response.status === 401 && this.onUnauthorized && !options._isRetry401 && token) {
            try {
              const newToken = await this.onUnauthorized(token, options.roleContext);
              if (newToken && newToken !== token) {
                return await this.request(method, endpoint, body, newToken, extraHeaders, {
                  ...options,
                  _isRetry401: true,
                });
              }
            } catch {}
          }

          const errorMsg =
            parsedData?.message ||
            parsedData?.error ||
            `HTTP Error ${response.status} on ${method} ${endpoint}`;
          const finalMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
          const err = new Error(finalMsg);
          err.status = response.status;
          err.response = parsedData;

          // Chỉ retry khi gặp lỗi phía server (502, 503, 504) hoặc 429
          if (attempt < maxRetries && [429, 502, 503, 504].includes(response.status)) {
            attempt++;
            await new Promise(r => setTimeout(r, 200 * attempt));
            continue;
          }

          // Các lỗi 4xx khác (400, 401, 403, 404, ...) ném ra ngay, không retry
          throw err;
        }

        return parsedData;
      } catch (err) {
        lastError = err;
        // Nếu là lỗi HTTP status đã phân loại ở trên thì ném ra ngay
        if (err.status && ![429, 502, 503, 504].includes(err.status)) {
          throw err;
        }

        if (attempt >= maxRetries) {
          throw lastError;
        }
        attempt++;
        await new Promise(r => setTimeout(r, 150 * attempt));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  }

  get(endpoint, token = null, extraHeaders = {}, options = {}) {
    return this.request('GET', endpoint, null, token, extraHeaders, options);
  }

  post(endpoint, body, token = null, extraHeaders = {}, options = {}) {
    return this.request('POST', endpoint, body, token, extraHeaders, options);
  }

  patch(endpoint, body, token = null, extraHeaders = {}, options = {}) {
    return this.request('PATCH', endpoint, body, token, extraHeaders, options);
  }

  put(endpoint, body, token = null, extraHeaders = {}, options = {}) {
    return this.request('PUT', endpoint, body, token, extraHeaders, options);
  }

  delete(endpoint, token = null, extraHeaders = {}, options = {}) {
    return this.request('DELETE', endpoint, null, token, extraHeaders, options);
  }

  // Kiểm tra độ trễ mạng tới Gateway
  async ping() {
    const t0 = Date.now();
    try {
      await this.get('/health', null, {}, { timeoutMs: 3000, retries: 0 });
      return { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      return { ok: false, error: err.message, latencyMs: Date.now() - t0 };
    }
  }
}

module.exports = ApiClient;
