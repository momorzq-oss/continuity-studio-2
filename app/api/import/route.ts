import { unzipSync } from 'fflate';

import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { refreshProductionSystem } from '@/lib/production-system';
import { createProjectFromIdea, normalizeProject, nowIso, type StudioMessage, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

function decode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function fingerprint(bytes: ArrayBuffer | Uint8Array) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return crypto.subtle.digest('SHA-256', copy.buffer).then((result) => [...new Uint8Array(result)].map((value) => value.toString(16).padStart(2, '0')).join(''));
}

function isAudioName(name: string) {
  return /\.(?:mp3|wav|aac|m4a|flac|ogg|opus)$/i.test(name);
}

function contentType(name: string) {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.mp4$/i.test(name)) return 'video/mp4';
  if (/\.mov$/i.test(name)) return 'video/quicktime';
  return 'application/octet-stream';
}

function inferredCategory(name: string) {
  const signal = name.toLowerCase();
  if (/character|person|hero|villain/.test(signal)) return 'Characters';
  if (/costume|wardrobe|outfit/.test(signal)) return 'Costumes';
  if (/creature|monster/.test(signal)) return 'Creatures';
  if (/animal|dog|cat|horse/.test(signal)) return 'Animals';
  if (/interior|room/.test(signal)) return 'Interiors';
  if (/location|exterior|building|street|desert|forest/.test(signal)) return 'Locations';
  if (/environment|weather|rain|fog|snow/.test(signal)) return 'Environment States';
  if (/vehicle|car|truck|boat|plane/.test(signal)) return 'Vehicles';
  if (/weapon|gun|sword|rifle/.test(signal)) return 'Weapons';
  if (/mechanical|machine|engine/.test(signal)) return 'Mechanical Systems';
  if (/damage|injury|broken/.test(signal)) return 'Damage Sheets';
  if (/transform/.test(signal)) return 'Transformation Sheets';
  return 'Props';
}

function initialMessage(project: StudioProject, sourceName: string, kind: string): StudioMessage {
  return {
    id: `message_${crypto.randomUUID()}`, role: 'assistant', createdAt: project.updatedAt,
    content: `Imported “${sourceName}” as a ${kind}. Permanent asset and sequence numbers, versions, approvals, continuity, provider packages, generation states, and chat history were preserved when present. No audio assets were created; dialogue and sound remain Seedance scenario instructions.`,
    metadata: { kind: 'import' },
  };
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'Choose a project archive, screenplay, story, sequence plan, or project JSON file.' }, { status: 400 });
    if (file.type.startsWith('audio/') || isAudioName(file.name)) return Response.json({ error: 'Audio files are not project inputs. Import the script or project archive; Seedance creates requested dialogue and sound inside video.' }, { status: 415 });
    if (file.size > 95 * 1024 * 1024) return Response.json({ error: 'That import is over the 95 MB project archive limit.' }, { status: 413 });
    const raw = new Uint8Array(await file.arrayBuffer());
    const archiveFingerprint = await fingerprint(raw);
    const { DB, FILES } = getRuntimeEnv();
    const priorImport = await DB.prepare('SELECT project_id FROM project_imports WHERE fingerprint_sha256 = ? LIMIT 1').bind(archiveFingerprint).first<{ project_id: string }>();
    if (priorImport) return Response.json({ error: `This exact import already exists as project ${priorImport.project_id}.`, duplicate: true, projectId: priorImport.project_id }, { status: 409 });

    let project: StudioProject;
    let messages: StudioMessage[] = [];
    let kind: StudioProject['production']['control']['importHistory'][number]['kind'] = 'story';
    let archiveFiles: Record<string, Uint8Array> = {};
    if (/\.zip$/i.test(file.name) || file.type === 'application/zip') {
      archiveFiles = unzipSync(raw);
      const projectEntry = Object.entries(archiveFiles).find(([name]) => /(?:^|\/)project\.json$/i.test(name));
      if (projectEntry) {
        project = normalizeProject(JSON.parse(decode(projectEntry[1])) as StudioProject);
        kind = 'archive';
        const chatEntry = Object.entries(archiveFiles).find(([name]) => /\/reports\/chat_history\.json$/i.test(name));
        if (chatEntry) {
          const rows = JSON.parse(decode(chatEntry[1])) as Array<{ id?: string; role: 'user' | 'assistant'; content: string; metadata_json?: string | null; metadata?: StudioMessage['metadata']; created_at?: string; createdAt?: string }>;
          messages = rows.map((row) => ({ id: `message_${crypto.randomUUID()}`, role: row.role, content: row.content, metadata: row.metadata ?? (row.metadata_json ? JSON.parse(row.metadata_json) : undefined), createdAt: row.createdAt ?? row.created_at ?? nowIso() }));
        }
      } else {
        const visualEntries = Object.entries(archiveFiles).filter(([name]) => /\.png$/i.test(name) && !isAudioName(name));
        if (!visualEntries.length) return Response.json({ error: 'This ZIP contains neither a Continuity Studio project.json nor a PNG visual asset folder. Generated production assets use NNN_NAME_GENERATED.png.' }, { status: 422 });
        project = createProjectFromIdea(`Imported visual production asset folder: ${visualEntries.map(([name]) => name.split('/').at(-1)).join(', ')}`);
        kind = 'asset-folder';
        const template = project.assets[0];
        let fallbackNumber = Math.max(0, ...project.assets.map((asset) => asset.projectNumber)) + 1;
        for (const [path] of visualEntries.sort(([a], [b]) => a.localeCompare(b))) {
          const baseName = path.split('/').at(-1)!;
          const match = baseName.match(/^(\d{3})_(.+?)(?:_GENERATED)?\.(?:png|jpe?g|webp)$/i);
          const projectNumber = match ? Number(match[1]) : fallbackNumber++;
          const name = (match?.[2] ?? baseName.replace(/\.[^.]+$/, '')).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
          const existing = project.assets.find((asset) => asset.projectNumber === projectNumber);
          if (existing) {
            existing.name = name;
            existing.category = inferredCategory(name);
            existing.description = `Imported visual production asset from ${baseName}.`;
            existing.approvalState = 'Locked';
            existing.lockState = 'Locked';
          } else {
            project.assets.push({ ...structuredClone(template), id: `IMPORTED_ASSET_${String(projectNumber).padStart(3, '0')}`, projectNumber, name, category: inferredCategory(name), description: `Imported visual production asset from ${baseName}.`, storyPurpose: 'Imported production reference.', approvalState: 'Locked', lockState: 'Locked', permanentIdentity: `IMPORTED_ASSET_${String(projectNumber).padStart(3, '0')}`, sequences: Array.from({ length: project.sequenceCount }, (_, index) => index + 1) });
          }
        }
        project = normalizeProject(project);
      }
    } else {
      const source = decode(raw);
      let parsed: unknown = null;
      try { parsed = JSON.parse(source); } catch { /* Screenplays and stories are intentionally plain text. */ }
      if (parsed && typeof parsed === 'object' && 'story' in parsed && 'assets' in parsed && 'sequences' in parsed) {
        project = normalizeProject(parsed as StudioProject);
        kind = 'previous-project';
      } else {
        const ext = file.name.split('.').at(-1)?.toLowerCase();
        const sequenceInput = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' && 'sequences' in parsed && Array.isArray(parsed.sequences) ? parsed.sequences : null;
        const assetInput = parsed && typeof parsed === 'object' && 'assets' in parsed && Array.isArray(parsed.assets) ? parsed.assets : null;
        if (assetInput?.length) {
          kind = 'asset-folder';
          project = createProjectFromIdea(`Imported production asset sheets from ${file.name}. ${source.slice(0, 20_000)}`);
          const template = project.assets[0];
          for (const [index, value] of assetInput.entries()) {
            const incoming = value as Partial<StudioProject['assets'][number]>;
            const projectNumber = Number(incoming.projectNumber) || project.flatAssetFolder.nextUnusedNumber + index;
            const existing = project.assets.find((asset) => asset.projectNumber === projectNumber || asset.id === incoming.id);
            if (existing) Object.assign(existing, incoming, { projectNumber });
            else project.assets.push({ ...structuredClone(template), ...incoming, id: incoming.id ?? `IMPORTED_ASSET_${String(projectNumber).padStart(3, '0')}`, projectNumber, name: incoming.name ?? `Imported Asset ${projectNumber}`, permanentIdentity: incoming.permanentIdentity ?? incoming.id ?? `IMPORTED_ASSET_${String(projectNumber).padStart(3, '0')}` });
          }
          project = normalizeProject(project);
        } else if (sequenceInput?.length) {
          kind = 'sequence-plan';
          project = createProjectFromIdea(`A ${Math.max(0.5, sequenceInput.length / 2)} minute imported movie sequence plan from ${file.name}. ${source.slice(0, 20_000)}`);
          project.sequenceCount = sequenceInput.length;
          project.durationSeconds = sequenceInput.reduce((sum, value) => sum + (Number((value as { duration?: number }).duration) || 30), 0);
          project.sequences = project.sequences.slice(0, sequenceInput.length).map((sequence, index) => {
            const incoming = sequenceInput[index] as Partial<StudioProject['sequences'][number]>;
            return { ...sequence, number: index + 1, id: `SEQUENCE_${String(index + 1).padStart(3, '0')}`, duration: Number(incoming.duration) || sequence.duration, title: incoming.title || sequence.title, purpose: incoming.purpose || sequence.purpose, location: incoming.location || sequence.location, timeOfDay: incoming.timeOfDay || sequence.timeOfDay, openingState: incoming.openingState || sequence.openingState, closingState: incoming.closingState || sequence.closingState, version: incoming.version || 1, status: incoming.status || 'Planned' };
          });
          project.production = refreshProductionSystem(project).production;
        } else {
          kind = ext === 'fdx' || ext === 'fountain' ? 'screenplay' : /sequence/i.test(file.name) ? 'sequence-plan' : 'story';
          project = createProjectFromIdea(source.slice(0, 60_000));
        }
      }
    }

    const originalId = project.id;
    const attachmentIdMap = new Map(project.attachments.map((attachment) => [attachment.id, `reference_${crypto.randomUUID()}`]));
    const persistentIdMap = new Map<string, string>(attachmentIdMap);
    for (const job of project.production.renderQueue) persistentIdMap.set(job.id, `render_${crypto.randomUUID()}`);
    for (const event of project.continuity.events) persistentIdMap.set(event.id, `continuity_${crypto.randomUUID()}`);
    for (const event of project.stateEvents) persistentIdMap.set(event.id, `state_${crypto.randomUUID()}`);
    if (persistentIdMap.size) {
      let serialized = JSON.stringify(project);
      for (const [oldId, newId] of persistentIdMap) serialized = serialized.replaceAll(oldId, newId);
      project = normalizeProject(JSON.parse(serialized) as StudioProject);
      messages = messages.map((message) => message.metadata?.attachmentId && attachmentIdMap.has(message.metadata.attachmentId)
        ? { ...message, metadata: { ...message.metadata, attachmentId: attachmentIdMap.get(message.metadata.attachmentId) } }
        : message);
    }
    project.id = `project_${crypto.randomUUID()}`;
    project.title = `${project.title} — Imported`;
    project.createdAt = nowIso();
    project.updatedAt = project.createdAt;
    project.storageRevision = 1;
    project.archived = false;
    project.production.control.importHistory.push({ id: `import_${crypto.randomUUID()}`, kind, sourceName: file.name, importedAt: project.createdAt, summary: `Imported from ${originalId}; stable production identifiers retained inside new project ${project.id}.` });
    const assistant = initialMessage(project, file.name, kind);
    messages.push(assistant);

    const transactionId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [
      DB.prepare(`INSERT INTO projects (
        id, title, duration_seconds, sequence_duration_seconds, sequence_count, genre, story_status, film_bible_status,
        asset_status, sequence_status, continuity_status, export_status, pinned, archived, state_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        project.id, project.title, project.durationSeconds, project.sequenceDurationSeconds, project.sequenceCount, project.genre,
        project.story.status, project.filmBible.status, project.assets.every((asset) => ['Approved', 'Locked'].includes(asset.approvalState)) ? 'Approved' : 'Pending',
        project.sequences.every((sequence) => sequence.status === 'Approved') ? 'Approved' : 'In progress', project.continuity.status,
        project.exportStatus, project.pinned ? 1 : 0, 0, JSON.stringify(project), project.createdAt, project.updatedAt,
      ),
      DB.prepare('INSERT INTO project_transactions (project_id, revision, last_transaction_id, updated_at) VALUES (?, ?, ?, ?)').bind(project.id, 1, transactionId, project.updatedAt),
      DB.prepare('INSERT INTO project_imports (id, project_id, import_kind, source_name, fingerprint_sha256, manifest_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(project.production.control.importHistory.at(-1)!.id, project.id, kind, file.name, archiveFingerprint, JSON.stringify({ originalId, entries: Object.keys(archiveFiles).filter((name) => !isAudioName(name)) }), project.updatedAt),
      DB.prepare('INSERT INTO story_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), project.id, project.story.version, JSON.stringify(project.story), project.story.status, project.updatedAt),
      DB.prepare('INSERT INTO film_bible_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), project.id, project.filmBible.version, JSON.stringify(project.filmBible), project.filmBible.status, project.updatedAt),
      DB.prepare('INSERT INTO world_bible_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), project.id, project.worldBible.version, JSON.stringify(project.worldBible), project.worldBible.status, project.updatedAt),
      ...messages.map((message) => DB.prepare('INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(message.id, project.id, message.role, message.content, message.metadata ? JSON.stringify(message.metadata) : null, message.createdAt)),
    ];

    for (const reservation of project.production.control.reservedNumbers) {
      statements.push(DB.prepare('INSERT INTO reserved_numbers (id, project_id, kind, number, stable_id, status, reserved_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(`${project.id}:${reservation.kind}:${reservation.number}`, project.id, reservation.kind, reservation.number, reservation.stableId, reservation.status, reservation.reservedAt));
    }
    for (const asset of project.assets) {
      const rowId = `${project.id}:${asset.id}`;
      let mediaKey: string | null = null;
      const generated = Object.entries(archiveFiles).find(([name]) => name.endsWith(`/${asset.generatedFileName}`));
      if (generated && !isAudioName(generated[0])) {
        mediaKey = `projects/${project.id}/generated_assets/${asset.generatedFileName}`;
        await FILES.put(mediaKey, generated[1], { httpMetadata: { contentType: contentType(generated[0]) }, customMetadata: { projectId: project.id, assetId: asset.id, restoredFrom: file.name } });
      }
      statements.push(
        DB.prepare(`INSERT INTO assets (id, project_id, stable_id, name, category, description, sequences_json, approval_state, lock_state, current_version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(rowId, project.id, asset.id, asset.name, asset.category, asset.description, JSON.stringify(asset.sequences), asset.approvalState, asset.lockState, asset.version, project.createdAt, project.updatedAt),
        DB.prepare('INSERT INTO asset_versions (id, asset_id, version, description, media_key, approval_state, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), rowId, asset.version, asset.description, mediaKey, asset.approvalState, asset.notes, project.updatedAt),
      );
    }
    for (const sequence of project.sequences) {
      const rowId = `${project.id}:${sequence.id}`;
      statements.push(
        DB.prepare(`INSERT INTO sequences (id, project_id, stable_id, sequence_number, duration_seconds, title, purpose, opening_state, closing_state, continuity_source, status, current_version, prompt_text, asset_ids_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(rowId, project.id, sequence.id, sequence.number, sequence.duration, sequence.title, sequence.purpose, sequence.openingState, sequence.closingState, sequence.continuitySource, sequence.status, sequence.version, sequence.prompt, JSON.stringify(sequence.assetIds), project.createdAt, project.updatedAt),
        DB.prepare('INSERT INTO sequence_versions (id, sequence_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), rowId, sequence.version, JSON.stringify(sequence), sequence.status, project.updatedAt),
      );
      for (const assetId of sequence.assetIds) statements.push(DB.prepare('INSERT INTO sequence_assets (sequence_id, asset_id) VALUES (?, ?)').bind(rowId, `${project.id}:${assetId}`));
    }
    for (const job of project.production.renderQueue) {
      statements.push(DB.prepare(`INSERT INTO generation_jobs
        (id, project_id, target_id, provider, model, prompt_version, reference_files_json, status, failure_message, retry_history_json, started_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(job.id, project.id, job.targetId, job.provider, job.model,
          project.production.sequencePlans[job.targetId]?.revision ?? 1, JSON.stringify(project.production.sequencePlans[job.targetId]?.referencePackage ?? {}),
          job.status, job.failureMessage, JSON.stringify(job.retryHistory), job.createdAt, job.updatedAt));
      if (job.resultMediaKey) statements.push(DB.prepare('INSERT INTO generation_results (id, job_id, media_key, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(`${job.id}:result`, job.id, job.resultMediaKey, JSON.stringify(project.production.control.resultProvenance.find((item) => item.generationSnapshotId === job.generationSnapshotId) ?? {}), job.updatedAt));
    }
    for (const source of project.production.control.finalSourceMap) {
      const provenance = project.production.control.resultProvenance.find((item) => item.id === source.provenanceId);
      statements.push(DB.prepare('INSERT INTO final_sequence_sources (id, project_id, sequence_number, result_media_key, provenance_json, approved_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(`${project.id}:source:${source.sequenceNumber}`, project.id, source.sequenceNumber, source.resultMediaKey, JSON.stringify(provenance ?? source), source.approvedAt));
    }
    for (const [name, bytes] of Object.entries(archiveFiles).filter(([name]) => /\/recovery\/.+\.json$/i.test(name) && !/recovery_manifest/i.test(name))) {
      try {
        const recovery = JSON.parse(decode(bytes)) as { reason?: string; createdAt?: string; state?: unknown };
        if (!recovery.state) continue;
        let state = JSON.stringify(recovery.state).replaceAll(originalId, project.id);
        for (const [oldId, newId] of persistentIdMap) state = state.replaceAll(oldId, newId);
        statements.push(DB.prepare('INSERT INTO project_recovery_snapshots (id, project_id, reason, state_json, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(`recovery_${crypto.randomUUID()}`, project.id, recovery.reason ?? `Restored from ${name}`, state, recovery.createdAt ?? project.updatedAt));
      } catch { /* A malformed optional recovery entry never invalidates the primary project restore. */ }
    }
    for (const attachment of project.attachments) {
      const archivedAttachmentId = [...attachmentIdMap.entries()].find(([, newId]) => newId === attachment.id)?.[0] ?? attachment.id;
      const source = Object.entries(archiveFiles).find(([name]) => name.includes('/source_references/') && name.split('/').at(-1)?.startsWith(`${archivedAttachmentId}_`));
      if (!source || isAudioName(source[0]) || attachment.contentType.startsWith('audio/')) continue;
      const mediaKey = `projects/${project.id}/references/${attachment.id}-${source[0].split('/').at(-1)}`;
      await FILES.put(mediaKey, source[1], { httpMetadata: { contentType: attachment.contentType }, customMetadata: { projectId: project.id, originalName: attachment.name, restoredFrom: file.name } });
      const digest = attachment.fingerprintSha256 ?? await fingerprint(source[1]);
      statements.push(
        DB.prepare('INSERT INTO asset_references (id, project_id, asset_id, original_name, media_key, content_type, byte_size, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(attachment.id, project.id, attachment.linkedAssetId ? `${project.id}:${attachment.linkedAssetId}` : null, attachment.name, mediaKey, attachment.contentType, source[1].byteLength, attachment.role, attachment.createdAt),
        DB.prepare('INSERT INTO file_integrity (reference_id, project_id, fingerprint_sha256, preview_media_key, preview_kind, integrity_status, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(attachment.id, project.id, digest, mediaKey, attachment.previewKind ?? 'none', 'Original', project.updatedAt),
      );
    }
    await DB.batch(statements);
    return Response.json({ project, messages, imported: true, kind });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The import could not be completed. No partial project record was created.' }, { status: 500 });
  }
}
