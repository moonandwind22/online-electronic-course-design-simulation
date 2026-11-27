import { X } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';

const SHORTCUTS: Array<[string, string]> = [
  ['空格 + 拖拽', '平移画布'],
  ['滚轮', '以光标为中心缩放'],
  ['F', '适配全部器件'],
  ['点击引脚', '开始 / 完成连线'],
  ['点击导线', '把导线接入已有网络'],
  ['拖动导线', '调整走线，引脚连接不变'],
  ['Esc', '取消连线或退出布线'],
  ['R / X', '旋转 / 镜像选中器件'],
  ['Delete', '删除选中器件或导线'],
  ['Ctrl / Cmd + Z', '撤销'],
  ['Ctrl / Cmd + Shift + Z', '重做'],
  ['Ctrl / Cmd + Shift + A', '打开 AI 网表'],
  ['Shift + 点击', '多选器件'],
];

export function ShortcutsModal() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  if (!open) return null;
  return (
    <>
      <div className="ai-scrim" onClick={() => setOpen(false)} />
      <div className="shortcut-modal" role="dialog" aria-label="快捷键">
        <div className="ai-head">
          <div>
            <h2 className="ai-title">快捷键</h2>
            <div className="ai-sub">画布操作与编辑效率</div>
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
            <X className="icon" />
          </button>
        </div>
        <div className="shortcut-list">
          {SHORTCUTS.map(([key, desc]) => (
            <div className="shortcut-row" key={key}>
              <kbd>{key}</kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
