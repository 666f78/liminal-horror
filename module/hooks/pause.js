const syncPauseCaption = (element) => {
  const caption = element?.querySelector?.('figcaption');
  if (!caption) return;
  caption.dataset.text = caption.textContent?.trim() ?? '';
};

export const registerPauseHooks = () => {
  Hooks.on('renderGamePause', (app, element) => {
    syncPauseCaption(element ?? app?.element);
  });

  Hooks.once('ready', () => {
    syncPauseCaption(ui.pause?.element);
  });
};
