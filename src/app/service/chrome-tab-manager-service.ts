import { DUMMY_GROUP_TITLE, MIN_NUMBER_TABS_TO_GROUP } from "../util/constants";
import { isDefined, isNullOrUndefined } from "../util/util";
import { getSubdomain, parse } from "tldjs";

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

        if (tab.groupId > -1 && this.isTabInGroup(tab, tabGroup)) {
            console.debug(`Nothing to do as tab is already present in the destination tab group`);
            return;
        }
        if (isDefined(tabGroup)) {
            console.debug(`A tab group is already created for similar tabs. Moving the tab ${tab.url} to the group with title ${tabGroup?.title}`);
            await this.moveTabToGroup(tab, tabGroup!);
            return;
        }
        if (tab.groupId > -1) {
            console.debug(`Tab is found in a wrong tabGroup and an approprite tab Group doesn't exist`);
            await this.ungroupTab(tab);
        }

        const similarTabs: Array<chrome.tabs.Tab> = await this.getAllTabsWithIdentifer(groupingKey, tab.windowId);
        if (similarTabs.length < MIN_NUMBER_TABS_TO_GROUP) return;
        const groupMetadataProperties: chrome.tabGroups.UpdateProperties = this.generateGroupMetadataProperties(tab);
        console.log(`groupMetaData Properties: ${JSON.stringify(groupMetadataProperties, null, 4)}`);
        this.createTabGroup(similarTabs, groupMetadataProperties)
    }

    public handleTabGroupDeletion(tabGroup: chrome.tabGroups.TabGroup): void {
        let groupingKey: string = tabGroup.title ? tabGroup.title : '';
        if (this.groupsCreated.has(groupingKey)) {
            this.groupsCreated.delete(groupingKey);
            return;
        }

        return;
    }

    private generateGroupMetadataProperties(tab: chrome.tabs.Tab): chrome.tabGroups.UpdateProperties {
        const collapsed: boolean = false;

        let title = this.getGroupingIdentifier(tab);
        title = title ? title : DUMMY_GROUP_TITLE;

        return {collapsed,title};
    }

    private getGroupingIdentifier(tab: chrome.tabs.Tab): string {
        // returns identifier for a tab which will be used to identify similar tabs
        console.debug(`getting grouping identifier for tab with id ${tab.id}`);
        let urlParts = parse(isDefined(tab.url) ? tab.url! : '');
        let id: string = ''
        if (urlParts.domain && urlParts.publicSuffix) {
            id = urlParts.domain?.substring(0, urlParts.domain.length - urlParts.publicSuffix?.length - 1);
            console.debug(`Parsed Grouping Identifier: ${id}`);
            return id;
        }
        
        return '';
    }

    private getTabGroupFromIdentifier(id: string): chrome.tabGroups.TabGroup | null {
        // takes grouping identifier and returns a tabGroup if created already
        console.debug(`checking if a tab group exists already for grouping identifier: ${id}`);
        if (isNullOrUndefined(id)) return null;

        let tabGroup = this.groupsCreated.has(id) ? this.groupsCreated.get(id)! : null;
        console.debug(`Tab group found from id: ${id}`);
        console.debug(tabGroup);
        return tabGroup;
    }

    private isTabInGroup(tab: chrome.tabs.Tab, tabGroup: chrome.tabGroups.TabGroup | null): boolean {
        // checks if argument <tab> is present in the argument <tabGroup>
        if (isNullOrUndefined(tabGroup) || isNullOrUndefined(tabGroup!.id)) return false; 

        return tab.groupId === tabGroup!.id;
    }

    private async moveTabToGroup(tab: chrome.tabs.Tab, tabGroup: chrome.tabGroups.TabGroup | null): Promise<void> {
        // moves argument <tab> into the argument <tabGroup>. returns true if the tab is moved
        console.debug(tab);
        console.debug(tabGroup);

        if (isNullOrUndefined(tab)) return;

        if (isNullOrUndefined(tabGroup)) return;

        if (this.isTabInGroup(tab, tabGroup)) {
            console.debug('Tab is already placed in correct group. No need to move the tab');
            return;
        }

        let groupOptions: chrome.tabs.GroupOptions = {
            groupId: tabGroup!.id,
            tabIds: tab.id
        }
        await chrome.tabs.group(groupOptions);
        return;
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
        console.debug(`groups created`);
        console.debug(this.groupsCreated);
        return tabGroup;
    }

    private async ungroupTab(tab: chrome.tabs.Tab): Promise<void> {
        if (isNullOrUndefined(tab)) return;

        console.debug(`ungrouping the tab with id: ${tab.id} and url: ${tab.url}`);
        await chrome.tabs.ungroup(tab.id!);
        return;
    }
}