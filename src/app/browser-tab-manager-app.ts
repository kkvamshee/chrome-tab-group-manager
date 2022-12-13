import { handleTabDeletion, handleTabUpdate } from "./handlers/tab-event-handlers";

export class BrowserTabManagerApp {
    constructor() {
        
    }

    init():void {
        this.registerListeners();        
    }

    private registerListeners(): void {        
        chrome.tabs.onUpdated.addListener(handleTabUpdate);
        chrome.tabs.onRemoved.addListener(handleTabDeletion);
    }
}