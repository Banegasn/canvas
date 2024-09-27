class Button extends HTMLElement {
    constructor() {
        super();
        const content = this.innerHTML;
        this.innerHTML = `
            <button class="hover:bg-blue-800 text-white font-bold py-1 px-4 rounded transition-colors duration-400">
                ${content}
            </button>
        `;
    }
}

customElements.define('a-button', Button);