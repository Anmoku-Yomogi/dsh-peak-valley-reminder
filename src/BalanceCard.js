/**
 * Balance card component, mounted independently in the shell overlay.
 * The generated client.js inlines this module; edit this file and run `node build.mjs`.
 */
export function createBalanceCard({ React, h, createPortal, balanceText, balanceGlow, balanceCardMinTop }) {
    const BALANCE_CSS = `
@property --dsh-pv-balance-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.dsh-pv-balance-card {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 2147483000;
  box-sizing: border-box;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  max-width: 180px;
  padding: 4px 8px 5px;
  border: 2px solid transparent;
  border-radius: 9px;
  color: var(--dsw-alias-label-primary, #111);
  background: var(--dsw-alias-bg-overlay, #fff);
  box-shadow:
    inset 0 0 0 1px var(--dsw-alias-border-l1, rgba(0, 0, 0, .08)),
    0 4px 14px rgba(0, 0, 0, .16),
    0 0 6px -3px var(--dsh-pv-balance-soft, transparent);
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  animation: dsh-pv-balance-in .3s cubic-bezier(.2, .8, .2, 1) both;
}
.dsh-pv-balance-card[data-glow="true"][data-flow="reverse"] {
  border-color: transparent;
  background:
    linear-gradient(var(--dsw-alias-bg-overlay, #fff), var(--dsw-alias-bg-overlay, #fff)) padding-box,
    conic-gradient(from var(--dsh-pv-balance-angle, 0deg),
      transparent 0% 8%,
      var(--dsh-pv-balance-bright, rgba(148, 163, 184, .8)) 12% 24%,
      transparent 28% 56%,
      var(--dsh-pv-balance-bright, rgba(148, 163, 184, .8)) 60% 72%,
      transparent 76% 100%) border-box;
  box-shadow:
    inset 0 0 0 1px var(--dsw-alias-border-l1, rgba(0, 0, 0, .08)),
    0 4px 14px rgba(0, 0, 0, .16),
    0 0 12px -2px var(--dsh-pv-balance-bright, transparent);
  animation:
    dsh-pv-balance-in .3s cubic-bezier(.2, .8, .2, 1) both,
    dsh-pv-balance-flow-reverse 1.8s linear infinite;
}
.dsh-pv-balance-card[data-glow="false"] {
  background: var(--dsw-alias-bg-overlay, #fff);
  border-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, .08));
  box-shadow:
    0 4px 14px rgba(0, 0, 0, .16),
    0 1px 3px rgba(0, 0, 0, .08);
  animation: dsh-pv-balance-in .3s cubic-bezier(.2, .8, .2, 1) both;
}
.dsh-pv-balance-card:active {
  cursor: grabbing;
}
.dsh-pv-balance-ring {
  position: absolute;
  inset: -2px;
  z-index: 0;
  padding: 2px;
  border-radius: 9px;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}
.dsh-pv-balance-scan {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--dsh-pv-balance-soft, rgba(148, 163, 184, .45)) 42% 58%,
    transparent 100%
  );
  transform: translateX(100%);
  animation: dsh-pv-balance-scan 4s linear infinite;
}
.dsh-pv-balance-card[data-glow="false"] .dsh-pv-balance-ring,
.dsh-pv-balance-card[data-flow="reverse"] .dsh-pv-balance-ring {
  display: none;
}
.dsh-pv-balance-label,
.dsh-pv-balance-value {
  position: relative;
  z-index: 1;
}
.dsh-pv-balance-label {
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 10.5px;
  line-height: 1.2;
  white-space: nowrap;
}
.dsh-pv-balance-value {
  overflow: hidden;
  color: var(--dsw-alias-label-primary, #111);
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: .01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-overflow: ellipsis;
}
@keyframes dsh-pv-balance-scan {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
@keyframes dsh-pv-balance-flow-reverse {
  to { --dsh-pv-balance-angle: -360deg; }
}
@keyframes dsh-pv-balance-in {
  from { opacity: 0; transform: translateY(3px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-pv-balance-card {
    animation: none !important;
    transition: none !important;
  }
}
`;

    function BalanceCard({ t, readBalance, useSessionStatus }) {
      const running = useSessionStatus((statuses) => {
        if (!statuses) return false;
        for (const status of statuses.values()) {
          if (status.running) return true;
        }
        return false;
      });
      const [balance, setBalance] = React.useState({ status: 'loading' });
      const [position, setPosition] = React.useState(null);
      const cardRef = React.useRef(null);
      const dragRef = React.useRef(null);
      const minTopRef = React.useRef(balanceCardMinTop());

      React.useEffect(() => {
        let alive = true;
        const load = () => {
          if (typeof readBalance !== 'function') {
            if (alive) setBalance({ status: 'error' });
            return;
          }
          readBalance()
            .then((next) => {
              if (alive) setBalance(next);
            })
            .catch(() => {
              if (alive) setBalance({ status: 'error' });
            });
        };
        load();
        const id = window.setInterval(load, 60000);
        return () => {
          alive = false;
          window.clearInterval(id);
        };
      }, [readBalance]);

      React.useEffect(() => {
        const node = cardRef.current;
        if (!node) return undefined;
        const updateMinTop = () => {
          minTopRef.current = balanceCardMinTop();
        };
        updateMinTop();
        const onDown = (event) => {
          if (event.button !== 0) return;
          const rect = node.getBoundingClientRect();
          const top = Math.max(minTopRef.current, rect.top);
          setPosition({ left: rect.left, top });
          dragRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - top,
          };
          try {
            node.setPointerCapture(event.pointerId);
          } catch {
            /* pointer capture is optional */
          }
        };
        const onMove = (event) => {
          const drag = dragRef.current;
          if (!drag || event.pointerId !== drag.pointerId) return;
          const width = node.offsetWidth;
          const height = node.offsetHeight;
          const minTop = minTopRef.current;
          const maxLeft = Math.max(4, window.innerWidth - width - 4);
          const maxTop = Math.max(minTop, window.innerHeight - height - 4);
          setPosition({
            left: Math.min(Math.max(4, event.clientX - drag.offsetX), maxLeft),
            top: Math.min(Math.max(minTop, event.clientY - drag.offsetY), maxTop),
          });
        };
        const onUp = (event) => {
          if (!dragRef.current || event.pointerId !== dragRef.current.pointerId) return;
          dragRef.current = null;
          try {
            node.releasePointerCapture(event.pointerId);
          } catch {
            /* pointer capture is optional */
          }
        };
        const onResize = () => {
          updateMinTop();
          setPosition((current) => {
            if (!current) return current;
            const minTop = minTopRef.current;
            const maxLeft = Math.max(4, window.innerWidth - node.offsetWidth - 4);
            const maxTop = Math.max(minTop, window.innerHeight - node.offsetHeight - 4);
            return {
              left: Math.min(current.left, maxLeft),
              top: Math.min(Math.max(current.top, minTop), maxTop),
            };
          });
        };
        const onDoubleClick = (event) => {
          event.preventDefault();
          dragRef.current = null;
          setPosition(null);
        };
        node.addEventListener('pointerdown', onDown);
        node.addEventListener('dblclick', onDoubleClick);
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
        window.addEventListener('resize', onResize);
        return () => {
          node.removeEventListener('pointerdown', onDown);
          node.removeEventListener('dblclick', onDoubleClick);
          window.removeEventListener('pointermove', onMove, true);
          window.removeEventListener('pointerup', onUp, true);
          window.removeEventListener('pointercancel', onUp, true);
          window.removeEventListener('resize', onResize);
        };
      }, []);

      const value = balanceText(balance, t).replace('¥', '￥');
      const glow = balanceGlow(balance);
      const card = h(
        'div',
        {
          ref: cardRef,
          className: 'dsh-pv-balance-card',
          style: {
            '--dsh-pv-balance-color': glow.color,
            '--dsh-pv-balance-soft': glow.soft,
            '--dsh-pv-balance-bright': glow.bright,
            ...(position
              ? { left: `${position.left}px`, top: `${position.top}px`, right: 'auto', bottom: 'auto' }
              : {}),
          },
          'data-glow': glow.active ? 'true' : 'false',
          'data-flow': running ? 'reverse' : 'forward',
          role: 'note',
          'aria-label': `${t('balance-card-label')}${value}`,
        },
        h(
          'span',
          { className: 'dsh-pv-balance-ring', 'aria-hidden': true },
          h('span', { className: 'dsh-pv-balance-scan' }),
        ),
        h('span', { className: 'dsh-pv-balance-label' }, t('balance-card-label')),
        h('span', { className: 'dsh-pv-balance-value' }, value),
      );

      return h(
        React.Fragment,
        null,
        h('style', { key: 'style' }, BALANCE_CSS),
        typeof createPortal === 'function' && typeof document !== 'undefined' && document.body
          ? createPortal(card, document.body)
          : card,
      );
    }

  return BalanceCard;
}
