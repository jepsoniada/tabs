import { webComponent } from "./util.js"
import { Move, Delete, record } from "./engine.js" 

//
customElements.define("tab-", class extends webComponent(HTMLLabelElement) {
    static observedAttributes = ["data-id"]
    id = undefined
    state = undefined // (TYPE extends Action && !Action) | undefined
    windowId = undefined
    constructor () {
	super(document.querySelector("#tab-"))
        this.querySelector("input").addEventListener("focus", (event) => {
            this.scrollIntoView({ block: "center" })
            this.dispatchEvent(new Event("tabFocus", { bubbles: true }))
        })
        this.addEventListener("delete", (event) => {
            record.push(new Delete(this.id))
            this.querySelector(`.icon`).textContent = "D"
            Object.assign(this.querySelector(`.icon`).style, {
                background: "var(--delete_color)",
                color: "white",
            })
        })
        this.addEventListener("transpose", ({ detail: { destination } }) => {
            record.push(new Move(this.id, destination.id))
            this.querySelector(`.icon`).textContent = "T"
            Object.assign(this.querySelector(`.icon`).style, {
                background: "#00f",
                color: "white",
            })
            destination.querySelector(".tabs").insertAdjacentElement("afterbegin", this)
        })
    }
    async attributeChangedCallback(name, _, value) {
        await ({
            ["data-id"]: async (value) => {
                this.id = Number(value)
                const { windowId, title, favIconUrl }
                      = (await chrome.tabs.get(this.id))
                this.windowId = windowId
                this.querySelector(".title").textContent
                    = title
                this.querySelector(".icon").style.backgroundImage
                    = `url(${favIconUrl})`
            },
        })[name](value)
    }
}, { extends: "label" })
//
customElements.define("group-", class extends webComponent(HTMLElement) {
    static observedAttributes = ["data-id"]
    id = undefined
    constructor() {
        super(document.querySelector("#group-"))
    }
    async attributeChangedCallback(name, _, value) {
        ({
            ["data-id"]: async (value) => {
                this.id = Number(value)
                const { color, title } = (await chrome.tabGroups.get(this.id))
                
                this.querySelector("h1").textContent = title
                
                this.setAttribute("data-color", color)

                this.querySelector(".tabs")
                    .innerHTML
                    = (await chrome.tabs.query({ groupId: this.id }))
                    .map( ( { id }) => {
                        return `<label is="tab-" data-id="${id}"></label>`
                    })
                    .join('')
            },
        })[name](value)
    }
})
//
customElements.define("window-", class extends webComponent(HTMLElement) {
    static observedAttributes = ["data-id"]
    id = undefined
    constructor () {
	super(document.querySelector("#window-"))
    }
    async attributeChangedCallback(name, _, value) {
        await ({
            ["data-id"]: async (value) => {
                this.querySelector("h1")
                    .textContent
                    = this.id
                    = Number(value)
                const window = await chrome.windows.get(this.id)
                this.className = window.incognito ? "incognito" : ""
                this.querySelector(".tabs")
                    .innerHTML
                    = (await chrome.tabs.query({ windowId: this.id }))
                    .map( ( { id, groupId }, index, array) => {
                        if ( index == 0 ) {
                            if (groupId == -1) {
                                return `<label is="tab-" data-id="${id}"></label>`
                            }
                            return `<group- data-id="${groupId}"></group->`
                        }
                        else if ( array[index - 1].groupId >= 0 && groupId >= 0 ) {
                            if (array[index - 1].groupId == groupId) {
                                return ''
                            }
                            return `<group- data-id="${groupId}"></group->`
                        }
                        else if ( array[index - 1].groupId == groupId ){
                            return `<label is="tab-" data-id="${id}"></label>`
                        }
                        else if ( groupId == -1 ) {
                            return `<label is="tab-" data-id="${id}"></label>`
                        }
                        return `<group- data-id="${groupId}"></group->`
                    })
                    .join('')
            },
        })[name](value)
    }
})
//
customElements.define("window-list-", class extends webComponent(HTMLElement) {
    windows = undefined
    lazyFocusedTab = () => this.querySelector(`[is="tab-"]`)

    constructor () {
	super(document.querySelector("#window-list-"))
        this.addEventListener("tabFocus", (event) => {
            this.lazyFocusedTab = () => event.target
        })
        this.addEventListener("reload", this.connectedCallback)
    }
    async connectedCallback() {
        this.windows = this.windows ?? await chrome.windows.getAll()
        this.innerHTML = this.windows
            .map(({id, incognito}) =>
                `<window- data-id="${id}"></window->`)
            .join('')
    }
})
//
customElements.define("main-", class extends webComponent(HTMLElement) {
    isRightSide = false
    constructor () {
	super(document.querySelector("#main-"))
        this.addEventListener("rootKeyDown", (event) => {
            (({
                "n": () => this.moveBy(1),
                "p": () => this.moveBy(-1),
                "f": () => this.windowMoveBy(1),
                "b": () => this.windowMoveBy(-1),
                "o": () => {
                    this.isRightSide = !this.isRightSide
                    this.activeSide.lazyFocusedTab().focus()
                },
                "m": () => this.changeMark(true),
                "u": () => this.changeMark(false),
                "d": () => this.dispatchToActiveTabs(new CustomEvent("delete")),
                "x": () => { // TODO
                    console.log(record)
                },
                "U": () => {
                    Array.from(this.activeSide.querySelectorAll(`[is="tab-"] input`))
                        .forEach((a) => a.checked = false)
                },
                "t": () => this.dispatchToActiveTabs(new CustomEvent("transpose", {
                    detail: {
                        destination: (() => {
                            const windowId = this.inactiveSide.lazyFocusedTab().windowId
                            return this.inactiveSide.querySelector(
                                `window-[data-id="${windowId}"]`
                            )
                        })()
                        // console.log(
                        //     
                        // )
                        ,
                    },
                })),
                "g": () => this.refresh(),
            })[event.key] ?? (() => {}))()
        })
    }
    refresh() {
        this.querySelectorAll("& > *").forEach(child =>
            child.dispatchEvent(new CustomEvent("reload")))
    }
    changeMark(isMarked) {
        this.activeSide.lazyFocusedTab()
            .querySelector(`input`).checked = isMarked
    }
    windowMoveBy(n) {
        const windows = Array.from(
            this.activeSide
                .querySelectorAll(`window-, group-`)
        )
        const parent = this.activeSide
              .lazyFocusedTab()
              .parentElement.parentElement
        const index = windows.indexOf(parent)
        const firstTabs = Array.from(
            this.activeSide
                .querySelectorAll(`window- [is="tab-"]:first-child`)
        )
        ;(firstTabs[index + n] ?? firstTabs[index]).focus()
    }
    moveBy(n) {
        const tabs = Array.from(this.activeSide.querySelectorAll(`[is="tab-"]`))
        const index = tabs
              .map((a) => a === this.activeSide.lazyFocusedTab())
              .indexOf(true)
        ;(tabs[index + n] ?? document.activeElement)
              .focus()
    }
    dispatchToActiveTabs(event) {
        const markedTabs = Array.from(
            this.activeSide
                .querySelectorAll(`[is="tab-"]:has(input:checked)`)
        )
        markedTabs.forEach((a) => a.dispatchEvent(event))
    }
    get activeSide() {
        const sideSelector = this.isRightSide
              ? ":last-child"
              : ":first-child"
        return this.querySelector(
            `& > ${sideSelector}`
        )
    }
    get inactiveSide() {
        const sideSelector = !this.isRightSide
              ? ":last-child"
              : ":first-child"
        return this.querySelector(
            `& > ${sideSelector}`
        )
    }
})
//
document.addEventListener("keydown", (event) =>
    document.querySelector("main-")
        .dispatchEvent(new KeyboardEvent("rootKeyDown", event)))
