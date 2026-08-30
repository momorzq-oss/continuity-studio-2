import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { createVerifiedArchive } from '@/lib/archive-verification';
import { collectFlatGeneratedAssets } from '@/lib/flat-asset-export';
import { decodeProjectState } from '@/lib/project-state-codec';
import { normalizeProject, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) return Response.json({ error: 'Choose a project before downloading its assets.' }, { status: 400 });
    const { DB, FILES } = getRuntimeEnv();
    const row = await DB.prepare('SELECT state_json FROM projects WHERE id = ? AND archived = 0')
      .bind(projectId)
      .first<{ state_json: string }>();
    if (!row) return Response.json({ error: 'That project is no longer available.' }, { status: 404 });
    const project = normalizeProject(await decodeProjectState<StudioProject>(row.state_json));
    const flat = await collectFlatGeneratedAssets(project, DB, FILES);
    if (flat.exportedAssetNumbers.length === 0) {
      return Response.json({
        error: 'No approved generated visual assets are available yet. Approve generated assets first; source references are not placed in the generated asset folder.',
      }, { status: 409 });
    }
    const { zipped, verification } = await createVerifiedArchive(flat.files, 'FLAT_ASSET_ARCHIVE_MANIFEST.json');
    if (verification.status !== 'Passed') return Response.json({ error: `The flat asset archive failed final verification: ${verification.errors.join(' ')}` }, { status: 500 });
    await DB.prepare('INSERT INTO archive_verifications (id, project_id, kind, expected_file_count, verified_file_count, status, manifest_hash, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(`archive_verification_${crypto.randomUUID()}`, project.id, 'flat-assets', verification.expectedFileCount, verification.verifiedFileCount, verification.status, verification.manifestHash, new Date().toISOString()).run();
    const filename = `${project.flatAssetFolder.folderName}.zip`;
    return new Response(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Archive-Verification': verification.status,
        'X-Archive-Manifest-SHA256': verification.manifestHash,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The flat asset folder could not be created. Your project is unchanged.' }, { status: 500 });
  }
}
