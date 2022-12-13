import { DUMMY_GROUP_TITLE, MIN_NUMBER_TABS_TO_GROUP } from "../util/constants";
import { isDefined, isNullOrUndefined } from "../util/util";

export class ChromeTabManagerService {
    private static _instance: ChromeTabManagerService;

    private constructor() {}

    private groupsCreated: Map<string, chrome.tabGroups.TabGroup> = new Map();    

    public static getInstance(): ChromeTabManagerService {
        if (isDefined(this._instance)) {
            return this._instance;
        }

        this._instance = new ChromeTabManagerService();
        return this._instance;
    }

    /**
     * get tab key (domain in this case)
     * check if group already exists with this key
     *      if current tab exists in the group, ignore
     *      else move current tab to the group found
     * get list of tabs in window with the same key
     * if this list is big enough, group these tabs
     */
    public async handleNewUrl(tab: chrome.tabs.Tab): Promise<void> {
        console.log(`handling new url update: ${tab.url}`);
        const groupingKey: string = this.getGroupingIdentifier(tab);
        let tabGroup = this.getTabGroupFromIdentifier(groupingKey);
        if (isDefined(tabGroup)) this.moveTabToGroup(tab, tabGroup!);

        const similarTabs: Array<chrome.tabs.Tab> = await this.getAllTabsWithIdentifer(groupingKey, tab.windowId);
        if (similarTabs.length < MIN_NUMBER_TABS_TO_GROUP) return;
        const groupMetadataProperties: chrome.tabGroups.UpdateProperties = this.generateGroupMetadataProperties(tab);
        console.log(`groupMetaData Properties: ${JSON.stringify(groupMetadataProperties, null, 4)}`);
        this.createTabGroup(similarTabs, groupMetadataProperties)
    }

    private generateGroupMetadataProperties(tab: chrome.tabs.Tab): chrome.tabGroups.UpdateProperties {
        const collapsed: boolean = false;

        let title = this.getGroupingIdentifier(tab);
        title = title ? title : DUMMY_GROUP_TITLE;

        return {collapsed,title};
    }

    private getGroupingIdentifier(tab: chrome.tabs.Tab): string {
        // returns identifier for a tab which will be used to identify similar tabs
        const url = isNullOrUndefined(tab.url) ? '' : tab.url!;

        if (url === '') return url;

        return (new URL(url)).hostname;
    }

    private getTabGroupFromIdentifier(id: string): chrome.tabGroups.TabGroup | null {
        // takes grouping identifier and returns a tabGroup if created already
        if (isNullOrUndefined(id)) return null;

        return this.groupsCreated.has(id) ? this.groupsCreated.get(id)! : null;
    }

    private async isTabInGroup(tab: chrome.tabs.Tab, tabGroup: chrome.tabGroups.TabGroup): Promise<boolean> {
        // checks if argument <tab> is present in the argument <tabGroup>
        return tab.groupId === tabGroup.id;
    }

    private async moveTabToGroup(tab: chrome.tabs.Tab, tabGroup: chrome.tabGroups.TabGroup): Promise<void> {
        // moves argument <tab> into the argument <tabGroup>
        if (isNullOrUndefined(tab)) return;;
        if (isNullOrUndefined(tabGroup)) return;;

        if (tab.groupId === tabGroup.id) return;

        const groupOptions: chrome.tabs.GroupOptions = {
            createProperties: {
                windowId: tabGroup.windowId
            },
            groupId: tabGroup.id,
            tabIds: tab.id
        }
        await chrome.tabs.group(groupOptions);
    }

    private async getAllTabsWithIdentifer(id: string, windowId: number): Promise<Array<chrome.tabs.Tab>> {
        // get all tabs in the argument <window> having same identifier as argument <id>
        let tabs: Array<chrome.tabs.Tab> = await chrome.tabs.query({
            windowId: windowId,
        });        
        let similarTabs: Array<chrome.tabs.Tab> = tabs.filter(tab => this.getGroupingIdentifier(tab) === id);

        return similarTabs;
    }

    private async createTabGroup(tabs: Array<chrome.tabs.Tab>, updateProperties: chrome.tabGroups.UpdateProperties): Promise<chrome.tabGroups.TabGroup> {
        const tabIds: Array<number> = tabs.filter(tab => isDefined(tab.id)).map(tab => tab.id!);
        const groupOptions: chrome.tabs.GroupOptions = {
            tabIds: tabIds
        };
        let tabGroupId: number = await chrome.tabs.group(groupOptions);

        const tabGroup: chrome.tabGroups.TabGroup = await chrome.tabGroups.update(tabGroupId, updateProperties);
        this.groupsCreated.set(updateProperties.title!, tabGroup);
        return tabGroup;
    }
}