/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import { ExtensionIdentifier } from '../../extensions/common/extensions.js';
export class ImplicitActivationEventsImpl {
    constructor() {
        this._generators = new Map();
        this._cache = new WeakMap();
    }
    register(extensionPointName, generator) {
        this._generators.set(extensionPointName, generator);
    }
    /**
     * This can run correctly only on the renderer process because that is the only place
     * where all extension points and all implicit activation events generators are known.
     */
    readActivationEvents(extensionDescription) {
        if (!this._cache.has(extensionDescription)) {
            this._cache.set(extensionDescription, this._readActivationEvents(extensionDescription));
        }
        return this._cache.get(extensionDescription);
    }
    /**
     * This can run correctly only on the renderer process because that is the only place
     * where all extension points and all implicit activation events generators are known.
     */
    createActivationEventsMap(extensionDescriptions) {
        const result = Object.create(null);
        for (const extensionDescription of extensionDescriptions) {
            const activationEvents = this.readActivationEvents(extensionDescription);
            if (activationEvents.length > 0) {
                result[ExtensionIdentifier.toKey(extensionDescription.identifier)] = activationEvents;
            }
        }
        return result;
    }
    _readActivationEvents(desc) {
        if (typeof desc.main === 'undefined' && typeof desc.browser === 'undefined') {
            return [];
        }
        const activationEvents = Array.isArray(desc.activationEvents)
            ? desc.activationEvents.slice(0)
            : [];
        for (let i = 0; i < activationEvents.length; i++) {
            // TODO@joao: there's no easy way to contribute this
            if (activationEvents[i] === 'onUri') {
                activationEvents[i] = `onUri:${ExtensionIdentifier.toKey(desc.identifier)}`;
            }
        }
        if (!desc.contributes) {
            // no implicit activation events
            return activationEvents;
        }
        for (const extPointName in desc.contributes) {
            const generator = this._generators.get(extPointName);
            if (!generator) {
                // There's no generator for this extension point
                continue;
            }
            const contrib = desc.contributes[extPointName];
            const contribArr = Array.isArray(contrib) ? contrib : [contrib];
            try {
                generator(contribArr, activationEvents);
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        return activationEvents;
    }
}
export const ImplicitActivationEvents = new ImplicitActivationEventsImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wbGljaXRBY3RpdmF0aW9uRXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9pbXBsaWNpdEFjdGl2YXRpb25FdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUF5QixNQUFNLHVDQUF1QyxDQUFBO0FBTWxHLE1BQU0sT0FBTyw0QkFBNEI7SUFBekM7UUFDa0IsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBMkMsQ0FBQTtRQUNoRSxXQUFNLEdBQUcsSUFBSSxPQUFPLEVBQW1DLENBQUE7SUF3RXpFLENBQUM7SUF0RU8sUUFBUSxDQUFJLGtCQUEwQixFQUFFLFNBQXdDO1FBQ3RGLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRDs7O09BR0c7SUFDSSxvQkFBb0IsQ0FBQyxvQkFBMkM7UUFDdEUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFFLENBQUE7SUFDOUMsQ0FBQztJQUVEOzs7T0FHRztJQUNJLHlCQUF5QixDQUFDLHFCQUE4QztRQUc5RSxNQUFNLE1BQU0sR0FBd0MsTUFBTSxDQUFDLE1BQU0sQ0FB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