// ======================================
// rewards.js
// ======================================
// 報奨金ページ（管理者ログイン時のみ閲覧可能）。
// qualifications / held_certifications は RLS で管理者しか
// 読めないため、管理者セッションが無ければ何も表示しません。
//
// 表示内容:
// - 取得済み資格と報奨金合計
// - 受験予定の資格（受験料・報奨金・利益）
// - 未受験の収支比較（取得済み以外の全資格を利益の降順で）

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

  let html = '';

  // ---- 取得済み資格 ----
  html += '<h3>取得済み資格</h3><div class="rewards-table-wrap"><table><thead><tr><th>資格</th><th>取得日</th><th style="text-align:right">報奨金</th></tr></thead><tbody>';
  for (const row of heldRows) {
    html += `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.obtained_date || '')}</td><td class="reward-yen">${yen(row.reward_yen)}</td></tr>`;
  }
  html += `</tbody><tfoot><tr><th colspan="2">合計</th><td class="reward-yen"><strong>${yen(heldTotal)}</strong></td></tr></tfoot></table></div>`;

  // ---- 受験予定の資格 ----
  const planned = qualRows.filter((row) => row.is_planned);
  if (planned.length > 0) {
    html += '<h3>受験予定の資格</h3><div class="rewards-table-wrap"><table><thead><tr><th>資格</th><th>試験日</th><th style="text-align:right">受験料</th><th style="text-align:right">報奨金</th><th style="text-align:right">利益</th></tr></thead><tbody>';
    for (const row of planned) {
      const profit = (row.reward_yen || 0) - (row.fee_yen || 0);
      html += `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.exam_date || '')}</td><td class="reward-yen">${yen(row.fee_yen)}</td><td class="reward-yen">${yen(row.reward_yen)}</td><td class="reward-yen">${yen(profit)}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // ---- 未受験の収支比較 ----
  const heldNames = new Set(heldRows.map((row) => row.name));
  const notTaken = qualRows
    .filter((row) => !heldNames.has(row.name))
    .map((row) => ({ ...row, profit: (row.reward_yen || 0) - (row.fee_yen || 0) }))
    .sort((a, b) => b.profit - a.profit);

  html += `<h3>未受験の収支比較（${notTaken.length}件・利益順）</h3><div class="rewards-table-wrap"><table><thead><tr><th>資格</th><th style="text-align:right">受験料</th><th style="text-align:right">報奨金</th><th style="text-align:right">収支</th></tr></thead><tbody>`;
  for (const row of notTaken) {
    const cls = row.profit >= 0 ? 'profit-plus' : 'profit-minus';
    html += `<tr><td>${escapeHtml(row.name)}</td><td class="reward-yen">${yen(row.fee_yen)}</td><td class="reward-yen">${yen(row.reward_yen)}</td><td class="reward-yen ${cls}">${yen(row.profit)}</td></tr>`;
  }
  html += '</tbody></table></div>';

  bodyEl.innerHTML = html;
}

loadRewards();
