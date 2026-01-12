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
var MarkerSeverityColumnRenderer_1, MarkerCodeColumnRenderer_1, MarkerFileColumnRenderer_1;
import { localize } from '../../../../nls.js';
import * as DOM from '../../../../base/browser/dom.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable, } from '../../../../platform/list/browser/listService.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { compareMarkersByUri, Marker, MarkerTableItem } from './markersModel.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { FilterOptions } from './markersFilterOptions.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { QuickFixAction, QuickFixActionViewItem } from './markersViewActions.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import Messages from './messages.js';
import { isUndefinedOrNull } from '../../../../base/common/types.js';
import { Range } from '../../../../editor/common/core/range.js';
import { unsupportedSchemas } from '../../../../platform/markers/common/markerService.js';
import Severity from '../../../../base/common/severity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = DOM.$;
let MarkerSeverityColumnRenderer = class MarkerSeverityColumnRenderer {
    static { MarkerSeverityColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'severity'; }
    constructor(markersViewModel, instantiationService) {
        this.markersViewModel = markersViewModel;
        this.instantiationService = instantiationService;
        this.templateId = MarkerSeverityColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const severityColumn = DOM.append(container, $('.severity'));
        const icon = DOM.append(severityColumn, $(''));
        const actionBarColumn = DOM.append(container, $('.actions'));
        const actionBar = new ActionBar(actionBarColumn, {
            actionViewItemProvider: (action, options) => action.id === QuickFixAction.ID
                ? this.instantiationService.createInstance(QuickFixActionViewItem, action, options)
                : undefined,
        });
        return { actionBar, icon };
    }
    renderElement(element, index, templateData, height) {
        const toggleQuickFix = (enabled) => {
            if (!isUndefinedOrNull(enabled)) {
                const container = DOM.findParentWithClass(templateData.icon, 'monaco-table-td');
                container.classList.toggle('quickFix', enabled);
            }
        };
        templateData.icon.title = MarkerSeverity.toString(element.marker.severity);
        templateData.icon.className = `marker-icon ${Severity.toString(MarkerSeverity.toSeverity(element.marker.severity))} codicon ${SeverityIcon.className(MarkerSeverity.toSeverity(element.marker.severity))}`;
        templateData.actionBar.clear();
        const viewModel = this.markersViewModel.getViewModel(element);
        if (viewModel) {
            const quickFixAction = viewModel.quickFixAction;
            templateData.actionBar.push([quickFixAction], { icon: true, label: false });
            toggleQuickFix(viewModel.quickFixAction.enabled);
            quickFixAction.onDidChange(({ enabled }) => toggleQuickFix(enabled));
            quickFixAction.onShowQuickFixes(() => {
                const quickFixActionViewItem = templateData.actionBar.viewItems[0];
                if (quickFixActionViewItem) {
                    quickFixActionViewItem.showQuickFixes();
                }
            });
        }
    }
    disposeTemplate(templateData) { }
};
MarkerSeverityColumnRenderer = MarkerSeverityColumnRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], MarkerSeverityColumnRenderer);
let MarkerCodeColumnRenderer = class MarkerCodeColumnRenderer {
    static { MarkerCodeColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'code'; }
    constructor(hoverService, openerService) {
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.templateId = MarkerCodeColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposable = new DisposableStore();
        const codeColumn = DOM.append(container, $('.code'));
        const sourceLabel = templateDisposable.add(new HighlightedLabel(codeColumn));
        sourceLabel.element.classList.add('source-label');
        const codeLabel = templateDisposable.add(new HighlightedLabel(codeColumn));
        codeLabel.element.classList.add('code-label');
        const codeLink = templateDisposable.add(new Link(codeColumn, { href: '', label: '' }, {}, this.hoverService, this.openerService));
        return { codeColumn, sourceLabel, codeLabel, codeLink, templateDisposable };
    }
    renderElement(element, index, templateData, height) {
        templateData.codeColumn.classList.remove('code-label');
        templateData.codeColumn.classList.remove('code-link');
        if (element.marker.source && element.marker.code) {
            if (typeof element.marker.code === 'string') {
                templateData.codeColumn.classList.add('code-label');
                templateData.codeColumn.title = `${element.marker.source} (${element.marker.code})`;
                templateData.sourceLabel.set(element.marker.source, element.sourceMatches);
                templateData.codeLabel.set(element.marker.code, element.codeMatches);
            }
            else {
                templateData.codeColumn.classList.add('code-link');
                templateData.codeColumn.title = `${element.marker.source} (${element.marker.code.value})`;
                templateData.sourceLabel.set(element.marker.source, element.sourceMatches);
                const codeLinkLabel = templateData.templateDisposable.add(new HighlightedLabel($('.code-link-label')));
                codeLinkLabel.set(element.marker.code.value, element.codeMatches);
                templateData.codeLink.link = {
                    href: element.marker.code.target.toString(true),
                    title: element.marker.code.target.toString(true),
                    label: codeLinkLabel.element,
                };
            }
        }
        else {
            templateData.codeColumn.title = '';
            templateData.sourceLabel.set('-');
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
};
MarkerCodeColumnRenderer = MarkerCodeColumnRenderer_1 = __decorate([
    __param(0, IHoverService),
    __param(1, IOpenerService)
], MarkerCodeColumnRenderer);
class MarkerMessageColumnRenderer {
    constructor() {
        this.templateId = MarkerMessageColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'message'; }
    renderTemplate(container) {
        const columnElement = DOM.append(container, $('.message'));
        const highlightedLabel = new HighlightedLabel(columnElement);
        return { columnElement, highlightedLabel };
    }
    renderElement(element, index, templateData, height) {
        templateData.columnElement.title = element.marker.message;
        templateData.highlightedLabel.set(element.marker.message, element.messageMatches);
    }
    disposeTemplate(templateData) {
        templateData.highlightedLabel.dispose();
    }
}
let MarkerFileColumnRenderer = class MarkerFileColumnRenderer {
    static { MarkerFileColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'file'; }
    constructor(labelService) {
        this.labelService = labelService;
        this.templateId = MarkerFileColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const columnElement = DOM.append(container, $('.file'));
        const fileLabel = new HighlightedLabel(columnElement);
        fileLabel.element.classList.add('file-label');
        const positionLabel = new HighlightedLabel(columnElement);
        positionLabel.element.classList.add('file-position');
        return { columnElement, fileLabel, positionLabel };
    }
    renderElement(element, index, templateData, height) {
        const positionLabel = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(element.marker.startLineNumber, element.marker.startColumn);
        templateData.columnElement.title = `${this.labelService.getUriLabel(element.marker.resource, { relative: false })} ${positionLabel}`;
        templateData.fileLabel.set(this.labelService.getUriLabel(element.marker.resource, { relative: true }), element.fileMatches);
        templateData.positionLabel.set(positionLabel, undefined);
    }
    disposeTemplate(templateData) {
        templateData.fileLabel.dispose();
        templateData.positionLabel.dispose();
    }
};
MarkerFileColumnRenderer = MarkerFileColumnRenderer_1 = __decorate([
    __param(0, ILabelService)
], MarkerFileColumnRenderer);
class MarkerSourceColumnRenderer {
    constructor() {
        this.templateId = MarkerSourceColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'source'; }
    renderTemplate(container) {
        const columnElement = DOM.append(container, $('.source'));
        const highlightedLabel = new HighlightedLabel(columnElement);
        return { columnElement, highlightedLabel };
    }
    renderElement(element, index, templateData, height) {
        templateData.columnElement.title = element.marker.source ?? '';
        templateData.highlightedLabel.set(element.marker.source ?? '', element.sourceMatches);
    }
    disposeTemplate(templateData) {
        templateData.highlightedLabel.dispose();
    }
}
class MarkersTableVirtualDelegate {
    constructor() {
        this.headerRowHeight = MarkersTableVirtualDelegate.HEADER_ROW_HEIGHT;
    }
    static { this.HEADER_ROW_HEIGHT = 24; }
    static { this.ROW_HEIGHT = 24; }
    getHeight(item) {
        return MarkersTableVirtualDelegate.ROW_HEIGHT;
    }
}
let MarkersTable = class MarkersTable extends Disposable {
    constructor(container, markersViewModel, resourceMarkers, filterOptions, options, instantiationService, labelService) {
        super();
        this.container = container;
        this.markersViewModel = markersViewModel;
        this.resourceMarkers = resourceMarkers;
        this.filterOptions = filterOptions;
        this.instantiationService = instantiationService;
        this.labelService = labelService;
        this._itemCount = 0;
        this.table = this.instantiationService.createInstance(WorkbenchTable, 'Markers', this.container, new MarkersTableVirtualDelegate(), [
            {
                label: '',
                tooltip: '',
                weight: 0,
                minimumWidth: 36,
                maximumWidth: 36,
                templateId: MarkerSeverityColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('codeColumnLabel', 'Code'),
                tooltip: '',
                weight: 1,
                minimumWidth: 100,
                maximumWidth: 300,
                templateId: MarkerCodeColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('messageColumnLabel', 'Message'),
                tooltip: '',
                weight: 4,
                templateId: MarkerMessageColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('fileColumnLabel', 'File'),
                tooltip: '',
                weight: 2,
                templateId: MarkerFileColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('sourceColumnLabel', 'Source'),
                tooltip: '',
                weight: 1,
                minimumWidth: 100,
                maximumWidth: 300,
                templateId: MarkerSourceColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
        ], [
            this.instantiationService.createInstance(MarkerSeverityColumnRenderer, this.markersViewModel),
            this.instantiationService.createInstance(MarkerCodeColumnRenderer),
            this.instantiationService.createInstance(MarkerMessageColumnRenderer),
            this.instantiationService.createInstance(MarkerFileColumnRenderer),
            this.instantiationService.createInstance(MarkerSourceColumnRenderer),
        ], options);
        const list = this.table.domNode.querySelector('.monaco-list-rows');
        // mouseover/mouseleave event handlers
        const onRowHover = Event.chain(this._register(new DomEmitter(list, 'mouseover')).event, ($) => $.map((e) => DOM.findParentWithClass(e.target, 'monaco-list-row', 'monaco-list-rows'))
            .filter(((e) => !!e))
            .map((e) => parseInt(e.getAttribute('data-index'))));
        const onListLeave = Event.map(this._register(new DomEmitter(list, 'mouseleave')).event, () => -1);
        const onRowHoverOrLeave = Event.latch(Event.any(onRowHover, onListLeave));
        const onRowPermanentHover = Event.debounce(onRowHoverOrLeave, (_, e) => e, 500);
        this._register(onRowPermanentHover((e) => {
            if (e !== -1 && this.table.row(e)) {
                this.markersViewModel.onMarkerMouseHover(this.table.row(e));
            }
        }));
    }
    get contextKeyService() {
        return this.table.contextKeyService;
    }
    get onContextMenu() {
        return this.table.onContextMenu;
    }
    get onDidOpen() {
        return this.table.onDidOpen;
    }
    get onDidChangeFocus() {
        return this.table.onDidChangeFocus;
    }
    get onDidChangeSelection() {
        return this.table.onDidChangeSelection;
    }
    collapseMarkers() { }
    domFocus() {
        this.table.domFocus();
    }
    filterMarkers(resourceMarkers, filterOptions) {
        this.filterOptions = filterOptions;
        this.reset(resourceMarkers);
    }
    getFocus() {
        const focus = this.table.getFocus();
        return focus.length > 0 ? [...focus.map((f) => this.table.row(f))] : [];
    }
    getHTMLElement() {
        return this.table.getHTMLElement();
    }
    getRelativeTop(marker) {
        return marker ? this.table.getRelativeTop(this.table.indexOf(marker)) : null;
    }
    getSelection() {
        const selection = this.table.getSelection();
        return selection.length > 0 ? [...selection.map((i) => this.table.row(i))] : [];
    }
    getVisibleItemCount() {
        return this._itemCount;
    }
    isVisible() {
        return !this.container.classList.contains('hidden');
    }
    layout(height, width) {
        this.container.style.height = `${height}px`;
        this.table.layout(height, width);
    }
    reset(resourceMarkers) {
        this.resourceMarkers = resourceMarkers;
        const items = [];
        for (const resourceMarker of this.resourceMarkers) {
            for (const marker of resourceMarker.markers) {
                if (unsupportedSchemas.has(marker.resource.scheme)) {
                    continue;
                }
                // Exclude pattern
                if (this.filterOptions.excludesMatcher.matches(marker.resource)) {
                    continue;
                }
                // Include pattern
                if (this.filterOptions.includesMatcher.matches(marker.resource)) {
                    items.push(new MarkerTableItem(marker));
                    continue;
                }
                // Severity filter
                const matchesSeverity = (this.filterOptions.showErrors && MarkerSeverity.Error === marker.marker.severity) ||
                    (this.filterOptions.showWarnings && MarkerSeverity.Warning === marker.marker.severity) ||
                    (this.filterOptions.showInfos && MarkerSeverity.Info === marker.marker.severity);
                if (!matchesSeverity) {
                    continue;
                }
                // Text filter
                if (this.filterOptions.textFilter.text) {
                    const sourceMatches = marker.marker.source
                        ? (FilterOptions._filter(this.filterOptions.textFilter.text, marker.marker.source) ??
                            undefined)
                        : undefined;
                    const codeMatches = marker.marker.code
                        ? (FilterOptions._filter(this.filterOptions.textFilter.text, typeof marker.marker.code === 'string'
                            ? marker.marker.code
                            : marker.marker.code.value) ?? undefined)
                        : undefined;
                    const messageMatches = FilterOptions._messageFilter(this.filterOptions.textFilter.text, marker.marker.message) ?? undefined;
                    const fileMatches = FilterOptions._messageFilter(this.filterOptions.textFilter.text, this.labelService.getUriLabel(marker.resource, { relative: true })) ?? undefined;
                    const matched = sourceMatches || codeMatches || messageMatches || fileMatches;
                    if ((matched && !this.filterOptions.textFilter.negate) ||
                        (!matched && this.filterOptions.textFilter.negate)) {
                        items.push(new MarkerTableItem(marker, sourceMatches, codeMatches, messageMatches, fileMatches));
                    }
                    continue;
                }
                items.push(new MarkerTableItem(marker));
            }
        }
        this._itemCount = items.length;
        this.table.splice(0, Number.POSITIVE_INFINITY, items.sort((a, b) => {
            let result = MarkerSeverity.compare(a.marker.severity, b.marker.severity);
            if (result === 0) {
                result = compareMarkersByUri(a.marker, b.marker);
            }
            if (result === 0) {
                result = Range.compareRangesUsingStarts(a.marker, b.marker);
            }
            return result;
        }));
    }
    revealMarkers(activeResource, focus, lastSelectedRelativeTop) {
        if (activeResource) {
            const activeResourceIndex = this.resourceMarkers.indexOf(activeResource);
            if (activeResourceIndex !== -1) {
                if (this.hasSelectedMarkerFor(activeResource)) {
                    const tableSelection = this.table.getSelection();
                    this.table.reveal(tableSelection[0], lastSelectedRelativeTop);
                    if (focus) {
                        this.table.setFocus(tableSelection);
                    }
                }
                else {
                    this.table.reveal(activeResourceIndex, 0);
                    if (focus) {
                        this.table.setFocus([activeResourceIndex]);
                        this.table.setSelection([activeResourceIndex]);
                    }
                }
            }
        }
        else if (focus) {
            this.table.setSelection([]);
            this.table.focusFirst();
        }
    }
    setAriaLabel(label) {
        this.table.domNode.ariaLabel = label;
    }
    setMarkerSelection(selection, focus) {
        if (this.isVisible()) {
            if (selection && selection.length > 0) {
                this.table.setSelection(selection.map((m) => this.findMarkerIndex(m)));
                if (focus && focus.length > 0) {
                    this.table.setFocus(focus.map((f) => this.findMarkerIndex(f)));
                }
                else {
                    this.table.setFocus([this.findMarkerIndex(selection[0])]);
                }
                this.table.reveal(this.findMarkerIndex(selection[0]));
            }
            else if (this.getSelection().length === 0 && this.getVisibleItemCount() > 0) {
                this.table.setSelection([0]);
                this.table.setFocus([0]);
                this.table.reveal(0);
            }
        }
    }
    toggleVisibility(hide) {
        this.container.classList.toggle('hidden', hide);
    }
    update(resourceMarkers) {
        for (const resourceMarker of resourceMarkers) {
            const index = this.resourceMarkers.indexOf(resourceMarker);
            this.resourceMarkers.splice(index, 1, resourceMarker);
        }
        this.reset(this.resourceMarkers);
    }
    updateMarker(marker) {
        this.table.rerender();
    }
    findMarkerIndex(marker) {
        for (let index = 0; index < this.table.length; index++) {
            if (this.table.row(index).marker === marker.marker) {
                return index;
            }
        }
        return -1;
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
};
MarkersTable = __decorate([
    __param(5, IInstantiationService),
    __param(6, ILabelService)
], MarkersTable);
export { MarkersTable };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1RhYmxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vyc1RhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFPeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBR04sY0FBYyxHQUNkLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQW1CLE1BQU0sbUJBQW1CLENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRzdF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