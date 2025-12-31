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
import * as dom from '../../../../base/browser/dom.js';
import * as paths from '../../../../base/common/path.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ResourceMarkers, Marker, RelatedInformation, MarkerTableItem, } from './markersModel.js';
import Messages from './messages.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { dispose, Disposable, toDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { QuickFixAction, QuickFixActionViewItem } from './markersViewActions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import { FilterOptions } from './markersFilterOptions.js';
import { Emitter } from '../../../../base/common/event.js';
import { isUndefinedOrNull } from '../../../../base/common/types.js';
import { Action, toAction } from '../../../../base/common/actions.js';
import { localize } from '../../../../nls.js';
import { createCancelablePromise, Delayer, } from '../../../../base/common/async.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Range } from '../../../../editor/common/core/range.js';
import { applyCodeAction, ApplyCodeActionReason, getCodeActions, } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind, CodeActionTriggerSource, } from '../../../../editor/contrib/codeAction/common/types.js';
import { IEditorService, ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { MarkersContextKeys } from '../common/markers.js';
import { unsupportedSchemas } from '../../../../platform/markers/common/markerService.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import Severity from '../../../../base/common/severity.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let MarkersWidgetAccessibilityProvider = class MarkersWidgetAccessibilityProvider {
    constructor(labelService) {
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('problemsView', 'Problems View');
    }
    getAriaLabel(element) {
        if (element instanceof ResourceMarkers) {
            const path = this.labelService.getUriLabel(element.resource, { relative: true }) ||
                element.resource.fsPath;
            return Messages.MARKERS_TREE_ARIA_LABEL_RESOURCE(element.markers.length, element.name, paths.dirname(path));
        }
        if (element instanceof Marker || element instanceof MarkerTableItem) {
            return Messages.MARKERS_TREE_ARIA_LABEL_MARKER(element);
        }
        if (element instanceof RelatedInformation) {
            return Messages.MARKERS_TREE_ARIA_LABEL_RELATED_INFORMATION(element.raw);
        }
        return null;
    }
};
MarkersWidgetAccessibilityProvider = __decorate([
    __param(0, ILabelService)
], MarkersWidgetAccessibilityProvider);
export { MarkersWidgetAccessibilityProvider };
var TemplateId;
(function (TemplateId) {
    TemplateId["ResourceMarkers"] = "rm";
    TemplateId["Marker"] = "m";
    TemplateId["RelatedInformation"] = "ri";
})(TemplateId || (TemplateId = {}));
export class VirtualDelegate {
    static { this.LINE_HEIGHT = 22; }
    constructor(markersViewState) {
        this.markersViewState = markersViewState;
    }
    getHeight(element) {
        if (element instanceof Marker) {
            const viewModel = this.markersViewState.getViewModel(element);
            const noOfLines = !viewModel || viewModel.multiline ? element.lines.length : 1;
            return noOfLines * VirtualDelegate.LINE_HEIGHT;
        }
        return VirtualDelegate.LINE_HEIGHT;
    }
    getTemplateId(element) {
        if (element instanceof ResourceMarkers) {
            return "rm" /* TemplateId.ResourceMarkers */;
        }
        else if (element instanceof Marker) {
            return "m" /* TemplateId.Marker */;
        }
        else {
            return "ri" /* TemplateId.RelatedInformation */;
        }
    }
}
var FilterDataType;
(function (FilterDataType) {
    FilterDataType[FilterDataType["ResourceMarkers"] = 0] = "ResourceMarkers";
    FilterDataType[FilterDataType["Marker"] = 1] = "Marker";
    FilterDataType[FilterDataType["RelatedInformation"] = 2] = "RelatedInformation";
})(FilterDataType || (FilterDataType = {}));
export class ResourceMarkersRenderer {
    constructor(labels, onDidChangeRenderNodeCount) {
        this.labels = labels;
        this.renderedNodes = new Map();
        this.disposables = new DisposableStore();
        this.templateId = "rm" /* TemplateId.ResourceMarkers */;
        onDidChangeRenderNodeCount(this.onDidChangeRenderNodeCount, this, this.disposables);
    }
    renderTemplate(container) {
        const resourceLabelContainer = dom.append(container, dom.$('.resource-label-container'));
        const resourceLabel = this.labels.create(resourceLabelContainer, { supportHighlights: true });
        const badgeWrapper = dom.append(container, dom.$('.count-badge-wrapper'));
        const count = new CountBadge(badgeWrapper, {}, defaultCountBadgeStyles);
        return { count, resourceLabel };
    }
    renderElement(node, _, templateData) {
        const resourceMarkers = node.element;
        const uriMatches = (node.filterData && node.filterData.uriMatches) || [];
        templateData.resourceLabel.setFile(resourceMarkers.resource, { matches: uriMatches });
        this.updateCount(node, templateData);
        const nodeRenders = this.renderedNodes.get(resourceMarkers) ?? [];
        this.renderedNodes.set(resourceMarkers, [...nodeRenders, templateData]);
    }
    disposeElement(node, index, templateData) {
        const nodeRenders = this.renderedNodes.get(node.element) ?? [];
        const nodeRenderIndex = nodeRenders.findIndex((nodeRender) => templateData === nodeRender);
        if (nodeRenderIndex < 0) {
            throw new Error('Disposing unknown resource marker');
        }
        if (nodeRenders.length === 1) {
            this.renderedNodes.delete(node.element);
        }
        else {
            nodeRenders.splice(nodeRenderIndex, 1);
        }
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
        templateData.count.dispose();
    }
    onDidChangeRenderNodeCount(node) {
        const nodeRenders = this.renderedNodes.get(node.element);
        if (!nodeRenders) {
            return;
        }
        nodeRenders.forEach((nodeRender) => this.updateCount(node, nodeRender));
    }
    updateCount(node, templateData) {
        templateData.count.setCount(node.children.reduce((r, n) => r + (n.visible ? 1 : 0), 0));
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class FileResourceMarkersRenderer extends ResourceMarkersRenderer {
}
let MarkerRenderer = class MarkerRenderer {
    constructor(markersViewState, hoverService, instantiationService, openerService) {
        this.markersViewState = markersViewState;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.templateId = "m" /* TemplateId.Marker */;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.markerWidget = new MarkerWidget(container, this.markersViewState, this.hoverService, this.openerService, this.instantiationService);
        return data;
    }
    renderElement(node, _, templateData) {
        templateData.markerWidget.render(node.element, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.markerWidget.dispose();
    }
};
MarkerRenderer = __decorate([
    __param(1, IHoverService),
    __param(2, IInstantiationService),
    __param(3, IOpenerService)
], MarkerRenderer);
export { MarkerRenderer };
const expandedIcon = registerIcon('markers-view-multi-line-expanded', Codicon.chevronUp, localize('expandedIcon', 'Icon indicating that multiple lines are shown in the markers view.'));
const collapsedIcon = registerIcon('markers-view-multi-line-collapsed', Codicon.chevronDown, localize('collapsedIcon', 'Icon indicating that multiple lines are collapsed in the markers view.'));
const toggleMultilineAction = 'problems.action.toggleMultiline';
class ToggleMultilineActionViewItem extends ActionViewItem {
    render(container) {
        super.render(container);
        this.updateExpandedAttribute();
    }
    updateClass() {
        super.updateClass();
        this.updateExpandedAttribute();
    }
    updateExpandedAttribute() {
        this.element?.setAttribute('aria-expanded', `${this._action.class === ThemeIcon.asClassName(expandedIcon)}`);
    }
}
class MarkerWidget extends Disposable {
    constructor(parent, markersViewModel, _hoverService, _openerService, _instantiationService) {
        super();
        this.parent = parent;
        this.markersViewModel = markersViewModel;
        this._hoverService = _hoverService;
        this._openerService = _openerService;
        this.disposables = this._register(new DisposableStore());
        this.actionBar = this._register(new ActionBar(dom.append(parent, dom.$('.actions')), {
            actionViewItemProvider: (action, options) => action.id === QuickFixAction.ID
                ? _instantiationService.createInstance(QuickFixActionViewItem, action, options)
                : undefined,
        }));
        // wrap the icon in a container that get the icon color as foreground color. That way, if the
        // list view does not have a specific color for the icon (=the color variable is invalid) it
        // falls back to the foreground color of container (inherit)
        this.iconContainer = dom.append(parent, dom.$(''));
        this.icon = dom.append(this.iconContainer, dom.$(''));
        this.messageAndDetailsContainer = dom.append(parent, dom.$('.marker-message-details-container'));
        this.messageAndDetailsContainerHover = this._register(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.messageAndDetailsContainer, ''));
    }
    render(element, filterData) {
        this.actionBar.clear();
        this.disposables.clear();
        dom.clearNode(this.messageAndDetailsContainer);
        this.iconContainer.className = `marker-icon ${Severity.toString(MarkerSeverity.toSeverity(element.marker.severity))}`;
        this.icon.className = `codicon ${SeverityIcon.className(MarkerSeverity.toSeverity(element.marker.severity))}`;
        this.renderQuickfixActionbar(element);
        this.renderMessageAndDetails(element, filterData);
        this.disposables.add(dom.addDisposableListener(this.parent, dom.EventType.MOUSE_OVER, () => this.markersViewModel.onMarkerMouseHover(element)));
        this.disposables.add(dom.addDisposableListener(this.parent, dom.EventType.MOUSE_LEAVE, () => this.markersViewModel.onMarkerMouseLeave(element)));
    }
    renderQuickfixActionbar(marker) {
        const viewModel = this.markersViewModel.getViewModel(marker);
        if (viewModel) {
            const quickFixAction = viewModel.quickFixAction;
            this.actionBar.push([quickFixAction], { icon: true, label: false });
            this.iconContainer.classList.toggle('quickFix', quickFixAction.enabled);
            quickFixAction.onDidChange(({ enabled }) => {
                if (!isUndefinedOrNull(enabled)) {
                    this.iconContainer.classList.toggle('quickFix', enabled);
                }
            }, this, this.disposables);
            quickFixAction.onShowQuickFixes(() => {
                const quickFixActionViewItem = this.actionBar.viewItems[0];
                if (quickFixActionViewItem) {
                    quickFixActionViewItem.showQuickFixes();
                }
            }, this, this.disposables);
        }
    }
    renderMultilineActionbar(marker, parent) {
        const multilineActionbar = this.disposables.add(new ActionBar(dom.append(parent, dom.$('.multiline-actions')), {
            actionViewItemProvider: (action, options) => {
                if (action.id === toggleMultilineAction) {
                    return new ToggleMultilineActionViewItem(undefined, action, { ...options, icon: true });
                }
                return undefined;
            },
        }));
        this.disposables.add(multilineActionbar);
        const viewModel = this.markersViewModel.getViewModel(marker);
        const multiline = viewModel && viewModel.multiline;
        const action = this.disposables.add(new Action(toggleMultilineAction));
        action.enabled = !!viewModel && marker.lines.length > 1;
        action.tooltip = multiline
            ? localize('single line', 'Show message in single line')
            : localize('multi line', 'Show message in multiple lines');
        action.class = ThemeIcon.asClassName(multiline ? expandedIcon : collapsedIcon);
        action.run = () => {
            if (viewModel) {
                viewModel.multiline = !viewModel.multiline;
            }
            return Promise.resolve();
        };
        multilineActionbar.push([action], { icon: true, label: false });
    }
    renderMessageAndDetails(element, filterData) {
        const { marker, lines } = element;
        const viewState = this.markersViewModel.getViewModel(element);
        const multiline = !viewState || viewState.multiline;
        const lineMatches = (filterData && filterData.lineMatches) || [];
        this.messageAndDetailsContainerHover.update(element.marker.message);
        const lineElements = [];
        for (let index = 0; index < (multiline ? lines.length : 1); index++) {
            const lineElement = dom.append(this.messageAndDetailsContainer, dom.$('.marker-message-line'));
            const messageElement = dom.append(lineElement, dom.$('.marker-message'));
            const highlightedLabel = this.disposables.add(new HighlightedLabel(messageElement));
            highlightedLabel.set(lines[index].length > 1000 ? `${lines[index].substring(0, 1000)}...` : lines[index], lineMatches[index]);
            if (lines[index] === '') {
                lineElement.style.height = `${VirtualDelegate.LINE_HEIGHT}px`;
            }
            lineElements.push(lineElement);
        }
        this.renderDetails(marker, filterData, lineElements[0]);
        this.renderMultilineActionbar(element, lineElements[0]);
    }
    renderDetails(marker, filterData, parent) {
        parent.classList.add('details-container');
        if (marker.source || marker.code) {
            const source = this.disposables.add(new HighlightedLabel(dom.append(parent, dom.$('.marker-source'))));
            const sourceMatches = (filterData && filterData.sourceMatches) || [];
            source.set(marker.source, sourceMatches);
            if (marker.code) {
                if (typeof marker.code === 'string') {
                    const code = this.disposables.add(new HighlightedLabel(dom.append(parent, dom.$('.marker-code'))));
                    const codeMatches = (filterData && filterData.codeMatches) || [];
                    code.set(marker.code, codeMatches);
                }
                else {
                    const container = dom.$('.marker-code');
                    const code = this.disposables.add(new HighlightedLabel(container));
                    const link = marker.code.target.toString(true);
                    this.disposables.add(new Link(parent, { href: link, label: container, title: link }, undefined, this._hoverService, this._openerService));
                    const codeMatches = (filterData && filterData.codeMatches) || [];
                    code.set(marker.code.value, codeMatches);
                }
            }
        }
        const lnCol = dom.append(parent, dom.$('span.marker-line'));
        lnCol.textContent = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(marker.startLineNumber, marker.startColumn);
    }
}
let RelatedInformationRenderer = class RelatedInformationRenderer {
    constructor(labelService) {
        this.labelService = labelService;
        this.templateId = "ri" /* TemplateId.RelatedInformation */;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        dom.append(container, dom.$('.actions'));
        dom.append(container, dom.$('.icon'));
        data.resourceLabel = new HighlightedLabel(dom.append(container, dom.$('.related-info-resource')));
        data.lnCol = dom.append(container, dom.$('span.marker-line'));
        const separator = dom.append(container, dom.$('span.related-info-resource-separator'));
        separator.textContent = ':';
        separator.style.paddingRight = '4px';
        data.description = new HighlightedLabel(dom.append(container, dom.$('.marker-description')));
        return data;
    }
    renderElement(node, _, templateData) {
        const relatedInformation = node.element.raw;
        const uriMatches = (node.filterData && node.filterData.uriMatches) || [];
        const messageMatches = (node.filterData && node.filterData.messageMatches) || [];
        const resourceLabelTitle = this.labelService.getUriLabel(relatedInformation.resource, {
            relative: true,
        });
        templateData.resourceLabel.set(basename(relatedInformation.resource), uriMatches, resourceLabelTitle);
        templateData.lnCol.textContent = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(relatedInformation.startLineNumber, relatedInformation.startColumn);
        templateData.description.set(relatedInformation.message, messageMatches, relatedInformation.message);
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
        templateData.description.dispose();
    }
};
RelatedInformationRenderer = __decorate([
    __param(0, ILabelService)
], RelatedInformationRenderer);
export { RelatedInformationRenderer };
export class Filter {
    constructor(options) {
        this.options = options;
    }
    filter(element, parentVisibility) {
        if (element instanceof ResourceMarkers) {
            return this.filterResourceMarkers(element);
        }
        else if (element instanceof Marker) {
            return this.filterMarker(element, parentVisibility);
        }
        else {
            return this.filterRelatedInformation(element, parentVisibility);
        }
    }
    filterResourceMarkers(resourceMarkers) {
        if (unsupportedSchemas.has(resourceMarkers.resource.scheme)) {
            return false;
        }
        // Filter resource by pattern first (globs)
        // Excludes pattern
        if (this.options.excludesMatcher.matches(resourceMarkers.resource)) {
            return false;
        }
        // Includes pattern
        if (this.options.includesMatcher.matches(resourceMarkers.resource)) {
            return true;
        }
        // Fiter by text. Do not apply negated filters on resources instead use exclude patterns
        if (this.options.textFilter.text && !this.options.textFilter.negate) {
            const uriMatches = FilterOptions._filter(this.options.textFilter.text, basename(resourceMarkers.resource));
            if (uriMatches) {
                return {
                    visibility: true,
                    data: { type: 0 /* FilterDataType.ResourceMarkers */, uriMatches: uriMatches || [] },
                };
            }
        }
        return 2 /* TreeVisibility.Recurse */;
    }
    filterMarker(marker, parentVisibility) {
        const matchesSeverity = (this.options.showErrors && MarkerSeverity.Error === marker.marker.severity) ||
            (this.options.showWarnings && MarkerSeverity.Warning === marker.marker.severity) ||
            (this.options.showInfos && MarkerSeverity.Info === marker.marker.severity);
        if (!matchesSeverity) {
            return false;
        }
        if (!this.options.textFilter.text) {
            return true;
        }
        const lineMatches = [];
        for (const line of marker.lines) {
            const lineMatch = FilterOptions._messageFilter(this.options.textFilter.text, line);
            lineMatches.push(lineMatch || []);
        }
        const sourceMatches = marker.marker.source
            ? FilterOptions._filter(this.options.textFilter.text, marker.marker.source)
            : undefined;
        const codeMatches = marker.marker.code
            ? FilterOptions._filter(this.options.textFilter.text, typeof marker.marker.code === 'string' ? marker.marker.code : marker.marker.code.value)
            : undefined;
        const matched = sourceMatches || codeMatches || lineMatches.some((lineMatch) => lineMatch.length > 0);
        // Matched and not negated
        if (matched && !this.options.textFilter.negate) {
            return {
                visibility: true,
                data: {
                    type: 1 /* FilterDataType.Marker */,
                    lineMatches,
                    sourceMatches: sourceMatches || [],
                    codeMatches: codeMatches || [],
                },
            };
        }
        // Matched and negated - exclude it only if parent visibility is not set
        if (matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return false;
        }
        // Not matched and negated - include it only if parent visibility is not set
        if (!matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return true;
        }
        return parentVisibility;
    }
    filterRelatedInformation(relatedInformation, parentVisibility) {
        if (!this.options.textFilter.text) {
            return true;
        }
        const uriMatches = FilterOptions._filter(this.options.textFilter.text, basename(relatedInformation.raw.resource));
        const messageMatches = FilterOptions._messageFilter(this.options.textFilter.text, paths.basename(relatedInformation.raw.message));
        const matched = uriMatches || messageMatches;
        // Matched and not negated
        if (matched && !this.options.textFilter.negate) {
            return {
                visibility: true,
                data: {
                    type: 2 /* FilterDataType.RelatedInformation */,
                    uriMatches: uriMatches || [],
                    messageMatches: messageMatches || [],
                },
            };
        }
        // Matched and negated - exclude it only if parent visibility is not set
        if (matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return false;
        }
        // Not matched and negated - include it only if parent visibility is not set
        if (!matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return true;
        }
        return parentVisibility;
    }
}
let MarkerViewModel = class MarkerViewModel extends Disposable {
    constructor(marker, modelService, instantiationService, editorService, languageFeaturesService) {
        super();
        this.marker = marker;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.languageFeaturesService = languageFeaturesService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.modelPromise = null;
        this.codeActionsPromise = null;
        this._multiline = true;
        this._quickFixAction = null;
        this._register(toDisposable(() => {
            if (this.modelPromise) {
                this.modelPromise.cancel();
            }
            if (this.codeActionsPromise) {
                this.codeActionsPromise.cancel();
            }
        }));
    }
    get multiline() {
        return this._multiline;
    }
    set multiline(value) {
        if (this._multiline !== value) {
            this._multiline = value;
            this._onDidChange.fire();
        }
    }
    get quickFixAction() {
        if (!this._quickFixAction) {
            this._quickFixAction = this._register(this.instantiationService.createInstance(QuickFixAction, this.marker));
        }
        return this._quickFixAction;
    }
    showLightBulb() {
        this.setQuickFixes(true);
    }
    async setQuickFixes(waitForModel) {
        const codeActions = await this.getCodeActions(waitForModel);
        this.quickFixAction.quickFixes = codeActions ? this.toActions(codeActions) : [];
        this.quickFixAction.autoFixable(!!codeActions && codeActions.hasAutoFix);
    }
    getCodeActions(waitForModel) {
        if (this.codeActionsPromise !== null) {
            return this.codeActionsPromise;
        }
        return this.getModel(waitForModel).then((model) => {
            if (model) {
                if (!this.codeActionsPromise) {
                    this.codeActionsPromise = createCancelablePromise((cancellationToken) => {
                        return getCodeActions(this.languageFeaturesService.codeActionProvider, model, new Range(this.marker.range.startLineNumber, this.marker.range.startColumn, this.marker.range.endLineNumber, this.marker.range.endColumn), {
                            type: 1 /* CodeActionTriggerType.Invoke */,
                            triggerAction: CodeActionTriggerSource.ProblemsView,
                            filter: { include: CodeActionKind.QuickFix },
                        }, Progress.None, cancellationToken).then((actions) => {
                            return this._register(actions);
                        });
                    });
                }
                return this.codeActionsPromise;
            }
            return null;
        });
    }
    toActions(codeActions) {
        return codeActions.validActions.map((item) => toAction({
            id: item.action.command ? item.action.command.id : item.action.title,
            label: item.action.title,
            run: async () => {
                await this.openFileAtMarker(this.marker);
                return await this.instantiationService.invokeFunction(applyCodeAction, item, ApplyCodeActionReason.FromProblemsView);
            },
        }));
    }
    openFileAtMarker(element) {
        const { resource, selection } = { resource: element.resource, selection: element.range };
        return this.editorService
            .openEditor({
            resource,
            options: {
                selection,
                preserveFocus: true,
                pinned: false,
                revealIfVisible: true,
            },
        }, ACTIVE_GROUP)
            .then(() => undefined);
    }
    getModel(waitForModel) {
        const model = this.modelService.getModel(this.marker.resource);
        if (model) {
            return Promise.resolve(model);
        }
        if (waitForModel) {
            if (!this.modelPromise) {
                this.modelPromise = createCancelablePromise((cancellationToken) => {
                    return new Promise((c) => {
                        this._register(this.modelService.onModelAdded((model) => {
                            if (isEqual(model.uri, this.marker.resource)) {
                                c(model);
                            }
                        }));
                    });
                });
            }
            return this.modelPromise;
        }
        return Promise.resolve(null);
    }
};
MarkerViewModel = __decorate([
    __param(1, IModelService),
    __param(2, IInstantiationService),
    __param(3, IEditorService),
    __param(4, ILanguageFeaturesService)
], MarkerViewModel);
export { MarkerViewModel };
let MarkersViewModel = class MarkersViewModel extends Disposable {
    constructor(multiline = true, viewMode = "tree" /* MarkersViewMode.Tree */, contextKeyService, instantiationService) {
        super();
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeViewMode = this._register(new Emitter());
        this.onDidChangeViewMode = this._onDidChangeViewMode.event;
        this.markersViewStates = new Map();
        this.markersPerResource = new Map();
        this.bulkUpdate = false;
        this.hoveredMarker = null;
        this.hoverDelayer = new Delayer(300);
        this._multiline = true;
        this._viewMode = "tree" /* MarkersViewMode.Tree */;
        this._multiline = multiline;
        this._viewMode = viewMode;
        this.viewModeContextKey = MarkersContextKeys.MarkersViewModeContextKey.bindTo(this.contextKeyService);
        this.viewModeContextKey.set(viewMode);
    }
    add(marker) {
        if (!this.markersViewStates.has(marker.id)) {
            const viewModel = this.instantiationService.createInstance(MarkerViewModel, marker);
            const disposables = [viewModel];
            viewModel.multiline = this.multiline;
            viewModel.onDidChange(() => {
                if (!this.bulkUpdate) {
                    this._onDidChange.fire(marker);
                }
            }, this, disposables);
            this.markersViewStates.set(marker.id, { viewModel, disposables });
            const markers = this.markersPerResource.get(marker.resource.toString()) || [];
            markers.push(marker);
            this.markersPerResource.set(marker.resource.toString(), markers);
        }
    }
    remove(resource) {
        const markers = this.markersPerResource.get(resource.toString()) || [];
        for (const marker of markers) {
            const value = this.markersViewStates.get(marker.id);
            if (value) {
                dispose(value.disposables);
            }
            this.markersViewStates.delete(marker.id);
            if (this.hoveredMarker === marker) {
                this.hoveredMarker = null;
            }
        }
        this.markersPerResource.delete(resource.toString());
    }
    getViewModel(marker) {
        const value = this.markersViewStates.get(marker.id);
        return value ? value.viewModel : null;
    }
    onMarkerMouseHover(marker) {
        this.hoveredMarker = marker;
        this.hoverDelayer.trigger(() => {
            if (this.hoveredMarker) {
                const model = this.getViewModel(this.hoveredMarker);
                if (model) {
                    model.showLightBulb();
                }
            }
        });
    }
    onMarkerMouseLeave(marker) {
        if (this.hoveredMarker === marker) {
            this.hoveredMarker = null;
        }
    }
    get multiline() {
        return this._multiline;
    }
    set multiline(value) {
        let changed = false;
        if (this._multiline !== value) {
            this._multiline = value;
            changed = true;
        }
        this.bulkUpdate = true;
        this.markersViewStates.forEach(({ viewModel }) => {
            if (viewModel.multiline !== value) {
                viewModel.multiline = value;
                changed = true;
            }
        });
        this.bulkUpdate = false;
        if (changed) {
            this._onDidChange.fire(undefined);
        }
    }
    get viewMode() {
        return this._viewMode;
    }
    set viewMode(value) {
        if (this._viewMode === value) {
            return;
        }
        this._viewMode = value;
        this._onDidChangeViewMode.fire(value);
        this.viewModeContextKey.set(value);
    }
    dispose() {
        this.markersViewStates.forEach(({ disposables }) => dispose(disposables));
        this.markersViewStates.clear();
        this.markersPerResource.clear();
        super.dispose();
    }
};
MarkersViewModel = __decorate([
    __param(2, IContextKeyService),
    __param(3, IInstantiationService)
], MarkersViewModel);
export { MarkersViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1RyZWVWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vyc1RyZWVWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNuRyxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUNOLGVBQWUsRUFDZixNQUFNLEVBQ04sa0JBQWtCLEVBRWxCLGVBQWUsR0FDZixNQUFNLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUNwQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUVOLE9BQU8sRUFDUCxVQUFVLEVBQ1YsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFTeEUsT0FB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