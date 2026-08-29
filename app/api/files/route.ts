import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { nowIso, type StudioMessage, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'reference';
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const form = await request.formData();
    const projectId = String(form.get('projectId') ?? '');
    const role = String(form.get('role') ?? 'Unassigned reference').slice(0, 100);
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

    const project = JSON.parse(row.state_json) as StudioProject;
    const id = `reference_${crypto.randomUUID()}`;
    const mediaKey = `projects/${projectId}/reference_images/${id}-${cleanName(file.name)}`;
    await FILES.put(mediaKey, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
      customMetadata: { projectId, originalName: file.name, role },
    });

    const createdAt = nowIso();
    const attachment = {
      id,
      name: file.name,
      role,
      contentType: file.type || 'application/octet-stream',
      byteSize: file.size,
      createdAt,
    };
    project.attachments.push(attachment);
    project.updatedAt = createdAt;

    let assetId: string | null = null;
    if (/main character|likeness|my photo/i.test(role)) {
      const character = project.assets.find((asset) => asset.id === 'CHARACTER_001');
      if (character) {
        character.referenceCount += 1;
        character.approvalState = 'Needs Review';
        character.notes = `${character.referenceCount} likeness reference${character.referenceCount === 1 ? '' : 's'} attached. Original files preserved.`;
        assetId = `${project.id}:${character.id}`;
      }
    }

    const assistant: StudioMessage = {
      id: `message_${crypto.randomUUID()}`,
      role: 'assistant',
      content: `Stored “${file.name}” as ${role.toLowerCase()}. The original file is preserved${assetId ? ' and linked to CHARACTER_001' : ''}.`,
      createdAt,
      metadata: { kind: 'attachment', assetIds: assetId ? ['CHARACTER_001'] : undefined },
    };

    await DB.batch([
      DB.prepare(`INSERT INTO asset_references (
        id, project_id, asset_id, original_name, media_key, content_type, byte_size, role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        id, projectId, assetId, file.name, mediaKey, attachment.contentType, file.size, role, createdAt,
      ),
      DB.prepare('UPDATE projects SET state_json = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(project), createdAt, projectId),
      DB.prepare('INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(assistant.id, projectId, assistant.role, assistant.content, JSON.stringify(assistant.metadata), assistant.createdAt),
    ]);
    return Response.json({ project, attachment, message: assistant });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The reference could not be stored. Your project is unchanged.' }, { status: 500 });
  }
}
