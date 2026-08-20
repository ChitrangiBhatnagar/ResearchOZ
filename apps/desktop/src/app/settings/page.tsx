'use client';

import * as React from 'react';
import {
  Settings,
  Database,
  FolderOpen,
  Github,
  Cpu,
  Moon,
  Bell,
  Trash2,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@research-os/ui';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 border-b border-zinc-800/60 last:border-0">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-medium text-zinc-200">{label}</p>
        {description && <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${value ? 'bg-indigo-600' : 'bg-zinc-700'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [apiHost, setApiHost] = React.useState('127.0.0.1');
  const [apiPort, setApiPort] = React.useState('8765');
  const [apiStatus, setApiStatus] = React.useState<'idle' | 'checking' | 'connected' | 'failed'>('idle');
  const [autoStartSidecar, setAutoStartSidecar] = React.useState(true);
  const [showNotifications, setShowNotifications] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [autoBackup, setAutoBackup] = React.useState(true);

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
    idle: 'text-zinc-500',
    checking: 'text-amber-400',
    connected: 'text-emerald-400',
    failed: 'text-red-400',
  };

  const statusLabels = {
    idle: 'Not checked',
    checking: 'Checking...',
    connected: 'Connected',
    failed: 'Unreachable',
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Settings</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Configure your ResearchOS environment.</p>
      </div>

      {/* AI Backend */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>AI Backend (FastAPI Sidecar)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="API Host" description="FastAPI sidecar service address">
            <Input
              value={apiHost}
              onChange={(e) => setApiHost(e.target.value)}
              className="w-36 h-7 text-xs bg-zinc-900 border-zinc-700 text-center font-mono"
            />
          </SettingRow>
          <SettingRow label="API Port" description="Default: 8765">
            <Input
              value={apiPort}
              onChange={(e) => setApiPort(e.target.value)}
              className="w-24 h-7 text-xs bg-zinc-900 border-zinc-700 text-center font-mono"
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
                className="h-7 text-[11px] border-zinc-700"
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

      {/* Database */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Database</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="Database Path" description="Local SQLite database file location">
            <Button size="sm" variant="outline" className="h-7 text-[11px] border-zinc-700">
              <FolderOpen className="w-3 h-3 mr-1" />
              Browse
            </Button>
          </SettingRow>
          <SettingRow label="Auto-backup" description="Daily backup to storage/backups/">
            <Toggle value={autoBackup} onChange={setAutoBackup} />
          </SettingRow>
          <SettingRow label="Vacuum Database" description="Reclaim space and optimize queries">
            <Button size="sm" variant="outline" className="h-7 text-[11px] border-zinc-700 text-amber-400 border-amber-900/40">
              Run VACUUM
            </Button>
          </SettingRow>
          <SettingRow label="Reset Database" description="Wipe all data and re-seed from scratch">
            <Button size="sm" variant="outline" className="h-7 text-[11px] border-red-900/40 text-red-400 hover:bg-red-950/30">
              <Trash2 className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Moon className="w-4 h-4 text-zinc-400" />
            <span>Appearance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="Theme" description="ResearchOS uses a fixed dark theme optimized for long coding sessions">
            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">
              Dark (Zinc-950)
            </Badge>
          </SettingRow>
          <SettingRow label="Reduce Motion" description="Disable animations and transitions">
            <Toggle value={reducedMotion} onChange={setReducedMotion} />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Bell className="w-4 h-4 text-amber-400" />
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

      {/* About */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>About</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingRow label="Version">
            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">v0.1.0</Badge>
          </SettingRow>
          <SettingRow label="Runtime">
            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">Electron 34 + Next.js 15</Badge>
          </SettingRow>
          <SettingRow label="Source Code">
            <a
              href="https://github.com/ChitrangiBhatnagar/ResearchOZ"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
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
