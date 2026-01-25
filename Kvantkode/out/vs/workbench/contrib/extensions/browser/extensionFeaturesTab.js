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
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { $, append, clearNode } from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { Sizing, SplitView } from '../../../../base/browser/ui/splitview/splitview.js';
import { Extensions, IExtensionFeaturesManagementService, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { getExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles, defaultKeybindingLabelStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { getErrorMessage, onUnexpectedError } from '../../../../base/common/errors.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { PANEL_SECTION_BORDER } from '../../../common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import Severity from '../../../../base/common/severity.js';
import { errorIcon, infoIcon, warningIcon } from './extensionsIcons.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { OS } from '../../../../base/common/platform.js';
import { MarkdownString, isMarkdownString, } from '../../../../base/common/htmlContent.js';
import { Color } from '../../../../base/common/color.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ResolvedKeybinding } from '../../../../base/common/keybindings.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { foreground, chartAxis, chartGuide, chartLine, } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let RuntimeStatusMarkdownRenderer = class RuntimeStatusMarkdownRenderer extends Disposable {
    static { this.ID = 'runtimeStatus'; }
    constructor(extensionService, openerService, hoverService, extensionFeaturesManagementService) {
        super();
        this.extensionService = extensionService;
        this.openerService = openerService;
        this.hoverService = hoverService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.type = 'element';
    }
    shouldRender(manifest) {
        const extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        if (!this.extensionService.extensions.some((e) => ExtensionIdentifier.equals(e.identifier, extensionId))) {
            return false;
        }
        return !!manifest.main || !!manifest.browser;
    }
    render(manifest) {
        const disposables = new DisposableStore();
        const extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        const emitter = disposables.add(new Emitter());
        disposables.add(this.extensionService.onDidChangeExtensionsStatus((e) => {
            if (e.some((extension) => ExtensionIdentifier.equals(extension, extensionId))) {
                emitter.fire(this.createElement(manifest, disposables));
            }
        }));
        disposables.add(this.extensionFeaturesManagementService.onDidChangeAccessData((e) => emitter.fire(this.createElement(manifest, disposables))));
        return {
            onDidChange: emitter.event,
            data: this.createElement(manifest, disposables),
            dispose: () => disposables.dispose(),
        };
    }
    createElement(manifest, disposables) {
        const container = $('.runtime-status');
        const extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        const status = this.extensionService.getExtensionsStatus()[extensionId.value];
        if (this.extensionService.extensions.some((extension) => ExtensionIdentifier.equals(extension.identifier, extensionId))) {
            const data = new MarkdownString();
            data.appendMarkdown(`### ${localize('activation', 'Activation')}\n\n`);
            if (status.activationTimes) {
                if (status.activationTimes.activationReason.startup) {
                    data.appendMarkdown(`Activated on Startup: \`${status.activationTimes.activateCallTime}ms\``);
                }
                else {
                    data.appendMarkdown(`Activated by \`${status.activationTimes.activationReason.activationEvent}\` event: \`${status.activationTimes.activateCallTime}ms\``);
                }
            }
            else {
                data.appendMarkdown('Not yet activated');
            }
            this.renderMarkdown(data, container, disposables);
        }
        const features = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeatures();
        for (const feature of features) {
            const accessData = this.extensionFeaturesManagementService.getAccessData(extensionId, feature.id);
            if (accessData) {
                this.renderMarkdown(new MarkdownString(`\n ### ${localize('label', '{0} Usage', feature.label)}\n\n`), container, disposables);
                if (accessData.accessTimes.length) {
                    const description = append(container, $('.feature-chart-description', undefined, localize('chartDescription', 'There were {0} {1} requests from this extension in the last 30 days.', accessData?.accessTimes.length, feature.accessDataLabel ?? feature.label)));
                    description.style.marginBottom = '8px';
                    this.renderRequestsChart(container, accessData.accessTimes, disposables);
                }
                const status = accessData?.current?.status;
                if (status) {
                    const data = new MarkdownString();
                    if (status?.severity === Severity.Error) {
                        data.appendMarkdown(`$(${errorIcon.id}) ${status.message}\n\n`);
                    }
                    if (status?.severity === Severity.Warning) {
                        data.appendMarkdown(`$(${warningIcon.id}) ${status.message}\n\n`);
                    }
                    if (data.value) {
                        this.renderMarkdown(data, container, disposables);
                    }
                }
            }
        }
        if (status.runtimeErrors.length || status.messages.length) {
            const data = new MarkdownString();
            if (status.runtimeErrors.length) {
                data.appendMarkdown(`\n ### ${localize('uncaught errors', 'Uncaught Errors ({0})', status.runtimeErrors.length)}\n`);
                for (const error of status.runtimeErrors) {
                    data.appendMarkdown(`$(${Codicon.error.id})&nbsp;${getErrorMessage(error)}\n\n`);
                }
            }
            if (status.messages.length) {
                data.appendMarkdown(`\n ### ${localize('messaages', 'Messages ({0})', status.messages.length)}\n`);
                for (const message of status.messages) {
                    data.appendMarkdown(`$(${(message.type === Severity.Error ? Codicon.error : message.type === Severity.Warning ? Codicon.warning : Codicon.info).id})&nbsp;${message.message}\n\n`);
                }
            }
            if (data.value) {
                this.renderMarkdown(data, container, disposables);
            }
        }
        return container;
    }
    renderMarkdown(markdown, container, disposables) {
        const { element, dispose } = renderMarkdown({
            value: markdown.value,
            isTrusted: markdown.isTrusted,
            supportThemeIcons: true,
        }, {
            actionHandler: {
                callback: (content) => this.openerService
                    .open(content, { allowCommands: !!markdown.isTrusted })
                    .catch(onUnexpectedError),
                disposables,
            },
        });
        disposables.add(toDisposable(dispose));
        append(container, element);
    }
    renderRequestsChart(container, accessTimes, disposables) {
        const width = 450;
        const height = 250;
        const margin = { top: 0, right: 4, bottom: 20, left: 4 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const chartContainer = append(container, $('.feature-chart-container'));
        chartContainer.style.position = 'relative';
        const tooltip = append(chartContainer, $('.feature-chart-tooltip'));
        tooltip.style.position = 'absolute';
        tooltip.style.width = '0px';
        tooltip.style.height = '0px';
        let maxCount = 100;
        const map = new Map();
        for (const accessTime of accessTimes) {
            const day = `${accessTime.getDate()} ${accessTime.toLocaleString('default', { month: 'short' })}`;
            map.set(day, (map.get(day) ?? 0) + 1);
            maxCount = Math.max(maxCount, map.get(day));
        }
        const now = new Date();
        const points = [];
        for (let i = 0; i <= 30; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - (30 - i));
            const dateString = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            const count = map.get(dateString) ?? 0;
            const x = (i / 30) * innerWidth;
            const y = innerHeight - (count / maxCount) * innerHeight;
            points.push({ x, y, date: dateString, count });
        }
        const chart = append(chartContainer, $('.feature-chart'));
        const svg = append(chart, $.SVG('svg'));
        svg.setAttribute('width', `${width}px`);
        svg.setAttribute('height', `${height}px`);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const g = $.SVG('g');
        g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        svg.appendChild(g);
        const xAxisLine = $.SVG('line');
        xAxisLine.setAttribute('x1', '0');
        xAxisLine.setAttribute('y1', `${innerHeight}`);
        xAxisLine.setAttribute('x2', `${innerWidth}`);
        xAxisLine.setAttribute('y2', `${innerHeight}`);
        xAxisLine.setAttribute('stroke', asCssVariable(chartAxis));
        xAxisLine.setAttribute('stroke-width', '1px');
        g.appendChild(xAxisLine);
        for (let i = 1; i <= 30; i += 7) {
            const date = new Date(now);
            date.setDate(now.getDate() - (30 - i));
            const dateString = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            const x = (i / 30) * innerWidth;
            // Add vertical line
            const tick = $.SVG('line');
            tick.setAttribute('x1', `${x}`);
            tick.setAttribute('y1', `${innerHeight}`);
            tick.setAttribute('x2', `${x}`);
            tick.setAttribute('y2', `${innerHeight + 10}`);
            tick.setAttribute('stroke', asCssVariable(chartAxis));
            tick.setAttribute('stroke-width', '1px');
            g.appendChild(tick);
            const ruler = $.SVG('line');
            ruler.setAttribute('x1', `${x}`);
            ruler.setAttribute('y1', `0`);
            ruler.setAttribute('x2', `${x}`);
            ruler.setAttribute('y2', `${innerHeight}`);
            ruler.setAttribute('stroke', asCssVariable(chartGuide));
            ruler.setAttribute('stroke-width', '1px');
            g.appendChild(ruler);
            const xAxisDate = $.SVG('text');
            xAxisDate.setAttribute('x', `${x}`);
            xAxisDate.setAttribute('y', `${height}`); // Adjusted y position to be within the SVG view port
            xAxisDate.setAttribute('text-anchor', 'middle');
            xAxisDate.setAttribute('fill', asCssVariable(foreground));
            xAxisDate.setAttribute('font-size', '10px');
            xAxisDate.textContent = dateString;
            g.appendChild(xAxisDate);
        }
        const line = $.SVG('polyline');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', asCssVariable(chartLine));
        line.setAttribute('stroke-width', `2px`);
        line.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
        g.appendChild(line);
        const highlightCircle = $.SVG('circle');
        highlightCircle.setAttribute('r', `4px`);
        highlightCircle.style.display = 'none';
        g.appendChild(highlightCircle);
        const hoverDisposable = disposables.add(new MutableDisposable());
        const mouseMoveListener = (event) => {
            const rect = svg.getBoundingClientRect();
            const mouseX = event.clientX - rect.left - margin.left;
            let closestPoint;
            let minDistance = Infinity;
            points.forEach((point) => {
                const distance = Math.abs(point.x - mouseX);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                }
            });
            if (closestPoint) {
                highlightCircle.setAttribute('cx', `${closestPoint.x}`);
                highlightCircle.setAttribute('cy', `${closestPoint.y}`);
                highlightCircle.style.display = 'block';
                tooltip.style.left = `${closestPoint.x + 24}px`;
                tooltip.style.top = `${closestPoint.y + 14}px`;
                hoverDisposable.value = this.hoverService.showInstantHover({
                    content: new MarkdownString(`${closestPoint.date}: ${closestPoint.count} requests`),
                    target: tooltip,
                    appearance: {
                        showPointer: true,
                        skipFadeInAnimation: true,
                    },
                });
            }
            else {
                hoverDisposable.value = undefined;
            }
        };
        svg.addEventListener('mousemove', mouseMoveListener);
        disposables.add(toDisposable(() => svg.removeEventListener('mousemove', mouseMoveListener)));
        const mouseLeaveListener = () => {
            highlightCircle.style.display = 'none';
            hoverDisposable.value = undefined;
        };
        svg.addEventListener('mouseleave', mouseLeaveListener);
        disposables.add(toDisposable(() => svg.removeEventListener('mouseleave', mouseLeaveListener)));
    }
};
RuntimeStatusMarkdownRenderer = __decorate([
    __param(0, IExtensionService),
    __param(1, IOpenerService),
    __param(2, IHoverService),
    __param(3, IExtensionFeaturesManagementService)
], RuntimeStatusMarkdownRenderer);
const runtimeStatusFeature = {
    id: RuntimeStatusMarkdownRenderer.ID,
    label: localize('runtime', 'Runtime Status'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(RuntimeStatusMarkdownRenderer),
};
let ExtensionFeaturesTab = class ExtensionFeaturesTab extends Themable {
    constructor(manifest, feature, themeService, instantiationService) {
        super(themeService);
        this.manifest = manifest;
        this.feature = feature;
        this.instantiationService = instantiationService;
        this.featureView = this._register(new MutableDisposable());
        this.layoutParticipants = [];
        this.extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        this.domNode = $('div.subcontent.feature-contributions');
        this.create();
    }
    layout(height, width) {
        this.layoutParticipants.forEach((participant) => participant.layout(height, width));
    }
    create() {
        const features = this.getFeatures();
        if (features.length === 0) {
            append($('.no-features'), this.domNode).textContent = localize('noFeatures', 'No features contributed.');
            return;
        }
        const splitView = this._register(new SplitView(this.domNode, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: true,
        }));
        this.layoutParticipants.push({
            layout: (height, width) => {
                splitView.el.style.height = `${height - 14}px`;
                splitView.layout(width);
            },
        });
        const featuresListContainer = $('.features-list-container');
        const list = this._register(this.createFeaturesList(featuresListContainer));
        list.splice(0, list.length, features);
        const featureViewContainer = $('.feature-view-container');
        this._register(list.onDidChangeSelection((e) => {
            const feature = e.elements[0];
            if (feature) {
                this.showFeatureView(feature, featureViewContainer);
            }
        }));
        const index = this.feature ? features.findIndex((f) => f.id === this.feature) : 0;
        list.setSelection([index === -1 ? 0 : index]);
        splitView.addView({
            onDidChange: Event.None,
            element: featuresListContainer,
            minimumSize: 100,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                featuresListContainer.style.width = `${width}px`;
                list.layout(height, width);
            },
        }, 200, undefined, true);
        splitView.addView({
            onDidChange: Event.None,
            element: featureViewContainer,
            minimumSize: 500,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                featureViewContainer.style.width = `${width}px`;
                this.featureViewDimension = { height, width };
                this.layoutFeatureView();
            },
        }, Sizing.Distribute, undefined, true);
        splitView.style({
            separatorBorder: this.theme.getColor(PANEL_SECTION_BORDER),
        });
    }
    createFeaturesList(container) {
        const renderer = this.instantiationService.createInstance(ExtensionFeatureItemRenderer, this.extensionId);
        const delegate = new ExtensionFeatureItemDelegate();
        const list = this.instantiationService.createInstance(WorkbenchList, 'ExtensionFeaturesList', append(container, $('.features-list-wrapper')), delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(extensionFeature) {
                    return extensionFeature?.label ?? '';
                },
                getWidgetAriaLabel() {
                    return localize('extension features list', 'Extension Features');
                },
            },
            openOnSingleClick: true,
        });
        return list;
    }
    layoutFeatureView() {
        this.featureView.value?.layout(this.featureViewDimension?.height, this.featureViewDimension?.width);
    }
    showFeatureView(feature, container) {
        if (this.featureView.value?.feature.id === feature.id) {
            return;
        }
        clearNode(container);
        this.featureView.value = this.instantiationService.createInstance(ExtensionFeatureView, this.extensionId, this.manifest, feature);
        container.appendChild(this.featureView.value.domNode);
        this.layoutFeatureView();
    }
    getFeatures() {
        const features = Registry.as(Extensions.ExtensionFeaturesRegistry)
            .getExtensionFeatures()
            .filter((feature) => {
            const renderer = this.getRenderer(feature);
            const shouldRender = renderer?.shouldRender(this.manifest);
            renderer?.dispose();
            return shouldRender;
        })
            .sort((a, b) => a.label.localeCompare(b.label));
        const renderer = this.getRenderer(runtimeStatusFeature);
        if (renderer?.shouldRender(this.manifest)) {
            features.splice(0, 0, runtimeStatusFeature);
        }
        renderer?.dispose();
        return features;
    }
    getRenderer(feature) {
        return feature.renderer ? this.instantiationService.createInstance(feature.renderer) : undefined;
    }
};
ExtensionFeaturesTab = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService)
], ExtensionFeaturesTab);
export { ExtensionFeaturesTab };
class ExtensionFeatureItemDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId() {
        return 'extensionFeatureDescriptor';
    }
}
let ExtensionFeatureItemRenderer = class ExtensionFeatureItemRenderer {
    constructor(extensionId, extensionFeaturesManagementService) {
        this.extensionId = extensionId;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.templateId = 'extensionFeatureDescriptor';
    }
    renderTemplate(container) {
        container.classList.add('extension-feature-list-item');
        const label = append(container, $('.extension-feature-label'));
        const disabledElement = append(container, $('.extension-feature-disabled-label'));
        disabledElement.textContent = localize('revoked', 'No Access');
        const statusElement = append(container, $('.extension-feature-status'));
        return { label, disabledElement, statusElement, disposables: new DisposableStore() };
    }
    renderElement(element, index, templateData) {
        templateData.disposables.clear();
        templateData.label.textContent = element.label;
        templateData.disabledElement.style.display =
            element.id === runtimeStatusFeature.id ||
                this.extensionFeaturesManagementService.isEnabled(this.extensionId, element.id)
                ? 'none'
                : 'inherit';
        templateData.disposables.add(this.extensionFeaturesManagementService.onDidChangeEnablement(({ extension, featureId, enabled }) => {
            if (ExtensionIdentifier.equals(extension, this.extensionId) && featureId === element.id) {
                templateData.disabledElement.style.display = enabled ? 'none' : 'inherit';
            }
        }));
        const statusElementClassName = templateData.statusElement.className;
        const updateStatus = () => {
            const accessData = this.extensionFeaturesManagementService.getAccessData(this.extensionId, element.id);
            if (accessData?.current?.status) {
                templateData.statusElement.style.display = 'inherit';
                templateData.statusElement.className = `${statusElementClassName} ${SeverityIcon.className(accessData.current.status.severity)}`;
            }
            else {
                templateData.statusElement.style.display = 'none';
            }
        };
        updateStatus();
        templateData.disposables.add(this.extensionFeaturesManagementService.onDidChangeAccessData(({ extension, featureId }) => {
            if (ExtensionIdentifier.equals(extension, this.extensionId) && featureId === element.id) {
                updateStatus();
            }
        }));
    }
    disposeElement(element, index, templateData, height) {
        templateData.disposables.dispose();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
ExtensionFeatureItemRenderer = __decorate([
    __param(1, IExtensionFeaturesManagementService)
], ExtensionFeatureItemRenderer);
let ExtensionFeatureView = class ExtensionFeatureView extends Disposable {
    constructor(extensionId, manifest, feature, openerService, instantiationService, extensionFeaturesManagementService, dialogService) {
        super();
        this.extensionId = extensionId;
        this.manifest = manifest;
        this.feature = feature;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.dialogService = dialogService;
        this.layoutParticipants = [];
        this.domNode = $('.extension-feature-content');
        this.create(this.domNode);
    }
    create(content) {
        const header = append(content, $('.feature-header'));
        const title = append(header, $('.feature-title'));
        title.textContent = this.feature.label;
        if (this.feature.access.canToggle) {
            const actionsContainer = append(header, $('.feature-actions'));
            const button = new Button(actionsContainer, defaultButtonStyles);
            this.updateButtonLabel(button);
            this._register(this.extensionFeaturesManagementService.onDidChangeEnablement(({ extension, featureId }) => {
                if (ExtensionIdentifier.equals(extension, this.extensionId) &&
                    featureId === this.feature.id) {
                    this.updateButtonLabel(button);
                }
            }));
            this._register(button.onDidClick(async () => {
                const enabled = this.extensionFeaturesManagementService.isEnabled(this.extensionId, this.feature.id);
                const confirmationResult = await this.dialogService.confirm({
                    title: localize('accessExtensionFeature', "Enable '{0}' Feature", this.feature.label),
                    message: enabled
                        ? localize('disableAccessExtensionFeatureMessage', "Would you like to revoke '{0}' extension to access '{1}' feature?", this.manifest.displayName ?? this.extensionId.value, this.feature.label)
                        : localize('enableAccessExtensionFeatureMessage', "Would you like to allow '{0}' extension to access '{1}' feature?", this.manifest.displayName ?? this.extensionId.value, this.feature.label),
                    custom: true,
                    primaryButton: enabled
                        ? localize('revoke', 'Revoke Access')
                        : localize('grant', 'Allow Access'),
                    cancelButton: localize('cancel', 'Cancel'),
                });
                if (confirmationResult.confirmed) {
                    this.extensionFeaturesManagementService.setEnablement(this.extensionId, this.feature.id, !enabled);
                }
            }));
        }
        const body = append(content, $('.feature-body'));
        const bodyContent = $('.feature-body-content');
        const scrollableContent = this._register(new DomScrollableElement(bodyContent, {}));
        append(body, scrollableContent.getDomNode());
        this.layoutParticipants.push({ layout: () => scrollableContent.scanDomNode() });
        scrollableContent.scanDomNode();
        if (this.feature.description) {
            const description = append(bodyContent, $('.feature-description'));
            description.textContent = this.feature.description;
        }
        const accessData = this.extensionFeaturesManagementService.getAccessData(this.extensionId, this.feature.id);
        if (accessData?.current?.status) {
            append(bodyContent, $('.feature-status', undefined, $(`span${ThemeIcon.asCSSSelector(accessData.current.status.severity === Severity.Error ? errorIcon : accessData.current.status.severity === Severity.Warning ? warningIcon : infoIcon)}`, undefined), $('span', undefined, accessData.current.status.message)));
        }
        const featureContentElement = append(bodyContent, $('.feature-content'));
        if (this.feature.renderer) {
            const renderer = this.instantiationService.createInstance(this.feature.renderer);
            if (renderer.type === 'table') {
                this.renderTableData(featureContentElement, renderer);
            }
            else if (renderer.type === 'markdown') {
                this.renderMarkdownData(featureContentElement, renderer);
            }
            else if (renderer.type === 'markdown+table') {
                this.renderMarkdownAndTableData(featureContentElement, renderer);
            }
            else if (renderer.type === 'element') {
                this.renderElementData(featureContentElement, renderer);
            }
        }
    }
    updateButtonLabel(button) {
        button.label = this.extensionFeaturesManagementService.isEnabled(this.extensionId, this.feature.id)
            ? localize('revoke', 'Revoke Access')
            : localize('enable', 'Allow Access');
    }
    renderTableData(container, renderer) {
        const tableData = this._register(renderer.render(this.manifest));
        const tableDisposable = this._register(new MutableDisposable());
        if (tableData.onDidChange) {
            this._register(tableData.onDidChange((data) => {
                clearNode(container);
                tableDisposable.value = this.renderTable(data, container);
            }));
        }
        tableDisposable.value = this.renderTable(tableData.data, container);
    }
    renderTable(tableData, container) {
        const disposables = new DisposableStore();
        append(container, $('table', undefined, $('tr', undefined, ...tableData.headers.map((header) => $('th', undefined, header))), ...tableData.rows.map((row) => {
            return $('tr', undefined, ...row.map((rowData) => {
                if (typeof rowData === 'string') {
                    return $('td', undefined, $('p', undefined, rowData));
                }
                const data = Array.isArray(rowData) ? rowData : [rowData];
                return $('td', undefined, ...data
                    .map((item) => {
                    const result = [];
                    if (isMarkdownString(rowData)) {
                        const element = $('', undefined);
                        this.renderMarkdown(rowData, element);
                        result.push(element);
                    }
                    else if (item instanceof ResolvedKeybinding) {
                        const element = $('');
                        const kbl = disposables.add(new KeybindingLabel(element, OS, defaultKeybindingLabelStyles));
                        kbl.set(item);
                        result.push(element);
                    }
                    else if (item instanceof Color) {
                        result.push($('span', {
                            class: 'colorBox',
                            style: 'background-color: ' + Color.Format.CSS.format(item),
                        }, ''));
                        result.push($('code', undefined, Color.Format.CSS.formatHex(item)));
                    }
                    return result;
                })
                    .flat());
            }));
        })));
        return disposables;
    }
    renderMarkdownAndTableData(container, renderer) {
        const markdownAndTableData = this._register(renderer.render(this.manifest));
        if (markdownAndTableData.onDidChange) {
            this._register(markdownAndTableData.onDidChange((data) => {
                clearNode(container);
                this.renderMarkdownAndTable(data, container);
            }));
        }
        this.renderMarkdownAndTable(markdownAndTableData.data, container);
    }
    renderMarkdownData(container, renderer) {
        container.classList.add('markdown');
        const markdownData = this._register(renderer.render(this.manifest));
        if (markdownData.onDidChange) {
            this._register(markdownData.onDidChange((data) => {
                clearNode(container);
                this.renderMarkdown(data, container);
            }));
        }
        this.renderMarkdown(markdownData.data, container);
    }
    renderMarkdown(markdown, container) {
        const { element, dispose } = renderMarkdown({
            value: markdown.value,
            isTrusted: markdown.isTrusted,
            supportThemeIcons: true,
        }, {
            actionHandler: {
                callback: (content) => this.openerService
                    .open(content, { allowCommands: !!markdown.isTrusted })
                    .catch(onUnexpectedError),
                disposables: this._store,
            },
        });
        this._register(toDisposable(dispose));
        append(container, element);
    }
    renderMarkdownAndTable(data, container) {
        for (const markdownOrTable of data) {
            if (isMarkdownString(markdownOrTable)) {
                const element = $('', undefined);
                this.renderMarkdown(markdownOrTable, element);
                append(container, element);
            }
            else {
                const tableElement = append(container, $('table'));
                this.renderTable(markdownOrTable, tableElement);
            }
        }
    }
    renderElementData(container, renderer) {
        const elementData = renderer.render(this.manifest);
        if (elementData.onDidChange) {
            this._register(elementData.onDidChange((data) => {
                clearNode(container);
                container.appendChild(data);
            }));
        }
        container.appendChild(elementData.data);
    }
    layout(height, width) {
        this.layoutParticipants.forEach((p) => p.layout(height, width));
    }
};
ExtensionFeatureView = __decorate([
    __param(3, IOpenerService),
    __param(4, IInstantiationService),
    __param(5, IExtensionFeaturesManagementService),
    __param(6, IDialogService)
], ExtensionFeatureView);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXNUYWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25GZWF0dXJlc1RhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFlLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNuRyxPQUFPLEVBRU4sVUFBVSxFQUdWLG1DQUFtQyxHQU1uQyxNQUFNLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUUzRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiw0QkFBNEIsR0FDNUIsTUFBTSxxREFBcUQsQ0FB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