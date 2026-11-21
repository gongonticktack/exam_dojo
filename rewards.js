// ======================================
// rewards.js
// ======================================
// 報奨金ページ（管理者ログイン時のみ閲覧可能）。
// qualifications / held_certifications は RLS で管理者しか
// 読めないため、管理者セッションが無ければ何も表示しません。
//
// 表示内容（ページ内タブで切り替え）:
// - 取得済み資格と報奨金合計
// - 受験予定の資格（受験料・報奨金・利益）
// - 未受験の収支比較（収支マイナスと受験料不明の資格は表示しない）
// 各表はヘッダクリックでソートできる。

let supabaseClient = null;

function initSupabase() {
  const config = window.SUPABASE_CONFIG;
  if (!config || !config.url || !config.key) {
    return false;
  }
  supabaseClient = window.supabase.createClient(config.url, config.key);
  return true;
}

const yen = (value) => `¥${(value || 0).toLocaleString('ja-JP')}`;

const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));

// ---- ソート可能な表の定義 ----
const TABLE_DEFS = {
  held: {
    label: '取得済み',
    columns: [
      { key: 'name', label: '資格', type: 'text' },
      { key: 'obtained_date', label: '取得日', type: 'text' },
      { key: 'reward_yen', label: '報奨金', type: 'number', align: 'right' },
    ],
    sortKey: null, // 初期表示はDBの sort_order 順
    sortDir: 1,
    rows: [],
    footer: null,
  },
  planned: {
    label: '受験予定',
    columns: [
      { key: 'name', label: '資格', type: 'text' },
      { key: 'exam_date', label: '試験日', type: 'text' },
      { key: 'fee_yen', label: '受験料', type: 'number', align: 'right' },
      { key: 'reward_yen', label: '報奨金', type: 'number', align: 'right' },
      { key: 'profit', label: '利益', type: 'number', align: 'right' },
    ],
    sortKey: 'exam_date',
    sortDir: 1,
    rows: [],
    footer: null,
  },
  nottaken: {
    label: '未受験',
    columns: [
      { key: 'name', label: '資格', type: 'text' },
      { key: 'fee_yen', label: '受験料', type: 'number', align: 'right' },
      { key: 'reward_yen', label: '報奨金', type: 'number', align: 'right' },
      { key: 'profit', label: '収支', type: 'number', align: 'right' },
    ],
    sortKey: 'profit',
    sortDir: -1,
    rows: [],
    footer: null,
  },
};

let activeTab = 'held';

function sortedRows(def) {
  const rows = [...def.rows];
  if (!def.sortKey) return rows;
  const col = def.columns.find((c) => c.key === def.sortKey);
  rows.sort((a, b) => {
    const av = a[def.sortKey];
    const bv = b[def.sortKey];
    let cmp;
    if (col && col.type === 'number') {
      cmp = (av || 0) - (bv || 0);
    } else {
      cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'ja');
    }
    return cmp * def.sortDir;
  });
  return rows;
}

function cellHtml(tableKey, col, row) {
  const value = row[col.key];
  if (col.type === 'number') {
    let cls = 'reward-yen';
    if (col.key === 'profit') {
      cls += value >= 0 ? ' profit-plus' : ' profit-minus';
    }
    return `<td class="${cls}">${yen(value)}</td>`;
  }
  return `<td>${escapeHtml(value || '')}</td>`;
}

function renderTable(tableKey) {
  const def = TABLE_DEFS[tableKey];
  const head = def.columns
    .map((col) => {
      const align = col.align === 'right' ? ' style="text-align:right"' : '';
      let arrow = '';
      if (def.sortKey === col.key) {
        arrow = def.sortDir === 1 ? ' ▲' : ' ▼';
      }
      return `<th class="sortable" data-table="${tableKey}" data-key="${col.key}"${align}>${escapeHtml(col.label)}${arrow}</th>`;
    })
    .join('');
  let body;
  if (def.rows.length === 0) {
    body = `<tr><td colspan="${def.columns.length}">表示する資格がありません。</td></tr>`;
  } else {
    body = sortedRows(def)
      .map((row) => `<tr>${def.columns.map((col) => cellHtml(tableKey, col, row)).join('')}</tr>`)
      .join('');
  }
  const foot = def.footer ? `<tfoot>${def.footer}</tfoot>` : '';
  return `<div class="rewards-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div>`;
}

function renderRewards() {
  const bodyEl = document.getElementById('rewards-body');
  const tabs = Object.keys(TABLE_DEFS)
    .map((key) => {
      const def = TABLE_DEFS[key];
      const cls = key === activeTab ? 'rewards-tab is-active' : 'rewards-tab';
      return `<button type="button" class="${cls}" data-tab="${key}">${def.label}（${def.rows.length}件）</button>`;
    })
    .join('');
  const panels = Object.keys(TABLE_DEFS)
    .map((key) => {
      const hidden = key === activeTab ? '' : ' hidden';
      return `<div class="rewards-panel-tab" data-panel="${key}"${hidden}>${renderTable(key)}</div>`;
    })
    .join('');
  bodyEl.innerHTML = `<div class="rewards-tabs" role="tablist">${tabs}</div>${panels}`;

  bodyEl.querySelectorAll('.rewards-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderRewards();
    });
  });
  bodyEl.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const def = TABLE_DEFS[th.dataset.table];
      const key = th.dataset.key;
      if (def.sortKey === key) {
        def.sortDir *= -1;
      } else {
        def.sortKey = key;
        def.sortDir = 1;
      }
      renderRewards();
    });
  });
}

async function loadRewards() {
  const summaryEl = document.getElementById('rewards-summary');
  const bodyEl = document.getElementById('rewards-body');

  if (!initSupabase()) {
    summaryEl.textContent = '';
    bodyEl.innerHTML = '<p>Supabase設定が不足しています。</p>';
    return;
  }

  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    summaryEl.textContent = '';
    bodyEl.innerHTML =
      '<p>管理者ログインが必要です。トップ画面のログインポップアップ内「管理者ログイン」からログインしてください。</p>';
    return;
  }

  const [{ data: held, error: heldError }, { data: quals, error: qualsError }] =
    await Promise.all([
      supabaseClient
        .from('held_certifications')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabaseClient
        .from('qualifications')
        .select('*')
        .order('sort_order', { ascending: true }),
    ]);

  if (heldError || qualsError) {
    console.error('報奨金データ取得エラー:', heldError || qualsError);
    summaryEl.textContent = '';
    bodyEl.innerHTML = '<p>データの取得に失敗しました。</p>';
    return;
  }

  const heldRows = held || [];
  const qualRows = quals || [];
  const heldTotal = heldRows.reduce((sum, row) => sum + (row.reward_yen || 0), 0);
  summaryEl.textContent = `取得済み ${heldRows.length}件 ／ 報奨金合計 ${yen(heldTotal)}`;

  // ---- 取得済み ----
  TABLE_DEFS.held.rows = heldRows;
  TABLE_DEFS.held.footer =
    `<tr><th colspan="2">合計</th><td class="reward-yen"><strong>${yen(heldTotal)}</strong></td></tr>`;

  // ---- 受験予定 ----
  const planned = qualRows
    .filter((row) => row.is_planned)
    .map((row) => ({ ...row, profit: (row.reward_yen || 0) - (row.fee_yen || 0) }));
  TABLE_DEFS.planned.rows = planned;

  // ---- 未受験（取得済み・受験予定を除く。収支マイナスと受験料不明は表示しない） ----
  const heldNames = new Set(heldRows.map((row) => row.name));
  TABLE_DEFS.nottaken.rows = qualRows
    .filter((row) => !heldNames.has(row.name) && !row.is_planned)
    .filter((row) => row.fee_yen != null)
    .map((row) => ({ ...row, profit: (row.reward_yen || 0) - (row.fee_yen || 0) }))
    .filter((row) => row.profit >= 0);

  renderRewards();
}

loadRewards();
