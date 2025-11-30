//kb input handling sys
class InputManager {
    constructor() {
        this.keysBeingPressed = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        //track key presses
        window.addEventListener('keydown', (event) => {
            this.keysBeingPressed[event.key] = true;
            //prevent default for arrow keys to avoid page scroll
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
            }
        });

        //track key releases
        window.addEventListener('keyup', (event) => {
            this.keysBeingPressed[event.key] = false;
        });

        //handle window focus/blur to prevent stuck keys
        window.addEventListener('blur', () => {
            this.keysBeingPressed = {};
        });

        //prevent context menu on right click
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    //check if key is pressed
    isKeyPressed(key) {
        return !!this.keysBeingPressed[key];
    }

    //get all pressed keys
    getPressedKeys() {
        return this.keysBeingPressed;
    }

    //clear all key states (useful for debug)
    clearAllKeys() {
        this.keysBeingPressed = {};
    }
}
