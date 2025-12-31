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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXNUYWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uRmVhdHVyZXNUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBZSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbkcsT0FBTyxFQUVOLFVBQVUsRUFHVixtQ0FBbUMsR0FNbkMsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFFM0csT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsNEJBQTRCLEdBQzVCLE1BQU0scURBQXFELENBQUE7QUFD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