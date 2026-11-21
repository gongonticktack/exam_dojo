// ======================================
// user-session.js
// ======================================
// ユーザーログイン（名前のみ・パスワードなし）と
// 管理者ログイン（Supabase Auth）の共通処理です。
//
// - 一般ユーザーは名前だけでログインし、その名前で学習の進捗
//   （exam_histories の user_name）を管理します。
// - 管理者は同じログイン画面からメールアドレス＋パスワードで
//   ログインします。管理者だけが報奨金データ（qualifications /
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
 * トップバーの #user-bar にログインUIを描画します。
 * 管理者のログイン状態が変わったらページを再読み込みして、
 * 報奨金パネルの表示などを初期化し直します。
 *
 * @param {object} client - Supabaseクライアント（null可）
 */
async function renderUserBar(client) {
  const bar = document.getElementById('user-bar');
  if (!bar) {
    return;
  }

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
    logoutBtn.addEventListener('click', () => {
      clearCurrentUserName();
      location.reload();
    });
    bar.append(label, logoutBtn);
    return;
  }

  // ---- 未ログイン：名前入力＋管理者ログイン切替 ----
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'user-bar-input';
  nameInput.placeholder = 'ユーザー名';
  nameInput.autocomplete = 'username';

  const loginBtn = document.createElement('button');
  loginBtn.type = 'button';
  loginBtn.className = 'user-bar-btn primary';
  loginBtn.textContent = 'ログイン';
  const doLogin = () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    setCurrentUserName(name);
    location.reload();
  };
  loginBtn.addEventListener('click', doLogin);
  nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      doLogin();
    }
  });

  const adminToggle = document.createElement('button');
  adminToggle.type = 'button';
  adminToggle.className = 'user-bar-btn';
  adminToggle.textContent = '管理者ログイン';

  const adminForm = document.createElement('div');
  adminForm.className = 'admin-login-form';
  adminForm.hidden = true;

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.className = 'user-bar-input';
  emailInput.placeholder = '管理者メールアドレス';
  emailInput.autocomplete = 'username';

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.className = 'user-bar-input';
  passwordInput.placeholder = 'パスワード';
  passwordInput.autocomplete = 'current-password';

  const adminLoginBtn = document.createElement('button');
  adminLoginBtn.type = 'button';
  adminLoginBtn.className = 'user-bar-btn primary';
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
    adminForm.hidden = !adminForm.hidden;
    if (!adminForm.hidden) {
      emailInput.focus();
    }
  });

  adminForm.append(emailInput, passwordInput, adminLoginBtn, adminError);
  bar.append(nameInput, loginBtn, adminToggle, adminForm);
}
