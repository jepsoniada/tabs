class Yeah extends Array {
    mode = "immediate" // "immediate" | "retained"
    set mode(value) {
        if (value != "immediate" && value != "retained") {
            throw `"immediate" | "retained"`
        } else {
            mode = value
        }
    }
    push(...values) {
        super.push(...values)
        if (this.mode == "immediate") {
            this.execute()
            document.querySelector("main-").refresh()
        }
    }
    
    execute () {
        this.pop().execute()
    }
    parse () {}
}

export let record = new Yeah()

export class Action {
    async execute() {}
}

export class Delete extends Action {
    static priority = 1
    tabId = undefined
    constructor(tabId) {
        super()
        this.tabId = tabId
    }
    async execute() {
        chrome.tabs.remove(this.tabId)
    }
}

export class Move extends Action {
    static priority = 0    
    tabId = undefined
    windowId = undefined
    constructor(tabId, destination) {
        super()
        this.tabId = tabId
        this.windowId = destination
    }
    async execute() {
        chrome.tabs.move(this.tabId, {
            index: -1,
            windowId: this.windowId,
        })
    }
}
