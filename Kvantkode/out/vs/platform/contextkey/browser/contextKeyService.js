/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { PauseableEmitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, MutableDisposable } from '../../../base/common/lifecycle.js';
import { cloneAndChange, distinct } from '../../../base/common/objects.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { CommandsRegistry } from '../../commands/common/commands.js';
import { IConfigurationService, } from '../../configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../common/contextkey.js';
const KEYBINDING_CONTEXT_ATTR = 'data-keybinding-context';
export class Context {
    constructor(id, parent) {
        this._id = id;
        this._parent = parent;
        this._value = Object.create(null);
        this._value['_contextId'] = id;
    }
    get value() {
        return { ...this._value };
    }
    setValue(key, value) {
        // console.log('SET ' + key + ' = ' + value + ' ON ' + this._id);
        if (this._value[key] !== value) {
            this._value[key] = value;
            return true;
        }
        return false;
    }
    removeValue(key) {
        // console.log('REMOVE ' + key + ' FROM ' + this._id);
        if (key in this._value) {
            delete this._value[key];
            return true;
        }
        return false;
    }
    getValue(key) {
        const ret = this._value[key];
        if (typeof ret === 'undefined' && this._parent) {
            return this._parent.getValue(key);
        }
        return ret;
    }
    updateParent(parent) {
        this._parent = parent;
    }
    collectAllValues() {
        let result = this._parent ? this._parent.collectAllValues() : Object.create(null);
        result = { ...result, ...this._value };
        delete result['_contextId'];
        return result;
    }
}
class NullContext extends Context {
    static { this.INSTANCE = new NullContext(); }
    constructor() {
        super(-1, null);
    }
    setValue(key, value) {
        return false;
    }
    removeValue(key) {
        return false;
    }
    getValue(key) {
        return undefined;
    }
    collectAllValues() {
        return Object.create(null);
    }
}
class ConfigAwareContextValuesContainer extends Context {
    static { this._keyPrefix = 'config.'; }
    constructor(id, _configurationService, emitter) {
        super(id, null);
        this._configurationService = _configurationService;
        this._values = TernarySearchTree.forConfigKeys();
        this._listener = this._configurationService.onDidChangeConfiguration((event) => {
            if (event.source === 7 /* ConfigurationTarget.DEFAULT */) {
                // new setting, reset everything
                const allKeys = Array.from(this._values, ([k]) => k);
                this._values.clear();
                emitter.fire(new ArrayContextKeyChangeEvent(allKeys));
            }
            else {
                const changedKeys = [];
                for (const configKey of event.affectedKeys) {
                    const contextKey = `config.${configKey}`;
                    const cachedItems = this._values.findSuperstr(contextKey);
                    if (cachedItems !== undefined) {
                        changedKeys.push(...Iterable.map(cachedItems, ([key]) => key));
                        this._values.deleteSuperstr(contextKey);
                    }
                    if (this._values.has(contextKey)) {
                        changedKeys.push(contextKey);
                        this._values.delete(contextKey);
                    }
                }
                emitter.fire(new ArrayContextKeyChangeEvent(changedKeys));
            }
        });
    }
    dispose() {
        this._listener.dispose();
    }
    getValue(key) {
        if (key.indexOf(ConfigAwareContextValuesContainer._keyPrefix) !== 0) {
            return super.getValue(key);
        }
        if (this._values.has(key)) {
            return this._values.get(key);
        }
        const configKey = key.substr(ConfigAwareContextValuesContainer._keyPrefix.length);
        const configValue = this._configurationService.getValue(configKey);
        let value = undefined;
        switch (typeof configValue) {
            case 'number':
            case 'boolean':
            case 'string':
                value = configValue;
                break;
            default:
                if (Array.isArray(configValue)) {
                    value = JSON.stringify(configValue);
                }
                else {
                    value = configValue;
                }
        }
        this._values.set(key, value);
        return value;
    }
    setValue(key, value) {
        return super.setValue(key, value);
    }
    removeValue(key) {
        return super.removeValue(key);
    }
    collectAllValues() {
        const result = Object.create(null);
        this._values.forEach((value, index) => (result[index] = value));
        return { ...result, ...super.collectAllValues() };
    }
}
class ContextKey {
    constructor(service, key, defaultValue) {
        this._service = service;
        this._key = key;
        this._defaultValue = defaultValue;
        this.reset();
    }
    set(value) {
        this._service.setContext(this._key, value);
    }
    reset() {
        if (typeof this._defaultValue === 'undefined') {
            this._service.removeContext(this._key);
        }
        else {
            this._service.setContext(this._key, this._defaultValue);
        }
    }
    get() {
        return this._service.getContextKeyValue(this._key);
    }
}
class SimpleContextKeyChangeEvent {
    constructor(key) {
        this.key = key;
    }
    affectsSome(keys) {
        return keys.has(this.key);
    }
    allKeysContainedIn(keys) {
        return this.affectsSome(keys);
    }
}
class ArrayContextKeyChangeEvent {
    constructor(keys) {
        this.keys = keys;
    }
    affectsSome(keys) {
        for (const key of this.keys) {
            if (keys.has(key)) {
                return true;
            }
        }
        return false;
    }
    allKeysContainedIn(keys) {
        return this.keys.every((key) => keys.has(key));
    }
}
class CompositeContextKeyChangeEvent {
    constructor(events) {
        this.events = events;
    }
    affectsSome(keys) {
        for (const e of this.events) {
            if (e.affectsSome(keys)) {
                return true;
            }
        }
        return false;
    }
    allKeysContainedIn(keys) {
        return this.events.every((evt) => evt.allKeysContainedIn(keys));
    }
}
function allEventKeysInContext(event, context) {
    return event.allKeysContainedIn(new Set(Object.keys(context)));
}
export class AbstractContextKeyService extends Disposable {
    constructor(myContextId) {
        super();
        this._onDidChangeContext = this._register(new PauseableEmitter({
            merge: (input) => new CompositeContextKeyChangeEvent(input),
        }));
        this.onDidChangeContext = this._onDidChangeContext.event;
        this._isDisposed = false;
        this._myContextId = myContextId;
    }
    get contextId() {
        return this._myContextId;
    }
    createKey(key, defaultValue) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        return new ContextKey(this, key, defaultValue);
    }
    bufferChangeEvents(callback) {
        this._onDidChangeContext.pause();
        try {
            callback();
        }
        finally {
            this._onDidChangeContext.resume();
        }
    }
    createScoped(domNode) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        return new ScopedContextKeyService(this, domNode);
    }
    createOverlay(overlay = Iterable.empty()) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        return new OverlayContextKeyService(this, overlay);
    }
    contextMatchesRules(rules) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        const context = this.getContextValuesContainer(this._myContextId);
        const result = rules ? rules.evaluate(context) : true;
        // console.group(rules.serialize() + ' -> ' + result);
        // rules.keys().forEach(key => { console.log(key, ctx[key]); });
        // console.groupEnd();
        return result;
    }
    getContextKeyValue(key) {
        if (this._isDisposed) {
            return undefined;
        }
        return this.getContextValuesContainer(this._myContextId).getValue(key);
    }
    setContext(key, value) {
        if (this._isDisposed) {
            return;
        }
        const myContext = this.getContextValuesContainer(this._myContextId);
        if (!myContext) {
            return;
        }
        if (myContext.setValue(key, value)) {
            this._onDidChangeContext.fire(new SimpleContextKeyChangeEvent(key));
        }
    }
    removeContext(key) {
        if (this._isDisposed) {
            return;
        }
        if (this.getContextValuesContainer(this._myContextId).removeValue(key)) {
            this._onDidChangeContext.fire(new SimpleContextKeyChangeEvent(key));
        }
    }
    getContext(target) {
        if (this._isDisposed) {
            return NullContext.INSTANCE;
        }
        return this.getContextValuesContainer(findContextAttr(target));
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
}
let ContextKeyService = class ContextKeyService extends AbstractContextKeyService {
    constructor(configurationService) {
        super(0);
        this._contexts = new Map();
        this._lastContextId = 0;
        const myContext = this._register(new ConfigAwareContextValuesContainer(this._myContextId, configurationService, this._onDidChangeContext));
        this._contexts.set(this._myContextId, myContext);
        // Uncomment this to see the contexts continuously logged
        // let lastLoggedValue: string | null = null;
        // setInterval(() => {
        // 	let values = Object.keys(this._contexts).map((key) => this._contexts[key]);
        // 	let logValue = values.map(v => JSON.stringify(v._value, null, '\t')).join('\n');
        // 	if (lastLoggedValue !== logValue) {
        // 		lastLoggedValue = logValue;
        // 		console.log(lastLoggedValue);
        // 	}
        // }, 2000);
    }
    getContextValuesContainer(contextId) {
        if (this._isDisposed) {
            return NullContext.INSTANCE;
        }
        return this._contexts.get(contextId) || NullContext.INSTANCE;
    }
    createChildContext(parentContextId = this._myContextId) {
        if (this._isDisposed) {
            throw new Error(`ContextKeyService has been disposed`);
        }
        const id = ++this._lastContextId;
        this._contexts.set(id, new Context(id, this.getContextValuesContainer(parentContextId)));
        return id;
    }
    disposeContext(contextId) {
        if (!this._isDisposed) {
            this._contexts.delete(contextId);
        }
    }
    updateParent(_parentContextKeyService) {
        throw new Error('Cannot update parent of root ContextKeyService');
    }
};
ContextKeyService = __decorate([
    __param(0, IConfigurationService)
], ContextKeyService);
export { ContextKeyService };
class ScopedContextKeyService extends AbstractContextKeyService {
    constructor(parent, domNode) {
        super(parent.createChildContext());
        this._parentChangeListener = this._register(new MutableDisposable());
        this._parent = parent;
        this._updateParentChangeListener();
        this._domNode = domNode;
        if (this._domNode.hasAttribute(KEYBINDING_CONTEXT_ATTR)) {
            let extraInfo = '';
            if (this._domNode.classList) {
                extraInfo = Array.from(this._domNode.classList.values()).join(', ');
            }
            console.error(`Element already has context attribute${extraInfo ? ': ' + extraInfo : ''}`);
        }
        this._domNode.setAttribute(KEYBINDING_CONTEXT_ATTR, String(this._myContextId));
    }
    _updateParentChangeListener() {
        // Forward parent events to this listener. Parent will change.
        this._parentChangeListener.value = this._parent.onDidChangeContext((e) => {
            const thisContainer = this._parent.getContextValuesContainer(this._myContextId);
            const thisContextValues = thisContainer.value;
            if (!allEventKeysInContext(e, thisContextValues)) {
                this._onDidChangeContext.fire(e);
            }
        });
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._parent.disposeContext(this._myContextId);
        this._domNode.removeAttribute(KEYBINDING_CONTEXT_ATTR);
        super.dispose();
    }
    getContextValuesContainer(contextId) {
        if (this._isDisposed) {
            return NullContext.INSTANCE;
        }
        return this._parent.getContextValuesContainer(contextId);
    }
    createChildContext(parentContextId = this._myContextId) {
        if (this._isDisposed) {
            throw new Error(`ScopedContextKeyService has been disposed`);
        }
        return this._parent.createChildContext(parentContextId);
    }
    disposeContext(contextId) {
        if (this._isDisposed) {
            return;
        }
        this._parent.disposeContext(contextId);
    }
    updateParent(parentContextKeyService) {
        if (this._parent === parentContextKeyService) {
            return;
        }
        const thisContainer = this._parent.getContextValuesContainer(this._myContextId);
        const oldAllValues = thisContainer.collectAllValues();
        this._parent = parentContextKeyService;
        this._updateParentChangeListener();
        const newParentContainer = this._parent.getContextValuesContainer(this._parent.contextId);
        thisContainer.updateParent(newParentContainer);
        const newAllValues = thisContainer.collectAllValues();
        const allValuesDiff = {
            ...distinct(oldAllValues, newAllValues),
            ...distinct(newAllValues, oldAllValues),
        };
        const changedKeys = Object.keys(allValuesDiff);
        this._onDidChangeContext.fire(new ArrayContextKeyChangeEvent(changedKeys));
    }
}
class OverlayContext {
    constructor(parent, overlay) {
        this.parent = parent;
        this.overlay = overlay;
    }
    getValue(key) {
        return this.overlay.has(key) ? this.overlay.get(key) : this.parent.getValue(key);
    }
}
class OverlayContextKeyService {
    get contextId() {
        return this.parent.contextId;
    }
    get onDidChangeContext() {
        return this.parent.onDidChangeContext;
    }
    constructor(parent, overlay) {
        this.parent = parent;
        this.overlay = new Map(overlay);
    }
    bufferChangeEvents(callback) {
        this.parent.bufferChangeEvents(callback);
    }
    createKey() {
        throw new Error('Not supported.');
    }
    getContext(target) {
        return new OverlayContext(this.parent.getContext(target), this.overlay);
    }
    getContextValuesContainer(contextId) {
        const parentContext = this.parent.getContextValuesContainer(contextId);
        return new OverlayContext(parentContext, this.overlay);
    }
    contextMatchesRules(rules) {
        const context = this.getContextValuesContainer(this.contextId);
        const result = rules ? rules.evaluate(context) : true;
        return result;
    }
    getContextKeyValue(key) {
        return this.overlay.has(key) ? this.overlay.get(key) : this.parent.getContextKeyValue(key);
    }
    createScoped() {
        throw new Error('Not supported.');
    }
    createOverlay(overlay = Iterable.empty()) {
        return new OverlayContextKeyService(this, overlay);
    }
    updateParent() {
        throw new Error('Not supported.');
    }
}
function findContextAttr(domNode) {
    while (domNode) {
        if (domNode.hasAttribute(KEYBINDING_CONTEXT_ATTR)) {
            const attr = domNode.getAttribute(KEYBINDING_CONTEXT_ATTR);
            if (attr) {
                return parseInt(attr, 10);
            }
            return NaN;
        }
        domNode = domNode.parentElement;
    }
    return 0;
}
export function setContext(accessor, contextKey, contextValue) {
    const contextKeyService = accessor.get(IContextKeyService);
    contextKeyService.createKey(String(contextKey), stringifyURIs(contextValue));
}
function stringifyURIs(contextValue) {
    return cloneAndChange(contextValue, (obj) => {
        if (typeof obj === 'object' && obj.$mid === 1 /* MarshalledId.Uri */) {
            return URI.revive(obj).toString();
        }
        if (obj instanceof URI) {
            return obj.toString();
        }
        return undefined;
    });
}
CommandsRegistry.registerCommand('_setContext', setContext);
CommandsRegistry.registerCommand({
    id: 'getContextKeyInfo',
    handler() {
        return [...RawContextKey.all()].sort((a, b) => a.key.localeCompare(b.key));
    },
    metadata: {
        description: localize('getContextKeyInfo', 'A command that returns information about context keys'),
        args: [],
    },
});
CommandsRegistry.registerCommand('_generateContextKeyInfo', function () {
    const result = [];
    const seen = new Set();
    for (const info of RawContextKey.all()) {
        if (!seen.has(info.key)) {
            seen.add(info.key);
            result.push(info);
        }
    }
    result.sort((a, b) => a.key.localeCompare(b.key));
    console.log(JSON.stringify(result, undefined, 2));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEtleVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHRrZXkvYnJvd3Nlci9jb250ZXh0S2V5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWtCLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc5RixPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFPTixrQkFBa0IsRUFJbEIsYUFBYSxHQUNiLE1BQU0seUJBQXlCLENBQUE7QUFHaEMsTUFBTSx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQTtBQUV6RCxNQUFNLE9BQU8sT0FBTztJQUtuQixZQUFZLEVBQVUsRUFBRSxNQUFzQjtRQUM3QyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRUQsSUFBVyxLQUFLO1FBQ2YsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTSxRQUFRLENBQUMsR0FBVyxFQUFFLEtBQVU7UUFDdEMsaUVBQWlFO1FBQ2pFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTtZQUN4QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxXQUFXLENBQUMsR0FBVztRQUM3QixzREFBc0Q7UUFDdEQsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN2QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxRQUFRLENBQUksR0FBVztRQUM3QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzVCLElBQUksT0FBTyxHQUFHLEtBQUssV0FBVyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFTSxZQUFZLENBQUMsTUFBZTtRQUNsQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN0QixDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRixNQUFNLEdBQUcsRUFBRSxHQUFHLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN0QyxPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMzQixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7Q0FDRDtBQUVELE1BQU0sV0FBWSxTQUFRLE9BQU87YUFDaEIsYUFBUSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUE7SUFFNUM7UUFDQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDaEIsQ0FBQztJQUVlLFFBQVEsQ0FBQyxHQUFXLEVBQUUsS0FBVTtRQUMvQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFZSxXQUFXLENBQUMsR0FBVztRQUN0QyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFZSxRQUFRLENBQUksR0FBVztRQUN0QyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRVEsZ0JBQWdCO1FBQ3hCLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDOztBQUdGLE1BQU0saUNBQWtDLFNBQVEsT0FBTzthQUM5QixlQUFVLEdBQUcsU0FBUyxBQUFaLENBQVk7SUFLOUMsWUFDQyxFQUFVLEVBQ08scUJBQTRDLEVBQzdELE9BQXdDO1FBRXhDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFIRSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBTDdDLFlBQU8sR0FBRyxpQkFBaUIsQ0FBQyxhQUFhLEVBQU8sQ0FBQTtRQVVoRSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQzlFLElBQUksS0FBSyxDQUFDLE1BQU0sd0NBQWdDLEVBQUUsQ0FBQztnQkFDbEQsZ0NBQWdDO2dCQUNoQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDdEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQTtnQkFDaEMsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQzVDLE1BQU0sVUFBVSxHQUFHLFVBQVUsU0FBUyxFQUFFLENBQUE7b0JBRXhDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUN6RCxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDL0IsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTt3QkFDOUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ3hDLENBQUM7b0JBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO3dCQUNsQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO3dCQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDaEMsQ0FBQztnQkFDRixDQUFDO2dCQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSwwQkFBMEIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBQzFELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRVEsUUFBUSxDQUFDLEdBQVc7UUFDNUIsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JFLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEUsSUFBSSxLQUFLLEdBQVEsU0FBUyxDQUFBO1FBQzFCLFFBQVEsT0FBTyxXQUFXLEVBQUUsQ0FBQztZQUM1QixLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssU0FBUyxDQUFDO1lBQ2YsS0FBSyxRQUFRO2dCQUNaLEtBQUssR0FBRyxXQUFXLENBQUE7Z0JBQ25CLE1BQUs7WUFDTjtnQkFDQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDaEMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ3BDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxLQUFLLEdBQUcsV0FBVyxDQUFBO2dCQUNwQixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFUSxRQUFRLENBQUMsR0FBVyxFQUFFLEtBQVU7UUFDeEMsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRVEsV0FBVyxDQUFDLEdBQVc7UUFDL0IsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFUSxnQkFBZ0I7UUFDeEIsTUFBTSxNQUFNLEdBQTJCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQy9ELE9BQU8sRUFBRSxHQUFHLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUE7SUFDbEQsQ0FBQzs7QUFHRixNQUFNLFVBQVU7SUFLZixZQUFZLE9BQWtDLEVBQUUsR0FBVyxFQUFFLFlBQTJCO1FBQ3ZGLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFBO1FBQ2YsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7UUFDakMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2IsQ0FBQztJQUVNLEdBQUcsQ0FBQyxLQUFRO1FBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLE9BQU8sSUFBSSxDQUFDLGFBQWEsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN4RCxDQUFDO0lBQ0YsQ0FBQztJQUVNLEdBQUc7UUFDVCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3RELENBQUM7Q0FDRDtBQUVELE1BQU0sMkJBQTJCO0lBQ2hDLFlBQXFCLEdBQVc7UUFBWCxRQUFHLEdBQUgsR0FBRyxDQUFRO0lBQUcsQ0FBQztJQUNwQyxXQUFXLENBQUMsSUFBMEI7UUFDckMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMxQixDQUFDO0lBQ0Qsa0JBQWtCLENBQUMsSUFBMEI7UUFDNUMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlCLENBQUM7Q0FDRDtBQUVELE1BQU0sMEJBQTBCO0lBQy9CLFlBQXFCLElBQWM7UUFBZCxTQUFJLEdBQUosSUFBSSxDQUFVO0lBQUcsQ0FBQztJQUN2QyxXQUFXLENBQUMsSUFBMEI7UUFDckMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxrQkFBa0IsQ0FBQyxJQUEwQjtRQUM1QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztDQUNEO0FBRUQsTUFBTSw4QkFBOEI7SUFDbkMsWUFBcUIsTUFBZ0M7UUFBaEMsV0FBTSxHQUFOLE1BQU0sQ0FBMEI7SUFBRyxDQUFDO0lBQ3pELFdBQVcsQ0FBQyxJQUEwQjtRQUNyQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDekIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELGtCQUFrQixDQUFDLElBQTBCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7Q0FDRDtBQUVELFNBQVMscUJBQXFCLENBQzdCLEtBQTZCLEVBQzdCLE9BQTRCO0lBRTVCLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQy9ELENBQUM7QUFFRCxNQUFNLE9BQWdCLHlCQUEwQixTQUFRLFVBQVU7SUFhakUsWUFBWSxXQUFtQjtRQUM5QixLQUFLLEVBQUUsQ0FBQTtRQVJFLHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzdDLElBQUksZ0JBQWdCLENBQXlCO1lBQzVDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxLQUFLLENBQUM7U0FDM0QsQ0FBQyxDQUNGLENBQUE7UUFDUSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBSTNELElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFFTSxTQUFTLENBQ2YsR0FBVyxFQUNYLFlBQTJCO1FBRTNCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxRQUFrQjtRQUNwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDO1lBQ0osUUFBUSxFQUFFLENBQUE7UUFDWCxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDbEMsQ0FBQztJQUNGLENBQUM7SUFFTSxZQUFZLENBQUMsT0FBaUM7UUFDcEQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFDRCxPQUFPLElBQUksdUJBQXVCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxhQUFhLENBQUMsVUFBbUMsUUFBUSxDQUFDLEtBQUssRUFBRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVNLG1CQUFtQixDQUFDLEtBQXVDO1FBQ2pFLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNqRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUNyRCxzREFBc0Q7UUFDdEQsZ0VBQWdFO1FBQ2hFLHNCQUFzQjtRQUN0QixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTSxrQkFBa0IsQ0FBSSxHQUFXO1FBQ3ZDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFTSxVQUFVLENBQUMsR0FBVyxFQUFFLEtBQVU7UUFDeEMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxDQUFDO0lBQ0YsQ0FBQztJQUVNLGFBQWEsQ0FBQyxHQUFXO1FBQy9CLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLENBQUM7SUFDRixDQUFDO0lBRU0sVUFBVSxDQUFDLE1BQXVDO1FBQ3hELElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQTtRQUM1QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQU9lLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7SUFDeEIsQ0FBQztDQUNEO0FBRU0sSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSx5QkFBeUI7SUFJL0QsWUFBbUMsb0JBQTJDO1FBQzdFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUhRLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQTtRQUl0RCxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQTtRQUV2QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQixJQUFJLGlDQUFpQyxDQUNwQyxJQUFJLENBQUMsWUFBWSxFQUNqQixvQkFBb0IsRUFDcEIsSUFBSSxDQUFDLG1CQUFtQixDQUN4QixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRWhELHlEQUF5RDtRQUN6RCw2Q0FBNkM7UUFDN0Msc0JBQXNCO1FBQ3RCLCtFQUErRTtRQUMvRSxvRkFBb0Y7UUFDcEYsdUNBQXVDO1FBQ3ZDLGdDQUFnQztRQUNoQyxrQ0FBa0M7UUFDbEMsS0FBSztRQUNMLFlBQVk7SUFDYixDQUFDO0lBRU0seUJBQXlCLENBQUMsU0FBaUI7UUFDakQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTyxXQUFXLENBQUMsUUFBUSxDQUFBO1FBQzVCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUE7SUFDN0QsQ0FBQztJQUVNLGtCQUFrQixDQUFDLGtCQUEwQixJQUFJLENBQUMsWUFBWTtRQUNwRSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUNELE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEYsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRU0sY0FBYyxDQUFDLFNBQWlCO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsQ0FBQztJQUNGLENBQUM7SUFFTSxZQUFZLENBQUMsd0JBQTRDO1FBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQTtJQUNsRSxDQUFDO0NBQ0QsQ0FBQTtBQXREWSxpQkFBaUI7SUFJaEIsV0FBQSxxQkFBcUIsQ0FBQTtHQUp0QixpQkFBaUIsQ0FzRDdCOztBQUVELE1BQU0sdUJBQXdCLFNBQVEseUJBQXlCO0lBTTlELFlBQVksTUFBaUMsRUFBRSxPQUFpQztRQUMvRSxLQUFLLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtRQUhsQiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBSS9FLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1FBRWxDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO1lBQ3pELElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQTtZQUNsQixJQUFLLElBQUksQ0FBQyxRQUF3QixDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM5QyxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBRSxJQUFJLENBQUMsUUFBd0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckYsQ0FBQztZQUVELE9BQU8sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTywyQkFBMkI7UUFDbEMsOERBQThEO1FBQzlELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQy9FLE1BQU0saUJBQWlCLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQTtZQUU3QyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3RELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRU0seUJBQXlCLENBQUMsU0FBaUI7UUFDakQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTyxXQUFXLENBQUMsUUFBUSxDQUFBO1FBQzVCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVNLGtCQUFrQixDQUFDLGtCQUEwQixJQUFJLENBQUMsWUFBWTtRQUNwRSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRU0sY0FBYyxDQUFDLFNBQWlCO1FBQ3RDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLFlBQVksQ0FBQyx1QkFBa0Q7UUFDckUsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLHVCQUF1QixFQUFFLENBQUM7WUFDOUMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMvRSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNyRCxJQUFJLENBQUMsT0FBTyxHQUFHLHVCQUF1QixDQUFBO1FBQ3RDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1FBQ2xDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pGLGFBQWEsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUU5QyxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNyRCxNQUFNLGFBQWEsR0FBRztZQUNyQixHQUFHLFFBQVEsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDO1lBQ3ZDLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUM7U0FDdkMsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztDQUNEO0FBRUQsTUFBTSxjQUFjO0lBQ25CLFlBQ1MsTUFBZ0IsRUFDaEIsT0FBaUM7UUFEakMsV0FBTSxHQUFOLE1BQU0sQ0FBVTtRQUNoQixZQUFPLEdBQVAsT0FBTyxDQUEwQjtJQUN2QyxDQUFDO0lBRUosUUFBUSxDQUE0QixHQUFXO1FBQzlDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBSSxHQUFHLENBQUMsQ0FBQTtJQUNwRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHdCQUF3QjtJQUk3QixJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFBO0lBQzdCLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUE7SUFDdEMsQ0FBQztJQUVELFlBQ1MsTUFBNEQsRUFDcEUsT0FBZ0M7UUFEeEIsV0FBTSxHQUFOLE1BQU0sQ0FBc0Q7UUFHcEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBa0I7UUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsU0FBUztRQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQXVDO1FBQ2pELE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxTQUFpQjtRQUMxQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3RFLE9BQU8sSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsbUJBQW1CLENBQUMsS0FBdUM7UUFDMUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM5RCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUNyRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxrQkFBa0IsQ0FBSSxHQUFXO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFFRCxZQUFZO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxhQUFhLENBQUMsVUFBbUMsUUFBUSxDQUFDLEtBQUssRUFBRTtRQUNoRSxPQUFPLElBQUksd0JBQXdCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxZQUFZO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7Q0FDRDtBQUVELFNBQVMsZUFBZSxDQUFDLE9BQXdDO0lBQ2hFLE9BQU8sT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztZQUNuRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLENBQUE7WUFDMUQsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDMUIsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQztRQUNELE9BQU8sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFBO0lBQ2hDLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQTtBQUNULENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLFFBQTBCLEVBQUUsVUFBZSxFQUFFLFlBQWlCO0lBQ3hGLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQzFELGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7QUFDN0UsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLFlBQWlCO0lBQ3ZDLE9BQU8sY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQzNDLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUF1QixHQUFJLENBQUMsSUFBSSw2QkFBcUIsRUFBRSxDQUFDO1lBQ2xGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO1FBQ0QsSUFBSSxHQUFHLFlBQVksR0FBRyxFQUFFLENBQUM7WUFDeEIsT0FBTyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDdEIsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFFM0QsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxtQkFBbUI7SUFDdkIsT0FBTztRQUNOLE9BQU8sQ0FBQyxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFDRCxRQUFRLEVBQUU7UUFDVCxXQUFXLEVBQUUsUUFBUSxDQUNwQixtQkFBbUIsRUFDbkIsdURBQXVELENBQ3ZEO1FBQ0QsSUFBSSxFQUFFLEVBQUU7S0FDUjtDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsRUFBRTtJQUMzRCxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFBO0lBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFDOUIsS0FBSyxNQUFNLElBQUksSUFBSSxhQUFhLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDbEQsQ0FBQyxDQUFDLENBQUEifQ==