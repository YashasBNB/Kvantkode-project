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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9kb21JbXBsL24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hFLE9BQU8sRUFDTixPQUFPLEVBQ1AsV0FBVyxFQUNYLGdCQUFnQixFQUdoQixlQUFlLEdBQ2YsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRXhDLE1BQU0sS0FBVyxDQUFDLENBaUVqQjtBQWpFRCxXQUFpQixDQUFDO0lBQ2pCLFNBQVMsTUFBTSxDQUNkLFlBQWdDLFNBQVM7UUFFekMsT0FBTyxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDcEMsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQTtZQUNsQyxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUE7WUFDdkIsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQTtZQUMxQixPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUE7WUFDckIsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQTtZQUNoQyxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUE7WUFFeEIsT0FBTyxJQUFJLHVCQUF1QixDQUNqQyxHQUFVLEVBQ1YsR0FBRyxFQUNILE1BQU0sRUFDTixTQUFTLEVBQ1QsU0FBUyxFQUNULFVBQVUsRUFDVixRQUFRLENBQ1IsQ0FBQTtRQUNGLENBQUMsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLElBQUksQ0FDWixHQUFTLEVBQ1QsWUFBZ0MsU0FBUztRQUV6QyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFRLENBQUE7UUFDbEMsT0FBTyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUMvQixPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQTtJQUNGLENBQUM7SUFFWSxLQUFHLEdBQWdELElBQUksQ0FHbEUsS0FBSyxDQUFDLENBQUE7SUFFSyxNQUFJLEdBQUcsTUFBTSxDQUF3QixTQUFTLENBQUMsQ0FBQTtJQUUvQyxLQUFHLEdBQTBELElBQUksQ0FHNUUsS0FBSyxFQUFFLDRCQUE0QixDQUFDLENBQUE7SUFFekIsU0FBTyxHQUFHLE1BQU0sQ0FBd0IsNEJBQTRCLENBQUMsQ0FBQTtJQUVsRixTQUFnQixHQUFHO1FBQ2xCLElBQUksS0FBSyxHQUFrQixTQUFTLENBQUE7UUFDcEMsTUFBTSxNQUFNLEdBQVksVUFBVSxHQUFNO1lBQ3ZDLEtBQUssR0FBRyxHQUFHLENBQUE7UUFDWixDQUFDLENBQUE7UUFDRCxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUU7WUFDeEMsR0FBRztnQkFDRixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osTUFBTSxJQUFJLGtCQUFrQixDQUMzQiwwRkFBMEYsQ0FDMUYsQ0FBQTtnQkFDRixDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUNGLE9BQU8sTUFBYSxDQUFBO0lBQ3JCLENBQUM7SUFoQmUsS0FBRyxNQWdCbEIsQ0FBQTtBQUNGLENBQUMsRUFqRWdCLENBQUMsS0FBRCxDQUFDLFFBaUVqQjtBQWdFRCxNQUFNLE9BQWdCLFlBQVk7SUFLakMsWUFDQyxHQUFXLEVBQ1gsR0FBd0IsRUFDeEIsTUFBMkQsRUFDM0QsRUFBc0IsRUFDdEIsU0FBOEQsRUFDOUQsVUFBbUMsRUFDbkMsUUFBbUI7UUFYSCxjQUFTLEdBQXVCLEVBQUUsQ0FBQTtRQWFsRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRTtZQUNsQixDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO1lBQ25DLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFpQixDQUFBO1FBQy9DLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25CLENBQUM7UUFDRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLGdCQUFnQixDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUNuQyxNQUFNLENBQUMsSUFBNkMsQ0FBQyxDQUFBO2dCQUNyRCxLQUFLLENBQUMsR0FBRyxDQUFDO29CQUNULE9BQU8sRUFBRSxHQUFHLEVBQUU7d0JBQ2IsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNiLENBQUM7aUJBQ0QsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDeEIsNkJBQTZCO29CQUM3QixZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQzdELENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1lBQ2hFLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN2RCxJQUFJLEdBQUcsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDckIsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDeEQsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ3pDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7d0JBQzVCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxhQUFhLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTs0QkFDNUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQzdFLENBQUMsQ0FBQyxDQUNGLENBQUE7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7b0JBQ2hFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQy9CLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7d0JBQ3hCLGdDQUFnQzt3QkFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQVEsQ0FBQTtvQkFDbkQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDakMsQ0FBQztnQkFBQyxJQUFJLENBQUMsUUFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7WUFDckMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTt3QkFDdEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO29CQUM3RCxDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDaEQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLFNBQVMsV0FBVyxDQUNuQixNQUEyQixFQUMzQixRQUFtRTtnQkFFbkUsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFDbEQsQ0FBQztnQkFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDN0IsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZELENBQUM7Z0JBQ0QsSUFBSSxRQUFRLFlBQVksWUFBWSxFQUFFLENBQUM7b0JBQ3RDLElBQUksTUFBTSxFQUFFLENBQUM7d0JBQ1osUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDNUIsQ0FBQztvQkFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMzQixDQUFDO2dCQUNELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUNsQixDQUFDO2dCQUNELE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDbEMsZ0NBQWdDO2dCQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUNoRSxDQUFDLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDUixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBMkI7UUFDckMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQXNCO1FBQ2pDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLGFBQWE7WUFDYixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLE9BQU8sSUFBNkMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCx1QkFBdUI7UUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLFlBQVksQ0FBQyxPQUFnQixFQUFFLFNBQWlCO0lBQ3hELElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDM0IsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDekMsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtJQUM5QixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUNmLEtBQXFCLEVBQ3JCLE1BQTJCLEVBQzNCLEVBQW9CO0lBRXBCLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDekIsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN0QixPQUFNO0lBQ1AsQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzFCLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDdkIsT0FBTyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkIsQ0FBQztRQUNELE9BQU07SUFDUCxDQUFDO0lBQ0QsRUFBRSxDQUFDLEtBQVksQ0FBQyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FDcEIsU0FBOEQsRUFDOUQsTUFBMkI7SUFFM0IsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBQ2YsT0FBTyxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUNsQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN6QixNQUFNLEdBQUcsR0FBRyxDQUFBO1lBQ2IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDRixPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxLQUEyQjtJQUNqRCxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzFCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEtBQVU7SUFDbEMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMvQixPQUFPLEtBQUssR0FBRyxJQUFJLENBQUE7SUFDcEIsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQzVCLFFBQW1FO0lBRW5FLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDNUIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDN0IsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixPQUFVLEVBQ1QsV0FBd0I7UUFEekIsWUFBTyxHQUFQLE9BQU8sQ0FBRztRQUNULGdCQUFXLEdBQVgsV0FBVyxDQUFhO0lBQ3ZDLENBQUM7SUFFSixPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sdUJBQXFELFNBQVEsWUFBZTtJQUF6Rjs7UUFLUyxlQUFVLEdBQXFDLFNBQVMsQ0FBQTtRQVl4RCw2QkFBd0IsR0FBcUMsU0FBUyxDQUFBO0lBc0IvRSxDQUFDO0lBdENBLElBQVcsT0FBTztRQUNqQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUlELElBQUksU0FBUztRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFVLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUNsRixJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUNuRixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQTtRQUMxQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFJRCxJQUFJLHVCQUF1QjtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDcEMsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO1lBQ3JCLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBVSx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxRSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNuRCxTQUFTLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDbEQsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDN0IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDbkQsU0FBUyxHQUFHLEtBQUssQ0FBQTtnQkFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDOUIsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFJLENBQUMsd0JBQXdCLEdBQUcsT0FBTyxDQUFBO1FBQ3hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQTtJQUNyQyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLG9CQUFvQixDQUFDLE9BQWdCLEVBQUUsR0FBVyxFQUFFLEtBQWM7SUFDMUUsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUMzQyxPQUFPLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDcEQsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxHQUFXO0lBQ3pDLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtBQUM3RCxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUksR0FBUTtJQUNoQyxPQUFPLENBQ04sR0FBRztRQUNILE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLFNBQVM7UUFDekIsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLFNBQVMsQ0FDbEMsQ0FBQTtBQUNGLENBQUMifQ==