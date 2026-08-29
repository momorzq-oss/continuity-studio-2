import { strToU8, zipSync } from 'fflate';

import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { collectFlatGeneratedAssets, flatAssetManifest } from '@/lib/flat-asset-export';
import { normalizeProject, nowIso, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Continuity_Project';
}

function text(value: unknown) {
  return strToU8(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) return Response.json({ error: 'Choose a project to export.' }, { status: 400 });
    const { DB, FILES } = getRuntimeEnv();
    const row = await DB.prepare('SELECT state_json FROM projects WHERE id = ?')
      .bind(projectId)
      .first<{ state_json: string }>();
    if (!row) return Response.json({ error: 'That project is no longer available.' }, { status: 404 });
    const project = normalizeProject(JSON.parse(row.state_json) as StudioProject);
    const messages = await DB.prepare(
      'SELECT id, role, content, metadata_json, created_at FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC',
    ).bind(projectId).all();
    const references = await DB.prepare(
      'SELECT id, asset_id, original_name, media_key, content_type, byte_size, role, created_at FROM asset_references WHERE project_id = ? ORDER BY created_at ASC',
    ).bind(projectId).all<{ id: string; asset_id: string | null; original_name: string; media_key: string; content_type: string; byte_size: number; role: string; created_at: string }>();
    const jobs = await DB.prepare(
      'SELECT id, target_id, provider, model, prompt_version, status, failure_message, started_at, updated_at FROM generation_jobs WHERE project_id = ? ORDER BY started_at ASC',
    ).bind(projectId).all();
    const productionRecords = await DB.prepare(
      'SELECT record_type, stable_key, status, sequence_number, content_json, updated_at FROM production_records WHERE project_id = ? ORDER BY record_type, sequence_number, stable_key',
    ).bind(projectId).all();
    const recoverySnapshots = await DB.prepare(
      'SELECT id, reason, state_json, created_at FROM project_recovery_snapshots WHERE project_id = ? ORDER BY created_at ASC',
    ).bind(projectId).all<{ id: string; reason: string; state_json: string; created_at: string }>();
    const root = safeName(project.title);
    const files: Record<string, Uint8Array> = {
      [`${root}/project.json`]: text(project),
      [`${root}/PROJECT_SUMMARY.md`]: text(`# ${project.title}\n\n${project.story.logline}\n\n- Duration: ${project.durationSeconds / 60} minutes\n- Sequences: ${project.sequenceCount}\n- Genre: ${project.genre} / ${project.subgenre}\n- Story: ${project.story.status}\n- World Bible: ${project.worldBible.status}\n- Film Bible: ${project.filmBible.status}\n- Structured locations: ${project.locations.length}\n- Environment states: ${project.environments.length}\n- Knowledge relationships: ${project.knowledgeGraph.edges.length}\n- Asset state events: ${project.stateEvents.length}\n- Continuity: ${project.continuity.status}\n- Production readiness: ${project.production.readiness}\n- Pipeline stage: ${project.production.currentPipelineStage}\n- Dependency impacts: ${project.production.dependencies.filter((item) => item.freshness !== 'Current').length}\n- Render jobs: ${project.production.renderQueue.length}\n- Validation reports: ${project.production.validations.length}\n- Continuity checkpoints: ${project.production.checkpoints.length}\n- Recovery snapshots: ${recoverySnapshots.results.length}\n- Flat asset folder: ${project.flatAssetFolder.folderName}\n- Asset naming: ${project.flatAssetFolder.namingFormat}\n- Asset subfolders: forbidden\n`),
      [`${root}/SINGLE_FLAT_ASSET_FOLDER_RULE.md`]: text(`# SINGLE FLAT ASSET FOLDER RULE\n\nEvery approved generated visual asset is stored directly inside ${project.flatAssetFolder.folderName}. No subfolders are allowed. Every category shares one permanent project-wide number sequence. Regeneration keeps the same number; new assets receive the next unused number. Filenames use ${project.flatAssetFolder.namingFormat}.\n`),
      [`${root}/story/story.json`]: text(project.story),
      [`${root}/script/sequence_script.json`]: text(project.sequences.map((sequence) => ({
        id: sequence.id, duration: sequence.duration, title: sequence.title, purpose: sequence.purpose,
        location: sequence.location, timeOfDay: sequence.timeOfDay,
        assets: sequence.assetFiles.map((fileName, index) => ({ assetNumber: sequence.assetNumbers[index], fileName })),
        openingState: sequence.openingState, closingState: sequence.closingState,
      }))),
      [`${root}/film_bible/film_bible.json`]: text(project.filmBible),
      [`${root}/world_bible/world_bible.json`]: text(project.worldBible),
      [`${root}/locations/location_manifest.json`]: text(project.locations),
      [`${root}/environments/environment_states.json`]: text(project.environments),
      [`${root}/reports/flat_asset_manifest.json`]: text(flatAssetManifest(project)),
      [`${root}/reports/reference_coverage.json`]: text(project.assets.map((asset) => ({
        assetNumber: asset.projectNumber,
        fileName: asset.generatedFileName,
        internalStableId: asset.id,
        permanentIdentity: asset.permanentIdentity,
        importance: asset.importance,
        requiredDepth: asset.referenceDepth,
        references: asset.referenceCount,
        coverage: asset.referenceCoverage,
      }))),
      [`${root}/sequences/sequence_plan.json`]: text(project.sequences),
      [`${root}/continuity/continuity_report.json`]: text(project.continuity),
      [`${root}/continuity/asset_state_events.json`]: text(project.stateEvents),
      [`${root}/knowledge_graph/project_knowledge_graph.json`]: text(project.knowledgeGraph),
      [`${root}/reports/chat_history.json`]: text(messages.results),
      [`${root}/reports/generation_history.json`]: text(jobs.results),
      [`${root}/production/production_system.json`]: text(project.production),
      [`${root}/production/dependency_impacts.json`]: text(project.production.dependencies),
      [`${root}/production/render_queue.json`]: text(project.production.renderQueue),
      [`${root}/production/cost_ledger.json`]: text(project.production.costLedger),
      [`${root}/production/model_capabilities.json`]: text(project.production.modelCapabilities),
      [`${root}/production/voice_identities.json`]: text(project.production.voiceIdentities),
      [`${root}/production/asset_lineage.json`]: text(project.production.assetLineage),
      [`${root}/production/validation_reports.json`]: text(project.production.validations),
      [`${root}/production/corrections.json`]: text(project.production.corrections),
      [`${root}/production/continuity_checkpoints.json`]: text(project.production.checkpoints),
      [`${root}/final_assembly/assembly_plan.json`]: text(project.production.finalAssembly),
      [`${root}/final_assembly/final_quality_report.json`]: text(project.production.finalQuality),
      [`${root}/recovery/recovery_manifest.json`]: text(recoverySnapshots.results.map(({ state_json: _state, ...snapshot }) => snapshot)),
      [`${root}/reports/production_record_index.json`]: text(productionRecords.results.map((record) => ({ ...record, content_json: JSON.parse(String(record.content_json)) }))),
      [`${root}/reports/reference_manifest.json`]: text(references.results.map(({ media_key: _mediaKey, ...reference }) => {
        const asset = reference.asset_id ? project.assets.find((item) => reference.asset_id === item.id || reference.asset_id?.endsWith(`:${item.id}`)) : undefined;
        return { ...reference, assetNumber: asset?.projectNumber, generatedFileName: asset?.generatedFileName };
      })),
      [`${root}/final_movie/.keep`]: text('Final assembled movies are stored here.'),
    };
    const flatAssets = await collectFlatGeneratedAssets(project, DB, FILES, `${root}/`);
    Object.assign(files, flatAssets.files);
    for (const sequence of project.sequences) {
      files[`${root}/prompts/${sequence.id}_PROMPT_V${String(sequence.version).padStart(2, '0')}.txt`] = text(sequence.prompt);
      files[`${root}/scene_states/${sequence.id}_SCENE_STATE.json`] = text(sequence.sceneState);
      files[`${root}/scene_graphs/${sequence.id}_SCENE_GRAPH.json`] = text(sequence.sceneGraph);
      files[`${root}/sequence_manifests/${sequence.id}_ASSET_MANIFEST.json`] = text({
        assets: sequence.assetFiles.map((fileName, index) => ({ assetNumber: sequence.assetNumbers[index], fileName })),
        internalCategoryMap: sequence.assetManifest,
      });
      files[`${root}/ending_states/${sequence.id}_ENDING_STATE.json`] = text(sequence.endingState);
      files[`${root}/look_ahead/${sequence.id}_LOOK_AHEAD.json`] = text(sequence.lookAhead);
      const productionPlan = project.production.sequencePlans[sequence.id];
      files[`${root}/timing/${sequence.id}_TIMING_V${String(productionPlan.revision).padStart(2, '0')}.json`] = text(productionPlan.timing);
      files[`${root}/shots/${sequence.id}_SHOTS_V${String(productionPlan.revision).padStart(2, '0')}.json`] = text(productionPlan.shots);
      files[`${root}/dialogue/${sequence.id}_DIALOGUE_V${String(productionPlan.revision).padStart(2, '0')}.json`] = text({ path: productionPlan.dialoguePath, audioInstruction: productionPlan.shotAudioInstruction, lines: productionPlan.dialogue });
      files[`${root}/reference_packages/${sequence.id}_REFERENCE_PACKAGE_V${String(productionPlan.revision).padStart(2, '0')}.json`] = text(productionPlan.referencePackage);
      files[`${root}/conflict_checks/${sequence.id}_CONFLICTS_V${String(productionPlan.revision).padStart(2, '0')}.json`] = text(productionPlan.conflicts);
      files[`${root}/sequence_versions/${sequence.id}_REVISION_HISTORY.json`] = text(productionPlan.revisions);
      files[`${root}/continuity/CONTINUITY_${sequence.id}.json`] = text({
        continuitySource: sequence.continuitySource,
        openingState: sequence.openingState,
        closingState: sequence.closingState,
        sceneState: sequence.sceneState,
        endingState: sequence.endingState,
        sceneGraph: sequence.sceneGraph,
        events: project.continuity.events.filter((event) => event.sequenceNumber === sequence.number),
      });
    }
    for (const location of project.locations) {
      files[`${root}/locations/${location.id}_V${String(location.version).padStart(2, '0')}.json`] = text(location);
    }
    for (const reference of references.results) {
      const object = await FILES.get(reference.media_key);
      if (object) {
        files[`${root}/source_references/${reference.id}_${safeName(reference.original_name)}`] = new Uint8Array(await object.arrayBuffer());
      }
    }
    for (const snapshot of recoverySnapshots.results) {
      files[`${root}/recovery/${snapshot.created_at.replace(/[:.]/g, '-')}_${snapshot.id}.json`] = text({
        id: snapshot.id,
        reason: snapshot.reason,
        createdAt: snapshot.created_at,
        state: JSON.parse(snapshot.state_json),
      });
    }
    const zipped = zipSync(files, { level: 6 });
    const createdAt = nowIso();
    const exportId = `export_${crypto.randomUUID()}`;
    const filename = `${root}_FULL_PROJECT.zip`;
    const mediaKey = `projects/${projectId}/exports/${exportId}-${filename}`;
    await FILES.put(mediaKey, zipped, { httpMetadata: { contentType: 'application/zip' } });
    project.exportStatus = 'Exported';
    project.updatedAt = createdAt;
    await DB.batch([
      DB.prepare('INSERT INTO export_jobs (id, project_id, status, media_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(exportId, projectId, 'Completed', mediaKey, createdAt, createdAt),
      DB.prepare('UPDATE projects SET export_status = ?, state_json = ?, updated_at = ? WHERE id = ?')
        .bind(project.exportStatus, JSON.stringify(project), createdAt, projectId),
    ]);
    return new Response(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The project package could not be created. Your project is unchanged.' }, { status: 500 });
  }
}
