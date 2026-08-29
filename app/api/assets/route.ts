import { zipSync } from 'fflate';

import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { collectFlatGeneratedAssets } from '@/lib/flat-asset-export';
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
    const project = normalizeProject(JSON.parse(row.state_json) as StudioProject);
    const flat = await collectFlatGeneratedAssets(project, DB, FILES);
    if (flat.exportedAssetNumbers.length === 0) {
      return Response.json({
        error: 'No approved generated visual assets are available yet. Approve generated assets first; source references are not placed in the generated asset folder.',
      }, { status: 409 });
    }
    const zipped = zipSync(flat.files, { level: 6 });
    const filename = `${project.flatAssetFolder.folderName}.zip`;
    return new Response(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The flat asset folder could not be created. Your project is unchanged.' }, { status: 500 });
  }
}
