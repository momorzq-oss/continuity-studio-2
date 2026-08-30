import assert from 'node:assert/strict';
import test from 'node:test';

import { generateProductionImage } from '../lib/image-provider.ts';
import { parseStudioBrainResult } from '../lib/studio-brain.ts';

const encodedPixel = Buffer.from([1, 2, 3, 4]).toString('base64');

test('GPT Image adapter sends every reference to one image-edit request', async () => {
  let captured;
  const result = await generateProductionImage({
    apiKey: 'test-key',
    prompt: 'One composite master character sheet',
    references: [
      { name: 'front.png', contentType: 'image/png', bytes: Uint8Array.from([1]).buffer },
      { name: 'profile.jpg', contentType: 'image/jpeg', bytes: Uint8Array.from([2]).buffer },
    ],
    fetchImplementation: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ data: [{ b64_json: encodedPixel }] }), { status: 200, headers: { 'Content-Type': 'application/json', 'x-request-id': 'image-request-1' } });
    },
  });
  assert.equal(captured.url, 'https://api.openai.com/v1/images/edits');
  assert.equal(captured.init.headers.Authorization, 'Bearer test-key');
  assert.equal(captured.init.body.get('model'), 'gpt-image-2');
  assert.equal(captured.init.body.getAll('image[]').length, 2);
  assert.equal(result.requestId, 'image-request-1');
  assert.deepEqual([...result.bytes], [1, 2, 3, 4]);
});

test('GPT Image adapter uses text generation when a sheet has no linked references', async () => {
  let captured;
  await generateProductionImage({
    apiKey: 'test-key', prompt: 'One location sheet', references: [],
    fetchImplementation: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ data: [{ b64_json: encodedPixel }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  assert.equal(captured.url, 'https://api.openai.com/v1/images/generations');
  assert.equal(JSON.parse(captured.init.body).n, 1);
});

test('Codex results are rejected unless their mode and required structured payload agree', () => {
  const command = parseStudioBrainResult({ version: 1, mode: 'command', reasoningSummary: 'Natural language mapped safely.', canonicalCommand: 'Continue', responseGuidance: '', blueprint: null });
  assert.equal(command?.canonicalCommand, 'Continue');
  assert.equal(parseStudioBrainResult({ version: 1, mode: 'command', reasoningSummary: '', canonicalCommand: null, responseGuidance: '', blueprint: null }), null);
  assert.equal(parseStudioBrainResult({ version: 1, mode: 'project-blueprint', reasoningSummary: '', canonicalCommand: null, responseGuidance: '', blueprint: null }), null);
});

