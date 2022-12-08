import { onTabCreated, onTabRemoved, onTabUpdated } from "./listeners/tab-events";

export class ChromeTabManagerApp {
    constructor() {
        
    }

    init():void {
        this.registerListeners();
    }

    private registerListeners(): void {
        chrome.tabs.onCreated.addListener(onTabCreated);
        chrome.tabs.onUpdated.addListener(onTabUpdated);
        chrome.tabs.onRemoved.addListener(onTabRemoved);
    }
}