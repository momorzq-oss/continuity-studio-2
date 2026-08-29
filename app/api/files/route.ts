import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { assetProductionReference, normalizeProject, nowIso, type StudioMessage, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'reference';
}

function inferReferenceRoles(file: File, role: string) {
  const signal = `${file.name} ${role}`.toLowerCase();
  const roles = new Set<string>();
  if (/main character|likeness|identity|my photo/.test(signal)) roles.add('Identity');
  if (/face|portrait|head|identity/.test(signal) || (file.type.startsWith('image/') && roles.has('Identity'))) roles.add('Face');
  if (/profile|side/.test(signal)) roles.add('Profile');
  if (/body|full.?length|standing/.test(signal)) roles.add('Body');
  if (/rear|back view/.test(signal)) roles.add('Rear');
  if (/costume|wardrobe|clothing|shoe|footwear|accessor/.test(signal)) roles.add('Costume');
  if (/location|exterior|building|architecture/.test(signal)) roles.add('Location');
  if (/interior|room/.test(signal)) roles.add('Interior');
  if (/weather|environment|fog|rain|snow|dust|smoke|lighting/.test(signal)) roles.add(/lighting/.test(signal) ? 'Lighting' : 'Environment');
  if (/prop|object|weapon|vehicle|animal|creature|mechanical|transform|damage|pose|style/.test(signal)) {
    for (const candidate of ['Prop', 'Weapon', 'Vehicle', 'Animal', 'Creature', 'Mechanical', 'Transformation', 'Damage', 'Pose', 'Style']) {
      if (signal.includes(candidate.toLowerCase())) roles.add(candidate);
    }
  }
  if (file.type.startsWith('video/')) roles.add('Continuity');
  if (file.type.startsWith('audio/')) roles.add('Sound');
  if (roles.size === 0) roles.add('Production reference');
  return [...roles];
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const form = await request.formData();
    const projectIdValue = form.get('projectId');
    const roleValue = form.get('role');
    const projectId = typeof projectIdValue === 'string' ? projectIdValue : '';
    const role = (typeof roleValue === 'string' ? roleValue : 'Unassigned reference').slice(0, 100);
    const file = form.get('file');
    if (!projectId || !(file instanceof File)) {
      return Response.json({ error: 'Choose a file and an active project first.' }, { status: 400 });
    }
    if (file.size > 250 * 1024 * 1024) {
      return Response.json({ error: 'That file is over the 250 MB reference limit.' }, { status: 413 });
    }
    const { DB, FILES } = getRuntimeEnv();
    const row = await DB.prepare('SELECT state_json FROM projects WHERE id = ? AND archived = 0')
      .bind(projectId)
      .first<{ state_json: string }>();
    if (!row) return Response.json({ error: 'Open a project before adding references.' }, { status: 404 });

    const project = normalizeProject(JSON.parse(row.state_json) as StudioProject);
    const id = `reference_${crypto.randomUUID()}`;
    const mediaKey = `projects/${projectId}/reference_images/${id}-${cleanName(file.name)}`;
    await FILES.put(mediaKey, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
      customMetadata: { projectId, originalName: file.name, role },
    });

    const createdAt = nowIso();
    const referenceRoles = inferReferenceRoles(file, role);
    const attachment: StudioProject['attachments'][number] = {
      id,
      name: file.name,
      role,
      contentType: file.type || 'application/octet-stream',
      byteSize: file.size,
      createdAt,
      referenceRoles,
    };
    project.attachments.push(attachment);
    project.updatedAt = createdAt;

    let assetId: string | null = null;
    let coverageAsset: StudioProject['assets'][number] | null = null;
    if (/main character|likeness|my photo/i.test(role)) {
      const character = project.assets.find((asset) => asset.id === 'CHARACTER_001');
      if (character) {
        character.referenceCount += 1;
        character.approvalState = 'Needs Review';
        character.notes = `${character.referenceCount} likeness reference${character.referenceCount === 1 ? '' : 's'} attached. Original files preserved.`;
        character.referenceCoverage.identity = Math.min(100, character.referenceCoverage.identity + 40);
        if (referenceRoles.includes('Face')) character.referenceCoverage.face = Math.min(100, character.referenceCoverage.face + 40);
        if (referenceRoles.includes('Profile')) character.referenceCoverage.profile = Math.min(100, character.referenceCoverage.profile + 45);
        if (referenceRoles.includes('Body')) character.referenceCoverage.body = Math.min(100, character.referenceCoverage.body + 40);
        if (referenceRoles.includes('Rear')) character.referenceCoverage.rear = Math.min(100, character.referenceCoverage.rear + 45);
        if (referenceRoles.includes('Costume')) character.referenceCoverage.costume = Math.min(100, character.referenceCoverage.costume + 35);
        character.referenceCoverage.continuity = Math.min(100, character.referenceCoverage.continuity + 20);
        attachment.linkedAssetId = character.id;
        attachment.linkedAssetNumber = character.projectNumber;
        assetId = `${project.id}:${character.id}`;
        coverageAsset = character;
      }
    }

    const assistant: StudioMessage = {
      id: `message_${crypto.randomUUID()}`,
      role: 'assistant',
      content: `Stored “${file.name}” as ${referenceRoles.join(', ')} reference${referenceRoles.length === 1 ? '' : 's'}. The original file is preserved${coverageAsset ? ` and contributes to the single ${assetProductionReference(coverageAsset)} identity profile` : ''}.`,
      createdAt,
      metadata: { kind: 'attachment', assetIds: assetId ? ['CHARACTER_001'] : undefined },
    };

    const statements = [
      DB.prepare(`INSERT INTO asset_references (
        id, project_id, asset_id, original_name, media_key, content_type, byte_size, role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        id, projectId, assetId, file.name, mediaKey, attachment.contentType, file.size, role, createdAt,
      ),
      DB.prepare('UPDATE projects SET state_json = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(project), createdAt, projectId),
      DB.prepare('INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(assistant.id, projectId, assistant.role, assistant.content, JSON.stringify(assistant.metadata), assistant.createdAt),
    ];
    if (coverageAsset) {
      const values = Object.values(coverageAsset.referenceCoverage);
      const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
      const risk = average < 40 ? 'High' : average < 55 ? 'Medium' : 'Low';
      statements.push(DB.prepare(`INSERT INTO reference_coverage (
        id, project_id, asset_stable_id, coverage_json, reference_count, risk_level, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, asset_stable_id) DO UPDATE SET coverage_json = excluded.coverage_json,
        reference_count = excluded.reference_count, risk_level = excluded.risk_level, updated_at = excluded.updated_at`)
        .bind(`${project.id}:${coverageAsset.id}:coverage`, project.id, coverageAsset.id, JSON.stringify(coverageAsset.referenceCoverage), coverageAsset.referenceCount, risk, createdAt));
    }
    await DB.batch(statements);
    return Response.json({ project, attachment, message: assistant });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The reference could not be stored. Your project is unchanged.' }, { status: 500 });
  }
}
