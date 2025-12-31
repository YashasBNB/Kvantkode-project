/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditContext } from './editContextFactory.js';
const COLOR_FOR_CONTROL_BOUNDS = 'blue';
const COLOR_FOR_SELECTION_BOUNDS = 'red';
const COLOR_FOR_CHARACTER_BOUNDS = 'green';
export class DebugEditContext {
    constructor(window, options) {
        this._isDebugging = true;
        this._controlBounds = null;
        this._selectionBounds = null;
        this._characterBounds = null;
        this._ontextupdateWrapper = new EventListenerWrapper('textupdate', this);
        this._ontextformatupdateWrapper = new EventListenerWrapper('textformatupdate', this);
        this._oncharacterboundsupdateWrapper = new EventListenerWrapper('characterboundsupdate', this);
        this._oncompositionstartWrapper = new EventListenerWrapper('compositionstart', this);
        this._oncompositionendWrapper = new EventListenerWrapper('compositionend', this);
        this._listenerMap = new Map();
        this._disposables = [];
        this._editContext = EditContext.create(window, options);
    }
    get text() {
        return this._editContext.text;
    }
    get selectionStart() {
        return this._editContext.selectionStart;
    }
    get selectionEnd() {
        return this._editContext.selectionEnd;
    }
    get characterBoundsRangeStart() {
        return this._editContext.characterBoundsRangeStart;
    }
    updateText(rangeStart, rangeEnd, text) {
        this._editContext.updateText(rangeStart, rangeEnd, text);
        this.renderDebug();
    }
    updateSelection(start, end) {
        this._editContext.updateSelection(start, end);
        this.renderDebug();
    }
    updateControlBounds(controlBounds) {
        this._editContext.updateControlBounds(controlBounds);
        this._controlBounds = controlBounds;
        this.renderDebug();
    }
    updateSelectionBounds(selectionBounds) {
        this._editContext.updateSelectionBounds(selectionBounds);
        this._selectionBounds = selectionBounds;
        this.renderDebug();
    }
    updateCharacterBounds(rangeStart, characterBounds) {
        this._editContext.updateCharacterBounds(rangeStart, characterBounds);
        this._characterBounds = { rangeStart, characterBounds };
        this.renderDebug();
    }
    attachedElements() {
        return this._editContext.attachedElements();
    }
    characterBounds() {
        return this._editContext.characterBounds();
    }
    get ontextupdate() {
        return this._ontextupdateWrapper.eventHandler;
    }
    set ontextupdate(value) {
        this._ontextupdateWrapper.eventHandler = value;
    }
    get ontextformatupdate() {
        return this._ontextformatupdateWrapper.eventHandler;
    }
    set ontextformatupdate(value) {
        this._ontextformatupdateWrapper.eventHandler = value;
    }
    get oncharacterboundsupdate() {
        return this._oncharacterboundsupdateWrapper.eventHandler;
    }
    set oncharacterboundsupdate(value) {
        this._oncharacterboundsupdateWrapper.eventHandler = value;
    }
    get oncompositionstart() {
        return this._oncompositionstartWrapper.eventHandler;
    }
    set oncompositionstart(value) {
        this._oncompositionstartWrapper.eventHandler = value;
    }
    get oncompositionend() {
        return this._oncompositionendWrapper.eventHandler;
    }
    set oncompositionend(value) {
        this._oncompositionendWrapper.eventHandler = value;
    }
    addEventListener(type, listener, options) {
        if (!listener) {
            return;
        }
        const debugListener = (event) => {
            if (this._isDebugging) {
                this.renderDebug();
                console.log(`DebugEditContex.on_${type}`, event);
            }
            if (typeof listener === 'function') {
                listener.call(this, event);
            }
            else if (typeof listener === 'object' && 'handleEvent' in listener) {
                listener.handleEvent(event);
            }
        };
        this._listenerMap.set(listener, debugListener);
        this._editContext.addEventListener(type, debugListener, options);
        this.renderDebug();
    }
    removeEventListener(type, listener, options) {
        if (!listener) {
            return;
        }
        const debugListener = this._listenerMap.get(listener);
        if (debugListener) {
            this._editContext.removeEventListener(type, debugListener, options);
            this._listenerMap.delete(listener);
        }
        this.renderDebug();
    }
    dispatchEvent(event) {
        return this._editContext.dispatchEvent(event);
    }
    startDebugging() {
        this._isDebugging = true;
        this.renderDebug();
    }
    endDebugging() {
        this._isDebugging = false;
        this.renderDebug();
    }
    renderDebug() {
        this._disposables.forEach((d) => d.dispose());
        this._disposables = [];
        if (!this._isDebugging || this._listenerMap.size === 0) {
            return;
        }
        if (this._controlBounds) {
            this._disposables.push(createRect(this._controlBounds, COLOR_FOR_CONTROL_BOUNDS));
        }
        if (this._selectionBounds) {
            this._disposables.push(createRect(this._selectionBounds, COLOR_FOR_SELECTION_BOUNDS));
        }
        if (this._characterBounds) {
            for (const rect of this._characterBounds.characterBounds) {
                this._disposables.push(createRect(rect, COLOR_FOR_CHARACTER_BOUNDS));
            }
        }
        this._disposables.push(createDiv(this._editContext.text, this._editContext.selectionStart, this._editContext.selectionEnd));
    }
}
function createDiv(text, selectionStart, selectionEnd) {
    const ret = document.createElement('div');
    ret.className = 'debug-rect-marker';
    ret.style.position = 'absolute';
    ret.style.zIndex = '999999999';
    ret.style.bottom = '50px';
    ret.style.left = '60px';
    ret.style.backgroundColor = 'white';
    ret.style.border = '1px solid black';
    ret.style.padding = '5px';
    ret.style.whiteSpace = 'pre';
    ret.style.font = '12px monospace';
    ret.style.pointerEvents = 'none';
    const before = text.substring(0, selectionStart);
    const selected = text.substring(selectionStart, selectionEnd) || '|';
    const after = text.substring(selectionEnd) + ' ';
    const beforeNode = document.createTextNode(before);
    ret.appendChild(beforeNode);
    const selectedNode = document.createElement('span');
    selectedNode.style.backgroundColor = 'yellow';
    selectedNode.appendChild(document.createTextNode(selected));
    selectedNode.style.minWidth = '2px';
    selectedNode.style.minHeight = '16px';
    ret.appendChild(selectedNode);
    const afterNode = document.createTextNode(after);
    ret.appendChild(afterNode);
    // eslint-disable-next-line no-restricted-syntax
    document.body.appendChild(ret);
    return {
        dispose: () => {
            ret.remove();
        },
    };
}
function createRect(rect, color) {
    const ret = document.createElement('div');
    ret.className = 'debug-rect-marker';
    ret.style.position = 'absolute';
    ret.style.zIndex = '999999999';
    ret.style.outline = `2px solid ${color}`;
    ret.style.pointerEvents = 'none';
    ret.style.top = rect.top + 'px';
    ret.style.left = rect.left + 'px';
    ret.style.width = rect.width + 'px';
    ret.style.height = rect.height + 'px';
    // eslint-disable-next-line no-restricted-syntax
    document.body.appendChild(ret);
    return {
        dispose: () => {
            ret.remove();
        },
    };
}
class EventListenerWrapper {
    constructor(_eventType, _target) {
        this._eventType = _eventType;
        this._target = _target;
        this._eventHandler = null;
    }
    get eventHandler() {
        return this._eventHandler;
    }
    set eventHandler(value) {
        if (this._eventHandler) {
            this._target.removeEventListener(this._eventType, this._eventHandler);
        }
        this._eventHandler = value;
        if (value) {
            this._target.addEventListener(this._eventType, value);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0Q29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvbmF0aXZlL2RlYnVnRWRpdENvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXJELE1BQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFBO0FBQ3ZDLE1BQU0sMEJBQTBCLEdBQUcsS0FBSyxDQUFBO0FBQ3hDLE1BQU0sMEJBQTBCLEdBQUcsT0FBTyxDQUFBO0FBRTFDLE1BQU0sT0FBTyxnQkFBZ0I7SUFRNUIsWUFBWSxNQUFjLEVBQUUsT0FBcUM7UUFQekQsaUJBQVksR0FBRyxJQUFJLENBQUE7UUFDbkIsbUJBQWMsR0FBbUIsSUFBSSxDQUFBO1FBQ3JDLHFCQUFnQixHQUFtQixJQUFJLENBQUE7UUFDdkMscUJBQWdCLEdBQThELElBQUksQ0FBQTtRQXVEekUseUJBQW9CLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkUsK0JBQTBCLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRSxvQ0FBK0IsR0FBRyxJQUFJLG9CQUFvQixDQUMxRSx1QkFBdUIsRUFDdkIsSUFBSSxDQUNKLENBQUE7UUFDZ0IsK0JBQTBCLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRSw2QkFBd0IsR0FBRyxJQUFJLG9CQUFvQixDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBaUMzRSxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUdwQyxDQUFBO1FBOERLLGlCQUFZLEdBQTBCLEVBQUUs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