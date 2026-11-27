import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useUiStore, type PanelKey } from '../../store/useUiStore';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 面板边缘拖拽条：靠近面板边框即可拉伸/压缩面板。 */
export function PanelResizeHandles() {
  const sizes = useUiStore((s) => s.panelSizes);
  const collapsed = useUiStore((s) => s.panelCollapsed);
  const setPanelSize = useUiStore((s) => s.setPanelSize);

  const startResize = useCallback(
    (panel: PanelKey, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startSize = sizes[panel];
      const axisClass = panel === 'dock' ? 'is-resizing-rows' : 'is-resizing-cols';
      document.body.classList.add('is-resizing-panels', axisClass);

      const onMove = (e: PointerEvent) => {
        if (panel === 'palette') {
          setPanelSize('palette', clamp(startSize + (e.clientX - startX), 208, 520));
        } else if (panel === 'inspector') {
          setPanelSize('inspector', clamp(startSize - (e.clientX - startX), 248, 560));
        } else {
          const max = Math.max(180, Math.min(620, window.innerHeight * 0.62));
          setPanelSize('dock', clamp(startSize - (e.clientY - startY), 120, max));
        }
      };
      const finish = () => {
        document.body.classList.remove('is-resizing-panels', axisClass);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    },
    [sizes, setPanelSize],
  );

  return (
    <>
      {!collapsed.palette && (
        <div
          className="resize-handle resize-handle--palette"
          onPointerDown={(e) => startResize('palette', e)}
          role="separator"
          aria-orientation="vertical"
          aria-label="调整器件库宽度"
          title="拖动调整器件库宽度"
        />
      )}
      {!collapsed.inspector && (
        <div
          className="resize-handle resize-handle--inspector"
          onPointerDown={(e) => startResize('inspector', e)}
          role="separator"
          aria-orientation="vertical"
          aria-label="调整检查器宽度"
          title="拖动调整检查器宽度"
        />
      )}
      {!collapsed.dock && (
        <div
          className="resize-handle resize-handle--dock"
          onPointerDown={(e) => startResize('dock', e)}
          role="separator"
          aria-orientation="horizontal"
          aria-label="调整底部面板高度"
          title="拖动调整底部面板高度"
        />
      )}
    </>
  );
}
