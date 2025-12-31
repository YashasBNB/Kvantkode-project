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
import { EventHelper, getActiveElement, getWindow, isActiveElement, isEditableElement, isHTMLElement, isMouseEvent, } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { asCssValueWithDefault } from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { Gesture } from '../../touch.js';
import { alert } from '../aria/aria.js';
import { CombinedSpliceable } from './splice.js';
import { binarySearch, range } from '../../../common/arrays.js';
import { timeout } from '../../../common/async.js';
import { Color } from '../../../common/color.js';
import { memoize } from '../../../common/decorators.js';
import { Emitter, Event, EventBufferer } from '../../../common/event.js';
import { matchesFuzzy2, matchesPrefix } from '../../../common/filters.js';
import { DisposableStore, dispose } from '../../../common/lifecycle.js';
import { clamp } from '../../../common/numbers.js';
import * as platform from '../../../common/platform.js';
import { isNumber } from '../../../common/types.js';
import './list.css';
import { ListError, } from './list.js';
import { ListView, } from './listView.js';
import { StandardMouseEvent } from '../../mouseEvent.js';
import { autorun, constObservable } from '../../../common/observable.js';
class TraitRenderer {
    constructor(trait) {
        this.trait = trait;
        this.renderedElements = [];
    }
    get templateId() {
        return `template:${this.trait.name}`;
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(element, index, templateData) {
        const renderedElementIndex = this.renderedElements.findIndex((el) => el.templateData === templateData);
        if (renderedElementIndex >= 0) {
            const rendered = this.renderedElements[renderedElementIndex];
            this.trait.unrender(templateData);
            rendered.index = index;
        }
        else {
            const rendered = { index, templateData };
            this.renderedElements.push(rendered);
        }
        this.trait.renderIndex(index, templateData);
    }
    splice(start, deleteCount, insertCount) {
        const rendered = [];
        for (const renderedElement of this.renderedElements) {
            if (renderedElement.index < start) {
                rendered.push(renderedElement);
            }
            else if (renderedElement.index >= start + deleteCount) {
                rendered.push({
                    index: renderedElement.index + insertCount - deleteCount,
                    templateData: renderedElement.templateData,
                });
            }
        }
        this.renderedElements = rendered;
    }
    renderIndexes(indexes) {
        for (const { index, templateData } of this.renderedElements) {
            if (indexes.indexOf(index) > -1) {
                this.trait.renderIndex(index, templateData);
            }
        }
    }
    disposeTemplate(templateData) {
        const index = this.renderedElements.findIndex((el) => el.templateData === templateData);
        if (index < 0) {
            return;
        }
        this.renderedElements.splice(index, 1);
    }
}
class Trait {
    get name() {
        return this._trait;
    }
    get renderer() {
        return new TraitRenderer(this);
    }
    constructor(_trait) {
        this._trait = _trait;
        this.indexes = [];
        this.sortedIndexes = [];
        this._onChange = new Emitter();
        this.onChange = this._onChange.event;
    }
    splice(start, deleteCount, elements) {
        const diff = elements.length - deleteCount;
        const end = start + deleteCount;
        const sortedIndexes = [];
        let i = 0;
        while (i < this.sortedIndexes.length && this.sortedIndexes[i] < start) {
            sortedIndexes.push(this.sortedIndexes[i++]);
        }
        for (let j = 0; j < elements.length; j++) {
            if (elements[j]) {
                sortedIndexes.push(j + start);
            }
        }
        while (i < this.sortedIndexes.length && this.sortedIndexes[i] >= end) {
            sortedIndexes.push(this.sortedIndexes[i++] + diff);
        }
        this.renderer.splice(start, deleteCount, elements.length);
        this._set(sortedIndexes, sortedIndexes);
    }
    renderIndex(index, container) {
        container.classList.toggle(this._trait, this.contains(index));
    }
    unrender(container) {
        container.classList.remove(this._trait);
    }
    /**
     * Sets the indexes which should have this trait.
     *
     * @param indexes Indexes which should have this trait.
     * @return The old indexes which had this trait.
     */
    set(indexes, browserEvent) {
        return this._set(indexes, [...indexes].sort(numericSort), browserEvent);
    }
    _set(indexes, sortedIndexes, browserEvent) {
        const result = this.indexes;
        const sortedResult = this.sortedIndexes;
        this.indexes = indexes;
        this.sortedIndexes = sortedIndexes;
        const toRender = disjunction(sortedResult, indexes);
        this.renderer.renderIndexes(toRender);
        this._onChange.fire({ indexes, browserEvent });
        return result;
    }
    get() {
        return this.indexes;
    }
    contains(index) {
        return binarySearch(this.sortedIndexes, index, numericSort) >= 0;
    }
    dispose() {
        dispose(this._onChange);
    }
}
__decorate([
    memoize
], Trait.prototype, "renderer", null);
class SelectionTrait extends Trait {
    constructor(setAriaSelected) {
        super('selected');
        this.setAriaSelected = setAriaSelected;
    }
    renderIndex(index, container) {
        super.renderIndex(index, container);
        if (this.setAriaSelected) {
            if (this.contains(index)) {
                container.setAttribute('aria-selected', 'true');
            }
            else {
                container.setAttribute('aria-selected', 'false');
            }
        }
    }
}
/**
 * The TraitSpliceable is used as a util class to be able
 * to preserve traits across splice calls, given an identity
 * provider.
 */
class TraitSpliceable {
    constructor(trait, view, identityProvider) {
        this.trait = trait;
        this.view = view;
        this.identityProvider = identityProvider;
    }
    splice(start, deleteCount, elements) {
        if (!this.identityProvider) {
            return this.trait.splice(start, deleteCount, new Array(elements.length).fill(false));
        }
        const pastElementsWithTrait = this.trait
            .get()
            .map((i) => this.identityProvider.getId(this.view.element(i)).toString());
        if (pastElementsWithTrait.length === 0) {
            return this.trait.splice(start, deleteCount, new Array(elements.length).fill(false));
        }
        const pastElementsWithTraitSet = new Set(pastElementsWithTrait);
        const elementsWithTrait = elements.map((e) => pastElementsWithTraitSet.has(this.identityProvider.getId(e).toString()));
        this.trait.splice(start, deleteCount, elementsWithTrait);
    }
}
function isListElementDescendantOfClass(e, className) {
    if (e.classList.contains(className)) {
        return true;
    }
    if (e.classList.contains('monaco-list')) {
        return false;
    }
    if (!e.parentElement) {
        return false;
    }
    return isListElementDescendantOfClass(e.parentElement, className);
}
export function isMonacoEditor(e) {
    return isListElementDescendantOfClass(e, 'monaco-editor');
}
export function isMonacoCustomToggle(e) {
    return isListElementDescendantOfClass(e, 'monaco-custom-toggle');
}
export function isActionItem(e) {
    return isListElementDescendantOfClass(e, 'action-item');
}
export function isMonacoTwistie(e) {
    return isListElementDescendantOfClass(e, 'monaco-tl-twistie');
}
export function isStickyScrollElement(e) {
    return isListElementDescendantOfClass(e, 'monaco-tree-sticky-row');
}
export function isStickyScrollContainer(e) {
    return e.classList.contains('monaco-tree-sticky-container');
}
export function isButton(e) {
    if ((e.tagName === 'A' && e.classList.contains('monaco-button')) ||
        (e.tagName === 'DIV' && e.classList.contains('monaco-button-dropdown'))) {
        return true;
    }
    if (e.classList.contains('monaco-list')) {
        return false;
    }
    if (!e.parentElement) {
        return false;
    }
    return isButton(e.parentElement);
}
class KeyboardController {
    get onKeyDown() {
        return Event.chain(this.disposables.add(new DomEmitter(this.view.domNode, 'keydown')).event, ($) => $.filter((e) => !isEditableElement(e.target)).map((e) => new StandardKeyboardEvent(e)));
    }
    constructor(list, view, options) {
        this.list = list;
        this.view = view;
        this.disposables = new DisposableStore();
        this.multipleSelectionDisposables = new DisposableStore();
        this.multipleSelectionSupport = options.multipleSelectionSupport;
        this.disposables.add(this.onKeyDown((e) => {
            switch (e.keyCode) {
                case 3 /* KeyCode.Enter */:
                    return this.onEnter(e);
                case 16 /* KeyCode.UpArrow */:
                    return this.onUpArrow(e);
                case 18 /* KeyCode.DownArrow */:
                    return this.onDownArrow(e);
                case 11 /* KeyCode.PageUp */:
                    return this.onPageUpArrow(e);
                case 12 /* KeyCode.PageDown */:
                    return this.onPageDownArrow(e);
                case 9 /* KeyCode.Escape */:
                    return this.onEscape(e);
                case 31 /* KeyCode.KeyA */:
                    if (this.multipleSelectionSupport && (platform.isMacintosh ? e.metaKey : e.ctrlKey)) {
                        this.onCtrlA(e);
                    }
            }
        }));
    }
    updateOptions(optionsUpdate) {
        if (optionsUpdate.multipleSelectionSupport !== undefined) {
            this.multipleSelectionSupport = optionsUpdate.multipleSelectionSupport;
        }
    }
    onEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.setSelection(this.list.getFocus(), e.browserEvent);
    }
    onUpArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusPrevious(1, false, e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onDownArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusNext(1, false, e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onPageUpArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusPreviousPage(e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onPageDownArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusNextPage(e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onCtrlA(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.setSelection(range(this.list.length), e.browserEvent);
        this.list.setAnchor(undefined);
        this.view.domNode.focus();
    }
    onEscape(e) {
        if (this.list.getSelection().length) {
            e.preventDefault();
            e.stopPropagation();
            this.list.setSelection([], e.browserEvent);
            this.list.setAnchor(undefined);
            this.view.domNode.focus();
        }
    }
    dispose() {
        this.disposables.dispose();
        this.multipleSelectionDisposables.dispose();
    }
}
__decorate([
    memoize
], KeyboardController.prototype, "onKeyDown", null);
export var TypeNavigationMode;
(function (TypeNavigationMode) {
    TypeNavigationMode[TypeNavigationMode["Automatic"] = 0] = "Automatic";
    TypeNavigationMode[TypeNavigationMode["Trigger"] = 1] = "Trigger";
})(TypeNavigationMode || (TypeNavigationMode = {}));
var TypeNavigationControllerState;
(function (TypeNavigationControllerState) {
    TypeNavigationControllerState[TypeNavigationControllerState["Idle"] = 0] = "Idle";
    TypeNavigationControllerState[TypeNavigationControllerState["Typing"] = 1] = "Typing";
})(TypeNavigationControllerState || (TypeNavigationControllerState = {}));
export const DefaultKeyboardNavigationDelegate = new (class {
    mightProducePrintableCharacter(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return false;
        }
        return ((event.keyCode >= 31 /* KeyCode.KeyA */ && event.keyCode <= 56 /* KeyCode.KeyZ */) ||
            (event.keyCode >= 21 /* KeyCode.Digit0 */ && event.keyCode <= 30 /* KeyCode.Digit9 */) ||
            (event.keyCode >= 98 /* KeyCode.Numpad0 */ && event.keyCode <= 107 /* KeyCode.Numpad9 */) ||
            (event.keyCode >= 85 /* KeyCode.Semicolon */ && event.keyCode <= 95 /* KeyCode.Quote */));
    }
})();
class TypeNavigationController {
    constructor(list, view, keyboardNavigationLabelProvider, keyboardNavigationEventFilter, delegate) {
        this.list = list;
        this.view = view;
        this.keyboardNavigationLabelProvider = keyboardNavigationLabelProvider;
        this.keyboardNavigationEventFilter = keyboardNavigationEventFilter;
        this.delegate = delegate;
        this.enabled = false;
        this.state = TypeNavigationControllerState.Idle;
        this.mode = TypeNavigationMode.Automatic;
        this.triggered = false;
        this.previouslyFocused = -1;
        this.enabledDisposables = new DisposableStore();
        this.disposables = new DisposableStore();
        this.updateOptions(list.options);
    }
    updateOptions(options) {
        if (options.typeNavigationEnabled ?? true) {
            this.enable();
        }
        else {
            this.disable();
        }
        this.mode = options.typeNavigationMode ?? TypeNavigationMode.Automatic;
    }
    trigger() {
        this.triggered = !this.triggered;
    }
    enable() {
        if (this.enabled) {
            return;
        }
        let typing = false;
        const onChar = Event.chain(this.enabledDisposables.add(new DomEmitter(this.view.domNode, 'keydown')).event, ($) => $.filter((e) => !isEditableElement(e.target))
            .filter(() => this.mode === TypeNavigationMode.Automatic || this.triggered)
            .map((event) => new StandardKeyboardEvent(event))
            .filter((e) => typing || this.keyboardNavigationEventFilter(e))
            .filter((e) => this.delegate.mightProducePrintableCharacter(e))
            .forEach((e) => EventHelper.stop(e, true))
            .map((event) => event.browserEvent.key));
        const onClear = Event.debounce(onChar, () => null, 800, undefined, undefined, undefined, this.enabledDisposables);
        const onInput = Event.reduce(Event.any(onChar, onClear), (r, i) => (i === null ? null : (r || '') + i), undefined, this.enabledDisposables);
        onInput(this.onInput, this, this.enabledDisposables);
        onClear(this.onClear, this, this.enabledDisposables);
        onChar(() => (typing = true), undefined, this.enabledDisposables);
        onClear(() => (typing = false), undefined, this.enabledDisposables);
        this.enabled = true;
        this.triggered = false;
    }
    disable() {
        if (!this.enabled) {
            return;
        }
        this.enabledDisposables.clear();
        this.enabled = false;
        this.triggered = false;
    }
    onClear() {
        const focus = this.list.getFocus();
        if (focus.length > 0 && focus[0] === this.previouslyFocused) {
            // List: re-announce element on typing end since typed keys will interrupt aria label of focused element
            // Do not announce if there was a focus change at the end to prevent duplication https://github.com/microsoft/vscode/issues/95961
            const ariaLabel = this.list.options.accessibilityProvider?.getAriaLabel(this.list.element(focus[0]));
            if (typeof ariaLabel === 'string') {
                alert(ariaLabel);
            }
            else if (ariaLabel) {
                alert(ariaLabel.get());
            }
        }
        this.previouslyFocused = -1;
    }
    onInput(word) {
        if (!word) {
            this.state = TypeNavigationControllerState.Idle;
            this.triggered = false;
            return;
        }
        const focus = this.list.getFocus();
        const start = focus.length > 0 ? focus[0] : 0;
        const delta = this.state === TypeNavigationControllerState.Idle ? 1 : 0;
        this.state = TypeNavigationControllerState.Typing;
        for (let i = 0; i < this.list.length; i++) {
            const index = (start + i + delta) % this.list.length;
            const label = this.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(this.view.element(index));
            const labelStr = label && label.toString();
            if (this.list.options.typeNavigationEnabled) {
                if (typeof labelStr !== 'undefined') {
                    // If prefix is found, focus and return early
                    if (matchesPrefix(word, labelStr)) {
                        this.previouslyFocused = start;
                        this.list.setFocus([index]);
                        this.list.reveal(index);
                        return;
                    }
                    const fuzzy = matchesFuzzy2(word, labelStr);
                    if (fuzzy) {
                        const fuzzyScore = fuzzy[0].end - fuzzy[0].start;
                        // ensures that when fuzzy matching, doesn't clash with prefix matching (1 input vs 1+ should be prefix and fuzzy respecitvely). Also makes sure that exact matches are prioritized.
                        if (fuzzyScore > 1 && fuzzy.length === 1) {
                            this.previouslyFocused = start;
                            this.list.setFocus([index]);
                            this.list.reveal(index);
                            return;
                        }
                    }
                }
            }
            else if (typeof labelStr === 'undefined' || matchesPrefix(word, labelStr)) {
                this.previouslyFocused = start;
                this.list.setFocus([index]);
                this.list.reveal(index);
                return;
            }
        }
    }
    dispose() {
        this.disable();
        this.enabledDisposables.dispose();
        this.disposables.dispose();
    }
}
class DOMFocusController {
    constructor(list, view) {
        this.list = list;
        this.view = view;
        this.disposables = new DisposableStore();
        const onKeyDown = Event.chain(this.disposables.add(new DomEmitter(view.domNode, 'keydown')).event, ($) => $.filter((e) => !isEditableElement(e.target)).map((e) => new StandardKeyboardEvent(e)));
        const onTab = Event.chain(onKeyDown, ($) => $.filter((e) => e.keyCode === 2 /* KeyCode.Tab */ && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey));
        onTab(this.onTab, this, this.disposables);
    }
    onTab(e) {
        if (e.target !== this.view.domNode) {
            return;
        }
        const focus = this.list.getFocus();
        if (focus.length === 0) {
            return;
        }
        const focusedDomElement = this.view.domElement(focus[0]);
        if (!focusedDomElement) {
            return;
        }
        const tabIndexElement = focusedDomElement.querySelector('[tabIndex]');
        if (!tabIndexElement || !isHTMLElement(tabIndexElement) || tabIndexElement.tabIndex === -1) {
            return;
        }
        const style = getWindow(tabIndexElement).getComputedStyle(tabIndexElement);
        if (style.visibility === 'hidden' || style.display === 'none') {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        tabIndexElement.focus();
    }
    dispose() {
        this.disposables.dispose();
    }
}
export function isSelectionSingleChangeEvent(event) {
    return platform.isMacintosh ? event.browserEvent.metaKey : event.browserEvent.ctrlKey;
}
export function isSelectionRangeChangeEvent(event) {
    return event.browserEvent.shiftKey;
}
function isMouseRightClick(event) {
    return isMouseEvent(event) && event.button === 2;
}
const DefaultMultipleSelectionController = {
    isSelectionSingleChangeEvent,
    isSelectionRangeChangeEvent,
};
export class MouseController {
    constructor(list) {
        this.list = list;
        this.disposables = new DisposableStore();
        this._onPointer = new Emitter();
        this.onPointer = this._onPointer.event;
        if (list.options.multipleSelectionSupport !== false) {
            this.multipleSelectionController =
                this.list.options.multipleSelectionController || DefaultMultipleSelectionController;
        }
        this.mouseSupport =
            typeof list.options.mouseSupport === 'undefined' || !!list.options.mouseSupport;
        if (this.mouseSupport) {
            list.onMouseDown(this.onMouseDown, this, this.disposables);
            list.onContextMenu(this.onContextMenu, this, this.disposables);
            list.onMouseDblClick(this.onDoubleClick, this, this.disposables);
            list.onTouchStart(this.onMouseDown, this, this.disposables);
            this.disposables.add(Gesture.addTarget(list.getHTMLElement()));
        }
        Event.any(list.onMouseClick, list.onMouseMiddleClick, list.onTap)(this.onViewPointer, this, this.disposables);
    }
    updateOptions(optionsUpdate) {
        if (optionsUpdate.multipleSelectionSupport !== undefined) {
            this.multipleSelectionController = undefined;
            if (optionsUpdate.multipleSelectionSupport) {
                this.multipleSelectionController =
                    this.list.options.multipleSelectionController || DefaultMultipleSelectionController;
            }
        }
    }
    isSelectionSingleChangeEvent(event) {
        if (!this.multipleSelectionController) {
            return false;
        }
        return this.multipleSelectionController.isSelectionSingleChangeEvent(event);
    }
    isSelectionRangeChangeEvent(event) {
        if (!this.multipleSelectionController) {
            return false;
        }
        return this.multipleSelectionController.isSelectionRangeChangeEvent(event);
    }
    isSelectionChangeEvent(event) {
        return this.isSelectionSingleChangeEvent(event) || this.isSelectionRangeChangeEvent(event);
    }
    onMouseDown(e) {
        if (isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (getActiveElement() !== e.browserEvent.target) {
            this.list.domFocus();
        }
    }
    onContextMenu(e) {
        if (isEditableElement(e.browserEvent.target) ||
            isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        const focus = typeof e.index === 'undefined' ? [] : [e.index];
        this.list.setFocus(focus, e.browserEvent);
    }
    onViewPointer(e) {
        if (!this.mouseSupport) {
            return;
        }
        if (isEditableElement(e.browserEvent.target) ||
            isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        e.browserEvent.isHandledByList = true;
        const focus = e.index;
        if (typeof focus === 'undefined') {
            this.list.setFocus([], e.browserEvent);
            this.list.setSelection([], e.browserEvent);
            this.list.setAnchor(undefined);
            return;
        }
        if (this.isSelectionChangeEvent(e)) {
            return this.changeSelection(e);
        }
        this.list.setFocus([focus], e.browserEvent);
        this.list.setAnchor(focus);
        if (!isMouseRightClick(e.browserEvent)) {
            this.list.setSelection([focus], e.browserEvent);
        }
        this._onPointer.fire(e);
    }
    onDoubleClick(e) {
        if (isEditableElement(e.browserEvent.target) ||
            isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (this.isSelectionChangeEvent(e)) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        e.browserEvent.isHandledByList = true;
        const focus = this.list.getFocus();
        this.list.setSelection(focus, e.browserEvent);
    }
    changeSelection(e) {
        const focus = e.index;
        let anchor = this.list.getAnchor();
        if (this.isSelectionRangeChangeEvent(e)) {
            if (typeof anchor === 'undefined') {
                const currentFocus = this.list.getFocus()[0];
                anchor = currentFocus ?? focus;
                this.list.setAnchor(anchor);
            }
            const min = Math.min(anchor, focus);
            const max = Math.max(anchor, focus);
            const rangeSelection = range(min, max + 1);
            const selection = this.list.getSelection();
            const contiguousRange = getContiguousRangeContaining(disjunction(selection, [anchor]), anchor);
            if (contiguousRange.length === 0) {
                return;
            }
            const newSelection = disjunction(rangeSelection, relativeComplement(selection, contiguousRange));
            this.list.setSelection(newSelection, e.browserEvent);
            this.list.setFocus([focus], e.browserEvent);
        }
        else if (this.isSelectionSingleChangeEvent(e)) {
            const selection = this.list.getSelection();
            const newSelection = selection.filter((i) => i !== focus);
            this.list.setFocus([focus]);
            this.list.setAnchor(focus);
            if (selection.length === newSelection.length) {
                this.list.setSelection([...newSelection, focus], e.browserEvent);
            }
            else {
                this.list.setSelection(newSelection, e.browserEvent);
            }
        }
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class DefaultStyleController {
    constructor(styleElement, selectorSuffix) {
        this.styleElement = styleElement;
        this.selectorSuffix = selectorSuffix;
    }
    style(styles) {
        const suffix = this.selectorSuffix && `.${this.selectorSuffix}`;
        const content = [];
        if (styles.listBackground) {
            content.push(`.monaco-list${suffix} .monaco-list-rows { background: ${styles.listBackground}; }`);
        }
        if (styles.listFocusBackground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused { background-color: ${styles.listFocusBackground}; }`);
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused:hover { background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
        }
        if (styles.listActiveSelectionBackground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected { background-color: ${styles.listActiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected:hover { background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listActiveSelectionForeground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
        }
        if (styles.listActiveSelectionIconForeground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected .codicon { color: ${styles.listActiveSelectionIconForeground}; }`);
        }
        if (styles.listFocusAndSelectionBackground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus .monaco-list-row.selected.focused { background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
        }
        if (styles.listFocusAndSelectionForeground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
        }
        if (styles.listInactiveFocusForeground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused { color:  ${styles.listInactiveFocusForeground}; }`);
            content.push(`.monaco-list${suffix} .monaco-list-row.focused:hover { color:  ${styles.listInactiveFocusForeground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionIconForeground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused .codicon { color:  ${styles.listInactiveSelectionIconForeground}; }`);
        }
        if (styles.listInactiveFocusBackground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused { background-color:  ${styles.listInactiveFocusBackground}; }`);
            content.push(`.monaco-list${suffix} .monaco-list-row.focused:hover { background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionBackground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.selected { background-color:  ${styles.listInactiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix} .monaco-list-row.selected:hover { background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionForeground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
        }
        if (styles.listHoverBackground) {
            content.push(`.monaco-list${suffix}:not(.drop-target):not(.dragging) .monaco-list-row:hover:not(.selected):not(.focused) { background-color: ${styles.listHoverBackground}; }`);
        }
        if (styles.listHoverForeground) {
            content.push(`.monaco-list${suffix}:not(.drop-target):not(.dragging) .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
        }
        /**
         * Outlines
         */
        const focusAndSelectionOutline = asCssValueWithDefault(styles.listFocusAndSelectionOutline, asCssValueWithDefault(styles.listSelectionOutline, styles.listFocusOutline ?? ''));
        if (focusAndSelectionOutline) {
            // default: listFocusOutline
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused.selected { outline: 1px solid ${focusAndSelectionOutline}; outline-offset: -1px;}`);
        }
        if (styles.listFocusOutline) {
            // default: set
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus .monaco-list-row.focused,
				.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
        }
        const inactiveFocusAndSelectionOutline = asCssValueWithDefault(styles.listSelectionOutline, styles.listInactiveFocusOutline ?? '');
        if (inactiveFocusAndSelectionOutline) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused.selected { outline: 1px dotted ${inactiveFocusAndSelectionOutline}; outline-offset: -1px; }`);
        }
        if (styles.listSelectionOutline) {
            // default: activeContrastBorder
            content.push(`.monaco-list${suffix} .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
        }
        if (styles.listInactiveFocusOutline) {
            // default: null
            content.push(`.monaco-list${suffix} .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
        }
        if (styles.listHoverOutline) {
            // default: activeContrastBorder
            content.push(`.monaco-list${suffix} .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
        }
        if (styles.listDropOverBackground) {
            content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} .monaco-list-rows.drop-target,
				.monaco-list${suffix} .monaco-list-row.drop-target { background-color: ${styles.listDropOverBackground} !important; color: inherit !important; }
			`);
        }
        if (styles.listDropBetweenBackground) {
            content.push(`
			.monaco-list${suffix} .monaco-list-rows.drop-target-before .monaco-list-row:first-child::before,
			.monaco-list${suffix} .monaco-list-row.drop-target-before::before {
				content: ""; position: absolute; top: 0px; left: 0px; width: 100%; height: 1px;
				background-color: ${styles.listDropBetweenBackground};
			}`);
            content.push(`
			.monaco-list${suffix} .monaco-list-rows.drop-target-after .monaco-list-row:last-child::after,
			.monaco-list${suffix} .monaco-list-row.drop-target-after::after {
				content: ""; position: absolute; bottom: 0px; left: 0px; width: 100%; height: 1px;
				background-color: ${styles.listDropBetweenBackground};
			}`);
        }
        if (styles.tableColumnsBorder) {
            content.push(`
				.monaco-table > .monaco-split-view2,
				.monaco-table > .monaco-split-view2 .monaco-sash.vertical::before,
				.monaco-workbench:not(.reduce-motion) .monaco-table:hover > .monaco-split-view2,
				.monaco-workbench:not(.reduce-motion) .monaco-table:hover > .monaco-split-view2 .monaco-sash.vertical::before {
					border-color: ${styles.tableColumnsBorder};
				}

				.monaco-workbench:not(.reduce-motion) .monaco-table > .monaco-split-view2,
				.monaco-workbench:not(.reduce-motion) .monaco-table > .monaco-split-view2 .monaco-sash.vertical::before {
					border-color: transparent;
				}
			`);
        }
        if (styles.tableOddRowsBackgroundColor) {
            content.push(`
				.monaco-table .monaco-list-row[data-parity=odd]:not(.focused):not(.selected):not(:hover) .monaco-table-tr,
				.monaco-table .monaco-list:not(:focus) .monaco-list-row[data-parity=odd].focused:not(.selected):not(:hover) .monaco-table-tr,
				.monaco-table .monaco-list:not(.focused) .monaco-list-row[data-parity=odd].focused:not(.selected):not(:hover) .monaco-table-tr {
					background-color: ${styles.tableOddRowsBackgroundColor};
				}
			`);
        }
        this.styleElement.textContent = content.join('\n');
    }
}
export const unthemedListStyles = {
    listFocusBackground: '#7FB0D0',
    listActiveSelectionBackground: '#0E639C',
    listActiveSelectionForeground: '#FFFFFF',
    listActiveSelectionIconForeground: '#FFFFFF',
    listFocusAndSelectionOutline: '#90C2F9',
    listFocusAndSelectionBackground: '#094771',
    listFocusAndSelectionForeground: '#FFFFFF',
    listInactiveSelectionBackground: '#3F3F46',
    listInactiveSelectionIconForeground: '#FFFFFF',
    listHoverBackground: '#2A2D2E',
    listDropOverBackground: '#383B3D',
    listDropBetweenBackground: '#EEEEEE',
    treeIndentGuidesStroke: '#a9a9a9',
    treeInactiveIndentGuidesStroke: Color.fromHex('#a9a9a9').transparent(0.4).toString(),
    tableColumnsBorder: Color.fromHex('#cccccc').transparent(0.2).toString(),
    tableOddRowsBackgroundColor: Color.fromHex('#cccccc').transparent(0.04).toString(),
    listBackground: undefined,
    listFocusForeground: undefined,
    listInactiveSelectionForeground: undefined,
    listInactiveFocusForeground: undefined,
    listInactiveFocusBackground: undefined,
    listHoverForeground: undefined,
    listFocusOutline: undefined,
    listInactiveFocusOutline: undefined,
    listSelectionOutline: undefined,
    listHoverOutline: undefined,
    treeStickyScrollBackground: undefined,
    treeStickyScrollBorder: undefined,
    treeStickyScrollShadow: undefined,
};
const DefaultOptions = {
    keyboardSupport: true,
    mouseSupport: true,
    multipleSelectionSupport: true,
    dnd: {
        getDragURI() {
            return null;
        },
        onDragStart() { },
        onDragOver() {
            return false;
        },
        drop() { },
        dispose() { },
    },
};
// TODO@Joao: move these utils into a SortedArray class
function getContiguousRangeContaining(range, value) {
    const index = range.indexOf(value);
    if (index === -1) {
        return [];
    }
    const result = [];
    let i = index - 1;
    while (i >= 0 && range[i] === value - (index - i)) {
        result.push(range[i--]);
    }
    result.reverse();
    i = index;
    while (i < range.length && range[i] === value + (i - index)) {
        result.push(range[i++]);
    }
    return result;
}
/**
 * Given two sorted collections of numbers, returns the intersection
 * between them (OR).
 */
function disjunction(one, other) {
    const result = [];
    let i = 0, j = 0;
    while (i < one.length || j < other.length) {
        if (i >= one.length) {
            result.push(other[j++]);
        }
        else if (j >= other.length) {
            result.push(one[i++]);
        }
        else if (one[i] === other[j]) {
            result.push(one[i]);
            i++;
            j++;
            continue;
        }
        else if (one[i] < other[j]) {
            result.push(one[i++]);
        }
        else {
            result.push(other[j++]);
        }
    }
    return result;
}
/**
 * Given two sorted collections of numbers, returns the relative
 * complement between them (XOR).
 */
function relativeComplement(one, other) {
    const result = [];
    let i = 0, j = 0;
    while (i < one.length || j < other.length) {
        if (i >= one.length) {
            result.push(other[j++]);
        }
        else if (j >= other.length) {
            result.push(one[i++]);
        }
        else if (one[i] === other[j]) {
            i++;
            j++;
            continue;
        }
        else if (one[i] < other[j]) {
            result.push(one[i++]);
        }
        else {
            j++;
        }
    }
    return result;
}
const numericSort = (a, b) => a - b;
class PipelineRenderer {
    constructor(_templateId, renderers) {
        this._templateId = _templateId;
        this.renderers = renderers;
    }
    get templateId() {
        return this._templateId;
    }
    renderTemplate(container) {
        return this.renderers.map((r) => r.renderTemplate(container));
    }
    renderElement(element, index, templateData, height) {
        let i = 0;
        for (const renderer of this.renderers) {
            renderer.renderElement(element, index, templateData[i++], height);
        }
    }
    disposeElement(element, index, templateData, height) {
        let i = 0;
        for (const renderer of this.renderers) {
            renderer.disposeElement?.(element, index, templateData[i], height);
            i += 1;
        }
    }
    disposeTemplate(templateData) {
        let i = 0;
        for (const renderer of this.renderers) {
            renderer.disposeTemplate(templateData[i++]);
        }
    }
}
class AccessibiltyRenderer {
    constructor(accessibilityProvider) {
        this.accessibilityProvider = accessibilityProvider;
        this.templateId = 'a18n';
    }
    renderTemplate(container) {
        return { container, disposables: new DisposableStore() };
    }
    renderElement(element, index, data) {
        const ariaLabel = this.accessibilityProvider.getAriaLabel(element);
        const observable = ariaLabel && typeof ariaLabel !== 'string' ? ariaLabel : constObservable(ariaLabel);
        data.disposables.add(autorun((reader) => {
            this.setAriaLabel(reader.readObservable(observable), data.container);
        }));
        const ariaLevel = this.accessibilityProvider.getAriaLevel && this.accessibilityProvider.getAriaLevel(element);
        if (typeof ariaLevel === 'number') {
            data.container.setAttribute('aria-level', `${ariaLevel}`);
        }
        else {
            data.container.removeAttribute('aria-level');
        }
    }
    setAriaLabel(ariaLabel, element) {
        if (ariaLabel) {
            element.setAttribute('aria-label', ariaLabel);
        }
        else {
            element.removeAttribute('aria-label');
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.disposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
}
class ListViewDragAndDrop {
    constructor(list, dnd) {
        this.list = list;
        this.dnd = dnd;
    }
    getDragElements(element) {
        const selection = this.list.getSelectedElements();
        const elements = selection.indexOf(element) > -1 ? selection : [element];
        return elements;
    }
    getDragURI(element) {
        return this.dnd.getDragURI(element);
    }
    getDragLabel(elements, originalEvent) {
        if (this.dnd.getDragLabel) {
            return this.dnd.getDragLabel(elements, originalEvent);
        }
        return undefined;
    }
    onDragStart(data, originalEvent) {
        this.dnd.onDragStart?.(data, originalEvent);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return this.dnd.onDragOver(data, targetElement, targetIndex, targetSector, originalEvent);
    }
    onDragLeave(data, targetElement, targetIndex, originalEvent) {
        this.dnd.onDragLeave?.(data, targetElement, targetIndex, originalEvent);
    }
    onDragEnd(originalEvent) {
        this.dnd.onDragEnd?.(originalEvent);
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) {
        this.dnd.drop(data, targetElement, targetIndex, targetSector, originalEvent);
    }
    dispose() {
        this.dnd.dispose();
    }
}
/**
 * The {@link List} is a virtual scrolling widget, built on top of the {@link ListView}
 * widget.
 *
 * Features:
 * - Customizable keyboard and mouse support
 * - Element traits: focus, selection, achor
 * - Accessibility support
 * - Touch support
 * - Performant template-based rendering
 * - Horizontal scrolling
 * - Variable element height support
 * - Dynamic element height support
 * - Drag-and-drop support
 */
export class List {
    get onDidChangeFocus() {
        return Event.map(this.eventBufferer.wrapEvent(this.focus.onChange), (e) => this.toListEvent(e), this.disposables);
    }
    get onDidChangeSelection() {
        return Event.map(this.eventBufferer.wrapEvent(this.selection.onChange), (e) => this.toListEvent(e), this.disposables);
    }
    get domId() {
        return this.view.domId;
    }
    get onDidScroll() {
        return this.view.onDidScroll;
    }
    get onMouseClick() {
        return this.view.onMouseClick;
    }
    get onMouseDblClick() {
        return this.view.onMouseDblClick;
    }
    get onMouseMiddleClick() {
        return this.view.onMouseMiddleClick;
    }
    get onPointer() {
        return this.mouseController.onPointer;
    }
    get onMouseUp() {
        return this.view.onMouseUp;
    }
    get onMouseDown() {
        return this.view.onMouseDown;
    }
    get onMouseOver() {
        return this.view.onMouseOver;
    }
    get onMouseMove() {
        return this.view.onMouseMove;
    }
    get onMouseOut() {
        return this.view.onMouseOut;
    }
    get onTouchStart() {
        return this.view.onTouchStart;
    }
    get onTap() {
        return this.view.onTap;
    }
    /**
     * Possible context menu trigger events:
     * - ContextMenu key
     * - Shift F10
     * - Ctrl Option Shift M (macOS with VoiceOver)
     * - Mouse right click
     */
    get onContextMenu() {
        let didJustPressContextMenuKey = false;
        const fromKeyDown = Event.chain(this.disposables.add(new DomEmitter(this.view.domNode, 'keydown')).event, ($) => $.map((e) => new StandardKeyboardEvent(e))
            .filter((e) => (didJustPressContextMenuKey =
            e.keyCode === 58 /* KeyCode.ContextMenu */ || (e.shiftKey && e.keyCode === 68 /* KeyCode.F10 */)))
            .map((e) => EventHelper.stop(e, true))
            .filter(() => false));
        const fromKeyUp = Event.chain(this.disposables.add(new DomEmitter(this.view.domNode, 'keyup')).event, ($) => $.forEach(() => (didJustPressContextMenuKey = false))
            .map((e) => new StandardKeyboardEvent(e))
            .filter((e) => e.keyCode === 58 /* KeyCode.ContextMenu */ || (e.shiftKey && e.keyCode === 68 /* KeyCode.F10 */))
            .map((e) => EventHelper.stop(e, true))
            .map(({ browserEvent }) => {
            const focus = this.getFocus();
            const index = focus.length ? focus[0] : undefined;
            const element = typeof index !== 'undefined' ? this.view.element(index) : undefined;
            const anchor = typeof index !== 'undefined'
                ? this.view.domElement(index)
                : this.view.domNode;
            return { index, element, anchor, browserEvent };
        }));
        const fromMouse = Event.chain(this.view.onContextMenu, ($) => $.filter((_) => !didJustPressContextMenuKey).map(({ element, index, browserEvent }) => ({
            element,
            index,
            anchor: new StandardMouseEvent(getWindow(this.view.domNode), browserEvent),
            browserEvent,
        })));
        return Event.any(fromKeyDown, fromKeyUp, fromMouse);
    }
    get onKeyDown() {
        return this.disposables.add(new DomEmitter(this.view.domNode, 'keydown')).event;
    }
    get onKeyUp() {
        return this.disposables.add(new DomEmitter(this.view.domNode, 'keyup')).event;
    }
    get onKeyPress() {
        return this.disposables.add(new DomEmitter(this.view.domNode, 'keypress')).event;
    }
    get onDidFocus() {
        return Event.signal(this.disposables.add(new DomEmitter(this.view.domNode, 'focus', true)).event);
    }
    get onDidBlur() {
        return Event.signal(this.disposables.add(new DomEmitter(this.view.domNode, 'blur', true)).event);
    }
    constructor(user, container, virtualDelegate, renderers, _options = DefaultOptions) {
        this.user = user;
        this._options = _options;
        this.focus = new Trait('focused');
        this.anchor = new Trait('anchor');
        this.eventBufferer = new EventBufferer();
        this._ariaLabel = '';
        this.disposables = new DisposableStore();
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        const role = this._options.accessibilityProvider && this._options.accessibilityProvider.getWidgetRole
            ? this._options.accessibilityProvider?.getWidgetRole()
            : 'list';
        this.selection = new SelectionTrait(role !== 'listbox');
        const baseRenderers = [
            this.focus.renderer,
            this.selection.renderer,
        ];
        this.accessibilityProvider = _options.accessibilityProvider;
        if (this.accessibilityProvider) {
            baseRenderers.push(new AccessibiltyRenderer(this.accessibilityProvider));
            this.accessibilityProvider.onDidChangeActiveDescendant?.(this.onDidChangeActiveDescendant, this, this.disposables);
        }
        renderers = renderers.map((r) => new PipelineRenderer(r.templateId, [...baseRenderers, r]));
        const viewOptions = {
            ..._options,
            dnd: _options.dnd && new ListViewDragAndDrop(this, _options.dnd),
        };
        this.view = this.createListView(container, virtualDelegate, renderers, viewOptions);
        this.view.domNode.setAttribute('role', role);
        if (_options.styleController) {
            this.styleController = _options.styleController(this.view.domId);
        }
        else {
            const styleElement = createStyleSheet(this.view.domNode);
            this.styleController = new DefaultStyleController(styleElement, this.view.domId);
        }
        this.spliceable = new CombinedSpliceable([
            new TraitSpliceable(this.focus, this.view, _options.identityProvider),
            new TraitSpliceable(this.selection, this.view, _options.identityProvider),
            new TraitSpliceable(this.anchor, this.view, _options.identityProvider),
            this.view,
        ]);
        this.disposables.add(this.focus);
        this.disposables.add(this.selection);
        this.disposables.add(this.anchor);
        this.disposables.add(this.view);
        this.disposables.add(this._onDidDispose);
        this.disposables.add(new DOMFocusController(this, this.view));
        if (typeof _options.keyboardSupport !== 'boolean' || _options.keyboardSupport) {
            this.keyboardController = new KeyboardController(this, this.view, _options);
            this.disposables.add(this.keyboardController);
        }
        if (_options.keyboardNavigationLabelProvider) {
            const delegate = _options.keyboardNavigationDelegate || DefaultKeyboardNavigationDelegate;
            this.typeNavigationController = new TypeNavigationController(this, this.view, _options.keyboardNavigationLabelProvider, _options.keyboardNavigationEventFilter ?? (() => true), delegate);
            this.disposables.add(this.typeNavigationController);
        }
        this.mouseController = this.createMouseController(_options);
        this.disposables.add(this.mouseController);
        this.onDidChangeFocus(this._onFocusChange, this, this.disposables);
        this.onDidChangeSelection(this._onSelectionChange, this, this.disposables);
        if (this.accessibilityProvider) {
            this.ariaLabel = this.accessibilityProvider.getWidgetAriaLabel();
        }
        if (this._options.multipleSelectionSupport !== false) {
            this.view.domNode.setAttribute('aria-multiselectable', 'true');
        }
    }
    createListView(container, virtualDelegate, renderers, viewOptions) {
        return new ListView(container, virtualDelegate, renderers, viewOptions);
    }
    createMouseController(options) {
        return new MouseController(this);
    }
    updateOptions(optionsUpdate = {}) {
        this._options = { ...this._options, ...optionsUpdate };
        this.typeNavigationController?.updateOptions(this._options);
        if (this._options.multipleSelectionController !== undefined) {
            if (this._options.multipleSelectionSupport) {
                this.view.domNode.setAttribute('aria-multiselectable', 'true');
            }
            else {
                this.view.domNode.removeAttribute('aria-multiselectable');
            }
        }
        this.mouseController.updateOptions(optionsUpdate);
        this.keyboardController?.updateOptions(optionsUpdate);
        this.view.updateOptions(optionsUpdate);
    }
    get options() {
        return this._options;
    }
    splice(start, deleteCount, elements = []) {
        if (start < 0 || start > this.view.length) {
            throw new ListError(this.user, `Invalid start index: ${start}`);
        }
        if (deleteCount < 0) {
            throw new ListError(this.user, `Invalid delete count: ${deleteCount}`);
        }
        if (deleteCount === 0 && elements.length === 0) {
            return;
        }
        this.eventBufferer.bufferEvents(() => this.spliceable.splice(start, deleteCount, elements));
    }
    updateWidth(index) {
        this.view.updateWidth(index);
    }
    updateElementHeight(index, size) {
        this.view.updateElementHeight(index, size, null);
    }
    rerender() {
        this.view.rerender();
    }
    element(index) {
        return this.view.element(index);
    }
    indexOf(element) {
        return this.view.indexOf(element);
    }
    indexAt(position) {
        return this.view.indexAt(position);
    }
    get length() {
        return this.view.length;
    }
    get contentHeight() {
        return this.view.contentHeight;
    }
    get contentWidth() {
        return this.view.contentWidth;
    }
    get onDidChangeContentHeight() {
        return this.view.onDidChangeContentHeight;
    }
    get onDidChangeContentWidth() {
        return this.view.onDidChangeContentWidth;
    }
    get scrollTop() {
        return this.view.getScrollTop();
    }
    set scrollTop(scrollTop) {
        this.view.setScrollTop(scrollTop);
    }
    get scrollLeft() {
        return this.view.getScrollLeft();
    }
    set scrollLeft(scrollLeft) {
        this.view.setScrollLeft(scrollLeft);
    }
    get scrollHeight() {
        return this.view.scrollHeight;
    }
    get renderHeight() {
        return this.view.renderHeight;
    }
    get firstVisibleIndex() {
        return this.view.firstVisibleIndex;
    }
    get firstMostlyVisibleIndex() {
        return this.view.firstMostlyVisibleIndex;
    }
    get lastVisibleIndex() {
        return this.view.lastVisibleIndex;
    }
    get ariaLabel() {
        return this._ariaLabel;
    }
    set ariaLabel(value) {
        this._ariaLabel = value;
        this.view.domNode.setAttribute('aria-label', value);
    }
    domFocus() {
        this.view.domNode.focus({ preventScroll: true });
    }
    layout(height, width) {
        this.view.layout(height, width);
    }
    triggerTypeNavigation() {
        this.typeNavigationController?.trigger();
    }
    setSelection(indexes, browserEvent) {
        for (const index of indexes) {
            if (index < 0 || index >= this.length) {
                throw new ListError(this.user, `Invalid index ${index}`);
            }
        }
        this.selection.set(indexes, browserEvent);
    }
    getSelection() {
        return this.selection.get();
    }
    getSelectedElements() {
        return this.getSelection().map((i) => this.view.element(i));
    }
    setAnchor(index) {
        if (typeof index === 'undefined') {
            this.anchor.set([]);
            return;
        }
        if (index < 0 || index >= this.length) {
            throw new ListError(this.user, `Invalid index ${index}`);
        }
        this.anchor.set([index]);
    }
    getAnchor() {
        return this.anchor.get().at(0);
    }
    getAnchorElement() {
        const anchor = this.getAnchor();
        return typeof anchor === 'undefined' ? undefined : this.element(anchor);
    }
    setFocus(indexes, browserEvent) {
        for (const index of indexes) {
            if (index < 0 || index >= this.length) {
                throw new ListError(this.user, `Invalid index ${index}`);
            }
        }
        this.focus.set(indexes, browserEvent);
    }
    focusNext(n = 1, loop = false, browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const focus = this.focus.get();
        const index = this.findNextIndex(focus.length > 0 ? focus[0] + n : 0, loop, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    focusPrevious(n = 1, loop = false, browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const focus = this.focus.get();
        const index = this.findPreviousIndex(focus.length > 0 ? focus[0] - n : 0, loop, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    async focusNextPage(browserEvent, filter) {
        let lastPageIndex = this.view.indexAt(this.view.getScrollTop() + this.view.renderHeight);
        lastPageIndex = lastPageIndex === 0 ? 0 : lastPageIndex - 1;
        const currentlyFocusedElementIndex = this.getFocus()[0];
        if (currentlyFocusedElementIndex !== lastPageIndex &&
            (currentlyFocusedElementIndex === undefined || lastPageIndex > currentlyFocusedElementIndex)) {
            const lastGoodPageIndex = this.findPreviousIndex(lastPageIndex, false, filter);
            if (lastGoodPageIndex > -1 && currentlyFocusedElementIndex !== lastGoodPageIndex) {
                this.setFocus([lastGoodPageIndex], browserEvent);
            }
            else {
                this.setFocus([lastPageIndex], browserEvent);
            }
        }
        else {
            const previousScrollTop = this.view.getScrollTop();
            let nextpageScrollTop = previousScrollTop + this.view.renderHeight;
            if (lastPageIndex > currentlyFocusedElementIndex) {
                // scroll last page element to the top only if the last page element is below the focused element
                nextpageScrollTop -= this.view.elementHeight(lastPageIndex);
            }
            this.view.setScrollTop(nextpageScrollTop);
            if (this.view.getScrollTop() !== previousScrollTop) {
                this.setFocus([]);
                // Let the scroll event listener run
                await timeout(0);
                await this.focusNextPage(browserEvent, filter);
            }
        }
    }
    async focusPreviousPage(browserEvent, filter, getPaddingTop = () => 0) {
        let firstPageIndex;
        const paddingTop = getPaddingTop();
        const scrollTop = this.view.getScrollTop() + paddingTop;
        if (scrollTop === 0) {
            firstPageIndex = this.view.indexAt(scrollTop);
        }
        else {
            firstPageIndex = this.view.indexAfter(scrollTop - 1);
        }
        const currentlyFocusedElementIndex = this.getFocus()[0];
        if (currentlyFocusedElementIndex !== firstPageIndex &&
            (currentlyFocusedElementIndex === undefined || currentlyFocusedElementIndex >= firstPageIndex)) {
            const firstGoodPageIndex = this.findNextIndex(firstPageIndex, false, filter);
            if (firstGoodPageIndex > -1 && currentlyFocusedElementIndex !== firstGoodPageIndex) {
                this.setFocus([firstGoodPageIndex], browserEvent);
            }
            else {
                this.setFocus([firstPageIndex], browserEvent);
            }
        }
        else {
            const previousScrollTop = scrollTop;
            this.view.setScrollTop(scrollTop - this.view.renderHeight - paddingTop);
            if (this.view.getScrollTop() + getPaddingTop() !== previousScrollTop) {
                this.setFocus([]);
                // Let the scroll event listener run
                await timeout(0);
                await this.focusPreviousPage(browserEvent, filter, getPaddingTop);
            }
        }
    }
    focusLast(browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const index = this.findPreviousIndex(this.length - 1, false, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    focusFirst(browserEvent, filter) {
        this.focusNth(0, browserEvent, filter);
    }
    focusNth(n, browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const index = this.findNextIndex(n, false, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    findNextIndex(index, loop = false, filter) {
        for (let i = 0; i < this.length; i++) {
            if (index >= this.length && !loop) {
                return -1;
            }
            index = index % this.length;
            if (!filter || filter(this.element(index))) {
                return index;
            }
            index++;
        }
        return -1;
    }
    findPreviousIndex(index, loop = false, filter) {
        for (let i = 0; i < this.length; i++) {
            if (index < 0 && !loop) {
                return -1;
            }
            index = (this.length + (index % this.length)) % this.length;
            if (!filter || filter(this.element(index))) {
                return index;
            }
            index--;
        }
        return -1;
    }
    getFocus() {
        return this.focus.get();
    }
    getFocusedElements() {
        return this.getFocus().map((i) => this.view.element(i));
    }
    reveal(index, relativeTop, paddingTop = 0) {
        if (index < 0 || index >= this.length) {
            throw new ListError(this.user, `Invalid index ${index}`);
        }
        const scrollTop = this.view.getScrollTop();
        const elementTop = this.view.elementTop(index);
        const elementHeight = this.view.elementHeight(index);
        if (isNumber(relativeTop)) {
            // y = mx + b
            const m = elementHeight - this.view.renderHeight + paddingTop;
            this.view.setScrollTop(m * clamp(relativeTop, 0, 1) + elementTop - paddingTop);
        }
        else {
            const viewItemBottom = elementTop + elementHeight;
            const scrollBottom = scrollTop + this.view.renderHeight;
            if (elementTop < scrollTop + paddingTop && viewItemBottom >= scrollBottom) {
                // The element is already overflowing the viewport, no-op
            }
            else if (elementTop < scrollTop + paddingTop ||
                (viewItemBottom >= scrollBottom && elementHeight >= this.view.renderHeight)) {
                this.view.setScrollTop(elementTop - paddingTop);
            }
            else if (viewItemBottom >= scrollBottom) {
                this.view.setScrollTop(viewItemBottom - this.view.renderHeight);
            }
        }
    }
    /**
     * Returns the relative position of an element rendered in the list.
     * Returns `null` if the element isn't *entirely* in the visible viewport.
     */
    getRelativeTop(index, paddingTop = 0) {
        if (index < 0 || index >= this.length) {
            throw new ListError(this.user, `Invalid index ${index}`);
        }
        const scrollTop = this.view.getScrollTop();
        const elementTop = this.view.elementTop(index);
        const elementHeight = this.view.elementHeight(index);
        if (elementTop < scrollTop + paddingTop ||
            elementTop + elementHeight > scrollTop + this.view.renderHeight) {
            return null;
        }
        // y = mx + b
        const m = elementHeight - this.view.renderHeight + paddingTop;
        return Math.abs((scrollTop + paddingTop - elementTop) / m);
    }
    isDOMFocused() {
        return isActiveElement(this.view.domNode);
    }
    getHTMLElement() {
        return this.view.domNode;
    }
    getScrollableElement() {
        return this.view.scrollableElementDomNode;
    }
    getElementID(index) {
        return this.view.getElementDomId(index);
    }
    getElementTop(index) {
        return this.view.elementTop(index);
    }
    style(styles) {
        this.styleController.style(styles);
    }
    toListEvent({ indexes, browserEvent }) {
        return { indexes, elements: indexes.map((i) => this.view.element(i)), browserEvent };
    }
    _onFocusChange() {
        const focus = this.focus.get();
        this.view.domNode.classList.toggle('element-focused', focus.length > 0);
        this.onDidChangeActiveDescendant();
    }
    onDidChangeActiveDescendant() {
        const focus = this.focus.get();
        if (focus.length > 0) {
            let id;
            if (this.accessibilityProvider?.getActiveDescendantId) {
                id = this.accessibilityProvider.getActiveDescendantId(this.view.element(focus[0]));
            }
            this.view.domNode.setAttribute('aria-activedescendant', id || this.view.getElementDomId(focus[0]));
        }
        else {
            this.view.domNode.removeAttribute('aria-activedescendant');
        }
    }
    _onSelectionChange() {
        const selection = this.selection.get();
        this.view.domNode.classList.toggle('selection-none', selection.length === 0);
        this.view.domNode.classList.toggle('selection-single', selection.length === 1);
        this.view.domNode.classList.toggle('selection-multiple', selection.length > 1);
    }
    dispose() {
        this._onDidDispose.fire();
        this.disposables.dispose();
        this._onDidDispose.dispose();
    }
}
__decorate([
    memoize
], List.prototype, "onDidChangeFocus", null);
__decorate([
    memoize
], List.prototype, "onDidChangeSelection", null);
__decorate([
    memoize
], List.prototype, "onContextMenu", null);
__decorate([
    memoize
], List.prototype, "onKeyDown", null);
__decorate([
    memoize
], List.prototype, "onKeyUp", null);
__decorate([
    memoize
], List.prototype, "onKeyPress", null);
__decorate([
    memoize
], List.prototype, "onDidFocus", null);
__decorate([
    memoize
], List.prototype, "onDidBlur", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9saXN0L2xpc3RXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFHaEcsT0FBTyxFQUVOLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULGVBQWUsRUFDZixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLFlBQVksR0FDWixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDM0MsT0FBTyxFQUFrQixxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsS0FBSyxFQUFZLE1BQU0saUJBQWlCLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRWhELE9BQU8sRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIs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