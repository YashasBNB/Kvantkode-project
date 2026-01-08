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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q29sbGVjdGlvbkJ1ZmZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L29iamVjdENvbGxlY3Rpb25CdWZmZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sVUFBVSxFQUNWLE9BQU8sRUFDUCxZQUFZLEdBRVosTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFrQyxNQUFNLHlCQUF5QixDQUFBO0FBbUU1RixNQUFNLFVBQVUsNEJBQTRCLENBQzNDLGFBQWdCLEVBQ2hCLFFBQWdCO0lBRWhCLE9BQU8sSUFBSSxzQkFBc0IsQ0FBSSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDOUQsQ0FBQztBQUVELE1BQU0sc0JBQ0wsU0FBUSxVQUFVO0lBTWxCLElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFBO0lBQzFELENBQUM7SUFDRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDNUMsQ0FBQztJQUNELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUE7SUFDMUIsQ0FBQztJQUdELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBY0QsWUFDUSxhQUFnQixFQUNoQixRQUFnQjtRQUV2QixLQUFLLEVBQUUsQ0FBQTtRQUhBLGtC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