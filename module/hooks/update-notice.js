import { SETTINGS_NS } from '../settings.js';
import { dWarn } from '../utils/debug.js';

// Debug: always show update notice on each world launch
const FORCE_SHOW_EVERY_START = false;

function renderSectionHtml(sectionText) {
  if (!sectionText) return '<p>No detailed notes were found for this version.</p>';

  const lines = sectionText.split('\n');
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const headingMatch = line.match(/^###\s+(.+)$/);
    if (headingMatch) {
      closeList();
      html.push(`<h3>${foundry.utils.escapeHTML(headingMatch[1])}</h3>`);
      continue;
    }

    const bulletMatch = line.match(/^-+\s+(.+)$/);
    if (bulletMatch) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${foundry.utils.escapeHTML(bulletMatch[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${foundry.utils.escapeHTML(line)}</p>`);
  }

  closeList();
  return html.join('\n');
}

function parseChangelogSections(changelog) {
  const normalized = changelog.replace(/\r/g, '');
  const pattern = /^## \[([^\]]+)\]\s*$([\s\S]*?)(?=^## \[|(?![\s\S]))/gm;
  const sections = [];
  let match;

  while ((match = pattern.exec(normalized)) !== null) {
    sections.push({
      version: match[1].trim(),
      body: match[2].trim(),
    });
  }

  return sections;
}

async function getChangelogSections() {
  const response = await fetch(`systems/${game.system.id}/CHANGELOG.md`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load changelog (${response.status})`);

  const content = await response.text();
  return parseChangelogSections(content);
}

function buildCurrentVersionNotesHtml(currentVersion, sections) {
  const currentSection = sections.find((section) => section.version === currentVersion);
  return renderSectionHtml(currentSection?.body ?? '');
}

function buildModalNoticeHtml(currentVersion, sections) {
  const bugsUrl = game.system?.bugs || 'https://github.com/666f78/liminal-horror/issues';
  const readmeUrl = game.system?.readme || 'https://raw.githubusercontent.com/666f78/liminal-horror/master/README.md';
  const discussionsUrl = 'https://github.com/666f78/liminal-horror/discussions';
  const versionCards = sections
    .map((section) => {
      const isCurrent = section.version === currentVersion;
      const badge = isCurrent
        ? '<span style="font-size:0.75rem;line-height:1;padding:0.2rem 0.4rem;border-radius:999px;background:var(--color-warm-2);color:var(--color-text-light-0);">Current</span>'
        : '';
      const cardStyle = isCurrent
        ? 'border:1px solid var(--color-warm-1);box-shadow:0 0 0 1px var(--color-warm-2) inset;border-radius:8px;padding:0.6rem 0.8rem;margin:0 0 0.75rem;background:color-mix(in srgb, var(--color-bg) 92%, black 8%);'
        : 'border:1px solid var(--color-border-light-primary);border-radius:8px;padding:0.6rem 0.8rem;margin:0 0 0.75rem;background:color-mix(in srgb, var(--color-bg) 92%, black 8%);';
      const bodyHtml = renderSectionHtml(section.body);
      return `
        <article style="${cardStyle}">
          <header>
            <h3 style="display:flex;align-items:center;gap:0.45rem;margin:0 0 0.45rem;">${foundry.utils.escapeHTML(section.version)} ${badge}</h3>
          </header>
          ${bodyHtml}
        </article>
      `;
    })
    .join('\n');

  return `
    <section class="lh-update-notice" style="display:flex;flex-direction:column;">
      <h2>Liminal Horror changelog</h2>
      <p>Current system version: <strong>${foundry.utils.escapeHTML(currentVersion)}</strong></p>
      <p style="display:flex;gap:0.75rem;flex-wrap:wrap;">
        <a href="${bugsUrl}" target="_blank" rel="noopener noreferrer">Bugs</a>
        <a href="${readmeUrl}" target="_blank" rel="noopener noreferrer">Readme</a>
        <a href="${discussionsUrl}" target="_blank" rel="noopener noreferrer">Discussions</a>
      </p>
      <div style="max-height:min(56vh, 540px);overflow-y:auto;padding-right:0.4rem;margin-top:0.5rem;">${versionCards || '<p>No version entries found.</p>'}</div>
    </section>
  `;
}

function buildChatNoticeHtml(currentVersion, notesHtml) {
  const bugsUrl = game.system?.bugs || 'https://github.com/666f78/liminal-horror/issues';
  const readmeUrl = game.system?.readme || 'https://raw.githubusercontent.com/666f78/liminal-horror/master/README.md';
  const discussionsUrl = 'https://github.com/666f78/liminal-horror/discussions';

  return `
    <section class="lh-update-notice">
      <h2>Liminal Horror updated to ${foundry.utils.escapeHTML(currentVersion)}</h2>
      ${notesHtml}
      <p style="display:flex;gap:0.75rem;flex-wrap:wrap;">
        <a href="${bugsUrl}" target="_blank" rel="noopener noreferrer">Bugs</a>
        <a href="${readmeUrl}" target="_blank" rel="noopener noreferrer">Readme</a>
        <a href="${discussionsUrl}" target="_blank" rel="noopener noreferrer">Discussions</a>
      </p>
    </section>
  `;
}

async function createChatNotice(content) {
  await ChatMessage.create({
    speaker: { alias: 'Liminal Horror' },
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
  });
}

async function showDialogNotice(content) {
  const dialogApi = foundry?.applications?.api?.DialogV2;
  if (dialogApi) {
    await dialogApi.wait({
      window: { title: 'Liminal Horror Update', resizable: true },
      position: { width: 820 },
      content,
      buttons: [{ action: 'ok', label: 'OK', default: true }],
    });
    return;
  }

  await Dialog.prompt({
    title: 'Liminal Horror Update',
    content,
    callback: () => {},
  });
}

export async function openSystemUpdateDialog({ includeChat = false } = {}) {
  if (!game.user.isGM) {
    ui.notifications?.warn('Only the GM can open the system update dialog.');
    return;
  }

  const currentVersion = game.system.version;
  let sections = [];
  try {
    sections = await getChangelogSections();
  } catch (error) {
    dWarn('[LH:update-notice] changelog read failed', error);
  }

  const notesHtml = buildCurrentVersionNotesHtml(currentVersion, sections);
  const chatContent = buildChatNoticeHtml(currentVersion, notesHtml);
  const modalContent = buildModalNoticeHtml(currentVersion, sections);

  if (includeChat) {
    await createChatNotice(chatContent);
  }
  await showDialogNotice(modalContent);
}

export async function showSystemUpdateNotice() {
  if (!game.user.isGM) return;

  const currentVersion = game.system.version;
  const lastSeenVersion = game.settings.get(SETTINGS_NS, 'lastSeenSystemVersion');
  const shouldShow = FORCE_SHOW_EVERY_START || foundry.utils.isNewerVersion(currentVersion, lastSeenVersion);
  if (!shouldShow) return;
  await openSystemUpdateDialog({ includeChat: true });
  if (!FORCE_SHOW_EVERY_START) {
    await game.settings.set(SETTINGS_NS, 'lastSeenSystemVersion', currentVersion);
  }
}
