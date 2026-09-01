import { readFileSync } from 'node:fs';

import { resolveWorkflowSource, sha256File } from './manifest-loader.mjs';

const VIRTUAL_NODE_TYPES = new Set(['MarkdownNote', 'Note', 'Reroute', 'Fast Groups Bypasser (rgthree)']);

function nodeTitle(node) {
  return String(node.title || node.properties?.['Node name for S&R'] || '');
}

export function loadWorkflowTemplate(descriptor, configuration) {
  const sourcePath = resolveWorkflowSource(descriptor, configuration);
  if (!sourcePath) return { sourcePath: null, workflow: null };
  const workflow = JSON.parse(readFileSync(sourcePath, 'utf8'));
  return { sourcePath, workflow };
}

export function findSemanticNodes(workflow, binding) {
  const titleMatcher = binding.titlePattern ? new RegExp(binding.titlePattern, 'i') : null;
  return workflow.nodes.filter((node) => node.type === binding.nodeType && (!titleMatcher || titleMatcher.test(nodeTitle(node))));
}

export function semanticNode(workflow, descriptor, bindingId) {
  const binding = descriptor.semanticBindings.find((item) => item.id === bindingId);
  if (!binding) throw new Error(`Unknown workflow binding ${bindingId}.`);
  const matches = findSemanticNodes(workflow, binding);
  if (matches.length !== 1) throw new Error(`Binding ${bindingId} matched ${matches.length} nodes; exactly one is required.`);
  return { binding, node: matches[0] };
}

const widgetIndexHints = {
  'character-sheet': 0,
  'krea-model': 0,
  'identity-lora': 0,
  'storyboard-shots': 12,
  'storyboard-regenerate-shot': 11,
  'storyboard-layout-columns': 0,
  'storyboard-layout-rows': 1,
  'storyboard-labels': 9,
  'h3-model': 0,
  'h3-text-encoder': 0,
  'h3-video-vae': 0,
  'h3-audio-vae': 0,
  'h3-reference-compiler': 0,
  'h3-character-reference': 0,
  'h3-storyboard-reference': 0,
  'h3-plan': 0,
  'h3-run-name': 1,
  'h3-context-length': 5,
  'h3-audio-mode': 9,
  'h3-scene-range': 1,
  'h3-resume-scene': 0,
  'h3-output-name': 1,
  'h3-candidate-count': 6,
};

export function applySemanticBindings(workflow, descriptor, bindings = {}) {
  const clone = structuredClone(workflow);
  for (const [bindingId, value] of Object.entries(bindings)) {
    const { node } = semanticNode(clone, descriptor, bindingId);
    const index = widgetIndexHints[bindingId];
    if (!Number.isInteger(index) || !Array.isArray(node.widgets_values) || index >= node.widgets_values.length) {
      throw new Error(`Binding ${bindingId} has no compatible serialized widget slot.`);
    }
    node.widgets_values[index] = value;
  }
  return clone;
}

function selectedWidgetValue(workflow, descriptor, bindingId) {
  const { node } = semanticNode(workflow, descriptor, bindingId);
  return node.widgets_values?.[widgetIndexHints[bindingId]];
}

export async function validateWorkflow(descriptor, workflow, options = {}) {
  const findings = [];
  if (!workflow || !Array.isArray(workflow.nodes) || !Array.isArray(workflow.links)) {
    return { compatible: false, findings: [{ id: 'workflow-source', severity: 'blocking', message: 'The workflow source file is missing or invalid.' }] };
  }
  if (options.sourcePath) {
    const digest = await sha256File(options.sourcePath);
    if (digest.toLowerCase() !== descriptor.sha256.toLowerCase()) {
      findings.push({ id: 'workflow-checksum', severity: 'blocking', message: `Workflow checksum ${digest} does not match the registered source ${descriptor.sha256}.` });
    }
  }
  if (workflow.nodes.length !== descriptor.nodeCount || workflow.links.length !== descriptor.linkCount) {
    findings.push({ id: 'workflow-shape', severity: 'review', message: `Workflow shape is ${workflow.nodes.length} nodes / ${workflow.links.length} links; registry expected ${descriptor.nodeCount} / ${descriptor.linkCount}.` });
  }
  for (const binding of descriptor.semanticBindings) {
    const matches = findSemanticNodes(workflow, binding);
    if (matches.length !== 1) findings.push({ id: `binding:${binding.id}`, severity: 'blocking', message: `${binding.id} matched ${matches.length} nodes instead of exactly one.` });
  }
  if (options.target !== 'storyboard') {
    try {
      const selected = String(selectedWidgetValue(workflow, descriptor, 'h3-model') || '');
      if (!/ref2va/i.test(selected)) {
        findings.push({ id: 'ref2va-model-selection', severity: 'blocking', message: `The H3 Ref2VA loader selects “${selected || 'nothing'}”. Select a validated Ref2VA checkpoint before generation.` });
      }
    } catch (error) {
      findings.push({ id: 'ref2va-model-selection', severity: 'blocking', message: error instanceof Error ? error.message : 'The H3 model binding is invalid.' });
    }
  }
  if (options.objectInfo) {
    const liveTypes = new Set(Object.keys(options.objectInfo));
    const scopedNodeIds = options.target ? collectAncestors(workflow, targetNodeForExecution(workflow, descriptor, options.target)) : null;
    const requiredTypes = new Set(workflow.nodes.filter((node) => (!scopedNodeIds || scopedNodeIds.has(String(node.id))) && !VIRTUAL_NODE_TYPES.has(node.type)).map((node) => node.type));
    for (const type of requiredTypes) {
      if (!liveTypes.has(type)) findings.push({ id: `node:${type}`, severity: 'blocking', message: `Live ComfyUI does not expose required node type ${type}.` });
    }
  } else {
    findings.push({ id: 'live-object-info', severity: 'review', message: 'Live ComfyUI node schemas have not been checked through /object_info.' });
  }
  const blocking = findings.filter((finding) => finding.severity === 'blocking');
  return { compatible: blocking.length === 0, findings };
}

function linkIndex(workflow) {
  return new Map(workflow.links.map((link) => [link[0], link]));
}

function nodeIndex(workflow) {
  return new Map(workflow.nodes.map((node) => [String(node.id), node]));
}

function incomingLinkFor(node, inputName) {
  return node.inputs?.find((input) => input.name === inputName)?.link ?? null;
}

function resolveOrigin(workflow, linkId, visited = new Set()) {
  const links = linkIndex(workflow);
  const nodes = nodeIndex(workflow);
  const link = links.get(linkId);
  if (!link) throw new Error(`Workflow link ${linkId} is missing.`);
  const sourceId = String(link[1]);
  const sourceSlot = link[2];
  const source = nodes.get(sourceId);
  if (!source) throw new Error(`Workflow source node ${sourceId} is missing.`);
  if (source.type !== 'Reroute') return [sourceId, sourceSlot];
  if (visited.has(sourceId)) throw new Error('Workflow contains a reroute cycle.');
  visited.add(sourceId);
  const upstream = source.inputs?.[0]?.link;
  if (upstream === null || upstream === undefined) throw new Error(`Reroute ${sourceId} is disconnected.`);
  return resolveOrigin(workflow, upstream, visited);
}

function targetNodeForExecution(workflow, descriptor, target) {
  if (target === 'storyboard') return semanticNode(workflow, descriptor, 'storyboard-layout-columns').node;
  if (target === 'h3-chain') return semanticNode(workflow, descriptor, 'h3-output-name').node;
  throw new Error('Workflow target must be storyboard or h3-chain.');
}

function collectAncestors(workflow, targetNode) {
  const nodes = nodeIndex(workflow);
  const links = linkIndex(workflow);
  const selected = new Set();
  const visit = (node) => {
    const id = String(node.id);
    if (selected.has(id)) return;
    selected.add(id);
    for (const input of node.inputs || []) {
      if (input.link === null || input.link === undefined) continue;
      const link = links.get(input.link);
      const source = link ? nodes.get(String(link[1])) : null;
      if (source) visit(source);
    }
  };
  visit(targetNode);
  return selected;
}

function schemaEntries(info) {
  return [
    ...Object.entries(info?.input?.required || {}),
    ...Object.entries(info?.input?.optional || {}),
  ];
}

function isWidgetDefinition(definition) {
  const type = definition?.[0];
  return Array.isArray(type) || ['STRING', 'INT', 'FLOAT', 'BOOLEAN', 'COMBO'].includes(type);
}

function widgetValuesBySchema(node, info) {
  const values = Array.isArray(node.widgets_values) ? node.widgets_values : [];
  const widgetEntries = schemaEntries(info).filter(([, definition]) => isWidgetDefinition(definition));
  const mapped = new Map();
  let cursor = 0;
  for (const [name] of widgetEntries) {
    mapped.set(name, values[cursor]);
    cursor += 1;
  }
  return { mapped, expected: widgetEntries.length, observed: values.length };
}

export function convertUiWorkflowToApi(workflow, descriptor, objectInfo, target) {
  const outputNode = targetNodeForExecution(workflow, descriptor, target);
  const selected = collectAncestors(workflow, outputNode);
  const prompt = {};
  const warnings = [];
  for (const node of workflow.nodes) {
    const id = String(node.id);
    if (!selected.has(id) || VIRTUAL_NODE_TYPES.has(node.type)) continue;
    const info = objectInfo[node.type];
    if (!info) throw new Error(`Live ComfyUI does not expose ${node.type}.`);
    const inputs = {};
    const { mapped, expected, observed } = widgetValuesBySchema(node, info);
    if (observed > expected + 2) warnings.push(`${node.type} ${id} has ${observed} serialized widgets for ${expected} live primitive inputs; semantic bindings were applied but live preflight should review this node.`);
    for (const [name, definition] of schemaEntries(info)) {
      const linkId = incomingLinkFor(node, name);
      if (linkId !== null && linkId !== undefined) {
        const origin = resolveOrigin(workflow, linkId);
        if (selected.has(origin[0])) inputs[name] = origin;
        continue;
      }
      if (isWidgetDefinition(definition) && mapped.has(name) && mapped.get(name) !== undefined) inputs[name] = mapped.get(name);
    }
    prompt[id] = {
      class_type: node.type,
      inputs,
      _meta: { title: nodeTitle(node) || node.type },
    };
  }
  return { prompt, warnings, selectedNodeIds: [...selected] };
}

export async function compileWorkflowRequest(descriptor, sourceWorkflow, objectInfo, request) {
  const workflow = applySemanticBindings(sourceWorkflow, descriptor, request.bindings || {});
  const validation = await validateWorkflow(descriptor, workflow, { objectInfo, target: request.target });
  if (!validation.compatible) {
    throw new Error(`Workflow preflight failed: ${validation.findings.filter((finding) => finding.severity === 'blocking').map((finding) => finding.message).join(' ')}`);
  }
  const compiled = convertUiWorkflowToApi(workflow, descriptor, objectInfo, request.target);
  return { ...compiled, validation };
}
