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
import './media/remoteViewlet.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { URI } from '../../../../base/common/uri.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IExtensionService, isProposedApiEnabled, } from '../../../services/extensions/common/extensions.js';
import { FilterViewPaneContainer } from '../../../browser/parts/views/viewsViewlet.js';
import { VIEWLET_ID } from './remoteExplorer.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions, IViewDescriptorService, } from '../../../common/views.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { ReloadWindowAction } from '../../../browser/actions/windowActions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { SwitchRemoteViewItem } from './explorerViewItems.js';
import { isStringArray } from '../../../../base/common/types.js';
import { IRemoteExplorerService, } from '../../../services/remote/common/remoteExplorerService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import * as icons from './remoteIcons.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { getRemoteName } from '../../../../platform/remote/common/remoteHosts.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWalkthroughsService } from '../../welcomeGettingStarted/browser/gettingStartedService.js';
import { Schemas } from '../../../../base/common/network.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
class HelpTreeVirtualDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return 'HelpItemTemplate';
    }
}
class HelpTreeRenderer {
    constructor() {
        this.templateId = 'HelpItemTemplate';
    }
    renderTemplate(container) {
        container.classList.add('remote-help-tree-node-item');
        const icon = dom.append(container, dom.$('.remote-help-tree-node-item-icon'));
        const parent = container;
        return { parent, icon };
    }
    renderElement(element, index, templateData, height) {
        const container = templateData.parent;
        dom.append(container, templateData.icon);
        templateData.icon.classList.add(...element.element.iconClasses);
        const labelContainer = dom.append(container, dom.$('.help-item-label'));
        labelContainer.innerText = element.element.label;
    }
    disposeTemplate(templateData) { }
}
class HelpDataSource {
    hasChildren(element) {
        return element instanceof HelpModel;
    }
    getChildren(element) {
        if (element instanceof HelpModel && element.items) {
            return element.items;
        }
        return [];
    }
}
class HelpModel {
    constructor(viewModel, openerService, quickInputService, commandService, remoteExplorerService, environmentService, workspaceContextService, walkthroughsService) {
        this.viewModel = viewModel;
        this.openerService = openerService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.workspaceContextService = workspaceContextService;
        this.walkthroughsService = walkthroughsService;
        this.updateItems();
        viewModel.onDidChangeHelpInformation(() => this.updateItems());
    }
    createHelpItemValue(info, infoKey) {
        return new HelpItemValue(this.commandService, this.walkthroughsService, info.extensionDescription, typeof info.remoteName === 'string' ? [info.remoteName] : info.remoteName, info.virtualWorkspace, info[infoKey]);
    }
    updateItems() {
        const helpItems = [];
        const getStarted = this.viewModel.helpInformation.filter((info) => info.getStarted);
        if (getStarted.length) {
            const helpItemValues = getStarted.map((info) => this.createHelpItemValue(info, 'getStarted'));
            const getStartedHelpItem = this.items?.find((item) => item.icon === icons.getStartedIcon) ??
                new GetStartedHelpItem(icons.getStartedIcon, nls.localize('remote.help.getStarted', 'Get Started'), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService, this.commandService);
            getStartedHelpItem.values = helpItemValues;
            helpItems.push(getStartedHelpItem);
        }
        const documentation = this.viewModel.helpInformation.filter((info) => info.documentation);
        if (documentation.length) {
            const helpItemValues = documentation.map((info) => this.createHelpItemValue(info, 'documentation'));
            const documentationHelpItem = this.items?.find((item) => item.icon === icons.documentationIcon) ??
                new HelpItem(icons.documentationIcon, nls.localize('remote.help.documentation', 'Read Documentation'), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            documentationHelpItem.values = helpItemValues;
            helpItems.push(documentationHelpItem);
        }
        const issues = this.viewModel.helpInformation.filter((info) => info.issues);
        if (issues.length) {
            const helpItemValues = issues.map((info) => this.createHelpItemValue(info, 'issues'));
            const reviewIssuesHelpItem = this.items?.find((item) => item.icon === icons.reviewIssuesIcon) ??
                new HelpItem(icons.reviewIssuesIcon, nls.localize('remote.help.issues', 'Review Issues'), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            reviewIssuesHelpItem.values = helpItemValues;
            helpItems.push(reviewIssuesHelpItem);
        }
        if (helpItems.length) {
            const helpItemValues = this.viewModel.helpInformation.map((info) => this.createHelpItemValue(info, 'reportIssue'));
            const issueReporterItem = this.items?.find((item) => item.icon === icons.reportIssuesIcon) ??
                new IssueReporterItem(icons.reportIssuesIcon, nls.localize('remote.help.report', 'Report Issue'), helpItemValues, this.quickInputService, this.environmentService, this.commandService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            issueReporterItem.values = helpItemValues;
            helpItems.push(issueReporterItem);
        }
        if (helpItems.length) {
            this.items = helpItems;
        }
    }
}
class HelpItemValue {
    constructor(commandService, walkthroughService, extensionDescription, remoteAuthority, virtualWorkspace, urlOrCommandOrId) {
        this.commandService = commandService;
        this.walkthroughService = walkthroughService;
        this.extensionDescription = extensionDescription;
        this.remoteAuthority = remoteAuthority;
        this.virtualWorkspace = virtualWorkspace;
        this.urlOrCommandOrId = urlOrCommandOrId;
    }
    get description() {
        return this.getUrl().then(() => this._description);
    }
    get url() {
        return this.getUrl();
    }
    async getUrl() {
        if (this._url === undefined) {
            if (typeof this.urlOrCommandOrId === 'string') {
                const url = URI.parse(this.urlOrCommandOrId);
                if (url.authority) {
                    this._url = this.urlOrCommandOrId;
                }
                else {
                    const urlCommand = this.commandService
                        .executeCommand(this.urlOrCommandOrId)
                        .then((result) => {
                        // if executing this command times out, cache its value whenever it eventually resolves
                        this._url = result;
                        return this._url;
                    });
                    // We must be defensive. The command may never return, meaning that no help at all is ever shown!
                    const emptyString = new Promise((resolve) => setTimeout(() => resolve(''), 500));
                    this._url = await Promise.race([urlCommand, emptyString]);
                }
            }
            else if (this.urlOrCommandOrId?.id) {
                try {
                    const walkthroughId = `${this.extensionDescription.id}#${this.urlOrCommandOrId.id}`;
                    const walkthrough = await this.walkthroughService.getWalkthrough(walkthroughId);
                    this._description = walkthrough.title;
                    this._url = walkthroughId;
                }
                catch { }
            }
        }
        if (this._url === undefined) {
            this._url = '';
        }
        return this._url;
    }
}
class HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService) {
        this.icon = icon;
        this.label = label;
        this.values = values;
        this.quickInputService = quickInputService;
        this.environmentService = environmentService;
        this.remoteExplorerService = remoteExplorerService;
        this.workspaceContextService = workspaceContextService;
        this.iconClasses = [];
        this.iconClasses.push(...ThemeIcon.asClassNameArray(icon));
        this.iconClasses.push('remote-help-tree-node-item-icon');
    }
    async getActions() {
        return (await Promise.all(this.values.map(async (value) => {
            return {
                label: value.extensionDescription.displayName || value.extensionDescription.identifier.value,
                description: (await value.description) ?? (await value.url),
                url: await value.url,
                extensionDescription: value.extensionDescription,
            };
        }))).filter((item) => item.description);
    }
    async handleClick() {
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (remoteAuthority) {
            for (let i = 0; i < this.remoteExplorerService.targetType.length; i++) {
                if (remoteAuthority.startsWith(this.remoteExplorerService.targetType[i])) {
                    for (const value of this.values) {
                        if (value.remoteAuthority) {
                            for (const authority of value.remoteAuthority) {
                                if (remoteAuthority.startsWith(authority)) {
                                    await this.takeAction(value.extensionDescription, await value.url);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        else {
            const virtualWorkspace = getVirtualWorkspaceLocation(this.workspaceContextService.getWorkspace())?.scheme;
            if (virtualWorkspace) {
                for (let i = 0; i < this.remoteExplorerService.targetType.length; i++) {
                    for (const value of this.values) {
                        if (value.virtualWorkspace && value.remoteAuthority) {
                            for (const authority of value.remoteAuthority) {
                                if (this.remoteExplorerService.targetType[i].startsWith(authority) &&
                                    virtualWorkspace.startsWith(value.virtualWorkspace)) {
                                    await this.takeAction(value.extensionDescription, await value.url);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        if (this.values.length > 1) {
            const actions = await this.getActions();
            if (actions.length) {
                const action = await this.quickInputService.pick(actions, {
                    placeHolder: nls.localize('pickRemoteExtension', 'Select url to open'),
                });
                if (action) {
                    await this.takeAction(action.extensionDescription, action.url);
                }
            }
        }
        else {
            await this.takeAction(this.values[0].extensionDescription, await this.values[0].url);
        }
    }
}
class GetStartedHelpItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, openerService, remoteExplorerService, workspaceContextService, commandService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.openerService = openerService;
        this.commandService = commandService;
    }
    async takeAction(extensionDescription, urlOrWalkthroughId) {
        if ([Schemas.http, Schemas.https].includes(URI.parse(urlOrWalkthroughId).scheme)) {
            this.openerService.open(urlOrWalkthroughId, { allowCommands: true });
            return;
        }
        this.commandService.executeCommand('workbench.action.openWalkthrough', urlOrWalkthroughId);
    }
}
class HelpItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, openerService, remoteExplorerService, workspaceContextService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.openerService = openerService;
    }
    async takeAction(extensionDescription, url) {
        await this.openerService.open(URI.parse(url), { allowCommands: true });
    }
}
class IssueReporterItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, commandService, openerService, remoteExplorerService, workspaceContextService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.commandService = commandService;
        this.openerService = openerService;
    }
    async getActions() {
        return Promise.all(this.values.map(async (value) => {
            return {
                label: value.extensionDescription.displayName || value.extensionDescription.identifier.value,
                description: '',
                url: await value.url,
                extensionDescription: value.extensionDescription,
            };
        }));
    }
    async takeAction(extensionDescription, url) {
        if (!url) {
            await this.commandService.executeCommand('workbench.action.openIssueReporter', [
                extensionDescription.identifier.value,
            ]);
        }
        else {
            await this.openerService.open(URI.parse(url));
        }
    }
}
let HelpPanel = class HelpPanel extends ViewPane {
    static { this.ID = '~remote.helpPanel'; }
    static { this.TITLE = nls.localize2('remote.help', 'Help and feedback'); }
    constructor(viewModel, options, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, remoteExplorerService, environmentService, themeService, hoverService, workspaceContextService, walkthroughsService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.viewModel = viewModel;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.workspaceContextService = workspaceContextService;
        this.walkthroughsService = walkthroughsService;
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('remote-help');
        const treeContainer = document.createElement('div');
        treeContainer.classList.add('remote-help-content');
        container.appendChild(treeContainer);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'RemoteHelp', treeContainer, new HelpTreeVirtualDelegate(), [new HelpTreeRenderer()], new HelpDataSource(), {
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    return item.label;
                },
                getWidgetAriaLabel: () => nls.localize('remotehelp', 'Remote Help'),
            },
        });
        const model = new HelpModel(this.viewModel, this.openerService, this.quickInputService, this.commandService, this.remoteExplorerService, this.environmentService, this.workspaceContextService, this.walkthroughsService);
        this.tree.setInput(model);
        this._register(Event.debounce(this.tree.onDidOpen, (last, event) => event, 75, true)((e) => {
            e.element?.handleClick();
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
};
HelpPanel = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IContextKeyService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IViewDescriptorService),
    __param(8, IOpenerService),
    __param(9, IQuickInputService),
    __param(10, ICommandService),
    __param(11, IRemoteExplorerService),
    __param(12, IWorkbenchEnvironmentService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, IWorkspaceContextService),
    __param(16, IWalkthroughsService)
], HelpPanel);
class HelpPanelDescriptor {
    constructor(viewModel) {
        this.id = HelpPanel.ID;
        this.name = HelpPanel.TITLE;
        this.canToggleVisibility = true;
        this.hideByDefault = false;
        this.group = 'help@50';
        this.order = -10;
        this.ctorDescriptor = new SyncDescriptor(HelpPanel, [viewModel]);
    }
}
let RemoteViewPaneContainer = class RemoteViewPaneContainer extends FilterViewPaneContainer {
    constructor(layoutService, telemetryService, contextService, storageService, configurationService, instantiationService, themeService, contextMenuService, extensionService, remoteExplorerService, viewDescriptorService, logService) {
        super(VIEWLET_ID, remoteExplorerService.onDidChangeTargetType, configurationService, layoutService, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService, viewDescriptorService, logService);
        this.remoteExplorerService = remoteExplorerService;
        this.helpPanelDescriptor = new HelpPanelDescriptor(this);
        this.helpInformation = [];
        this._onDidChangeHelpInformation = new Emitter();
        this.onDidChangeHelpInformation = this._onDidChangeHelpInformation.event;
        this.hasRegisteredHelpView = false;
        this.addConstantViewDescriptors([this.helpPanelDescriptor]);
        this._register((this.remoteSwitcher = this.instantiationService.createInstance(SwitchRemoteViewItem)));
        this.remoteExplorerService.onDidChangeHelpInformation((extensions) => {
            this._setHelpInformation(extensions);
        });
        this._setHelpInformation(this.remoteExplorerService.helpInformation);
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        this.remoteSwitcher.createOptionItems(viewsRegistry.getViews(this.viewContainer));
        this._register(viewsRegistry.onViewsRegistered((e) => {
            const remoteViews = [];
            for (const view of e) {
                if (view.viewContainer.id === VIEWLET_ID) {
                    remoteViews.push(...view.views);
                }
            }
            if (remoteViews.length > 0) {
                this.remoteSwitcher.createOptionItems(remoteViews);
            }
        }));
        this._register(viewsRegistry.onViewsDeregistered((e) => {
            if (e.viewContainer.id === VIEWLET_ID) {
                this.remoteSwitcher.removeOptionItems(e.views);
            }
        }));
    }
    _setHelpInformation(extensions) {
        const helpInformation = [];
        for (const extension of extensions) {
            this._handleRemoteInfoExtensionPoint(extension, helpInformation);
        }
        this.helpInformation = helpInformation;
        this._onDidChangeHelpInformation.fire();
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        if (this.helpInformation.length && !this.hasRegisteredHelpView) {
            const view = viewsRegistry.getView(this.helpPanelDescriptor.id);
            if (!view) {
                viewsRegistry.registerViews([this.helpPanelDescriptor], this.viewContainer);
            }
            this.hasRegisteredHelpView = true;
        }
        else if (this.hasRegisteredHelpView) {
            viewsRegistry.deregisterViews([this.helpPanelDescriptor], this.viewContainer);
            this.hasRegisteredHelpView = false;
        }
    }
    _handleRemoteInfoExtensionPoint(extension, helpInformation) {
        if (!isProposedApiEnabled(extension.description, 'contribRemoteHelp')) {
            return;
        }
        if (!extension.value.documentation && !extension.value.getStarted && !extension.value.issues) {
            return;
        }
        helpInformation.push({
            extensionDescription: extension.description,
            getStarted: extension.value.getStarted,
            documentation: extension.value.documentation,
            reportIssue: extension.value.reportIssue,
            issues: extension.value.issues,
            remoteName: extension.value.remoteName,
            virtualWorkspace: extension.value.virtualWorkspace,
        });
    }
    getFilterOn(viewDescriptor) {
        return isStringArray(viewDescriptor.remoteAuthority)
            ? viewDescriptor.remoteAuthority[0]
            : viewDescriptor.remoteAuthority;
    }
    setFilter(viewDescriptor) {
        this.remoteExplorerService.targetType = isStringArray(viewDescriptor.remoteAuthority)
            ? viewDescriptor.remoteAuthority
            : [viewDescriptor.remoteAuthority];
    }
    getTitle() {
        const title = nls.localize('remote.explorer', 'Remote Explorer');
        return title;
    }
};
RemoteViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IContextMenuService),
    __param(8, IExtensionService),
    __param(9, IRemoteExplorerService),
    __param(10, IViewDescriptorService),
    __param(11, ILogService)
], RemoteViewPaneContainer);
Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2('remote.explorer', 'Remote Explorer'),
    ctorDescriptor: new SyncDescriptor(RemoteViewPaneContainer),
    hideIfEmpty: true,
    viewOrderDelegate: {
        getOrder: (group) => {
            if (!group) {
                return;
            }
            let matches = /^targets@(\d+)$/.exec(group);
            if (matches) {
                return -1000;
            }
            matches = /^details(@(\d+))?$/.exec(group);
            if (matches) {
                return -500 + Number(matches[2]);
            }
            matches = /^help(@(\d+))?$/.exec(group);
            if (matches) {
                return -10;
            }
            return;
        },
    },
    icon: icons.remoteExplorerViewIcon,
    order: 4,
}, 0 /* ViewContainerLocation.Sidebar */);
let RemoteMarkers = class RemoteMarkers {
    constructor(remoteAgentService, timerService) {
        remoteAgentService.getEnvironment().then((remoteEnv) => {
            if (remoteEnv) {
                timerService.setPerformanceMarks('server', remoteEnv.marks);
            }
        });
    }
};
RemoteMarkers = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ITimerService)
], RemoteMarkers);
export { RemoteMarkers };
class VisibleProgress {
    get lastReport() {
        return this._lastReport;
    }
    constructor(progressService, location, initialReport, buttons, onDidCancel) {
        this.location = location;
        this._isDisposed = false;
        this._lastReport = initialReport;
        this._currentProgressPromiseResolve = null;
        this._currentProgress = null;
        this._currentTimer = null;
        const promise = new Promise((resolve) => (this._currentProgressPromiseResolve = resolve));
        progressService.withProgress({ location: location, buttons: buttons }, (progress) => {
            if (!this._isDisposed) {
                this._currentProgress = progress;
            }
            return promise;
        }, (choice) => onDidCancel(choice, this._lastReport));
        if (this._lastReport) {
            this.report();
        }
    }
    dispose() {
        this._isDisposed = true;
        if (this._currentProgressPromiseResolve) {
            this._currentProgressPromiseResolve();
            this._currentProgressPromiseResolve = null;
        }
        this._currentProgress = null;
        if (this._currentTimer) {
            this._currentTimer.dispose();
            this._currentTimer = null;
        }
    }
    report(message) {
        if (message) {
            this._lastReport = message;
        }
        if (this._lastReport && this._currentProgress) {
            this._currentProgress.report({ message: this._lastReport });
        }
    }
    startTimer(completionTime) {
        this.stopTimer();
        this._currentTimer = new ReconnectionTimer(this, completionTime);
    }
    stopTimer() {
        if (this._currentTimer) {
            this._currentTimer.dispose();
            this._currentTimer = null;
        }
    }
}
class ReconnectionTimer {
    constructor(parent, completionTime) {
        this._parent = parent;
        this._completionTime = completionTime;
        this._renderInterval = dom.disposableWindowInterval(mainWindow, () => this._render(), 1000);
        this._render();
    }
    dispose() {
        this._renderInterval.dispose();
    }
    _render() {
        const remainingTimeMs = this._completionTime - Date.now();
        if (remainingTimeMs < 0) {
            return;
        }
        const remainingTime = Math.ceil(remainingTimeMs / 1000);
        if (remainingTime === 1) {
            this._parent.report(nls.localize('reconnectionWaitOne', 'Attempting to reconnect in {0} second...', remainingTime));
        }
        else {
            this._parent.report(nls.localize('reconnectionWaitMany', 'Attempting to reconnect in {0} seconds...', remainingTime));
        }
    }
}
/**
 * The time when a prompt is shown to the user
 */
const DISCONNECT_PROMPT_TIME = 40 * 1000; // 40 seconds
let RemoteAgentConnectionStatusListener = class RemoteAgentConnectionStatusListener extends Disposable {
    constructor(remoteAgentService, progressService, dialogService, commandService, quickInputService, logService, environmentService, telemetryService) {
        super();
        this._reloadWindowShown = false;
        const connection = remoteAgentService.getConnection();
        if (connection) {
            let quickInputVisible = false;
            this._register(quickInputService.onShow(() => (quickInputVisible = true)));
            this._register(quickInputService.onHide(() => (quickInputVisible = false)));
            let visibleProgress = null;
            let reconnectWaitEvent = null;
            let disposableListener = null;
            function showProgress(location, buttons, initialReport = null) {
                if (visibleProgress) {
                    visibleProgress.dispose();
                    visibleProgress = null;
                }
                if (!location) {
                    location = quickInputVisible ? 15 /* ProgressLocation.Notification */ : 20 /* ProgressLocation.Dialog */;
                }
                return new VisibleProgress(progressService, location, initialReport, buttons.map((button) => button.label), (choice, lastReport) => {
                    // Handle choice from dialog
                    if (typeof choice !== 'undefined' && buttons[choice]) {
                        buttons[choice].callback();
                    }
                    else {
                        if (location === 20 /* ProgressLocation.Dialog */) {
                            visibleProgress = showProgress(15 /* ProgressLocation.Notification */, buttons, lastReport);
                        }
                        else {
                            hideProgress();
                        }
                    }
                });
            }
            function hideProgress() {
                if (visibleProgress) {
                    visibleProgress.dispose();
                    visibleProgress = null;
                }
            }
            let reconnectionToken = '';
            let lastIncomingDataTime = 0;
            let reconnectionAttempts = 0;
            const reconnectButton = {
                label: nls.localize('reconnectNow', 'Reconnect Now'),
                callback: () => {
                    reconnectWaitEvent?.skipWait();
                },
            };
            const reloadButton = {
                label: nls.localize('reloadWindow', 'Reload Window'),
                callback: () => {
                    telemetryService.publicLog2('remoteReconnectionReload', {
                        remoteName: getRemoteName(environmentService.remoteAuthority),
                        reconnectionToken: reconnectionToken,
                        millisSinceLastIncomingData: Date.now() - lastIncomingDataTime,
                        attempt: reconnectionAttempts,
                    });
                    commandService.executeCommand(ReloadWindowAction.ID);
                },
            };
            // Possible state transitions:
            // ConnectionGain      -> ConnectionLost
            // ConnectionLost      -> ReconnectionWait, ReconnectionRunning
            // ReconnectionWait    -> ReconnectionRunning
            // ReconnectionRunning -> ConnectionGain, ReconnectionPermanentFailure
            connection.onDidStateChange((e) => {
                visibleProgress?.stopTimer();
                if (disposableListener) {
                    disposableListener.dispose();
                    disposableListener = null;
                }
                switch (e.type) {
                    case 0 /* PersistentConnectionEventType.ConnectionLost */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = 0;
                        telemetryService.publicLog2('remoteConnectionLost', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                        });
                        if (visibleProgress || e.millisSinceLastIncomingData > DISCONNECT_PROMPT_TIME) {
                            if (!visibleProgress) {
                                visibleProgress = showProgress(null, [reconnectButton, reloadButton]);
                            }
                            visibleProgress.report(nls.localize('connectionLost', 'Connection Lost'));
                        }
                        break;
                    case 1 /* PersistentConnectionEventType.ReconnectionWait */:
                        if (visibleProgress) {
                            reconnectWaitEvent = e;
                            visibleProgress = showProgress(null, [reconnectButton, reloadButton]);
                            visibleProgress.startTimer(Date.now() + 1000 * e.durationSeconds);
                        }
                        break;
                    case 2 /* PersistentConnectionEventType.ReconnectionRunning */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteReconnectionRunning', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt,
                        });
                        if (visibleProgress || e.millisSinceLastIncomingData > DISCONNECT_PROMPT_TIME) {
                            visibleProgress = showProgress(null, [reloadButton]);
                            visibleProgress.report(nls.localize('reconnectionRunning', 'Disconnected. Attempting to reconnect...'));
                            // Register to listen for quick input is opened
                            disposableListener = quickInputService.onShow(() => {
                                // Need to move from dialog if being shown and user needs to type in a prompt
                                if (visibleProgress && visibleProgress.location === 20 /* ProgressLocation.Dialog */) {
                                    visibleProgress = showProgress(15 /* ProgressLocation.Notification */, [reloadButton], visibleProgress.lastReport);
                                }
                            });
                        }
                        break;
                    case 3 /* PersistentConnectionEventType.ReconnectionPermanentFailure */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteReconnectionPermanentFailure', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt,
                            handled: e.handled,
                        });
                        hideProgress();
                        if (e.handled) {
                            logService.info(`Error handled: Not showing a notification for the error.`);
                            console.log(`Error handled: Not showing a notification for the error.`);
                        }
                        else if (!this._reloadWindowShown) {
                            this._reloadWindowShown = true;
                            dialogService
                                .confirm({
                                type: Severity.Error,
                                message: nls.localize('reconnectionPermanentFailure', 'Cannot reconnect. Please reload the window.'),
                                primaryButton: nls.localize({ key: 'reloadWindow.dialog', comment: ['&& denotes a mnemonic'] }, '&&Reload Window'),
                            })
                                .then((result) => {
                                if (result.confirmed) {
                                    commandService.executeCommand(ReloadWindowAction.ID);
                                }
                            });
                        }
                        break;
                    case 4 /* PersistentConnectionEventType.ConnectionGain */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteConnectionGain', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt,
                        });
                        hideProgress();
                        break;
                }
            });
        }
    }
};
RemoteAgentConnectionStatusListener = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IProgressService),
    __param(2, IDialogService),
    __param(3, ICommandService),
    __param(4, IQuickInputService),
    __param(5, ILogService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, ITelemetryService)
], RemoteAgentConnectionStatusListener);
export { RemoteAgentConnectionStatusListener };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvcmVtb3RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLG9CQUFvQixHQUNwQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNoRCxPQUFPLEVB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