export function webComponent(superClass) {
    return class extends superClass {
        constructor (template) {
            super()
	    this.appendChild(
                template.content.cloneNode(true)
            )
        }
    }
}
