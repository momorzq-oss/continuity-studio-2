import type { StudioProject } from '@/lib/studio';

interface GeneratedRow {
  target_id: string;
  media_key: string;
  created_at: string;
}

function matchesAsset(targetId: string, projectId: string, assetId: string) {
  return targetId === assetId || targetId === `${projectId}:${assetId}` || targetId.endsWith(`:${assetId}`);
}

export async function collectFlatGeneratedAssets(
  project: StudioProject,
  DB: D1Database,
  FILES: R2Bucket,
  pathPrefix = '',
) {
  const generated = await DB.prepare(`SELECT generation_jobs.target_id, generation_results.media_key, generation_results.created_at
    FROM generation_results
    INNER JOIN generation_jobs ON generation_jobs.id = generation_results.job_id
    WHERE generation_jobs.project_id = ?
    ORDER BY generation_results.created_at DESC`).bind(project.id).all<GeneratedRow>();
  const approvedVersions = await DB.prepare(`SELECT assets.stable_id AS target_id, asset_versions.media_key, asset_versions.created_at
    FROM asset_versions
    INNER JOIN assets ON assets.id = asset_versions.asset_id
    WHERE assets.project_id = ? AND asset_versions.media_key IS NOT NULL
      AND asset_versions.approval_state IN ('Approved', 'Locked')
    ORDER BY asset_versions.created_at DESC`).bind(project.id).all<GeneratedRow>();
  const candidates = [...generated.results, ...approvedVersions.results];
  const files: Record<string, Uint8Array> = {};
  const exportedAssetNumbers: number[] = [];

  for (const asset of project.assets
    .filter((item) => item.approvalState === 'Approved' || item.approvalState === 'Locked')
    .sort((a, b) => a.projectNumber - b.projectNumber)) {
    const candidate = candidates.find((item) => matchesAsset(item.target_id, project.id, asset.id));
    if (!candidate) continue;
    const object = await FILES.get(candidate.media_key);
    if (!object) continue;
    files[`${pathPrefix}${project.flatAssetFolder.folderName}/${asset.generatedFileName}`] = new Uint8Array(await object.arrayBuffer());
    exportedAssetNumbers.push(asset.projectNumber);
  }

  return { files, exportedAssetNumbers };
}

export function flatAssetManifest(project: StudioProject) {
  return project.assets
    .slice()
    .sort((a, b) => a.projectNumber - b.projectNumber)
    .map((asset) => ({
      assetNumber: asset.projectNumber,
      fileName: asset.generatedFileName,
      name: asset.name,
      category: asset.category,
      internalStableId: asset.id,
      approvalState: asset.approvalState,
      version: asset.version,
      sequences: asset.sequences,
    }));
}
