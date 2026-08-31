'use client';

import * as React from 'react';
import {
  Settings,
  Database,
  FolderOpen,
  Github,
  Cpu,
  Moon,
  Sun,
  Bell,
  Trash2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@research-os/ui';

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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${value ? 'bg-primary' : 'bg-muted'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [apiHost, setApiHost] = React.useState('127.0.0.1');
  const [apiPort, setApiPort] = React.useState('8765');
  const [apiStatus, setApiStatus] = React.useState<'idle' | 'checking' | 'connected' | 'failed'>('idle');
  const [autoStartSidecar, setAutoStartSidecar] = React.useState(true);
  const [showNotifications, setShowNotifications] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [autoBackup, setAutoBackup] = React.useState(true);

  React.useEffect(() => setMounted(true), []);

  const checkApiConnection = async () => {
    setApiStatus('checking');
    try {
      const res = await fetch(`http://${apiHost}:${apiPort}/api/v1/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) setApiStatus('connected');
      else setApiStatus('failed');
    } catch {
      setApiStatus('failed');
    }
  };

  const statusColors = {
    idle: 'text-muted-foreground',
    checking: 'text-amber-500',
    connected: 'text-emerald-500',
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

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12 min-w-0">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Settings</h1>
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
          <SettingRow label="Connection Status">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-medium ${statusColors[apiStatus]}`}>
                {statusLabels[apiStatus]}
              </span>
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
          <SettingRow label="Auto-start sidecar" description="Launch FastAPI server when app starts">
            <Toggle value={autoStartSidecar} onChange={setAutoStartSidecar} />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Database</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="Database Path" description="Local SQLite database file location">
            <Button size="sm" variant="outline" className="h-7 text-[11px]">
              <FolderOpen className="w-3 h-3 mr-1" />
              Browse
            </Button>
          </SettingRow>
          <SettingRow label="Auto-backup" description="Daily backup to storage/backups/">
            <Toggle value={autoBackup} onChange={setAutoBackup} />
          </SettingRow>
          <SettingRow label="Vacuum Database" description="Reclaim space and optimize queries">
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-amber-600 dark:text-amber-400">
              Run VACUUM
            </Button>
          </SettingRow>
          <SettingRow label="Reset Database" description="Wipe all data and re-seed from scratch">
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive">
              <Trash2 className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            {mounted && resolvedTheme === 'light' ? (
              <Sun className="w-4 h-4 text-primary" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
            <span>Appearance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow
            label="Theme"
            description={`Current: ${appearanceLabel}. Choose light, dark, or follow system.`}
          >
            <div className="flex items-center gap-1 rounded-xl border border-border p-0.5">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize transition-colors ${
                    currentTheme === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Reduce Motion" description="Disable animations and transitions">
            <Toggle value={reducedMotion} onChange={setReducedMotion} />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="Desktop Notifications" description="Habit reminders, study session prompts">
            <Toggle value={showNotifications} onChange={setShowNotifications} />
          </SettingRow>
          <SettingRow label="Sound Effects" description="Timer and notification sounds">
            <Toggle value={soundEnabled} onChange={setSoundEnabled} />
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
          <SettingRow label="Health">
            <span className="flex items-center text-[11px] text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Local engine online
            </span>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}
