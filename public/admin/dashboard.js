const element = (id) => document.getElementById(id);
const state = { user: null, stories: [], view: 'overview', filter: 'all', query: '', editing: null, teamPage: 1, hasMoreTeam: false, token: null, confirm: null };
let toastTimer;

function node(tag, className, content) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (content !== undefined) result.textContent = content;
  return result;
}

function inlineError(id, message = '') {
  element(id).textContent = message;
  element(id).hidden = !message;
}

function toast(message) {
  clearTimeout(toastTimer);
  element('toast').textContent = message;
  element('toast').hidden = false;
  toastTimer = setTimeout(() => { element('toast').hidden = true; }, 4500);
}

function busy(form, active) {
  form.querySelectorAll('button').forEach((button) => { button.disabled = active; });
  form.setAttribute('aria-busy', String(active));
}

async function api(path, method = 'GET', data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error || (response.status === 429 ? 'Too many attempts. Wait a minute and try again.' : 'The request could not be completed. Please try again.'));
      error.status = response.status;
      if ([401, 403].includes(response.status) && state.user && path !== '/api/newsroom/team') showLogin(error.message);
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Refresh to check whether changes were saved before retrying.');
    if (error instanceof TypeError) throw new Error('Unable to connect. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function showLogin(message = '') {
  state.user = null;
  state.stories = [];
  state.editing = null;
  state.confirm = null;
  state.filter = 'all';
  state.query = '';
  state.teamPage = 1;
  state.hasMoreTeam = false;
  document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  ['recent-stories', 'all-stories', 'team-list'].forEach((id) => element(id).replaceChildren());
  ['profile-form', 'member-form', 'editor-form'].forEach((id) => element(id).reset());
  element('profile-email').value = '';
  element('story-search').value = '';
  document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('selected', button.dataset.filter === 'all'));
  element('boot').hidden = true;
  element('dashboard-view').hidden = true;
  element('login-view').hidden = false;
  element('login-password').value = '';
  inlineError('login-error', message);
}

function identityLabels() {
  const user = state.user;
  element('sidebar-name').textContent = user.name;
  element('sidebar-role').textContent = `${user.role} account`;
  element('role-badge').textContent = `${user.role} workspace`;
  element('role-badge').classList.toggle('owner-badge', user.role === 'owner');
  element('avatar').textContent = initials(user.name);
  element('team-nav').hidden = user.role !== 'owner';
  element('greeting').textContent = `Welcome back, ${user.name.split(' ')[0]}. Every story starts here.`;
  element('profile-name').value = user.name;
  element('profile-username').value = user.username;
  element('profile-email').value = user.email;
  element('today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AN';
}

async function openWorkspace() {
  state.user = await api('/api/newsroom/session');
  identityLabels();
  element('boot').hidden = true;
  element('login-view').hidden = true;
  element('dashboard-view').hidden = false;
  navigate('overview');
  await loadStories();
  if (!state.user.username) toast('Set your sign-in username in My account.');
}

function skeleton(id) {
  const target = element(id);
  target.replaceChildren(...Array.from({ length: 3 }, () => node('div', 'skeleton-row')));
  target.setAttribute('aria-busy', 'true');
}

async function loadStories() {
  skeleton('recent-stories');
  skeleton('all-stories');
  element('workspace-error').hidden = true;
  try {
    state.stories = await api('/api/newsroom/articles');
    renderStories();
  } catch (error) {
    workspaceError(error.message);
    ['recent-stories', 'all-stories'].forEach((id) => {
      element(id).replaceChildren(emptyState('The desk is temporarily offline.', 'Your stories are safe. Retry when your connection is restored.'));
    });
  } finally {
    ['recent-stories', 'all-stories'].forEach((id) => element(id).removeAttribute('aria-busy'));
  }
}

function workspaceError(message) {
  element('workspace-error-text').textContent = message;
  element('workspace-error').hidden = false;
}

function navigate(view) {
  if (!state.user || (view === 'team' && state.user.role !== 'owner')) return;
  state.view = view;
  ['overview', 'articles', 'team', 'account'].forEach((name) => { element(`${name}-section`).hidden = name !== view; });
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  element('breadcrumb').textContent = { overview: 'Overview', articles: 'All stories', team: 'Team & access', account: 'My account' }[view];
  element('workspace-error').hidden = true;
  if (view === 'team') void loadTeam();
}

function emptyState(title, copy, action = false) {
  const wrapper = node('div', 'empty-state');
  wrapper.append(node('div', 'empty-symbol', '▤'), node('h3', '', title), node('p', '', copy));
  if (action) {
    const button = node('button', 'button primary', 'Write your first story →');
    button.type = 'button';
    button.addEventListener('click', () => openEditor());
    wrapper.append(button);
  }
  return wrapper;
}

function storyRow(story) {
  const wrapper = node('article', 'story-row');
  const icon = node('span', 'story-icon', '▤');
  icon.setAttribute('aria-hidden', 'true');
  const title = node('div');
  title.append(node('h3', '', story.title));
  const byline = node('p', 'byline');
  byline.append(document.createTextNode(story.author), node('span', '', '·'), document.createTextNode(story.category));
  title.append(byline);
  const status = node('span', `status-pill ${story.status}`, story.status === 'published' ? 'Published' : 'Draft');
  const date = node('span', 'date-label', new Date(story.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const actions = node('div', 'row-actions');
  const edit = node('button', 'icon-button', 'Edit');
  edit.setAttribute('aria-label', `Edit ${story.title}`);
  edit.addEventListener('click', () => openEditor(story));
  const remove = node('button', 'icon-button delete', 'Delete');
  remove.setAttribute('aria-label', `Delete ${story.title}`);
  remove.addEventListener('click', () => confirmAction('Delete this story?', `“${story.title}” will be permanently removed${story.status === 'published' ? ' from the live site' : ''}. This cannot be undone.`, 'Delete story', async () => {
    await api('/api/newsroom/articles', 'DELETE', { id: story.id, version: story.version });
    state.stories = state.stories.filter((entry) => entry.id !== story.id);
    renderStories();
    toast('Story deleted.');
  }));
  actions.append(edit, remove);
  wrapper.append(icon, title, status, date, actions);
  return wrapper;
}

function renderStories() {
  element('total-count').textContent = state.stories.length;
  element('published-count').textContent = state.stories.filter((story) => story.status === 'published').length;
  element('draft-count').textContent = state.stories.filter((story) => story.status === 'draft').length;
  element('nav-count').textContent = state.stories.length;
  const recent = state.stories.slice(0, 5);
  element('recent-stories').replaceChildren(...(recent.length ? recent.map(storyRow) : [emptyState('The next story is yours.', 'Your newsroom is ready. Create your first draft and bring a new perspective to the continent.', true)]));
  const filtered = state.stories.filter((story) => (state.filter === 'all' || state.filter === story.status) && `${story.title} ${story.author} ${story.category}`.toLowerCase().includes(state.query));
  element('all-stories').replaceChildren(...(filtered.length ? filtered.map(storyRow) : [emptyState(state.stories.length ? 'No stories match.' : 'A fresh page for your newsroom.', state.stories.length ? 'Try another search or switch the status filter.' : 'Create a draft, add your reporting, and publish when it’s ready.', !state.stories.length)]));
}

function openEditor(story = null) {
  state.editing = story;
  const form = element('editor-form');
  form.reset();
  inlineError('editor-error');
  element('editor-title').textContent = story ? 'Refine the story.' : 'A new story.';
  ['title', 'author', 'status', 'category', 'region', 'excerpt', 'image', 'content'].forEach((key) => {
    if (story) form.elements.namedItem(key).value = story[key];
  });
  if (!story) form.elements.author.value = state.user.name;
  element('editor-dialog').showModal();
}

async function saveStory(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  if (state.editing) Object.assign(data, { id: state.editing.id, version: state.editing.version });
  busy(form, true);
  inlineError('editor-error');
  try {
    const story = await api('/api/newsroom/articles', state.editing ? 'PATCH' : 'POST', data);
    state.stories = [story, ...state.stories.filter((entry) => entry.id !== story.id)];
    element('editor-dialog').close();
    form.reset();
    renderStories();
    toast(story.status === 'published' ? 'Story published on Africa Nexus.' : 'Draft saved. Your story stays private until published.');
  } catch (error) {
    inlineError('editor-error', error.message);
  } finally {
    busy(form, false);
  }
}

async function loadTeam() {
  skeleton('team-list');
  state.hasMoreTeam = false;
  element('team-prev').disabled = true;
  element('team-next').disabled = true;
  try {
    const result = await api(`/api/newsroom/team?page=${state.teamPage}`);
    state.hasMoreTeam = result.hasMore;
    element('team-page').textContent = `Page ${result.page}`;
    const rows = result.users.map((member) => {
      const wrapper = node('div', 'team-row');
      const info = node('div', 'team-info');
      info.append(node('strong', '', member.name || member.email), node('small', '', `${member.username ? `@${member.username} · ` : ''}${member.email}`));
      wrapper.append(node('span', 'avatar', initials(member.name || member.email)), info);
      if (member.role === 'owner') wrapper.append(node('span', 'role-badge owner-badge', 'Owner · protected'));
      else {
        const select = node('select');
        select.setAttribute('aria-label', `Access for ${member.name || member.email}`);
        [['admin', 'Admin'], ['owner', 'Owner'], ['none', 'No access']].forEach(([value, label]) => {
          const option = node('option', '', label);
          option.value = value;
          select.append(option);
        });
        select.value = member.role;
        select.addEventListener('change', () => {
          const role = select.value;
          select.value = member.role;
          confirmAction('Change newsroom access?', role === 'owner' ? `Give ${member.name || member.email} full owner access, including team management? Owners cannot be removed from this dashboard.` : `${member.name || member.email} will ${role === 'none' ? 'no longer have access to the newsroom' : 'be able to create, publish, and delete stories'}.`, 'Update access', async () => {
            await api('/api/newsroom/team', 'PATCH', { id: member.id, role });
            await loadTeam();
            toast('Team access updated.');
          });
        });
        wrapper.append(select);
      }
      return wrapper;
    });
    element('team-list').replaceChildren(...(rows.length ? rows : [emptyState('No accounts on this page.', 'Return to the previous page or add a member to your newsroom.')]));
  } catch (error) {
    workspaceError(error.message);
    element('team-list').replaceChildren(emptyState('Unable to load the team.', 'Retry to check your team’s access.'));
  } finally {
    element('team-list').removeAttribute('aria-busy');
    element('team-prev').disabled = state.teamPage === 1;
    element('team-next').disabled = !state.hasMoreTeam;
  }
}

function confirmAction(title, copy, label, action) {
  element('confirm-title').textContent = title;
  element('confirm-copy').textContent = copy;
  element('confirm-action').textContent = label;
  inlineError('confirm-error');
  state.confirm = action;
  element('confirm-dialog').showModal();
}

element('confirm-action').addEventListener('click', async () => {
  const dialog = element('confirm-dialog');
  busy(dialog, true);
  try {
    await state.confirm();
    dialog.close();
  } catch (error) {
    inlineError('confirm-error', error.message);
  } finally {
    busy(dialog, false);
  }
});

element('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  inlineError('login-error');
  try {
    await api('/api/newsroom-login', 'POST', Object.fromEntries(new FormData(form)));
    element('login-password').value = '';
    await openWorkspace();
  } catch (error) {
    inlineError('login-error', error.message);
  } finally {
    busy(form, false);
  }
});

element('show-password').addEventListener('click', (event) => {
  const show = element('login-password').type === 'password';
  element('login-password').type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? 'Hide' : 'Show';
  event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

element('logout').addEventListener('click', async (event) => {
  event.currentTarget.disabled = true;
  try {
    await api('/api/newsroom/logout', 'POST', {});
    showLogin();
    toast('You’re signed out.');
  } catch (error) {
    workspaceError(error.message);
  } finally {
    element('logout').disabled = false;
  }
});

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.view)));
document.querySelectorAll('[data-new-story]').forEach((button) => button.addEventListener('click', () => openEditor()));
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  state.filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((tab) => tab.classList.toggle('selected', tab === button));
  renderStories();
}));
element('story-search').addEventListener('input', (event) => { state.query = event.target.value.toLowerCase().trim(); renderStories(); });
element('editor-form').addEventListener('submit', saveStory);
element('retry').addEventListener('click', () => { element('workspace-error').hidden = true; void (state.view === 'team' ? loadTeam() : loadStories()); });
element('team-prev').addEventListener('click', () => { state.teamPage -= 1; void loadTeam(); });
element('team-next').addEventListener('click', () => { state.teamPage += 1; void loadTeam(); });
element('add-member').addEventListener('click', () => { element('member-form').reset(); inlineError('member-error'); element('member-dialog').showModal(); });
element('member-dialog').addEventListener('close', () => { element('member-password').value = ''; });
element('password-dialog').addEventListener('close', () => { element('password-form').reset(); state.token = null; });

element('member-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  inlineError('member-error');
  try {
    await api('/api/newsroom/team', 'POST', Object.fromEntries(new FormData(form)));
    element('member-dialog').close();
    form.reset();
    state.teamPage = 1;
    await loadTeam();
    toast('Account created. The team member can now sign in.');
  } catch (error) {
    inlineError('member-error', error.message);
  } finally {
    busy(form, false);
  }
});

element('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  inlineError('profile-error');
  try {
    await api('/api/newsroom/profile', 'POST', Object.fromEntries(new FormData(form)));
    state.user = await api('/api/newsroom/session');
    identityLabels();
    toast('Profile saved. Use your username for your next sign-in.');
  } catch (error) {
    inlineError('profile-error', error.message);
  } finally {
    busy(form, false);
  }
});

element('forgot-password').addEventListener('click', () => {
  element('recovery-form').reset();
  inlineError('recovery-error');
  element('recovery-success').hidden = true;
  element('recovery-dialog').showModal();
});
element('recovery-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  inlineError('recovery-error');
  try {
    await api('/api/newsroom-account', 'POST', { action: 'recover', ...Object.fromEntries(new FormData(form)) });
    element('recovery-success').hidden = false;
  } catch (error) {
    inlineError('recovery-error', error.message);
  } finally {
    busy(form, false);
  }
});
element('password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (element('new-password').value !== element('confirm-password').value) {
    inlineError('password-error', 'The passwords do not match.');
    return;
  }
  busy(form, true);
  inlineError('password-error');
  try {
    await api('/api/newsroom-account', 'POST', { ...state.token, password: element('new-password').value });
    element('password-dialog').close();
    await openWorkspace();
    toast('Your password is set. Welcome to the newsroom.');
  } catch (error) {
    inlineError('password-error', error.message);
  } finally {
    busy(form, false);
  }
});

async function initialize() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const action = hash.has('invite_token') ? 'invite' : hash.has('recovery_token') ? 'recovery' : null;
  if (action) {
    state.token = { action, token: hash.get(`${action}_token`) };
    history.replaceState(null, '', window.location.pathname);
    showLogin();
    element('password-title').textContent = action === 'invite' ? 'Welcome to the newsroom.' : 'Set a new password.';
    element('password-dialog').showModal();
    return;
  }
  try {
    await openWorkspace();
  } catch (error) {
    showLogin(error.status === 401 ? '' : error.message);
  }
}

void initialize();
