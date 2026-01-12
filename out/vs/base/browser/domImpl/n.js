/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../common/errors.js';
import { DisposableStore } from '../../common/lifecycle.js';
import { derived, derivedOpts, derivedWithStore, observableValue, } from '../../common/observable.js';
import { isSVGElement } from '../dom.js';
export var n;
(function (n) {
    function nodeNs(elementNs = undefined) {
        return (tag, attributes, children) => {
            const className = attributes.class;
            delete attributes.class;
            const ref = attributes.ref;
            delete attributes.ref;
            const obsRef = attributes.obsRef;
            delete attributes.obsRef;
            return new ObserverNodeWithElement(tag, ref, obsRef, elementNs, className, attributes, children);
        };
    }
    function node(tag, elementNs = undefined) {
        const f = nodeNs(elementNs);
        return (attributes, children) => {
            return f(tag, attributes, children);
        };
    }
    n.div = node('div');
    n.elem = nodeNs(undefined);
    n.svg = node('svg', 'http://www.w3.org/2000/svg');
    n.svgElem = nodeNs('http://www.w3.org/2000/svg');
    function ref() {
        let value = undefined;
        const result = function (val) {
            value = val;
        };
        Object.defineProperty(result, 'element', {
            get() {
                if (!value) {
                    throw new BugIndicatingError('Make sure the ref is set before accessing the element. Maybe wrong initialization order?');
                }
                return value;
            },
        });
        return result;
    }
    n.ref = ref;
})(n || (n = {}));
export class ObserverNode {
    constructor(tag, ref, obsRef, ns, className, attributes, children) {
        this._deriveds = [];
        this._element = (ns
            ? document.createElementNS(ns, tag)
            : document.createElement(tag));
        if (ref) {
            ref(this._element);
        }
        if (obsRef) {
            this._deriveds.push(derivedWithStore((_reader, store) => {
                obsRef(this);
                store.add({
                    dispose: () => {
                        obsRef(null);
                    },
                });
            }));
        }
        if (className) {
            if (hasObservable(className)) {
                this._deriveds.push(derived(this, (reader) => {
                    /** @description set.class */
                    setClassName(this._element, getClassName(className, reader));
                }));
            }
            else {
                setClassName(this._element, getClassName(className, undefined));
            }
        }
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'style') {
                for (const [cssKey, cssValue] of Object.entries(value)) {
                    const key = camelCaseToHyphenCase(cssKey);
                    if (isObservable(cssValue)) {
                        this._deriveds.push(derivedOpts({ owner: this, debugName: () => `set.style.${key}` }, (reader) => {
                            this._element.style.setProperty(key, convertCssValue(cssValue.read(reader)));
                        }));
                    }
                    else {
                        this._element.style.setProperty(key, convertCssValue(cssValue));
                    }
                }
            }
            else if (key === 'tabIndex') {
                if (isObservable(value)) {
                    this._deriveds.push(derived(this, (reader) => {
                        /** @description set.tabIndex */
                        this._element.tabIndex = value.read(reader);
                    }));
                }
                else {
                    this._element.tabIndex = value;
                }
            }
            else if (key.startsWith('on')) {
                ;
                this._element[key] = value;
            }
            else {
                if (isObservable(value)) {
                    this._deriveds.push(derivedOpts({ owner: this, debugName: () => `set.${key}` }, (reader) => {
                        setOrRemoveAttribute(this._element, key, value.read(reader));
                    }));
                }
                else {
                    setOrRemoveAttribute(this._element, key, value);
                }
            }
        }
        if (children) {
            function getChildren(reader, children) {
                if (isObservable(children)) {
                    return getChildren(reader, children.read(reader));
                }
                if (Array.isArray(children)) {
                    return children.flatMap((c) => getChildren(reader, c));
                }
                if (children instanceof ObserverNode) {
                    if (reader) {
                        children.readEffect(reader);
                    }
                    return [children._element];
                }
                if (children) {
                    return [children];
                }
                return [];
            }
            const d = derived(this, (reader) => {
                /** @description set.children */
                this._element.replaceChildren(...getChildren(reader, children));
            });
            this._deriveds.push(d);
            if (!childrenIsObservable(children)) {
                d.get();
            }
        }
    }
    readEffect(reader) {
        for (const d of this._deriveds) {
            d.read(reader);
        }
    }
    keepUpdated(store) {
        derived((reader) => {
            /** update */
            this.readEffect(reader);
        }).recomputeInitiallyAndOnChange(store);
        return this;
    }
    /**
     * Creates a live element that will keep the element updated as long as the returned object is not disposed.
     */
    toDisposableLiveElement() {
        const store = new DisposableStore();
        this.keepUpdated(store);
        return new LiveElement(this._element, store);
    }
}
function setClassName(domNode, className) {
    if (isSVGElement(domNode)) {
        domNode.setAttribute('class', className);
    }
    else {
        domNode.className = className;
    }
}
function resolve(value, reader, cb) {
    if (isObservable(value)) {
        cb(value.read(reader));
        return;
    }
    if (Array.isArray(value)) {
        for (const v of value) {
            resolve(v, reader, cb);
        }
        return;
    }
    cb(value);
}
function getClassName(className, reader) {
    let result = '';
    resolve(className, reader, (val) => {
        if (val) {
            if (result.length === 0) {
                result = val;
            }
            else {
                result += ' ' + val;
            }
        }
    });
    return result;
}
function hasObservable(value) {
    if (isObservable(value)) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.some((v) => hasObservable(v));
    }
    return false;
}
function convertCssValue(value) {
    if (typeof value === 'number') {
        return value + 'px';
    }
    return value;
}
function childrenIsObservable(children) {
    if (isObservable(children)) {
        return true;
    }
    if (Array.isArray(children)) {
        return children.some((c) => childrenIsObservable(c));
    }
    return false;
}
export class LiveElement {
    constructor(element, _disposable) {
        this.element = element;
        this._disposable = _disposable;
    }
    dispose() {
        this._disposable.dispose();
    }
}
export class ObserverNodeWithElement extends ObserverNode {
    constructor() {
        super(...arguments);
        this._isHovered = undefined;
        this._didMouseMoveDuringHover = undefined;
    }
    get element() {
        return this._element;
    }
    get isHovered() {
        if (!this._isHovered) {
            const hovered = observableValue('hovered', false);
            this._element.addEventListener('mouseenter', (_e) => hovered.set(true, undefined));
            this._element.addEventListener('mouseleave', (_e) => hovered.set(false, undefined));
            this._isHovered = hovered;
        }
        return this._isHovered;
    }
    get didMouseMoveDuringHover() {
        if (!this._didMouseMoveDuringHover) {
            let _hovering = false;
            const hovered = observableValue('didMouseMoveDuringHover', false);
            this._element.addEventListener('mouseenter', (_e) => {
                _hovering = true;
            });
            this._element.addEventListener('mousemove', (_e) => {
                if (_hovering) {
                    hovered.set(true, undefined);
                }
            });
            this._element.addEventListener('mouseleave', (_e) => {
                _hovering = false;
                hovered.set(false, undefined);
            });
            this._didMouseMoveDuringHover = hovered;
        }
        return this._didMouseMoveDuringHover;
    }
}
function setOrRemoveAttribute(element, key, value) {
    if (value === null || value === undefined) {
        element.removeAttribute(camelCaseToHyphenCase(key));
    }
    else {
        element.setAttribute(camelCaseToHyphenCase(key), String(value));
    }
}
function camelCaseToHyphenCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
function isObservable(obj) {
    return (obj &&
        typeof obj === 'object' &&
        obj['read'] !== undefined &&
        obj['reportChanges'] !== undefined);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2RvbUltcGwvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sMkJBQTJCLENBQUE7QUFDeEUsT0FBTyxFQUNOLE9BQU8sRUFDUCxXQUFXLEVBQ1gsZ0JBQWdCLEVBR2hCLGVBQWUsR0FDZixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFFeEMsTUFBTSxLQUFXLENBQUMsQ0FpRWpCO0FBakVELFdBQWlCLENBQUM7SUFDakIsU0FBUyxNQUFNLENBQ2QsWUFBZ0MsU0FBUztRQUV6QyxPQUFPLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNwQyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFBO1lBQ2xDLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQTtZQUN2QixNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFBO1lBQzFCLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQTtZQUNyQixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO1lBQ2hDLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQTtZQUV4QixPQUFPLElBQUksdUJBQXVCLENBQ2pDLEdBQVUsRUFDVixHQUFHLEVBQ0gsTUFBTSxFQUNOLFNBQVMsRUFDVCxTQUFTLEVBQ1QsVUFBVSxFQUNWLFFBQVEsQ0FDUixDQUFBO1FBQ0YsQ0FBQyxDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsSUFBSSxDQUNaLEdBQVMsRUFDVCxZQUFnQyxTQUFTO1FBRXpDLE1B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