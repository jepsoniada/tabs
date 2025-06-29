Object.prototype.apply = function (fn) {
    return fn(this)
}

const tabs = (await chrome.tabs.query({}))

// document.querySelector("#content").innerHTML
//     = tabs?.[0].groupId

// const windowId = tabs?.[0].windowId
// tabs.map(async (a) => chrome.tabs.move(a.id, { windowId, index: -1 }))

document.querySelector("#content").innerHTML
    = tabs
    .apply(a => Object.values(Object.groupBy(a, b => b.windowId)))
    .map((a, i) => a.map(b => Object.assign(b, { color: `lch(50% 100 ${i * 120})` })))
    .flat()
    .map(a => `<div style="background: ${a.color}; color: white">${
[a.incognito ? "🥸" : null, a.title].join(' ')
}</div>`)
    .join('')


