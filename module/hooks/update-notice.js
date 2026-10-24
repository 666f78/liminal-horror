import { SETTINGS_NS } from '../settings.js';
import { renderCard } from '../utils/chat-card.js';
import { dWarn } from '../utils/debug.js';
import { t, td } from '../utils/i18n.js';

// Debug: always show update notice on each world launch
const FORCE_SHOW_EVERY_START = false;
const SUPPORT_URL = 'https://666f78.pp.ua/donate';
const SUPPORT_TOOLTIP_HTML =
  'Support ongoing development and improvements to this Foundry system.<br>This is an unofficial Foundry VTT adaptation and is not affiliated with the creators of Liminal Horror.';

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
  const readmeUrl = 'https://github.com/666f78/liminal-horror#readme';
  const discussionsUrl = 'https://github.com/666f78/liminal-horror/discussions';
  const versionCards = sections
    .map((section) => {
      const isCurrent = section.version === currentVersion;
      const badge = isCurrent ? '<span class="lh-update-badge">Current</span>' : '';
      const bodyHtml = renderSectionHtml(section.body);
      return `
        <article class="lh-update-card ${isCurrent ? 'lh-update-card-current' : ''}">
          <header>
            <h3 class="lh-update-version">${foundry.utils.escapeHTML(section.version)} ${badge}</h3>
          </header>
          ${bodyHtml}
        </article>
      `;
    })
    .join('\n');

  return `
    <section class="lh-update-notice">
      <header class="lh-update-overview">
        <div class="lh-update-overview-title">
          <h2>Liminal Horror changelog</h2>
          <p class="lh-update-current-version">Current version: <strong>${foundry.utils.escapeHTML(currentVersion)}</strong></p>
        </div>
        <nav class="lh-update-links" aria-label="Liminal Horror links">
          <a href="${bugsUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-bug" inert></i>Bugs</a>
          <a href="${readmeUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-book-open" inert></i>Readme</a>
          <a href="${discussionsUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-comments" inert></i>Discussions</a>
          <a class="button lh-update-support-link" href="${SUPPORT_URL}" target="_blank" rel="noopener noreferrer"
             data-tooltip-html="${SUPPORT_TOOLTIP_HTML}">
            <i class="fa-solid fa-heart" inert></i> Support Development
          </a>
        </nav>
      </header>
      <div class="lh-update-scroll">${versionCards || '<p>No version entries found.</p>'}</div>
    </section>
  `;
}

function buildChatNoticeHtml(currentVersion, notesHtml) {
  const bugsUrl = game.system?.bugs || 'https://github.com/666f78/liminal-horror/issues';
  const readmeUrl = game.system?.readme || 'https://raw.githubusercontent.com/666f78/liminal-horror/master/README.md';
  const discussionsUrl = 'https://github.com/666f78/liminal-horror/discussions';

  return `
    <section class="lh-update-notice">
      ${renderCard(
        'Liminal Horror',
        [td('LH.msg.systemUpdated', { version: foundry.utils.escapeHTML(currentVersion) })],
        {
          icon: 'fa-circle-up',
          description: notesHtml,
        }
      )}
      <div class="lh-update-chat-links">
        <nav class="lh-update-links" aria-label="Liminal Horror links">
          <a href="${bugsUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-bug" inert></i>Bugs</a>
          <a href="${readmeUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-book-open" inert></i>Readme</a>
          <a href="${discussionsUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-comments" inert></i>Discussions</a>
        </nav>
        <a class="button lh-update-support-link" href="${SUPPORT_URL}" target="_blank" rel="noopener noreferrer"
           data-tooltip-html="${SUPPORT_TOOLTIP_HTML}">
          <i class="fa-solid fa-heart" inert></i> Support Development
        </a>
      </div>
    </section>
  `;
}

async function createChatNotice(content) {
  await ChatMessage.create({
    speaker: { alias: 'Liminal Horror' },
    content,
  });
}

async function showDialogNotice(content) {
  await foundry.applications.api.DialogV2.wait({
    classes: ['lh', 'lh-confirm-dialog', 'lh-update-dialog'],
    window: { title: 'Liminal Horror Update', resizable: true },
    position: { width: 820 },
    content,
    buttons: [{ action: 'ok', label: t('LH.core.ok'), default: true }],
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
