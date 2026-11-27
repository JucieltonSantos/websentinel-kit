export default defineBackground(() => {
  console.info('Stack spike service worker started.');
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
