import { createBalanceCard } from './BalanceCard.js';

window.__ModuleLoader__.load({
  id: '@local/dsh-peak-valley-reminder',
  factory(require) {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;
    const createPortal = ReactDOM.createPortal;

    const NS = 'peak-valley';
    /** DeepSeek API peak windows, Beijing time (UTC+8). */
    const PEAK_MORNING_START = 9 * 60;
    const PEAK_MORNING_END = 12 * 60;
    const PEAK_AFTERNOON_START = 14 * 60;
    const PEAK_AFTERNOON_END = 18 * 60;

    /** Chinese statutory holiday ranges, inclusive. */
    const HOLIDAYS = [
      ['2026-01-01', '2026-01-03'],
      ['2026-02-15', '2026-02-23'],
      ['2026-04-04', '2026-04-06'],
      ['2026-05-01', '2026-05-05'],
      ['2026-06-19', '2026-06-21'],
      ['2026-09-25', '2026-09-27'],
      ['2026-10-01', '2026-10-07'],
      ['2027-01-01', '2027-01-03'],
      ['2027-02-05', '2027-02-13'],
      ['2027-04-03', '2027-04-05'],
      ['2027-04-30', '2027-05-04'],
      ['2027-06-09', '2027-06-09'],
      ['2027-09-15', '2027-09-15'],
      ['2027-10-01', '2027-10-07'],
    ];

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const RING_SIZE = 32;
    /** Distance from the very top of the window, including the native titlebar band. */
    const TOP_INSET = 4;
    const RING_CENTER = RING_SIZE / 2;
    const RING_RADIUS = 14.3;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

    const EN = {
      'valley-title': "It's Liang Wengu time!",
      'valley-sub': 'Off-peak 50% · remaining',
      'valley-meta': 'Weekdays 12–14 & after 18:00 · weekends/holidays all day',
      'peak-title': "Heads up! It's Liang Wenfeng time!",
      'peak-sub': 'Standard rate · remaining',
      'peak-meta': 'Mon–Fri 09:00–12:00 & 14:00–18:00 Beijing time (holidays excluded)',
      'balance-label': 'Balance',
      'balance-card-label': 'Balance: ',
      'balance-loading': 'Loading…',
      'balance-signed-out': 'Sign in to view',
      'balance-error': 'Unavailable',
      'balance-empty': 'No balance',
      'balance-topped-up': 'Top-up',
      'balance-bonus': 'Bonus',
      'tooltip': 'DeepSeek API peak hours: Mon–Fri 09:00–12:00 and 14:00–18:00 Beijing time, excluding Chinese statutory holidays. All other times are off-peak (50% price).',
      'unit-day': 'd',
      'span-days-hours': '{d}d {h}h',
      'span-days': '{d}d',
    };

    const ZH = {
      'valley-title': '现在是梁文谷时间！',
      'valley-sub': '谷时 5 折 · 剩余',
      'valley-meta': '工作日 12–14 点、18 点后 · 周末/节假日全天',
      'peak-title': '注意！现在是梁文峰时间！',
      'peak-sub': '峰时标准价 · 剩余',
      'peak-meta': '周一至周五 09:00–12:00、14:00–18:00（法定节假日除外）',
      'balance-label': '账户余额',
      'balance-card-label': '余额：',
      'balance-loading': '加载中…',
      'balance-signed-out': '登录后查看',
      'balance-error': '暂不可用',
      'balance-empty': '暂无余额',
      'balance-topped-up': '充值',
      'balance-bonus': '赠送',
      'tooltip': 'DeepSeek API 峰时：北京时间周一至周五（法定节假日除外）09:00–12:00、14:00–18:00；其余时间为谷时（5 折）。',
      'unit-day': '天',
      'span-days-hours': '{d}天{h}小时',
      'span-days': '{d}天',
    };

    const beijingFormat = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });

    function beijingParts(now) {
      const fields = {};
      for (const part of beijingFormat.formatToParts(new Date(now))) {
        if (part.type !== 'literal') fields[part.type] = part.value;
      }
      return {
        year: Number(fields.year),
        month: Number(fields.month),
        day: Number(fields.day),
        hour: Number(fields.hour),
        minute: Number(fields.minute),
        second: Number(fields.second),
        weekday: fields.weekday,
      };
    }

    function dateKey(parts) {
      return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    }

    function isHoliday(parts) {
      const key = dateKey(parts);
      return HOLIDAYS.some(([start, end]) => key >= start && key <= end);
    }

    function isWorkday(parts) {
      return parts.weekday !== 'Sat' && parts.weekday !== 'Sun' && !isHoliday(parts);
    }

    function beijingEpoch(year, month, day, hour, minute, second) {
      return Date.UTC(year, month - 1, day, hour - 8, minute, second);
    }

    function addDays(parts, offset) {
      const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset));
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        weekday: WEEKDAYS[date.getUTCDay()],
      };
    }

    function transitionAround(now, parts) {
      let start = 0;
      let end = 0;
      for (let offset = -21; offset <= 21; offset += 1) {
        const day = addDays(parts, offset);
        if (!isWorkday(day)) continue;
        for (const hour of [9, 12, 14, 18]) {
          const epoch = beijingEpoch(day.year, day.month, day.day, hour, 0, 0);
          if (epoch <= now && epoch > start) start = epoch;
          if (epoch > now && (end === 0 || epoch < end)) end = epoch;
        }
      }
      if (!end) end = now + 60 * 60 * 1000;
      if (!start) start = end - 60 * 60 * 1000;
      return { start, end };
    }

    function stateAt(now) {
      const parts = beijingParts(now);
      const minutes = parts.hour * 60 + parts.minute;
      const peak =
        isWorkday(parts) &&
        ((minutes >= PEAK_MORNING_START && minutes < PEAK_MORNING_END) ||
          (minutes >= PEAK_AFTERNOON_START && minutes < PEAK_AFTERNOON_END));
      const { end } = transitionAround(now, parts);
      const hourElapsed = (parts.minute * 60 + parts.second) / 3600;
      return {
        valley: !peak,
        remaining: Math.max(0, Math.floor((end - now) / 1000)),
        progress: Math.max(0, Math.min(1, 1 - hourElapsed)),
      };
    }

    function formatClock(total) {
      const seconds = Math.max(0, total);
      const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const rest = String(seconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${rest}`;
    }

    function fill(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        key in values ? String(values[key]) : match,
      );
    }

    function formatSpan(total, t) {
      const seconds = Math.max(0, total);
      if (seconds < 86400) return formatClock(seconds);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return hours > 0
        ? fill(t('span-days-hours'), { d: days, h: hours })
        : fill(t('span-days'), { d: days });
    }

    function formatMoney(amount, currency) {
      const value = Number(amount);
      const text = Number.isFinite(value)
        ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0.00';
      const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `;
      return `${symbol}${text}`;
    }

    function titlebarHeight() {
      if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return 0;
      const root = document.documentElement;
      const body = document.body;
      const raw =
        (root && parseFloat(getComputedStyle(root).getPropertyValue('--dsh-windows-titlebar-height'))) ||
        (body && parseFloat(getComputedStyle(body).getPropertyValue('--dsh-windows-titlebar-height'))) ||
        0;
      return Number.isFinite(raw) ? raw : 0;
    }

    function balanceCardMinTop() {
      const titlebar = titlebarHeight();
      const base = 'dshDesktop' in globalThis ? 56 : 4;
      return Math.max(base, titlebar > 0 ? titlebar + 4 : 0);
    }

    function normalizeBalance(value) {
      if (value === null) return { status: 'signed-out' };
      if (!value || value.status !== 'ready') return { status: 'error' };
      const topped = Array.isArray(value.value) ? value.value : [];
      const bonus = Array.isArray(value.bonusWallets) ? value.bonusWallets : [];
      const all = [...topped, ...bonus];
      if (all.length === 0) {
        return { status: 'ready', currency: 'CNY', total: 0, toppedUp: 0, bonus: 0 };
      }
      const currency = all.some((wallet) => wallet.currency === 'CNY') ? 'CNY' : all[0].currency;
      const sum = (wallets) =>
        wallets
          .filter((wallet) => wallet.currency === currency)
          .reduce((total, wallet) => total + (Number(wallet.balance) || 0), 0);
      const toppedUp = sum(topped);
      const bonusTotal = sum(bonus);
      return {
        status: 'ready',
        currency,
        total: toppedUp + bonusTotal,
        toppedUp,
        bonus: bonusTotal,
      };
    }

    function balanceGlow(balance) {
      if (balance.status !== 'ready' || balance.currency !== 'CNY') {
        return {
          active: false,
          color: 'var(--dsw-alias-border-l1, #94a3b8)',
          soft: 'transparent',
          bright: 'transparent',
        };
      }
      const amount = Number(balance.total);
      const ratio = Number.isFinite(amount) ? Math.min(1, Math.max(0, (amount - 1) / 99)) : 0;
      const hue = Math.round(ratio * 120);
      return {
        active: true,
        color: `hsl(${hue} 78% 46%)`,
        soft: `hsla(${hue}, 78%, 46%, .55)`,
        bright: `hsla(${hue}, 82%, 44%, .82)`,
      };
    }

    let balanceCache = null;
    let balanceCacheAt = 0;

    const CSS = `
.dsh-pv-island {
  position: fixed;
  top: 8px;
  left: 50%;
  z-index: 2147483000;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  max-width: 48vw;
  padding: 0;
  overflow: hidden;
  color: #fff;
  background: transparent;
  border-radius: 50%;
  corner-shape: round;
  box-shadow: none;
  transform: translateX(-50%);
  transform-origin: 50% 0;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  animation: dsh-pv-enter .3s cubic-bezier(.2, .8, .2, 1) both;
  transition:
    width .34s cubic-bezier(.2, .8, .2, 1),
    height .34s cubic-bezier(.2, .8, .2, 1),
    padding .34s cubic-bezier(.2, .8, .2, 1),
    border-radius .34s cubic-bezier(.2, .8, .2, 1),
    background .3s ease,
    box-shadow .3s ease;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
}
.dsh-pv-island:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, .55);
}
/* The island sits inside the native window drag band: opt every node of it out
   of the drag region so hover, click and pointermove still reach the page. */
.dsh-pv-island,
.dsh-pv-island *,
.dsh-pv-island *::before,
.dsh-pv-island *::after {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
.dsh-pv-island[data-open="true"] {
  width: 500px;
  height: 116px;
  justify-content: flex-start;
  padding: 0 22px 0 12px;
  border-radius: 30px;
  corner-shape: round;
  background: rgba(14, 14, 16, .96);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, .12),
    0 14px 40px rgba(0, 0, 0, .42),
    inset 0 1px 0 rgba(255, 255, 255, .08);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  overflow: hidden;
}
.dsh-pv-island[data-open="true"][data-state="valley"] {
  box-shadow:
    inset 0 0 0 1px rgba(21, 128, 61, .52),
    0 14px 40px rgba(0, 0, 0, .42),
    0 0 24px rgba(21, 128, 61, .16),
    inset 0 1px 0 rgba(255, 255, 255, .08);
}
.dsh-pv-island[data-open="true"][data-state="peak"] {
  animation:
    dsh-pv-enter .3s cubic-bezier(.2, .8, .2, 1) both,
    dsh-pv-peak-glow 2.1s ease-in-out .3s infinite;
}
.dsh-pv-orb-wrap {
  position: relative;
  display: flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  transition:
    flex-basis .3s cubic-bezier(.2, .8, .2, 1),
    width .3s cubic-bezier(.2, .8, .2, 1),
    height .3s cubic-bezier(.2, .8, .2, 1);
}
.dsh-pv-island[data-open="true"] .dsh-pv-orb-wrap {
  flex-basis: 16px;
  width: 16px;
  height: 16px;
}
.dsh-pv-ring {
  position: absolute;
  inset: 0;
  width: 32px;
  height: 32px;
  overflow: visible;
}
.dsh-pv-ring-track {
  stroke: rgba(140, 148, 160, .55);
}
.dsh-pv-ring-value {
  stroke: #34d399;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .45));
  transition: stroke-dashoffset .55s linear;
}
.dsh-pv-island[data-state="peak"] .dsh-pv-ring-value {
  stroke: #fb7185;
}
.dsh-pv-orb-svg {
  position: relative;
  z-index: 1;
  display: block;
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 0 4px rgba(21, 128, 61, .45));
  transition: width .3s cubic-bezier(.2, .8, .2, 1), height .3s cubic-bezier(.2, .8, .2, 1), filter .3s ease;
}
.dsh-pv-orb-fill { fill: #15803d; }
.dsh-pv-island[data-state="peak"] .dsh-pv-orb-svg {
  filter: drop-shadow(0 0 5px rgba(239, 68, 68, .6));
}
.dsh-pv-island[data-state="peak"] .dsh-pv-orb-fill { fill: #ef4444; }
.dsh-pv-island[data-phase="minutes"] .dsh-pv-orb-svg {
  filter: drop-shadow(0 0 6px rgba(245, 158, 11, .65));
}
.dsh-pv-island[data-phase="minutes"] .dsh-pv-orb-fill { fill: #f59e0b; }
.dsh-pv-island[data-phase="minutes"] .dsh-pv-ring-value { stroke: #fbbf24; }
.dsh-pv-island[data-phase="minutes"][data-open="true"] {
  background: rgba(28, 22, 8, .96);
  box-shadow:
    inset 0 0 0 1px rgba(251, 191, 36, .45),
    0 14px 40px rgba(0, 0, 0, .42),
    0 0 28px rgba(245, 158, 11, .26),
    inset 0 1px 0 rgba(255, 255, 255, .08);
  animation: dsh-pv-enter .3s cubic-bezier(.2, .8, .2, 1) both;
}
.dsh-pv-orb-number {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.dsh-pv-island[data-phase="minutes"] .dsh-pv-orb-number {
  color: #241500;
}
.dsh-pv-island[data-open="true"] .dsh-pv-ring,
.dsh-pv-island[data-open="true"] .dsh-pv-orb-number {
  display: none;
}
.dsh-pv-island[data-open="true"] .dsh-pv-orb-svg {
  width: 16px;
  height: 16px;
}
.dsh-pv-island[data-phase="minutes"][data-open="false"] .dsh-pv-orb-svg,
.dsh-pv-island[data-phase="minutes"][data-open="false"] .dsh-pv-orb-number,
.dsh-pv-island[data-phase="soon"][data-open="false"] .dsh-pv-orb-svg,
.dsh-pv-island[data-phase="soon"][data-open="false"] .dsh-pv-orb-number {
  animation: dsh-pv-urgent 10s ease-in-out infinite;
}
.dsh-pv-island[data-phase="days"][data-open="false"] .dsh-pv-orb-number {
  font-size: 9.5px;
}
.dsh-pv-island[data-phase="days"] .dsh-pv-ring-value {
  opacity: .55;
}
.dsh-pv-ring-flow {
  stroke: #6ee7b7;
  filter: drop-shadow(0 0 3px rgba(52, 211, 153, .75));
  transform-box: view-box;
  transform-origin: 16px 16px;
  animation: dsh-pv-ring-flow 2.4s linear infinite;
}
.dsh-pv-island[data-state="peak"] .dsh-pv-ring-flow {
  stroke: #fda4af;
  filter: drop-shadow(0 0 3px rgba(251, 113, 133, .75));
}

.dsh-pv-card {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(0, .9fr) 1px minmax(0, 1.1fr);
  align-items: center;
  gap: 16px;
  min-width: 0;
  max-width: 0;
  margin-left: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateX(-6px);
  text-align: left;
  transition:
    max-width .34s cubic-bezier(.2, .8, .2, 1),
    margin-left .34s cubic-bezier(.2, .8, .2, 1),
    opacity .18s ease,
    transform .34s cubic-bezier(.2, .8, .2, 1);
}
.dsh-pv-island[data-open="true"] .dsh-pv-card {
  max-width: 420px;
  margin-left: 14px;
  opacity: 1;
  transform: none;
}
.dsh-pv-time,
.dsh-pv-wallet {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dsh-pv-title {
  overflow: hidden;
  color: #fff;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: .01em;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-pv-sub {
  overflow: hidden;
  color: rgba(255, 255, 255, .55);
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-pv-clock {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
}
.dsh-pv-island[data-state="valley"] .dsh-pv-clock { color: #86efac; }
.dsh-pv-island[data-state="peak"] .dsh-pv-clock { color: #fca5a5; }
.dsh-pv-island[data-phase="minutes"] .dsh-pv-clock { color: #fcd34d; }
.dsh-pv-meta {
  overflow: hidden;
  color: rgba(255, 255, 255, .36);
  font-size: 9px;
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-pv-divider {
  width: 1px;
  height: 68px;
  background: rgba(255, 255, 255, .11);
}
.dsh-pv-wallet-label {
  overflow: hidden;
  color: rgba(255, 255, 255, .55);
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-pv-wallet-value {
  overflow: hidden;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: .01em;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-pv-island[data-phase="minutes"] .dsh-pv-wallet-value {
  color: #fde68a;
}
.dsh-pv-wallet-sub {
  overflow: hidden;
  color: rgba(255, 255, 255, .36);
  font-size: 9.5px;
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@keyframes dsh-pv-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(.96); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes dsh-pv-peak-glow {
  0%, 100% {
    box-shadow:
      inset 0 0 0 1px rgba(248, 113, 113, .5),
      0 14px 40px rgba(0, 0, 0, .42),
      0 0 18px rgba(239, 68, 68, .2),
      inset 0 1px 0 rgba(255, 255, 255, .08);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px rgba(248, 113, 113, .7),
      0 14px 44px rgba(0, 0, 0, .46),
      0 0 34px rgba(239, 68, 68, .46),
      inset 0 1px 0 rgba(255, 255, 255, .1);
  }
}
@keyframes dsh-pv-urgent {
  0% { opacity: 1; }
  25% { opacity: .26; }
  50% { opacity: 1; }
  100% { opacity: 1; }
}
@keyframes dsh-pv-ring-flow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1000px) {
  .dsh-pv-island[data-open="true"] {
    width: 440px;
    height: 112px;
  }
  .dsh-pv-island[data-open="true"] .dsh-pv-card {
    max-width: 360px;
  }
  .dsh-pv-clock { font-size: 20px; }
  .dsh-pv-wallet-value { font-size: 26px; }
}
@media (max-width: 820px) {
  .dsh-pv-island[data-open="true"] {
    width: 400px;
    height: 108px;
  }
  .dsh-pv-island[data-open="true"] .dsh-pv-card {
    max-width: 320px;
    gap: 12px;
  }
  .dsh-pv-title { font-size: 13px; }
  .dsh-pv-meta { display: none; }
  .dsh-pv-clock { font-size: 18px; }
  .dsh-pv-wallet-value { font-size: 24px; }
}
@media (max-width: 640px) {
  .dsh-pv-island[data-open="true"] {
    width: 56vw;
    max-width: 56vw;
    height: 176px;
    align-items: flex-start;
    padding: 16px;
  }
  .dsh-pv-island[data-open="true"] .dsh-pv-card {
    grid-template-columns: 1fr;
    gap: 9px;
    max-width: 100%;
    margin-left: 10px;
  }
  .dsh-pv-divider {
    width: 100%;
    height: 1px;
  }
  .dsh-pv-clock { font-size: 18px; }
  .dsh-pv-wallet-value { font-size: 26px; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-pv-island,
  .dsh-pv-island[data-state="peak"],
  .dsh-pv-island[data-phase="minutes"][data-open="false"] .dsh-pv-orb-svg,
  .dsh-pv-island[data-phase="minutes"][data-open="false"] .dsh-pv-orb-number,
  .dsh-pv-island[data-phase="soon"][data-open="false"] .dsh-pv-orb-svg,
  .dsh-pv-island[data-phase="soon"][data-open="false"] .dsh-pv-orb-number {
    animation: none !important;
    transition: none !important;
  }
  .dsh-pv-ring-flow { display: none !important; }
  .dsh-pv-island[data-phase="days"] .dsh-pv-ring-value { opacity: 1; }
  .dsh-pv-ring-value { transition: none !important; }
}
`;



    function useBeijingNow() {
      const [now, setNow] = React.useState(() => Date.now());
      React.useEffect(() => {
        const tick = () => setNow(Date.now());
        const id = window.setInterval(tick, 1000);
        const onVisibility = () => {
          if (document.visibilityState === 'visible') tick();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
          window.clearInterval(id);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, []);
      return now;
    }

    function balanceText(balance, t) {
      if (balance.status === 'ready') return formatMoney(balance.total, balance.currency);
      if (balance.status === 'signed-out') return t('balance-signed-out');
      if (balance.status === 'error') return t('balance-error');
      return t('balance-loading');
    }

    function balanceSub(balance, t) {
      if (balance.status !== 'ready') return '';
      const parts = [];
      if (balance.toppedUp > 0) parts.push(`${t('balance-topped-up')} ${formatMoney(balance.toppedUp, balance.currency)}`);
      if (balance.bonus > 0) parts.push(`${t('balance-bonus')} ${formatMoney(balance.bonus, balance.currency)}`);
      return parts.length > 0 ? parts.join(' · ') : t('balance-empty');
    }

    function Reminder({ t, readBalance }) {
      const now = useBeijingNow();
      const info = stateAt(now);
      const valley = info.valley;
      const remaining = formatSpan(info.remaining, t);
      const urgent = info.remaining < 3600;
      const dayCount = Math.floor(info.remaining / 86400);
      const phase = urgent ? (valley ? 'minutes' : 'soon') : dayCount >= 1 ? 'days' : 'hours';
      const amount = urgent
        ? Math.min(59, Math.max(1, Math.ceil(info.remaining / 60)))
        : dayCount >= 1
          ? dayCount
          : Math.max(1, Math.floor(info.remaining / 3600));
      const orbLabel = dayCount >= 1 ? `${amount}${t('unit-day')}` : String(amount);
      const ringProgress = phase === 'days' ? 1 : info.progress;

      const [hovered, setHovered] = React.useState(false);
      const [pinned, setPinned] = React.useState(false);
      const [balance, setBalance] = React.useState({ status: 'idle' });
      const rootRef = React.useRef(null);
      const pinnedRef = React.useRef(false);
      const suppressRef = React.useRef(false);
      const open = hovered || pinned;

      React.useEffect(() => {
        pinnedRef.current = pinned;
      }, [pinned]);

      React.useEffect(() => {
        if (!open || typeof readBalance !== 'function') return undefined;
        let alive = true;
        setBalance((previous) =>
          previous.status === 'ready' || previous.status === 'signed-out'
            ? previous
            : { status: 'loading' },
        );
        const load = () => {
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
      }, [open, readBalance]);

      React.useEffect(() => {
        const node = rootRef.current;
        if (!node) return undefined;
        const inside = (event) => {
          const rect = node.getBoundingClientRect();
          const pad = 2;
          return (
            event.clientX >= rect.left - pad &&
            event.clientX <= rect.right + pad &&
            event.clientY >= rect.top - pad &&
            event.clientY <= rect.bottom + pad
          );
        };
        const toggle = () => {
          const next = !pinnedRef.current;
          pinnedRef.current = next;
          setPinned(next);
          if (next) {
            suppressRef.current = false;
            setHovered(true);
          } else {
            suppressRef.current = true;
            setHovered(false);
          }
        };
        const onMove = (event) => {
          if (inside(event)) {
            if (!suppressRef.current) setHovered(true);
          } else {
            suppressRef.current = false;
            if (!pinnedRef.current) setHovered(false);
          }
        };
        const onClick = (event) => {
          if (!inside(event)) return;
          event.preventDefault();
          event.stopPropagation();
          toggle();
        };
        const onKeyDown = (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          } else if (event.key === 'Escape') {
            pinnedRef.current = false;
            setPinned(false);
            setHovered(false);
            node.blur();
          }
        };
        const onFocus = () => setHovered(true);
        const onBlur = () => {
          if (!pinnedRef.current) setHovered(false);
        };
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('mousemove', onMove, true);
        window.addEventListener('click', onClick, true);
        node.addEventListener('keydown', onKeyDown);
        node.addEventListener('focus', onFocus);
        node.addEventListener('blur', onBlur);
        return () => {
          window.removeEventListener('pointermove', onMove, true);
          window.removeEventListener('mousemove', onMove, true);
          window.removeEventListener('click', onClick, true);
          node.removeEventListener('keydown', onKeyDown);
          node.removeEventListener('focus', onFocus);
          node.removeEventListener('blur', onBlur);
        };
      }, []);

      const island = h(
        'div',
        {
          ref: rootRef,
          className: 'dsh-pv-island',
          style: { top: `${TOP_INSET}px` },
          'data-state': valley ? 'valley' : 'peak',
          'data-phase': phase,
          'data-open': open ? 'true' : 'false',
          'data-pinned': pinned ? 'true' : 'false',
          role: 'button',
          tabIndex: 0,
          'aria-expanded': open,
          'aria-label': t('tooltip'),
        },
        h(
          'span',
          { className: 'dsh-pv-orb-wrap' },
          h(
            'svg',
            {
              className: 'dsh-pv-ring',
              viewBox: `0 0 ${RING_SIZE} ${RING_SIZE}`,
              'aria-hidden': true,
            },
            h('circle', {
              className: 'dsh-pv-ring-track',
              cx: RING_CENTER,
              cy: RING_CENTER,
              r: RING_RADIUS,
              fill: 'none',
              strokeWidth: 2,
            }),
            h('circle', {
              className: 'dsh-pv-ring-value',
              cx: RING_CENTER,
              cy: RING_CENTER,
              r: RING_RADIUS,
              fill: 'none',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeDasharray: RING_CIRCUMFERENCE,
              strokeDashoffset: RING_CIRCUMFERENCE * (1 - ringProgress),
              transform: `rotate(-90 ${RING_CENTER} ${RING_CENTER})`,
            }),
            phase === 'days'
              ? h('circle', {
                  className: 'dsh-pv-ring-flow',
                  cx: RING_CENTER,
                  cy: RING_CENTER,
                  r: RING_RADIUS,
                  fill: 'none',
                  strokeWidth: 2,
                  strokeLinecap: 'round',
                  strokeDasharray: `${RING_CIRCUMFERENCE * 0.22} ${RING_CIRCUMFERENCE}`,
                })
              : null,
          ),
          h(
            'svg',
            {
              className: 'dsh-pv-orb-svg',
              viewBox: `0 0 ${RING_SIZE} ${RING_SIZE}`,
              'aria-hidden': true,
            },
            h('circle', {
              className: 'dsh-pv-orb-fill',
              cx: RING_CENTER,
              cy: RING_CENTER,
              r: 12.5,
            }),
          ),
          h('span', { className: 'dsh-pv-orb-number' }, orbLabel),
        ),
        h(
          'span',
          { className: 'dsh-pv-card', 'aria-hidden': !open },
          h(
            'span',
            { className: 'dsh-pv-time' },
            h('span', { className: 'dsh-pv-title' }, t(valley ? 'valley-title' : 'peak-title')),
            h('span', { className: 'dsh-pv-sub' }, t(valley ? 'valley-sub' : 'peak-sub')),
            h('span', { className: 'dsh-pv-clock' }, remaining),
            h('span', { className: 'dsh-pv-meta' }, t(valley ? 'valley-meta' : 'peak-meta')),
          ),
          h('span', { className: 'dsh-pv-divider' }),
          h(
            'span',
            { className: 'dsh-pv-wallet' },
            h('span', { className: 'dsh-pv-wallet-label' }, t('balance-label')),
            h('span', { className: 'dsh-pv-wallet-value' }, balanceText(balance, t)),
            balanceSub(balance, t) ? h('span', { className: 'dsh-pv-wallet-sub' }, balanceSub(balance, t)) : null,
          ),
        ),
      );

      return h(
        React.Fragment,
        null,
        h('style', { key: 'style' }, CSS),
        typeof createPortal === 'function' && typeof document !== 'undefined' && document.body
          ? createPortal(island, document.body)
          : island,
      );
    }

    const BalanceCard = createBalanceCard({
      React,
      h,
      createPortal,
      balanceText,
      balanceGlow,
      balanceCardMinTop,
    });

    function apply(ctx) {
      ctx.effect(
        () => ctx.locale.register(NS, { en: EN, zh: ZH }),
        'peak-valley: dictionaries',
      );

      const readBalance = async (maxAge = 30000) => {
        if (balanceCache !== null && Date.now() - balanceCacheAt < maxAge) return balanceCache;
        try {
          const remote = ctx.remote?.account;
          if (!remote) return { status: 'error' };
          const result = await remote.getBalance({
            version: '0.2.1-rc.5',
            locale: ctx.locale.getSnapshot().active,
            timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
          });
          if (!result?.ok) return { status: 'error' };
          const normalized = normalizeBalance(result.value);
          if (normalized.status === 'ready' || normalized.status === 'signed-out') {
            balanceCache = normalized;
            balanceCacheAt = Date.now();
          }
          return normalized;
        } catch {
          return { status: 'error' };
        }
      };

      ctx.slots.inject('shell.overlay', () => {
        const balanceCard = ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'api-balance-card',
            order: 39,
            locale: NS,
            inject: () => ({ readBalance }),
          },
          BalanceCard,
        );
        const island = ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'api-peak-valley-reminder',
            order: 71,
            locale: NS,
            inject: () => ({ readBalance }),
          },
          Reminder,
        );
        return () => {
          balanceCard();
          island();
        };
      });
    }

    return { inject: ['slots', 'locale', 'remote', 'remote.account'], apply };
  },
});
