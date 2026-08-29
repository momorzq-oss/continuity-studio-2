'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Clapperboard,
  Compass,
  Copy,
  Download,
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
import { cn } from '@/lib/utils';
import type { ProjectSummary, StudioAsset, StudioMessage, StudioProject, StudioSequence } from '@/lib/studio';

type View = 'chat' | 'projects' | 'assets' | 'exports' | 'advanced' | 'settings';

const primaryNavigation = [
  { id: 'projects' as const, label: 'Projects', icon: FolderClock },
  { id: 'assets' as const, label: 'Asset Library', icon: Library },
  { id: 'exports' as const, label: 'Exports', icon: Archive },
  { id: 'advanced' as const, label: 'Advanced Control', icon: Network },
];

const assetFilters = ['All', 'Characters', 'Creatures', 'Animals', 'Locations', 'Interiors', 'Environment States', 'Vehicles', 'Props', 'Weapons', 'Costumes', 'Furniture', 'Mechanical Systems', 'Approved', 'Pending', 'Needs Review', 'Retired', 'Orphaned'];

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
  const dependencyImpacts = project.production.dependencies.filter((item) => item.freshness !== 'Current').length;
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
            <StatusLine label="Story lock" value={project.production.storyLock.status} />
            <StatusLine label="World Bible" value={project.worldBible.status} />
            <StatusLine label="Film Bible" value={project.filmBible.status} />
            <StatusLine label="Assets" value={`${approvedAssets}/${project.assets.length}`} />
            <StatusLine label="Asset folder" value={project.flatAssetFolder.folderName} />
            <StatusLine label="Sequences" value={`${approvedSequences}/${project.sequenceCount}`} />
            <StatusLine label="Dependencies" value={dependencyImpacts ? `${dependencyImpacts} affected` : 'Current'} />
            <StatusLine label="Render queue" value={`${project.production.renderQueue.length} jobs`} />
            <StatusLine label="Pipeline" value={project.production.currentPipelineStage} />
            <StatusLine label="Project state" value={project.production.control.stateMachine.current} />
            <StatusLine label="Current" value={`Sequence ${project.currentSequence}`} />
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

function StoryCard({ project, onAction }: { project: StudioProject; onAction: (message: string) => void }) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/65">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="size-4 text-amber-300" />
          <span className="text-sm font-medium">Story · v{project.story.version}</span>
        </div>
        <Badge variant="outline" className={statusClass(project.story.status)}>{project.story.status}</Badge>
      </div>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Logline</p>
          <p className="leading-6 text-foreground/90">{project.story.logline}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-background/55 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Midpoint</p>
            <p className="mt-1.5 text-xs leading-5 text-foreground/80">{project.story.midpoint}</p>
          </div>
          <div className="rounded-xl bg-background/55 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ending</p>
            <p className="mt-1.5 text-xs leading-5 text-foreground/80">{project.story.ending}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border/70 bg-background/35 px-4 py-3">
        {project.story.status !== 'Approved' && <Button size="sm" onClick={() => onAction('Approve the story')}><Check />Approve story</Button>}
        <Button size="sm" variant="outline" onClick={() => onAction('Make it scarier')}>Make scarier</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction('Continue')}>Continue</Button>
      </div>
    </section>
  );
}

function BibleCard({ project, onAction }: { project: StudioProject; onAction: (message: string) => void }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5"><Clapperboard className="size-4 text-amber-300" /><span className="text-sm font-medium">Film Bible · v{project.filmBible.version}</span></div>
        <Badge variant="outline" className={statusClass(project.filmBible.status)}>{project.filmBible.status}</Badge>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <RuleGroup title="Visual direction" rules={[project.visualStyle, project.cameraStyle, project.lightingDirection]} />
        <RuleGroup title="Continuity rules" rules={project.filmBible.continuityRules} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-3">
        {project.filmBible.status !== 'Approved' && <Button size="sm" onClick={() => onAction('Approve the Film Bible')}><Check />Approve Film Bible</Button>}
        <Button size="sm" variant="outline" onClick={() => onAction('Change the entire movie to night only')}>Night only</Button>
      </div>
    </section>
  );
}

function WorldCard({ project, onAction }: { project: StudioProject; onAction: (message: string) => void }) {
  const world = project.worldBible;
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/65">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2.5"><Compass className="size-4 text-amber-300" /><span className="text-sm font-medium">World Bible · v{world.version}</span></div>
        <Badge variant="outline" className={statusClass(world.status)}>{world.status}</Badge>
      </div>
      <div className="grid gap-3 p-4 text-xs sm:grid-cols-3">
        <StateBlock label="World" value={`${world.geography} · ${world.historicalPeriod}`} />
        <StateBlock label="Technology" value={world.technologyLevel} />
        <StateBlock label="Culture" value={world.culture} />
      </div>
      <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3">
        <RuleGroup title="Materials & architecture" rules={[...world.architecture, ...world.constructionMaterials]} />
        <RuleGroup title="Physical-world restrictions" rules={[...world.physicalRules, ...world.restrictions]} />
        <RuleGroup title="Single flat asset folder" rules={world.objectRules.slice(0, 3)} />
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border/70 bg-background/35 px-4 py-3">
        {world.status !== 'Approved' && <Button size="sm" onClick={() => onAction('Approve the World Bible')}><Check />Approve World Bible</Button>}
        <Button size="sm" variant="outline" onClick={() => onAction('Show environment states')}>Environment states</Button>
      </div>
    </section>
  );
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

function SequenceCard({ project, sequence, onAction }: { project: StudioProject; sequence: StudioSequence; onAction: (message: string) => void }) {
  const copyPrompt = async () => navigator.clipboard.writeText(sequence.prompt);
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
          <StateBlock label="Dialogue & speaker lock" value={`${plan.dialogue.length} exact timed line${plan.dialogue.length === 1 ? '' : 's'} · Seedance generates sound in-video`} />
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
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border/70 bg-background/35 px-4 py-3">
        <Button size="sm" onClick={() => onAction(`Generate Sequence ${sequence.number}`)}><Play />Generate</Button>
        {sequence.status !== 'Approved' && <Button size="sm" variant="outline" onClick={() => onAction(`Approve Sequence ${sequence.number}`)}><Check />Approve</Button>}
        <Button size="sm" variant="ghost" onClick={() => onAction(`Show Scene State for Sequence ${sequence.number}`)}>Scene state</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction(`Show Scene Graph for Sequence ${sequence.number}`)}>Graph</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction(`Show timing and shot plan for Sequence ${sequence.number}`)}>Timing</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction(`Show reference package for Sequence ${sequence.number}`)}>References</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction(`Validate Sequence ${sequence.number}`)}>Validate</Button>
        <Button size="sm" variant="ghost" onClick={copyPrompt}><Copy />Copy prompt</Button>
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
  return <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Clapperboard className="size-4 text-amber-300" /><p className="text-sm font-medium">Dialogue & Seedance speaker lock</p></div><Badge variant="outline">{plan.dialogue.length ? `${plan.dialogue.length} bound` : 'No dialogue'}</Badge></div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">Continuity Studio stores exact text, timing, speaker identity, current appearance, action, listeners, and reactions. Seedance generates the spoken result inside the video; no separate sound asset is created.</p><div className="mt-4 space-y-2">{plan.dialogue.length ? plan.dialogue.map((line) => <div key={line.id} className="rounded-xl bg-background/55 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">Turn {line.turnOrder} · Asset {assetNumber(line.speakerAssetNumber)} · {line.speakerName}</span><span className="tabular-nums text-muted-foreground">{line.startSecond}–{line.endSecond}s</span></div><p className="mt-2 text-sm">“{line.exactDialogue}”</p><p className="mt-2 text-[10px] leading-5 text-muted-foreground">{line.language} · {line.dialect} · {line.emotion} · {line.expression} · {line.physicalAction}</p><p className="mt-1 font-mono text-[9px] leading-4 text-muted-foreground">References: {line.requiredVisualReferences.map((reference) => reference.assetNumber ? `Asset ${assetNumber(reference.assetNumber)}` : reference.fileName).join(', ')}</p></div>) : <p className="text-xs text-muted-foreground">No spoken dialogue is authored. Seedance may generate only the scenario’s ambience, effects, requested music, and intentional silence.</p>}</div></section>;
}

function ValidationCard({ project, sequence, onAction }: { project: StudioProject; sequence: StudioSequence; onAction: (message: string) => void }) {
  const report = project.production.validations.findLast((item) => item.sequenceNumber === sequence.number);
  if (!report) return <ProductionReadinessCard project={project} onAction={onAction} />;
  return <section className="mt-4 rounded-2xl border border-border bg-card/65 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-amber-300" /><p className="text-sm font-medium">{sequence.id} validation</p></div><Badge variant="outline" className={statusClass(report.status)}>{report.status}</Badge></div><div className="mt-4 space-y-2">{report.checks.map((check) => <div key={check.id} className="rounded-xl bg-background/55 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">{check.name}</span><Badge variant="outline" className={statusClass(check.status)}>{check.status}</Badge></div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">Expected: {check.expected}<br />Actual: {check.actual}</p></div>)}</div>{report.correctionInstruction && <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/5 p-3 text-[10px] leading-5 text-rose-100">Targeted correction: {report.correctionInstruction}</div>}</section>;
}

function MessageItem({ item, project, onAction, onOpenLibrary, onExport, onAssetExport }: { item: StudioMessage; project: StudioProject; onAction: (message: string) => void; onOpenLibrary: () => void; onExport: () => void; onAssetExport: () => void }) {
  if (item.role === 'user') {
    return <div className="ml-auto max-w-[82%] rounded-[18px_18px_5px_18px] bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground shadow-sm">{item.content}</div>;
  }
  const sequence = item.metadata?.sequenceNumber ? project.sequences.find((entry) => entry.number === item.metadata?.sequenceNumber) : undefined;
  return (
    <div className="max-w-full">
      <div className="flex gap-3">
        <span className="brand-mark mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"><Clapperboard className="size-3.5" /></span>
        <div className="min-w-0 flex-1"><p className="max-w-2xl text-sm leading-6 text-foreground/90">{item.content}</p>
          {item.metadata?.kind === 'story' && <StoryCard project={project} onAction={onAction} />}
          {item.metadata?.kind === 'world' && <WorldCard project={project} onAction={onAction} />}
          {item.metadata?.kind === 'bible' && <BibleCard project={project} onAction={onAction} />}
          {item.metadata?.kind === 'assets' && <AssetsCard project={project} ids={item.metadata.assetIds} onAction={onAction} onOpenLibrary={onOpenLibrary} />}
          {['sequence', 'timing', 'reference-package'].includes(item.metadata?.kind ?? '') && sequence && <SequenceCard project={project} sequence={sequence} onAction={onAction} />}
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
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('All');
  const [lightMode, setLightMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startNewMovie = useCallback(() => {
    setProject(null);
    setMessages([]);
    setDraft('');
    setFiles([]);
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

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/studio', { cache: 'no-store' });
        const data = await response.json() as { projects?: ProjectSummary[] };
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
    for (const file of selectedFiles) {
      const form = new FormData();
      form.append('projectId', nextProject.id);
      form.append('expectedRevision', String(nextProject.storageRevision));
      form.append('file', file);
      form.append('role', role);
      const response = await fetch('/api/files', { method: 'POST', body: form });
      const data = await response.json() as { project?: StudioProject; message?: StudioMessage; error?: string };
      if (!response.ok || !data.project) throw new Error(data.error || `“${file.name}” could not be stored.`);
      nextProject = data.project;
      if (data.message) uploadedMessages.push(data.message);
    }
    setProject(nextProject);
    setMessages((current) => [...current, ...uploadedMessages]);
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
    setWorking(true);
    setError('');
    try {
      const fallbackContent = selectedFiles.length ? 'Store these references in this project.' : '';
      const response = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project?.id, expectedRevision: project?.storageRevision, message: content || fallbackContent }),
      });
      const data = await response.json() as { project?: StudioProject; messages?: StudioMessage[]; projects?: ProjectSummary[]; error?: string; sideEffect?: string };
      if (!response.ok || !data.project) throw new Error(data.error || 'The instruction could not be applied.');
      setProject(data.project);
      setMessages((current) => project ? [...current, ...(data.messages ?? [])] : (data.messages ?? []));
      setProjects(data.projects ?? projects);
      if (selectedFiles.length) {
        const role = /my (photo|picture|image)|likeness|main character/i.test(content) ? 'Main character likeness reference' : 'Production reference';
        await uploadFiles(data.project, selectedFiles, role);
      }
      setDraft('');
      setFiles([]);
      if (data.sideEffect === 'export') window.setTimeout(() => downloadExport(data.project!.id), 300);
      if (data.sideEffect === 'asset-export') window.setTimeout(() => void downloadAssets(data.project!.id), 300);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The instruction could not be applied.');
    } finally {
      setWorking(false);
    }
  }, [downloadAssets, downloadExport, project, projects, uploadFiles, working]);

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

  const updateProject = async (body: Record<string, unknown>) => {
    if (!project) return;
    const response = await fetch('/api/studio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, expectedRevision: project.storageRevision, ...body }) });
    const data = await response.json() as { project?: StudioProject; projects?: ProjectSummary[]; error?: string };
    if (!response.ok || !data.project) throw new Error(data.error || 'The project could not be updated.');
    setProject(data.project);
    setProjects(data.projects ?? projects);
  };

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
          <ChatView project={project} messages={messages} working={working} error={error} onAction={onAction} onOpenLibrary={() => setView('assets')} onExport={() => downloadExport()} onAssetExport={() => void downloadAssets()} endRef={messagesEndRef} />
        ) : view === 'projects' ? (
          <ProjectsView projects={filteredProjects} search={search} setSearch={setSearch} searchRef={searchRef} onOpen={loadProject} onNew={startNewMovie} onImport={() => importInputRef.current?.click()} />
        ) : view === 'assets' ? (
          <AssetsView project={project} assets={filteredAssets} filter={assetFilter} setFilter={setAssetFilter} onAction={onAction} onAssetExport={() => void downloadAssets()} onNew={startNewMovie} />
        ) : view === 'exports' ? (
          <ExportsView project={project} onExport={() => downloadExport()} onAssetExport={() => void downloadAssets()} onNew={startNewMovie} />
        ) : view === 'advanced' ? (
          <AdvancedControlView project={project} working={working} onAction={onAction} onCleanup={() => void cleanupStorage()} onNew={startNewMovie} />
        ) : (
          <SettingsView project={project} lightMode={lightMode} setLightMode={(value) => { setLightMode(value); document.documentElement.classList.toggle('dark', !value); }} onUpdate={(settings) => void updateProject({ action: 'settings', settings })} />
        )}

        {view === 'chat' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-3 pb-3 pt-16 sm:px-6 sm:pb-5">
            <form onSubmit={onSubmit} className="composer pointer-events-auto mx-auto w-full max-w-[780px] rounded-[20px] border bg-card p-2.5 transition">
              {files.length > 0 && <div className="flex flex-wrap gap-1.5 px-2 pb-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px]"><Paperclip className="size-3" /><span className="max-w-40 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X className="size-3 text-muted-foreground hover:text-foreground" /></button></span>)}</div>}
              <label htmlFor="movie-idea" className="sr-only">{project ? 'Tell the studio what to do' : 'Describe your movie'}</label>
              <textarea ref={textareaRef} id="movie-idea" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder={project ? 'Ask for a change, show an asset, or continue the movie…' : 'Describe the movie you want to make…'} className="max-h-40 min-h-[54px] w-full resize-none bg-transparent px-2.5 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/65" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" multiple className="sr-only" accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={(event) => setFiles((current) => [...current, ...Array.from(event.target.files ?? [])])} />
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => fileInputRef.current?.click()} aria-label="Attach reference"><Paperclip className="size-[18px]" strokeWidth={1.7} /></Button>
                  {project && <span className="ml-1 hidden text-[10px] text-muted-foreground sm:inline">Try /assets, “show Asset 007”, “download all assets”</span>}
                </div>
                <Button type="submit" size="icon" disabled={working || (!draft.trim() && files.length === 0)} className="size-9 rounded-full" aria-label="Send instruction">{working ? <LoaderCircle className="animate-spin" /> : <ArrowUp className="size-[18px]" strokeWidth={2} />}</Button>
              </div>
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

function ChatView({ project, messages, working, error, onAction, onOpenLibrary, onExport, onAssetExport, endRef }: { project: StudioProject | null; messages: StudioMessage[]; working: boolean; error: string; onAction: (message: string) => void; onOpenLibrary: () => void; onExport: () => void; onAssetExport: () => void; endRef: React.RefObject<HTMLDivElement | null> }) {
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
        {messages.map((item) => <MessageItem key={item.id} item={item} project={project!} onAction={onAction} onOpenLibrary={onOpenLibrary} onExport={onExport} onAssetExport={onAssetExport} />)}
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

function SettingsView({ project, lightMode, setLightMode, onUpdate }: { project: StudioProject | null; lightMode: boolean; setLightMode: (value: boolean) => void; onUpdate: (settings: Partial<StudioProject['settings']>) => void }) {
  const settingSections = [
    { title: 'AI Brain', icon: Sparkles, description: 'Automatic Mode interprets instructions and chooses the normal next production step.', control: <Switch checked={project?.settings.automaticMode ?? true} onCheckedChange={(checked) => onUpdate({ automaticMode: checked })} disabled={!project} /> },
    { title: 'Image Generation', icon: ImageIcon, description: project?.settings.imageProvider === 'Not connected' ? 'No image provider connected. Prompts and references remain safe until you choose one.' : project?.settings.imageProvider ?? 'Not connected', control: <Badge variant="outline">Not connected</Badge> },
    { title: 'Video Generation', icon: Film, description: 'Provider-neutral Seedance packages adapt only after duration, resolution, reference count, in-video sound, prompt, image-to-video, and cost limits are known. No separate sound library exists.', control: <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-200">Package ready</Badge> },
    { title: 'Storage', icon: Upload, description: 'Structured project memory and original media are stored separately and isolated by project ID.', control: <Badge variant="outline">Private</Badge> },
    { title: 'Appearance', icon: lightMode ? Sun : Moon, description: 'Choose the interface contrast for this device.', control: <Switch checked={lightMode} onCheckedChange={setLightMode} /> },
    { title: 'Privacy', icon: Lock, description: 'Media is sent to a provider only when you request generation. API keys never enter exports.', control: <Switch checked={project?.settings.privacyMode ?? true} onCheckedChange={(checked) => onUpdate({ privacyMode: checked })} disabled={!project} /> },
  ];
  return <PageFrame eyebrow="Quiet controls" title="Settings" description="Provider connections and production defaults stay away from the main filmmaking conversation."><div className="max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/55">{settingSections.map(({ title, icon: Icon, description, control }) => <div key={title} className="flex items-center gap-4 p-4 sm:p-5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{control}</div>)}</div><details className="mt-5 max-w-3xl rounded-xl border border-border px-4 py-3"><summary className="cursor-pointer text-sm font-medium">Advanced</summary><p className="mt-3 text-xs leading-5 text-muted-foreground">Provider adapter settings, model preferences, aspect ratio, resolution, storage policy, export policy, and negative rules are available through project chat or a connected provider.</p></details></PageFrame>;
}

function EmptyCollection({ icon: Icon, title, text, action }: { icon: typeof Library; title: string; text: string; action?: React.ReactNode }) {
  return <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 px-6 text-center"><span className="grid size-11 place-items-center rounded-xl bg-secondary text-muted-foreground"><Icon className="size-5" /></span><h2 className="mt-4 text-sm font-medium">{title}</h2><p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{text}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
