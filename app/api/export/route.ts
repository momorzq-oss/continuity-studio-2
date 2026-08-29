import { strToU8, zipSync } from 'fflate';

import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
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
      'SELECT id, original_name, media_key, content_type, byte_size, role, created_at FROM asset_references WHERE project_id = ? ORDER BY created_at ASC',
    ).bind(projectId).all<{ id: string; original_name: string; media_key: string; content_type: string; byte_size: number; role: string; created_at: string }>();
    const jobs = await DB.prepare(
      'SELECT id, target_id, provider, model, prompt_version, status, failure_message, started_at, updated_at FROM generation_jobs WHERE project_id = ? ORDER BY started_at ASC',
    ).bind(projectId).all();
    const root = safeName(project.title);
    const files: Record<string, Uint8Array> = {
      [`${root}/project.json`]: text(project),
      [`${root}/PROJECT_SUMMARY.md`]: text(`# ${project.title}\n\n${project.story.logline}\n\n- Duration: ${project.durationSeconds / 60} minutes\n- Sequences: ${project.sequenceCount}\n- Genre: ${project.genre} / ${project.subgenre}\n- Story: ${project.story.status}\n- World Bible: ${project.worldBible.status}\n- Film Bible: ${project.filmBible.status}\n- Structured locations: ${project.locations.length}\n- Environment states: ${project.environments.length}\n- Knowledge relationships: ${project.knowledgeGraph.edges.length}\n- Asset state events: ${project.stateEvents.length}\n- Continuity: ${project.continuity.status}\n`),
      [`${root}/story/story.json`]: text(project.story),
      [`${root}/script/sequence_script.json`]: text(project.sequences.map((sequence) => ({
        id: sequence.id, duration: sequence.duration, title: sequence.title, purpose: sequence.purpose,
        location: sequence.location, timeOfDay: sequence.timeOfDay, assets: sequence.assetIds,
        openingState: sequence.openingState, closingState: sequence.closingState,
      }))),
      [`${root}/film_bible/film_bible.json`]: text(project.filmBible),
      [`${root}/world_bible/world_bible.json`]: text(project.worldBible),
      [`${root}/locations/location_manifest.json`]: text(project.locations),
      [`${root}/environments/environment_states.json`]: text(project.environments),
      [`${root}/assets/asset_manifest.json`]: text(project.assets),
      [`${root}/assets/reference_coverage.json`]: text(project.assets.map((asset) => ({
        assetId: asset.id,
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
      [`${root}/reports/reference_manifest.json`]: text(references.results.map(({ media_key: _mediaKey, ...reference }) => reference)),
      [`${root}/generated_images/.keep`]: text('Generated image outputs are stored here when an image provider is connected.'),
      [`${root}/generated_videos/.keep`]: text('Generated video outputs are stored here when a video provider is connected.'),
      [`${root}/final_movie/.keep`]: text('Final assembled movies are stored here.'),
    };
    for (const sequence of project.sequences) {
      files[`${root}/prompts/${sequence.id}_PROMPT_V${String(sequence.version).padStart(2, '0')}.txt`] = text(sequence.prompt);
      files[`${root}/scene_states/${sequence.id}_SCENE_STATE.json`] = text(sequence.sceneState);
      files[`${root}/scene_graphs/${sequence.id}_SCENE_GRAPH.json`] = text(sequence.sceneGraph);
      files[`${root}/sequence_manifests/${sequence.id}_ASSET_MANIFEST.json`] = text(sequence.assetManifest);
      files[`${root}/ending_states/${sequence.id}_ENDING_STATE.json`] = text(sequence.endingState);
      files[`${root}/look_ahead/${sequence.id}_LOOK_AHEAD.json`] = text(sequence.lookAhead);
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
        files[`${root}/reference_images/${reference.id}_${safeName(reference.original_name)}`] = new Uint8Array(await object.arrayBuffer());
      }
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
