import { useUiStore } from '../store/useUiStore';

export function ToastHost() {
  const toast = useUiStore((s) => s.toast);
  return (
    <div className={`toast ${toast ? 'is-visible' : ''}`} role="status">
      {toast?.message}
    </div>
  );
}
