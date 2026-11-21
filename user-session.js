// ======================================
// user-session.js
// ======================================
// ユーザーログイン（名前のみ・パスワードなし）と
// 管理者ログイン（Supabase Auth）の共通処理です。
//
// - 一般ユーザーは名前だけでログインし、その名前で学習の進捗
//   （exam_histories の user_name）を管理します。
// - ログインはトップバーの「ログイン」ボタンから開くポップアップ
//   で行います。管理者ログインはポップアップ内では折りたたまれて
//   いて、開くとメールアドレス＋パスワードの入力欄が出ます。
// - 管理者だけが報奨金データ（qualifications /
//   held_certifications）を読み取れます（RLSで anon には非公開）。

const QUALISTUDY_USER_KEY = 'qualistudyUserName';

/** 現在の一般ユーザー名を返します（未ログインなら空文字）。 */
function getCurrentUserName() {
  return localStorage.getItem(QUALISTUDY_USER_KEY) || '';
}

/** 一般ユーザーとしてログイン（名前を保存）します。 */
function setCurrentUserName(name) {
  localStorage.setItem(QUALISTUDY_USER_KEY, name);
}

/** 一般ユーザーをログアウトします。 */
function clearCurrentUserName() {
  localStorage.removeItem(QUALISTUDY_USER_KEY);
}

// ======================================
// IPアドレスによるログイン状態の保持
// ======================================
// 同じIPアドレスからは、前回ログインしたユーザー名を
// user_sessions テーブルで引き継ぎます（名前のみログインの
// 利便機能です。IPが変わる環境では効きません）。

let sessionClientPromise = null;

/** IPセッション用に Supabase クライアントを用意します。 */
async function getSessionClient(provided) {
  if (provided) {
    return provided;
  }
  if (!sessionClientPromise) {
    sessionClientPromise = (async () => {
      try {
        if (!window.supabase) {
          return null;
        }
        const response = await fetch('/supabase-config.json');
        const raw = await response.json();
        const config = raw.supabase || raw;
        return window.supabase.createClient(config.url, config.key);
      } catch (error) {
        return null;
      }
    })();
  }
  return sessionClientPromise;
}

/** 接続元IPアドレスを取得します（Cloudflare の trace を利用）。 */
async function fetchClientIp() {
  try {
    const response = await fetch('/cdn-cgi/trace');
    const text = await response.text();
    const match = text.match(/^ip=(.+)$/m);
    return match ? match[1].trim() : '';
  } catch (error) {
    return '';
  }
}

/** 現在のIPとユーザー名の対応を保存します。 */
async function saveIpSession(client, userName) {
  try {
    const ip = await fetchClientIp();
    const c = await getSessionClient(client);
    if (!ip || !c || !userName) {
      return;
    }
    await c
      .from('user_sessions')
      .upsert(
        { ip, user_name: userName, updated_at: new Date().toISOString() },
        { onConflict: 'ip' }
      );
  } catch (error) {
    // 保持できなくてもログイン自体は継続します。
  }
}

/** 現在のIPの対応付けを削除します（ログアウト時）。 */
async function deleteIpSession(client) {
  try {
    const ip = await fetchClientIp();
    const c = await getSessionClient(client);
    if (!ip || !c) {
      return;
    }
    await c.from('user_sessions').delete().eq('ip', ip);
  } catch (error) {
    // 削除できなくてもログアウト自体は継続します。
  }
}

/**
 * ログイン状態を引き継ぎます。
 * ログイン済みなら現在のIPへ対応を保存し、未ログインなら
 * 同じIPの前回ユーザーを復元します。
 */
async function restoreIpSession(client) {
  try {
    const current = getCurrentUserName();
    if (current) {
      saveIpSession(client, current);
      return;
    }
    const ip = await fetchClientIp();
    const c = await getSessionClient(client);
    if (!ip || !c) {
      return;
    }
    const { data } = await c
      .from('user_sessions')
      .select('user_name')
      .eq('ip', ip)
      .maybeSingle();
    if (data && data.user_name) {
      setCurrentUserName(data.user_name);
      if (!sessionStorage.getItem('qualistudyIpRestored')) {
        sessionStorage.setItem('qualistudyIpRestored', '1');
        location.reload();
      }
    }
  } catch (error) {
    // 引き継げなくても通常表示は継続します。
  }
}

/** 管理者セッション（Supabase Auth）があれば返します。 */
async function getAdminSession(client) {
  if (!client) {
    return null;
  }
  try {
    const { data } = await client.auth.getSession();
    return data.session || null;
  } catch (error) {
    console.error('管理者セッション確認エラー:', error);
    return null;
  }
}

/**
 * ログインポップアップ（モーダル）を開きます。
 * 管理者ログイン欄は折りたたまれた状態で表示されます。
 *
 * @param {object} client - Supabaseクライアント（null可）
 */
function openLoginPopup(client) {
  closeLoginPopup();

  const overlay = document.createElement('div');
  overlay.className = 'login-popup-overlay';
  overlay.id = 'login-popup-overlay';

  const popup = document.createElement('div');
  popup.className = 'login-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');

  const title = document.createElement('h2');
  title.className = 'login-popup-title';
  title.textContent = 'ログイン';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'login-popup-close';
  closeBtn.setAttribute('aria-label', '閉じる');
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  closeBtn.addEventListener('click', closeLoginPopup);

  // ---- 一般ユーザーログイン（名前のみ） ----
  const nameLabel = document.createElement('label');
  nameLabel.className = 'login-popup-label';
  nameLabel.textContent = 'ユーザー名';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'user-bar-input login-popup-input';
  nameInput.placeholder = 'ユーザー名';
  nameInput.autocomplete = 'username';

  const loginBtn = document.createElement('button');
  loginBtn.type = 'button';
  loginBtn.className = 'user-bar-btn primary login-popup-submit';
  loginBtn.textContent = 'ログイン';
  const doLogin = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    setCurrentUserName(name);
    await saveIpSession(client, name);
    location.reload();
  };
  loginBtn.addEventListener('click', doLogin);
  nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      doLogin();
    }
  });

  // ---- 管理者ログイン（折りたたみ） ----
  const adminToggle = document.createElement('button');
  adminToggle.type = 'button';
  adminToggle.className = 'admin-login-toggle';
  adminToggle.setAttribute('aria-expanded', 'false');
  adminToggle.innerHTML = '<i class="fa-solid fa-chevron-right admin-login-chevron"></i> 管理者ログイン';

  const adminForm = document.createElement('div');
  adminForm.className = 'admin-login-form';
  adminForm.hidden = true;

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.className = 'user-bar-input login-popup-input';
  emailInput.placeholder = '管理者メールアドレス';
  emailInput.autocomplete = 'username';

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.className = 'user-bar-input login-popup-input';
  passwordInput.placeholder = 'パスワード';
  passwordInput.autocomplete = 'current-password';

  const adminLoginBtn = document.createElement('button');
  adminLoginBtn.type = 'button';
  adminLoginBtn.className = 'user-bar-btn primary login-popup-submit';
  adminLoginBtn.textContent = '管理者としてログイン';

  const adminError = document.createElement('span');
  adminError.className = 'user-bar-error';

  const doAdminLogin = async () => {
    if (!client) {
      adminError.textContent = 'DBに接続できていません';
      return;
    }
    adminError.textContent = '';
    const { error } = await client.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });
    if (error) {
      adminError.textContent = 'ログインに失敗しました';
      return;
    }
    location.reload();
  };
  adminLoginBtn.addEventListener('click', doAdminLogin);
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      doAdminLogin();
    }
  });

  adminToggle.addEventListener('click', () => {
    const willOpen = adminForm.hidden;
    adminForm.hidden = !willOpen;
    adminToggle.setAttribute('aria-expanded', String(willOpen));
    adminToggle.querySelector('.admin-login-chevron').style.transform = willOpen ? 'rotate(90deg)' : '';
    if (willOpen) {
      emailInput.focus();
    }
  });

  adminForm.append(emailInput, passwordInput, adminLoginBtn, adminError);
  popup.append(title, closeBtn, nameLabel, nameInput, loginBtn, adminToggle, adminForm);
  overlay.append(popup);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeLoginPopup();
    }
  });
  document.addEventListener('keydown', handleLoginPopupKeydown);
  document.body.append(overlay);
  nameInput.focus();
}

/** ログインポップアップを閉じます。 */
function closeLoginPopup() {
  const overlay = document.getElementById('login-popup-overlay');
  if (overlay) {
    overlay.remove();
  }
  document.removeEventListener('keydown', handleLoginPopupKeydown);
}

function handleLoginPopupKeydown(event) {
  if (event.key === 'Escape') {
    closeLoginPopup();
  }
}

/**
 * トップバーの #user-bar を描画します。
 * 未ログインなら「ログイン」ボタン（ポップアップを開く）、
 * ログイン中なら名前と「ログアウト」を表示します。
 *
 * @param {object} client - Supabaseクライアント（null可）
 */
async function renderUserBar(client) {
  const bar = document.getElementById('user-bar');
  if (!bar) {
    return;
  }

  // IPアドレスによるログイン状態の引き継ぎ（復元時はリロードされます）
  restoreIpSession(client);

  const adminSession = await getAdminSession(client);
  const userName = getCurrentUserName();
  bar.innerHTML = '';

  // ---- 管理者としてログイン中 ----
  if (adminSession) {
    const label = document.createElement('span');
    label.className = 'user-bar-label';
    label.innerHTML = '<i class="fa-solid fa-user-shield"></i> 管理者ログイン中';
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'user-bar-btn';
    logoutBtn.textContent = 'ログアウト';
    logoutBtn.addEventListener('click', async () => {
      await deleteIpSession(client);
      clearCurrentUserName();
      if (client) {
        await client.auth.signOut();
      }
      location.reload();
    });
    bar.append(label, logoutBtn);
    return;
  }

  // ---- 一般ユーザーログイン中 ----
  if (userName) {
    const label = document.createElement('span');
    label.className = 'user-bar-label';
    label.innerHTML = '<i class="fa-regular fa-user"></i> ';
    label.append(document.createTextNode(`${userName} さん`));
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'user-bar-btn';
    logoutBtn.textContent = 'ログアウト';
    logoutBtn.addEventListener('click', async () => {
      await deleteIpSession(client);
      clearCurrentUserName();
      location.reload();
    });
    bar.append(label, logoutBtn);
    return;
  }

  // ---- 未ログイン：「ログイン」ボタンでポップアップを開く ----
  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'login-btn';
  openBtn.innerHTML = '<i class="fa-regular fa-user"></i> ログイン';
  openBtn.addEventListener('click', () => openLoginPopup(client));
  bar.append(openBtn);
}
