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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9saXN0L2Jyb3dzZXIvbGlzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQVEvRSxPQUFPLEVBR04sU0FBUyxHQUNULE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQU9OLDJCQUEyQixFQUMzQiw0QkFBNEIsRUFDNUIsSUFBSSxFQUNKLGtCQUFrQixHQUNsQixNQUFNLDZDQUE2QyxDQUFBO0FBTXBELE9BQU8sRUFJTixLQUFLLEdBQ0wsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBSU4saUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixhQUFhLEVBQ2IseUJBQXlCLEdBTXpCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBb0IsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN0RixPQUFPLEVBQ04sc0JBQXNCLEVBS3RCLFVBQVUsR0FDVixNQUFNLDZDQUE2QyxDQUFBO0FBT3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsZUFBZSxFQUNmLE9BQU8sRUFFUCxZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFB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