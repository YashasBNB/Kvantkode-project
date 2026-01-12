/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SetWithKey } from './collections.js';
import { ArrayNavigator } from './navigator.js';
export class HistoryNavigator {
    constructor(_history = new Set(), limit = 10) {
        this._history = _history;
        this._limit = limit;
        this._onChange();
        if (this._history.onDidChange) {
            this._disposable = this._history.onDidChange(() => this._onChange());
        }
    }
    getHistory() {
        return this._elements;
    }
    add(t) {
        this._history.delete(t);
        this._history.add(t);
        this._onChange();
    }
    next() {
        // This will navigate past the end of the last element, and in that case the input should be cleared
        return this._navigator.next();
    }
    previous() {
        if (this._currentPosition() !== 0) {
            return this._navigator.previous();
        }
        return null;
    }
    current() {
        return this._navigator.current();
    }
    first() {
        return this._navigator.first();
    }
    last() {
        return this._navigator.last();
    }
    isFirst() {
        return this._currentPosition() === 0;
    }
    isLast() {
        return this._currentPosition() >= this._elements.length - 1;
    }
    isNowhere() {
        return this._navigator.current() === null;
    }
    has(t) {
        return this._history.has(t);
    }
    clear() {
        this._history.clear();
        this._onChange();
    }
    _onChange() {
        this._reduceToLimit();
        const elements = this._elements;
        this._navigator = new ArrayNavigator(elements, 0, elements.length, elements.length);
    }
    _reduceToLimit() {
        const data = this._elements;
        if (data.length > this._limit) {
            const replaceValue = data.slice(data.length - this._limit);
            if (this._history.replace) {
                this._history.replace(replaceValue);
            }
            else {
                this._history = new Set(replaceValue);
            }
        }
    }
    _currentPosition() {
        const currentElement = this._navigator.current();
        if (!currentElement) {
            return -1;
        }
        return this._elements.indexOf(currentElement);
    }
    get _elements() {
        const elements = [];
        this._history.forEach((e) => elements.push(e));
        return elements;
    }
    dispose() {
        if (this._disposable) {
            this._disposable.dispose();
            this._disposable = undefined;
        }
    }
}
/**
 * The right way to use HistoryNavigator2 is for the last item in the list to be the user's uncommitted current text. eg empty string, or whatever has been typed. Then
 * the user can navigate away from the last item through the list, and back to it. When updating the last item, call replaceLast.
 */
export class HistoryNavigator2 {
    get size() {
        return this._size;
    }
    constructor(history, capacity = 10, identityFn = (t) => t) {
        this.capacity = capacity;
        this.identityFn = identityFn;
        if (history.length < 1) {
            throw new Error('not supported');
        }
        this._size = 1;
        this.head =
            this.tail =
                this.cursor =
                    {
                        value: history[0],
                        previous: undefined,
                        next: undefined,
                    };
        this.valueSet = new SetWithKey([history[0]], identityFn);
        for (let i = 1; i < history.length; i++) {
            this.add(history[i]);
        }
    }
    add(value) {
        const node = {
            value,
            previous: this.tail,
            next: undefined,
        };
        this.tail.next = node;
        this.tail = node;
        this.cursor = this.tail;
        this._size++;
        if (this.valueSet.has(value)) {
            this._deleteFromList(value);
        }
        else {
            this.valueSet.add(value);
        }
        while (this._size > this.capacity) {
            this.valueSet.delete(this.head.value);
            this.head = this.head.next;
            this.head.previous = undefined;
            this._size--;
        }
    }
    /**
     * @returns old last value
     */
    replaceLast(value) {
        if (this.identityFn(this.tail.value) === this.identityFn(value)) {
            return value;
        }
        const oldValue = this.tail.value;
        this.valueSet.delete(oldValue);
        this.tail.value = value;
        if (this.valueSet.has(value)) {
            this._deleteFromList(value);
        }
        else {
            this.valueSet.add(value);
        }
        return oldValue;
    }
    prepend(value) {
        if (this._size === this.capacity || this.valueSet.has(value)) {
            return;
        }
        const node = {
            value,
            previous: undefined,
            next: this.head,
        };
        this.head.previous = node;
        this.head = node;
        this._size++;
        this.valueSet.add(value);
    }
    isAtEnd() {
        return this.cursor === this.tail;
    }
    current() {
        return this.cursor.value;
    }
    previous() {
        if (this.cursor.previous) {
            this.cursor = this.cursor.previous;
        }
        return this.cursor.value;
    }
    next() {
        if (this.cursor.next) {
            this.cursor = this.cursor.next;
        }
        return this.cursor.value;
    }
    has(t) {
        return this.valueSet.has(t);
    }
    resetCursor() {
        this.cursor = this.tail;
        return this.cursor.value;
    }
    *[Symbol.iterator]() {
        let node = this.head;
        while (node) {
            yield node.value;
            node = node.next;
        }
    }
    _deleteFromList(value) {
        let temp = this.head;
        const valueKey = this.identityFn(value);
        while (temp !== this.tail) {
            if (this.identityFn(temp.value) === valueKey) {
                if (temp === this.head) {
                    this.head = this.head.next;
                    this.head.previous = undefined;
                }
                else {
                    temp.previous.next = temp.next;
                    temp.next.previous = temp.previous;
                }
                this._size--;
            }
            temp = temp.next;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHN0MsT0FBTyxFQUFFLGNBQWMsRUFBYyxNQUFNLGdCQUFnQixDQUFBO0FBWTNELE1BQU0sT0FBTyxnQkFBZ0I7SUFLNUIsWUFDUyxXQUF3QixJQUFJLEdBQUcsRUFBRSxFQUN6QyxRQUFnQixFQUFFO1FBRFYsYUFBUSxHQUFSLFFBQVEsQ0FBeUI7UUFHekMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ2hCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLENBQUM7SUFDRixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxDQUFJO1FBQ2QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ2pCLENBQUM7SUFFTSxJQUFJO1FBQ1Ysb0dBQW9HO1FBQ3BHLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRU0sUUFBUTtR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