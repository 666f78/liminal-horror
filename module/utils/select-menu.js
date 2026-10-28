const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

export function bindSelectMenu(container, trigger, onSelect) {
  const menu = trigger && container.ownerDocument.getElementById(trigger.getAttribute('popovertarget'));
  const view = container.ownerDocument.defaultView;
  if (!trigger || !menu || !view) return;

  const controller = new view.AbortController();
  const { signal } = controller;
  const options = [...menu.querySelectorAll('[data-value]')];
  let focusLast = false;
  const isOpen = () => menu.matches(':popover-open');
  const close = (restoreFocus = false) => {
    if (!isOpen()) return;
    menu.hidePopover();
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus && trigger.isConnected) trigger.focus();
  };

  const positionMenu = () => {
    const rect = (trigger.closest('[data-select-anchor]') ?? trigger).getBoundingClientRect();
    const { clientWidth, clientHeight } = container.ownerDocument.documentElement;
    const below = clientHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const above = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    menu.style.minWidth = `${rect.width}px`;
    menu.style.maxHeight = `${Math.max(above, below)}px`;
    const height = menu.getBoundingClientRect().height;
    const openAbove = height > below && above > below;
    menu.style.maxHeight = `${Math.max(VIEWPORT_MARGIN, openAbove ? above : below)}px`;
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(rect.left, clientWidth - bounds.width - VIEWPORT_MARGIN))}px`;
    menu.style.top = `${openAbove ? rect.top - bounds.height - MENU_GAP : rect.bottom + MENU_GAP}px`;
  };

  menu.addEventListener(
    'beforetoggle',
    (event) => {
      if (event.newState !== 'open') return;
      menu.dataset.measuring = 'true';
      try {
        positionMenu();
      } finally {
        delete menu.dataset.measuring;
      }
    },
    { signal }
  );

  menu.addEventListener(
    'toggle',
    () => {
      trigger.setAttribute('aria-expanded', String(isOpen()));
      if (!isOpen()) return;
      const selected = options.find((option) => option.getAttribute('aria-checked') === 'true');
      (focusLast ? options.at(-1) : (selected ?? options[0]))?.focus();
      focusLast = false;
    },
    { signal }
  );

  trigger.addEventListener(
    'keydown',
    (event) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      focusLast = event.key === 'ArrowUp';
      if (!isOpen()) menu.showPopover();
    },
    { signal }
  );

  menu.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
        close(true);
        return;
      }
      const index = options.indexOf(container.ownerDocument.activeElement);
      const next = {
        ArrowDown: (index + 1) % options.length,
        ArrowUp: (index - 1 + options.length) % options.length,
        Home: 0,
        End: options.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      options[next]?.focus();
    },
    { signal }
  );

  menu.addEventListener(
    'click',
    async (event) => {
      const option = event.target.closest('[data-value]');
      if (!option) return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
      await onSelect(option.dataset.value);
    },
    { signal }
  );

  menu.addEventListener(
    'focusout',
    (event) => {
      if (!menu.contains(event.relatedTarget) && event.relatedTarget !== trigger) close();
    },
    { signal }
  );
  container.addEventListener(
    'pointerdown',
    (event) => {
      if (!menu.contains(event.target) && !trigger.contains(event.target)) close();
    },
    { signal, capture: true }
  );
  container.addEventListener(
    'scroll',
    (event) => {
      if (!menu.contains(event.target)) close();
    },
    { signal, capture: true }
  );
  view.addEventListener('resize', () => close(), { signal });

  return () => {
    close();
    controller.abort();
  };
}
