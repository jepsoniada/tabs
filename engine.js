class Yeah extends Array {
    mode = "immediate" // "immediate" | "retained"
    active = 0
    set mode(value) {
        if (value != "immediate" && value != "retained") {
            throw `"immediate" | "retained"`
        } else {
            mode = value
        }
    }
    async push(...values) {
        super.push(...values)
        if (this.mode == "immediate") {
            await this.execute()
            this.active--
            if (this.active == 0) {
                document.querySelector("main-").refresh()
            }
        }
    }
    
    async execute () {
        await this.pop().execute()
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
        await chrome.tabs.remove(this.tabId)
    }
}

export class Move extends Action {
    static priority = 0    
    #tabId = undefined
    #container = undefined
    constructor(tabId, destination) {
        super()
        if (!(destination instanceof Container)) {
            throw "not container"
        }
        this.#tabId = tabId
        this.#container = destination
    }
    async execute() {
        if (this.#container instanceof Window) {
            await chrome.tabs.move(this.#tabId, {
                index: -1,
                windowId: this.#container.id,
            })    
        } else if (this.#container instanceof Group) {
            await chrome.tabs.group({
                groupId: this.#container.id,
                tabIds: this.#tabId,
            })
        }
    }
}

export class Container {
    id = undefined
    constructor(id) {
        this.id = id
    }
}
export class Window extends Container {}
export class Group extends Container {}
