'use client';

import * as React from 'react';
import {
  Settings,
  Database,
  Github,
  Cpu,
  Moon,
  Sun,
  Bell,
  Trash2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@research-os/ui';
import { REDUCE_MOTION_KEY, applyReducedMotion } from '../../components/theme-provider';
import { cn } from '@/lib/utils';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 border-b border-border/60 last:border-0 gap-4">
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  disabled,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
        value ? 'bg-primary' : 'bg-muted-foreground/25',
        !disabled && 'cursor-pointer'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-card shadow-sm transition-transform',
          value ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
}

function NotAvailable() {
  return (
    <Badge variant="outline" className="text-[9px]">
      Not available yet
    </Badge>
  );
}

type ActionState = { status: 'idle' | 'running' | 'done' | 'error'; message?: string };

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [apiHost, setApiHost] = React.useState('127.0.0.1');
  const [apiPort, setApiPort] = React.useState('8765');
  const [apiStatus, setApiStatus] = React.useState<'idle' | 'checking' | 'connected' | 'failed'>('idle');
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [dbInfo, setDbInfo] = React.useState<{ mode: string; location: string } | null>(null);
  const [vacuum, setVacuum] = React.useState<ActionState>({ status: 'idle' });
  const [reseed, setReseed] = React.useState<ActionState>({ status: 'idle' });
  const [confirmReseed, setConfirmReseed] = React.useState(false);
  const [engine, setEngine] = React.useState<{ sidecar: boolean; llm: boolean } | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setReducedMotion(window.localStorage.getItem(REDUCE_MOTION_KEY) === '1');
    fetch('/api/system/database')
      .then((r) => r.json())
      .then(setDbInfo)
      .catch(() => setDbInfo(null));
    fetch('/api/research/status')
      .then((r) => r.json())
      .then(setEngine)
      .catch(() => setEngine({ sidecar: false, llm: false }));
  }, []);

  const checkApiConnection = async () => {
    setApiStatus('checking');
    try {
      const res = await fetch(`http://${apiHost}:${apiPort}/api/v1/health`, {
        signal: AbortSignal.timeout(3000),
      });
      setApiStatus(res.ok ? 'connected' : 'failed');
    } catch {
      setApiStatus('failed');
    }
  };

  const runVacuum = async () => {
    setVacuum({ status: 'running' });
    try {
      const res = await fetch('/api/system/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vacuum' }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'VACUUM failed');
      setVacuum({ status: 'done', message: `Optimized in ${json.durationMs} ms` });
    } catch (err) {
      setVacuum({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const runReseed = async () => {
    setConfirmReseed(false);
    setReseed({ status: 'running' });
    try {
      const res = await fetch('/api/curriculum/import', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || 'Re-seed failed');
      setReseed({
        status: 'done',
        message: `Imported ${json.topicsCount} topics and ${json.papersCount} papers`,
      });
    } catch (err) {
      setReseed({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const toggleReducedMotion = (value: boolean) => {
    setReducedMotion(value);
    window.localStorage.setItem(REDUCE_MOTION_KEY, value ? '1' : '0');
    applyReducedMotion(value);
  };

  const statusColors = {
    idle: 'text-muted-foreground',
    checking: 'text-amber-600 dark:text-amber-400',
    connected: 'text-emerald-600 dark:text-emerald-400',
    failed: 'text-destructive',
  };

  const statusLabels = {
    idle: 'Not checked',
    checking: 'Checking...',
    connected: 'Connected',
    failed: 'Unreachable',
  };

  const currentTheme = mounted ? theme ?? 'system' : 'system';
  const appearanceLabel = mounted
    ? currentTheme === 'system'
      ? `System (${resolvedTheme})`
      : currentTheme
    : '…';

  const actionMessage = (state: ActionState) =>
    state.message ? (
      <p
        className={cn(
          'text-[10px] mt-1 text-right',
          state.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {state.message}
      </p>
    ) : null;

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12 min-w-0">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Configure your ResearchOS environment.</p>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Cpu className="w-4 h-4 text-primary" />
            <span>AI Backend (FastAPI Sidecar)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="API Host" description="FastAPI sidecar service address">
            <Input
              value={apiHost}
              onChange={(e) => setApiHost(e.target.value)}
              className="w-36 h-7 text-xs text-center font-mono"
            />
          </SettingRow>
          <SettingRow label="API Port" description="Default: 8765">
            <Input
              value={apiPort}
              onChange={(e) => setApiPort(e.target.value)}
              className="w-24 h-7 text-xs text-center font-mono"
              type="number"
            />
          </SettingRow>
          <SettingRow label="Connection Status" description="Checks the sidecar directly from this browser">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-medium ${statusColors[apiStatus]}`}>{statusLabels[apiStatus]}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={checkApiConnection}
                disabled={apiStatus === 'checking'}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${apiStatus === 'checking' ? 'animate-spin' : ''}`} />
                Test
              </Button>
            </div>
          </SettingRow>
          <SettingRow label="Research copilot model" description="Ollama powers explanations; sources work without it">
            <span
              className={cn(
                'text-xs font-medium',
                !engine
                  ? 'text-muted-foreground'
                  : engine.llm
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {!engine ? 'Checking…' : engine.llm ? 'Ready' : engine.sidecar ? 'Ollama offline' : 'Sidecar offline'}
            </span>
          </SettingRow>
          <SettingRow label="Auto-start sidecar" description="Launch FastAPI server when app starts">
            <NotAvailable />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Database className="w-4 h-4 text-primary" />
            <span>Database</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Database Location"
            description={
              dbInfo?.mode === 'remote'
                ? 'Hosted libSQL database (DATABASE_URL)'
                : dbInfo?.mode === 'demo'
                  ? 'Demo mode — changes do not persist'
                  : 'Local SQLite file · set DATABASE_PATH to change'
            }
          >
            <span className="block max-w-[14rem] truncate text-[11px] font-mono text-foreground/80" title={dbInfo?.location}>
              {dbInfo?.location ?? '…'}
            </span>
          </SettingRow>
          <SettingRow label="Auto-backup" description="Daily backup to storage/backups/">
            <NotAvailable />
          </SettingRow>
          <SettingRow label="Vacuum Database" description="Reclaim space and optimize queries">
            <div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => void runVacuum()}
                disabled={vacuum.status === 'running'}
              >
                {vacuum.status === 'running' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : vacuum.status === 'done' ? (
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                ) : null}
                {vacuum.status === 'running' ? 'Running…' : 'Run VACUUM'}
              </Button>
              {actionMessage(vacuum)}
            </div>
          </SettingRow>
          <SettingRow
            label="Re-seed from workbook"
            description="Replaces the roadmap and all papers (including fetched ones) with the master workbook"
          >
            <div>
              {confirmReseed ? (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => void runReseed()}>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setConfirmReseed(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] text-destructive hover:text-destructive"
                  onClick={() => setConfirmReseed(true)}
                  disabled={reseed.status === 'running'}
                >
                  {reseed.status === 'running' ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  {reseed.status === 'running' ? 'Re-seeding…' : 'Reset'}
                </Button>
              )}
              {actionMessage(reseed)}
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            {mounted && resolvedTheme === 'light' ? (
              <Sun className="w-4 h-4 text-primary" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
            <span>Appearance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Theme"
            description={`Current: ${appearanceLabel}. Choose light, dark, or follow system.`}
          >
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-0.5">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  aria-pressed={currentTheme === mode}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize transition-colors',
                    currentTheme === mode
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Reduce Motion" description="Disable animations and transitions">
            <Toggle value={reducedMotion} onChange={toggleReducedMotion} label="Reduce motion" />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Bell className="w-4 h-4 text-primary" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="Desktop Notifications" description="Habit reminders, study session prompts">
            <NotAvailable />
          </SettingRow>
          <SettingRow label="Sound Effects" description="Timer and notification sounds">
            <NotAvailable />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span>About</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="Version">
            <Badge variant="outline" className="text-[10px]">
              v0.1.0
            </Badge>
          </SettingRow>
          <SettingRow label="Runtime">
            <Badge variant="outline" className="text-[10px]">
              Electron 34 + Next.js 15
            </Badge>
          </SettingRow>
          <SettingRow label="Source Code">
            <a
              href="https://github.com/ChitrangiBhatnagar/ResearchOS"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}
