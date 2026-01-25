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
import { isActiveElement, isKeyboardEvent } from '../../../base/browser/dom.js';
import { PagedList, } from '../../../base/browser/ui/list/listPaging.js';
import { isSelectionRangeChangeEvent, isSelectionSingleChangeEvent, List, TypeNavigationMode, } from '../../../base/browser/ui/list/listWidget.js';
import { Table, } from '../../../base/browser/ui/table/tableWidget.js';
import { TreeFindMatchType, TreeFindMode, } from '../../../base/browser/ui/tree/abstractTree.js';
import { AsyncDataTree, CompressibleAsyncDataTree, } from '../../../base/browser/ui/tree/asyncDataTree.js';
import { DataTree } from '../../../base/browser/ui/tree/dataTree.js';
import { CompressibleObjectTree, ObjectTree, } from '../../../base/browser/ui/tree/objectTree.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { combinedDisposable, Disposable, DisposableStore, dispose, toDisposable, } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../configuration/common/configurationRegistry.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../contextkey/common/contextkey.js';
import { InputFocusedContextKey } from '../../contextkey/common/contextkeys.js';
import { IContextViewService } from '../../contextview/browser/contextView.js';
import { createDecorator, IInstantiationService, } from '../../instantiation/common/instantiation.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { Registry } from '../../registry/common/platform.js';
import { defaultFindWidgetStyles, defaultListStyles, getListStyles, } from '../../theme/browser/defaultStyles.js';
export const IListService = createDecorator('listService');
export class ListService {
    get lastFocusedList() {
        return this._lastFocusedWidget;
    }
    constructor() {
        this.disposables = new DisposableStore();
        this.lists = [];
        this._lastFocusedWidget = undefined;
    }
    setLastFocusedList(widget) {
        if (widget === this._lastFocusedWidget) {
            return;
        }
        this._lastFocusedWidget?.getHTMLElement().classList.remove('last-focused');
        this._lastFocusedWidget = widget;
        this._lastFocusedWidget?.getHTMLElement().classList.add('last-focused');
    }
    register(widget, extraContextKeys) {
        if (this.lists.some((l) => l.widget === widget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        // Keep in our lists list
        const registeredList = { widget, extraContextKeys };
        this.lists.push(registeredList);
        // Check for currently being focused
        if (isActiveElement(widget.getHTMLElement())) {
            this.setLastFocusedList(widget);
        }
        return combinedDisposable(widget.onDidFocus(() => this.setLastFocusedList(widget)), toDisposable(() => this.lists.splice(this.lists.indexOf(registeredList), 1)), widget.onDidDispose(() => {
            this.lists = this.lists.filter((l) => l !== registeredList);
            if (this._lastFocusedWidget === widget) {
                this.setLastFocusedList(undefined);
            }
        }));
    }
    dispose() {
        this.disposables.dispose();
    }
}
export const RawWorkbenchListScrollAtBoundaryContextKey = new RawContextKey('listScrollAtBoundary', 'none');
export const WorkbenchListScrollAtTopContextKey = ContextKeyExpr.or(RawWorkbenchListScrollAtBoundaryContextKey.isEqualTo('top'), RawWorkbenchListScrollAtBoundaryContextKey.isEqualTo('both'));
export const WorkbenchListScrollAtBottomContextKey = ContextKeyExpr.or(RawWorkbenchListScrollAtBoundaryContextKey.isEqualTo('bottom'), RawWorkbenchListScrollAtBoundaryContextKey.isEqualTo('both'));
export const RawWorkbenchListFocusContextKey = new RawContextKey('listFocus', true);
export const WorkbenchTreeStickyScrollFocused = new RawContextKey('treestickyScrollFocused', false);
export const WorkbenchListSupportsMultiSelectContextKey = new RawContextKey('listSupportsMultiselect', true);
export const WorkbenchListFocusContextKey = ContextKeyExpr.and(RawWorkbenchListFocusContextKey, ContextKeyExpr.not(InputFocusedContextKey), WorkbenchTreeStickyScrollFocused.negate());
export const WorkbenchListHasSelectionOrFocus = new RawContextKey('listHasSelectionOrFocus', false);
export const WorkbenchListDoubleSelection = new RawContextKey('listDoubleSelection', false);
export const WorkbenchListMultiSelection = new RawContextKey('listMultiSelection', false);
export const WorkbenchListSelectionNavigation = new RawContextKey('listSelectionNavigation', false);
export const WorkbenchListSupportsFind = new RawContextKey('listSupportsFind', true);
export const WorkbenchTreeElementCanCollapse = new RawContextKey('treeElementCanCollapse', false);
export const WorkbenchTreeElementHasParent = new RawContextKey('treeElementHasParent', false);
export const WorkbenchTreeElementCanExpand = new RawContextKey('treeElementCanExpand', false);
export const WorkbenchTreeElementHasChild = new RawContextKey('treeElementHasChild', false);
export const WorkbenchTreeFindOpen = new RawContextKey('treeFindOpen', false);
const WorkbenchListTypeNavigationModeKey = 'listTypeNavigationMode';
/**
 * @deprecated in favor of WorkbenchListTypeNavigationModeKey
 */
const WorkbenchListAutomaticKeyboardNavigationLegacyKey = 'listAutomaticKeyboardNavigation';
function createScopedContextKeyService(contextKeyService, widget) {
    const result = contextKeyService.createScoped(widget.getHTMLElement());
    RawWorkbenchListFocusContextKey.bindTo(result);
    return result;
}
function createScrollObserver(contextKeyService, widget) {
    const listScrollAt = RawWorkbenchListScrollAtBoundaryContextKey.bindTo(contextKeyService);
    const update = () => {
        const atTop = widget.scrollTop === 0;
        // We need a threshold `1` since scrollHeight is rounded.
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#determine_if_an_element_has_been_totally_scrolled
        const atBottom = widget.scrollHeight - widget.renderHeight - widget.scrollTop < 1;
        if (atTop && atBottom) {
            listScrollAt.set('both');
        }
        else if (atTop) {
            listScrollAt.set('top');
        }
        else if (atBottom) {
            listScrollAt.set('bottom');
        }
        else {
            listScrollAt.set('none');
        }
    };
    update();
    return widget.onDidScroll(update);
}
const multiSelectModifierSettingKey = 'workbench.list.multiSelectModifier';
const openModeSettingKey = 'workbench.list.openMode';
const horizontalScrollingKey = 'workbench.list.horizontalScrolling';
const defaultFindModeSettingKey = 'workbench.list.defaultFindMode';
const typeNavigationModeSettingKey = 'workbench.list.typeNavigationMode';
/** @deprecated in favor of `workbench.list.defaultFindMode` and `workbench.list.typeNavigationMode` */
const keyboardNavigationSettingKey = 'workbench.list.keyboardNavigation';
const scrollByPageKey = 'workbench.list.scrollByPage';
const defaultFindMatchTypeSettingKey = 'workbench.list.defaultFindMatchType';
const treeIndentKey = 'workbench.tree.indent';
const treeRenderIndentGuidesKey = 'workbench.tree.renderIndentGuides';
const listSmoothScrolling = 'workbench.list.smoothScrolling';
const mouseWheelScrollSensitivityKey = 'workbench.list.mouseWheelScrollSensitivity';
const fastScrollSensitivityKey = 'workbench.list.fastScrollSensitivity';
const treeExpandMode = 'workbench.tree.expandMode';
const treeStickyScroll = 'workbench.tree.enableStickyScroll';
const treeStickyScrollMaxElements = 'workbench.tree.stickyScrollMaxItemCount';
function useAltAsMultipleSelectionModifier(configurationService) {
    return configurationService.getValue(multiSelectModifierSettingKey) === 'alt';
}
class MultipleSelectionController extends Disposable {
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this.useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
                this.useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(this.configurationService);
            }
        }));
    }
    isSelectionSingleChangeEvent(event) {
        if (this.useAltAsMultipleSelectionModifier) {
            return event.browserEvent.altKey;
        }
        return isSelectionSingleChangeEvent(event);
    }
    isSelectionRangeChangeEvent(event) {
        return isSelectionRangeChangeEvent(event);
    }
}
function toWorkbenchListOptions(accessor, options) {
    const configurationService = accessor.get(IConfigurationService);
    const keybindingService = accessor.get(IKeybindingService);
    const disposables = new DisposableStore();
    const result = {
        ...options,
        keyboardNavigationDelegate: {
            mightProducePrintableCharacter(e) {
                return keybindingService.mightProducePrintableCharacter(e);
            },
        },
        smoothScrolling: Boolean(configurationService.getValue(listSmoothScrolling)),
        mouseWheelScrollSensitivity: configurationService.getValue(mouseWheelScrollSensitivityKey),
        fastScrollSensitivity: configurationService.getValue(fastScrollSensitivityKey),
        multipleSelectionController: options.multipleSelectionController ??
            disposables.add(new MultipleSelectionController(configurationService)),
        keyboardNavigationEventFilter: createKeyboardNavigationEventFilter(keybindingService),
        scrollByPage: Boolean(configurationService.getValue(scrollByPageKey)),
    };
    return [result, disposables];
}
let WorkbenchList = class WorkbenchList extends List {
    get onDidOpen() {
        return this.navigator.onDidOpen;
    }
    constructor(user, container, delegate, renderers, options, contextKeyService, listService, configurationService, instantiationService) {
        const horizontalScrolling = typeof options.horizontalScrolling !== 'undefined'
            ? options.horizontalScrolling
            : Boolean(configurationService.getValue(horizontalScrollingKey));
        const [workbenchListOptions, workbenchListOptionsDisposable] = instantiationService.invokeFunction(toWorkbenchListOptions, options);
        super(user, container, delegate, renderers, {
            keyboardSupport: false,
            ...workbenchListOptions,
            horizontalScrolling,
        });
        this.disposables.add(workbenchListOptionsDisposable);
        this.contextKeyService = createScopedContextKeyService(contextKeyService, this);
        this.disposables.add(createScrollObserver(this.contextKeyService, this));
        this.listSupportsMultiSelect = WorkbenchListSupportsMultiSelectContextKey.bindTo(this.contextKeyService);
        this.listSupportsMultiSelect.set(options.multipleSelectionSupport !== false);
        const listSelectionNavigation = WorkbenchListSelectionNavigation.bindTo(this.contextKeyService);
        listSelectionNavigation.set(Boolean(options.selectionNavigation));
        this.listHasSelectionOrFocus = WorkbenchListHasSelectionOrFocus.bindTo(this.contextKeyService);
        this.listDoubleSelection = WorkbenchListDoubleSelection.bindTo(this.contextKeyService);
        this.listMultiSelection = WorkbenchListMultiSelection.bindTo(this.contextKeyService);
        this.horizontalScrolling = options.horizontalScrolling;
        this._useAltAsMultipleSelectionModifier =
            useAltAsMultipleSelectionModifier(configurationService);
        this.disposables.add(this.contextKeyService);
        this.disposables.add(listService.register(this));
        this.updateStyles(options.overrideStyles);
        this.disposables.add(this.onDidChangeSelection(() => {
            const selection = this.getSelection();
            const focus = this.getFocus();
            this.contextKeyService.bufferChangeEvents(() => {
                this.listHasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
                this.listMultiSelection.set(selection.length > 1);
                this.listDoubleSelection.set(selection.length === 2);
            });
        }));
        this.disposables.add(this.onDidChangeFocus(() => {
            const selection = this.getSelection();
            const focus = this.getFocus();
            this.listHasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
        }));
        this.disposables.add(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
                this._useAltAsMultipleSelectionModifier =
                    useAltAsMultipleSelectionModifier(configurationService);
            }
            let options = {};
            if (e.affectsConfiguration(horizontalScrollingKey) &&
                this.horizontalScrolling === undefined) {
                const horizontalScrolling = Boolean(configurationService.getValue(horizontalScrollingKey));
                options = { ...options, horizontalScrolling };
            }
            if (e.affectsConfiguration(scrollByPageKey)) {
                const scrollByPage = Boolean(configurationService.getValue(scrollByPageKey));
                options = { ...options, scrollByPage };
            }
            if (e.affectsConfiguration(listSmoothScrolling)) {
                const smoothScrolling = Boolean(configurationService.getValue(listSmoothScrolling));
                options = { ...options, smoothScrolling };
            }
            if (e.affectsConfiguration(mouseWheelScrollSensitivityKey)) {
                const mouseWheelScrollSensitivity = configurationService.getValue(mouseWheelScrollSensitivityKey);
                options = { ...options, mouseWheelScrollSensitivity };
            }
            if (e.affectsConfiguration(fastScrollSensitivityKey)) {
                const fastScrollSensitivity = configurationService.getValue(fastScrollSensitivityKey);
                options = { ...options, fastScrollSensitivity };
            }
            if (Object.keys(options).length > 0) {
                this.updateOptions(options);
            }
        }));
        this.navigator = new ListResourceNavigator(this, { configurationService, ...options });
        this.disposables.add(this.navigator);
    }
    updateOptions(options) {
        super.updateOptions(options);
        if (options.overrideStyles !== undefined) {
            this.updateStyles(options.overrideStyles);
        }
        if (options.multipleSelectionSupport !== undefined) {
            this.listSupportsMultiSelect.set(!!options.multipleSelectionSupport);
        }
    }
    updateStyles(styles) {
        this.style(styles ? getListStyles(styles) : defaultListStyles);
    }
    get useAltAsMultipleSelectionModifier() {
        return this._useAltAsMultipleSelectionModifier;
    }
};
WorkbenchList = __decorate([
    __param(5, IContextKeyService),
    __param(6, IListService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService)
], WorkbenchList);
export { WorkbenchList };
let WorkbenchPagedList = class WorkbenchPagedList extends PagedList {
    get onDidOpen() {
        return this.navigator.onDidOpen;
    }
    constructor(user, container, delegate, renderers, options, contextKeyService, listService, configurationService, instantiationService) {
        const horizontalScrolling = typeof options.horizontalScrolling !== 'undefined'
            ? options.horizontalScrolling
            : Boolean(configurationService.getValue(horizontalScrollingKey));
        const [workbenchListOptions, workbenchListOptionsDisposable] = instantiationService.invokeFunction(toWorkbenchListOptions, options);
        super(user, container, delegate, renderers, {
            keyboardSupport: false,
            ...workbenchListOptions,
            horizontalScrolling,
        });
        this.disposables = new DisposableStore();
        this.disposables.add(workbenchListOptionsDisposable);
        this.contextKeyService = createScopedContextKeyService(contextKeyService, this);
        this.disposables.add(createScrollObserver(this.contextKeyService, this.widget));
        this.horizontalScrolling = options.horizontalScrolling;
        this.listSupportsMultiSelect = WorkbenchListSupportsMultiSelectContextKey.bindTo(this.contextKeyService);
        this.listSupportsMultiSelect.set(options.multipleSelectionSupport !== false);
        const listSelectionNavigation = WorkbenchListSelectionNavigation.bindTo(this.contextKeyService);
        listSelectionNavigation.set(Boolean(options.selectionNavigation));
        this._useAltAsMultipleSelectionModifier =
            useAltAsMultipleSelectionModifier(configurationService);
        this.disposables.add(this.contextKeyService);
        this.disposables.add(listService.register(this));
        this.updateStyles(options.overrideStyles);
        this.disposables.add(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
                this._useAltAsMultipleSelectionModifier =
                    useAltAsMultipleSelectionModifier(configurationService);
            }
            let options = {};
            if (e.affectsConfiguration(horizontalScrollingKey) &&
                this.horizontalScrolling === undefined) {
                const horizontalScrolling = Boolean(configurationService.getValue(horizontalScrollingKey));
                options = { ...options, horizontalScrolling };
            }
            if (e.affectsConfiguration(scrollByPageKey)) {
                const scrollByPage = Boolean(configurationService.getValue(scrollByPageKey));
                options = { ...options, scrollByPage };
            }
            if (e.affectsConfiguration(listSmoothScrolling)) {
                const smoothScrolling = Boolean(configurationService.getValue(listSmoothScrolling));
                options = { ...options, smoothScrolling };
            }
            if (e.affectsConfiguration(mouseWheelScrollSensitivityKey)) {
                const mouseWheelScrollSensitivity = configurationService.getValue(mouseWheelScrollSensitivityKey);
                options = { ...options, mouseWheelScrollSensitivity };
            }
            if (e.affectsConfiguration(fastScrollSensitivityKey)) {
                const fastScrollSensitivity = configurationService.getValue(fastScrollSensitivityKey);
                options = { ...options, fastScrollSensitivity };
            }
            if (Object.keys(options).length > 0) {
                this.updateOptions(options);
            }
        }));
        this.navigator = new ListResourceNavigator(this, { configurationService, ...options });
        this.disposables.add(this.navigator);
    }
    updateOptions(options) {
        super.updateOptions(options);
        if (options.overrideStyles !== undefined) {
            this.updateStyles(options.overrideStyles);
        }
        if (options.multipleSelectionSupport !== undefined) {
            this.listSupportsMultiSelect.set(!!options.multipleSelectionSupport);
        }
    }
    updateStyles(styles) {
        this.style(styles ? getListStyles(styles) : defaultListStyles);
    }
    get useAltAsMultipleSelectionModifier() {
        return this._useAltAsMultipleSelectionModifier;
    }
    dispose() {
        this.disposables.dispose();
        super.dispose();
    }
};
WorkbenchPagedList = __decorate([
    __param(5, IContextKeyService),
    __param(6, IListService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService)
], WorkbenchPagedList);
export { WorkbenchPagedList };
let WorkbenchTable = class WorkbenchTable extends Table {
    get onDidOpen() {
        return this.navigator.onDidOpen;
    }
    constructor(user, container, delegate, columns, renderers, options, contextKeyService, listService, configurationService, instantiationService) {
        const horizontalScrolling = typeof options.horizontalScrolling !== 'undefined'
            ? options.horizontalScrolling
            : Boolean(configurationService.getValue(horizontalScrollingKey));
        const [workbenchListOptions, workbenchListOptionsDisposable] = instantiationService.invokeFunction(toWorkbenchListOptions, options);
        super(user, container, delegate, columns, renderers, {
            keyboardSupport: false,
            ...workbenchListOptions,
            horizontalScrolling,
        });
        this.disposables.add(workbenchListOptionsDisposable);
        this.contextKeyService = createScopedContextKeyService(contextKeyService, this);
        this.disposables.add(createScrollObserver(this.contextKeyService, this));
        this.listSupportsMultiSelect = WorkbenchListSupportsMultiSelectContextKey.bindTo(this.contextKeyService);
        this.listSupportsMultiSelect.set(options.multipleSelectionSupport !== false);
        const listSelectionNavigation = WorkbenchListSelectionNavigation.bindTo(this.contextKeyService);
        listSelectionNavigation.set(Boolean(options.selectionNavigation));
        this.listHasSelectionOrFocus = WorkbenchListHasSelectionOrFocus.bindTo(this.contextKeyService);
        this.listDoubleSelection = WorkbenchListDoubleSelection.bindTo(this.contextKeyService);
        this.listMultiSelection = WorkbenchListMultiSelection.bindTo(this.contextKeyService);
        this.horizontalScrolling = options.horizontalScrolling;
        this._useAltAsMultipleSelectionModifier =
            useAltAsMultipleSelectionModifier(configurationService);
        this.disposables.add(this.contextKeyService);
        this.disposables.add(listService.register(this));
        this.updateStyles(options.overrideStyles);
        this.disposables.add(this.onDidChangeSelection(() => {
            const selection = this.getSelection();
            const focus = this.getFocus();
            this.contextKeyService.bufferChangeEvents(() => {
                this.listHasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
                this.listMultiSelection.set(selection.length > 1);
                this.listDoubleSelection.set(selection.length === 2);
            });
        }));
        this.disposables.add(this.onDidChangeFocus(() => {
            const selection = this.getSelection();
            const focus = this.getFocus();
            this.listHasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
        }));
        this.disposables.add(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
                this._useAltAsMultipleSelectionModifier =
                    useAltAsMultipleSelectionModifier(configurationService);
            }
            let options = {};
            if (e.affectsConfiguration(horizontalScrollingKey) &&
                this.horizontalScrolling === undefined) {
                const horizontalScrolling = Boolean(configurationService.getValue(horizontalScrollingKey));
                options = { ...options, horizontalScrolling };
            }
            if (e.affectsConfiguration(scrollByPageKey)) {
                const scrollByPage = Boolean(configurationService.getValue(scrollByPageKey));
                options = { ...options, scrollByPage };
            }
            if (e.affectsConfiguration(listSmoothScrolling)) {
                const smoothScrolling = Boolean(configurationService.getValue(listSmoothScrolling));
                options = { ...options, smoothScrolling };
            }
            if (e.affectsConfiguration(mouseWheelScrollSensitivityKey)) {
                const mouseWheelScrollSensitivity = configurationService.getValue(mouseWheelScrollSensitivityKey);
                options = { ...options, mouseWheelScrollSensitivity };
            }
            if (e.affectsConfiguration(fastScrollSensitivityKey)) {
                const fastScrollSensitivity = configurationService.getValue(fastScrollSensitivityKey);
                options = { ...options, fastScrollSensitivity };
            }
            if (Object.keys(options).length > 0) {
                this.updateOptions(options);
            }
        }));
        this.navigator = new TableResourceNavigator(this, { configurationService, ...options });
        this.disposables.add(this.navigator);
    }
    updateOptions(options) {
        super.updateOptions(options);
        if (options.overrideStyles !== undefined) {
            this.updateStyles(options.overrideStyles);
        }
        if (options.multipleSelectionSupport !== undefined) {
            this.listSupportsMultiSelect.set(!!options.multipleSelectionSupport);
        }
    }
    updateStyles(styles) {
        this.style(styles ? getListStyles(styles) : defaultListStyles);
    }
    get useAltAsMultipleSelectionModifier() {
        return this._useAltAsMultipleSelectionModifier;
    }
    dispose() {
        this.disposables.dispose();
        super.dispose();
    }
};
WorkbenchTable = __decorate([
    __param(6, IContextKeyService),
    __param(7, IListService),
    __param(8, IConfigurationService),
    __param(9, IInstantiationService)
], WorkbenchTable);
export { WorkbenchTable };
export function getSelectionKeyboardEvent(typeArg = 'keydown', preserveFocus, pinned) {
    const e = new KeyboardEvent(typeArg);
    e.preserveFocus = preserveFocus;
    e.pinned = pinned;
    e.__forceEvent = true;
    return e;
}
class ResourceNavigator extends Disposable {
    constructor(widget, options) {
        super();
        this.widget = widget;
        this._onDidOpen = this._register(new Emitter());
        this.onDidOpen = this._onDidOpen.event;
        this._register(Event.filter(this.widget.onDidChangeSelection, (e) => isKeyboardEvent(e.browserEvent))((e) => this.onSelectionFromKeyboard(e)));
        this._register(this.widget.onPointer((e) => this.onPointer(e.element, e.browserEvent)));
        this._register(this.widget.onMouseDblClick((e) => this.onMouseDblClick(e.element, e.browserEvent)));
        if (typeof options?.openOnSingleClick !== 'boolean' && options?.configurationService) {
            this.openOnSingleClick =
                options?.configurationService.getValue(openModeSettingKey) !== 'doubleClick';
            this._register(options?.configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(openModeSettingKey)) {
                    this.openOnSingleClick =
                        options?.configurationService.getValue(openModeSettingKey) !== 'doubleClick';
                }
            }));
        }
        else {
            this.openOnSingleClick = options?.openOnSingleClick ?? true;
        }
    }
    onSelectionFromKeyboard(event) {
        if (event.elements.length !== 1) {
            return;
        }
        const selectionKeyboardEvent = event.browserEvent;
        const preserveFocus = typeof selectionKeyboardEvent.preserveFocus === 'boolean'
            ? selectionKeyboardEvent.preserveFocus
            : true;
        const pinned = typeof selectionKeyboardEvent.pinned === 'boolean'
            ? selectionKeyboardEvent.pinned
            : !preserveFocus;
        const sideBySide = false;
        this._open(this.getSelectedElement(), preserveFocus, pinned, sideBySide, event.browserEvent);
    }
    onPointer(element, browserEvent) {
        if (!this.openOnSingleClick) {
            return;
        }
        const isDoubleClick = browserEvent.detail === 2;
        if (isDoubleClick) {
            return;
        }
        const isMiddleClick = browserEvent.button === 1;
        const preserveFocus = true;
        const pinned = isMiddleClick;
        const sideBySide = browserEvent.ctrlKey || browserEvent.metaKey || browserEvent.altKey;
        this._open(element, preserveFocus, pinned, sideBySide, browserEvent);
    }
    onMouseDblClick(element, browserEvent) {
        if (!browserEvent) {
            return;
        }
        // copied from AbstractTree
        const target = browserEvent.target;
        const onTwistie = target.classList.contains('monaco-tl-twistie') ||
            (target.classList.contains('monaco-icon-label') &&
                target.classList.contains('folder-icon') &&
                browserEvent.offsetX < 16);
        if (onTwistie) {
            return;
        }
        const preserveFocus = false;
        const pinned = true;
        const sideBySide = browserEvent.ctrlKey || browserEvent.metaKey || browserEvent.altKey;
        this._open(element, preserveFocus, pinned, sideBySide, browserEvent);
    }
    _open(element, preserveFocus, pinned, sideBySide, browserEvent) {
        if (!element) {
            return;
        }
        this._onDidOpen.fire({
            editorOptions: {
                preserveFocus,
                pinned,
                revealIfVisible: true,
            },
            sideBySide,
            element,
            browserEvent,
        });
    }
}
class ListResourceNavigator extends ResourceNavigator {
    constructor(widget, options) {
        super(widget, options);
        this.widget = widget;
    }
    getSelectedElement() {
        return this.widget.getSelectedElements()[0];
    }
}
class TableResourceNavigator extends ResourceNavigator {
    constructor(widget, options) {
        super(widget, options);
    }
    getSelectedElement() {
        return this.widget.getSelectedElements()[0];
    }
}
class TreeResourceNavigator extends ResourceNavigator {
    constructor(widget, options) {
        super(widget, options);
    }
    getSelectedElement() {
        return this.widget.getSelection()[0] ?? undefined;
    }
}
function createKeyboardNavigationEventFilter(keybindingService) {
    let inMultiChord = false;
    return (event) => {
        if (event.toKeyCodeChord().isModifierKey()) {
            return false;
        }
        if (inMultiChord) {
            inMultiChord = false;
            return false;
        }
        const result = keybindingService.softDispatch(event, event.target);
        if (result.kind === 1 /* ResultKind.MoreChordsNeeded */) {
            inMultiChord = true;
            return false;
        }
        inMultiChord = false;
        return result.kind === 0 /* ResultKind.NoMatchingKb */;
    };
}
let WorkbenchObjectTree = class WorkbenchObjectTree extends ObjectTree {
    get contextKeyService() {
        return this.internals.contextKeyService;
    }
    get useAltAsMultipleSelectionModifier() {
        return this.internals.useAltAsMultipleSelectionModifier;
    }
    get onDidOpen() {
        return this.internals.onDidOpen;
    }
    constructor(user, container, delegate, renderers, options, instantiationService, contextKeyService, listService, configurationService) {
        const { options: treeOptions, getTypeNavigationMode, disposable, } = instantiationService.invokeFunction(workbenchTreeDataPreamble, options);
        super(user, container, delegate, renderers, treeOptions);
        this.disposables.add(disposable);
        this.internals = new WorkbenchTreeInternals(this, options, getTypeNavigationMode, options.overrideStyles, contextKeyService, listService, configurationService);
        this.disposables.add(this.internals);
    }
    updateOptions(options) {
        super.updateOptions(options);
        this.internals.updateOptions(options);
    }
};
WorkbenchObjectTree = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IListService),
    __param(8, IConfigurationService)
], WorkbenchObjectTree);
export { WorkbenchObjectTree };
let WorkbenchCompressibleObjectTree = class WorkbenchCompressibleObjectTree extends CompressibleObjectTree {
    get contextKeyService() {
        return this.internals.contextKeyService;
    }
    get useAltAsMultipleSelectionModifier() {
        return this.internals.useAltAsMultipleSelectionModifier;
    }
    get onDidOpen() {
        return this.internals.onDidOpen;
    }
    constructor(user, container, delegate, renderers, options, instantiationService, contextKeyService, listService, configurationService) {
        const { options: treeOptions, getTypeNavigationMode, disposable, } = instantiationService.invokeFunction(workbenchTreeDataPreamble, options);
        super(user, container, delegate, renderers, treeOptions);
        this.disposables.add(disposable);
        this.internals = new WorkbenchTreeInternals(this, options, getTypeNavigationMode, options.overrideStyles, contextKeyService, listService, configurationService);
        this.disposables.add(this.internals);
    }
    updateOptions(options = {}) {
        super.updateOptions(options);
        if (options.overrideStyles) {
            this.internals.updateStyleOverrides(options.overrideStyles);
        }
        this.internals.updateOptions(options);
    }
};
WorkbenchCompressibleObjectTree = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IListService),
    __param(8, IConfigurationService)
], WorkbenchCompressibleObjectTree);
export { WorkbenchCompressibleObjectTree };
let WorkbenchDataTree = class WorkbenchDataTree extends DataTree {
    get contextKeyService() {
        return this.internals.contextKeyService;
    }
    get useAltAsMultipleSelectionModifier() {
        return this.internals.useAltAsMultipleSelectionModifier;
    }
    get onDidOpen() {
        return this.internals.onDidOpen;
    }
    constructor(user, container, delegate, renderers, dataSource, options, instantiationService, contextKeyService, listService, configurationService) {
        const { options: treeOptions, getTypeNavigationMode, disposable, } = instantiationService.invokeFunction(workbenchTreeDataPreamble, options);
        super(user, container, delegate, renderers, dataSource, treeOptions);
        this.disposables.add(disposable);
        this.internals = new WorkbenchTreeInternals(this, options, getTypeNavigationMode, options.overrideStyles, contextKeyService, listService, configurationService);
        this.disposables.add(this.internals);
    }
    updateOptions(options = {}) {
        super.updateOptions(options);
        if (options.overrideStyles !== undefined) {
            this.internals.updateStyleOverrides(options.overrideStyles);
        }
        this.internals.updateOptions(options);
    }
};
WorkbenchDataTree = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IListService),
    __param(9, IConfigurationService)
], WorkbenchDataTree);
export { WorkbenchDataTree };
let WorkbenchAsyncDataTree = class WorkbenchAsyncDataTree extends AsyncDataTree {
    get contextKeyService() {
        return this.internals.contextKeyService;
    }
    get useAltAsMultipleSelectionModifier() {
        return this.internals.useAltAsMultipleSelectionModifier;
    }
    get onDidOpen() {
        return this.internals.onDidOpen;
    }
    constructor(user, container, delegate, renderers, dataSource, options, instantiationService, contextKeyService, listService, configurationService) {
        const { options: treeOptions, getTypeNavigationMode, disposable, } = instantiationService.invokeFunction(workbenchTreeDataPreamble, options);
        super(user, container, delegate, renderers, dataSource, treeOptions);
        this.disposables.add(disposable);
        this.internals = new WorkbenchTreeInternals(this, options, getTypeNavigationMode, options.overrideStyles, contextKeyService, listService, configurationService);
        this.disposables.add(this.internals);
    }
    updateOptions(options = {}) {
        super.updateOptions(options);
        if (options.overrideStyles) {
            this.internals.updateStyleOverrides(options.overrideStyles);
        }
        this.internals.updateOptions(options);
    }
};
WorkbenchAsyncDataTree = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IListService),
    __param(9, IConfigurationService)
], WorkbenchAsyncDataTree);
export { WorkbenchAsyncDataTree };
let WorkbenchCompressibleAsyncDataTree = class WorkbenchCompressibleAsyncDataTree extends CompressibleAsyncDataTree {
    get contextKeyService() {
        return this.internals.contextKeyService;
    }
    get useAltAsMultipleSelectionModifier() {
        return this.internals.useAltAsMultipleSelectionModifier;
    }
    get onDidOpen() {
        return this.internals.onDidOpen;
    }
    constructor(user, container, virtualDelegate, compressionDelegate, renderers, dataSource, options, instantiationService, contextKeyService, listService, configurationService) {
        const { options: treeOptions, getTypeNavigationMode, disposable, } = instantiationService.invokeFunction(workbenchTreeDataPreamble, options);
        super(user, container, virtualDelegate, compressionDelegate, renderers, dataSource, treeOptions);
        this.disposables.add(disposable);
        this.internals = new WorkbenchTreeInternals(this, options, getTypeNavigationMode, options.overrideStyles, contextKeyService, listService, configurationService);
        this.disposables.add(this.internals);
    }
    updateOptions(options) {
        super.updateOptions(options);
        this.internals.updateOptions(options);
    }
};
WorkbenchCompressibleAsyncDataTree = __decorate([
    __param(7, IInstantiationService),
    __param(8, IContextKeyService),
    __param(9, IListService),
    __param(10, IConfigurationService)
], WorkbenchCompressibleAsyncDataTree);
export { WorkbenchCompressibleAsyncDataTree };
function getDefaultTreeFindMode(configurationService) {
    const value = configurationService.getValue(defaultFindModeSettingKey);
    if (value === 'highlight') {
        return TreeFindMode.Highlight;
    }
    else if (value === 'filter') {
        return TreeFindMode.Filter;
    }
    const deprecatedValue = configurationService.getValue(keyboardNavigationSettingKey);
    if (deprecatedValue === 'simple' || deprecatedValue === 'highlight') {
        return TreeFindMode.Highlight;
    }
    else if (deprecatedValue === 'filter') {
        return TreeFindMode.Filter;
    }
    return undefined;
}
function getDefaultTreeFindMatchType(configurationService) {
    const value = configurationService.getValue(defaultFindMatchTypeSettingKey);
    if (value === 'fuzzy') {
        return TreeFindMatchType.Fuzzy;
    }
    else if (value === 'contiguous') {
        return TreeFindMatchType.Contiguous;
    }
    return undefined;
}
function workbenchTreeDataPreamble(accessor, options) {
    const configurationService = accessor.get(IConfigurationService);
    const contextViewService = accessor.get(IContextViewService);
    const contextKeyService = accessor.get(IContextKeyService);
    const instantiationService = accessor.get(IInstantiationService);
    const getTypeNavigationMode = () => {
        // give priority to the context key value to specify a value
        const modeString = contextKeyService.getContextKeyValue(WorkbenchListTypeNavigationModeKey);
        if (modeString === 'automatic') {
            return TypeNavigationMode.Automatic;
        }
        else if (modeString === 'trigger') {
            return TypeNavigationMode.Trigger;
        }
        // also check the deprecated context key to set the mode to 'trigger'
        const modeBoolean = contextKeyService.getContextKeyValue(WorkbenchListAutomaticKeyboardNavigationLegacyKey);
        if (modeBoolean === false) {
            return TypeNavigationMode.Trigger;
        }
        // finally, check the setting
        const configString = configurationService.getValue(typeNavigationModeSettingKey);
        if (configString === 'automatic') {
            return TypeNavigationMode.Automatic;
        }
        else if (configString === 'trigger') {
            return TypeNavigationMode.Trigger;
        }
        return undefined;
    };
    const horizontalScrolling = options.horizontalScrolling !== undefined
        ? options.horizontalScrolling
        : Boolean(configurationService.getValue(horizontalScrollingKey));
    const [workbenchListOptions, disposable] = instantiationService.invokeFunction(toWorkbenchListOptions, options);
    const paddingBottom = options.paddingBottom;
    const renderIndentGuides = options.renderIndentGuides !== undefined
        ? options.renderIndentGuides
        : configurationService.getValue(treeRenderIndentGuidesKey);
    return {
        getTypeNavigationMode,
        disposable,
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        options: {
            // ...options, // TODO@Joao why is this not splatted here?
            keyboardSupport: false,
            ...workbenchListOptions,
            indent: typeof configurationService.getValue(treeIndentKey) === 'number'
                ? configurationService.getValue(treeIndentKey)
                : undefined,
            renderIndentGuides,
            smoothScrolling: Boolean(configurationService.getValue(listSmoothScrolling)),
            defaultFindMode: getDefaultTreeFindMode(configurationService),
            defaultFindMatchType: getDefaultTreeFindMatchType(configurationService),
            horizontalScrolling,
            scrollByPage: Boolean(configurationService.getValue(scrollByPageKey)),
            paddingBottom: paddingBottom,
            hideTwistiesOfChildlessElements: options.hideTwistiesOfChildlessElements,
            expandOnlyOnTwistieClick: options.expandOnlyOnTwistieClick ??
                configurationService.getValue(treeExpandMode) ===
                    'doubleClick',
            contextViewProvider: contextViewService,
            findWidgetStyles: defaultFindWidgetStyles,
            enableStickyScroll: Boolean(configurationService.getValue(treeStickyScroll)),
            stickyScrollMaxItemCount: Number(configurationService.getValue(treeStickyScrollMaxElements)),
        },
    };
}
let WorkbenchTreeInternals = class WorkbenchTreeInternals {
    get onDidOpen() {
        return this.navigator.onDidOpen;
    }
    constructor(tree, options, getTypeNavigationMode, overrideStyles, contextKeyService, listService, configurationService) {
        this.tree = tree;
        this.disposables = [];
        this.contextKeyService = createScopedContextKeyService(contextKeyService, tree);
        this.disposables.push(createScrollObserver(this.contextKeyService, tree));
        this.listSupportsMultiSelect = WorkbenchListSupportsMultiSelectContextKey.bindTo(this.contextKeyService);
        this.listSupportsMultiSelect.set(options.multipleSelectionSupport !== false);
        const listSelectionNavigation = WorkbenchListSelectionNavigation.bindTo(this.contextKeyService);
        listSelectionNavigation.set(Boolean(options.selectionNavigation));
        this.listSupportFindWidget = WorkbenchListSupportsFind.bindTo(this.contextKeyService);
        this.listSupportFindWidget.set(options.findWidgetEnabled ?? true);
        this.hasSelectionOrFocus = WorkbenchListHasSelectionOrFocus.bindTo(this.contextKeyService);
        this.hasDoubleSelection = WorkbenchListDoubleSelection.bindTo(this.contextKeyService);
        this.hasMultiSelection = WorkbenchListMultiSelection.bindTo(this.contextKeyService);
        this.treeElementCanCollapse = WorkbenchTreeElementCanCollapse.bindTo(this.contextKeyService);
        this.treeElementHasParent = WorkbenchTreeElementHasParent.bindTo(this.contextKeyService);
        this.treeElementCanExpand = WorkbenchTreeElementCanExpand.bindTo(this.contextKeyService);
        this.treeElementHasChild = WorkbenchTreeElementHasChild.bindTo(this.contextKeyService);
        this.treeFindOpen = WorkbenchTreeFindOpen.bindTo(this.contextKeyService);
        this.treeStickyScrollFocused = WorkbenchTreeStickyScrollFocused.bindTo(this.contextKeyService);
        this._useAltAsMultipleSelectionModifier =
            useAltAsMultipleSelectionModifier(configurationService);
        this.updateStyleOverrides(overrideStyles);
        const updateCollapseContextKeys = () => {
            const focus = tree.getFocus()[0];
            if (!focus) {
                return;
            }
            const node = tree.getNode(focus);
            this.treeElementCanCollapse.set(node.collapsible && !node.collapsed);
            this.treeElementHasParent.set(!!tree.getParentElement(focus));
            this.treeElementCanExpand.set(node.collapsible && node.collapsed);
            this.treeElementHasChild.set(!!tree.getFirstElementChild(focus));
        };
        const interestingContextKeys = new Set();
        interestingContextKeys.add(WorkbenchListTypeNavigationModeKey);
        interestingContextKeys.add(WorkbenchListAutomaticKeyboardNavigationLegacyKey);
        this.disposables.push(this.contextKeyService, listService.register(tree), tree.onDidChangeSelection(() => {
            const selection = tree.getSelection();
            const focus = tree.getFocus();
            this.contextKeyService.bufferChangeEvents(() => {
                this.hasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
                this.hasMultiSelection.set(selection.length > 1);
                this.hasDoubleSelection.set(selection.length === 2);
            });
        }), tree.onDidChangeFocus(() => {
            const selection = tree.getSelection();
            const focus = tree.getFocus();
            this.hasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
            updateCollapseContextKeys();
        }), tree.onDidChangeCollapseState(updateCollapseContextKeys), tree.onDidChangeModel(updateCollapseContextKeys), tree.onDidChangeFindOpenState((enabled) => this.treeFindOpen.set(enabled)), tree.onDidChangeStickyScrollFocused((focused) => this.treeStickyScrollFocused.set(focused)), configurationService.onDidChangeConfiguration((e) => {
            let newOptions = {};
            if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
                this._useAltAsMultipleSelectionModifier =
                    useAltAsMultipleSelectionModifier(configurationService);
            }
            if (e.affectsConfiguration(treeIndentKey)) {
                const indent = configurationService.getValue(treeIndentKey);
                newOptions = { ...newOptions, indent };
            }
            if (e.affectsConfiguration(treeRenderIndentGuidesKey) &&
                options.renderIndentGuides === undefined) {
                const renderIndentGuides = configurationService.getValue(treeRenderIndentGuidesKey);
                newOptions = { ...newOptions, renderIndentGuides };
            }
            if (e.affectsConfiguration(listSmoothScrolling)) {
                const smoothScrolling = Boolean(configurationService.getValue(listSmoothScrolling));
                newOptions = { ...newOptions, smoothScrolling };
            }
            if (e.affectsConfiguration(defaultFindModeSettingKey) ||
                e.affectsConfiguration(keyboardNavigationSettingKey)) {
                const defaultFindMode = getDefaultTreeFindMode(configurationService);
                newOptions = { ...newOptions, defaultFindMode };
            }
            if (e.affectsConfiguration(typeNavigationModeSettingKey) ||
                e.affectsConfiguration(keyboardNavigationSettingKey)) {
                const typeNavigationMode = getTypeNavigationMode();
                newOptions = { ...newOptions, typeNavigationMode };
            }
            if (e.affectsConfiguration(defaultFindMatchTypeSettingKey)) {
                const defaultFindMatchType = getDefaultTreeFindMatchType(configurationService);
                newOptions = { ...newOptions, defaultFindMatchType };
            }
            if (e.affectsConfiguration(horizontalScrollingKey) &&
                options.horizontalScrolling === undefined) {
                const horizontalScrolling = Boolean(configurationService.getValue(horizontalScrollingKey));
                newOptions = { ...newOptions, horizontalScrolling };
            }
            if (e.affectsConfiguration(scrollByPageKey)) {
                const scrollByPage = Boolean(configurationService.getValue(scrollByPageKey));
                newOptions = { ...newOptions, scrollByPage };
            }
            if (e.affectsConfiguration(treeExpandMode) &&
                options.expandOnlyOnTwistieClick === undefined) {
                newOptions = {
                    ...newOptions,
                    expandOnlyOnTwistieClick: configurationService.getValue(treeExpandMode) ===
                        'doubleClick',
                };
            }
            if (e.affectsConfiguration(treeStickyScroll)) {
                const enableStickyScroll = configurationService.getValue(treeStickyScroll);
                newOptions = { ...newOptions, enableStickyScroll };
            }
            if (e.affectsConfiguration(treeStickyScrollMaxElements)) {
                const stickyScrollMaxItemCount = Math.max(1, configurationService.getValue(treeStickyScrollMaxElements));
                newOptions = { ...newOptions, stickyScrollMaxItemCount };
            }
            if (e.affectsConfiguration(mouseWheelScrollSensitivityKey)) {
                const mouseWheelScrollSensitivity = configurationService.getValue(mouseWheelScrollSensitivityKey);
                newOptions = { ...newOptions, mouseWheelScrollSensitivity };
            }
            if (e.affectsConfiguration(fastScrollSensitivityKey)) {
                const fastScrollSensitivity = configurationService.getValue(fastScrollSensitivityKey);
                newOptions = { ...newOptions, fastScrollSensitivity };
            }
            if (Object.keys(newOptions).length > 0) {
                tree.updateOptions(newOptions);
            }
        }), this.contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(interestingContextKeys)) {
                tree.updateOptions({ typeNavigationMode: getTypeNavigationMode() });
            }
        }));
        this.navigator = new TreeResourceNavigator(tree, { configurationService, ...options });
        this.disposables.push(this.navigator);
    }
    get useAltAsMultipleSelectionModifier() {
        return this._useAltAsMultipleSelectionModifier;
    }
    updateOptions(options) {
        if (options.multipleSelectionSupport !== undefined) {
            this.listSupportsMultiSelect.set(!!options.multipleSelectionSupport);
        }
    }
    updateStyleOverrides(overrideStyles) {
        this.tree.style(overrideStyles ? getListStyles(overrideStyles) : defaultListStyles);
    }
    dispose() {
        this.disposables = dispose(this.disposables);
    }
};
WorkbenchTreeInternals = __decorate([
    __param(4, IContextKeyService),
    __param(5, IListService),
    __param(6, IConfigurationService)
], WorkbenchTreeInternals);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'workbench',
    order: 7,
    title: localize('workbenchConfigurationTitle', 'Workbench'),
    type: 'object',
    properties: {
        [multiSelectModifierSettingKey]: {
            type: 'string',
            enum: ['ctrlCmd', 'alt'],
            markdownEnumDescriptions: [
                localize('multiSelectModifier.ctrlCmd', 'Maps to `Control` on Windows and Linux and to `Command` on macOS.'),
                localize('multiSelectModifier.alt', 'Maps to `Alt` on Windows and Linux and to `Option` on macOS.'),
            ],
            default: 'ctrlCmd',
            description: localize({
                key: 'multiSelectModifier',
                comment: [
                    '- `ctrlCmd` refers to a value the setting can take and should not be localized.',
                    '- `Control` and `Command` refer to the modifier keys Ctrl or Cmd on the keyboard and can be localized.',
                ],
            }, "The modifier to be used to add an item in trees and lists to a multi-selection with the mouse (for example in the explorer, open editors and scm view). The 'Open to Side' mouse gestures - if supported - will adapt such that they do not conflict with the multiselect modifier."),
        },
        [openModeSettingKey]: {
            type: 'string',
            enum: ['singleClick', 'doubleClick'],
            default: 'singleClick',
            description: localize({
                key: 'openModeModifier',
                comment: [
                    '`singleClick` and `doubleClick` refers to a value the setting can take and should not be localized.',
                ],
            }, 'Controls how to open items in trees and lists using the mouse (if supported). Note that some trees and lists might choose to ignore this setting if it is not applicable.'),
        },
        [horizontalScrollingKey]: {
            type: 'boolean',
            default: false,
            description: localize('horizontalScrolling setting', 'Controls whether lists and trees support horizontal scrolling in the workbench. Warning: turning on this setting has a performance implication.'),
        },
        [scrollByPageKey]: {
            type: 'boolean',
            default: false,
            description: localize('list.scrollByPage', 'Controls whether clicks in the scrollbar scroll page by page.'),
        },
        [treeIndentKey]: {
            type: 'number',
            default: 8,
            minimum: 4,
            maximum: 40,
            description: localize('tree indent setting', 'Controls tree indentation in pixels.'),
        },
        [treeRenderIndentGuidesKey]: {
            type: 'string',
            enum: ['none', 'onHover', 'always'],
            default: 'onHover',
            description: localize('render tree indent guides', 'Controls whether the tree should render indent guides.'),
        },
        [listSmoothScrolling]: {
            type: 'boolean',
            default: false,
            description: localize('list smoothScrolling setting', 'Controls whether lists and trees have smooth scrolling.'),
        },
        [mouseWheelScrollSensitivityKey]: {
            type: 'number',
            default: 1,
            markdownDescription: localize('Mouse Wheel Scroll Sensitivity', 'A multiplier to be used on the `deltaX` and `deltaY` of mouse wheel scroll events.'),
        },
        [fastScrollSensitivityKey]: {
            type: 'number',
            default: 5,
            markdownDescription: localize('Fast Scroll Sensitivity', 'Scrolling speed multiplier when pressing `Alt`.'),
        },
        [defaultFindModeSettingKey]: {
            type: 'string',
            enum: ['highlight', 'filter'],
            enumDescriptions: [
                localize('defaultFindModeSettingKey.highlight', 'Highlight elements when searching. Further up and down navigation will traverse only the highlighted elements.'),
                localize('defaultFindModeSettingKey.filter', 'Filter elements when searching.'),
            ],
            default: 'highlight',
            description: localize('defaultFindModeSettingKey', 'Controls the default find mode for lists and trees in the workbench.'),
        },
        [keyboardNavigationSettingKey]: {
            type: 'string',
            enum: ['simple', 'highlight', 'filter'],
            enumDescriptions: [
                localize('keyboardNavigationSettingKey.simple', 'Simple keyboard navigation focuses elements which match the keyboard input. Matching is done only on prefixes.'),
                localize('keyboardNavigationSettingKey.highlight', 'Highlight keyboard navigation highlights elements which match the keyboard input. Further up and down navigation will traverse only the highlighted elements.'),
                localize('keyboardNavigationSettingKey.filter', 'Filter keyboard navigation will filter out and hide all the elements which do not match the keyboard input.'),
            ],
            default: 'highlight',
            description: localize('keyboardNavigationSettingKey', 'Controls the keyboard navigation style for lists and trees in the workbench. Can be simple, highlight and filter.'),
            deprecated: true,
            deprecationMessage: localize('keyboardNavigationSettingKeyDeprecated', "Please use 'workbench.list.defaultFindMode' and	'workbench.list.typeNavigationMode' instead."),
        },
        [defaultFindMatchTypeSettingKey]: {
            type: 'string',
            enum: ['fuzzy', 'contiguous'],
            enumDescriptions: [
                localize('defaultFindMatchTypeSettingKey.fuzzy', 'Use fuzzy matching when searching.'),
                localize('defaultFindMatchTypeSettingKey.contiguous', 'Use contiguous matching when searching.'),
            ],
            default: 'fuzzy',
            description: localize('defaultFindMatchTypeSettingKey', 'Controls the type of matching used when searching lists and trees in the workbench.'),
        },
        [treeExpandMode]: {
            type: 'string',
            enum: ['singleClick', 'doubleClick'],
            default: 'singleClick',
            description: localize('expand mode', 'Controls how tree folders are expanded when clicking the folder names. Note that some trees and lists might choose to ignore this setting if it is not applicable.'),
        },
        [treeStickyScroll]: {
            type: 'boolean',
            default: true,
            description: localize('sticky scroll', 'Controls whether sticky scrolling is enabled in trees.'),
        },
        [treeStickyScrollMaxElements]: {
            type: 'number',
            minimum: 1,
            default: 7,
            markdownDescription: localize('sticky scroll maximum items', 'Controls the number of sticky elements displayed in the tree when {0} is enabled.', '`#workbench.tree.enableStickyScroll#`'),
        },
        [typeNavigationModeSettingKey]: {
            type: 'string',
            enum: ['automatic', 'trigger'],
            default: 'automatic',
            markdownDescription: localize('typeNavigationMode2', 'Controls how type navigation works in lists and trees in the workbench. When set to `trigger`, type navigation begins once the `list.triggerTypeNavigation` command is run.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xpc3QvYnJvd3Nlci9saXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBUS9FLE9BQU8sRUFHTixTQUFTLEdBQ1QsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBT04sMkJBQTJCLEVBQzNCLDRCQUE0QixFQUM1QixJQUFJLEVBQ0osa0JBQWtCLEdBQ2xCLE1BQU0sNkNBQTZDLENBQUE7QUFNcEQsT0FBTyxFQUlOLEtBQUssR0FDTCxNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFJTixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLGFBQWEsRUFDYix5QkFBeUIsR0FNekIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFvQixNQUFNLDJDQUEyQyxDQUFBO0FBQ3RGLE9BQU8sRUFDTixzQkFBc0IsRUFLdEIsVUFBVSxHQUNWLE1BQU0sNkNBQTZDLENBQUE7QUFPcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUVQLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUVy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