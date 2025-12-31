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
import { localize } from '../../../../../../nls.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { ToolBar } from '../../../../../../base/browser/ui/toolbar/toolbar.js';
import { IconLabel, } from '../../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { createMatches } from '../../../../../../base/common/filters.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { getIconClassesForLanguageId } from '../../../../../../editor/common/services/getIconClasses.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../../../platform/configuration/common/configurationRegistry.js';
import { IInstantiationService, } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { listErrorForeground, listWarningForeground, } from '../../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { Extensions as WorkbenchExtensions, } from '../../../../../common/contributions.js';
import { NotebookEditor } from '../../notebookEditor.js';
import { CellKind, NotebookCellsChangeType, NotebookSetting, } from '../../../common/notebookCommon.js';
import { IEditorService, SIDE_GROUP } from '../../../../../services/editor/common/editorService.js';
import { IOutlineService, } from '../../../../../services/outline/browser/outline.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { mainWindow } from '../../../../../../base/browser/window.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { Action2, IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2, } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { MenuEntryActionViewItem, getActionBarActions, } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Delayer, disposableTimeout } from '../../../../../../base/common/async.js';
import { IOutlinePane } from '../../../../outline/browser/outline.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR } from '../../../common/notebookContextKeys.js';
import { INotebookCellOutlineDataSourceFactory } from '../../viewModel/notebookOutlineDataSourceFactory.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
class NotebookOutlineTemplate {
    static { this.templateId = 'NotebookOutlineRenderer'; }
    constructor(container, iconClass, iconLabel, decoration, actionMenu, elementDisposables) {
        this.container = container;
        this.iconClass = iconClass;
        this.iconLabel = iconLabel;
        this.decoration = decoration;
        this.actionMenu = actionMenu;
        this.elementDisposables = elementDisposables;
    }
}
let NotebookOutlineRenderer = class NotebookOutlineRenderer {
    constructor(_editor, _target, _themeService, _configurationService, _contextMenuService, _contextKeyService, _menuService, _instantiationService) {
        this._editor = _editor;
        this._target = _target;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._instantiationService = _instantiationService;
        this.templateId = NotebookOutlineTemplate.templateId;
    }
    renderTemplate(container) {
        const elementDisposables = new DisposableStore();
        container.classList.add('notebook-outline-element', 'show-file-icons');
        const iconClass = document.createElement('div');
        container.append(iconClass);
        const iconLabel = new IconLabel(container, { supportHighlights: true });
        const decoration = document.createElement('div');
        decoration.className = 'element-decoration';
        container.append(decoration);
        const actionMenu = document.createElement('div');
        actionMenu.className = 'action-menu';
        container.append(actionMenu);
        return new NotebookOutlineTemplate(container, iconClass, iconLabel, decoration, actionMenu, elementDisposables);
    }
    renderElement(node, _index, template, _height) {
        const extraClasses = [];
        const options = {
            matches: createMatches(node.filterData),
            labelEscapeNewLines: true,
            extraClasses,
        };
        const isCodeCell = node.element.cell.cellKind === CellKind.Code;
        if (node.element.level >= 8) {
            // symbol
            template.iconClass.className =
                'element-icon ' + ThemeIcon.asClassNameArray(node.element.icon).join(' ');
        }
        else if (isCodeCell &&
            this._themeService.getFileIconTheme().hasFileIcons &&
            !node.element.isExecuting) {
            template.iconClass.className = '';
            extraClasses.push(...getIconClassesForLanguageId(node.element.cell.language ?? ''));
        }
        else {
            template.iconClass.className =
                'element-icon ' + ThemeIcon.asClassNameArray(node.element.icon).join(' ');
        }
        template.iconLabel.setLabel(' ' + node.element.label, undefined, options);
        const { markerInfo } = node.element;
        template.container.style.removeProperty('--outline-element-color');
        template.decoration.innerText = '';
        if (markerInfo) {
            const problem = this._configurationService.getValue('problems.visibility');
            const useBadges = this._configurationService.getValue("outline.problems.badges" /* OutlineConfigKeys.problemsBadges */);
            if (!useBadges || !problem) {
                template.decoration.classList.remove('bubble');
                template.decoration.innerText = '';
            }
            else if (markerInfo.count === 0) {
                template.decoration.classList.add('bubble');
                template.decoration.innerText = '\uea71';
            }
            else {
                template.decoration.classList.remove('bubble');
                template.decoration.innerText = markerInfo.count > 9 ? '9+' : String(markerInfo.count);
            }
            const color = this._themeService
                .getColorTheme()
                .getColor(markerInfo.topSev === MarkerSeverity.Error ? listErrorForeground : listWarningForeground);
            if (problem === undefined) {
                return;
            }
            const useColors = this._configurationService.getValue("outline.problems.colors" /* OutlineConfigKeys.problemsColors */);
            if (!useColors || !problem) {
                template.container.style.removeProperty('--outline-element-color');
                template.decoration.style.setProperty('--outline-element-color', color?.toString() ?? 'inherit');
            }
            else {
                template.container.style.setProperty('--outline-element-color', color?.toString() ?? 'inherit');
            }
        }
        if (this._target === 1 /* OutlineTarget.OutlinePane */) {
            if (!this._editor) {
                return;
            }
            const nbCell = node.element.cell;
            const nbViewModel = this._editor.getViewModel();
            if (!nbViewModel) {
                return;
            }
            const idx = nbViewModel.getCellIndex(nbCell);
            const length = isCodeCell ? 0 : nbViewModel.getFoldedLength(idx);
            const scopedContextKeyService = template.elementDisposables.add(this._contextKeyService.createScoped(template.container));
            NotebookOutlineContext.CellKind.bindTo(scopedContextKeyService).set(isCodeCell ? CellKind.Code : CellKind.Markup);
            NotebookOutlineContext.CellHasChildren.bindTo(scopedContextKeyService).set(length > 0);
            NotebookOutlineContext.CellHasHeader.bindTo(scopedContextKeyService).set(node.element.level !== 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */);
            NotebookOutlineContext.OutlineElementTarget.bindTo(scopedContextKeyService).set(this._target);
            this.setupFolding(isCodeCell, nbViewModel, scopedContextKeyService, template, nbCell);
            const outlineEntryToolbar = template.elementDisposables.add(new ToolBar(template.actionMenu, this._contextMenuService, {
                actionViewItemProvider: (action) => {
                    if (action instanceof MenuItemAction) {
                        return this._instantiationService.createInstance(MenuEntryActionViewItem, action, undefined);
                    }
                    return undefined;
                },
            }));
            const menu = template.elementDisposables.add(this._menuService.createMenu(MenuId.NotebookOutlineActionMenu, scopedContextKeyService));
            const actions = getOutlineToolbarActions(menu, {
                notebookEditor: this._editor,
                outlineEntry: node.element,
            });
            outlineEntryToolbar.setActions(actions.primary, actions.secondary);
            this.setupToolbarListeners(this._editor, outlineEntryToolbar, menu, actions, node.element, template);
            template.actionMenu.style.padding = '0 0.8em 0 0.4em';
        }
    }
    disposeTemplate(templateData) {
        templateData.iconLabel.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
        DOM.clearNode(templateData.actionMenu);
    }
    setupFolding(isCodeCell, nbViewModel, scopedContextKeyService, template, nbCell) {
        const foldingState = isCodeCell
            ? 0 /* CellFoldingState.None */
            : nbCell.foldingState;
        const foldingStateCtx = NotebookOutlineContext.CellFoldingState.bindTo(scopedContextKeyService);
        foldingStateCtx.set(foldingState);
        if (!isCodeCell) {
            template.elementDisposables.add(nbViewModel.onDidFoldingStateChanged(() => {
                const foldingState = nbCell.foldingState;
                NotebookOutlineContext.CellFoldingState.bindTo(scopedContextKeyService).set(foldingState);
                foldingStateCtx.set(foldingState);
            }));
        }
    }
    setupToolbarListeners(editor, toolbar, menu, initActions, entry, templateData) {
        // same fix as in cellToolbars setupListeners re #103926
        let dropdownIsVisible = false;
        let deferredUpdate;
        toolbar.setActions(initActions.primary, initActions.secondary);
        templateData.elementDisposables.add(menu.onDidChange(() => {
            if (dropdownIsVisible) {
                const actions = getOutlineToolbarActions(menu, {
                    notebookEditor: editor,
                    outlineEntry: entry,
                });
                deferredUpdate = () => toolbar.setActions(actions.primary, actions.secondary);
                return;
            }
            const actions = getOutlineToolbarActions(menu, {
                notebookEditor: editor,
                outlineEntry: entry,
            });
            toolbar.setActions(actions.primary, actions.secondary);
        }));
        templateData.container.classList.remove('notebook-outline-toolbar-dropdown-active');
        templateData.elementDisposables.add(toolbar.onDidChangeDropdownVisibility((visible) => {
            dropdownIsVisible = visible;
            if (visible) {
                templateData.container.classList.add('notebook-outline-toolbar-dropdown-active');
            }
            else {
                templateData.container.classList.remove('notebook-outline-toolbar-dropdown-active');
            }
            if (deferredUpdate && !visible) {
                disposableTimeout(() => {
                    deferredUpdate?.();
                }, 0, templateData.elementDisposables);
                deferredUpdate = undefined;
            }
        }));
    }
};
NotebookOutlineRenderer = __decorate([
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IMenuService),
    __param(7, IInstantiationService)
], NotebookOutlineRenderer);
function getOutlineToolbarActions(menu, args) {
    return getActionBarActions(menu.getActions({ shouldForwardArgs: true, arg: args }), (g) => /^inline/.test(g));
}
class NotebookOutlineAccessibility {
    getAriaLabel(element) {
        return element.label;
    }
    getWidgetAriaLabel() {
        return '';
    }
}
class NotebookNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.label;
    }
}
class NotebookOutlineVirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return NotebookOutlineTemplate.templateId;
    }
}
let NotebookQuickPickProvider = class NotebookQuickPickProvider {
    constructor(notebookCellOutlineDataSourceRef, _configurationService, _themeService) {
        this.notebookCellOutlineDataSourceRef = notebookCellOutlineDataSourceRef;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this._disposables = new DisposableStore();
        this.gotoShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.gotoSymbolsAllSymbols);
        this._disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.gotoSymbolsAllSymbols)) {
                this.gotoShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.gotoSymbolsAllSymbols);
            }
        }));
    }
    getQuickPickElements() {
        const bucket = [];
        for (const entry of this.notebookCellOutlineDataSourceRef?.object?.entries ?? []) {
            entry.asFlatList(bucket);
        }
        const result = [];
        const { hasFileIcons } = this._themeService.getFileIconTheme();
        const isSymbol = (element) => !!element.symbolKind;
        const isCodeCell = (element) => element.cell.cellKind === CellKind.Code &&
            element.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */; // code cell entries are exactly level 7 by this constant
        for (let i = 0; i < bucket.length; i++) {
            const element = bucket[i];
            const nextElement = bucket[i + 1]; // can be undefined
            if (!this.gotoShowCodeCellSymbols && isSymbol(element)) {
                continue;
            }
            if (this.gotoShowCodeCellSymbols &&
                isCodeCell(element) &&
                nextElement &&
                isSymbol(nextElement)) {
                continue;
            }
            const useFileIcon = hasFileIcons && !element.symbolKind;
            // todo@jrieken it is fishy that codicons cannot be used with iconClasses
            // but file icons can...
            result.push({
                element,
                label: useFileIcon ? element.label : `$(${element.icon.id}) ${element.label}`,
                ariaLabel: element.label,
                iconClasses: useFileIcon
                    ? getIconClassesForLanguageId(element.cell.language ?? '')
                    : undefined,
            });
        }
        return result;
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookQuickPickProvider = __decorate([
    __param(1, IConfigurationService),
    __param(2, IThemeService)
], NotebookQuickPickProvider);
export { NotebookQuickPickProvider };
/**
 * Checks if the given outline entry should be filtered out of the outlinePane
 *
 * @param entry the OutlineEntry to check
 * @param showMarkdownHeadersOnly whether to show only markdown headers
 * @param showCodeCells whether to show code cells
 * @param showCodeCellSymbols whether to show code cell symbols
 * @returns true if the entry should be filtered out of the outlinePane, false if the entry should be visible.
 */
function filterEntry(entry, showMarkdownHeadersOnly, showCodeCells, showCodeCellSymbols) {
    // if any are true, return true, this entry should NOT be included in the outline
    if ((showMarkdownHeadersOnly &&
        entry.cell.cellKind === CellKind.Markup &&
        entry.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) || // show headers only   + cell is mkdn + is level 7 (not header)
        (!showCodeCells && entry.cell.cellKind === CellKind.Code) || // show code cells off + cell is code
        (!showCodeCellSymbols &&
            entry.cell.cellKind === CellKind.Code &&
            entry.level > 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) // show symbols off    + cell is code + is level >7 (nb symbol levels)
    ) {
        return true;
    }
    return false;
}
let NotebookOutlinePaneProvider = class NotebookOutlinePaneProvider {
    constructor(outlineDataSourceRef, _configurationService) {
        this.outlineDataSourceRef = outlineDataSourceRef;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this.showCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        this.showCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        this.showMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        this._disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCells)) {
                this.showCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
            }
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols)) {
                this.showCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
            }
            if (e.affectsConfiguration(NotebookSetting.outlineShowMarkdownHeadersOnly)) {
                this.showMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
            }
        }));
    }
    getActiveEntry() {
        const newActive = this.outlineDataSourceRef?.object?.activeElement;
        if (!newActive) {
            return undefined;
        }
        if (!filterEntry(newActive, this.showMarkdownHeadersOnly, this.showCodeCells, this.showCodeCellSymbols)) {
            return newActive;
        }
        // find a valid parent
        let parent = newActive.parent;
        while (parent) {
            if (filterEntry(parent, this.showMarkdownHeadersOnly, this.showCodeCells, this.showCodeCellSymbols)) {
                parent = parent.parent;
            }
            else {
                return parent;
            }
        }
        // no valid parent found, return undefined
        return undefined;
    }
    *getChildren(element) {
        const isOutline = element instanceof NotebookCellOutline;
        const entries = isOutline
            ? (this.outlineDataSourceRef?.object?.entries ?? [])
            : element.children;
        for (const entry of entries) {
            if (entry.cell.cellKind === CellKind.Markup) {
                if (!this.showMarkdownHeadersOnly) {
                    yield entry;
                }
                else if (entry.level < 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) {
                    yield entry;
                }
            }
            else if (this.showCodeCells && entry.cell.cellKind === CellKind.Code) {
                if (this.showCodeCellSymbols) {
                    yield entry;
                }
                else if (entry.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) {
                    yield entry;
                }
            }
        }
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookOutlinePaneProvider = __decorate([
    __param(1, IConfigurationService)
], NotebookOutlinePaneProvider);
export { NotebookOutlinePaneProvider };
let NotebookBreadcrumbsProvider = class NotebookBreadcrumbsProvider {
    constructor(outlineDataSourceRef, _configurationService) {
        this.outlineDataSourceRef = outlineDataSourceRef;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this.showCodeCells = this._configurationService.getValue(NotebookSetting.breadcrumbsShowCodeCells);
        this._disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.breadcrumbsShowCodeCells)) {
                this.showCodeCells = this._configurationService.getValue(NotebookSetting.breadcrumbsShowCodeCells);
            }
        }));
    }
    getBreadcrumbElements() {
        const result = [];
        let candidate = this.outlineDataSourceRef?.object?.activeElement;
        while (candidate) {
            if (this.showCodeCells || candidate.cell.cellKind !== CellKind.Code) {
                result.unshift(candidate);
            }
            candidate = candidate.parent;
        }
        return result;
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookBreadcrumbsProvider = __decorate([
    __param(1, IConfigurationService)
], NotebookBreadcrumbsProvider);
export { NotebookBreadcrumbsProvider };
class NotebookComparator {
    constructor() {
        this._collator = new DOM.WindowIdleValue(mainWindow, () => new Intl.Collator(undefined, { numeric: true }));
    }
    compareByPosition(a, b) {
        return a.index - b.index;
    }
    compareByType(a, b) {
        return a.cell.cellKind - b.cell.cellKind || this._collator.value.compare(a.label, b.label);
    }
    compareByName(a, b) {
        return this._collator.value.compare(a.label, b.label);
    }
}
let NotebookCellOutline = class NotebookCellOutline {
    // getters
    get activeElement() {
        this.checkDelayer();
        if (this._target === 1 /* OutlineTarget.OutlinePane */) {
            return this.config.treeDataSource.getActiveEntry();
        }
        else {
            console.error('activeElement should not be called outside of the OutlinePane');
            return undefined;
        }
    }
    get entries() {
        this.checkDelayer();
        return this._outlineDataSourceReference?.object?.entries ?? [];
    }
    get uri() {
        return this._outlineDataSourceReference?.object?.uri;
    }
    get isEmpty() {
        if (!this._outlineDataSourceReference?.object?.entries) {
            return true;
        }
        return !this._outlineDataSourceReference.object.entries.some((entry) => {
            return !filterEntry(entry, this.outlineShowMarkdownHeadersOnly, this.outlineShowCodeCells, this.outlineShowCodeCellSymbols);
        });
    }
    checkDelayer() {
        if (this.delayerRecomputeState.isTriggered()) {
            this.delayerRecomputeState.cancel();
            this.recomputeState();
        }
    }
    constructor(_editor, _target, _themeService, _editorService, _instantiationService, _configurationService, _languageFeaturesService, _notebookExecutionStateService) {
        this._editor = _editor;
        this._target = _target;
        this._themeService = _themeService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.outlineKind = 'notebookCells';
        this._disposables = new DisposableStore();
        this._modelDisposables = new DisposableStore();
        this._dataSourceDisposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.delayerRecomputeState = this._disposables.add(new Delayer(300));
        this.delayerRecomputeActive = this._disposables.add(new Delayer(200));
        // this can be long, because it will force a recompute at the end, so ideally we only do this once all nb language features are registered
        this.delayerRecomputeSymbols = this._disposables.add(new Delayer(2000));
        this.outlineShowCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        this.outlineShowMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        this.initializeOutline();
        const delegate = new NotebookOutlineVirtualDelegate();
        const renderers = [
            this._instantiationService.createInstance(NotebookOutlineRenderer, this._editor.getControl(), this._target),
        ];
        const comparator = new NotebookComparator();
        const options = {
            collapseByDefault: this._target === 2 /* OutlineTarget.Breadcrumbs */ ||
                (this._target === 1 /* OutlineTarget.OutlinePane */ &&
                    this._configurationService.getValue("outline.collapseItems" /* OutlineConfigKeys.collapseItems */) ===
                        "alwaysCollapse" /* OutlineConfigCollapseItemsValues.Collapsed */),
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            accessibilityProvider: new NotebookOutlineAccessibility(),
            identityProvider: { getId: (element) => element.cell.uri.toString() },
            keyboardNavigationLabelProvider: new NotebookNavigationLabelProvider(),
        };
        this.config = {
            treeDataSource: this._treeDataSource,
            quickPickDataSource: this._quickPickDataSource,
            breadcrumbsDataSource: this._breadcrumbsDataSource,
            delegate,
            renderers,
            comparator,
            options,
        };
    }
    initializeOutline() {
        // initial setup
        this.setDataSources();
        this.setModelListeners();
        // reset the data sources + model listeners when we get a new notebook model
        this._disposables.add(this._editor.onDidChangeModel(() => {
            this.setDataSources();
            this.setModelListeners();
            this.computeSymbols();
        }));
        // recompute symbols as document symbol providers are updated in the language features registry
        this._disposables.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => {
            this.delayedComputeSymbols();
        }));
        // recompute active when the selection changes
        this._disposables.add(this._editor.onDidChangeSelection(() => {
            this.delayedRecomputeActive();
        }));
        // recompute state when filter config changes
        this._disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowMarkdownHeadersOnly) ||
                e.affectsConfiguration(NotebookSetting.outlineShowCodeCells) ||
                e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols) ||
                e.affectsConfiguration(NotebookSetting.breadcrumbsShowCodeCells)) {
                this.outlineShowCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
                this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
                this.outlineShowMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
                this.delayedRecomputeState();
            }
        }));
        // recompute state when execution states change
        this._disposables.add(this._notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell &&
                !!this._editor.textModel &&
                e.affectsNotebook(this._editor.textModel?.uri)) {
                this.delayedRecomputeState();
            }
        }));
        // recompute symbols when the configuration changes (recompute state - and therefore recompute active - is also called within compute symbols)
        this._disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols)) {
                this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
                this.computeSymbols();
            }
        }));
        // fire a change event when the theme changes
        this._disposables.add(this._themeService.onDidFileIconThemeChange(() => {
            this._onDidChange.fire({});
        }));
        // finish with a recompute state
        this.recomputeState();
    }
    /**
     * set up the primary data source + three viewing sources for the various outline views
     */
    setDataSources() {
        const notebookEditor = this._editor.getControl();
        this._outlineDataSourceReference?.dispose();
        this._dataSourceDisposables.clear();
        if (!notebookEditor?.hasModel()) {
            this._outlineDataSourceReference = undefined;
        }
        else {
            this._outlineDataSourceReference = this._dataSourceDisposables.add(this._instantiationService.invokeFunction((accessor) => accessor.get(INotebookCellOutlineDataSourceFactory).getOrCreate(notebookEditor)));
            // escalate outline data source change events
            this._dataSourceDisposables.add(this._outlineDataSourceReference.object.onDidChange(() => {
                this._onDidChange.fire({});
            }));
        }
        // these fields can be passed undefined outlineDataSources. View Providers all handle it accordingly
        this._treeDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookOutlinePaneProvider, this._outlineDataSourceReference));
        this._quickPickDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookQuickPickProvider, this._outlineDataSourceReference));
        this._breadcrumbsDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookBreadcrumbsProvider, this._outlineDataSourceReference));
    }
    /**
     * set up the listeners for the outline content, these respond to model changes in the notebook
     */
    setModelListeners() {
        this._modelDisposables.clear();
        if (!this._editor.textModel) {
            return;
        }
        // Perhaps this is the first time we're building the outline
        if (!this.entries.length) {
            this.computeSymbols();
        }
        // recompute state when there are notebook content changes
        this._modelDisposables.add(this._editor.textModel.onDidChangeContent((contentChanges) => {
            if (contentChanges.rawEvents.some((c) => c.kind === NotebookCellsChangeType.ChangeCellContent ||
                c.kind === NotebookCellsChangeType.ChangeCellInternalMetadata ||
                c.kind === NotebookCellsChangeType.Move ||
                c.kind === NotebookCellsChangeType.ModelChange)) {
                this.delayedRecomputeState();
            }
        }));
    }
    async computeSymbols(cancelToken = CancellationToken.None) {
        if (this._target === 1 /* OutlineTarget.OutlinePane */ && this.outlineShowCodeCellSymbols) {
            // No need to wait for this, we want the outline to show up quickly.
            void this.doComputeSymbols(cancelToken);
        }
    }
    async doComputeSymbols(cancelToken) {
        await this._outlineDataSourceReference?.object?.computeFullSymbols(cancelToken);
    }
    async delayedComputeSymbols() {
        this.delayerRecomputeState.cancel();
        this.delayerRecomputeActive.cancel();
        this.delayerRecomputeSymbols.trigger(() => {
            this.computeSymbols();
        });
    }
    recomputeState() {
        this._outlineDataSourceReference?.object?.recomputeState();
    }
    delayedRecomputeState() {
        this.delayerRecomputeActive.cancel(); // Active is always recomputed after a recomputing the State.
        this.delayerRecomputeState.trigger(() => {
            this.recomputeState();
        });
    }
    recomputeActive() {
        this._outlineDataSourceReference?.object?.recomputeActive();
    }
    delayedRecomputeActive() {
        this.delayerRecomputeActive.trigger(() => {
            this.recomputeActive();
        });
    }
    async reveal(entry, options, sideBySide) {
        const notebookEditorOptions = {
            ...options,
            override: this._editor.input?.editorId,
            cellRevealType: 5 /* CellRevealType.NearTopIfOutsideViewport */,
            selection: entry.position,
            viewState: undefined,
        };
        await this._editorService.openEditor({
            resource: entry.cell.uri,
            options: notebookEditorOptions,
        }, sideBySide ? SIDE_GROUP : undefined);
    }
    preview(entry) {
        const widget = this._editor.getControl();
        if (!widget) {
            return Disposable.None;
        }
        if (entry.range) {
            const range = Range.lift(entry.range);
            widget.revealRangeInCenterIfOutsideViewportAsync(entry.cell, range);
        }
        else {
            widget.revealInCenterIfOutsideViewport(entry.cell);
        }
        const ids = widget.deltaCellDecorations([], [
            {
                handle: entry.cell.handle,
                options: { className: 'nb-symbolHighlight', outputClassName: 'nb-symbolHighlight' },
            },
        ]);
        let editorDecorations;
        widget.changeModelDecorations((accessor) => {
            if (entry.range) {
                const decorations = [
                    {
                        range: entry.range,
                        options: {
                            description: 'document-symbols-outline-range-highlight',
                            className: 'rangeHighlight',
                            isWholeLine: true,
                        },
                    },
                ];
                const deltaDecoration = {
                    ownerId: entry.cell.handle,
                    decorations: decorations,
                };
                editorDecorations = accessor.deltaDecorations([], [deltaDecoration]);
            }
        });
        return toDisposable(() => {
            widget.deltaCellDecorations(ids, []);
            if (editorDecorations?.length) {
                widget.changeModelDecorations((accessor) => {
                    accessor.deltaDecorations(editorDecorations, []);
                });
            }
        });
    }
    captureViewState() {
        const widget = this._editor.getControl();
        const viewState = widget?.getEditorViewState();
        return toDisposable(() => {
            if (viewState) {
                widget?.restoreListViewState(viewState);
            }
        });
    }
    dispose() {
        this._onDidChange.dispose();
        this._disposables.dispose();
        this._modelDisposables.dispose();
        this._dataSourceDisposables.dispose();
        this._outlineDataSourceReference?.dispose();
    }
};
NotebookCellOutline = __decorate([
    __param(2, IThemeService),
    __param(3, IEditorService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, ILanguageFeaturesService),
    __param(7, INotebookExecutionStateService)
], NotebookCellOutline);
export { NotebookCellOutline };
let NotebookOutlineCreator = class NotebookOutlineCreator {
    constructor(outlineService, _instantiationService) {
        this._instantiationService = _instantiationService;
        const reg = outlineService.registerOutlineCreator(this);
        this.dispose = () => reg.dispose();
    }
    matches(candidate) {
        return candidate.getId() === NotebookEditor.ID;
    }
    async createOutline(editor, target, cancelToken) {
        const outline = this._instantiationService.createInstance(NotebookCellOutline, editor, target);
        if (target === 4 /* OutlineTarget.QuickPick */) {
            // The quickpick creates the outline on demand
            // so we need to ensure the symbols are pre-cached before the entries are syncronously requested
            await outline.doComputeSymbols(cancelToken);
        }
        return outline;
    }
};
NotebookOutlineCreator = __decorate([
    __param(0, IOutlineService),
    __param(1, IInstantiationService)
], NotebookOutlineCreator);
export { NotebookOutlineCreator };
export const NotebookOutlineContext = {
    CellKind: new RawContextKey('notebookCellKind', undefined),
    CellHasChildren: new RawContextKey('notebookCellHasChildren', false),
    CellHasHeader: new RawContextKey('notebookCellHasHeader', false),
    CellFoldingState: new RawContextKey('notebookCellFoldingState', 0 /* CellFoldingState.None */),
    OutlineElementTarget: new RawContextKey('notebookOutlineElementTarget', undefined),
};
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookOutlineCreator, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    properties: {
        [NotebookSetting.outlineShowMarkdownHeadersOnly]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('outline.showMarkdownHeadersOnly', 'When enabled, notebook outline will show only markdown cells containing a header.'),
        },
        [NotebookSetting.outlineShowCodeCells]: {
            type: 'boolean',
            default: false,
            markdownDescription: localize('outline.showCodeCells', 'When enabled, notebook outline shows code cells.'),
        },
        [NotebookSetting.outlineShowCodeCellSymbols]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('outline.showCodeCellSymbols', 'When enabled, notebook outline shows code cell symbols. Relies on `notebook.outline.showCodeCells` being enabled.'),
        },
        [NotebookSetting.breadcrumbsShowCodeCells]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('breadcrumbs.showCodeCells', 'When enabled, notebook breadcrumbs contain code cells.'),
        },
        [NotebookSetting.gotoSymbolsAllSymbols]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('notebook.gotoSymbols.showAllSymbols', 'When enabled, the Go to Symbol Quick Pick will display full code symbols from the notebook, as well as Markdown headers.'),
        },
    },
});
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
    submenu: MenuId.NotebookOutlineFilter,
    title: localize('filter', 'Filter Entries'),
    icon: Codicon.filter,
    group: 'navigation',
    order: -1,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), NOTEBOOK_IS_ACTIVE_EDITOR),
});
registerAction2(class ToggleShowMarkdownHeadersOnly extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleShowMarkdownHeadersOnly',
            title: localize('toggleShowMarkdownHeadersOnly', 'Markdown Headers Only'),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showMarkdownHeadersOnly', true),
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                group: '0_markdown_cells',
            },
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showMarkdownHeadersOnly = configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        configurationService.updateValue(NotebookSetting.outlineShowMarkdownHeadersOnly, !showMarkdownHeadersOnly);
    }
});
registerAction2(class ToggleCodeCellEntries extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleCodeCells',
            title: localize('toggleCodeCells', 'Code Cells'),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showCodeCells', true),
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                order: 1,
                group: '1_code_cells',
            },
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showCodeCells = configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        configurationService.updateValue(NotebookSetting.outlineShowCodeCells, !showCodeCells);
    }
});
registerAction2(class ToggleCodeCellSymbolEntries extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleCodeCellSymbols',
            title: localize('toggleCodeCellSymbols', 'Code Cell Symbols'),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showCodeCellSymbols', true),
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                order: 2,
                group: '1_code_cells',
            },
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showCodeCellSymbols = configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        configurationService.updateValue(NotebookSetting.outlineShowCodeCellSymbols, !showCodeCellSymbols);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL291dGxpbmUvbm90ZWJvb2tPdXRsaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sU0FBUyxHQUNULE1BQU0sMERBQTBELENBQUE7QUFXakUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNwRixPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBRVosTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFdEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSwwRUFBMEUsQ0FBQTtBQUVqRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sa0VBQWtFLENBQUE7QUFFekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25C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