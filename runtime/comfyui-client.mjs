import { safeLoopbackUrl } from './manifest-loader.mjs';

export class ComfyUIClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = safeLoopbackUrl(baseUrl);
    this.timeoutMs = options.timeoutMs || 8_000;
    this.clientId = options.clientId || `continuity-studio-${crypto.randomUUID()}`;
  }

  async request(path, init = {}, timeoutMs = this.timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        signal: controller.signal,
      });
      const text = await response.text();
      let value = null;
      try { value = text ? JSON.parse(text) : null; } catch { value = { text }; }
      if (!response.ok) {
        const detail = value?.error?.message || value?.error || value?.message || text || `HTTP ${response.status}`;
        throw new Error(`ComfyUI ${path} failed: ${detail}`);
      }
      return value;
    } finally {
      clearTimeout(timer);
    }
  }

  async uploadImage(filename, bytes, contentType = 'image/png') {
    const form = new FormData();
    form.append('image', new Blob([bytes], { type: contentType }), filename);
    form.append('type', 'input');
    form.append('overwrite', 'true');
    return this.request('/upload/image', { method: 'POST', body: form }, 120_000);
  }

  async outputBytes(output) {
    if (!output || typeof output !== 'object' || typeof output.filename !== 'string') {
      throw new Error('The selected ComfyUI output is not a file result.');
    }
    const query = new URLSearchParams({
      filename: output.filename,
      type: typeof output.type === 'string' ? output.type : 'output',
      subfolder: typeof output.subfolder === 'string' ? output.subfolder : '',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(`${this.baseUrl}/view?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`ComfyUI output download failed with HTTP ${response.status}.`);
      const declared = Number(response.headers.get('content-length') || 0);
      if (declared > 100 * 1024 * 1024) throw new Error('The selected ComfyUI output exceeds the 100 MB staging limit.');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 100 * 1024 * 1024) throw new Error('The selected ComfyUI output exceeds the 100 MB staging limit.');
      return { bytes, contentType: response.headers.get('content-type') || 'application/octet-stream' };
    } finally {
      clearTimeout(timer);
    }
  }

  async health() {
    const started = Date.now();
    try {
      const [stats, queue] = await Promise.all([
        this.request('/system_stats'),
        this.request('/queue'),
      ]);
      return {
        connected: true,
        latencyMs: Date.now() - started,
        stats,
        queue,
        error: null,
      };
    } catch (error) {
      return {
        connected: false,
        latencyMs: Date.now() - started,
        stats: null,
        queue: null,
        error: error instanceof Error ? error.message : 'ComfyUI is unavailable.',
      };
    }
  }

  objectInfo() {
    return this.request('/object_info', {}, 30_000);
  }

  queue() {
    return this.request('/queue');
  }

  history(promptId) {
    return this.request(`/history/${encodeURIComponent(promptId)}`, {}, 30_000);
  }

  submit(prompt, extraData = {}) {
    return this.request('/prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt, client_id: this.clientId, extra_data: extraData }),
    }, 30_000);
  }

  interrupt() {
    return this.request('/interrupt', { method: 'POST', body: '{}' });
  }

  removeQueued(promptId) {
    return this.request('/queue', {
      method: 'POST',
      body: JSON.stringify({ delete: [promptId] }),
    });
  }

  clearQueue() {
    return this.request('/queue', { method: 'POST', body: JSON.stringify({ clear: true }) });
  }

  websocketUrl() {
    const url = new URL(this.baseUrl);
    url.protocol = 'ws:';
    url.pathname = '/ws';
    url.searchParams.set('clientId', this.clientId);
    return url.toString();
  }
}
