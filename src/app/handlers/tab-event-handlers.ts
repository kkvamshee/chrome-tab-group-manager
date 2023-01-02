import { ChromeTabManagerService } from "../service/chrome-tab-manager-service";
import { isDefined } from "../util/util";

export function handleTabDeletion(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo): void {
    //TODO dissolve tab group if less than MIN_NUMBER_TABS_TO_GROUP tabs are left in the group
}

export function handleTabGroupDeletion(tabGroup: chrome.tabGroups.TabGroup): void {
    console.debug(`Tab Group with title: ${tabGroup.title} and id: ${tabGroup.id} is deleted`);

    ChromeTabManagerService.getInstance().handleTabGroupDeletion(tabGroup);
}

export function handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    console.log(`Tab with id ${tabId} is updated`);
    console.debug(changeInfo);
    console.debug(tab);

    if (isDefined(changeInfo.status) && changeInfo.status === "complete") {
        ChromeTabManagerService.getInstance().handleNewUrl(tab);
    }

    return;
}