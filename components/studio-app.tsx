'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  FileText,
  FileArchive,
  FileImage,
  Film,
  FolderClock,
  Image as ImageIcon,
  Library,
  LoaderCircle,
  Lock,
  Menu,
  Moon,
  Network,
  Paperclip,
  Pencil,
  Pin,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { getProductionDocument, type ProductionDocumentKind } from '@/lib/chat-documents';
import { compactProjectForBrain, parseStudioBrainResult, type StudioBrainResult } from '@/lib/studio-brain';
import { cn } from '@/lib/utils';
import type { ProjectSummary, StudioAsset, StudioMessage, StudioProject, StudioSequence } from '@/lib/studio';

type View = 'chat' | 'projects' | 'workspace' | 'assets' | 'engine' | 'exports' | 'advanced' | 'settings';

const primaryNavigation = [
  { id: 'projects' as const, label: 'Projects', icon: FolderClock },
  { id: 'workspace' as const, label: 'Movie Workspace', icon: Clapperboard },
  { id: 'assets' as const, label: 'Asset Library', icon: Library },
  { id: 'engine' as const, label: 'Local AI Engine', icon: Network },
  { id: 'exports' as const, label: 'Exports', icon: Archive },
];

const assetFilters = ['All', 'Characters', 'Creatures', 'Animals', 'Locations', 'Interiors', 'Environment States', 'Vehicles', 'Props', 'Weapons', 'Costumes', 'Furniture', 'Mechanical Systems', 'Approved', 'Pending', 'Needs Review', 'Retired', 'Orphaned'];

type RuntimeCapabilities = {
  imageGeneration: boolean;
  codexBrain: 'checking' | 'connected' | 'fallback';
  localRuntime: 'checking' | 'ready' | 'blocked' | 'offline';
};

type LocalRuntimeStatus = {
  available: boolean;
  version: string;
  configuration: { runtimeRoot: string; comfyRoot: string; comfyBaseUrl: string };
  system: {
    platform: string;
    architecture: string;
    ram: { totalBytes: number; freeBytes: number };
    gpu: { available: boolean; devices: Array<{ name: string; memoryTotalMb?: number }> };
    python: { available: boolean; version?: string; output?: string };
    ffmpeg: { available: boolean; version?: string; output?: string };
    preset?: { name?: string; id?: string; notes?: string };
  };
  engine: { connected: boolean; managedByStudio: boolean; latencyMs?: number; error?: string | null };
  components: Array<{ id: string; name: string; kind?: string; status: string; installed: boolean; required?: boolean; license?: string; pinnedCommit?: string; error?: string | null }>;
  models: Array<{ id: string; name: string; status: string; installed: boolean; required?: boolean; path: string; license?: string }>;
  workflows: Array<{ id: string; name: string; compatible?: boolean; storyboardCompatible?: boolean; h3Compatible?: boolean; sourcePath?: string | null; findings?: Array<{ severity: string; message: string }> }>;
  operations: Array<{ id: string; kind: string; target: string; status: string; progress: number; message: string }>;
  jobs: Array<{ id: string; studioJobId?: string | null; candidateId?: string | null; projectId: string; sequenceId: string; target: 'storyboard' | 'h3-chain'; sequenceNumber: number; status: string; progress: number; provider: string; model: string; resolution?: string; durationSeconds?: number; seed?: number; steps?: number; elapsedSeconds: number; output?: Array<{ filename?: string; subfolder?: string; type?: string }>; failure?: string | null; retryCount: number; checkpoint?: unknown; provenance?: Record<string, unknown> }>;
};

function canReachLocalCodexHost() {
  return window.location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

async function askCodexBrain(project: StudioProject | null, message: string): Promise<StudioBrainResult | null> {
  if (!canReachLocalCodexHost()) return null;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 245_000);
  try {
    const response = await fetch('http://127.0.0.1:4317/v1/reason', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: project ? 'command' : 'project-blueprint',
        message,
        project: project ? compactProjectForBrain(project) : undefined,
      }),
      signal: controller.signal,
    });
    const data = await response.json() as { result?: unknown };
    return response.ok ? parseStudioBrainResult(data.result) : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  if (delta < 60_000) return 'Just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function assetNumber(value: number) {
  return String(value).padStart(3, '0');
}

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: filename.endsWith('.txt') ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const documentLabels: Record<ProductionDocumentKind, string> = {
  story: 'Story',
  script: 'Script',
  scenario: 'Scenario',
  'world-bible': 'World Bible',
  'film-bible': 'Film Bible',
  sequence: 'Sequence Plan',
  'seedance-prompt': 'Seedance Prompt',
  'h3-prompt': 'MiniMax H3 Prompt',
};

function regenerateInstruction(kind: ProductionDocumentKind, sequenceNumber?: number) {
  if (kind === 'story') return 'Regenerate the story';
  if (kind === 'world-bible') return 'Regenerate the World Bible';
  if (kind === 'film-bible') return 'Regenerate the Film Bible';
  const sequence = `Sequence ${sequenceNumber ?? 1}`;
  if (kind === 'script') return `Regenerate the script for ${sequence}`;
  if (kind === 'scenario') return `Regenerate the scenario for ${sequence}`;
  if (kind === 'seedance-prompt') return `Regenerate the Seedance prompt for ${sequence}`;
  if (kind === 'h3-prompt') return `Regenerate the MiniMax H3 prompt for ${sequence}`;
  return `Regenerate ${sequence}`;
}

function ProductionDocumentCard({ project, kind, sequenceNumber, onAction, onEdit }: { project: StudioProject; kind: ProductionDocumentKind; sequenceNumber?: number; onAction: (message: string) => void; onEdit: (kind: ProductionDocumentKind, sequenceNumber?: number) => void }) {
  const [copied, setCopied] = useState(false);
  const document = getProductionDocument(project, kind, sequenceNumber);
  if (!document) return null;
  const copy = async () => {
    await navigator.clipboard.writeText(document.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/65">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2.5"><FileText className="size-4 text-amber-300" /><span className="text-sm font-medium">{document.title}</span></div>
        <Badge variant="outline" className={statusClass(document.status)}>{document.status}</Badge>
      </div>
      <details className="group" open={kind === 'story'}>
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-muted-foreground transition hover:text-foreground">Read the complete {documentLabels[kind].toLowerCase()} <ChevronDown className="ml-1 inline size-3.5 transition group-open:rotate-180" /></summary>
        <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap border-t border-border/60 bg-background/35 px-4 py-4 font-sans text-xs leading-6 text-foreground/85">{document.content}</pre>
      </details>
      <div className="flex flex-wrap gap-2 border-t border-border/70 bg-background/35 px-4 py-3">
        <Button size="sm" variant="outline" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : `Copy ${documentLabels[kind]}`}</Button>
        <Button size="sm" variant="outline" onClick={() => downloadText(document.filename, document.content)}><Download />Download</Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(kind, sequenceNumber)}><Pencil />Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction(regenerateInstruction(kind, sequenceNumber))}><RefreshCw />Regenerate</Button>
      </div>
    </section>
  );
}

function ApprovalModeCard({ project, onAction }: { project: StudioProject; onAction: (message: string) => void }) {
  if (project.settings.pipelineApprovalGranted) {
    const label = project.settings.approvalMode === 'automatic' ? 'Automatic Production' : project.settings.approvalMode === 'master' ? 'Master Approval' : 'Manual Approval';
    return <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4"><div className="flex items-center gap-2 text-sm font-medium text-emerald-100"><ShieldCheck className="size-4" />{label} is active</div><p className="mt-2 text-xs leading-5 text-muted-foreground">This approval covers non-paid planning only. Images and video still require a clear generation request.</p></div>;
  }
  return (
    <section className="mt-4 rounded-2xl border border-amber-300/20 bg-card/65 p-4">
      <p className="text-sm font-medium">How should I ask for approval?</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose once for this movie. None of these choices authorizes image or video generation.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => onAction('Automatic Production')} className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-3 text-left transition hover:bg-amber-300/12"><span className="text-xs font-medium text-amber-100">Automatic Production</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">Recommended. Continue through safe planning and pause for references or generation.</span></button>
        <button type="button" onClick={() => onAction('Master Approval')} className="rounded-xl border border-border bg-background/45 p-3 text-left transition hover:bg-background/70"><span className="text-xs font-medium">Master Approval</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">Approve the complete non-paid production plan once.</span></button>
        <button type="button" onClick={() => onAction('Manual Approval')} className="rounded-xl border border-border bg-background/45 p-3 text-left transition hover:bg-background/70"><span className="text-xs font-medium">Manual Approval</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">Review and approve every stage yourself.</span></button>
      </div>
    </section>
  );
}

function assetTone(category: string) {
  const tones: Record<string, string> = {
    Characters: 'from-amber-400/22 to-orange-950/10 text-amber-200',
    Creatures: 'from-violet-400/20 to-fuchsia-950/10 text-violet-200',
    Animals: 'from-emerald-400/18 to-emerald-950/10 text-emerald-200',
    Locations: 'from-sky-400/18 to-sky-950/10 text-sky-200',
    Interiors: 'from-cyan-400/18 to-cyan-950/10 text-cyan-200',
    Vehicles: 'from-blue-400/18 to-blue-950/10 text-blue-200',
    Props: 'from-rose-400/16 to-rose-950/10 text-rose-200',
    Weapons: 'from-red-400/18 to-red-950/10 text-red-200',
    Costumes: 'from-fuchsia-400/16 to-fuchsia-950/10 text-fuchsia-200',
  };
  return tones[category] ?? 'from-zinc-400/16 to-zinc-950/10 text-zinc-200';
}

function statusClass(status: string) {
  if (/approved|locked|passed|exported/i.test(status)) return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
  if (/review|failed|blocked/i.test(status)) return 'border-rose-400/20 bg-rose-400/10 text-rose-200';
  if (/ready|generated/i.test(status)) return 'border-sky-400/20 bg-sky-400/10 text-sky-200';
  return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
}

function EmptyProjectMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('icon-stage grid place-items-center rounded-2xl border', compact ? 'size-11' : 'size-14')}>
      <Film className={compact ? 'size-5' : 'size-6'} strokeWidth={1.45} />
    </div>
  );
}

function ProjectStatus({ project }: { project: StudioProject }) {
  const [open, setOpen] = useState(false);
  const approvedAssets = project.assets.filter((asset) => ['Approved', 'Locked'].includes(asset.approvalState)).length;
  const approvedSequences = project.sequences.filter((sequence) => sequence.status === 'Approved').length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex max-w-[min(72vw,620px)] items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-left text-xs transition hover:bg-card"
        aria-expanded={open}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-[var(--ready)] shadow-[0_0_10px_var(--ready)]" />
        <span className="truncate font-medium">{project.title}</span>
        <span className="hidden text-muted-foreground sm:inline">· {project.production.readiness}</span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-40 w-[min(86vw,430px)] rounded-2xl border border-border bg-popover p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{project.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{durationLabel(project.durationSeconds)} · {project.sequenceCount} sequences · {project.genre}</p>
            </div>
            <Badge variant="outline" className={statusClass(project.continuity.status)}>{project.continuity.status}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
            <StatusLine label="Story" value={project.story.status} />
            <StatusLine label="World Bible" value={project.worldBible.status} />
            <StatusLine label="Film Bible" value={project.filmBible.status} />
            <StatusLine label="Assets" value={`${approvedAssets}/${project.assets.length}`} />
            <StatusLine label="Asset folder" value={project.flatAssetFolder.folderName} />
            <StatusLine label="Sequences" value={`${approvedSequences}/${project.sequenceCount}`} />
            <StatusLine label="Approval" value={project.settings.approvalMode === 'automatic' ? 'Automatic' : project.settings.approvalMode === 'master' ? 'Master' : 'Manual'} />
            <StatusLine label="Export" value={project.exportStatus} />
          </div>
          <div className="mt-4 rounded-xl bg-background/55 p-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Next:</span> {project.production.nextLogicalAction}</div>
        </div>
      )}
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function StoryCard({ project, onAction, onEdit }: { project: StudioProject; onAction: (message: string) => void; onEdit: (kind: ProductionDocumentKind, sequenceNumber?: number) => void }) {
  return <><ProductionDocumentCard project={project} kind="story" onAction={onAction} onEdit={onEdit} /><ApprovalModeCard project={project} onAction={onAction} /></>;
}

function BibleCard({ project, onAction, onEdit }: { project: StudioProject; onAction: (message: string) => void; onEdit: (kind: ProductionDocumentKind, sequenceNumber?: number) => void }) {
  return <ProductionDocumentCard project={project} kind="film-bible" onAction={onAction} onEdit={onEdit} />;
}

function WorldCard({ project, onAction, onEdit }: { project: StudioProject; onAction: (message: string) => void; onEdit: (kind: ProductionDocumentKind, sequenceNumber?: number) => void }) {
  return <ProductionDocumentCard project={project} kind="world-bible" onAction={onAction} onEdit={onEdit} />;
}

function RuleGroup({ title, rules }: { title: string; rules: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-2 text-xs leading-5 text-foreground/80">
        {rules.slice(0, 3).map((rule) => <li key={rule} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-amber-300/80" />{rule}</li>)}
      </ul>
    </div>
  );
}

function AssetMiniCard({ asset, onAction }: { asset: StudioAsset; onAction: (message: string) => void }) {
  const coverage = Math.round(Object.values(asset.referenceCoverage).reduce((total, value) => total + value, 0) / Object.keys(asset.referenceCoverage).length);
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-background/55">
      <div className={cn('flex h-20 items-end justify-between bg-gradient-to-br p-3', assetTone(asset.category))}>
        <div className="flex size-8 items-center justify-center rounded-lg border border-current/15 bg-black/15"><ImageIcon className="size-4" /></div>
        <span className="font-mono text-xl font-semibold tracking-[-0.04em]">{assetNumber(asset.projectNumber)}</span>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><p className="truncate text-xs font-medium">Asset {assetNumber(asset.projectNumber)} · {asset.name}</p><p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">{asset.generatedFileName}</p><p className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">V{String(asset.version).padStart(2, '0')} · {asset.id}</p></div>
          {asset.lockState === 'Locked' && <Lock className="size-3.5 shrink-0 text-emerald-300" />}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5"><Badge variant="outline" className={cn('h-4 px-1.5 text-[9px]', statusClass(asset.lifecycleStatus === 'Retired' ? 'Needs Review' : asset.approvalState))}>{asset.lifecycleStatus === 'Retired' ? 'Retired' : asset.approvalState}</Badge><Badge variant="outline" className="h-4 px-1.5 text-[9px]">{asset.importance}</Badge></div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground"><span>Reference coverage</span><span className="tabular-nums">{coverage}%</span></div>
        <Progress value={coverage} className="mt-1 h-1" />
        <div className="mt-3 flex gap-1.5">
          {asset.lifecycleStatus !== 'Retired' && asset.lockState !== 'Locked' && <Button size="xs" onClick={() => onAction(`Approve ${asset.id}`)}>Approve</Button>}
          {asset.lifecycleStatus !== 'Retired' && <Button size="xs" variant="ghost" onClick={() => onAction(`Regenerate ${asset.id}`)}><RefreshCw />Version</Button>}
        </div>
      </div>
    </article>
  );
}

function AssetsCard({ project, ids, onAction, onOpenLibrary }: { project: StudioProject; ids?: string[]; onAction: (message: string) => void; onOpenLibrary: () => void }) {
  const selected = (ids?.length ? project.assets.filter((asset) => ids.includes(asset.id)) : project.assets).slice().sort((a, b) => a.projectNumber - b.projectNumber);
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-medium">One flat numbered asset manifest</p><p className="mt-1 text-xs text-muted-foreground">{project.assets.length} permanent numbers · {project.flatAssetFolder.folderName} · no subfolders</p></div>
        <Button size="sm" variant="outline" onClick={onOpenLibrary}>View library</Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {selected.slice(0, 6).map((asset) => <AssetMiniCard key={asset.id} asset={asset} onAction={onAction} />)}
      </div>
      {project.assets.some((asset) => asset.lockState !== 'Locked') && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/70 pt-3">
          <Button size="sm" onClick={() => onAction('Approve all assets')}><Lock />Approve all</Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('Use my photo as the main character')}>Use my photo</Button>
        </div>
      )}
    </section>
  );
}

function SequenceCard({ project, sequence, onAction, onEdit }: { project: StudioProject; sequence: StudioSequence; onAction: (message: string) => void; onEdit: (kind: ProductionDocumentKind, sequenceNumber?: number) => void }) {
  const sequenceDocument = getProductionDocument(project, 'sequence', sequence.number);
  const promptDocument = getProductionDocument(project, 'seedance-prompt', sequence.number);
  const h3PromptDocument = getProductionDocument(project, 'h3-prompt', sequence.number);
  const plan = project.production.sequencePlans[sequence.id];
  const job = project.production.renderQueue.findLast((item) => item.sequenceNumber === sequence.number);
  const timingAudit = project.production.control.dialogueTimingAudits[sequence.id];
  const bindingFindings = project.production.control.referenceBindingFindings.filter((item) => item.sequenceNumber === sequence.number);
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/65">
      <div className="flex items-start justify-between gap-4 border-b border-border/70 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-amber-300/20 bg-amber-300/10 font-mono text-xs text-amber-200">{String(sequence.number).padStart(2, '0')}</span>
          <div className="min-w-0"><p className="truncate text-sm font-medium">{sequence.title}</p><p className="mt-1 text-xs text-muted-foreground">{sequence.duration}s · {sequence.location}</p></div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5"><Badge variant="outline">V{String(plan.revision).padStart(2, '0')}</Badge><Badge variant="outline" className={statusClass(plan.freshness)}>{plan.freshness}</Badge><Badge variant="outline" className={statusClass(sequence.status)}>{sequence.status}</Badge></div>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm leading-6 text-foreground/85">{sequence.purpose}</p>
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <StateBlock label="Opening state" value={sequence.openingState} />
          <StateBlock label="Closing state" value={sequence.closingState} />
        </div>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Exact numbered reference files</p><div className="mt-2 flex flex-wrap gap-1.5">{sequence.assetFiles.map((fileName, index) => <Badge key={fileName} variant="outline" className="font-mono text-[9px]">Asset {assetNumber(sequence.assetNumbers[index])} · {fileName}</Badge>)}</div></div>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <StateBlock label="Scene state" value={`${sequence.sceneState.locationId} · ${sequence.sceneState.environmentId}`} />
          <StateBlock label="Scene graph" value={`${sequence.sceneGraph.nodes.length} nodes · ${sequence.sceneGraph.edges.length} relationships`} />
          <StateBlock label="Look-ahead" value={`${sequence.lookAhead.length} future requirement${sequence.lookAhead.length === 1 ? '' : 's'}`} />
        </div>
        {job && ['Awaiting Confirmation', 'Paused', 'Failed', 'Waiting', 'External'].includes(job.status) && <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-medium">Generation control · {job.status}</p><p className="mt-1 text-[10px] leading-5 text-muted-foreground">Sequence {job.sequenceNumber} · {job.provider} · {job.model} · {job.durationSeconds}s · {job.resolution} · next confirmed attempt 1 credit</p></div><Badge variant="outline" className={statusClass(job.status)}>{job.generationCount} paid attempts</Badge></div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">{job.failureMessage}</p><div className="mt-3 flex flex-wrap gap-2">{job.status === 'Awaiting Confirmation' && <Button size="xs" onClick={() => onAction(`Confirm generation Sequence ${sequence.number}`)}><Play />Confirm paid attempt</Button>}{['Paused', 'Failed', 'Cancelled'].includes(job.status) && <Button size="xs" onClick={() => onAction(`Resume generation Sequence ${sequence.number}`)}>Resume</Button>}{!['Completed', 'Approved', 'Cancelled', 'External'].includes(job.status) && <Button size="xs" variant="outline" onClick={() => onAction(`Cancel generation Sequence ${sequence.number}`)}><X />Cancel</Button>}</div></div>}
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <StateBlock label="Dialogue timing audit" value={timingAudit?.message ?? 'Not evaluated'} />
          <StateBlock label="Reference binding audit" value={bindingFindings.length ? `${bindingFindings.length} finding${bindingFindings.length === 1 ? '' : 's'}` : 'Passed'} />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Internal timing</p><p className="text-[10px] tabular-nums text-muted-foreground">0–{sequence.duration}s · {plan.timing.length} beats</p></div>
          <div className="mt-2 flex h-7 overflow-hidden rounded-lg border border-border bg-background/55">{plan.timing.map((beat, index) => <div key={beat.id} title={`${beat.startSecond}–${beat.endSecond}s · ${beat.label}`} className={cn('grid min-w-0 place-items-center border-r border-background/60 px-1 text-[8px] font-medium last:border-r-0', index % 2 ? 'bg-sky-400/10 text-sky-200' : 'bg-amber-300/10 text-amber-200')} style={{ width: `${((beat.endSecond - beat.startSecond) / sequence.duration) * 100}%` }}><span className="truncate">{beat.label}</span></div>)}</div>
        </div>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <StateBlock label="Scenario engine" value={`${plan.scenario.purposeCategory} · ${plan.scenario.actions.length} owned actions · escalation ${plan.scenario.escalationScore}%`} />
          <StateBlock label="Dialogue & speaker lock" value={`${plan.dialogue.length} exact timed line${plan.dialogue.length === 1 ? '' : 's'} · provider-capability audiovisual output`} />
          <StateBlock label="Conflict check" value={plan.conflicts.length ? `${plan.conflicts.length} open` : 'Passed'} />
        </div>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <StateBlock label="Transition" value={`${plan.scenario.transition.type} · ${plan.scenario.transition.continuityStrength}`} />
          <StateBlock label="Reference readiness" value={`${plan.referencePackage.rankedReferences.filter((reference) => reference.included).length} included · ${plan.referencePackage.excludedReferenceIds.length} excluded`} />
          <StateBlock label="Generation readiness" value={plan.readinessChecklist.readyForGeneration ? 'Ready — every gate passed' : `${plan.readinessChecklist.blockers.length} blocker${plan.readinessChecklist.blockers.length === 1 ? '' : 's'}`} />
        </div>
        <details className="rounded-xl border border-border bg-background/50 p-3">
          <summary className="cursor-pointer text-xs font-medium">Structured scenario & state delta</summary>
          <div className="mt-3 grid gap-2 text-[10px] leading-5 text-muted-foreground sm:grid-cols-2"><p><span className="font-medium text-foreground">Opening:</span> {plan.scenario.sceneStateDelta.opening}</p><p><span className="font-medium text-foreground">Ending:</span> {plan.scenario.sceneStateDelta.ending}</p><p><span className="font-medium text-foreground">Objective:</span> {plan.scenario.activeStoryObjective}</p><p><span className="font-medium text-foreground">Next:</span> {plan.scenario.connectionToNext}</p></div>
          <ul className="mt-2 space-y-1 text-[10px] leading-5 text-muted-foreground">{plan.scenario.actions.map((action) => <li key={action.id}>Asset {assetNumber(action.actorAssetNumber)} owns {action.verb} · {action.startSecond}–{action.endSecond}s</li>)}</ul>
        </details>
        <details className="rounded-xl border border-border bg-background/50 p-3">
          <summary className="cursor-pointer text-xs font-medium">Reference package & priority rules</summary>
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground">{plan.referencePackage.uploadInstruction}</p>
          <ol className="mt-2 space-y-1 text-[10px] leading-5 text-muted-foreground">{plan.referencePackage.rankedReferences.map((reference) => <li key={reference.id} className={reference.included ? '' : 'line-through opacity-55'}>{reference.uploadOrder}. {reference.assetNumber ? `Asset ${assetNumber(reference.assetNumber)} · ` : ''}{reference.fileName} · {reference.role}{reference.included ? '' : ' · excluded by provider limit'}</li>)}</ol>
          <ul className="mt-2 space-y-1 text-[10px] leading-5 text-muted-foreground">{plan.referencePackage.priorityRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </details>
        <details className="rounded-xl border border-border bg-background/50 p-3">
          <summary className="cursor-pointer text-xs font-medium">Seedance prompt</summary>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-muted-foreground">{sequence.prompt}</pre>
        </details>
        <details className="rounded-xl border border-border bg-background/50 p-3">
          <summary className="cursor-pointer text-xs font-medium">MiniMax H3 official prompt · {project.localProduction.sequenceWorkspaces[sequence.id].h3Mode}</summary>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-muted-foreground">{h3PromptDocument?.content}</pre>
        </details>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border/70 bg-background/35 px-4 py-3">
        <Button size="sm" onClick={() => onAction(`Generate Sequence ${sequence.number}`)}><Play />Generate video</Button>
        {sequence.status !== 'Approved' && <Button size="sm" variant="outline" onClick={() => onAction(`Approve Sequence ${sequence.number}`)}><Check />Approve</Button>}
        <Button size="sm" variant="outline" onClick={() => sequenceDocument && void navigator.clipboard.writeText(sequenceDocument.content)}><Copy />Copy sequence</Button>
        <Button size="sm" variant="outline" onClick={() => sequenceDocument && downloadText(sequenceDocument.filename, sequenceDocument.content)}><Download />Download sequence</Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit('sequence', sequence.number)}><Pencil />Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction(`Regenerate Sequence ${sequence.number}`)}><RefreshCw />Regenerate</Button>
        <Button size="sm" variant="ghost" onClick={() => promptDocument && void navigator.clipboard.writeText(promptDocument.content)}><Copy />Copy prompt</Button>
        <Button size="sm" variant="ghost" onClick={() => promptDocument && downloadText(promptDocument.filename, promptDocument.content)}><Download />Download prompt</Button>
        <Button size="sm" variant="ghost" onClick={() => h3PromptDocument && void navigator.clipboard.writeText(h3PromptDocument.content)}><Copy />Copy H3</Button>
        <Button size="sm" variant="ghost" onClick={() => h3PromptDocument && downloadText(h3PromptDocument.filename, h3PromptDocument.content)}><Download />Download H3</Button>
      </div>
    </section>
  );
}

function SceneIntelligenceCard({ sequence }: { sequence: StudioSequence }) {
  const manifestGroups = Object.entries(sequence.assetManifest).filter(([, values]) => values.length > 0);
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2.5"><Network className="size-4 text-amber-300" /><span className="text-sm font-medium">{sequence.id} intelligence</span></div><Badge variant="outline">{sequence.sceneGraph.edges.length} relationships</Badge></div>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <StateBlock label="Scene state" value={`${sequence.sceneState.locationId} · ${sequence.sceneState.environmentId} · ${sequence.sceneState.weatherState}`} />
        <StateBlock label="Inherited continuity" value={sequence.sceneState.previousContinuitySource} />
        <StateBlock label="Ending state" value={`${sequence.endingState.environmentState} · ${sequence.endingState.elapsedTimeSeconds}s elapsed`} />
        <StateBlock label="Space & direction" value={`${sequence.endingState.cameraDirection} · ${sequence.endingState.screenDirection}`} />
      </div>
      <div className="mt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Exact manifest</p><div className="mt-2 flex flex-wrap gap-1.5">{manifestGroups.map(([category, values]) => <Badge key={category} variant="outline" className="text-[9px]">{category} {values.length}</Badge>)}</div></div>
      {sequence.lookAhead.length > 0 && <div className="mt-4"><RuleGroup title="Look-ahead" rules={sequence.lookAhead} /></div>}
    </section>
  );
}

function ReferenceCoverageCard({ assets }: { assets: StudioAsset[] }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4">
      <div className="flex items-center gap-2.5"><ShieldCheck className="size-4 text-amber-300" /><span className="text-sm font-medium">Reference coverage</span></div>
      <div className="mt-4 space-y-3">{assets.map((asset) => {
        const entries = Object.entries(asset.referenceCoverage);
        const coverage = Math.round(entries.reduce((total, [, value]) => total + value, 0) / entries.length);
        const missing = entries.filter(([, value]) => value < 50).map(([key]) => key);
        return <div key={asset.id} className="rounded-xl bg-background/55 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">Asset {assetNumber(asset.projectNumber)} · {asset.name}</span><span className="tabular-nums text-muted-foreground">{coverage}%</span></div><p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">{asset.generatedFileName}</p><Progress value={coverage} className="mt-2" /><p className="mt-2 text-[10px] text-muted-foreground">{missing.length ? `Needs: ${missing.join(', ')}` : 'Coverage is production-ready.'}</p></div>;
      })}</div>
    </section>
  );
}

function StateBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-background/55 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="mt-1.5 leading-5 text-foreground/80">{value}</p></div>;
}

function ExportCard({ project, onExport }: { project: StudioProject; onExport: () => void }) {
  return (
    <section className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/65 p-4">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><FileArchive className="size-5" /></span><div className="min-w-0"><p className="text-sm font-medium">{project.title} · complete production package</p><p className="mt-1 truncate text-xs text-muted-foreground">Story, World Bible, scene intelligence, prompts, continuity, media, and metadata</p></div></div>
      <Button size="sm" onClick={onExport}><Download />Download</Button>
    </section>
  );
}

function FlatAssetExportCard({ project, onAssetExport }: { project: StudioProject; onAssetExport: () => void }) {
  return (
    <section className="mt-4 rounded-2xl border border-amber-300/20 bg-card/65 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Download className="size-5" /></span><div className="min-w-0"><p className="text-sm font-medium">{project.flatAssetFolder.folderName}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">One flat folder. No category folders. Files sort by permanent project number.</p></div></div>
        <Button size="sm" onClick={onAssetExport}><Download />All assets</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">{project.assets.slice(0, 6).map((asset) => <Badge key={asset.id} variant="outline" className="font-mono text-[9px]">{asset.generatedFileName}</Badge>)}</div>
    </section>
  );
}

function ProductionReadinessCard({ project, onAction }: { project: StudioProject; onAction: (message: string) => void }) {
  const impacts = project.production.dependencies.filter((item) => item.freshness !== 'Current');
  const ledger = project.production.costLedger;
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">Production control</p><p className="mt-1 text-xs text-muted-foreground">{project.production.currentPipelineStage} · autosaved {relativeTime(project.production.autosave.lastSavedAt)}</p></div><Badge variant="outline" className={statusClass(project.production.readiness)}>{project.production.readiness}</Badge></div>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-8">
        <StateBlock label="Dependencies" value={impacts.length ? `${impacts.length} affected` : 'All current'} />
        <StateBlock label="Render queue" value={`${project.production.renderQueue.length} jobs`} />
        <StateBlock label="Attempts" value={`${ledger.generationCount} · ${ledger.estimatedCredits} credits`} />
        <StateBlock label="Checkpoints" value={`${project.production.checkpoints.length} saved`} />
        <StateBlock label="Repetition" value={project.production.repetitionFindings.length ? `${project.production.repetitionFindings.length} review` : 'Clear'} />
        <StateBlock label="Movie audit" value={project.production.completionAudit.status} />
        <StateBlock label="Integrity" value={project.production.control.integrityAudit.status} />
        <StateBlock label="Production freeze" value={project.production.control.freezeSnapshots.length ? `${project.production.control.freezeSnapshots.length} immutable` : 'Not frozen'} />
      </div>
      <div className="mt-3 rounded-xl bg-background/55 p-3 text-xs leading-5 text-foreground/80"><span className="font-medium">Next logical action:</span> {project.production.nextLogicalAction}</div>
      {impacts.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{impacts.slice(0, 6).map((impact) => <Badge key={impact.id} variant="outline" className={statusClass(impact.freshness)}>{impact.targetId} · {impact.freshness}</Badge>)}</div>}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-3"><Button size="sm" onClick={() => onAction('Continue')}>Continue production</Button><Button size="sm" variant="outline" onClick={() => onAction('What is missing?')}>Self-check</Button><Button size="sm" variant="outline" onClick={() => onAction('Show dependencies')}>Dependencies</Button><Button size="sm" variant="outline" onClick={() => onAction('Show render queue and costs')}>Queue & cost</Button><Button size="sm" variant="outline" onClick={() => onAction('Show change log')}>Change log</Button><Button size="sm" variant="ghost" onClick={() => onAction('Run final quality check')}>Final check</Button></div>
    </section>
  );
}

function DialogueCard({ project, sequence }: { project: StudioProject; sequence: StudioSequence }) {
  const plan = project.production.sequencePlans[sequence.id];
  return <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Clapperboard className="size-4 text-amber-300" /><p className="text-sm font-medium">Dialogue & provider speaker lock</p></div><Badge variant="outline">{plan.dialogue.length ? `${plan.dialogue.length} bound` : 'No dialogue'}</Badge></div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">Continuity Studio stores exact text, timing, speaker identity, current appearance, action, listeners, and reactions. A verified MiniMax H3 or Seedance mode generates the spoken result inside the video; no separate sound asset is created.</p><div className="mt-4 space-y-2">{plan.dialogue.length ? plan.dialogue.map((line) => <div key={line.id} className="rounded-xl bg-background/55 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">Turn {line.turnOrder} · Asset {assetNumber(line.speakerAssetNumber)} · {line.speakerName}</span><span className="tabular-nums text-muted-foreground">{line.startSecond}–{line.endSecond}s</span></div><p className="mt-2 text-sm">“{line.exactDialogue}”</p><p className="mt-2 text-[10px] leading-5 text-muted-foreground">{line.language} · {line.dialect} · {line.emotion} · {line.expression} · {line.physicalAction}</p><p className="mt-1 font-mono text-[9px] leading-4 text-muted-foreground">References: {line.requiredVisualReferences.map((reference) => reference.assetNumber ? `Asset ${assetNumber(reference.assetNumber)}` : reference.fileName).join(', ')}</p></div>) : <p className="text-xs text-muted-foreground">No spoken dialogue is authored. The selected verified audiovisual provider may generate only the scenario’s ambience, effects, requested music, and intentional silence.</p>}</div></section>;
}

function ValidationCard({ project, sequence, onAction }: { project: StudioProject; sequence: StudioSequence; onAction: (message: string) => void }) {
  const report = project.production.validations.findLast((item) => item.sequenceNumber === sequence.number);
  if (!report) return <ProductionReadinessCard project={project} onAction={onAction} />;
  return <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-amber-300" /><p className="text-sm font-medium">{sequence.id} validation</p></div><Badge variant="outline" className={statusClass(report.status)}>{report.status}</Badge></div><div className="mt-4 space-y-2">{report.checks.map((check) => <div key={check.id} className="rounded-xl bg-background/55 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">{check.name}</span><Badge variant="outline" className={statusClass(check.status)}>{check.status}</Badge></div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">Expected: {check.expected}<br />Actual: {check.actual}</p></div>)}</div>{report.correctionInstruction && <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/5 p-3 text-[10px] leading-5 text-rose-100">Targeted correction: {report.correctionInstruction}</div>}</section>;
}

function AssetGenerationCard({ project, assetIds, onAction, onRequestFiles }: { project: StudioProject; assetIds?: string[]; onAction: (message: string) => void; onRequestFiles: () => void }) {
  const asset = project.assets.find((entry) => assetIds?.includes(entry.id)) ?? project.assets.find((entry) => entry.id === 'CHARACTER_001');
  if (!asset) return null;
  const characterIdentity = asset.id === 'CHARACTER_001';
  const sourceReferences = project.attachments.filter((attachment) => (characterIdentity ? attachment.identityGroupId === 'CHARACTER_IDENTITY_001' : attachment.linkedAssetId === asset.id) && attachment.contentType.startsWith('image/'));
  const generated = asset.generatedAttachmentId ? project.attachments.find((attachment) => attachment.id === asset.generatedAttachmentId) : undefined;
  const preview = generated ? `/api/files?projectId=${encodeURIComponent(project.id)}&referenceId=${encodeURIComponent(generated.id)}` : undefined;
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-amber-300/20 bg-card/65">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div><p className="text-sm font-medium">Asset {assetNumber(asset.projectNumber)} · {asset.sheet?.kind ?? asset.name}</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">{asset.generatedFileName}</p></div>
        <Badge variant="outline" className={statusClass(asset.sheet?.generationStatus ?? 'Prepared')}>{asset.sheet?.generationStatus ?? 'References needed'}</Badge>
      </div>
      {generated?.contentType.startsWith('image/') && preview && <object data={preview} type={generated.contentType} aria-label={asset.name} className="max-h-[32rem] w-full border-b border-border bg-background object-contain" />}
      <div className="grid gap-3 p-4 text-xs sm:grid-cols-3">
        <StateBlock label={characterIdentity ? 'Identity' : 'Asset rule'} value={characterIdentity ? 'One character · one permanent asset number' : 'One production sheet · one permanent asset number'} />
        <StateBlock label="Source references" value={`${sourceReferences.length} unnumbered reference${sourceReferences.length === 1 ? '' : 's'}`} />
        <StateBlock label="Output" value={asset.sheet ? `One composite image · ${asset.sheet.panelCount} panels inside it` : 'One composite image when explicitly requested'} />
      </div>
      {asset.sheet?.brief && <p className="px-4 pb-4 text-xs leading-6 text-muted-foreground">{asset.sheet.brief}</p>}
      <div className="flex flex-wrap gap-2 border-t border-border/70 bg-background/35 px-4 py-3">
        {characterIdentity && <Button size="sm" variant="outline" onClick={onRequestFiles}><Paperclip />Attach references</Button>}
        {characterIdentity && sourceReferences.length > 0 && !asset.sheet && <Button size="sm" onClick={() => onAction('Create the master character sheet')}><ImageIcon />Create one master sheet</Button>}
        {characterIdentity && asset.sheet && !generated && <Button size="sm" onClick={() => onAction('Create the master character sheet')}><RefreshCw />Prepare again</Button>}
        {preview && <a href={preview} download={asset.generatedFileName} className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"><Download className="size-3.5" />Download sheet</a>}
      </div>
      <p className="border-t border-border/60 px-4 py-3 text-[10px] leading-5 text-muted-foreground">Panels are views inside this one production image. They never receive separate asset numbers. This request never starts video.</p>
    </section>
  );
}

function ComposerAttachments({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const previews = useMemo(() => files.map((file) => file.type.startsWith('image/') ? URL.createObjectURL(file) : ''), [files]);
  useEffect(() => {
    return () => previews.forEach((url) => { if (url) URL.revokeObjectURL(url); });
  }, [previews]);
  return <div className="grid grid-cols-2 gap-2 px-2 pb-2 sm:grid-cols-4">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="relative overflow-hidden rounded-xl border border-border bg-secondary/65"><div className="grid h-20 place-items-center bg-background/55">{previews[index] ? <object data={previews[index]} type={file.type} aria-label={file.name} className="h-full w-full object-cover" /> : <FileText className="size-5 text-muted-foreground" />}</div><div className="p-2 pr-7"><p className="truncate text-[10px] font-medium">{file.name}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p></div><button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/70 text-white transition hover:bg-black"><X className="size-3.5" /></button></div>)}</div>;
}

function requestedDocumentAction(instruction: string): { action: 'copy' | 'download'; kind: ProductionDocumentKind; sequenceNumber?: number } | null {
  const lower = instruction.trim().toLowerCase();
  const action = /^(?:please\s+)?copy\b/.test(lower) ? 'copy' : /^(?:please\s+)?download\b/.test(lower) ? 'download' : null;
  if (!action) return null;
  const sequenceNumber = Number(lower.match(/(?:sequence|seq)[\s_-]*0*(\d+)/)?.[1] ?? 0) || undefined;
  const kind: ProductionDocumentKind | null = /(?:minimax\s+)?h3/.test(lower) && /prompt/.test(lower) ? 'h3-prompt'
    : /seedance|prompt/.test(lower) ? 'seedance-prompt'
    : /world\s+bible/.test(lower) ? 'world-bible'
      : /film\s+bible/.test(lower) ? 'film-bible'
        : /scenario/.test(lower) ? 'scenario'
          : /script|screenplay/.test(lower) ? 'script'
            : /sequence|seq/.test(lower) ? 'sequence'
              : /story/.test(lower) ? 'story'
                : null;
  return kind ? { action, kind, sequenceNumber } : null;
}

function MessageItem({ item, project, onAction, onEdit, onRequestFiles, onOpenLibrary, onExport, onAssetExport }: { item: StudioMessage; project: StudioProject; onAction: (message: string) => void; onEdit: (kind: ProductionDocumentKind, sequenceNumber?: number) => void; onRequestFiles: () => void; onOpenLibrary: () => void; onExport: () => void; onAssetExport: () => void }) {
  if (item.role === 'user') {
    return <div className="ml-auto max-w-[82%] rounded-[18px_18px_5px_18px] bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground shadow-sm">{item.content}</div>;
  }
  const sequence = item.metadata?.sequenceNumber ? project.sequences.find((entry) => entry.number === item.metadata?.sequenceNumber) : undefined;
  return (
    <div className="max-w-full">
      <div className="flex gap-3">
        <span className="brand-mark mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"><Clapperboard className="size-3.5" /></span>
        <div className="min-w-0 flex-1"><p className="max-w-2xl text-sm leading-6 text-foreground/90">{item.content}</p>
          {item.metadata?.kind === 'story' && <StoryCard project={project} onAction={onAction} onEdit={onEdit} />}
          {item.metadata?.kind === 'world' && <WorldCard project={project} onAction={onAction} onEdit={onEdit} />}
          {item.metadata?.kind === 'bible' && <BibleCard project={project} onAction={onAction} onEdit={onEdit} />}
          {item.metadata?.kind === 'script' && sequence && <ProductionDocumentCard project={project} kind="script" sequenceNumber={sequence.number} onAction={onAction} onEdit={onEdit} />}
          {item.metadata?.kind === 'scenario' && sequence && <ProductionDocumentCard project={project} kind="scenario" sequenceNumber={sequence.number} onAction={onAction} onEdit={onEdit} />}
          {item.metadata?.kind === 'prompt' && sequence && <ProductionDocumentCard project={project} kind="seedance-prompt" sequenceNumber={sequence.number} onAction={onAction} onEdit={onEdit} />}
          {item.metadata?.kind === 'h3-prompt' && sequence && <ProductionDocumentCard project={project} kind="h3-prompt" sequenceNumber={sequence.number} onAction={onAction} onEdit={onEdit} />}
          {item.metadata?.kind === 'approval' && <ApprovalModeCard project={project} onAction={onAction} />}
          {item.metadata?.kind === 'asset-generation' && <AssetGenerationCard project={project} assetIds={item.metadata.assetIds} onAction={onAction} onRequestFiles={onRequestFiles} />}
          {item.metadata?.kind === 'assets' && <AssetsCard project={project} ids={item.metadata.assetIds} onAction={onAction} onOpenLibrary={onOpenLibrary} />}
          {['sequence', 'timing', 'reference-package'].includes(item.metadata?.kind ?? '') && sequence && <SequenceCard project={project} sequence={sequence} onAction={onAction} onEdit={onEdit} />}
          {['scene', 'graph', 'lookahead'].includes(item.metadata?.kind ?? '') && sequence && <SceneIntelligenceCard sequence={sequence} />}
          {item.metadata?.kind === 'dialogue' && sequence && <DialogueCard project={project} sequence={sequence} />}
          {item.metadata?.kind === 'validation' && sequence && <ValidationCard project={project} sequence={sequence} onAction={onAction} />}
          {['readiness', 'queue', 'assembly', 'status', 'control', 'integrity', 'import'].includes(item.metadata?.kind ?? '') && <ProductionReadinessCard project={project} onAction={onAction} />}
          {item.metadata?.kind === 'coverage' && <ReferenceCoverageCard assets={item.metadata.assetIds?.length ? project.assets.filter((asset) => item.metadata?.assetIds?.includes(asset.id)) : project.assets.filter((asset) => asset.importance !== 'Incidental')} />}
          {item.metadata?.kind === 'export' && <ExportCard project={project} onExport={onExport} />}
          {item.metadata?.kind === 'flat-assets' && <FlatAssetExportCard project={project} onAssetExport={onAssetExport} />}
          {item.metadata?.kind === 'attachment' && (() => { const attachment = project.attachments.find((entry) => entry.id === item.metadata?.attachmentId); const preview = attachment && `/api/files?projectId=${encodeURIComponent(project.id)}&referenceId=${encodeURIComponent(attachment.id)}`; return <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card/55 p-3">{attachment?.contentType.startsWith('image/') && preview ? <object data={preview} type={attachment.contentType} aria-label={attachment.name} className="mb-3 h-64 w-full rounded-lg bg-background object-contain" /> : attachment?.contentType.startsWith('video/') && preview ? <video src={preview} controls className="mb-3 max-h-64 w-full rounded-lg bg-black"><track kind="captions" src="data:text/vtt,WEBVTT%0A%0A" srcLang="en" label="Captions unavailable" default /></video> : null}<div className="flex items-center gap-3"><FileImage className="size-4 text-amber-200" /><span className="text-xs text-muted-foreground">{attachment ? `${attachment.name} · ${attachment.integrityStatus ?? 'Original'} · preview uses the untouched original` : 'Original reference stored in project memory'}</span></div></div>; })()}
        </div>
      </div>
    </div>
  );
}

export function StudioApp() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [view, setView] = useState<View>('chat');
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [booting, setBooting] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('All');
  const [lightMode, setLightMode] = useState(false);
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities>({ imageGeneration: false, codexBrain: 'fallback', localRuntime: 'checking' });
  const [localRuntime, setLocalRuntime] = useState<LocalRuntimeStatus | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const syncedRuntimeJobsRef = useRef(new Set<string>());

  const startNewMovie = useCallback(() => {
    setProject(null);
    setMessages([]);
    setDraft('');
    setFiles([]);
    setNotice('');
    setView('chat');
    setMobileNav(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const downloadExport = useCallback(async (projectId = project?.id) => {
    if (!projectId) return;
    setError('');
    try {
      const response = await fetch(`/api/export?projectId=${encodeURIComponent(projectId)}`);
      if (!response.ok) { const data = await response.json() as { error?: string }; throw new Error(data.error || 'The project export could not be created.'); }
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'CONTINUITY_STUDIO_PROJECT.zip';
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
      const refreshed = await fetch(`/api/studio?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
      const data = await refreshed.json() as { project?: StudioProject; messages?: StudioMessage[]; projects?: ProjectSummary[] };
      if (data.project) { setProject(data.project); setMessages(data.messages ?? []); setProjects(data.projects ?? []); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The project export could not be created.');
    }
  }, [project?.id]);

  const downloadAssets = useCallback(async (projectId = project?.id) => {
    if (!projectId) return;
    setError('');
    try {
      const response = await fetch(`/api/assets?projectId=${encodeURIComponent(projectId)}`);
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'The flat asset folder is not ready yet.');
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `${project?.flatAssetFolder.folderName ?? 'MOVIE_ASSETS'}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The flat asset folder could not be downloaded.');
    }
  }, [project]);

  const loadProject = useCallback(async (projectId: string) => {
    setBooting(true);
    setError('');
    try {
      const response = await fetch(`/api/studio?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
      const data = await response.json() as { project?: StudioProject; messages?: StudioMessage[]; projects?: ProjectSummary[]; error?: string };
      if (!response.ok || !data.project) throw new Error(data.error || 'Project could not be opened.');
      setProject(data.project);
      setMessages(data.messages ?? []);
      setProjects(data.projects ?? []);
      setView('chat');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Project could not be opened.');
    } finally {
      setBooting(false);
    }
  }, []);

  const refreshLocalRuntime = useCallback(async (deep = false) => {
    if (!canReachLocalCodexHost()) {
      setCapabilities((current) => ({ ...current, localRuntime: 'offline' }));
      setLocalRuntime(null);
      return null;
    }
    try {
      const response = await fetch(`http://127.0.0.1:4318/v1/status${deep ? '?deep=true' : ''}`, { cache: 'no-store' });
      const status = await response.json() as LocalRuntimeStatus & { error?: string };
      if (!response.ok) throw new Error(status.error || 'Local runtime is unavailable.');
      setLocalRuntime((current) => !deep && current ? {
        ...status,
        workflows: status.workflows.map((workflow) => {
          const previous = current.workflows.find((item) => item.id === workflow.id);
          return previous ? { ...workflow, compatible: previous.compatible, storyboardCompatible: previous.storyboardCompatible, h3Compatible: previous.h3Compatible, findings: previous.findings } : workflow;
        }),
      } : status);
      const blocked = !status.engine.connected || status.components.some((item) => item.required !== false && !item.installed) || status.models.some((item) => item.required !== false && item.status !== 'Present') || status.workflows.some((workflow) => workflow.compatible === false);
      setCapabilities((current) => ({ ...current, localRuntime: blocked ? 'blocked' : 'ready' }));
      return status;
    } catch {
      setLocalRuntime(null);
      setCapabilities((current) => ({ ...current, localRuntime: 'offline' }));
      return null;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/studio', { cache: 'no-store' });
        const data = await response.json() as { projects?: ProjectSummary[]; capabilities?: { imageGeneration?: boolean } };
        setCapabilities((current) => ({ ...current, imageGeneration: Boolean(data.capabilities?.imageGeneration) }));
        const initial = data.projects ?? [];
        setProjects(initial);
        if (initial[0]) await loadProject(initial[0].id);
      } catch {
        setError('Project memory is temporarily unavailable.');
      } finally {
        setBooting(false);
      }
    })();
  }, [loadProject]);

  useEffect(() => {
    if (!canReachLocalCodexHost()) {
      void Promise.resolve().then(() => setCapabilities((current) => ({ ...current, localRuntime: 'offline' })));
      return;
    }
    const initial = window.setTimeout(() => void refreshLocalRuntime(true), 0);
    const timer = window.setInterval(() => void refreshLocalRuntime(), 5000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refreshLocalRuntime]);

  useEffect(() => {
    if (!canReachLocalCodexHost()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    void fetch('http://127.0.0.1:4317/healthz', { cache: 'no-store', signal: controller.signal })
      .then((response) => setCapabilities((current) => ({ ...current, codexBrain: response.ok ? 'connected' : 'fallback' })))
      .catch(() => setCapabilities((current) => ({ ...current, codexBrain: 'fallback' })))
      .finally(() => window.clearTimeout(timer));
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, working]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        startNewMovie();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setView('projects');
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  });

  const setCurrentView = (next: View) => {
    setView(next);
    setMobileNav(false);
  };

  const uploadFiles = useCallback(async (activeProject: StudioProject, selectedFiles: File[], role: string) => {
    let nextProject = activeProject;
    const uploadedMessages: StudioMessage[] = [];
    let lastAttachmentId: string | undefined;
    for (const file of selectedFiles) {
      const form = new FormData();
      form.append('projectId', nextProject.id);
      form.append('expectedRevision', String(nextProject.storageRevision));
      form.append('file', file);
      form.append('role', role);
      const response = await fetch('/api/files', { method: 'POST', body: form });
      const data = await response.json() as { project?: StudioProject; attachment?: StudioProject['attachments'][number]; message?: StudioMessage; error?: string };
      if (!response.ok || !data.project) throw new Error(data.error || `“${file.name}” could not be stored.`);
      nextProject = data.project;
      lastAttachmentId = data.attachment?.id ?? data.message?.metadata?.attachmentId ?? lastAttachmentId;
      if (data.message) uploadedMessages.push(data.message);
    }
    return { project: nextProject, messages: uploadedMessages, lastAttachmentId };
  }, []);

  const importProject = useCallback(async (file: File) => {
    setWorking(true);
    setError('');
    try {
      const submitImport = async (confirmed: boolean) => {
        const form = new FormData();
        form.append('file', file);
        if (confirmed) form.append('confirmMapping', 'true');
        const response = await fetch('/api/import', { method: 'POST', body: form });
        const data = await response.json() as { project?: StudioProject; messages?: StudioMessage[]; error?: string; requiresApproval?: boolean; mappingPreview?: { summary: { assets: number; references: number; sequenceVideos: number; prompts: number; reviewRequired: number } } };
        return { response, data };
      };
      let { response, data } = await submitImport(false);
      if (response.status === 202 && data.requiresApproval && data.mappingPreview) {
        const summary = data.mappingPreview.summary;
        const approved = globalThis.confirm(`Continuity Studio inspected this folder and proposes ${summary.assets} asset(s), ${summary.references} additional reference(s), ${summary.sequenceVideos} sequence video(s), and ${summary.prompts} prompt(s). ${summary.reviewRequired} mapping(s) need later review. Approve this mapping and create the project?`);
        if (!approved) return;
        ({ response, data } = await submitImport(true));
      }
      if (!response.ok || !data.project) throw new Error(data.error || 'The project could not be imported.');
      setProject(data.project);
      setMessages(data.messages ?? []);
      const listResponse = await fetch('/api/studio', { cache: 'no-store' });
      const listData = await listResponse.json() as { projects?: ProjectSummary[] };
      setProjects(listData.projects ?? []);
      setView('chat');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The project could not be imported.');
    } finally {
      setWorking(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }, []);

  const submitInstruction = useCallback(async (instruction: string, selectedFiles: File[] = []) => {
    const content = instruction.trim();
    if ((!content && selectedFiles.length === 0) || working) return;
    const localDocumentAction = project && selectedFiles.length === 0 ? requestedDocumentAction(content) : null;
    if (project && localDocumentAction) {
      const document = getProductionDocument(project, localDocumentAction.kind, localDocumentAction.sequenceNumber);
      if (document) {
        try {
          if (localDocumentAction.action === 'copy') await navigator.clipboard.writeText(document.content);
          else downloadText(document.filename, document.content);
          setDraft('');
          setNotice(`${documentLabels[localDocumentAction.kind]} ${localDocumentAction.action === 'copy' ? 'copied' : 'downloaded'} as a clean document.`);
          window.setTimeout(() => setNotice(''), 2600);
          return;
        } catch {
          setError(`The ${documentLabels[localDocumentAction.kind].toLowerCase()} could not be copied.`);
          return;
        }
      }
    }
    setWorking(true);
    setError('');
    setNotice('');
    try {
      const fallbackContent = selectedFiles.length ? 'Store these references in this project.' : '';
      const role = /my (photo|picture|image)|likeness|main character/i.test(content) ? 'Main character likeness reference' : 'Production reference';
      const uploaded = project && selectedFiles.length
        ? await uploadFiles(project, selectedFiles, role)
        : null;
      const instructionProject = uploaded?.project ?? project;
      const brainResult = await askCodexBrain(instructionProject, content || fallbackContent);
      setCapabilities((current) => ({ ...current, codexBrain: brainResult ? 'connected' : 'fallback' }));
      if (!brainResult) setNotice('Codex brain was unavailable for this instruction. The validated deterministic fallback is handling it; no generation boundary is bypassed.');
      const response = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: instructionProject?.id, expectedRevision: instructionProject?.storageRevision, message: content || fallbackContent, attachmentId: uploaded?.lastAttachmentId, brainResult }),
      });
      const data = await response.json() as { project?: StudioProject; messages?: StudioMessage[]; projects?: ProjectSummary[]; error?: string; sideEffect?: string };
      if (!response.ok || !data.project) throw new Error(data.error || 'The instruction could not be applied.');
      let finalProject = data.project;
      let finalMessages = data.messages ?? [];
      if (!project && selectedFiles.length) {
        const postCreateUpload = await uploadFiles(data.project, selectedFiles, role);
        finalProject = postCreateUpload.project;
        finalMessages = [...finalMessages, ...postCreateUpload.messages];
      } else if (uploaded) {
        finalMessages = [...uploaded.messages, ...finalMessages];
      }
      setProject(finalProject);
      setMessages((current) => project ? [...current, ...finalMessages] : finalMessages);
      setProjects(data.projects ?? projects);
      setDraft('');
      setFiles([]);
      if (data.sideEffect === 'image-generation') {
        const assetId = finalMessages.findLast((item) => item.metadata?.kind === 'asset-generation')?.metadata?.assetIds?.[0];
        if (assetId) {
          const generationResponse = await fetch('/api/image-generation', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: finalProject.id, expectedRevision: finalProject.storageRevision, assetId }),
          });
          const generated = await generationResponse.json() as { project?: StudioProject; message?: StudioMessage; error?: string };
          if (generationResponse.ok && generated.project) {
            finalProject = generated.project;
            if (generated.message) finalMessages = [...finalMessages, generated.message];
            setProject(finalProject);
            setMessages((current) => project ? [...current, ...(generated.message ? [generated.message] : [])] : finalMessages);
          } else {
            setError(generated.error || 'The image provider did not complete the requested sheet. The prepared brief and all references remain safe.');
          }
        }
      }
      if (data.sideEffect === 'export') window.setTimeout(() => downloadExport(finalProject.id), 300);
      if (data.sideEffect === 'asset-export') window.setTimeout(() => void downloadAssets(finalProject.id), 300);
      if (data.sideEffect === 'local-generation') {
        setView('workspace');
        const runtime = await refreshLocalRuntime(true);
        if (!runtime?.engine.connected) setNotice('The production request is safely queued. Open Local AI Engine to install or start the verified backend before GPU execution.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The instruction could not be applied.');
    } finally {
      setWorking(false);
    }
  }, [downloadAssets, downloadExport, project, projects, refreshLocalRuntime, uploadFiles, working]);

  const onSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    void submitInstruction(draft, files);
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submitInstruction(draft, files);
    }
  };

  const onAction = (message: string) => {
    setView('chat');
    void submitInstruction(message);
  };

  const editDocument = (kind: ProductionDocumentKind, sequenceNumber?: number) => {
    const target = sequenceNumber ? `${documentLabels[kind]} for Sequence ${sequenceNumber}` : documentLabels[kind];
    setDraft(`Revise the ${target}: `);
    setView('chat');
    window.setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const addComposerFiles = useCallback((incoming: File[]) => {
    const accepted = incoming.filter((file) => !file.type.startsWith('audio/'));
    if (accepted.length !== incoming.length) setError('Separate audio assets are not accepted. A verified MiniMax H3 or Seedance mode handles authored dialogue and sound inside generated video.');
    setFiles((current) => [...current, ...accepted]);
  }, []);

  const onComposerDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addComposerFiles(Array.from(event.dataTransfer.files));
  };

  const onComposerPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
    if (!pastedFiles.length) return;
    if (!event.clipboardData.getData('text')) event.preventDefault();
    addComposerFiles(pastedFiles);
  };

  const updateProject = async (body: Record<string, unknown>) => {
    if (!project) return;
    const response = await fetch('/api/studio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, expectedRevision: project.storageRevision, ...body }) });
    const data = await response.json() as { project?: StudioProject; projects?: ProjectSummary[]; error?: string };
    if (!response.ok || !data.project) throw new Error(data.error || 'The project could not be updated.');
    setProject(data.project);
    setProjects(data.projects ?? projects);
  };

  useEffect(() => {
    if (!project || !localRuntime) return;
    const terminal = new Set(['Needs Review', 'Approved', 'Failed', 'Paused', 'Cancelled', 'Rejected']);
    const runtimeJob = localRuntime.jobs.find((item) => item.projectId === project.id && terminal.has(item.status) && !syncedRuntimeJobsRef.current.has(`${item.id}:${item.status}`));
    if (!runtimeJob) return;
    const syncKey = `${runtimeJob.id}:${runtimeJob.status}`;
    syncedRuntimeJobsRef.current.add(syncKey);
    void fetch('/api/studio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, expectedRevision: project.storageRevision, action: 'runtime-sync', runtimeJob }),
    }).then(async (response) => {
      const data = await response.json() as { project?: StudioProject; projects?: ProjectSummary[]; error?: string };
      if (!response.ok || !data.project) throw new Error(data.error || 'The completed local runtime result could not be synchronized.');
      setProject(data.project);
      setProjects(data.projects ?? []);
    }).catch((cause) => {
      syncedRuntimeJobsRef.current.delete(syncKey);
      setError(cause instanceof Error ? cause.message : 'The completed local runtime result could not be synchronized.');
    });
  }, [localRuntime, project]);

  const cleanupStorage = useCallback(async () => {
    if (!project) return;
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, expectedRevision: project.storageRevision }) });
      const data = await response.json() as { project?: StudioProject; error?: string };
      if (!response.ok || !data.project) throw new Error(data.error || 'Safe cleanup could not be completed.');
      setProject(data.project);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Safe cleanup could not be completed.');
    } finally {
      setWorking(false);
    }
  }, [project]);

  const runtimeAction = useCallback(async (action: string, path = '/v1/engine', extra: Record<string, unknown> = {}) => {
    setWorking(true);
    setError('');
    try {
      const response = await fetch(`http://127.0.0.1:4318${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || 'The local runtime action failed.');
      setNotice(data.message || 'Local runtime action accepted.');
      await refreshLocalRuntime(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The local runtime action failed.');
    } finally {
      setWorking(false);
    }
  }, [refreshLocalRuntime]);

  const installMissingComponents = useCallback(async () => {
    const missing = localRuntime?.components.filter((component) => !component.installed && ['engine', 'custom-node'].includes(component.kind ?? '')) ?? [];
    if (!missing.length) return;
    setError('');
    for (const component of missing) {
      try {
        const response = await fetch('http://127.0.0.1:4318/v1/components', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'install', id: component.id }) });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error || `Could not install ${component.name}.`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `Could not install ${component.name}.`);
        break;
      }
    }
    await refreshLocalRuntime(true);
  }, [localRuntime, refreshLocalRuntime]);

  const submitPreparedLocalJob = useCallback(async (jobId: string) => {
    if (!project) return;
    const job = project.localProduction.queue.find((item) => item.id === jobId);
    if (!job) return;
    const workspace = project.localProduction.sequenceWorkspaces[job.sequenceId];
    const translation = workspace.translations.find((item) => item.provider === 'MiniMax H3');
    if (!translation) return;
    setWorking(true);
    setError('');
    try {
      const plan = JSON.stringify({
        prompt_prefix: [],
        shots: [{ id: `sequence_${String(job.sequenceNumber).padStart(3, '0')}`, prompt: translation.compiledPrompt.split('\n'), duration_seconds: job.durationSeconds, steps: job.steps, seed: String(job.seed), width: workspace.width, height: workspace.height, sampler: workspace.sampler, scheduler: workspace.scheduler, loras: workspace.loras, context_length: workspace.contextFrames, audio_context_length: workspace.audioContextFrames }],
      });
      const latestStoryboardJob = localRuntime?.jobs.findLast((runtimeJob) => runtimeJob.projectId === project.id && runtimeJob.target === 'storyboard' && ['Needs Review', 'Approved'].includes(runtimeJob.status) && Boolean(runtimeJob.output?.length));
      const response = await fetch('http://127.0.0.1:4318/v1/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          projectId: project.id, sequenceId: job.sequenceId, sequenceNumber: job.sequenceNumber, target: 'h3-chain', workflowId: job.workflowId,
          studioJobId: job.id, candidateId: job.candidateId,
          model: job.modelId, resolution: job.resolution, durationSeconds: job.durationSeconds, seed: job.seed, steps: job.steps, sampler: workspace.sampler, scheduler: workspace.scheduler, loras: workspace.loras,
          mode: workspace.h3Mode,
          references: translation.referenceMapping.map((mapping) => {
            const stable = project.localProduction.references.find((reference) => reference.id === mapping.stableReferenceId);
            const attachmentId = stable?.previewAttachmentId;
            return {
              ...mapping,
              sourceUrl: attachmentId ? `${window.location.origin}/api/files?projectId=${encodeURIComponent(project.id)}&referenceId=${encodeURIComponent(attachmentId)}` : undefined,
              runtimeJobId: mapping.stableTag === '@storyboard' ? latestStoryboardJob?.id : undefined,
              outputIndex: mapping.stableTag === '@storyboard' ? 0 : undefined,
            };
          }), estimatedVramGb: job.estimatedVramGb,
          bindings: {
            'h3-model': 'MiniMax-H3-Ref2VA-pruned_int8_convrot.safetensors',
            'h3-reference-compiler': translation.compiledPrompt,
            'h3-plan': plan,
            'h3-run-name': `${project.title}_SEQUENCE_${String(job.sequenceNumber).padStart(3, '0')}`,
            'h3-context-length': workspace.contextFrames,
            'h3-audio-mode': workspace.audioContextFrames > 0 ? 'enabled' : 'disabled',
            'h3-scene-range': `${job.sequenceNumber}-${job.sequenceNumber}`,
            'h3-resume-scene': job.sequenceNumber,
            'h3-output-name': `${project.title}_SEQUENCE_${String(job.sequenceNumber).padStart(3, '0')}`,
            'h3-candidate-count': workspace.candidateCount,
          },
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'The local job failed preflight.');
      setNotice(`Sequence ${job.sequenceNumber} passed runtime preflight and entered the local GPU queue.`);
      await refreshLocalRuntime(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The local job failed preflight.');
    } finally {
      setWorking(false);
    }
  }, [localRuntime, project, refreshLocalRuntime]);

  const submitStoryboardJob = useCallback(async () => {
    if (!project) return;
    const board = project.localProduction.storyboards[0];
    const identity = project.localProduction.references.find((reference) => reference.stableTag === '@hero_face' && reference.previewAttachmentId)
      ?? project.localProduction.references.find((reference) => reference.stableTag === '@hero' && reference.previewAttachmentId);
    if (!board || !identity?.previewAttachmentId) {
      setError('Upload and bind the main character identity image before running the Krea storyboard.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const rows = Math.ceil(board.panelCount / board.columns);
      const shots = JSON.stringify({
        shots: board.panels.map((panel, index) => ({ prompt: panel.prompt, preview: `${project.id}_storyboard_${index + 1}.png` })),
        selected: Math.max(0, board.panels.findIndex((panel) => panel.approvalState === 'Needs Review')),
      });
      const response = await fetch('http://127.0.0.1:4318/v1/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          projectId: project.id, sequenceId: board.id, sequenceNumber: 0, target: 'storyboard', workflowId: board.workflowId,
          model: 'Krea 2', seed: board.panels[0]?.seed ?? 1, steps: 12, references: [{
            stableReferenceId: identity.id, stableTag: identity.stableTag, kind: identity.kind,
            sourceIdentifier: identity.sourceIdentifier,
            sourceUrl: `${window.location.origin}/api/files?projectId=${encodeURIComponent(project.id)}&referenceId=${encodeURIComponent(identity.previewAttachmentId)}`,
          }],
          bindings: {
            'storyboard-shots': shots,
            'storyboard-regenerate-shot': 0,
            'storyboard-layout-columns': board.columns,
            'storyboard-layout-rows': rows,
            'storyboard-labels': board.panels.map((panel) => panel.label).join(', '),
          },
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'The storyboard job failed preflight.');
      setNotice(`${board.panelCount}-panel Krea storyboard entered the local GPU queue and will stop for review.`);
      await refreshLocalRuntime(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The storyboard job failed preflight.');
    } finally {
      setWorking(false);
    }
  }, [project, refreshLocalRuntime]);

  const localRuntimeJobAction = useCallback(async (runtimeJobId: string, action: 'approve' | 'reject' | 'pause' | 'cancel' | 'retry' | 'resume') => {
    setWorking(true);
    setError('');
    try {
      const response = await fetch(`http://127.0.0.1:4318/v1/jobs/${encodeURIComponent(runtimeJobId)}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || `The local ${action} action failed.`);
      setNotice(`Local job ${action} action accepted at a recoverable boundary.`);
      await refreshLocalRuntime(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `The local ${action} action failed.`);
    } finally {
      setWorking(false);
    }
  }, [refreshLocalRuntime]);

  const filteredProjects = useMemo(() => projects.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [projects, search]);
  const filteredAssets = useMemo(() => {
    if (!project) return [];
    const selected = assetFilter === 'All' ? project.assets
      : assetFilter === 'Approved' ? project.assets.filter((asset) => ['Approved', 'Locked'].includes(asset.approvalState))
        : assetFilter === 'Pending' ? project.assets.filter((asset) => asset.approvalState === 'Pending')
          : assetFilter === 'Needs Review' ? project.assets.filter((asset) => asset.approvalState === 'Needs Review')
            : assetFilter === 'Retired' ? project.assets.filter((asset) => asset.lifecycleStatus === 'Retired')
              : assetFilter === 'Orphaned' ? project.assets.filter((asset) => project.production.control.orphanAssets.some((finding) => finding.assetId === asset.id && finding.status === 'Orphaned'))
                : project.assets.filter((asset) => asset.category === assetFilter);
    return selected.slice().sort((a, b) => a.projectNumber - b.projectNumber);
  }, [assetFilter, project]);

  return (
    <main className="film-grain flex h-dvh overflow-hidden bg-background text-foreground">
      {mobileNav && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={cn('z-50 flex w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 transition-transform max-md:fixed max-md:inset-y-0 max-md:left-0', mobileNav ? 'translate-x-0' : 'max-md:-translate-x-full')}>
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <span className="brand-mark grid size-8 place-items-center rounded-[10px]"><Clapperboard className="size-[17px]" strokeWidth={1.8} /></span>
          <div className="min-w-0 flex-1 leading-none"><p className="truncate text-[15px] font-semibold tracking-[-0.02em]">Continuity Studio</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Production 02</p></div>
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></Button>
        </div>
        <Button className="h-10 w-full justify-start gap-2.5 rounded-xl bg-primary px-3 shadow-[0_8px_24px_-12px_var(--primary)]" onClick={startNewMovie}><Plus />New Movie</Button>
        <input ref={importInputRef} type="file" className="sr-only" accept=".zip,.json,.txt,.md,.fountain,.fdx" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void importProject(selected); }} />
        <Button className="mt-2 h-9 w-full justify-start gap-2.5 rounded-xl px-3" variant="outline" onClick={() => importInputRef.current?.click()}><Upload />Import Project</Button>
        <nav className="mt-4 space-y-1" aria-label="Workspace">
          {primaryNavigation.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant="ghost" onClick={() => setCurrentView(id)} className={cn('h-9 w-full justify-start gap-3 rounded-lg px-3 text-muted-foreground hover:text-foreground', view === id && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
              <Icon className="size-4" strokeWidth={1.7} />{label}
            </Button>
          ))}
        </nav>
        <div className="mt-7 flex items-center justify-between px-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Your projects</p>{projects.length > 0 && <button type="button" onClick={() => setCurrentView('projects')} className="text-[10px] text-muted-foreground hover:text-foreground">View all</button>}</div>
        <div className="mt-2 min-h-0 space-y-1 overflow-y-auto">
          {projects.length === 0 ? <p className="px-3 pt-2 text-xs leading-5 text-muted-foreground/70">Your movies will appear here.</p> : projects.slice(0, 8).map((item) => (
            <button key={item.id} type="button" onClick={() => void loadProject(item.id)} className={cn('group w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-sidebar-accent', project?.id === item.id && view === 'chat' && 'bg-sidebar-accent')}>
              <div className="flex items-center gap-2"><span className="truncate text-xs font-medium">{item.title}</span>{item.pinned && <Pin className="ml-auto size-3 shrink-0 text-amber-300" />}</div>
              <div className="mt-1.5 flex items-center gap-2"><Progress value={item.progress} className="min-w-0 flex-1" /><span className="text-[9px] tabular-nums text-muted-foreground">{item.progress}%</span></div>
            </button>
          ))}
        </div>
        <div className="mt-auto border-t border-sidebar-border pt-3"><Button variant="ghost" onClick={() => setCurrentView('settings')} className={cn('h-9 w-full justify-start gap-3 rounded-lg px-3 text-muted-foreground hover:text-foreground', view === 'settings' && 'bg-sidebar-accent text-foreground')}><Settings className="size-4" strokeWidth={1.7} />Settings</Button></div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_30%,var(--ambient),transparent_34rem)]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></Button>
            {project && view !== 'chat' ? <Button variant="ghost" size="sm" onClick={() => setView('chat')}><ArrowLeft />Back to movie</Button> : project ? <ProjectStatus project={project} /> : <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-[var(--ready)] shadow-[0_0_10px_var(--ready)]" />Ready for a new production</div>}
          </div>
          <div className="flex items-center gap-1">
            {project && <Button variant="ghost" size="icon" onClick={() => void updateProject({ action: 'pin' })} aria-label={project.pinned ? 'Unpin project' : 'Pin project'}><Pin className={cn('size-4', project.pinned && 'fill-amber-300 text-amber-300')} /></Button>}
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('settings')} aria-label="Settings"><Settings className="size-4" /></Button>
          </div>
        </header>

        {booting ? <LoadingSurface /> : view === 'chat' ? (
          <ChatView project={project} messages={messages} working={working} error={error} onAction={onAction} onEdit={editDocument} onRequestFiles={() => { setDraft('Use these as my main character references.'); fileInputRef.current?.click(); }} onOpenLibrary={() => setView('assets')} onExport={() => downloadExport()} onAssetExport={() => void downloadAssets()} endRef={messagesEndRef} />
        ) : view === 'projects' ? (
          <ProjectsView projects={filteredProjects} search={search} setSearch={setSearch} searchRef={searchRef} onOpen={loadProject} onNew={startNewMovie} onImport={() => importInputRef.current?.click()} />
        ) : view === 'workspace' ? (
          <MovieWorkspaceView project={project} runtime={localRuntime} working={working} onAction={onAction} onRunJob={(jobId) => void submitPreparedLocalJob(jobId)} onRuntimeJobAction={(jobId, action) => void localRuntimeJobAction(jobId, action)} onRunStoryboard={() => void submitStoryboardJob()} onOpenEngine={() => setView('engine')} onNew={startNewMovie} />
        ) : view === 'assets' ? (
          <AssetsView project={project} assets={filteredAssets} filter={assetFilter} setFilter={setAssetFilter} onAction={onAction} onAssetExport={() => void downloadAssets()} onNew={startNewMovie} />
        ) : view === 'engine' ? (
          <LocalEngineView status={localRuntime} capability={capabilities.localRuntime} working={working} onAction={(action) => void runtimeAction(action)} onRefresh={() => void refreshLocalRuntime(true)} onInstall={() => void installMissingComponents()} onVerifyModels={() => void runtimeAction('verify', '/v1/models')} onNew={startNewMovie} />
        ) : view === 'exports' ? (
          <ExportsView project={project} onExport={() => downloadExport()} onAssetExport={() => void downloadAssets()} onNew={startNewMovie} />
        ) : view === 'advanced' ? (
          <AdvancedControlView project={project} working={working} onAction={onAction} onCleanup={() => void cleanupStorage()} onNew={startNewMovie} />
        ) : (
          <SettingsView project={project} capabilities={capabilities} lightMode={lightMode} setLightMode={(value) => { setLightMode(value); document.documentElement.classList.toggle('dark', !value); }} onUpdate={(settings) => void updateProject({ action: 'settings', settings })} onAdvanced={() => setView('advanced')} />
        )}

        {view === 'chat' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-3 pb-3 pt-16 sm:px-6 sm:pb-5">
            {notice && <p aria-live="polite" className="pointer-events-auto mx-auto mb-2 w-fit rounded-full border border-emerald-400/20 bg-background/95 px-3 py-1.5 text-[10px] text-emerald-200 shadow-lg">{notice}</p>}
            <form onSubmit={onSubmit} className="pointer-events-auto mx-auto w-full max-w-[780px]">
              <fieldset className={cn('composer relative min-w-0 rounded-[20px] border bg-card p-2.5 transition', isDragging && 'border-amber-300/60 ring-2 ring-amber-300/20')}>
              <legend className="sr-only">Movie assistant message composer</legend>
              {isDragging && <div className="pointer-events-none absolute inset-1 z-10 grid place-items-center rounded-[16px] border border-dashed border-amber-300/50 bg-background/95 text-sm font-medium text-amber-100">Drop references into this message</div>}
              {files.length > 0 && <ComposerAttachments files={files} onRemove={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} />}
              <label htmlFor="movie-idea" className="sr-only">{project ? 'Tell the studio what to do' : 'Describe your movie'}</label>
              <textarea ref={textareaRef} id="movie-idea" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} onPaste={onComposerPaste} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onComposerDrop} placeholder={project ? 'Ask for a change, attach references, or continue the movie…' : 'Describe the movie you want to make…'} className="max-h-40 min-h-[54px] w-full resize-none bg-transparent px-2.5 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/65" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" multiple className="sr-only" accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={(event) => { addComposerFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => fileInputRef.current?.click()} aria-label="Attach reference"><Paperclip className="size-[18px]" strokeWidth={1.7} /></Button>
                  <span className="ml-1 hidden text-[10px] text-muted-foreground sm:inline">Attach many · drag & drop · paste images</span>
                </div>
                <Button type="submit" size="icon" disabled={working || (!draft.trim() && files.length === 0)} className="size-9 rounded-full" aria-label="Send instruction">{working ? <LoaderCircle className="animate-spin" /> : <ArrowUp className="size-[18px]" strokeWidth={2} />}</Button>
              </div>
              </fieldset>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted-foreground/65">Ctrl + Enter to send · Ctrl + N for a new movie</p>
          </div>
        )}
      </section>
    </main>
  );
}

function LoadingSurface() {
  return <div className="grid flex-1 place-items-center"><div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Opening project memory…</div></div>;
}

function ChatView({ project, messages, working, error, onAction, onEdit, onRequestFiles, onOpenLibrary, onExport, onAssetExport, endRef }: { project: StudioProject | null; messages: StudioMessage[]; working: boolean; error: string; onAction: (message: string) => void; onEdit: (kind: ProductionDocumentKind, sequenceNumber?: number) => void; onRequestFiles: () => void; onOpenLibrary: () => void; onExport: () => void; onAssetExport: () => void; endRef: React.RefObject<HTMLDivElement | null> }) {
  if (!project && messages.length === 0) return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[780px] flex-col items-center justify-center px-5 pb-40 pt-16 text-center sm:px-8">
        <EmptyProjectMark />
        <p className="eyebrow mb-3 mt-7">A blank reel. Your direction.</p>
        <h1 className="text-balance text-[clamp(2rem,5vw,3.7rem)] font-medium leading-[1.04] tracking-[-0.055em]">What movie do you want to create?</h1>
        <p className="mt-5 max-w-md text-pretty text-sm leading-6 text-muted-foreground sm:text-[15px]">Describe your idea in one sentence. I’ll shape the story, organize the production, and keep every detail continuous.</p>
        {error && <p className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs text-rose-200">{error}</p>}
      </div>
    </div>
  );
  return (
    <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
      <div className="mx-auto w-full max-w-[780px] space-y-7 px-4 pb-48 pt-8 sm:px-6 sm:pt-12">
        {messages.map((item) => <MessageItem key={item.id} item={item} project={project!} onAction={onAction} onEdit={onEdit} onRequestFiles={onRequestFiles} onOpenLibrary={onOpenLibrary} onExport={onExport} onAssetExport={onAssetExport} />)}
        {working && <div className="flex items-center gap-3"><span className="brand-mark grid size-7 place-items-center rounded-lg"><Clapperboard className="size-3.5" /></span><div className="flex gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" /><span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:120ms]" /><span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:240ms]" /></div></div>}
        {error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs text-rose-200">{error}</p>}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function PageFrame({ eyebrow, title, description, children, action }: { eyebrow: string; title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</div><div className="mt-8">{children}</div></div></div>;
}

function ProjectsView({ projects, search, setSearch, searchRef, onOpen, onNew, onImport }: { projects: ProjectSummary[]; search: string; setSearch: (value: string) => void; searchRef: React.RefObject<HTMLInputElement | null>; onOpen: (id: string) => Promise<void>; onNew: () => void; onImport: () => void }) {
  return <PageFrame eyebrow="Project memory" title="Your movies" description="Every conversation, approval, version, reference, and continuity decision returns with the project." action={<div className="flex gap-2"><Button variant="outline" onClick={onImport}><Upload />Import</Button><Button onClick={onNew}><Plus />New Movie</Button></div>}>
    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, characters, locations…" className="h-10 rounded-xl pl-9" /></div>
    {projects.length === 0 ? <EmptyCollection icon={FolderClock} title={search ? 'No matching movies' : 'No movies yet'} text={search ? 'Try another project name.' : 'Start with one sentence in chat. Your first real project will appear here.'} action={!search ? <Button onClick={onNew}><Plus />Create a movie</Button> : undefined} /> : <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{projects.map((item) => <button key={item.id} type="button" onClick={() => void onOpen(item.id)} className="group rounded-2xl border border-border bg-card/55 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300/25 hover:bg-card"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/8 text-amber-200"><Clapperboard className="size-5" /></span><div className="flex items-center gap-1 text-[10px] text-muted-foreground">{item.pinned && <Pin className="size-3 text-amber-300" />}{relativeTime(item.updatedAt)}</div></div><h2 className="mt-5 truncate text-sm font-medium">{item.title}</h2><p className="mt-1 text-xs text-muted-foreground">{durationLabel(item.durationSeconds)} · {item.sequenceCount} sequences · {item.stage}</p><div className="mt-5 flex items-center gap-3"><Progress value={item.progress} className="flex-1" /><span className="text-[10px] tabular-nums text-muted-foreground">{item.progress}%</span></div></button>)}</div>}
  </PageFrame>;
}

function AssetsView({ project, assets, filter, setFilter, onAction, onAssetExport, onNew }: { project: StudioProject | null; assets: StudioAsset[]; filter: string; setFilter: (value: string) => void; onAction: (message: string) => void; onAssetExport: () => void; onNew: () => void }) {
  return <PageFrame eyebrow="One movie · one flat folder" title="Asset Library" description="Every category shares one permanent numeric sequence. Cards, filenames, prompts, references, continuity, and downloads use the same number." action={project ? <Button size="sm" onClick={onAssetExport}><Download />Download all assets</Button> : undefined}>
    {!project ? <EmptyCollection icon={Library} title="No active movie" text="Create or open a movie to see its isolated asset library." action={<Button onClick={onNew}><Plus />Create a movie</Button>} /> : <><div className="flex gap-2 overflow-x-auto pb-2">{assetFilters.map((item) => <Button key={item} size="sm" variant={filter === item ? 'default' : 'outline'} onClick={() => setFilter(item)} className="shrink-0">{item}</Button>)}</div>{assets.length === 0 ? <EmptyCollection icon={ImageIcon} title={`No ${filter.toLowerCase()} assets`} text="This filter has no matching assets in the active project." /> : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{assets.map((asset) => <AssetMiniCard key={asset.id} asset={asset} onAction={onAction} />)}</div>}</>}
  </PageFrame>;
}

function MovieWorkspaceView({ project, runtime, working, onAction, onRunJob, onRuntimeJobAction, onRunStoryboard, onOpenEngine, onNew }: { project: StudioProject | null; runtime: LocalRuntimeStatus | null; working: boolean; onAction: (message: string) => void; onRunJob: (jobId: string) => void; onRuntimeJobAction: (jobId: string, action: 'approve' | 'reject' | 'pause' | 'cancel' | 'retry' | 'resume') => void; onRunStoryboard: () => void; onOpenEngine: () => void; onNew: () => void }) {
  const [selectedSequence, setSelectedSequence] = useState(project?.localProduction.selectedSequenceNumber ?? 1);
  const [selectedPanel, setSelectedPanel] = useState('A1');
  if (!project) return <PageFrame eyebrow="Hidden production workspace" title="Movie Workspace" description="Storyboards, references, sequence candidates, review gates, and the local queue appear here after you start a movie."><EmptyCollection icon={Clapperboard} title="No active movie" text="Create or open a movie; chat remains the place where you direct it." action={<Button onClick={onNew}><Plus />Create a movie</Button>} /></PageFrame>;
  const sequence = project.sequences.find((item) => item.number === selectedSequence) ?? project.sequences[0];
  const workspace = project.localProduction.sequenceWorkspaces[sequence.id];
  const board = project.localProduction.storyboards[0];
  const panel = board?.panels.find((item) => item.label === selectedPanel) ?? board?.panels.find((item) => item.sequenceId === sequence.id) ?? board?.panels[0];
  const activeReferences = project.localProduction.references.filter((reference) => workspace.activeReferenceIds.includes(reference.id));
  const candidates = project.localProduction.candidates.filter((candidate) => candidate.sequenceId === sequence.id);
  const reviewCandidateIndex = Math.max(1, candidates.findLastIndex((candidate) => ['Needs Review', 'Generated'].includes(candidate.status)) + 1);
  const jobs = project.localProduction.queue.filter((job) => job.sequenceId === sequence.id);
  const translation = workspace.translations.find((item) => item.provider === 'MiniMax H3');
  const h3RuntimeReady = Boolean(runtime?.engine.connected && runtime.workflows.every((workflow) => workflow.h3Compatible === true));
  const localModeExecutable = workspace.h3Mode === 'Ref2VA';
  const storyboardRuntimeReady = Boolean(runtime?.engine.connected && runtime.workflows.every((workflow) => workflow.storyboardCompatible === true));
  return <PageFrame eyebrow="Sequence production" title="Movie Workspace" description="Direct the movie here without touching raw ComfyUI. Stable Studio tags, numbered assets, provider translations, candidates, and handoffs remain attached to the project source of truth." action={<div className="flex gap-2"><Button variant="outline" onClick={onOpenEngine}><Network />Local AI Engine</Button><Button onClick={() => onAction(`Render Sequence ${sequence.number}`)}><Play />Render sequence</Button></div>}>
    <section className="overflow-hidden rounded-xl border border-border bg-card/55">
      <div className="flex overflow-x-auto">{project.sequences.map((item) => {
        const sequenceJobs = project.localProduction.queue.filter((job) => job.sequenceId === item.id);
        const latest = sequenceJobs.at(-1);
        const displayStatus = latest?.status ?? item.status;
        return <button key={item.id} type="button" onClick={() => setSelectedSequence(item.number)} className={cn('min-w-28 border-r border-border px-3 py-3 text-left transition hover:bg-secondary/70', item.number === sequence.number && 'border-b-2 border-b-amber-300 bg-secondary')}><span className={cn('text-[9px] font-semibold uppercase tracking-[0.12em]', statusClass(displayStatus))}>{String(item.number).padStart(2, '0')} · {displayStatus}</span><p className="mt-1 truncate text-xs">{item.title}</p></button>;
      })}</div>
    </section>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-border bg-card/55 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Sequence {String(sequence.number).padStart(2, '0')}</p><h2 className="mt-2 text-xl font-medium tracking-[-0.03em]">{sequence.title}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{sequence.purpose}</p></div><div className="flex gap-2"><Badge variant="outline">{workspace.selectedProvider}</Badge><Badge variant="outline" className={workspace.h3Mode === 'Ref2VA' ? 'border-amber-400/30 text-amber-200' : ''}>{workspace.h3Mode}</Badge></div></div>
          <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_50%_30%,oklch(.72_.16_64/.08),transparent_55%),oklch(.12_.01_255)]">
            {candidates.findLast((candidate) => candidate.mediaPath)?.mediaPath ? <video controls className="size-full object-contain" src={candidates.findLast((candidate) => candidate.mediaPath)?.mediaPath ?? undefined}><track kind="captions" src="data:text/vtt,WEBVTT%0A%0A" srcLang="en" label="Captions unavailable" default /></video> : <div className="grid size-full place-items-center px-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground"><Film className="size-5" /></span><p className="mt-4 text-sm font-medium">No finished candidate attached</p><p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{h3RuntimeReady && localModeExecutable ? 'Run the prepared immutable job, then the result will stop at the Review Gate.' : !localModeExecutable ? `${workspace.h3Mode} is compiled for export, but this runtime currently executes only the validated Ref2VA graph.` : 'The plan is safe. Resolve the Local AI Engine blockers before GPU execution.'}</p></div></div>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={!candidates.some((candidate) => ['Needs Review', 'Generated'].includes(candidate.status))} onClick={() => onAction(`Use candidate ${reviewCandidateIndex} for Sequence ${sequence.number}`)}><Check />Approve</Button><Button size="sm" variant="outline" onClick={() => onAction(`Edit and retry Sequence ${sequence.number}: `)}><Pencil />Edit and Retry</Button><Button size="sm" variant="outline" onClick={() => onAction(`Generate another candidate for Sequence ${sequence.number}`)}><RefreshCw />Another Candidate</Button><Button size="sm" variant="outline" disabled={!candidates.some((candidate) => ['Needs Review', 'Generated'].includes(candidate.status))} onClick={() => onAction(`Approve candidate ${reviewCandidateIndex} for Sequence ${sequence.number} and stop`)}><ShieldCheck />Approve & stop</Button><Button size="sm" variant="ghost" onClick={() => onAction(`Reject current candidate for Sequence ${sequence.number}`)}><X />Reject</Button></div>
          {candidates.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{candidates.map((candidate, index) => { const reviewable = Boolean(candidate.mediaPath && ['Needs Review', 'Generated'].includes(candidate.status)); return <div key={candidate.id} className={cn('rounded-xl border p-3', candidate.status === 'Approved' ? 'border-emerald-400/25 bg-emerald-400/5' : 'border-border bg-background/45')}><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium">Candidate {index + 1}</p><Badge variant="outline" className={statusClass(candidate.status)}>{candidate.status}</Badge></div>{candidate.mediaPath ? <video controls preload="metadata" className="mt-3 aspect-video w-full rounded-lg bg-black object-contain" src={candidate.mediaPath}><track kind="captions" src="data:text/vtt,WEBVTT%0A%0A" srcLang="en" label="Captions unavailable" default /></video> : <div className="mt-3 grid aspect-video place-items-center rounded-lg bg-background text-[10px] text-muted-foreground">Awaiting output</div>}<div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground"><span>Seed {candidate.seed}</span><button type="button" disabled={!reviewable} className="text-amber-200 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline" onClick={() => onAction(`Use candidate ${index + 1} for Sequence ${sequence.number}`)}>Select</button></div></div>; })}</div>}
        </section>
        <section className="rounded-2xl border border-border bg-card/55 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Master storyboard</p><h2 className="mt-2 text-sm font-medium">{board?.name ?? 'Storyboard not generated'}</h2></div><div className="flex gap-2"><Badge variant="outline" className={statusClass(board?.approvalState ?? 'Draft')}>{board?.approvalState ?? 'Draft'}</Badge><Button size="sm" variant="outline" disabled={working || !storyboardRuntimeReady} onClick={onRunStoryboard}><Sparkles />Run Krea board</Button></div></div>
          {board?.generatedCompositeFile && <object data={board.generatedCompositeFile} type="image/png" aria-label={`${board.name} generated composite`} className="mt-4 h-[34rem] w-full rounded-xl border border-border bg-black object-contain" />}
          {board ? <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">{board.panels.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedPanel(item.label); if (item.sequenceNumber) setSelectedSequence(item.sequenceNumber); }} className={cn('aspect-video rounded-lg border p-1.5 text-left text-[9px] font-semibold transition hover:border-amber-300/35', item.label === panel?.label ? 'border-amber-300 bg-amber-300/10 text-amber-100' : item.approvalState === 'Approved' ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-200' : item.approvalState === 'Needs Review' ? 'border-rose-400/25 bg-rose-400/5 text-rose-200' : 'border-border bg-background/55 text-muted-foreground')}><span>{item.label}</span><span className="mt-1 block truncate font-normal">S{item.sequenceNumber ?? '—'}</span></button>)}</div> : <p className="mt-4 text-xs text-muted-foreground">Ask Studio to generate a storyboard. Custom boards may contain more than 16 panels.</p>}
          {panel && <div className="mt-4 rounded-xl border border-border bg-background/45 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium">Panel {panel.label} · V{String(panel.version).padStart(2, '0')}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{panel.prompt}</p></div><Button size="sm" variant="outline" onClick={() => onAction(`Regenerate only ${panel.label}`)}><RefreshCw />Regenerate only {panel.label}</Button></div></div>}
        </section>
        <details className="rounded-2xl border border-border bg-card/55 p-4"><summary className="cursor-pointer text-sm font-medium">Official MiniMax H3 prompt · {workspace.h3Mode}</summary><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-background/55 p-4 text-[11px] leading-5 text-foreground/80">{translation?.compiledPrompt}</pre></details>
        <details className="rounded-2xl border border-border bg-card/55 p-4"><summary className="cursor-pointer text-sm font-medium">Advanced generation controls</summary><div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><StateBlock label="Resolution" value={`${workspace.width}×${workspace.height}`} /><StateBlock label="Seed / steps" value={`${workspace.seed} / ${workspace.steps}`} /><StateBlock label="Sampler" value={`${workspace.sampler} · ${workspace.scheduler}`} /><StateBlock label="Context" value={`${workspace.contextFrames} video · ${workspace.audioContextFrames} audio`} /><StateBlock label="Candidates" value={String(workspace.candidateCount)} /><StateBlock label="LoRAs" value={workspace.loras.length ? workspace.loras.map((lora) => `${lora.id}@${lora.strength}`).join(', ') : 'None'} /><StateBlock label="Continuation" value={workspace.continuationMode} /><StateBlock label="Workflow" value={project.localProduction.workflowPin.version} /></div><div className="mt-4 flex flex-wrap gap-2">{(['T2VA', 'I2VA', 'FL2VA', 'L2VA', 'Ref2VA'] as const).map((mode) => <Button key={mode} size="sm" variant={workspace.h3Mode === mode ? 'default' : 'outline'} onClick={() => onAction(`Use H3 ${mode} for Sequence ${sequence.number}`)}>{mode}</Button>)}<Button size="sm" variant="outline" onClick={() => onAction(`Set context length to 22 and audio context to 22 for Sequence ${sequence.number}`)}>22-frame preset</Button><Button size="sm" variant="outline" onClick={() => onAction(`Set resolution to 1920x1080 for Sequence ${sequence.number}`)}>1080p</Button><Button size="sm" variant="outline" onClick={() => onAction(`Set candidate count to 2 for Sequence ${sequence.number}`)}>2 candidates</Button></div><p className="mt-3 text-[10px] leading-4 text-muted-foreground">Seeds, steps, resolution, sampler, scheduler, LoRAs, context, audio context, continuation mode, and candidate count are stored per sequence and frozen into each generation snapshot. Set any exact value through chat.</p></details>
      </div>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-card/55 p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Stable references</h2><Badge variant="outline">{activeReferences.length} active</Badge></div><div className="mt-3 grid grid-cols-2 gap-2">{activeReferences.slice(0, 8).map((reference) => <button key={reference.id} type="button" title={reference.sourceIdentifier} className="rounded-xl border border-border bg-background/50 p-3 text-left transition hover:border-sky-300/25"><ImageIcon className="size-4 text-muted-foreground" /><p className="mt-3 truncate font-mono text-[10px] text-sky-200">{reference.stableTag}</p><p className="mt-1 text-[9px] text-muted-foreground">{reference.role}</p></button>)}</div><p className="mt-3 text-[10px] leading-4 text-muted-foreground">Native Picture/Video numbers are generated only inside each immutable snapshot.</p></section>
        <section className="rounded-2xl border border-border bg-card/55 p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Prepared queue</h2><Button size="sm" variant="ghost" onClick={() => onAction('Pause rendering')}>Pause planned</Button></div><div className="mt-3 space-y-2">{jobs.length ? jobs.map((job) => { const runtimeJob = runtime?.jobs.find((item) => item.studioJobId === job.id); const status = runtimeJob?.status ?? job.status; const progress = runtimeJob?.progress ?? job.progress; return <div key={job.id} className="rounded-xl border border-border bg-background/50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase">SEQ {String(job.sequenceNumber).padStart(2, '0')} · {status}</span><span className="font-mono text-[10px] text-sky-200">{progress}%</span></div><Progress value={progress} className="mt-2" /><div className="mt-2 grid grid-cols-2 gap-1 text-[9px] text-muted-foreground"><span>Seed {job.seed}</span><span>{job.modelId}</span><span>{job.resolution}</span><span>Retry {runtimeJob?.retryCount ?? job.retryCount}</span></div>{!runtimeJob ? <Button className="mt-3 w-full" size="sm" variant="outline" disabled={working || !h3RuntimeReady || !localModeExecutable} title={!localModeExecutable ? 'This local runtime currently executes the validated Ref2VA graph only.' : undefined} onClick={() => onRunJob(job.id)}><Play />Run verified job</Button> : ['Preparing', 'Waiting for GPU', 'Loading model', 'Generating', 'Decoding', 'Saving', 'Validating'].includes(runtimeJob.status) ? <div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" disabled={working} onClick={() => onRuntimeJobAction(runtimeJob.id, 'pause')}>Pause</Button><Button size="sm" variant="ghost" disabled={working} onClick={() => onRuntimeJobAction(runtimeJob.id, 'cancel')}>Cancel</Button></div> : ['Paused', 'Failed', 'Cancelled'].includes(runtimeJob.status) ? <Button className="mt-3 w-full" size="sm" variant="outline" disabled={working || !localModeExecutable} onClick={() => onRuntimeJobAction(runtimeJob.id, 'resume')}><RefreshCw />Resume verified snapshot</Button> : null}{(runtimeJob?.failure || job.failure) && <p className="mt-2 text-[10px] leading-4 text-rose-200">{runtimeJob?.failure || job.failure}</p>}</div>; }) : <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">No prepared jobs for this sequence. Say “Render Sequence {sequence.number}”.</p>}</div></section>
        <section className="rounded-2xl border border-border bg-card/55 p-4"><h2 className="text-sm font-medium">Continuity handoff</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{sequence.number === 1 ? 'Independent opening uses the approved story state.' : `${workspace.continuationMode}. Consumes the previous approved video, context frames, audio context when supported, ending state, positions, wardrobe, objects, environment, motion, and screen direction.`}</p><Badge variant="outline" className="mt-3">{project.localProduction.handoffs.some((handoff) => handoff.sequenceNumber === sequence.number - 1) || sequence.number === 1 ? 'Available' : 'Awaiting previous approval'}</Badge></section>
      </aside>
    </div>
  </PageFrame>;
}

function LocalEngineView({ status, capability, working, onAction, onRefresh, onInstall, onVerifyModels, onNew }: { status: LocalRuntimeStatus | null; capability: RuntimeCapabilities['localRuntime']; working: boolean; onAction: (action: string) => void; onRefresh: () => void; onInstall: () => void; onVerifyModels: () => void; onNew: () => void }) {
  if (!canReachLocalCodexHost()) return <PageFrame eyebrow="Windows-first local renderer" title="Local AI Engine" description="The hosted Sites build cannot reach your machine. Open Continuity Studio on localhost to use your Codex session and local GPU without a separate Studio sign-in."><EmptyCollection icon={Network} title="Localhost required" text="Run npm run dev in the repository, then open http://localhost:3000." action={<Button onClick={onNew}><Plus />Return to chat</Button>} /></PageFrame>;
  if (!status) return <PageFrame eyebrow="Windows-first local renderer" title="Local AI Engine" description="Continuity Studio is the interface; ComfyUI remains a hidden loopback execution backend." action={<Button variant="outline" onClick={onRefresh}><RefreshCw />Retry connection</Button>}><EmptyCollection icon={Network} title="Runtime manager offline" text="Start the Studio with npm run dev so the loopback runtime manager starts on 127.0.0.1:4318." /></PageFrame>;
  const missingComponents = status.components.filter((item) => !item.installed);
  const missingModels = status.models.filter((item) => !item.installed);
  const blockingFindings = status.workflows.flatMap((workflow) => workflow.findings ?? []).filter((finding) => finding.severity === 'blocking');
  const gpu = status.system.gpu.devices[0];
  const gb = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  const readiness = [
    ['ComfyUI', status.engine.connected ? 'Connected' : 'Not connected'],
    ['MiniMax H3', status.models.some((model) => /h3/i.test(model.id) && model.installed) ? 'Installed' : 'Missing'],
    ['H3 Ref2VA', status.models.some((model) => /ref2va/i.test(model.id) && model.installed) ? 'Installed' : 'Missing'],
    ['H3 Contex Loop', status.components.some((component) => /context-loop/i.test(component.id) && component.installed) ? 'Ready' : 'Missing'],
    ['Krea 2', status.models.some((model) => /krea2/i.test(model.id) && model.installed) ? 'Installed' : 'Missing'],
    ['Krea Multi Shot', status.components.some((component) => /krea-multishot/i.test(component.id) && component.installed) ? 'Ready' : 'Missing'],
    ['FFmpeg', status.system.ffmpeg.available ? 'Ready' : 'Missing'],
    ['GPU', gpu ? `${gpu.name}${gpu.memoryTotalMb ? ` · ${(gpu.memoryTotalMb / 1024).toFixed(0)} GB` : ''}` : 'Not detected'],
    ['Models', `${status.models.length - missingModels.length}/${status.models.length} present`],
  ];
  return <PageFrame eyebrow="Windows-first local renderer" title="Local AI Engine" description="Studio manages the pinned local production stack over loopback. It never reports a component ready until installation, model, workflow, and live schema checks agree." action={<div className="flex gap-2"><Badge variant="outline" className={statusClass(capability === 'ready' ? 'Ready' : capability === 'offline' ? 'Failed' : 'Blocked')}>{capability}</Badge><Button variant="outline" onClick={onRefresh}><RefreshCw />Refresh</Button></div>}>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-border bg-card/55 p-5 lg:col-span-2"><div className="flex items-start justify-between"><div><p className="eyebrow">Readiness</p><h2 className="mt-2 text-lg font-medium">Local production stack</h2></div><span className={cn('size-2 rounded-full', status.engine.connected ? 'bg-emerald-400' : 'bg-amber-400')} /></div><div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">{readiness.map(([label, value]) => <StatusLine key={label} label={label} value={value} />)}</div></section>
      <section className="rounded-2xl border border-border bg-card/55 p-5"><p className="eyebrow">Machine</p><h2 className="mt-2 text-lg font-medium">{gpu?.name ?? 'No NVIDIA GPU detected'}</h2><div className="mt-4 space-y-2 text-xs text-muted-foreground"><StatusLine label="System RAM" value={gb(status.system.ram.totalBytes)} /><StatusLine label="Preset" value={status.system.preset?.name ?? status.system.preset?.id ?? 'Fallback'} /><StatusLine label="Python" value={status.system.python.available ? 'Ready' : 'Missing'} /><StatusLine label="FFmpeg" value={status.system.ffmpeg.available ? 'Ready' : 'Missing'} /></div></section>
    </div>
    <section className="mt-4 rounded-2xl border border-border bg-card/55 p-5"><div className="flex flex-wrap gap-2"><Button disabled={working || status.engine.connected} onClick={() => onAction('start')}><Play />Start Engine</Button><Button disabled={working || !status.engine.connected || !status.engine.managedByStudio} variant="outline" onClick={() => onAction('stop')}>Stop</Button><Button disabled={working} variant="outline" onClick={() => onAction('restart')}><RefreshCw />Restart</Button><Button disabled={working} variant="outline" onClick={() => onAction('test')}><Network />Test Connection</Button><Button disabled={working || !missingComponents.length} variant="outline" onClick={onInstall}><Download />Install Missing ({missingComponents.length})</Button><Button disabled={working || !status.models.some((model) => model.installed)} variant="outline" onClick={onVerifyModels}><ShieldCheck />Verify Models</Button><Button disabled={working} variant="outline" onClick={() => onAction('diagnostics')}><Settings />Run Diagnostics</Button><Button variant="ghost" onClick={() => window.open(status.configuration.comfyBaseUrl, '_blank', 'noopener,noreferrer')}>Open Advanced ComfyUI</Button></div><p className="mt-3 text-[10px] leading-4 text-muted-foreground">Install and update operations use only allowlisted repositories and pinned commits. Large model weights are never downloaded without an explicit model action.</p></section>
    {blockingFindings.length > 0 && <section className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/5 p-5"><p className="eyebrow text-rose-200">Blocking workflow findings</p><div className="mt-3 space-y-2">{blockingFindings.map((finding, index) => <p key={`${finding.message}:${index}`} className="text-xs leading-5 text-rose-100/85">{finding.message}</p>)}</div></section>}
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card/55 p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Pinned components</p><h2 className="mt-2 font-medium">{status.components.length - missingComponents.length}/{status.components.length} installed</h2></div><Badge variant="outline">License-aware</Badge></div><div className="mt-4 max-h-80 space-y-2 overflow-auto">{status.components.map((component) => <div key={component.id} className="rounded-xl border border-border bg-background/45 p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-medium">{component.name}</p><Badge variant="outline" className={statusClass(component.status)}>{component.status}</Badge></div><p className="mt-2 truncate font-mono text-[9px] text-muted-foreground">{component.pinnedCommit ?? component.license ?? component.error ?? 'System component'}</p></div>)}</div></section>
      <section className="rounded-2xl border border-border bg-card/55 p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Model manifest</p><h2 className="mt-2 font-medium">{status.models.length - missingModels.length}/{status.models.length} present</h2></div><Badge variant="outline">External weights</Badge></div><div className="mt-4 max-h-80 space-y-2 overflow-auto">{status.models.map((model) => <div key={model.id} className="rounded-xl border border-border bg-background/45 p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-medium">{model.name}</p><Badge variant="outline" className={statusClass(model.status)}>{model.status}</Badge></div><p className="mt-2 truncate font-mono text-[9px] text-muted-foreground">{model.path}</p></div>)}</div></section>
    </div>
    <details className="mt-4 rounded-xl border border-border px-4 py-3"><summary className="cursor-pointer text-sm font-medium">Advanced paths, operations, and backend versions</summary><div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2"><StatusLine label="Runtime" value={status.configuration.runtimeRoot} /><StatusLine label="ComfyUI" value={status.configuration.comfyRoot} /><StatusLine label="Manager" value={`v${status.version}`} /><StatusLine label="Operations" value={String(status.operations.length)} /></div></details>
  </PageFrame>;
}

function ExportsView({ project, onExport, onAssetExport, onNew }: { project: StudioProject | null; onExport: () => void; onAssetExport: () => void; onNew: () => void }) {
  return <PageFrame eyebrow="Preserve the production" title="Exports" description="Download the complete project or one clean, flat, permanently numbered asset folder for your video generator.">
    {!project ? <EmptyCollection icon={Archive} title="No active movie" text="Open a movie before preparing its production package." action={<Button onClick={onNew}><Plus />Create a movie</Button>} /> : <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-amber-300/20 bg-card/55 p-5"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Download className="size-6" /></span><div><h2 className="font-medium">{project.flatAssetFolder.folderName}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">All approved generated visual assets together in one folder. No character, location, prop, category, or sequence subfolders.</p></div></div><div className="mt-5 flex flex-wrap gap-2"><Badge variant="outline">001 → final asset</Badge><Badge variant="outline">No subfolders</Badge><Badge variant="outline">Seedance-ready order</Badge></div><Button className="mt-6" onClick={onAssetExport}><Download />Download all assets</Button></div>
      <div className="rounded-2xl border border-border bg-card/55 p-5"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground"><FileArchive className="size-6" /></span><div><h2 className="font-medium">{project.title} · Full Project</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Story, World Bible, prompts, continuity, references, reports, and the same flat numbered generated-asset folder.</p></div></div><div className="mt-5 flex flex-wrap gap-2"><Badge variant="outline">No API keys</Badge><Badge variant="outline">Original references</Badge><Badge variant="outline">Version history</Badge></div><Button className="mt-6" variant="outline" onClick={onExport}><FileArchive />Download full project</Button></div>
    </div>}
  </PageFrame>;
}

function AdvancedControlView({ project, working, onAction, onCleanup, onNew }: { project: StudioProject | null; working: boolean; onAction: (message: string) => void; onCleanup: () => void; onNew: () => void }) {
  const [storage, setStorage] = useState<{ totalBytes: number; originalBytes: number; generatedBytes: number; previewBytes: number; cleanupCandidates: Array<{ id: string }> } | null>(null);
  useEffect(() => {
    if (!project) return;
    void (async () => {
      try {
        const response = await fetch(`/api/storage?projectId=${encodeURIComponent(project.id)}`, { cache: 'no-store' });
        const data = await response.json() as { report?: typeof storage };
        setStorage(data.report ?? null);
      } catch { setStorage(null); }
    })();
  }, [project, project?.storageRevision]);
  if (!project) return <PageFrame eyebrow="Optional diagnostics" title="Advanced Control" description="Relationships, confidence, lifecycle, comparisons, and storage stay behind this screen so everyday production remains chat-first."><EmptyCollection icon={Network} title="No active movie" text="Open a movie to inspect its production graph." action={<Button onClick={onNew}><Plus />Create a movie</Button>} /></PageFrame>;
  const machine = project.production.control.stateMachine;
  const blockers = project.production.control.warnings.filter((warning) => warning.severity === 'Blocker');
  const recommendations = project.production.control.warnings.filter((warning) => warning.severity === 'Recommendation');
  const orphaned = project.production.control.orphanAssets.filter((finding) => finding.status === 'Orphaned');
  const lowConfidence = project.production.control.relationshipConfidence.filter((finding) => finding.reviewRequired);
  const sequenceComparisons = project.production.control.comparisons.sequences.filter((comparison) => comparison.versions.length > 1 || comparison.versions.some((version) => version.mediaKey));
  const assetComparisons = project.production.control.comparisons.assets.filter((comparison) => comparison.versions.length > 1);
  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return <PageFrame eyebrow="Optional diagnostics" title="Advanced Control" description="Inspect the authoritative state machine, dependency graph, pins, inference confidence, version choices, and safe storage without moving these controls into the normal chat workflow." action={<Button variant="outline" onClick={() => onAction('repair this project')}><RefreshCw />Repair project</Button>}>
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-2xl border border-border bg-card/55 p-5 xl:col-span-2">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Strict state machine</p><h2 className="mt-2 text-lg font-medium">{machine.current}</h2></div><Badge variant="outline" className={statusClass(machine.blockers.length ? 'Blocked' : 'Ready')}>{machine.blockers.length ? `${machine.blockers.length} blockers` : 'Legal'}</Badge></div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{['Story Draft', 'Story Approved', 'Assets Pending', 'Assets Approved', 'Sequences Ready', 'Production Started', 'Final Review', 'Completed'].map((state) => <div key={state} className={cn('rounded-xl border px-3 py-3 text-xs', state === machine.current ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-border bg-background/45 text-muted-foreground')}>{state}</div>)}</div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground"><span className="text-foreground">Legal now:</span> {machine.legalActions.join(', ')}. {machine.allowedNext.length ? `Next state: ${machine.allowedNext.join(', ')}.` : 'Terminal state.'}</p>
      </section>
      <section className="rounded-2xl border border-border bg-card/55 p-5"><p className="eyebrow">Storage</p><h2 className="mt-2 text-lg font-medium">{storage ? mb(storage.totalBytes) : 'Calculating…'}</h2><div className="mt-4 space-y-2 text-xs text-muted-foreground"><StatusLine label="Originals" value={storage ? mb(storage.originalBytes) : '—'} /><StatusLine label="Generated" value={storage ? mb(storage.generatedBytes) : '—'} /><StatusLine label="Previews" value={storage ? mb(storage.previewBytes) : '—'} /></div><Button className="mt-5 w-full" variant="outline" disabled={working || !storage?.cleanupCandidates.length} onClick={onCleanup}><Archive />Safe cleanup {storage?.cleanupCandidates.length ? `(${storage.cleanupCandidates.length})` : ''}</Button><p className="mt-3 text-[11px] leading-5 text-muted-foreground">Originals, approved files, provenance sources, and recovery points are always protected.</p></section>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card/55 p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Warnings</p><h2 className="mt-2 font-medium">Blockers vs recommendations</h2></div><ShieldCheck className="size-5 text-amber-200" /></div><div className="mt-4 space-y-2">{[...blockers.slice(0, 5), ...recommendations.slice(0, 5)].map((warning) => <div key={warning.id} className="rounded-xl border border-border bg-background/45 p-3"><div className="flex items-center gap-2"><Badge variant="outline" className={statusClass(warning.severity === 'Blocker' ? 'Blocked' : 'Ready')}>{warning.severity}</Badge><span className="text-xs text-muted-foreground">{warning.scope}</span></div><p className="mt-2 text-xs leading-5">{warning.message}</p></div>)}</div><p className="mt-4 text-xs text-muted-foreground">{lowConfidence.length} inferred relationship{lowConfidence.length === 1 ? '' : 's'} await review; every inference remains editable and unlocked.</p></section>
      <section className="rounded-2xl border border-border bg-card/55 p-5"><p className="eyebrow">Permanent controls</p><h2 className="mt-2 font-medium">Pins, retirement, and orphans</h2><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-background/45 p-3"><p className="text-xl font-medium">{project.production.control.decisionPins.filter((pin) => pin.status === 'Active').length}</p><p className="mt-1 text-[10px] text-muted-foreground">Active pins</p></div><div className="rounded-xl bg-background/45 p-3"><p className="text-xl font-medium">{project.assets.filter((asset) => asset.lifecycleStatus === 'Retired').length}</p><p className="mt-1 text-[10px] text-muted-foreground">Retired</p></div><div className="rounded-xl bg-background/45 p-3"><p className="text-xl font-medium">{orphaned.length}</p><p className="mt-1 text-[10px] text-muted-foreground">Orphaned</p></div></div><div className="mt-4 space-y-2">{project.production.control.decisionPins.filter((pin) => pin.status === 'Active').slice(0, 5).map((pin) => <div key={pin.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><Lock className="size-3.5 text-amber-200" /><span className="truncate">{pin.targetType} · {pin.targetId}</span></div>)}{orphaned.slice(0, 4).map((finding) => <div key={finding.assetId} className="rounded-lg border border-rose-400/15 px-3 py-2 text-xs">Asset {assetNumber(finding.assetNumber)} · {finding.name} · orphaned</div>)}</div></section>
    </div>
    <section className="mt-4 rounded-2xl border border-border bg-card/55 p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Visual dependency viewer</p><h2 className="mt-2 font-medium">Story → assets → sequences → prompts → continuity</h2></div><Network className="size-5 text-sky-200" /></div><div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{project.production.dependencies.slice(0, 18).map((dependency) => <div key={dependency.id} className="rounded-xl border border-border bg-background/45 p-3 text-xs"><p className="truncate font-medium">{dependency.sourceId} → {dependency.targetId}</p><p className="mt-1 text-muted-foreground">{dependency.relationship}</p><Badge variant="outline" className={cn('mt-2', statusClass(dependency.freshness))}>{dependency.freshness}</Badge></div>)}</div></section>
    <section className="mt-4 rounded-2xl border border-border bg-card/55 p-5"><p className="eyebrow">Side-by-side version choices</p><h2 className="mt-2 font-medium">Sequence and asset comparisons</h2>{sequenceComparisons.length + assetComparisons.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{[...sequenceComparisons, ...assetComparisons].slice(0, 12).map((comparison) => <div key={`${comparison.targetType}:${comparison.targetId}`} className="rounded-xl border border-border bg-background/45 p-3"><div className="flex items-center justify-between"><p className="text-xs font-medium">{comparison.targetId}</p><Badge variant="outline">{comparison.targetType}</Badge></div><div className="mt-3 flex gap-2 overflow-x-auto">{comparison.versions.map((version) => <div key={version.version} className={cn('min-w-32 rounded-lg border p-2 text-[11px]', version.version === comparison.approvedVersion ? 'border-emerald-400/30 bg-emerald-400/8' : 'border-border')}><p className="font-medium">V{String(version.version).padStart(2, '0')}</p><p className="mt-1 text-muted-foreground">{version.status}</p><p className="mt-1 truncate text-muted-foreground">{version.model}</p></div>)}</div></div>)}</div> : <p className="mt-4 text-xs text-muted-foreground">Regenerated assets and sequence results will appear here for side-by-side approval.</p>}</section>
  </PageFrame>;
}

function SettingsView({ project, capabilities, lightMode, setLightMode, onUpdate, onAdvanced }: { project: StudioProject | null; capabilities: RuntimeCapabilities; lightMode: boolean; setLightMode: (value: boolean) => void; onUpdate: (settings: Partial<StudioProject['settings']>) => void; onAdvanced: () => void }) {
  const settingSections = [
    { title: 'Studio access', icon: Sparkles, description: capabilities.codexBrain === 'connected' ? 'Live Codex reasoning is connected through the local Codex app-server. It uses the Codex environment you already authorized; Continuity Studio has no separate sign-in.' : 'No Continuity Studio sign-in is required. Start the local Codex brain host to replace the deterministic fallback with live reasoning.', control: <Badge variant="outline" className={capabilities.codexBrain === 'connected' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/20 bg-amber-400/10 text-amber-200'}>{capabilities.codexBrain === 'connected' ? 'Codex connected' : capabilities.codexBrain === 'checking' ? 'Checking Codex' : 'Fallback active'}</Badge> },
    { title: 'Approval behavior', icon: ShieldCheck, description: 'Choose how non-paid planning advances. Generation remains separately protected.', control: <select aria-label="Approval behavior" disabled={!project} value={project?.settings.approvalMode ?? 'automatic'} onChange={(event) => { const approvalMode = event.target.value as StudioProject['settings']['approvalMode']; onUpdate({ approvalMode, automaticMode: approvalMode === 'automatic', pipelineApprovalGranted: false }); }} className="h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none"><option value="automatic">Automatic</option><option value="master">Master</option><option value="manual">Manual</option></select> },
    { title: 'Image Generation', icon: ImageIcon, description: capabilities.imageGeneration ? 'OpenAI GPT Image is available for explicit composite-sheet requests. References are sent only after that request.' : 'No server-side image provider key is configured. Prompts and references remain safe.', control: <Badge variant="outline" className={capabilities.imageGeneration ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : ''}>{capabilities.imageGeneration ? 'GPT Image ready' : 'Not connected'}</Badge> },
    { title: 'Local AI Engine', icon: Network, description: 'ComfyUI, Krea 2, MiniMax H3, Ref2VA, Contex Loop, and FFmpeg run behind Studio on localhost. Readiness is validated, never assumed.', control: <Badge variant="outline" className={statusClass(capabilities.localRuntime === 'ready' ? 'Ready' : capabilities.localRuntime === 'offline' ? 'Failed' : 'Blocked')}>{capabilities.localRuntime}</Badge> },
    { title: 'Video Generation', icon: Film, description: 'Canonical sequence intentions compile to MiniMax H3 or Seedance. Verified provider capabilities control audiovisual output; Studio never creates a separate audio asset workflow.', control: <Badge variant="outline" className="border-amber-400/20 bg-amber-400/10 text-amber-200">Explicit only</Badge> },
    { title: 'Storage', icon: Upload, description: 'Structured project memory and original media are stored separately and isolated by project ID.', control: <Badge variant="outline">Private</Badge> },
    { title: 'Appearance', icon: lightMode ? Sun : Moon, description: 'Choose the interface contrast for this device.', control: <Switch checked={lightMode} onCheckedChange={setLightMode} /> },
    { title: 'Privacy', icon: Lock, description: 'Media is sent to a provider only when you request generation. API keys never enter exports.', control: <Switch checked={project?.settings.privacyMode ?? true} onCheckedChange={(checked) => onUpdate({ privacyMode: checked })} disabled={!project} /> },
  ];
  return <PageFrame eyebrow="Quiet controls" title="Settings" description="Provider connections and production defaults stay away from the main filmmaking conversation."><div className="max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/55">{settingSections.map(({ title, icon: Icon, description, control }) => <div key={title} className="flex items-center gap-4 p-4 sm:p-5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{control}</div>)}</div><details className="mt-5 max-w-3xl rounded-xl border border-border px-4 py-3"><summary className="cursor-pointer text-sm font-medium">Advanced</summary><p className="mt-3 text-xs leading-5 text-muted-foreground">Provider adapter settings, model preferences, aspect ratio, resolution, storage policy, export policy, and negative rules are available through project chat or a connected provider.</p>{project && <Button className="mt-3" size="sm" variant="outline" onClick={onAdvanced}><Network />Open Advanced Control</Button>}</details></PageFrame>;
}

function EmptyCollection({ icon: Icon, title, text, action }: { icon: typeof Library; title: string; text: string; action?: React.ReactNode }) {
  return <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 px-6 text-center"><span className="grid size-11 place-items-center rounded-xl bg-secondary text-muted-foreground"><Icon className="size-5" /></span><h2 className="mt-4 text-sm font-medium">{title}</h2><p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{text}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
