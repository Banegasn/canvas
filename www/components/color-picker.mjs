
class ColorPicker extends HTMLElement {

    color = '#000000';

    constructor() {
        super();
        this.innerHTML = `
            <div class="flex flex-row items-center gap-2">
                <input type="color" id="color-picker-input" value="#000000">
                <button id="color-picker-button">Apply</button>
            </div>
        `;

        const input = this.querySelector('#color-picker-input');
        input.addEventListener('input', () => {
            this.color = input.value;
        });

        const button = this.querySelector('#color-picker-button');
        button.addEventListener('click', () => {
            console.log(this.color);
            this.dispatchEvent(new CustomEvent('color-picked', { detail: this.color }));
        });
    }
}

customElements.define('a-color-picker', ColorPicker);