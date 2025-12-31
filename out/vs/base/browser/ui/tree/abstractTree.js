/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, append, clearNode, h, hasParentWithClass, isActiveElement, isKeyboardEvent, addDisposableListener, isEditableElement, } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { asCssValueWithDefault } from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { FindInput } from '../findinput/findInput.js';
import { unthemedInboxStyles, } from '../inputbox/inputBox.js';
import { ElementsDragAndDropData } from '../list/listView.js';
import { isActionItem, isButton, isMonacoCustomToggle, isMonacoEditor, isStickyScrollContainer, isStickyScrollElement, List, MouseController, } from '../list/listWidget.js';
import { Toggle, unthemedToggleStyles } from '../toggle/toggle.js';
import { getVisibleState, isFilterResult } from './indexTreeModel.js';
import { TreeError, TreeMouseEventTarget, } from './tree.js';
import { Action } from '../../../common/actions.js';
import { distinct, equals, insertInto, range } from '../../../common/arrays.js';
import { Delayer, disposableTimeout, timeout } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { SetMap } from '../../../common/map.js';
import { Emitter, Event, EventBufferer, Relay } from '../../../common/event.js';
import { fuzzyScore, FuzzyScore } from '../../../common/filters.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../common/lifecycle.js';
import { clamp } from '../../../common/numbers.js';
import './media/tree.css';
import { localize } from '../../../../nls.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { autorun, constObservable } from '../../../common/observable.js';
import { alert } from '../aria/aria.js';
class TreeElementsDragAndDropData extends ElementsDragAndDropData {
    set context(context) {
        this.data.context = context;
    }
    get context() {
        return this.data.context;
    }
    constructor(data) {
        super(data.elements.map((node) => node.element));
        this.data = data;
    }
}
function asTreeDragAndDropData(data) {
    if (data instanceof ElementsDragAndDropData) {
        return new TreeElementsDragAndDropData(data);
    }
    return data;
}
class TreeNodeListDragAndDrop {
    constructor(modelProvider, dnd) {
        this.modelProvider = modelProvider;
        this.dnd = dnd;
        this.autoExpandDisposable = Disposable.None;
        this.disposables = new DisposableStore();
    }
    getDragURI(node) {
        return this.dnd.getDragURI(node.element);
    }
    getDragLabel(nodes, originalEvent) {
        if (this.dnd.getDragLabel) {
            return this.dnd.getDragLabel(nodes.map((node) => node.element), originalEvent);
        }
        return undefined;
    }
    onDragStart(data, originalEvent) {
        this.dnd.onDragStart?.(asTreeDragAndDropData(data), originalEvent);
    }
    onDragOver(data, targetNode, targetIndex, targetSector, originalEvent, raw = true) {
        const result = this.dnd.onDragOver(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
        const didChangeAutoExpandNode = this.autoExpandNode !== targetNode;
        if (didChangeAutoExpandNode) {
            this.autoExpandDisposable.dispose();
            this.autoExpandNode = targetNode;
        }
        if (typeof targetNode === 'undefined') {
            return result;
        }
        if (didChangeAutoExpandNode && typeof result !== 'boolean' && result.autoExpand) {
            this.autoExpandDisposable = disposableTimeout(() => {
                const model = this.modelProvider();
                const ref = model.getNodeLocation(targetNode);
                if (model.isCollapsed(ref)) {
                    model.setCollapsed(ref, false);
                }
                this.autoExpandNode = undefined;
            }, 500, this.disposables);
        }
        if (typeof result === 'boolean' ||
            !result.accept ||
            typeof result.bubble === 'undefined' ||
            result.feedback) {
            if (!raw) {
                const accept = typeof result === 'boolean' ? result : result.accept;
                const effect = typeof result === 'boolean' ? undefined : result.effect;
                return { accept, effect, feedback: [targetIndex] };
            }
            return result;
        }
        if (result.bubble === 1 /* TreeDragOverBubble.Up */) {
            const model = this.modelProvider();
            const ref = model.getNodeLocation(targetNode);
            const parentRef = model.getParentNodeLocation(ref);
            const parentNode = model.getNode(parentRef);
            const parentIndex = parentRef && model.getListIndex(parentRef);
            return this.onDragOver(data, parentNode, parentIndex, targetSector, originalEvent, false);
        }
        const model = this.modelProvider();
        const ref = model.getNodeLocation(targetNode);
        const start = model.getListIndex(ref);
        const length = model.getListRenderCount(ref);
        return { ...result, feedback: range(start, start + length) };
    }
    drop(data, targetNode, targetIndex, targetSector, originalEvent) {
        this.autoExpandDisposable.dispose();
        this.autoExpandNode = undefined;
        this.dnd.drop(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
    }
    onDragEnd(originalEvent) {
        this.dnd.onDragEnd?.(originalEvent);
    }
    dispose() {
        this.disposables.dispose();
        this.dnd.dispose();
    }
}
function asListOptions(modelProvider, disposableStore, options) {
    return (options && {
        ...options,
        identityProvider: options.identityProvider && {
            getId(el) {
                return options.identityProvider.getId(el.element);
            },
        },
        dnd: options.dnd && disposableStore.add(new TreeNodeListDragAndDrop(modelProvider, options.dnd)),
        multipleSelectionController: options.multipleSelectionController && {
            isSelectionSingleChangeEvent(e) {
                return options.multipleSelectionController.isSelectionSingleChangeEvent({
                    ...e,
                    element: e.element,
                });
            },
            isSelectionRangeChangeEvent(e) {
                return options.multipleSelectionController.isSelectionRangeChangeEvent({
                    ...e,
                    element: e.element,
                });
            },
        },
        accessibilityProvider: options.accessibilityProvider && {
            ...options.accessibilityProvider,
            getSetSize(node) {
                const model = modelProvider();
                const ref = model.getNodeLocation(node);
                const parentRef = model.getParentNodeLocation(ref);
                const parentNode = model.getNode(parentRef);
                return parentNode.visibleChildrenCount;
            },
            getPosInSet(node) {
                return node.visibleChildIndex + 1;
            },
            isChecked: options.accessibilityProvider && options.accessibilityProvider.isChecked
                ? (node) => {
                    return options.accessibilityProvider.isChecked(node.element);
                }
                : undefined,
            getRole: options.accessibilityProvider && options.accessibilityProvider.getRole
                ? (node) => {
                    return options.accessibilityProvider.getRole(node.element);
                }
                : () => 'treeitem',
            getAriaLabel(e) {
                return options.accessibilityProvider.getAriaLabel(e.element);
            },
            getWidgetAriaLabel() {
                return options.accessibilityProvider.getWidgetAriaLabel();
            },
            getWidgetRole: options.accessibilityProvider && options.accessibilityProvider.getWidgetRole
                ? () => options.accessibilityProvider.getWidgetRole()
                : () => 'tree',
            getAriaLevel: options.accessibilityProvider && options.accessibilityProvider.getAriaLevel
                ? (node) => options.accessibilityProvider.getAriaLevel(node.element)
                : (node) => {
                    return node.depth;
                },
            getActiveDescendantId: options.accessibilityProvider.getActiveDescendantId &&
                ((node) => {
                    return options.accessibilityProvider.getActiveDescendantId(node.element);
                }),
        },
        keyboardNavigationLabelProvider: options.keyboardNavigationLabelProvider && {
            ...options.keyboardNavigationLabelProvider,
            getKeyboardNavigationLabel(node) {
                return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(node.element);
            },
        },
    });
}
export class ComposedTreeDelegate {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getHeight(element) {
        return this.delegate.getHeight(element.element);
    }
    getTemplateId(element) {
        return this.delegate.getTemplateId(element.element);
    }
    hasDynamicHeight(element) {
        return !!this.delegate.hasDynamicHeight && this.delegate.hasDynamicHeight(element.element);
    }
    setDynamicHeight(element, height) {
        this.delegate.setDynamicHeight?.(element.element, height);
    }
}
export class AbstractTreeViewState {
    static lift(state) {
        return state instanceof AbstractTreeViewState ? state : new AbstractTreeViewState(state);
    }
    static empty(scrollTop = 0) {
        return new AbstractTreeViewState({
            focus: [],
            selection: [],
            expanded: Object.create(null),
            scrollTop,
        });
    }
    constructor(state) {
        this.focus = new Set(state.focus);
        this.selection = new Set(state.selection);
        if (state.expanded instanceof Array) {
            // old format
            this.expanded = Object.create(null);
            for (const id of state.expanded) {
                this.expanded[id] = 1;
            }
        }
        else {
            this.expanded = state.expanded;
        }
        this.expanded = state.expanded;
        this.scrollTop = state.scrollTop;
    }
    toJSON() {
        return {
            focus: Array.from(this.focus),
            selection: Array.from(this.selection),
            expanded: this.expanded,
            scrollTop: this.scrollTop,
        };
    }
}
export var RenderIndentGuides;
(function (RenderIndentGuides) {
    RenderIndentGuides["None"] = "none";
    RenderIndentGuides["OnHover"] = "onHover";
    RenderIndentGuides["Always"] = "always";
})(RenderIndentGuides || (RenderIndentGuides = {}));
class EventCollection {
    get elements() {
        return this._elements;
    }
    constructor(onDidChange, _elements = []) {
        this._elements = _elements;
        this.disposables = new DisposableStore();
        this.onDidChange = Event.forEach(onDidChange, (elements) => (this._elements = elements), this.disposables);
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class TreeRenderer {
    static { this.DefaultIndent = 8; }
    constructor(renderer, model, onDidChangeCollapseState, activeNodes, renderedIndentGuides, options = {}) {
        this.renderer = renderer;
        this.model = model;
        this.activeNodes = activeNodes;
        this.renderedIndentGuides = renderedIndentGuides;
        this.renderedElements = new Map();
        this.renderedNodes = new Map();
        this.indent = TreeRenderer.DefaultIndent;
        this.hideTwistiesOfChildlessElements = false;
        this.shouldRenderIndentGuides = false;
        this.activeIndentNodes = new Set();
        this.indentGuidesDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this.templateId = renderer.templateId;
        this.updateOptions(options);
        Event.map(onDidChangeCollapseState, (e) => e.node)(this.onDidChangeNodeTwistieState, this, this.disposables);
        renderer.onDidChangeTwistieState?.(this.onDidChangeTwistieState, this, this.disposables);
    }
    updateOptions(options = {}) {
        if (typeof options.indent !== 'undefined') {
            const indent = clamp(options.indent, 0, 40);
            if (indent !== this.indent) {
                this.indent = indent;
                for (const [node, templateData] of this.renderedNodes) {
                    this.renderTreeElement(node, templateData);
                }
            }
        }
        if (typeof options.renderIndentGuides !== 'undefined') {
            const shouldRenderIndentGuides = options.renderIndentGuides !== RenderIndentGuides.None;
            if (shouldRenderIndentGuides !== this.shouldRenderIndentGuides) {
                this.shouldRenderIndentGuides = shouldRenderIndentGuides;
                for (const [node, templateData] of this.renderedNodes) {
                    this._renderIndentGuides(node, templateData);
                }
                this.indentGuidesDisposable.dispose();
                if (shouldRenderIndentGuides) {
                    const disposables = new DisposableStore();
                    this.activeNodes.onDidChange(this._onDidChangeActiveNodes, this, disposables);
                    this.indentGuidesDisposable = disposables;
                    this._onDidChangeActiveNodes(this.activeNodes.elements);
                }
            }
        }
        if (typeof options.hideTwistiesOfChildlessElements !== 'undefined') {
            this.hideTwistiesOfChildlessElements = options.hideTwistiesOfChildlessElements;
        }
    }
    renderTemplate(container) {
        const el = append(container, $('.monaco-tl-row'));
        const indent = append(el, $('.monaco-tl-indent'));
        const twistie = append(el, $('.monaco-tl-twistie'));
        const contents = append(el, $('.monaco-tl-contents'));
        const templateData = this.renderer.renderTemplate(contents);
        return { container, indent, twistie, indentGuidesDisposable: Disposable.None, templateData };
    }
    renderElement(node, index, templateData, height) {
        this.renderedNodes.set(node, templateData);
        this.renderedElements.set(node.element, node);
        this.renderTreeElement(node, templateData);
        this.renderer.renderElement(node, index, templateData.templateData, height);
    }
    disposeElement(node, index, templateData, height) {
        templateData.indentGuidesDisposable.dispose();
        this.renderer.disposeElement?.(node, index, templateData.templateData, height);
        if (typeof height === 'number') {
            this.renderedNodes.delete(node);
            this.renderedElements.delete(node.element);
        }
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.templateData);
    }
    onDidChangeTwistieState(element) {
        const node = this.renderedElements.get(element);
        if (!node) {
            return;
        }
        this.onDidChangeNodeTwistieState(node);
    }
    onDidChangeNodeTwistieState(node) {
        const templateData = this.renderedNodes.get(node);
        if (!templateData) {
            return;
        }
        this._onDidChangeActiveNodes(this.activeNodes.elements);
        this.renderTreeElement(node, templateData);
    }
    renderTreeElement(node, templateData) {
        const indent = TreeRenderer.DefaultIndent + (node.depth - 1) * this.indent;
        templateData.twistie.style.paddingLeft = `${indent}px`;
        templateData.indent.style.width = `${indent + this.indent - 16}px`;
        if (node.collapsible) {
            templateData.container.setAttribute('aria-expanded', String(!node.collapsed));
        }
        else {
            templateData.container.removeAttribute('aria-expanded');
        }
        templateData.twistie.classList.remove(...ThemeIcon.asClassNameArray(Codicon.treeItemExpanded));
        let twistieRendered = false;
        if (this.renderer.renderTwistie) {
            twistieRendered = this.renderer.renderTwistie(node.element, templateData.twistie);
        }
        if (node.collapsible &&
            (!this.hideTwistiesOfChildlessElements || node.visibleChildrenCount > 0)) {
            if (!twistieRendered) {
                templateData.twistie.classList.add(...ThemeIcon.asClassNameArray(Codicon.treeItemExpanded));
            }
            templateData.twistie.classList.add('collapsible');
            templateData.twistie.classList.toggle('collapsed', node.collapsed);
        }
        else {
            templateData.twistie.classList.remove('collapsible', 'collapsed');
        }
        this._renderIndentGuides(node, templateData);
    }
    _renderIndentGuides(node, templateData) {
        clearNode(templateData.indent);
        templateData.indentGuidesDisposable.dispose();
        if (!this.shouldRenderIndentGuides) {
            return;
        }
        const disposableStore = new DisposableStore();
        while (true) {
            const ref = this.model.getNodeLocation(node);
            const parentRef = this.model.getParentNodeLocation(ref);
            if (!parentRef) {
                break;
            }
            const parent = this.model.getNode(parentRef);
            const guide = $('.indent-guide', { style: `width: ${this.indent}px` });
            if (this.activeIndentNodes.has(parent)) {
                guide.classList.add('active');
            }
            if (templateData.indent.childElementCount === 0) {
                templateData.indent.appendChild(guide);
            }
            else {
                templateData.indent.insertBefore(guide, templateData.indent.firstElementChild);
            }
            this.renderedIndentGuides.add(parent, guide);
            disposableStore.add(toDisposable(() => this.renderedIndentGuides.delete(parent, guide)));
            node = parent;
        }
        templateData.indentGuidesDisposable = disposableStore;
    }
    _onDidChangeActiveNodes(nodes) {
        if (!this.shouldRenderIndentGuides) {
            return;
        }
        const set = new Set();
        nodes.forEach((node) => {
            const ref = this.model.getNodeLocation(node);
            try {
                const parentRef = this.model.getParentNodeLocation(ref);
                if (node.collapsible && node.children.length > 0 && !node.collapsed) {
                    set.add(node);
                }
                else if (parentRef) {
                    set.add(this.model.getNode(parentRef));
                }
            }
            catch {
                // noop
            }
        });
        this.activeIndentNodes.forEach((node) => {
            if (!set.has(node)) {
                this.renderedIndentGuides.forEach(node, (line) => line.classList.remove('active'));
            }
        });
        set.forEach((node) => {
            if (!this.activeIndentNodes.has(node)) {
                this.renderedIndentGuides.forEach(node, (line) => line.classList.add('active'));
            }
        });
        this.activeIndentNodes = set;
    }
    dispose() {
        this.renderedNodes.clear();
        this.renderedElements.clear();
        this.indentGuidesDisposable.dispose();
        dispose(this.disposables);
    }
}
export function contiguousFuzzyScore(patternLower, wordLower) {
    const index = wordLower.toLowerCase().indexOf(patternLower);
    let score;
    if (index > -1) {
        score = [Number.MAX_SAFE_INTEGER, 0];
        for (let i = patternLower.length; i > 0; i--) {
            score.push(index + i - 1);
        }
    }
    return score;
}
export class FindFilter {
    get totalCount() {
        return this._totalCount;
    }
    get matchCount() {
        return this._matchCount;
    }
    set findMatchType(type) {
        this._findMatchType = type;
    }
    get findMatchType() {
        return this._findMatchType;
    }
    set findMode(mode) {
        this._findMode = mode;
    }
    get findMode() {
        return this._findMode;
    }
    set pattern(pattern) {
        this._pattern = pattern;
        this._lowercasePattern = pattern.toLowerCase();
    }
    constructor(_keyboardNavigationLabelProvider, _filter, _defaultFindVisibility) {
        this._keyboardNavigationLabelProvider = _keyboardNavigationLabelProvider;
        this._filter = _filter;
        this._defaultFindVisibility = _defaultFindVisibility;
        this._totalCount = 0;
        this._matchCount = 0;
        this._findMatchType = TreeFindMatchType.Fuzzy;
        this._findMode = TreeFindMode.Highlight;
        this._pattern = '';
        this._lowercasePattern = '';
        this.disposables = new DisposableStore();
    }
    filter(element, parentVisibility) {
        let visibility = 1 /* TreeVisibility.Visible */;
        if (this._filter) {
            const result = this._filter.filter(element, parentVisibility);
            if (typeof result === 'boolean') {
                visibility = result ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
            }
            else if (isFilterResult(result)) {
                visibility = getVisibleState(result.visibility);
            }
            else {
                visibility = result;
            }
            if (visibility === 0 /* TreeVisibility.Hidden */) {
                return false;
            }
        }
        this._totalCount++;
        if (!this._pattern) {
            this._matchCount++;
            return { data: FuzzyScore.Default, visibility };
        }
        const label = this._keyboardNavigationLabelProvider.getKeyboardNavigationLabel(element);
        const labels = Array.isArray(label) ? label : [label];
        for (const l of labels) {
            const labelStr = l && l.toString();
            if (typeof labelStr === 'undefined') {
                return { data: FuzzyScore.Default, visibility };
            }
            let score;
            if (this._findMatchType === TreeFindMatchType.Contiguous) {
                score = contiguousFuzzyScore(this._lowercasePattern, labelStr.toLowerCase());
            }
            else {
                score = fuzzyScore(this._pattern, this._lowercasePattern, 0, labelStr, labelStr.toLowerCase(), 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
            }
            if (score) {
                this._matchCount++;
                return labels.length === 1
                    ? { data: score, visibility }
                    : { data: { label: labelStr, score: score }, visibility };
            }
        }
        if (this._findMode === TreeFindMode.Filter) {
            if (typeof this._defaultFindVisibility === 'number') {
                return this._defaultFindVisibility;
            }
            else if (this._defaultFindVisibility) {
                return this._defaultFindVisibility(element);
            }
            else {
                return 2 /* TreeVisibility.Recurse */;
            }
        }
        else {
            return { data: FuzzyScore.Default, visibility };
        }
    }
    reset() {
        this._totalCount = 0;
        this._matchCount = 0;
    }
    dispose() {
        dispose(this.disposables);
    }
}
class TreeFindToggle extends Toggle {
    constructor(contribution, opts, hoverDelegate) {
        super({
            icon: contribution.icon,
            title: contribution.title,
            isChecked: contribution.isChecked,
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground,
            hoverDelegate,
        });
        this.id = contribution.id;
    }
}
export class FindToggles {
    constructor(startStates) {
        this.stateMap = new Map(startStates.map((state) => [state.id, { ...state }]));
    }
    states() {
        return Array.from(this.stateMap.values());
    }
    get(id) {
        const state = this.stateMap.get(id);
        if (state === undefined) {
            throw new Error(`No state found for toggle id ${id}`);
        }
        return state.isChecked;
    }
    set(id, value) {
        const state = this.stateMap.get(id);
        if (state === undefined) {
            throw new Error(`No state found for toggle id ${id}`);
        }
        if (state.isChecked === value) {
            return false;
        }
        state.isChecked = value;
        return true;
    }
}
const unthemedFindWidgetStyles = {
    inputBoxStyles: unthemedInboxStyles,
    toggleStyles: unthemedToggleStyles,
    listFilterWidgetBackground: undefined,
    listFilterWidgetNoMatchesOutline: undefined,
    listFilterWidgetOutline: undefined,
    listFilterWidgetShadow: undefined,
};
export var TreeFindMode;
(function (TreeFindMode) {
    TreeFindMode[TreeFindMode["Highlight"] = 0] = "Highlight";
    TreeFindMode[TreeFindMode["Filter"] = 1] = "Filter";
})(TreeFindMode || (TreeFindMode = {}));
export var TreeFindMatchType;
(function (TreeFindMatchType) {
    TreeFindMatchType[TreeFindMatchType["Fuzzy"] = 0] = "Fuzzy";
    TreeFindMatchType[TreeFindMatchType["Contiguous"] = 1] = "Contiguous";
})(TreeFindMatchType || (TreeFindMatchType = {}));
class FindWidget extends Disposable {
    get value() {
        return this.findInput.inputBox.value;
    }
    set value(value) {
        this.findInput.inputBox.value = value;
    }
    constructor(container, tree, contextViewProvider, placeholder, toggleContributions = [], options) {
        super();
        this.tree = tree;
        this.elements = h('.monaco-tree-type-filter', [
            h('.monaco-tree-type-filter-input@findInput'),
            h('.monaco-tree-type-filter-actionbar@actionbar'),
        ]);
        this.toggles = [];
        this._onDidDisable = new Emitter();
        this.onDidDisable = this._onDidDisable.event;
        container.appendChild(this.elements.root);
        this._register(toDisposable(() => this.elements.root.remove()));
        const styles = options?.styles ?? unthemedFindWidgetStyles;
        if (styles.listFilterWidgetBackground) {
            this.elements.root.style.backgroundColor = styles.listFilterWidgetBackground;
        }
        if (styles.listFilterWidgetShadow) {
            this.elements.root.style.boxShadow = `0 0 8px 2px ${styles.listFilterWidgetShadow}`;
        }
        const toggleHoverDelegate = this._register(createInstantHoverDelegate());
        this.toggles = toggleContributions.map((contribution) => this._register(new TreeFindToggle(contribution, styles.toggleStyles, toggleHoverDelegate)));
        this.onDidToggleChange = Event.any(...this.toggles.map((toggle) => Event.map(toggle.onChange, () => ({ id: toggle.id, isChecked: toggle.checked }))));
        const history = options?.history || [];
        this.findInput = this._register(new FindInput(this.elements.findInput, contextViewProvider, {
            label: localize('type to search', 'Type to search'),
            placeholder,
            additionalToggles: this.toggles,
            showCommonFindToggles: false,
            inputBoxStyles: styles.inputBoxStyles,
            toggleStyles: styles.toggleStyles,
            history: new Set(history),
        }));
        this.actionbar = this._register(new ActionBar(this.elements.actionbar));
        const emitter = this._register(new DomEmitter(this.findInput.inputBox.inputElement, 'keydown'));
        const onKeyDown = Event.chain(emitter.event, ($) => $.map((e) => new StandardKeyboardEvent(e)));
        this._register(onKeyDown((e) => {
            // Using equals() so we reserve modified keys for future use
            if (e.equals(3 /* KeyCode.Enter */)) {
                // This is the only keyboard way to return to the tree from a history item that isn't the last one
                e.preventDefault();
                e.stopPropagation();
                this.findInput.inputBox.addToHistory();
                this.tree.domFocus();
                return;
            }
            if (e.equals(18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
                e.stopPropagation();
                if (this.findInput.inputBox.isAtLastInHistory() ||
                    this.findInput.inputBox.isNowhereInHistory()) {
                    // Retain original pre-history DownArrow behavior
                    this.findInput.inputBox.addToHistory();
                    this.tree.domFocus();
                }
                else {
                    // Downward through history
                    this.findInput.inputBox.showNextValue();
                }
                return;
            }
            if (e.equals(16 /* KeyCode.UpArrow */)) {
                e.preventDefault();
                e.stopPropagation();
                // Upward through history
                this.findInput.inputBox.showPreviousValue();
                return;
            }
        }));
        const closeAction = this._register(new Action('close', localize('close', 'Close'), 'codicon codicon-close', true, () => this.dispose()));
        this.actionbar.push(closeAction, { icon: true, label: false });
        this.onDidChangeValue = this.findInput.onDidChange;
    }
    setToggleState(id, checked) {
        const toggle = this.toggles.find((toggle) => toggle.id === id);
        if (toggle) {
            toggle.checked = checked;
        }
    }
    setPlaceHolder(placeHolder) {
        this.findInput.inputBox.setPlaceHolder(placeHolder);
    }
    getHistory() {
        return this.findInput.inputBox.getHistory();
    }
    focus() {
        this.findInput.focus();
    }
    select() {
        this.findInput.select();
        // Reposition to last in history
        this.findInput.inputBox.addToHistory(true);
    }
    showMessage(message) {
        this.findInput.showMessage(message);
    }
    clearMessage() {
        this.findInput.clearMessage();
    }
    async dispose() {
        this._onDidDisable.fire();
        this.elements.root.classList.add('disabled');
        await timeout(300);
        super.dispose();
    }
}
var DefaultTreeToggles;
(function (DefaultTreeToggles) {
    DefaultTreeToggles["Mode"] = "mode";
    DefaultTreeToggles["MatchType"] = "matchType";
})(DefaultTreeToggles || (DefaultTreeToggles = {}));
export class AbstractFindController {
    get pattern() {
        return this._pattern;
    }
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(value) {
        this._placeholder = value;
        this.widget?.setPlaceHolder(value);
    }
    constructor(tree, filter, contextViewProvider, options = {}) {
        this.tree = tree;
        this.filter = filter;
        this.contextViewProvider = contextViewProvider;
        this.options = options;
        this._pattern = '';
        this.previousPattern = '';
        this._onDidChangePattern = new Emitter();
        this.onDidChangePattern = this._onDidChangePattern.event;
        this._onDidChangeOpenState = new Emitter();
        this.onDidChangeOpenState = this._onDidChangeOpenState.event;
        this.enabledDisposables = new DisposableStore();
        this.disposables = new DisposableStore();
        this.toggles = new FindToggles(options.toggles ?? []);
        this._placeholder = options.placeholder ?? localize('type to search', 'Type to search');
    }
    isOpened() {
        return !!this.widget;
    }
    open() {
        if (this.widget) {
            this.widget.focus();
            this.widget.select();
            return;
        }
        this.tree.updateOptions({ paddingTop: 30 });
        this.widget = new FindWidget(this.tree.getHTMLElement(), this.tree, this.contextViewProvider, this.placeholder, this.toggles.states(), { ...this.options, history: this._history });
        this.enabledDisposables.add(this.widget);
        this.widget.onDidChangeValue(this.onDidChangeValue, this, this.enabledDisposables);
        this.widget.onDidDisable(this.close, this, this.enabledDisposables);
        this.widget.onDidToggleChange(this.onDidToggleChange, this, this.enabledDisposables);
        this.widget.focus();
        this.widget.value = this.previousPattern;
        this.widget.select();
        this._onDidChangeOpenState.fire(true);
    }
    close() {
        if (!this.widget) {
            return;
        }
        this.tree.updateOptions({ paddingTop: 0 });
        this._history = this.widget.getHistory();
        this.widget = undefined;
        this.enabledDisposables.clear();
        this.previousPattern = this.pattern;
        this.onDidChangeValue('');
        this.tree.domFocus();
        this._onDidChangeOpenState.fire(false);
    }
    onDidChangeValue(pattern) {
        this._pattern = pattern;
        this._onDidChangePattern.fire(pattern);
        this.filter.pattern = pattern;
        this.applyPattern(pattern);
    }
    onDidToggleChange(e) {
        this.toggles.set(e.id, e.isChecked);
    }
    updateToggleState(id, checked) {
        this.toggles.set(id, checked);
        this.widget?.setToggleState(id, checked);
    }
    renderMessage(showNotFound, warningMessage) {
        if (showNotFound) {
            if (this.tree.options.showNotFoundMessage ?? true) {
                this.widget?.showMessage({
                    type: 2 /* MessageType.WARNING */,
                    content: warningMessage ?? localize('not found', 'No results found.'),
                });
            }
            else {
                this.widget?.showMessage({ type: 2 /* MessageType.WARNING */ });
            }
        }
        else {
            this.widget?.clearMessage();
        }
    }
    alertResults(results) {
        if (!results) {
            alert(localize('replFindNoResults', 'No results'));
        }
        else {
            alert(localize('foundResults', '{0} results', results));
        }
    }
    dispose() {
        this._history = undefined;
        this._onDidChangePattern.dispose();
        this.enabledDisposables.dispose();
        this.disposables.dispose();
    }
}
export class FindController extends AbstractFindController {
    get mode() {
        return this.toggles.get(DefaultTreeToggles.Mode) ? TreeFindMode.Filter : TreeFindMode.Highlight;
    }
    set mode(mode) {
        if (mode === this.mode) {
            return;
        }
        const isFilterMode = mode === TreeFindMode.Filter;
        this.updateToggleState(DefaultTreeToggles.Mode, isFilterMode);
        this.placeholder = isFilterMode
            ? localize('type to filter', 'Type to filter')
            : localize('type to search', 'Type to search');
        this.filter.findMode = mode;
        this.tree.refilter();
        this.render();
        this._onDidChangeMode.fire(mode);
    }
    get matchType() {
        return this.toggles.get(DefaultTreeToggles.MatchType)
            ? TreeFindMatchType.Fuzzy
            : TreeFindMatchType.Contiguous;
    }
    set matchType(matchType) {
        if (matchType === this.matchType) {
            return;
        }
        this.updateToggleState(DefaultTreeToggles.MatchType, matchType === TreeFindMatchType.Fuzzy);
        this.filter.findMatchType = matchType;
        this.tree.refilter();
        this.render();
        this._onDidChangeMatchType.fire(matchType);
    }
    constructor(tree, filter, contextViewProvider, options = {}) {
        const defaultFindMode = options.defaultFindMode ?? TreeFindMode.Highlight;
        const defaultFindMatchType = options.defaultFindMatchType ?? TreeFindMatchType.Fuzzy;
        const toggleContributions = [
            {
                id: DefaultTreeToggles.Mode,
                icon: Codicon.listFilter,
                title: localize('filter', 'Filter'),
                isChecked: defaultFindMode === TreeFindMode.Filter,
            },
            {
                id: DefaultTreeToggles.MatchType,
                icon: Codicon.searchFuzzy,
                title: localize('fuzzySearch', 'Fuzzy Match'),
                isChecked: defaultFindMatchType === TreeFindMatchType.Fuzzy,
            },
        ];
        filter.findMatchType = defaultFindMatchType;
        filter.findMode = defaultFindMode;
        super(tree, filter, contextViewProvider, { ...options, toggles: toggleContributions });
        this.filter = filter;
        this._onDidChangeMode = new Emitter();
        this.onDidChangeMode = this._onDidChangeMode.event;
        this._onDidChangeMatchType = new Emitter();
        this.onDidChangeMatchType = this._onDidChangeMatchType.event;
        this.disposables.add(this.tree.onDidChangeModel(() => {
            if (!this.isOpened()) {
                return;
            }
            if (this.pattern.length !== 0) {
                this.tree.refilter();
            }
            this.render();
        }));
        this.disposables.add(this.tree.onWillRefilter(() => this.filter.reset()));
    }
    updateOptions(optionsUpdate = {}) {
        if (optionsUpdate.defaultFindMode !== undefined) {
            this.mode = optionsUpdate.defaultFindMode;
        }
        if (optionsUpdate.defaultFindMatchType !== undefined) {
            this.matchType = optionsUpdate.defaultFindMatchType;
        }
    }
    applyPattern(pattern) {
        this.tree.refilter();
        if (pattern) {
            this.tree.focusNext(0, true, undefined, (node) => !FuzzyScore.isDefault(node.filterData));
        }
        const focus = this.tree.getFocus();
        if (focus.length > 0) {
            const element = focus[0];
            if (this.tree.getRelativeTop(element) === null) {
                this.tree.reveal(element, 0.5);
            }
        }
        this.render();
    }
    shouldAllowFocus(node) {
        if (!this.isOpened() || !this.pattern) {
            return true;
        }
        if (this.filter.totalCount > 0 && this.filter.matchCount <= 1) {
            return true;
        }
        return !FuzzyScore.isDefault(node.filterData);
    }
    onDidToggleChange(e) {
        if (e.id === DefaultTreeToggles.Mode) {
            this.mode = e.isChecked ? TreeFindMode.Filter : TreeFindMode.Highlight;
        }
        else if (e.id === DefaultTreeToggles.MatchType) {
            this.matchType = e.isChecked ? TreeFindMatchType.Fuzzy : TreeFindMatchType.Contiguous;
        }
    }
    render() {
        const noMatches = this.filter.matchCount === 0 && this.filter.totalCount > 0;
        const showNotFound = noMatches && this.pattern.length > 0;
        this.renderMessage(showNotFound);
        if (this.pattern.length) {
            this.alertResults(this.filter.matchCount);
        }
    }
}
function stickyScrollNodeStateEquals(node1, node2) {
    return node1.position === node2.position && stickyScrollNodeEquals(node1, node2);
}
function stickyScrollNodeEquals(node1, node2) {
    return (node1.node.element === node2.node.element &&
        node1.startIndex === node2.startIndex &&
        node1.height === node2.height &&
        node1.endIndex === node2.endIndex);
}
class StickyScrollState {
    constructor(stickyNodes = []) {
        this.stickyNodes = stickyNodes;
    }
    get count() {
        return this.stickyNodes.length;
    }
    equal(state) {
        return equals(this.stickyNodes, state.stickyNodes, stickyScrollNodeStateEquals);
    }
    contains(element) {
        return this.stickyNodes.some((node) => node.node.element === element.element);
    }
    lastNodePartiallyVisible() {
        if (this.count === 0) {
            return false;
        }
        const lastStickyNode = this.stickyNodes[this.count - 1];
        if (this.count === 1) {
            return lastStickyNode.position !== 0;
        }
        const secondLastStickyNode = this.stickyNodes[this.count - 2];
        return secondLastStickyNode.position + secondLastStickyNode.height !== lastStickyNode.position;
    }
    animationStateChanged(previousState) {
        if (!equals(this.stickyNodes, previousState.stickyNodes, stickyScrollNodeEquals)) {
            return false;
        }
        if (this.count === 0) {
            return false;
        }
        const lastStickyNode = this.stickyNodes[this.count - 1];
        const previousLastStickyNode = previousState.stickyNodes[previousState.count - 1];
        return lastStickyNode.position !== previousLastStickyNode.position;
    }
}
class DefaultStickyScrollDelegate {
    constrainStickyScrollNodes(stickyNodes, stickyScrollMaxItemCount, maxWidgetHeight) {
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const stickyNodeBottom = stickyNode.position + stickyNode.height;
            if (stickyNodeBottom > maxWidgetHeight || i >= stickyScrollMaxItemCount) {
                return stickyNodes.slice(0, i);
            }
        }
        return stickyNodes;
    }
}
class StickyScrollController extends Disposable {
    constructor(tree, model, view, renderers, treeDelegate, options = {}) {
        super();
        this.tree = tree;
        this.model = model;
        this.view = view;
        this.treeDelegate = treeDelegate;
        this.maxWidgetViewRatio = 0.4;
        const stickyScrollOptions = this.validateStickySettings(options);
        this.stickyScrollMaxItemCount = stickyScrollOptions.stickyScrollMaxItemCount;
        this.stickyScrollDelegate = options.stickyScrollDelegate ?? new DefaultStickyScrollDelegate();
        this.paddingTop = options.paddingTop ?? 0;
        this._widget = this._register(new StickyScrollWidget(view.getScrollableElement(), view, tree, renderers, treeDelegate, options.accessibilityProvider));
        this.onDidChangeHasFocus = this._widget.onDidChangeHasFocus;
        this.onContextMenu = this._widget.onContextMenu;
        this._register(view.onDidScroll(() => this.update()));
        this._register(view.onDidChangeContentHeight(() => this.update()));
        this._register(tree.onDidChangeCollapseState(() => this.update()));
        this._register(model.onDidSpliceRenderedNodes((e) => {
            const state = this._widget.state;
            if (!state) {
                return;
            }
            // If a sticky node is removed, recompute the state
            const hasRemovedStickyNode = e.deleteCount > 0 &&
                state.stickyNodes.some((stickyNode) => !this.model.has(this.model.getNodeLocation(stickyNode.node)));
            if (hasRemovedStickyNode) {
                this.update();
                return;
            }
            // If a sticky node is updated, rerender the widget
            const shouldRerenderStickyNodes = state.stickyNodes.some((stickyNode) => {
                const listIndex = this.model.getListIndex(this.model.getNodeLocation(stickyNode.node));
                return (listIndex >= e.start &&
                    listIndex < e.start + e.deleteCount &&
                    state.contains(stickyNode.node));
            });
            if (shouldRerenderStickyNodes) {
                this._widget.rerender();
            }
        }));
        this.update();
    }
    get height() {
        return this._widget.height;
    }
    get count() {
        return this._widget.count;
    }
    getNode(node) {
        return this._widget.getNode(node);
    }
    getNodeAtHeight(height) {
        let index;
        if (height === 0) {
            index = this.view.firstVisibleIndex;
        }
        else {
            index = this.view.indexAt(height + this.view.scrollTop);
        }
        if (index < 0 || index >= this.view.length) {
            return undefined;
        }
        return this.view.element(index);
    }
    update() {
        const firstVisibleNode = this.getNodeAtHeight(this.paddingTop);
        // Don't render anything if there are no elements
        if (!firstVisibleNode || this.tree.scrollTop <= this.paddingTop) {
            this._widget.setState(undefined);
            return;
        }
        const stickyState = this.findStickyState(firstVisibleNode);
        this._widget.setState(stickyState);
    }
    findStickyState(firstVisibleNode) {
        const stickyNodes = [];
        let firstVisibleNodeUnderWidget = firstVisibleNode;
        let stickyNodesHeight = 0;
        let nextStickyNode = this.getNextStickyNode(firstVisibleNodeUnderWidget, undefined, stickyNodesHeight);
        while (nextStickyNode) {
            stickyNodes.push(nextStickyNode);
            stickyNodesHeight += nextStickyNode.height;
            if (stickyNodes.length <= this.stickyScrollMaxItemCount) {
                firstVisibleNodeUnderWidget = this.getNextVisibleNode(nextStickyNode);
                if (!firstVisibleNodeUnderWidget) {
                    break;
                }
            }
            nextStickyNode = this.getNextStickyNode(firstVisibleNodeUnderWidget, nextStickyNode.node, stickyNodesHeight);
        }
        const contrainedStickyNodes = this.constrainStickyNodes(stickyNodes);
        return contrainedStickyNodes.length ? new StickyScrollState(contrainedStickyNodes) : undefined;
    }
    getNextVisibleNode(previousStickyNode) {
        return this.getNodeAtHeight(previousStickyNode.position + previousStickyNode.height);
    }
    getNextStickyNode(firstVisibleNodeUnderWidget, previousStickyNode, stickyNodesHeight) {
        const nextStickyNode = this.getAncestorUnderPrevious(firstVisibleNodeUnderWidget, previousStickyNode);
        if (!nextStickyNode) {
            return undefined;
        }
        if (nextStickyNode === firstVisibleNodeUnderWidget) {
            if (!this.nodeIsUncollapsedParent(firstVisibleNodeUnderWidget)) {
                return undefined;
            }
            if (this.nodeTopAlignsWithStickyNodesBottom(firstVisibleNodeUnderWidget, stickyNodesHeight)) {
                return undefined;
            }
        }
        return this.createStickyScrollNode(nextStickyNode, stickyNodesHeight);
    }
    nodeTopAlignsWithStickyNodesBottom(node, stickyNodesHeight) {
        const nodeIndex = this.getNodeIndex(node);
        const elementTop = this.view.getElementTop(nodeIndex);
        const stickyPosition = stickyNodesHeight;
        return this.view.scrollTop === elementTop - stickyPosition;
    }
    createStickyScrollNode(node, currentStickyNodesHeight) {
        const height = this.treeDelegate.getHeight(node);
        const { startIndex, endIndex } = this.getNodeRange(node);
        const position = this.calculateStickyNodePosition(endIndex, currentStickyNodesHeight, height);
        return { node, position, height, startIndex, endIndex };
    }
    getAncestorUnderPrevious(node, previousAncestor = undefined) {
        let currentAncestor = node;
        let parentOfcurrentAncestor = this.getParentNode(currentAncestor);
        while (parentOfcurrentAncestor) {
            if (parentOfcurrentAncestor === previousAncestor) {
                return currentAncestor;
            }
            currentAncestor = parentOfcurrentAncestor;
            parentOfcurrentAncestor = this.getParentNode(currentAncestor);
        }
        if (previousAncestor === undefined) {
            return currentAncestor;
        }
        return undefined;
    }
    calculateStickyNodePosition(lastDescendantIndex, stickyRowPositionTop, stickyNodeHeight) {
        let lastChildRelativeTop = this.view.getRelativeTop(lastDescendantIndex);
        // If the last descendant is only partially visible at the top of the view, getRelativeTop() returns null
        // In that case, utilize the next node's relative top to calculate the sticky node's position
        if (lastChildRelativeTop === null &&
            this.view.firstVisibleIndex === lastDescendantIndex &&
            lastDescendantIndex + 1 < this.view.length) {
            const nodeHeight = this.treeDelegate.getHeight(this.view.element(lastDescendantIndex));
            const nextNodeRelativeTop = this.view.getRelativeTop(lastDescendantIndex + 1);
            lastChildRelativeTop = nextNodeRelativeTop
                ? nextNodeRelativeTop - nodeHeight / this.view.renderHeight
                : null;
        }
        if (lastChildRelativeTop === null) {
            return stickyRowPositionTop;
        }
        const lastChildNode = this.view.element(lastDescendantIndex);
        const lastChildHeight = this.treeDelegate.getHeight(lastChildNode);
        const topOfLastChild = lastChildRelativeTop * this.view.renderHeight;
        const bottomOfLastChild = topOfLastChild + lastChildHeight;
        if (stickyRowPositionTop + stickyNodeHeight > bottomOfLastChild &&
            stickyRowPositionTop <= bottomOfLastChild) {
            return bottomOfLastChild - stickyNodeHeight;
        }
        return stickyRowPositionTop;
    }
    constrainStickyNodes(stickyNodes) {
        if (stickyNodes.length === 0) {
            return [];
        }
        // Check if sticky nodes need to be constrained
        const maximumStickyWidgetHeight = this.view.renderHeight * this.maxWidgetViewRatio;
        const lastStickyNode = stickyNodes[stickyNodes.length - 1];
        if (stickyNodes.length <= this.stickyScrollMaxItemCount &&
            lastStickyNode.position + lastStickyNode.height <= maximumStickyWidgetHeight) {
            return stickyNodes;
        }
        // constrain sticky nodes
        const constrainedStickyNodes = this.stickyScrollDelegate.constrainStickyScrollNodes(stickyNodes, this.stickyScrollMaxItemCount, maximumStickyWidgetHeight);
        if (!constrainedStickyNodes.length) {
            return [];
        }
        // Validate constraints
        const lastConstrainedStickyNode = constrainedStickyNodes[constrainedStickyNodes.length - 1];
        if (constrainedStickyNodes.length > this.stickyScrollMaxItemCount ||
            lastConstrainedStickyNode.position + lastConstrainedStickyNode.height >
                maximumStickyWidgetHeight) {
            throw new Error('stickyScrollDelegate violates constraints');
        }
        return constrainedStickyNodes;
    }
    getParentNode(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const parentLocation = this.model.getParentNodeLocation(nodeLocation);
        return parentLocation ? this.model.getNode(parentLocation) : undefined;
    }
    nodeIsUncollapsedParent(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        return this.model.getListRenderCount(nodeLocation) > 1;
    }
    getNodeIndex(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const nodeIndex = this.model.getListIndex(nodeLocation);
        return nodeIndex;
    }
    getNodeRange(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const startIndex = this.model.getListIndex(nodeLocation);
        if (startIndex < 0) {
            throw new Error('Node not found in tree');
        }
        const renderCount = this.model.getListRenderCount(nodeLocation);
        const endIndex = startIndex + renderCount - 1;
        return { startIndex, endIndex };
    }
    nodePositionTopBelowWidget(node) {
        const ancestors = [];
        let currentAncestor = this.getParentNode(node);
        while (currentAncestor) {
            ancestors.push(currentAncestor);
            currentAncestor = this.getParentNode(currentAncestor);
        }
        let widgetHeight = 0;
        for (let i = 0; i < ancestors.length && i < this.stickyScrollMaxItemCount; i++) {
            widgetHeight += this.treeDelegate.getHeight(ancestors[i]);
        }
        return widgetHeight;
    }
    getFocus() {
        return this._widget.getFocus();
    }
    domFocus() {
        this._widget.domFocus();
    }
    // Whether sticky scroll was the last focused part in the tree or not
    focusedLast() {
        return this._widget.focusedLast();
    }
    updateOptions(optionsUpdate = {}) {
        if (optionsUpdate.paddingTop !== undefined) {
            this.paddingTop = optionsUpdate.paddingTop;
        }
        if (optionsUpdate.stickyScrollMaxItemCount !== undefined) {
            const validatedOptions = this.validateStickySettings(optionsUpdate);
            if (this.stickyScrollMaxItemCount !== validatedOptions.stickyScrollMaxItemCount) {
                this.stickyScrollMaxItemCount = validatedOptions.stickyScrollMaxItemCount;
                this.update();
            }
        }
    }
    validateStickySettings(options) {
        let stickyScrollMaxItemCount = 7;
        if (typeof options.stickyScrollMaxItemCount === 'number') {
            stickyScrollMaxItemCount = Math.max(options.stickyScrollMaxItemCount, 1);
        }
        return { stickyScrollMaxItemCount };
    }
}
class StickyScrollWidget {
    get state() {
        return this._previousState;
    }
    constructor(container, view, tree, treeRenderers, treeDelegate, accessibilityProvider) {
        this.view = view;
        this.tree = tree;
        this.treeRenderers = treeRenderers;
        this.treeDelegate = treeDelegate;
        this.accessibilityProvider = accessibilityProvider;
        this._previousElements = [];
        this._previousStateDisposables = new DisposableStore();
        this._rootDomNode = $('.monaco-tree-sticky-container.empty');
        container.appendChild(this._rootDomNode);
        const shadow = $('.monaco-tree-sticky-container-shadow');
        this._rootDomNode.appendChild(shadow);
        this.stickyScrollFocus = new StickyScrollFocus(this._rootDomNode, view);
        this.onDidChangeHasFocus = this.stickyScrollFocus.onDidChangeHasFocus;
        this.onContextMenu = this.stickyScrollFocus.onContextMenu;
    }
    get height() {
        if (!this._previousState) {
            return 0;
        }
        const lastElement = this._previousState.stickyNodes[this._previousState.count - 1];
        return lastElement.position + lastElement.height;
    }
    get count() {
        return this._previousState?.count ?? 0;
    }
    getNode(node) {
        return this._previousState?.stickyNodes.find((stickyNode) => stickyNode.node === node);
    }
    setState(state) {
        const wasVisible = !!this._previousState && this._previousState.count > 0;
        const isVisible = !!state && state.count > 0;
        // If state has not changed, do nothing
        if ((!wasVisible && !isVisible) ||
            (wasVisible && isVisible && this._previousState.equal(state))) {
            return;
        }
        // Update visibility of the widget if changed
        if (wasVisible !== isVisible) {
            this.setVisible(isVisible);
        }
        if (!isVisible) {
            this._previousState = undefined;
            this._previousElements = [];
            this._previousStateDisposables.clear();
            return;
        }
        const lastStickyNode = state.stickyNodes[state.count - 1];
        // If the new state is only a change in the last node's position, update the position of the last element
        if (this._previousState && state.animationStateChanged(this._previousState)) {
            this._previousElements[this._previousState.count - 1].style.top =
                `${lastStickyNode.position}px`;
        }
        // create new dom elements
        else {
            this.renderState(state);
        }
        this._previousState = state;
        // Set the height of the widget to the bottom of the last sticky node
        this._rootDomNode.style.height = `${lastStickyNode.position + lastStickyNode.height}px`;
    }
    renderState(state) {
        this._previousStateDisposables.clear();
        const elements = Array(state.count);
        for (let stickyIndex = state.count - 1; stickyIndex >= 0; stickyIndex--) {
            const stickyNode = state.stickyNodes[stickyIndex];
            const { element, disposable } = this.createElement(stickyNode, stickyIndex, state.count);
            elements[stickyIndex] = element;
            this._rootDomNode.appendChild(element);
            this._previousStateDisposables.add(disposable);
        }
        this.stickyScrollFocus.updateElements(elements, state);
        this._previousElements = elements;
    }
    rerender() {
        if (this._previousState) {
            this.renderState(this._previousState);
        }
    }
    createElement(stickyNode, stickyIndex, stickyNodesTotal) {
        const nodeIndex = stickyNode.startIndex;
        // Sticky element container
        const stickyElement = document.createElement('div');
        stickyElement.style.top = `${stickyNode.position}px`;
        if (this.tree.options.setRowHeight !== false) {
            stickyElement.style.height = `${stickyNode.height}px`;
        }
        if (this.tree.options.setRowLineHeight !== false) {
            stickyElement.style.lineHeight = `${stickyNode.height}px`;
        }
        stickyElement.classList.add('monaco-tree-sticky-row');
        stickyElement.classList.add('monaco-list-row');
        stickyElement.setAttribute('data-index', `${nodeIndex}`);
        stickyElement.setAttribute('data-parity', nodeIndex % 2 === 0 ? 'even' : 'odd');
        stickyElement.setAttribute('id', this.view.getElementID(nodeIndex));
        const accessibilityDisposable = this.setAccessibilityAttributes(stickyElement, stickyNode.node.element, stickyIndex, stickyNodesTotal);
        // Get the renderer for the node
        const nodeTemplateId = this.treeDelegate.getTemplateId(stickyNode.node);
        const renderer = this.treeRenderers.find((renderer) => renderer.templateId === nodeTemplateId);
        if (!renderer) {
            throw new Error(`No renderer found for template id ${nodeTemplateId}`);
        }
        // To make sure we do not influence the original node, we create a copy of the node
        // We need to check if it is already a unique instance of the node by the delegate
        let nodeCopy = stickyNode.node;
        if (nodeCopy === this.tree.getNode(this.tree.getNodeLocation(stickyNode.node))) {
            nodeCopy = new Proxy(stickyNode.node, {});
        }
        // Render the element
        const templateData = renderer.renderTemplate(stickyElement);
        renderer.renderElement(nodeCopy, stickyNode.startIndex, templateData, stickyNode.height);
        // Remove the element from the DOM when state is disposed
        const disposable = toDisposable(() => {
            accessibilityDisposable.dispose();
            renderer.disposeElement(nodeCopy, stickyNode.startIndex, templateData, stickyNode.height);
            renderer.disposeTemplate(templateData);
            stickyElement.remove();
        });
        return { element: stickyElement, disposable };
    }
    setAccessibilityAttributes(container, element, stickyIndex, stickyNodesTotal) {
        if (!this.accessibilityProvider) {
            return Disposable.None;
        }
        if (this.accessibilityProvider.getSetSize) {
            container.setAttribute('aria-setsize', String(this.accessibilityProvider.getSetSize(element, stickyIndex, stickyNodesTotal)));
        }
        if (this.accessibilityProvider.getPosInSet) {
            container.setAttribute('aria-posinset', String(this.accessibilityProvider.getPosInSet(element, stickyIndex)));
        }
        if (this.accessibilityProvider.getRole) {
            container.setAttribute('role', this.accessibilityProvider.getRole(element) ?? 'treeitem');
        }
        const ariaLabel = this.accessibilityProvider.getAriaLabel(element);
        const observable = ariaLabel && typeof ariaLabel !== 'string' ? ariaLabel : constObservable(ariaLabel);
        const result = autorun((reader) => {
            const value = reader.readObservable(observable);
            if (value) {
                container.setAttribute('aria-label', value);
            }
            else {
                container.removeAttribute('aria-label');
            }
        });
        if (typeof ariaLabel === 'string') {
        }
        else if (ariaLabel) {
            container.setAttribute('aria-label', ariaLabel.get());
        }
        const ariaLevel = this.accessibilityProvider.getAriaLevel && this.accessibilityProvider.getAriaLevel(element);
        if (typeof ariaLevel === 'number') {
            container.setAttribute('aria-level', `${ariaLevel}`);
        }
        // Sticky Scroll elements can not be selected
        container.setAttribute('aria-selected', String(false));
        return result;
    }
    setVisible(visible) {
        this._rootDomNode.classList.toggle('empty', !visible);
        if (!visible) {
            this.stickyScrollFocus.updateElements([], undefined);
        }
    }
    getFocus() {
        return this.stickyScrollFocus.getFocus();
    }
    domFocus() {
        this.stickyScrollFocus.domFocus();
    }
    focusedLast() {
        return this.stickyScrollFocus.focusedLast();
    }
    dispose() {
        this.stickyScrollFocus.dispose();
        this._previousStateDisposables.dispose();
        this._rootDomNode.remove();
    }
}
class StickyScrollFocus extends Disposable {
    get domHasFocus() {
        return this._domHasFocus;
    }
    set domHasFocus(hasFocus) {
        if (hasFocus !== this._domHasFocus) {
            this._onDidChangeHasFocus.fire(hasFocus);
            this._domHasFocus = hasFocus;
        }
    }
    constructor(container, view) {
        super();
        this.container = container;
        this.view = view;
        this.focusedIndex = -1;
        this.elements = [];
        this._onDidChangeHasFocus = new Emitter();
        this.onDidChangeHasFocus = this._onDidChangeHasFocus.event;
        this._onContextMenu = new Emitter();
        this.onContextMenu = this._onContextMenu.event;
        this._domHasFocus = false;
        this._register(addDisposableListener(this.container, 'focus', () => this.onFocus()));
        this._register(addDisposableListener(this.container, 'blur', () => this.onBlur()));
        this._register(this.view.onDidFocus(() => this.toggleStickyScrollFocused(false)));
        this._register(this.view.onKeyDown((e) => this.onKeyDown(e)));
        this._register(this.view.onMouseDown((e) => this.onMouseDown(e)));
        this._register(this.view.onContextMenu((e) => this.handleContextMenu(e)));
    }
    handleContextMenu(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            if (this.focusedLast()) {
                this.view.domFocus();
            }
            return;
        }
        // The list handles the context menu triggered by a mouse event
        // In that case only set the focus of the element clicked and leave the rest to the list to handle
        if (!isKeyboardEvent(e.browserEvent)) {
            if (!this.state) {
                throw new Error('Context menu should not be triggered when state is undefined');
            }
            const stickyIndex = this.state.stickyNodes.findIndex((stickyNode) => stickyNode.node.element === e.element?.element);
            if (stickyIndex === -1) {
                throw new Error('Context menu should not be triggered when element is not in sticky scroll widget');
            }
            this.container.focus();
            this.setFocus(stickyIndex);
            return;
        }
        if (!this.state || this.focusedIndex < 0) {
            throw new Error('Context menu key should not be triggered when focus is not in sticky scroll widget');
        }
        const stickyNode = this.state.stickyNodes[this.focusedIndex];
        const element = stickyNode.node.element;
        const anchor = this.elements[this.focusedIndex];
        this._onContextMenu.fire({
            element,
            anchor,
            browserEvent: e.browserEvent,
            isStickyScroll: true,
        });
    }
    onKeyDown(e) {
        // Sticky Scroll Navigation
        if (this.domHasFocus && this.state) {
            // Move up
            if (e.key === 'ArrowUp') {
                this.setFocusedElement(Math.max(0, this.focusedIndex - 1));
                e.preventDefault();
                e.stopPropagation();
            }
            // Move down, if last sticky node is focused, move focus into first child of last sticky node
            else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                if (this.focusedIndex >= this.state.count - 1) {
                    const nodeIndexToFocus = this.state.stickyNodes[this.state.count - 1].startIndex + 1;
                    this.view.domFocus();
                    this.view.setFocus([nodeIndexToFocus]);
                    this.scrollNodeUnderWidget(nodeIndexToFocus, this.state);
                }
                else {
                    this.setFocusedElement(this.focusedIndex + 1);
                }
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
    onMouseDown(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            return;
        }
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
    }
    updateElements(elements, state) {
        if (state && state.count === 0) {
            throw new Error('Sticky scroll state must be undefined when there are no sticky nodes');
        }
        if (state && state.count !== elements.length) {
            throw new Error('Sticky scroll focus received illigel state');
        }
        const previousIndex = this.focusedIndex;
        this.removeFocus();
        this.elements = elements;
        this.state = state;
        if (state) {
            const newFocusedIndex = clamp(previousIndex, 0, state.count - 1);
            this.setFocus(newFocusedIndex);
        }
        else {
            if (this.domHasFocus) {
                this.view.domFocus();
            }
        }
        // must come last as it calls blur()
        this.container.tabIndex = state ? 0 : -1;
    }
    setFocusedElement(stickyIndex) {
        // doesn't imply that the widget has (or will have) focus
        const state = this.state;
        if (!state) {
            throw new Error('Cannot set focus when state is undefined');
        }
        this.setFocus(stickyIndex);
        if (stickyIndex < state.count - 1) {
            return;
        }
        // If the last sticky node is not fully visible, scroll it into view
        if (state.lastNodePartiallyVisible()) {
            const lastStickyNode = state.stickyNodes[stickyIndex];
            this.scrollNodeUnderWidget(lastStickyNode.endIndex + 1, state);
        }
    }
    scrollNodeUnderWidget(nodeIndex, state) {
        const lastStickyNode = state.stickyNodes[state.count - 1];
        const secondLastStickyNode = state.count > 1 ? state.stickyNodes[state.count - 2] : undefined;
        const elementScrollTop = this.view.getElementTop(nodeIndex);
        const elementTargetViewTop = secondLastStickyNode
            ? secondLastStickyNode.position + secondLastStickyNode.height + lastStickyNode.height
            : lastStickyNode.height;
        this.view.scrollTop = elementScrollTop - elementTargetViewTop;
    }
    getFocus() {
        if (!this.state || this.focusedIndex === -1) {
            return undefined;
        }
        return this.state.stickyNodes[this.focusedIndex].node.element;
    }
    domFocus() {
        if (!this.state) {
            throw new Error('Cannot focus when state is undefined');
        }
        this.container.focus();
    }
    focusedLast() {
        if (!this.state) {
            return false;
        }
        return this.view.getHTMLElement().classList.contains('sticky-scroll-focused');
    }
    removeFocus() {
        if (this.focusedIndex === -1) {
            return;
        }
        this.toggleElementFocus(this.elements[this.focusedIndex], false);
        this.focusedIndex = -1;
    }
    setFocus(newFocusIndex) {
        if (0 > newFocusIndex) {
            throw new Error('addFocus() can not remove focus');
        }
        if (!this.state && newFocusIndex >= 0) {
            throw new Error('Cannot set focus index when state is undefined');
        }
        if (this.state && newFocusIndex >= this.state.count) {
            throw new Error('Cannot set focus index to an index that does not exist');
        }
        const oldIndex = this.focusedIndex;
        if (oldIndex >= 0) {
            this.toggleElementFocus(this.elements[oldIndex], false);
        }
        if (newFocusIndex >= 0) {
            this.toggleElementFocus(this.elements[newFocusIndex], true);
        }
        this.focusedIndex = newFocusIndex;
    }
    toggleElementFocus(element, focused) {
        this.toggleElementActiveFocus(element, focused && this.domHasFocus);
        this.toggleElementPassiveFocus(element, focused);
    }
    toggleCurrentElementActiveFocus(focused) {
        if (this.focusedIndex === -1) {
            return;
        }
        this.toggleElementActiveFocus(this.elements[this.focusedIndex], focused);
    }
    toggleElementActiveFocus(element, focused) {
        // active focus is set when sticky scroll has focus
        element.classList.toggle('focused', focused);
    }
    toggleElementPassiveFocus(element, focused) {
        // passive focus allows to show focus when sticky scroll does not have focus
        // for example when the context menu has focus
        element.classList.toggle('passive-focused', focused);
    }
    toggleStickyScrollFocused(focused) {
        // Weather the last focus in the view was sticky scroll and not the list
        // Is only removed when the focus is back in the tree an no longer in sticky scroll
        this.view.getHTMLElement().classList.toggle('sticky-scroll-focused', focused);
    }
    onFocus() {
        if (!this.state || this.elements.length === 0) {
            throw new Error('Cannot focus when state is undefined or elements are empty');
        }
        this.domHasFocus = true;
        this.toggleStickyScrollFocused(true);
        this.toggleCurrentElementActiveFocus(true);
        if (this.focusedIndex === -1) {
            this.setFocus(0);
        }
    }
    onBlur() {
        this.domHasFocus = false;
        this.toggleCurrentElementActiveFocus(false);
    }
    dispose() {
        this.toggleStickyScrollFocused(false);
        this._onDidChangeHasFocus.fire(false);
        super.dispose();
    }
}
function asTreeMouseEvent(event) {
    let target = TreeMouseEventTarget.Unknown;
    if (hasParentWithClass(event.browserEvent.target, 'monaco-tl-twistie', 'monaco-tl-row')) {
        target = TreeMouseEventTarget.Twistie;
    }
    else if (hasParentWithClass(event.browserEvent.target, 'monaco-tl-contents', 'monaco-tl-row')) {
        target = TreeMouseEventTarget.Element;
    }
    else if (hasParentWithClass(event.browserEvent.target, 'monaco-tree-type-filter', 'monaco-list')) {
        target = TreeMouseEventTarget.Filter;
    }
    return {
        browserEvent: event.browserEvent,
        element: event.element ? event.element.element : null,
        target,
    };
}
function asTreeContextMenuEvent(event) {
    const isStickyScroll = isStickyScrollContainer(event.browserEvent.target);
    return {
        element: event.element ? event.element.element : null,
        browserEvent: event.browserEvent,
        anchor: event.anchor,
        isStickyScroll,
    };
}
function dfs(node, fn) {
    fn(node);
    node.children.forEach((child) => dfs(child, fn));
}
/**
 * The trait concept needs to exist at the tree level, because collapsed
 * tree nodes will not be known by the list.
 */
class Trait {
    get nodeSet() {
        if (!this._nodeSet) {
            this._nodeSet = this.createNodeSet();
        }
        return this._nodeSet;
    }
    constructor(getFirstViewElementWithTrait, identityProvider) {
        this.getFirstViewElementWithTrait = getFirstViewElementWithTrait;
        this.identityProvider = identityProvider;
        this.nodes = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    set(nodes, browserEvent) {
        if (!browserEvent?.__forceEvent && equals(this.nodes, nodes)) {
            return;
        }
        this._set(nodes, false, browserEvent);
    }
    _set(nodes, silent, browserEvent) {
        this.nodes = [...nodes];
        this.elements = undefined;
        this._nodeSet = undefined;
        if (!silent) {
            const that = this;
            this._onDidChange.fire({
                get elements() {
                    return that.get();
                },
                browserEvent,
            });
        }
    }
    get() {
        if (!this.elements) {
            this.elements = this.nodes.map((node) => node.element);
        }
        return [...this.elements];
    }
    getNodes() {
        return this.nodes;
    }
    has(node) {
        return this.nodeSet.has(node);
    }
    onDidModelSplice({ insertedNodes, deletedNodes }) {
        if (!this.identityProvider) {
            const set = this.createNodeSet();
            const visit = (node) => set.delete(node);
            deletedNodes.forEach((node) => dfs(node, visit));
            this.set([...set.values()]);
            return;
        }
        const deletedNodesIdSet = new Set();
        const deletedNodesVisitor = (node) => deletedNodesIdSet.add(this.identityProvider.getId(node.element).toString());
        deletedNodes.forEach((node) => dfs(node, deletedNodesVisitor));
        const insertedNodesMap = new Map();
        const insertedNodesVisitor = (node) => insertedNodesMap.set(this.identityProvider.getId(node.element).toString(), node);
        insertedNodes.forEach((node) => dfs(node, insertedNodesVisitor));
        const nodes = [];
        for (const node of this.nodes) {
            const id = this.identityProvider.getId(node.element).toString();
            const wasDeleted = deletedNodesIdSet.has(id);
            if (!wasDeleted) {
                nodes.push(node);
            }
            else {
                const insertedNode = insertedNodesMap.get(id);
                if (insertedNode && insertedNode.visible) {
                    nodes.push(insertedNode);
                }
            }
        }
        if (this.nodes.length > 0 && nodes.length === 0) {
            const node = this.getFirstViewElementWithTrait();
            if (node) {
                nodes.push(node);
            }
        }
        this._set(nodes, true);
    }
    createNodeSet() {
        const set = new Set();
        for (const node of this.nodes) {
            set.add(node);
        }
        return set;
    }
}
class TreeNodeListMouseController extends MouseController {
    constructor(list, tree, stickyScrollProvider) {
        super(list);
        this.tree = tree;
        this.stickyScrollProvider = stickyScrollProvider;
    }
    onViewPointer(e) {
        if (isButton(e.browserEvent.target) ||
            isEditableElement(e.browserEvent.target) ||
            isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        const node = e.element;
        if (!node) {
            return super.onViewPointer(e);
        }
        if (this.isSelectionRangeChangeEvent(e) || this.isSelectionSingleChangeEvent(e)) {
            return super.onViewPointer(e);
        }
        const target = e.browserEvent.target;
        const onTwistie = target.classList.contains('monaco-tl-twistie') ||
            (target.classList.contains('monaco-icon-label') &&
                target.classList.contains('folder-icon') &&
                e.browserEvent.offsetX < 16);
        const isStickyElement = isStickyScrollElement(e.browserEvent.target);
        let expandOnlyOnTwistieClick = false;
        if (isStickyElement) {
            expandOnlyOnTwistieClick = true;
        }
        else if (typeof this.tree.expandOnlyOnTwistieClick === 'function') {
            expandOnlyOnTwistieClick = this.tree.expandOnlyOnTwistieClick(node.element);
        }
        else {
            expandOnlyOnTwistieClick = !!this.tree.expandOnlyOnTwistieClick;
        }
        if (!isStickyElement) {
            if (expandOnlyOnTwistieClick && !onTwistie && e.browserEvent.detail !== 2) {
                return super.onViewPointer(e);
            }
            if (!this.tree.expandOnDoubleClick && e.browserEvent.detail === 2) {
                return super.onViewPointer(e);
            }
        }
        else {
            this.handleStickyScrollMouseEvent(e, node);
        }
        if (node.collapsible && (!isStickyElement || onTwistie)) {
            const location = this.tree.getNodeLocation(node);
            const recursive = e.browserEvent.altKey;
            this.tree.setFocus([location]);
            this.tree.toggleCollapsed(location, recursive);
            if (onTwistie) {
                // Do not set this before calling a handler on the super class, because it will reject it as handled
                e.browserEvent.isHandledByList = true;
                return;
            }
        }
        if (!isStickyElement) {
            super.onViewPointer(e);
        }
    }
    handleStickyScrollMouseEvent(e, node) {
        if (isMonacoCustomToggle(e.browserEvent.target) ||
            isActionItem(e.browserEvent.target)) {
            return;
        }
        const stickyScrollController = this.stickyScrollProvider();
        if (!stickyScrollController) {
            throw new Error('Sticky scroll controller not found');
        }
        const nodeIndex = this.list.indexOf(node);
        const elementScrollTop = this.list.getElementTop(nodeIndex);
        const elementTargetViewTop = stickyScrollController.nodePositionTopBelowWidget(node);
        this.tree.scrollTop = elementScrollTop - elementTargetViewTop;
        this.list.domFocus();
        this.list.setFocus([nodeIndex]);
        this.list.setSelection([nodeIndex]);
    }
    onDoubleClick(e) {
        const onTwistie = e.browserEvent.target.classList.contains('monaco-tl-twistie');
        if (onTwistie || !this.tree.expandOnDoubleClick) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        super.onDoubleClick(e);
    }
    // to make sure dom focus is not stolen (for example with context menu)
    onMouseDown(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            super.onMouseDown(e);
            return;
        }
    }
    onContextMenu(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            super.onContextMenu(e);
            return;
        }
    }
}
/**
 * We use this List subclass to restore selection and focus as nodes
 * get rendered in the list, possibly due to a node expand() call.
 */
class TreeNodeList extends List {
    constructor(user, container, virtualDelegate, renderers, focusTrait, selectionTrait, anchorTrait, options) {
        super(user, container, virtualDelegate, renderers, options);
        this.focusTrait = focusTrait;
        this.selectionTrait = selectionTrait;
        this.anchorTrait = anchorTrait;
    }
    createMouseController(options) {
        return new TreeNodeListMouseController(this, options.tree, options.stickyScrollProvider);
    }
    splice(start, deleteCount, elements = []) {
        super.splice(start, deleteCount, elements);
        if (elements.length === 0) {
            return;
        }
        const additionalFocus = [];
        const additionalSelection = [];
        let anchor;
        elements.forEach((node, index) => {
            if (this.focusTrait.has(node)) {
                additionalFocus.push(start + index);
            }
            if (this.selectionTrait.has(node)) {
                additionalSelection.push(start + index);
            }
            if (this.anchorTrait.has(node)) {
                anchor = start + index;
            }
        });
        if (additionalFocus.length > 0) {
            super.setFocus(distinct([...super.getFocus(), ...additionalFocus]));
        }
        if (additionalSelection.length > 0) {
            super.setSelection(distinct([...super.getSelection(), ...additionalSelection]));
        }
        if (typeof anchor === 'number') {
            super.setAnchor(anchor);
        }
    }
    setFocus(indexes, browserEvent, fromAPI = false) {
        super.setFocus(indexes, browserEvent);
        if (!fromAPI) {
            this.focusTrait.set(indexes.map((i) => this.element(i)), browserEvent);
        }
    }
    setSelection(indexes, browserEvent, fromAPI = false) {
        super.setSelection(indexes, browserEvent);
        if (!fromAPI) {
            this.selectionTrait.set(indexes.map((i) => this.element(i)), browserEvent);
        }
    }
    setAnchor(index, fromAPI = false) {
        super.setAnchor(index);
        if (!fromAPI) {
            if (typeof index === 'undefined') {
                this.anchorTrait.set([]);
            }
            else {
                this.anchorTrait.set([this.element(index)]);
            }
        }
    }
}
export var AbstractTreePart;
(function (AbstractTreePart) {
    AbstractTreePart[AbstractTreePart["Tree"] = 0] = "Tree";
    AbstractTreePart[AbstractTreePart["StickyScroll"] = 1] = "StickyScroll";
})(AbstractTreePart || (AbstractTreePart = {}));
export class AbstractTree {
    get onDidScroll() {
        return this.view.onDidScroll;
    }
    get onDidChangeFocus() {
        return this.eventBufferer.wrapEvent(this.focus.onDidChange);
    }
    get onDidChangeSelection() {
        return this.eventBufferer.wrapEvent(this.selection.onDidChange);
    }
    get onMouseClick() {
        return Event.map(this.view.onMouseClick, asTreeMouseEvent);
    }
    get onMouseDblClick() {
        return Event.filter(Event.map(this.view.onMouseDblClick, asTreeMouseEvent), (e) => e.target !== TreeMouseEventTarget.Filter);
    }
    get onMouseOver() {
        return Event.map(this.view.onMouseOver, asTreeMouseEvent);
    }
    get onMouseOut() {
        return Event.map(this.view.onMouseOut, asTreeMouseEvent);
    }
    get onContextMenu() {
        return Event.any(Event.filter(Event.map(this.view.onContextMenu, asTreeContextMenuEvent), (e) => !e.isStickyScroll), this.stickyScrollController?.onContextMenu ?? Event.None);
    }
    get onTap() {
        return Event.map(this.view.onTap, asTreeMouseEvent);
    }
    get onPointer() {
        return Event.map(this.view.onPointer, asTreeMouseEvent);
    }
    get onKeyDown() {
        return this.view.onKeyDown;
    }
    get onKeyUp() {
        return this.view.onKeyUp;
    }
    get onKeyPress() {
        return this.view.onKeyPress;
    }
    get onDidFocus() {
        return this.view.onDidFocus;
    }
    get onDidBlur() {
        return this.view.onDidBlur;
    }
    get onDidChangeModel() {
        return Event.any(this.onDidChangeModelRelay.event, this.onDidSwapModel.event);
    }
    get onDidChangeCollapseState() {
        return this.onDidChangeCollapseStateRelay.event;
    }
    get onDidChangeRenderNodeCount() {
        return this.onDidChangeRenderNodeCountRelay.event;
    }
    get findMode() {
        return this.findController?.mode ?? TreeFindMode.Highlight;
    }
    set findMode(findMode) {
        if (this.findController) {
            this.findController.mode = findMode;
        }
    }
    get findMatchType() {
        return this.findController?.matchType ?? TreeFindMatchType.Fuzzy;
    }
    set findMatchType(findFuzzy) {
        if (this.findController) {
            this.findController.matchType = findFuzzy;
        }
    }
    get onDidChangeFindPattern() {
        return this.findController ? this.findController.onDidChangePattern : Event.None;
    }
    get expandOnDoubleClick() {
        return typeof this._options.expandOnDoubleClick === 'undefined'
            ? true
            : this._options.expandOnDoubleClick;
    }
    get expandOnlyOnTwistieClick() {
        return typeof this._options.expandOnlyOnTwistieClick === 'undefined'
            ? true
            : this._options.expandOnlyOnTwistieClick;
    }
    get onDidDispose() {
        return this.view.onDidDispose;
    }
    constructor(_user, container, delegate, renderers, _options = {}) {
        this._user = _user;
        this._options = _options;
        this.eventBufferer = new EventBufferer();
        this.onDidChangeFindOpenState = Event.None;
        this.onDidChangeStickyScrollFocused = Event.None;
        this.disposables = new DisposableStore();
        this.onDidSwapModel = this.disposables.add(new Emitter());
        this.onDidChangeModelRelay = this.disposables.add(new Relay());
        this.onDidSpliceModelRelay = this.disposables.add(new Relay());
        this.onDidChangeCollapseStateRelay = this.disposables.add(new Relay());
        this.onDidChangeRenderNodeCountRelay = this.disposables.add(new Relay());
        this.onDidChangeActiveNodesRelay = this.disposables.add(new Relay());
        this._onWillRefilter = new Emitter();
        this.onWillRefilter = this._onWillRefilter.event;
        this._onDidUpdateOptions = new Emitter();
        this.onDidUpdateOptions = this._onDidUpdateOptions.event;
        this.modelDisposables = new DisposableStore();
        if (_options.keyboardNavigationLabelProvider && (_options.findWidgetEnabled ?? true)) {
            this.findFilter = new FindFilter(_options.keyboardNavigationLabelProvider, _options.filter, _options.defaultFindVisibility);
            _options = { ..._options, filter: this.findFilter }; // TODO need typescript help here
            this.disposables.add(this.findFilter);
        }
        this.model = this.createModel(_user, _options);
        this.treeDelegate = new ComposedTreeDelegate(delegate);
        const activeNodes = this.disposables.add(new EventCollection(this.onDidChangeActiveNodesRelay.event));
        const renderedIndentGuides = new SetMap();
        this.renderers = renderers.map((r) => new TreeRenderer(r, this.model, this.onDidChangeCollapseStateRelay.event, activeNodes, renderedIndentGuides, _options));
        for (const r of this.renderers) {
            this.disposables.add(r);
        }
        this.focus = new Trait(() => this.view.getFocusedElements()[0], _options.identityProvider);
        this.selection = new Trait(() => this.view.getSelectedElements()[0], _options.identityProvider);
        this.anchor = new Trait(() => this.view.getAnchorElement(), _options.identityProvider);
        this.view = new TreeNodeList(_user, container, this.treeDelegate, this.renderers, this.focus, this.selection, this.anchor, {
            ...asListOptions(() => this.model, this.disposables, _options),
            tree: this,
            stickyScrollProvider: () => this.stickyScrollController,
        });
        this.setupModel(this.model); // model needs to be setup after the traits have been created
        if (_options.keyboardSupport !== false) {
            const onKeyDown = Event.chain(this.view.onKeyDown, ($) => $.filter((e) => !isEditableElement(e.target)).map((e) => new StandardKeyboardEvent(e)));
            Event.chain(onKeyDown, ($) => $.filter((e) => e.keyCode === 15 /* KeyCode.LeftArrow */))(this.onLeftArrow, this, this.disposables);
            Event.chain(onKeyDown, ($) => $.filter((e) => e.keyCode === 17 /* KeyCode.RightArrow */))(this.onRightArrow, this, this.disposables);
            Event.chain(onKeyDown, ($) => $.filter((e) => e.keyCode === 10 /* KeyCode.Space */))(this.onSpace, this, this.disposables);
        }
        if ((_options.findWidgetEnabled ?? true) &&
            _options.keyboardNavigationLabelProvider &&
            _options.contextViewProvider) {
            const findOptions = {
                styles: _options.findWidgetStyles,
                defaultFindMode: _options.defaultFindMode,
                defaultFindMatchType: _options.defaultFindMatchType,
                showNotFoundMessage: _options.showNotFoundMessage,
            };
            this.findController = this.disposables.add(new FindController(this, this.findFilter, _options.contextViewProvider, findOptions));
            this.focusNavigationFilter = (node) => this.findController.shouldAllowFocus(node);
            this.onDidChangeFindOpenState = this.findController.onDidChangeOpenState;
            this.onDidChangeFindMode = this.findController.onDidChangeMode;
            this.onDidChangeFindMatchType = this.findController.onDidChangeMatchType;
        }
        else {
            this.onDidChangeFindMode = Event.None;
            this.onDidChangeFindMatchType = Event.None;
        }
        if (_options.enableStickyScroll) {
            this.stickyScrollController = new StickyScrollController(this, this.model, this.view, this.renderers, this.treeDelegate, _options);
            this.onDidChangeStickyScrollFocused = this.stickyScrollController.onDidChangeHasFocus;
        }
        this.styleElement = createStyleSheet(this.view.getHTMLElement());
        this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
    }
    updateOptions(optionsUpdate = {}) {
        this._options = { ...this._options, ...optionsUpdate };
        for (const renderer of this.renderers) {
            renderer.updateOptions(optionsUpdate);
        }
        this.view.updateOptions(this._options);
        this.findController?.updateOptions(optionsUpdate);
        this.updateStickyScroll(optionsUpdate);
        this._onDidUpdateOptions.fire(this._options);
        this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
    }
    get options() {
        return this._options;
    }
    updateStickyScroll(optionsUpdate) {
        if (!this.stickyScrollController && this._options.enableStickyScroll) {
            this.stickyScrollController = new StickyScrollController(this, this.model, this.view, this.renderers, this.treeDelegate, this._options);
            this.onDidChangeStickyScrollFocused = this.stickyScrollController.onDidChangeHasFocus;
        }
        else if (this.stickyScrollController && !this._options.enableStickyScroll) {
            this.onDidChangeStickyScrollFocused = Event.None;
            this.stickyScrollController.dispose();
            this.stickyScrollController = undefined;
        }
        this.stickyScrollController?.updateOptions(optionsUpdate);
    }
    updateWidth(element) {
        const index = this.model.getListIndex(element);
        if (index === -1) {
            return;
        }
        this.view.updateWidth(index);
    }
    // Widget
    getHTMLElement() {
        return this.view.getHTMLElement();
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
        return this.view.scrollTop;
    }
    set scrollTop(scrollTop) {
        this.view.scrollTop = scrollTop;
    }
    get scrollLeft() {
        return this.view.scrollLeft;
    }
    set scrollLeft(scrollLeft) {
        this.view.scrollLeft = scrollLeft;
    }
    get scrollHeight() {
        return this.view.scrollHeight;
    }
    get renderHeight() {
        return this.view.renderHeight;
    }
    get firstVisibleElement() {
        let index = this.view.firstVisibleIndex;
        if (this.stickyScrollController) {
            index += this.stickyScrollController.count;
        }
        if (index < 0 || index >= this.view.length) {
            return undefined;
        }
        const node = this.view.element(index);
        return node.element;
    }
    get lastVisibleElement() {
        const index = this.view.lastVisibleIndex;
        const node = this.view.element(index);
        return node.element;
    }
    get ariaLabel() {
        return this.view.ariaLabel;
    }
    set ariaLabel(value) {
        this.view.ariaLabel = value;
    }
    get selectionSize() {
        return this.selection.getNodes().length;
    }
    domFocus() {
        if (this.stickyScrollController?.focusedLast()) {
            this.stickyScrollController.domFocus();
        }
        else {
            this.view.domFocus();
        }
    }
    isDOMFocused() {
        return isActiveElement(this.getHTMLElement());
    }
    layout(height, width) {
        this.view.layout(height, width);
    }
    style(styles) {
        const suffix = `.${this.view.domId}`;
        const content = [];
        if (styles.treeIndentGuidesStroke) {
            content.push(`.monaco-list${suffix}:hover .monaco-tl-indent > .indent-guide, .monaco-list${suffix}.always .monaco-tl-indent > .indent-guide  { border-color: ${styles.treeInactiveIndentGuidesStroke}; }`);
            content.push(`.monaco-list${suffix} .monaco-tl-indent > .indent-guide.active { border-color: ${styles.treeIndentGuidesStroke}; }`);
        }
        // Sticky Scroll Background
        const stickyScrollBackground = styles.treeStickyScrollBackground ?? styles.listBackground;
        if (stickyScrollBackground) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container { background-color: ${stickyScrollBackground}; }`);
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container .monaco-tree-sticky-row { background-color: ${stickyScrollBackground}; }`);
        }
        // Sticky Scroll Border
        if (styles.treeStickyScrollBorder) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container { border-bottom: 1px solid ${styles.treeStickyScrollBorder}; }`);
        }
        // Sticky Scroll Shadow
        if (styles.treeStickyScrollShadow) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container .monaco-tree-sticky-container-shadow { box-shadow: ${styles.treeStickyScrollShadow} 0 6px 6px -6px inset; height: 3px; }`);
        }
        // Sticky Scroll Focus
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused { color: inherit; }`);
        }
        // Sticky Scroll Focus Outlines
        const focusAndSelectionOutline = asCssValueWithDefault(styles.listFocusAndSelectionOutline, asCssValueWithDefault(styles.listSelectionOutline, styles.listFocusOutline ?? ''));
        if (focusAndSelectionOutline) {
            // default: listFocusOutline
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused.selected { outline: 1px solid ${focusAndSelectionOutline}; outline-offset: -1px;}`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused.selected { outline: inherit;}`);
        }
        if (styles.listFocusOutline) {
            // default: set
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused { outline: inherit; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.passive-focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused.sticky-scroll-focused .monaco-list-rows .monaco-list-row.focused { outline: inherit; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused:not(.sticky-scroll-focused) .monaco-tree-sticky-container .monaco-list-rows .monaco-list-row.focused { outline: inherit; }`);
        }
        this.styleElement.textContent = content.join('\n');
        this.view.style(styles);
    }
    // Tree navigation
    getParentElement(location) {
        const parentRef = this.model.getParentNodeLocation(location);
        const parentNode = this.model.getNode(parentRef);
        return parentNode.element;
    }
    getFirstElementChild(location) {
        return this.model.getFirstElementChild(location);
    }
    // Tree
    getNode(location) {
        return this.model.getNode(location);
    }
    getNodeLocation(node) {
        return this.model.getNodeLocation(node);
    }
    collapse(location, recursive = false) {
        return this.model.setCollapsed(location, true, recursive);
    }
    expand(location, recursive = false) {
        return this.model.setCollapsed(location, false, recursive);
    }
    toggleCollapsed(location, recursive = false) {
        return this.model.setCollapsed(location, undefined, recursive);
    }
    expandAll() {
        this.model.setCollapsed(this.model.rootRef, false, true);
    }
    collapseAll() {
        this.model.setCollapsed(this.model.rootRef, true, true);
    }
    isCollapsible(location) {
        return this.model.isCollapsible(location);
    }
    setCollapsible(location, collapsible) {
        return this.model.setCollapsible(location, collapsible);
    }
    isCollapsed(location) {
        return this.model.isCollapsed(location);
    }
    expandTo(location) {
        this.model.expandTo(location);
    }
    triggerTypeNavigation() {
        this.view.triggerTypeNavigation();
    }
    openFind() {
        this.findController?.open();
    }
    closeFind() {
        this.findController?.close();
    }
    refilter() {
        this._onWillRefilter.fire(undefined);
        this.model.refilter();
    }
    setAnchor(element) {
        if (typeof element === 'undefined') {
            return this.view.setAnchor(undefined);
        }
        this.eventBufferer.bufferEvents(() => {
            const node = this.model.getNode(element);
            this.anchor.set([node]);
            const index = this.model.getListIndex(element);
            if (index > -1) {
                this.view.setAnchor(index, true);
            }
        });
    }
    getAnchor() {
        return this.anchor.get().at(0);
    }
    setSelection(elements, browserEvent) {
        this.eventBufferer.bufferEvents(() => {
            const nodes = elements.map((e) => this.model.getNode(e));
            this.selection.set(nodes, browserEvent);
            const indexes = elements.map((e) => this.model.getListIndex(e)).filter((i) => i > -1);
            this.view.setSelection(indexes, browserEvent, true);
        });
    }
    getSelection() {
        return this.selection.get();
    }
    setFocus(elements, browserEvent) {
        this.eventBufferer.bufferEvents(() => {
            const nodes = elements.map((e) => this.model.getNode(e));
            this.focus.set(nodes, browserEvent);
            const indexes = elements.map((e) => this.model.getListIndex(e)).filter((i) => i > -1);
            this.view.setFocus(indexes, browserEvent, true);
        });
    }
    focusNext(n = 1, loop = false, browserEvent, filter = isKeyboardEvent(browserEvent) && browserEvent.altKey
        ? undefined
        : this.focusNavigationFilter) {
        this.view.focusNext(n, loop, browserEvent, filter);
    }
    focusPrevious(n = 1, loop = false, browserEvent, filter = isKeyboardEvent(browserEvent) && browserEvent.altKey
        ? undefined
        : this.focusNavigationFilter) {
        this.view.focusPrevious(n, loop, browserEvent, filter);
    }
    focusNextPage(browserEvent, filter = isKeyboardEvent(browserEvent) && browserEvent.altKey
        ? undefined
        : this.focusNavigationFilter) {
        return this.view.focusNextPage(browserEvent, filter);
    }
    focusPreviousPage(browserEvent, filter = isKeyboardEvent(browserEvent) && browserEvent.altKey
        ? undefined
        : this.focusNavigationFilter) {
        return this.view.focusPreviousPage(browserEvent, filter, () => this.stickyScrollController?.height ?? 0);
    }
    focusLast(browserEvent, filter = isKeyboardEvent(browserEvent) && browserEvent.altKey
        ? undefined
        : this.focusNavigationFilter) {
        this.view.focusLast(browserEvent, filter);
    }
    focusFirst(browserEvent, filter = isKeyboardEvent(browserEvent) && browserEvent.altKey
        ? undefined
        : this.focusNavigationFilter) {
        this.view.focusFirst(browserEvent, filter);
    }
    getFocus() {
        return this.focus.get();
    }
    getStickyScrollFocus() {
        const focus = this.stickyScrollController?.getFocus();
        return focus !== undefined ? [focus] : [];
    }
    getFocusedPart() {
        return this.stickyScrollController?.focusedLast()
            ? 1 /* AbstractTreePart.StickyScroll */
            : 0 /* AbstractTreePart.Tree */;
    }
    reveal(location, relativeTop) {
        this.model.expandTo(location);
        const index = this.model.getListIndex(location);
        if (index === -1) {
            return;
        }
        if (!this.stickyScrollController) {
            this.view.reveal(index, relativeTop);
        }
        else {
            const paddingTop = this.stickyScrollController.nodePositionTopBelowWidget(this.getNode(location));
            this.view.reveal(index, relativeTop, paddingTop);
        }
    }
    /**
     * Returns the relative position of an element rendered in the list.
     * Returns `null` if the element isn't *entirely* in the visible viewport.
     */
    getRelativeTop(location) {
        const index = this.model.getListIndex(location);
        if (index === -1) {
            return null;
        }
        const stickyScrollNode = this.stickyScrollController?.getNode(this.getNode(location));
        return this.view.getRelativeTop(index, stickyScrollNode?.position ?? this.stickyScrollController?.height);
    }
    getViewState(identityProvider = this.options.identityProvider) {
        if (!identityProvider) {
            throw new TreeError(this._user, "Can't get tree view state without an identity provider");
        }
        const getId = (element) => identityProvider.getId(element).toString();
        const state = AbstractTreeViewState.empty(this.scrollTop);
        for (const focus of this.getFocus()) {
            state.focus.add(getId(focus));
        }
        for (const selection of this.getSelection()) {
            state.selection.add(getId(selection));
        }
        const root = this.model.getNode();
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (node !== root && node.collapsible) {
                state.expanded[getId(node.element)] = node.collapsed ? 0 : 1;
            }
            insertInto(stack, stack.length, node.children);
        }
        return state;
    }
    // List
    onLeftArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const didChange = this.model.setCollapsed(location, true);
        if (!didChange) {
            const parentLocation = this.model.getParentNodeLocation(location);
            if (!parentLocation) {
                return;
            }
            const parentListIndex = this.model.getListIndex(parentLocation);
            this.view.reveal(parentListIndex);
            this.view.setFocus([parentListIndex]);
        }
    }
    onRightArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const didChange = this.model.setCollapsed(location, false);
        if (!didChange) {
            if (!node.children.some((child) => child.visible)) {
                return;
            }
            const [focusedIndex] = this.view.getFocus();
            const firstChildIndex = focusedIndex + 1;
            this.view.reveal(firstChildIndex);
            this.view.setFocus([firstChildIndex]);
        }
    }
    onSpace(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const recursive = e.browserEvent.altKey;
        this.model.setCollapsed(location, undefined, recursive);
    }
    setupModel(model) {
        this.modelDisposables.clear();
        this.modelDisposables.add(model.onDidSpliceRenderedNodes(({ start, deleteCount, elements }) => this.view.splice(start, deleteCount, elements)));
        const onDidModelSplice = Event.forEach(model.onDidSpliceModel, (e) => {
            this.eventBufferer.bufferEvents(() => {
                this.focus.onDidModelSplice(e);
                this.selection.onDidModelSplice(e);
            });
        }, this.modelDisposables);
        // Make sure the `forEach` always runs
        onDidModelSplice(() => null, null, this.modelDisposables);
        // Active nodes can change when the model changes or when focus or selection change.
        // We debounce it with 0 delay since these events may fire in the same stack and we only
        // want to run this once. It also doesn't matter if it runs on the next tick since it's only
        // a nice to have UI feature.
        const activeNodesEmitter = this.modelDisposables.add(new Emitter());
        const activeNodesDebounce = this.modelDisposables.add(new Delayer(0));
        this.modelDisposables.add(Event.any(onDidModelSplice, this.focus.onDidChange, this.selection.onDidChange)(() => {
            activeNodesDebounce.trigger(() => {
                const set = new Set();
                for (const node of this.focus.getNodes()) {
                    set.add(node);
                }
                for (const node of this.selection.getNodes()) {
                    set.add(node);
                }
                activeNodesEmitter.fire([...set.values()]);
            });
        }));
        this.onDidChangeActiveNodesRelay.input = activeNodesEmitter.event;
        this.onDidChangeModelRelay.input = Event.signal(model.onDidSpliceModel);
        this.onDidChangeCollapseStateRelay.input = model.onDidChangeCollapseState;
        this.onDidChangeRenderNodeCountRelay.input = model.onDidChangeRenderNodeCount;
        this.onDidSpliceModelRelay.input = model.onDidSpliceModel;
    }
    navigate(start) {
        return new TreeNavigator(this.view, this.model, start);
    }
    dispose() {
        dispose(this.disposables);
        this.stickyScrollController?.dispose();
        this.view.dispose();
        this.modelDisposables.dispose();
    }
}
class TreeNavigator {
    constructor(view, model, start) {
        this.view = view;
        this.model = model;
        if (start) {
            this.index = this.model.getListIndex(start);
        }
        else {
            this.index = -1;
        }
    }
    current() {
        if (this.index < 0 || this.index >= this.view.length) {
            return null;
        }
        return this.view.element(this.index).element;
    }
    previous() {
        this.index--;
        return this.current();
    }
    next() {
        this.index++;
        return this.current();
    }
    first() {
        this.index = 0;
        return this.current();
    }
    last() {
        this.index = this.view.length - 1;
        return this.current();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RyZWUvYWJzdHJhY3RUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixDQUFDLEVBQ0QsTUFBTSxFQUNOLFNBQVMsRUFDVCxDQUFDLEVBQ0Qsa0JBQWtCLEVBQ2xCLGVBQWUsRUFDZixlQUFlLEVBQ2YscUJBQXFCLEVBQ3JCLGlCQUFpQixHQUNqQixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXJELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNyRCxPQUFPLEVBSU4sbUJBQW1CLEdBQ25CLE1BQU0seUJBQXlCLENBQUE7QUFZaEMsT0FBTyxFQUFFLHVCQUF1QixFQUF3QixNQUFNLHFCQUFxQixDQUFBO0FBQ25GLE9BQU8sRUFJTixZQUFZLEVBQ1osUUFBUSxFQUNSLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsdUJBQXVCLEVBQ3ZCLHFCQUFxQixFQUNyQixJQUFJLEVBQ0osZUFBZSxHQUVmLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFpQixNQUFNLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFx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