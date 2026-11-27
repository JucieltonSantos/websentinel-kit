import { observed, projectCookie, unavailable } from '../projection';
const url = 'https://127.0.0.1:4193/target/page';
let selectedTab: number | undefined;
export default defineBackground(() => {
  chrome.action.onClicked.addListener(tab => {
    if (!tab.url?.startsWith('https://127.0.0.1:4193/')) { selectedTab = undefined; return; }
    selectedTab = tab.id;
    if (tab.windowId !== undefined) void chrome.sidePanel.open({windowId:tab.windowId});
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('sidepanel.html')) return;
    if (message === 'status') {
      Promise.all([chrome.permissions.contains({permissions:['cookies']}),chrome.permissions.contains({origins:['https://127.0.0.1/*']})]).then(([cookies,host]) => respond({cookies,host,tabSelected:selectedTab !== undefined})).catch(() => respond({error:'permission_check_failed'}));
      return true;
    }
    if (message === 'observe-unpartitioned' || message === 'observe-partitioned') {
      (async () => {
        try {
          if (selectedTab === undefined || !await chrome.permissions.contains({permissions:['cookies']})) return unavailable();
          const stores = await chrome.cookies.getAllCookieStores();
          const store = stores.find(item => item.tabIds.includes(selectedTab!));
          if (!store) return unavailable();
          const details: chrome.cookies.GetAllDetails = {url,storeId:store.id};
          if (message === 'observe-partitioned') details.partitionKey = {topLevelSite:'https://127.0.0.1'};
          // Project immediately in this component; never log, serialize, or transmit raw cookies.
          const facts = (await chrome.cookies.getAll(details)).map(projectCookie);
          return observed(facts);
        } catch { return unavailable(); }
      })().then(respond);
      return true;
    }
  });
});
