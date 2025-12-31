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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2hpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRzdDLE9BQU8sRUFBRSxjQUFjLEVBQWMsTUFBTSxnQkFBZ0IsQ0FBQTtBQVkzRCxNQUFNLE9BQU8sZ0JBQWdCO0lBSzVCLFlBQ1MsV0FBd0IsSUFBSSxHQUFHLEVBQUUsRUFDekMsUUFBZ0IsRUFBRTtRQURWLGFBQVEsR0FBUixRQUFRLENBQXlCO1FBR3pDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNoQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUNyRSxDQUFDO0lBQ0YsQ0FBQztJQUVNLFVBQVU7UUFDaEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFFTSxHQUFHLENBQUMsQ0FBSTtRQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0lBRU0sSUFBSTtRQUNWLG9HQUFvRztRQUNwRyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVNLFFBQVE7UUFDZCxJ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