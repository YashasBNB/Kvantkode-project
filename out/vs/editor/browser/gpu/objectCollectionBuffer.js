/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, dispose, toDisposable, } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { BufferDirtyTracker } from './bufferDirtyTracker.js';
export function createObjectCollectionBuffer(propertySpecs, capacity) {
    return new ObjectCollectionBuffer(propertySpecs, capacity);
}
class ObjectCollectionBuffer extends Disposable {
    get bufferUsedSize() {
        return this.viewUsedSize * Float32Array.BYTES_PER_ELEMENT;
    }
    get viewUsedSize() {
        return this._entries.size * this._entrySize;
    }
    get entryCount() {
        return this._entries.size;
    }
    get dirtyTracker() {
        return this._dirtyTracker;
    }
    constructor(propertySpecs, capacity) {
        super();
        this.propertySpecs = propertySpecs;
        this.capacity = capacity;
        this._dirtyTracker = new BufferDirtyTracker();
        this._propertySpecsMap = new Map();
        this._entries = new LinkedList();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeBuffer = this._register(new Emitter());
        this.onDidChangeBuffer = this._onDidChangeBuffer.event;
        this.view = new Float32Array(capacity * propertySpecs.length);
        this.buffer = this.view.buffer;
        this._entrySize = propertySpecs.length;
        for (let i = 0; i < propertySpecs.length; i++) {
            const spec = {
                offset: i,
                ...propertySpecs[i],
            };
            this._propertySpecsMap.set(spec.name, spec);
        }
        this._register(toDisposable(() => dispose(this._entries)));
    }
    createEntry(data) {
        if (this._entries.size === this.capacity) {
            this._expandBuffer();
            this._onDidChangeBuffer.fire();
        }
        const value = new ObjectCollectionBufferEntry(this.view, this._propertySpecsMap, this._dirtyTracker, this._entries.size, data);
        const removeFromEntries = this._entries.push(value);
        const listeners = [];
        listeners.push(Event.forward(value.onDidChange, this._onDidChange));
        listeners.push(value.onWillDispose(() => {
            const deletedEntryIndex = value.i;
            removeFromEntries();
            // Shift all entries after the deleted entry to the left
            this.view.set(this.view.subarray(deletedEntryIndex * this._entrySize + 2, this._entries.size * this._entrySize + 2), deletedEntryIndex * this._entrySize);
            // Update entries to reflect the new i
            for (const entry of this._entries) {
                if (entry.i > deletedEntryIndex) {
                    entry.i--;
                }
            }
            this._dirtyTracker.flag(deletedEntryIndex, (this._entries.size - deletedEntryIndex) * this._entrySize);
            dispose(listeners);
        }));
        return value;
    }
    _expandBuffer() {
        this.capacity *= 2;
        const newView = new Float32Array(this.capacity * this._entrySize);
        newView.set(this.view);
        this.view = newView;
        this.buffer = this.view.buffer;
    }
}
class ObjectCollectionBufferEntry extends Disposable {
    constructor(_view, _propertySpecsMap, _dirtyTracker, i, data) {
        super();
        this._view = _view;
        this._propertySpecsMap = _propertySpecsMap;
        this._dirtyTracker = _dirtyTracker;
        this.i = i;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        for (const propertySpec of this._propertySpecsMap.values()) {
            this._view[this.i * this._propertySpecsMap.size + propertySpec.offset] =
                data[propertySpec.name];
        }
        this._dirtyTracker.flag(this.i * this._propertySpecsMap.size, this._propertySpecsMap.size);
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
    set(propertyName, value) {
        const i = this.i * this._propertySpecsMap.size + this._propertySpecsMap.get(propertyName).offset;
        this._view[this._dirtyTracker.flag(i)] = value;
        this._onDidChange.fire();
    }
    get(propertyName) {
        return this._view[this.i * this._propertySpecsMap.size + this._propertySpecsMap.get(propertyName).offset];
    }
    setRaw(data) {
        if (data.length !== this._propertySpecsMap.size) {
            throw new Error(`Data length ${data.length} does not match the number of properties in the collection (${this._propertySpecsMap.size})`);
        }
        this._view.set(data, this.i * this._propertySpecsMap.size);
        this._dirtyTracker.flag(this.i * this._propertySpecsMap.size, this._propertySpecsMap.size);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q29sbGVjdGlvbkJ1ZmZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9vYmplY3RDb2xsZWN0aW9uQnVmZmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLFVBQVUsRUFDVixPQUFPLEVBQ1AsWUFBWSxHQUVaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBa0MsTUFBTSx5QkFBeUIsQ0FBQTtBQW1FNUYsTUFBTSxVQUFVLDRCQUE0QixDQUMzQyxhQUFnQixFQUNoQixRQUFnQjtJQUVoQixPQUFPLElBQUksc0JBQXNCLENBQUksYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQzlELENBQUM7QUFFRCxNQUFNLHNCQUNMLFNBQVEsVUFBVTtJQU1sQixJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQTtJQUMxRCxDQUFDO0lBQ0QsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQzVDLENBQUM7SUFDRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFBO0lBQzFCLENBQUM7SUFHRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQWNELFlBQ1EsYUFBZ0IsRUFDaEIsUUFBZ0I7UUFFdkIsS0FBSyxFQUFFLENBQUE7UUFIQSxrQkFBYSxH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