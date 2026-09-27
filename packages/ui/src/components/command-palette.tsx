import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import type { CommandPaletteAction } from '@research-os/types';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandPaletteAction[];
}

export function CommandPalette({ open, onOpenChange, actions }: CommandPaletteProps) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Group actions by category
  const categories = React.useMemo(() => {
    const grouped = new Map<string, CommandPaletteAction[]>();
    for (const action of actions) {
      const list = grouped.get(action.category) || [];
      list.push(action);
      grouped.set(action.category, list);
    }
    return grouped;
  }, [actions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-xl shadow-2xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <CommandPrimitive className="flex h-full w-full flex-col overflow-hidden rounded-xl">
          <div className="flex items-center border-b border-border/80 px-3">
            <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              placeholder="Type a command or search (Ctrl+K)..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-xs text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandPrimitive.List className="max-h-80 overflow-y-auto p-2 scrollbar-none">
            <CommandPrimitive.Empty className="py-6 text-center text-xs text-muted-foreground">
              No results found.
            </CommandPrimitive.Empty>
            {Array.from(categories.entries()).map(([category, items]) => (
              <CommandPrimitive.Group
                key={category}
                heading={category}
                className="overflow-hidden px-1 py-1.5 text-[11px] font-semibold text-muted-foreground"
              >
                {items.map((item) => (
                  <CommandPrimitive.Item
                    key={item.id}
                    onSelect={() => {
                      onOpenChange(false);
                      item.action();
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-xs text-foreground outline-none hover:bg-muted data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                  >
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-[10px] text-muted-foreground">{item.subtitle}</span>
                      )}
                    </div>
                    {item.shortcut && (
                      <kbd className="ml-auto pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground">
                        {item.shortcut}
                      </kbd>
                    )}
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
