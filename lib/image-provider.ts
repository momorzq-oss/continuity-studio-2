export interface ImageProviderReference {
  name: string;
  contentType: string;
  bytes: ArrayBuffer;
}

export interface GenerateProductionImageInput {
  apiKey: string;
  model?: string;
  prompt: string;
  references: ImageProviderReference[];
  fetchImplementation?: typeof fetch;
}

export interface GeneratedProductionImage {
  bytes: Uint8Array;
  contentType: 'image/png';
  model: string;
  requestId: string | null;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function providerError(response: Response) {
  let detail = '';
  try {
    const body = await response.json() as { error?: { message?: string; code?: string } };
    detail = body.error?.message || body.error?.code || '';
  } catch {
    detail = await response.text().catch(() => '');
  }
  return new Error(`GPT Image returned ${response.status}${detail ? `: ${detail}` : '.'}`);
}

export async function generateProductionImage(input: GenerateProductionImageInput): Promise<GeneratedProductionImage> {
  const model = input.model || 'gpt-image-2';
  const request = input.fetchImplementation ?? fetch;
  let response: Response;
  if (input.references.length) {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', input.prompt);
    form.append('size', '1536x1024');
    form.append('quality', 'high');
    for (const reference of input.references) {
      form.append('image[]', new File([reference.bytes], reference.name, { type: reference.contentType }));
    }
    response = await request('https://api.openai.com/v1/images/edits', {
      method: 'POST', headers: { Authorization: `Bearer ${input.apiKey}` }, body: form,
    });
  } else {
    response = await request('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: input.prompt, size: '1536x1024', quality: 'high', n: 1 }),
    });
  }
  if (!response.ok) throw await providerError(response);
  const payload = await response.json() as { data?: Array<{ b64_json?: string }> };
  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error('GPT Image completed without returning image bytes.');
  return {
    bytes: decodeBase64(base64),
    contentType: 'image/png',
    model,
    requestId: response.headers.get('x-request-id'),
  };
}

