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
import './media/markers.css';
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Separator } from '../../../../base/common/actions.js';
import { groupBy } from '../../../../base/common/arrays.js';
import { Event, Relay } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { fillInMarkersDragData } from '../../../../platform/dnd/browser/dnd.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IListService, WorkbenchObjectTree, } from '../../../../platform/list/browser/listService.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IOpenerService, withSelection } from '../../../../platform/opener/common/opener.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { RangeHighlightDecorations } from '../../../browser/codeeditor.js';
import { ResourceListDnDHandler } from '../../../browser/dnd.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { FilterViewPane } from '../../../browser/parts/views/viewPane.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { Memento } from '../../../common/memento.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { Markers, MarkersContextKeys } from '../common/markers.js';
import { FilterOptions } from './markersFilterOptions.js';
import { compareMarkersByUri, Marker, MarkersModel, MarkerTableItem, RelatedInformation, ResourceMarkers, } from './markersModel.js';
import { MarkersTable } from './markersTable.js';
import { Filter, MarkerRenderer, MarkersViewModel, MarkersWidgetAccessibilityProvider, RelatedInformationRenderer, ResourceMarkersRenderer, VirtualDelegate, } from './markersTreeViewer.js';
import { MarkersFilters } from './markersViewActions.js';
import Messages from './messages.js';
function createResourceMarkersIterator(resourceMarkers) {
    return Iterable.map(resourceMarkers.markers, (m) => {
        const relatedInformationIt = Iterable.from(m.relatedInformation);
        const children = Iterable.map(relatedInformationIt, (r) => ({ element: r }));
        return { element: m, children };
    });
}
let MarkersView = class MarkersView extends FilterViewPane {
    constructor(options, instantiationService, viewDescriptorService, editorService, configurationService, markerService, contextKeyService, workspaceContextService, contextMenuService, uriIdentityService, keybindingService, storageService, openerService, themeService, hoverService) {
        const memento = new Memento(Markers.MARKERS_VIEW_STORAGE_ID, storageService);
        const panelState = memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        super({
            ...options,
            filterOptions: {
                ariaLabel: Messages.MARKERS_PANEL_FILTER_ARIA_LABEL,
                placeholder: Messages.MARKERS_PANEL_FILTER_PLACEHOLDER,
                focusContextKey: MarkersContextKeys.MarkerViewFilterFocusContextKey.key,
                text: panelState['filter'] || '',
                history: panelState['filterHistory'] || [],
            },
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.markerService = markerService;
        this.workspaceContextService = workspaceContextService;
        this.uriIdentityService = uriIdentityService;
        this.lastSelectedRelativeTop = 0;
        this.currentActiveResource = null;
        this.onVisibleDisposables = this._register(new DisposableStore());
        this.widgetDisposables = this._register(new DisposableStore());
        this.currentHeight = 0;
        this.currentWidth = 0;
        this.cachedFilterStats = undefined;
        this.currentResourceGotAddedToMarkersData = false;
        this.onDidChangeVisibility = this.onDidChangeBodyVisibility;
        this.memento = memento;
        this.panelState = panelState;
        this.markersModel = this._register(instantiationService.createInstance(MarkersModel));
        this.markersViewModel = this._register(instantiationService.createInstance(MarkersViewModel, this.panelState['multiline'], this.panelState['viewMode'] ?? this.getDefaultViewMode()));
        this._register(this.onDidChangeVisibility((visible) => this.onDidChangeMarkersViewVisibility(visible)));
        this._register(this.markersViewModel.onDidChangeViewMode((_) => this.onDidChangeViewMode()));
        this.widgetAccessibilityProvider = instantiationService.createInstance(MarkersWidgetAccessibilityProvider);
        this.widgetIdentityProvider = {
            getId(element) {
                return element.id;
            },
        };
        this.setCurrentActiveEditor();
        this.filter = new Filter(FilterOptions.EMPTY(uriIdentityService));
        this.rangeHighlightDecorations = this._register(this.instantiationService.createInstance(RangeHighlightDecorations));
        this.filters = this._register(new MarkersFilters({
            filterHistory: this.panelState['filterHistory'] || [],
            showErrors: this.panelState['showErrors'] !== false,
            showWarnings: this.panelState['showWarnings'] !== false,
            showInfos: this.panelState['showInfos'] !== false,
            excludedFiles: !!this.panelState['useFilesExclude'],
            activeFile: !!this.panelState['activeFile'],
        }, this.contextKeyService));
        // Update filter, whenever the "files.exclude" setting is changed
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (this.filters.excludedFiles && e.affectsConfiguration('files.exclude')) {
                this.updateFilter();
            }
        }));
    }
    render() {
        super.render();
        this._register(registerNavigableContainer({
            name: 'markersView',
            focusNotifiers: [this, this.filterWidget],
            focusNextWidget: () => {
                if (this.filterWidget.hasFocus()) {
                    this.focus();
                }
            },
            focusPreviousWidget: () => {
                if (!this.filterWidget.hasFocus()) {
                    this.focusFilter();
                }
            },
        }));
    }
    renderBody(parent) {
        super.renderBody(parent);
        parent.classList.add('markers-panel');
        this._register(dom.addDisposableListener(parent, 'keydown', (e) => {
            const event = new StandardKeyboardEvent(e);
            if (!this.keybindingService.mightProducePrintableCharacter(event)) {
                return;
            }
            const result = this.keybindingService.softDispatch(event, event.target);
            if (result.kind === 1 /* ResultKind.MoreChordsNeeded */ || result.kind === 2 /* ResultKind.KbFound */) {
                return;
            }
            this.focusFilter();
        }));
        const panelContainer = dom.append(parent, dom.$('.markers-panel-container'));
        this.createArialLabelElement(panelContainer);
        this.createMessageBox(panelContainer);
        this.widgetContainer = dom.append(panelContainer, dom.$('.widget-container'));
        this.createWidget(this.widgetContainer);
        this.updateFilter();
        this.renderContent();
    }
    getTitle() {
        return Messages.MARKERS_PANEL_TITLE_PROBLEMS.value;
    }
    layoutBodyContent(height = this.currentHeight, width = this.currentWidth) {
        if (this.messageBoxContainer) {
            this.messageBoxContainer.style.height = `${height}px`;
        }
        this.widget.layout(height, width);
        this.currentHeight = height;
        this.currentWidth = width;
    }
    focus() {
        super.focus();
        if (dom.isActiveElement(this.widget.getHTMLElement())) {
            return;
        }
        if (this.hasNoProblems()) {
            this.messageBoxContainer.focus();
        }
        else {
            this.widget.domFocus();
            this.widget.setMarkerSelection();
        }
    }
    focusFilter() {
        this.filterWidget.focus();
    }
    updateBadge(total, filtered) {
        this.filterWidget.updateBadge(total === filtered || total === 0
            ? undefined
            : localize('showing filtered problems', 'Showing {0} of {1}', filtered, total));
    }
    checkMoreFilters() {
        this.filterWidget.checkMoreFilters(!this.filters.showErrors ||
            !this.filters.showWarnings ||
            !this.filters.showInfos ||
            this.filters.excludedFiles ||
            this.filters.activeFile);
    }
    clearFilterText() {
        this.filterWidget.setFilterText('');
    }
    showQuickFixes(marker) {
        const viewModel = this.markersViewModel.getViewModel(marker);
        if (viewModel) {
            viewModel.quickFixAction.run();
        }
    }
    openFileAtElement(element, preserveFocus, sideByside, pinned) {
        const { resource, selection } = element instanceof Marker
            ? { resource: element.resource, selection: element.range }
            : element instanceof RelatedInformation
                ? { resource: element.raw.resource, selection: element.raw }
                : 'marker' in element
                    ? { resource: element.marker.resource, selection: element.marker.range }
                    : { resource: null, selection: null };
        if (resource && selection) {
            this.editorService
                .openEditor({
                resource,
                options: {
                    selection,
                    preserveFocus,
                    pinned,
                    revealIfVisible: true,
                },
            }, sideByside ? SIDE_GROUP : ACTIVE_GROUP)
                .then((editor) => {
                if (editor && preserveFocus) {
                    this.rangeHighlightDecorations.highlightRange({ resource, range: selection }, editor.getControl());
                }
                else {
                    this.rangeHighlightDecorations.removeHighlightRange();
                }
            });
            return true;
        }
        else {
            this.rangeHighlightDecorations.removeHighlightRange();
        }
        return false;
    }
    refreshPanel(markerOrChange) {
        if (this.isVisible()) {
            const hasSelection = this.widget.getSelection().length > 0;
            if (markerOrChange) {
                if (markerOrChange instanceof Marker) {
                    this.widget.updateMarker(markerOrChange);
                }
                else {
                    if (markerOrChange.added.size || markerOrChange.removed.size) {
                        // Reset complete widget
                        this.resetWidget();
                    }
                    else {
                        // Update resource
                        this.widget.update([...markerOrChange.updated]);
                    }
                }
            }
            else {
                // Reset complete widget
                this.resetWidget();
            }
            if (hasSelection) {
                this.widget.setMarkerSelection();
            }
            this.cachedFilterStats = undefined;
            const { total, filtered } = this.getFilterStats();
            this.toggleVisibility(total === 0 || filtered === 0);
            this.renderMessage();
            this.updateBadge(total, filtered);
            this.checkMoreFilters();
        }
    }
    onDidChangeViewState(marker) {
        this.refreshPanel(marker);
    }
    resetWidget() {
        this.widget.reset(this.getResourceMarkers());
    }
    updateFilter() {
        this.filter.options = new FilterOptions(this.filterWidget.getFilterText(), this.getFilesExcludeExpressions(), this.filters.showWarnings, this.filters.showErrors, this.filters.showInfos, this.uriIdentityService);
        this.widget.filterMarkers(this.getResourceMarkers(), this.filter.options);
        this.cachedFilterStats = undefined;
        const { total, filtered } = this.getFilterStats();
        this.toggleVisibility(total === 0 || filtered === 0);
        this.renderMessage();
        this.updateBadge(total, filtered);
        this.checkMoreFilters();
    }
    getDefaultViewMode() {
        switch (this.configurationService.getValue('problems.defaultViewMode')) {
            case 'table':
                return "table" /* MarkersViewMode.Table */;
            case 'tree':
                return "tree" /* MarkersViewMode.Tree */;
            default:
                return "tree" /* MarkersViewMode.Tree */;
        }
    }
    getFilesExcludeExpressions() {
        if (!this.filters.excludedFiles) {
            return [];
        }
        const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
        return workspaceFolders.length
            ? workspaceFolders.map((workspaceFolder) => ({
                root: workspaceFolder.uri,
                expression: this.getFilesExclude(workspaceFolder.uri),
            }))
            : this.getFilesExclude();
    }
    getFilesExclude(resource) {
        return deepClone(this.configurationService.getValue('files.exclude', { resource })) || {};
    }
    getResourceMarkers() {
        if (!this.filters.activeFile) {
            return this.markersModel.resourceMarkers;
        }
        let resourceMarkers = [];
        if (this.currentActiveResource) {
            const activeResourceMarkers = this.markersModel.getResourceMarkers(this.currentActiveResource);
            if (activeResourceMarkers) {
                resourceMarkers = [activeResourceMarkers];
            }
        }
        return resourceMarkers;
    }
    createMessageBox(parent) {
        this.messageBoxContainer = dom.append(parent, dom.$('.message-box-container'));
        this.messageBoxContainer.setAttribute('aria-labelledby', 'markers-panel-arialabel');
    }
    createArialLabelElement(parent) {
        this.ariaLabelElement = dom.append(parent, dom.$(''));
        this.ariaLabelElement.setAttribute('id', 'markers-panel-arialabel');
    }
    createWidget(parent) {
        this.widget =
            this.markersViewModel.viewMode === "table" /* MarkersViewMode.Table */
                ? this.createTable(parent)
                : this.createTree(parent);
        this.widgetDisposables.add(this.widget);
        const markerFocusContextKey = MarkersContextKeys.MarkerFocusContextKey.bindTo(this.widget.contextKeyService);
        const relatedInformationFocusContextKey = MarkersContextKeys.RelatedInformationFocusContextKey.bindTo(this.widget.contextKeyService);
        this.widgetDisposables.add(this.widget.onDidChangeFocus((focus) => {
            markerFocusContextKey.set(focus.elements.some((e) => e instanceof Marker));
            relatedInformationFocusContextKey.set(focus.elements.some((e) => e instanceof RelatedInformation));
        }));
        this.widgetDisposables.add(Event.debounce(this.widget.onDidOpen, (last, event) => event, 75, true)((options) => {
            this.openFileAtElement(options.element, !!options.editorOptions.preserveFocus, options.sideBySide, !!options.editorOptions.pinned);
        }));
        this.widgetDisposables.add(Event.any(this.widget.onDidChangeSelection, this.widget.onDidChangeFocus)(() => {
            const elements = [...this.widget.getSelection(), ...this.widget.getFocus()];
            for (const element of elements) {
                if (element instanceof Marker) {
                    const viewModel = this.markersViewModel.getViewModel(element);
                    viewModel?.showLightBulb();
                }
            }
        }));
        this.widgetDisposables.add(this.widget.onContextMenu(this.onContextMenu, this));
        this.widgetDisposables.add(this.widget.onDidChangeSelection(this.onSelected, this));
    }
    createTable(parent) {
        const table = this.instantiationService.createInstance(MarkersTable, dom.append(parent, dom.$('.markers-table-container')), this.markersViewModel, this.getResourceMarkers(), this.filter.options, {
            accessibilityProvider: this.widgetAccessibilityProvider,
            dnd: this.instantiationService.createInstance(ResourceListDnDHandler, (element) => {
                if (element instanceof MarkerTableItem) {
                    return withSelection(element.resource, element.range);
                }
                return null;
            }),
            horizontalScrolling: false,
            identityProvider: this.widgetIdentityProvider,
            multipleSelectionSupport: true,
            selectionNavigation: true,
        });
        return table;
    }
    createTree(parent) {
        const onDidChangeRenderNodeCount = new Relay();
        const treeLabels = this.instantiationService.createInstance(ResourceLabels, this);
        const virtualDelegate = new VirtualDelegate(this.markersViewModel);
        const renderers = [
            this.instantiationService.createInstance(ResourceMarkersRenderer, treeLabels, onDidChangeRenderNodeCount.event),
            this.instantiationService.createInstance(MarkerRenderer, this.markersViewModel),
            this.instantiationService.createInstance(RelatedInformationRenderer),
        ];
        const tree = this.instantiationService.createInstance(MarkersTree, 'MarkersView', dom.append(parent, dom.$('.tree-container.show-file-icons')), virtualDelegate, renderers, {
            filter: this.filter,
            accessibilityProvider: this.widgetAccessibilityProvider,
            identityProvider: this.widgetIdentityProvider,
            dnd: this.instantiationService.createInstance(MarkersListDnDHandler),
            expandOnlyOnTwistieClick: (e) => e instanceof Marker && e.relatedInformation.length > 0,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            selectionNavigation: true,
            multipleSelectionSupport: true,
        });
        onDidChangeRenderNodeCount.input = tree.onDidChangeRenderNodeCount;
        return tree;
    }
    collapseAll() {
        this.widget.collapseMarkers();
    }
    setMultiline(multiline) {
        this.markersViewModel.multiline = multiline;
    }
    setViewMode(viewMode) {
        this.markersViewModel.viewMode = viewMode;
    }
    onDidChangeMarkersViewVisibility(visible) {
        this.onVisibleDisposables.clear();
        if (visible) {
            for (const disposable of this.reInitialize()) {
                this.onVisibleDisposables.add(disposable);
            }
            this.refreshPanel();
        }
    }
    reInitialize() {
        const disposables = [];
        // Markers Model
        const readMarkers = (resource) => this.markerService.read({
            resource,
            severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info,
        });
        this.markersModel.setResourceMarkers(groupBy(readMarkers(), compareMarkersByUri).map((group) => [group[0].resource, group]));
        disposables.push(Event.debounce(this.markerService.onMarkerChanged, (resourcesMap, resources) => {
            resourcesMap = resourcesMap || new ResourceMap();
            resources.forEach((resource) => resourcesMap.set(resource, resource));
            return resourcesMap;
        }, 64)((resourcesMap) => {
            this.markersModel.setResourceMarkers([...resourcesMap.values()].map((resource) => [resource, readMarkers(resource)]));
        }));
        disposables.push(Event.any(this.markersModel.onDidChange, this.editorService.onDidActiveEditorChange)((changes) => {
            if (changes) {
                this.onDidChangeModel(changes);
            }
            else {
                this.onActiveEditorChanged();
            }
        }));
        disposables.push(toDisposable(() => this.markersModel.reset()));
        // Markers View Model
        this.markersModel.resourceMarkers.forEach((resourceMarker) => resourceMarker.markers.forEach((marker) => this.markersViewModel.add(marker)));
        disposables.push(this.markersViewModel.onDidChange((marker) => this.onDidChangeViewState(marker)));
        disposables.push(toDisposable(() => this.markersModel.resourceMarkers.forEach((resourceMarker) => this.markersViewModel.remove(resourceMarker.resource))));
        // Markers Filters
        disposables.push(this.filters.onDidChange((event) => {
            if (event.activeFile) {
                this.refreshPanel();
            }
            else if (event.excludedFiles ||
                event.showWarnings ||
                event.showErrors ||
                event.showInfos) {
                this.updateFilter();
            }
        }));
        disposables.push(this.filterWidget.onDidChangeFilterText((e) => this.updateFilter()));
        disposables.push(toDisposable(() => {
            this.cachedFilterStats = undefined;
        }));
        disposables.push(toDisposable(() => this.rangeHighlightDecorations.removeHighlightRange()));
        return disposables;
    }
    onDidChangeModel(change) {
        const resourceMarkers = [...change.added, ...change.removed, ...change.updated];
        const resources = [];
        for (const { resource } of resourceMarkers) {
            this.markersViewModel.remove(resource);
            const resourceMarkers = this.markersModel.getResourceMarkers(resource);
            if (resourceMarkers) {
                for (const marker of resourceMarkers.markers) {
                    this.markersViewModel.add(marker);
                }
            }
            resources.push(resource);
        }
        this.currentResourceGotAddedToMarkersData =
            this.currentResourceGotAddedToMarkersData ||
                this.isCurrentResourceGotAddedToMarkersData(resources);
        this.refreshPanel(change);
        this.updateRangeHighlights();
        if (this.currentResourceGotAddedToMarkersData) {
            this.autoReveal();
            this.currentResourceGotAddedToMarkersData = false;
        }
    }
    onDidChangeViewMode() {
        if (this.widgetContainer && this.widget) {
            this.widgetContainer.textContent = '';
            this.widgetDisposables.clear();
        }
        // Save selection
        const selection = new Set();
        for (const marker of this.widget.getSelection()) {
            if (marker instanceof ResourceMarkers) {
                marker.markers.forEach((m) => selection.add(m));
            }
            else if (marker instanceof Marker || marker instanceof MarkerTableItem) {
                selection.add(marker);
            }
        }
        // Save focus
        const focus = new Set();
        for (const marker of this.widget.getFocus()) {
            if (marker instanceof Marker || marker instanceof MarkerTableItem) {
                focus.add(marker);
            }
        }
        // Create new widget
        this.createWidget(this.widgetContainer);
        this.refreshPanel();
        // Restore selection
        if (selection.size > 0) {
            this.widget.setMarkerSelection(Array.from(selection), Array.from(focus));
            this.widget.domFocus();
        }
    }
    isCurrentResourceGotAddedToMarkersData(changedResources) {
        const currentlyActiveResource = this.currentActiveResource;
        if (!currentlyActiveResource) {
            return false;
        }
        const resourceForCurrentActiveResource = this.getResourceForCurrentActiveResource();
        if (resourceForCurrentActiveResource) {
            return false;
        }
        return changedResources.some((r) => r.toString() === currentlyActiveResource.toString());
    }
    onActiveEditorChanged() {
        this.setCurrentActiveEditor();
        if (this.filters.activeFile) {
            this.refreshPanel();
        }
        this.autoReveal();
    }
    setCurrentActiveEditor() {
        const activeEditor = this.editorService.activeEditor;
        this.currentActiveResource = activeEditor
            ? (EditorResourceAccessor.getOriginalUri(activeEditor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            }) ?? null)
            : null;
    }
    onSelected() {
        const selection = this.widget.getSelection();
        if (selection && selection.length > 0) {
            this.lastSelectedRelativeTop = this.widget.getRelativeTop(selection[0]) || 0;
        }
    }
    hasNoProblems() {
        const { total, filtered } = this.getFilterStats();
        return total === 0 || filtered === 0;
    }
    renderContent() {
        this.cachedFilterStats = undefined;
        this.resetWidget();
        this.toggleVisibility(this.hasNoProblems());
        this.renderMessage();
    }
    renderMessage() {
        if (!this.messageBoxContainer || !this.ariaLabelElement) {
            return;
        }
        dom.clearNode(this.messageBoxContainer);
        const { total, filtered } = this.getFilterStats();
        if (filtered === 0) {
            this.messageBoxContainer.style.display = 'block';
            this.messageBoxContainer.setAttribute('tabIndex', '0');
            if (this.filters.activeFile) {
                this.renderFilterMessageForActiveFile(this.messageBoxContainer);
            }
            else {
                if (total > 0) {
                    this.renderFilteredByFilterMessage(this.messageBoxContainer);
                }
                else {
                    this.renderNoProblemsMessage(this.messageBoxContainer);
                }
            }
        }
        else {
            this.messageBoxContainer.style.display = 'none';
            if (filtered === total) {
                this.setAriaLabel(localize('No problems filtered', 'Showing {0} problems', total));
            }
            else {
                this.setAriaLabel(localize('problems filtered', 'Showing {0} of {1} problems', filtered, total));
            }
            this.messageBoxContainer.removeAttribute('tabIndex');
        }
    }
    renderFilterMessageForActiveFile(container) {
        if (this.currentActiveResource &&
            this.markersModel.getResourceMarkers(this.currentActiveResource)) {
            this.renderFilteredByFilterMessage(container);
        }
        else {
            this.renderNoProblemsMessageForActiveFile(container);
        }
    }
    renderFilteredByFilterMessage(container) {
        const span1 = dom.append(container, dom.$('span'));
        span1.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_FILTERS;
        const link = dom.append(container, dom.$('a.messageAction'));
        link.textContent = localize('clearFilter', 'Clear Filters');
        link.setAttribute('tabIndex', '0');
        const span2 = dom.append(container, dom.$('span'));
        span2.textContent = '.';
        dom.addStandardDisposableListener(link, dom.EventType.CLICK, () => this.clearFilters());
        dom.addStandardDisposableListener(link, dom.EventType.KEY_DOWN, (e) => {
            if (e.equals(3 /* KeyCode.Enter */) || e.equals(10 /* KeyCode.Space */)) {
                this.clearFilters();
                e.stopPropagation();
            }
        });
        this.setAriaLabel(Messages.MARKERS_PANEL_NO_PROBLEMS_FILTERS);
    }
    renderNoProblemsMessageForActiveFile(container) {
        const span = dom.append(container, dom.$('span'));
        span.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT;
        this.setAriaLabel(Messages.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT);
    }
    renderNoProblemsMessage(container) {
        const span = dom.append(container, dom.$('span'));
        span.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_BUILT;
        this.setAriaLabel(Messages.MARKERS_PANEL_NO_PROBLEMS_BUILT);
    }
    setAriaLabel(label) {
        this.widget.setAriaLabel(label);
        this.ariaLabelElement.setAttribute('aria-label', label);
    }
    clearFilters() {
        this.filterWidget.setFilterText('');
        this.filters.excludedFiles = false;
        this.filters.showErrors = true;
        this.filters.showWarnings = true;
        this.filters.showInfos = true;
    }
    autoReveal(focus = false) {
        // No need to auto reveal if active file filter is on
        if (this.filters.activeFile) {
            return;
        }
        const autoReveal = this.configurationService.getValue('problems.autoReveal');
        if (typeof autoReveal === 'boolean' && autoReveal) {
            const currentActiveResource = this.getResourceForCurrentActiveResource();
            this.widget.revealMarkers(currentActiveResource, focus, this.lastSelectedRelativeTop);
        }
    }
    getResourceForCurrentActiveResource() {
        return this.currentActiveResource
            ? this.markersModel.getResourceMarkers(this.currentActiveResource)
            : null;
    }
    updateRangeHighlights() {
        this.rangeHighlightDecorations.removeHighlightRange();
        if (dom.isActiveElement(this.widget.getHTMLElement())) {
            this.highlightCurrentSelectedMarkerRange();
        }
    }
    highlightCurrentSelectedMarkerRange() {
        const selections = this.widget.getSelection() ?? [];
        if (selections.length !== 1) {
            return;
        }
        const selection = selections[0];
        if (!(selection instanceof Marker)) {
            return;
        }
        this.rangeHighlightDecorations.highlightRange(selection);
    }
    onContextMenu(e) {
        const element = e.element;
        if (!element) {
            return;
        }
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            menuId: MenuId.ProblemsPanelContext,
            contextKeyService: this.widget.contextKeyService,
            getActions: () => this.getMenuActions(element),
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, {
                        label: true,
                        keybinding: keybinding.getLabel(),
                    });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.widget.domFocus();
                }
            },
        });
    }
    getMenuActions(element) {
        const result = [];
        if (element instanceof Marker) {
            const viewModel = this.markersViewModel.getViewModel(element);
            if (viewModel) {
                const quickFixActions = viewModel.quickFixAction.quickFixes;
                if (quickFixActions.length) {
                    result.push(...quickFixActions);
                    result.push(new Separator());
                }
            }
        }
        return result;
    }
    getFocusElement() {
        return this.widget.getFocus()[0] ?? undefined;
    }
    getFocusedSelectedElements() {
        const focus = this.getFocusElement();
        if (!focus) {
            return null;
        }
        const selection = this.widget.getSelection();
        if (selection.includes(focus)) {
            const result = [];
            for (const selected of selection) {
                if (selected) {
                    result.push(selected);
                }
            }
            return result;
        }
        else {
            return [focus];
        }
    }
    getAllResourceMarkers() {
        return this.markersModel.resourceMarkers;
    }
    getFilterStats() {
        if (!this.cachedFilterStats) {
            this.cachedFilterStats = {
                total: this.markersModel.total,
                filtered: this.widget?.getVisibleItemCount() ?? 0,
            };
        }
        return this.cachedFilterStats;
    }
    toggleVisibility(hide) {
        this.widget.toggleVisibility(hide);
        this.layoutBodyContent();
    }
    saveState() {
        this.panelState['filter'] = this.filterWidget.getFilterText();
        this.panelState['filterHistory'] = this.filters.filterHistory;
        this.panelState['showErrors'] = this.filters.showErrors;
        this.panelState['showWarnings'] = this.filters.showWarnings;
        this.panelState['showInfos'] = this.filters.showInfos;
        this.panelState['useFilesExclude'] = this.filters.excludedFiles;
        this.panelState['activeFile'] = this.filters.activeFile;
        this.panelState['multiline'] = this.markersViewModel.multiline;
        this.panelState['viewMode'] = this.markersViewModel.viewMode;
        this.memento.saveMemento();
        super.saveState();
    }
    dispose() {
        super.dispose();
    }
};
MarkersView = __decorate([
    __param(1, IInstantiationService),
    __param(2, IViewDescriptorService),
    __param(3, IEditorService),
    __param(4, IConfigurationService),
    __param(5, IMarkerService),
    __param(6, IContextKeyService),
    __param(7, IWorkspaceContextService),
    __param(8, IContextMenuService),
    __param(9, IUriIdentityService),
    __param(10, IKeybindingService),
    __param(11, IStorageService),
    __param(12, IOpenerService),
    __param(13, IThemeService),
    __param(14, IHoverService)
], MarkersView);
export { MarkersView };
let MarkersTree = class MarkersTree extends WorkbenchObjectTree {
    constructor(user, container, delegate, renderers, options, instantiationService, contextKeyService, listService, themeService, configurationService) {
        super(user, container, delegate, renderers, options, instantiationService, contextKeyService, listService, configurationService);
        this.container = container;
        this.visibilityContextKey =
            MarkersContextKeys.MarkersTreeVisibilityContextKey.bindTo(contextKeyService);
    }
    collapseMarkers() {
        this.collapseAll();
        this.setSelection([]);
        this.setFocus([]);
        this.getHTMLElement().focus();
        this.focusFirst();
    }
    filterMarkers() {
        this.refilter();
    }
    getVisibleItemCount() {
        let filtered = 0;
        const root = this.getNode();
        for (const resourceMarkerNode of root.children) {
            for (const markerNode of resourceMarkerNode.children) {
                if (resourceMarkerNode.visible && markerNode.visible) {
                    filtered++;
                }
            }
        }
        return filtered;
    }
    isVisible() {
        return !this.container.classList.contains('hidden');
    }
    toggleVisibility(hide) {
        this.visibilityContextKey.set(!hide);
        this.container.classList.toggle('hidden', hide);
    }
    reset(resourceMarkers) {
        this.setChildren(null, Iterable.map(resourceMarkers, (m) => ({
            element: m,
            children: createResourceMarkersIterator(m),
        })));
    }
    revealMarkers(activeResource, focus, lastSelectedRelativeTop) {
        if (activeResource) {
            if (this.hasElement(activeResource)) {
                if (!this.isCollapsed(activeResource) && this.hasSelectedMarkerFor(activeResource)) {
                    this.reveal(this.getSelection()[0], lastSelectedRelativeTop);
                    if (focus) {
                        this.setFocus(this.getSelection());
                    }
                }
                else {
                    this.expand(activeResource);
                    this.reveal(activeResource, 0);
                    if (focus) {
                        this.setFocus([activeResource]);
                        this.setSelection([activeResource]);
                    }
                }
            }
        }
        else if (focus) {
            this.setSelection([]);
            this.focusFirst();
        }
    }
    setAriaLabel(label) {
        this.ariaLabel = label;
    }
    setMarkerSelection(selection, focus) {
        if (this.isVisible()) {
            if (selection && selection.length > 0) {
                this.setSelection(selection.map((m) => this.findMarkerNode(m)));
                if (focus && focus.length > 0) {
                    this.setFocus(focus.map((f) => this.findMarkerNode(f)));
                }
                else {
                    this.setFocus([this.findMarkerNode(selection[0])]);
                }
                this.reveal(this.findMarkerNode(selection[0]));
            }
            else if (this.getSelection().length === 0) {
                const firstVisibleElement = this.firstVisibleElement;
                const marker = firstVisibleElement
                    ? firstVisibleElement instanceof ResourceMarkers
                        ? firstVisibleElement.markers[0]
                        : firstVisibleElement instanceof Marker
                            ? firstVisibleElement
                            : undefined
                    : undefined;
                if (marker) {
                    this.setSelection([marker]);
                    this.setFocus([marker]);
                    this.reveal(marker);
                }
            }
        }
    }
    update(resourceMarkers) {
        for (const resourceMarker of resourceMarkers) {
            if (this.hasElement(resourceMarker)) {
                this.setChildren(resourceMarker, createResourceMarkersIterator(resourceMarker));
                this.rerender(resourceMarker);
            }
        }
    }
    updateMarker(marker) {
        this.rerender(marker);
    }
    findMarkerNode(marker) {
        for (const resourceNode of this.getNode().children) {
            for (const markerNode of resourceNode.children) {
                if (markerNode.element instanceof Marker && markerNode.element.marker === marker.marker) {
                    return markerNode.element;
                }
            }
        }
        return null;
    }
    hasSelectedMarkerFor(resource) {
        const selectedElement = this.getSelection();
        if (selectedElement && selectedElement.length > 0) {
            if (selectedElement[0] instanceof Marker) {
                if (resource.has(selectedElement[0].marker.resource)) {
                    return true;
                }
            }
        }
        return false;
    }
    dispose() {
        super.dispose();
    }
    layout(height, width) {
        this.container.style.height = `${height}px`;
        super.layout(height, width);
    }
};
MarkersTree = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IListService),
    __param(8, IThemeService),
    __param(9, IConfigurationService)
], MarkersTree);
let MarkersListDnDHandler = class MarkersListDnDHandler extends ResourceListDnDHandler {
    constructor(instantiationService) {
        super((element) => {
            if (element instanceof MarkerTableItem) {
                return withSelection(element.resource, element.range);
            }
            else if (element instanceof ResourceMarkers) {
                return element.resource;
            }
            else if (element instanceof Marker) {
                return withSelection(element.resource, element.range);
            }
            else if (element instanceof RelatedInformation) {
                return withSelection(element.raw.resource, element.raw);
            }
            return null;
        }, instantiationService);
    }
    onWillDragElements(elements, originalEvent) {
        const data = elements
            .map((e) => {
            if (e instanceof RelatedInformation || e instanceof Marker) {
                return e.marker;
            }
            if (e instanceof ResourceMarkers) {
                return { uri: e.resource };
            }
            return undefined;
        })
            .filter(isDefined);
        if (!data.length) {
            return;
        }
        fillInMarkersDragData(data, originalEvent);
    }
};
MarkersListDnDHandler = __decorate([
    __param(0, IInstantiationService)
], MarkersListDnDHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vyc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxxQkFBcUIsQ0FBQTtBQUU1QixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBa0IscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFVekYsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFB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