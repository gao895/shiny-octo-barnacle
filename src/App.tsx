import { useEffect } from 'react';
import AvatarViewer from './components/AvatarViewer';
import PartSelector from './components/PartSelector';
import ColorPicker from './components/ColorPicker';
import ExpressionPanel from './components/ExpressionPanel';
import AnimationPanel from './components/AnimationPanel';
import PresetPanel from './components/PresetPanel';
import ExportPanel from './components/ExportPanel';
import CompatibilityPanel from './components/CompatibilityPanel';
import SaveLoadPanel from './components/SaveLoadPanel';
import TopBar from './components/TopBar';
import { useAvatarStore } from './store/avatarStore';

function useUndoRedoShortcuts() {
  const undo = useAvatarStore((s) => s.undo);
  const redo = useAvatarStore((s) => s.redo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white/50 p-3 shadow-sm">{children}</div>;
}

export default function App() {
  useUndoRedoShortcuts();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />

      <main className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[260px_1fr_320px] lg:overflow-hidden">
        <aside className="order-2 flex h-72 min-h-0 flex-col rounded-2xl bg-white/50 p-3 shadow-sm lg:order-1 lg:h-auto lg:overflow-hidden">
          <PartSelector />
        </aside>

        <section className="order-1 flex min-h-[45vh] flex-col gap-2 lg:order-2 lg:min-h-0">
          <div className="min-h-0 flex-1">
            <AvatarViewer />
          </div>
          <Panel>
            <AnimationPanel />
          </Panel>
        </section>

        <aside className="order-3 flex flex-col gap-3 lg:overflow-y-auto panel-scroll">
          <Panel>
            <PresetPanel />
          </Panel>
          <Panel>
            <ColorPicker />
          </Panel>
          <Panel>
            <ExpressionPanel />
          </Panel>
          <CompatibilityPanel />
          <Panel>
            <SaveLoadPanel />
          </Panel>
          <Panel>
            <ExportPanel />
          </Panel>
        </aside>
      </main>
    </div>
  );
}
