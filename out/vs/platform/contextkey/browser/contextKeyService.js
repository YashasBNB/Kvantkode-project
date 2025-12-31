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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEtleVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb250ZXh0a2V5L2Jyb3dzZXIvY29udGV4dEtleVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFrQixnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBT04sa0JBQWtCLEVBSWxCLGFBQWEsR0FDYixNQUFNLHlCQUF5QixDQUFBO0FBR2hDLE1BQU0sdUJBQXVCLEdBQUcseUJBQXlCLENBQUE7QUFFekQsTUFBTSxPQUFPLE9BQU87SUFLbkIsWUFBWSxFQUFVLEVBQUUsTUFBc0I7UUFDN0MsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDYixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFD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