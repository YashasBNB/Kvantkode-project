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
var AbstractRuntimeExtensionsEditor_1;
import { $, addDisposableListener, append, clearNode, } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { fromNow } from '../../../../base/common/date.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ExtensionIdentifierMap, } from '../../../../platform/extensions/common/extensions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { Extensions, IExtensionFeaturesManagementService, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { DefaultIconPath, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { LocalWebWorkerRunningLocation } from '../../../services/extensions/common/extensionRunningLocation.js';
import { IExtensionService, } from '../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { errorIcon, warningIcon } from './extensionsIcons.js';
import './media/runtimeExtensionsEditor.css';
let AbstractRuntimeExtensionsEditor = class AbstractRuntimeExtensionsEditor extends EditorPane {
    static { AbstractRuntimeExtensionsEditor_1 = this; }
    static { this.ID = 'workbench.editor.runtimeExtensions'; }
    constructor(group, telemetryService, themeService, contextKeyService, _extensionsWorkbenchService, _extensionService, _notificationService, _contextMenuService, _instantiationService, storageService, _labelService, _environmentService, _clipboardService, _extensionFeaturesManagementService, _hoverService, _menuService) {
        super(AbstractRuntimeExtensionsEditor_1.ID, group, telemetryService, themeService, storageService);
        this.contextKeyService = contextKeyService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._contextMenuService = _contextMenuService;
        this._instantiationService = _instantiationService;
        this._labelService = _labelService;
        this._environmentService = _environmentService;
        this._clipboardService = _clipboardService;
        this._extensionFeaturesManagementService = _extensionFeaturesManagementService;
        this._hoverService = _hoverService;
        this._menuService = _menuService;
        this._list = null;
        this._elements = null;
        this._updateSoon = this._register(new RunOnceScheduler(() => this._updateExtensions(), 200));
        this._register(this._extensionService.onDidChangeExtensionsStatus(() => this._updateSoon.schedule()));
        this._register(this._extensionFeaturesManagementService.onDidChangeAccessData(() => this._updateSoon.schedule()));
        this._updateExtensions();
    }
    async _updateExtensions() {
        this._elements = await this._resolveExtensions();
        this._list?.splice(0, this._list.length, this._elements);
    }
    async _resolveExtensions() {
        // We only deal with extensions with source code!
        await this._extensionService.whenInstalledExtensionsRegistered();
        const extensionsDescriptions = this._extensionService.extensions.filter((extension) => {
            return Boolean(extension.main) || Boolean(extension.browser);
        });
        const marketplaceMap = new ExtensionIdentifierMap();
        const marketPlaceExtensions = await this._extensionsWorkbenchService.queryLocal();
        for (const extension of marketPlaceExtensions) {
            marketplaceMap.set(extension.identifier.id, extension);
        }
        const statusMap = this._extensionService.getExtensionsStatus();
        // group profile segments by extension
        const segments = new ExtensionIdentifierMap();
        const profileInfo = this._getProfileInfo();
        if (profileInfo) {
            let currentStartTime = profileInfo.startTime;
            for (let i = 0, len = profileInfo.deltas.length; i < len; i++) {
                const id = profileInfo.ids[i];
                const delta = profileInfo.deltas[i];
                let extensionSegments = segments.get(id);
                if (!extensionSegments) {
                    extensionSegments = [];
                    segments.set(id, extensionSegments);
                }
                extensionSegments.push(currentStartTime);
                currentStartTime = currentStartTime + delta;
                extensionSegments.push(currentStartTime);
            }
        }
        let result = [];
        for (let i = 0, len = extensionsDescriptions.length; i < len; i++) {
            const extensionDescription = extensionsDescriptions[i];
            let extProfileInfo = null;
            if (profileInfo) {
                const extensionSegments = segments.get(extensionDescription.identifier) || [];
                let extensionTotalTime = 0;
                for (let j = 0, lenJ = extensionSegments.length / 2; j < lenJ; j++) {
                    const startTime = extensionSegments[2 * j];
                    const endTime = extensionSegments[2 * j + 1];
                    extensionTotalTime += endTime - startTime;
                }
                extProfileInfo = {
                    segments: extensionSegments,
                    totalTime: extensionTotalTime,
                };
            }
            result[i] = {
                originalIndex: i,
                description: extensionDescription,
                marketplaceInfo: marketplaceMap.get(extensionDescription.identifier),
                status: statusMap[extensionDescription.identifier.value],
                profileInfo: extProfileInfo || undefined,
                unresponsiveProfile: this._getUnresponsiveProfile(extensionDescription.identifier),
            };
        }
        result = result.filter((element) => element.status.activationStarted);
        // bubble up extensions that have caused slowness
        const isUnresponsive = (extension) => extension.unresponsiveProfile === profileInfo;
        const profileTime = (extension) => extension.profileInfo?.totalTime ?? 0;
        const activationTime = (extension) => (extension.status.activationTimes?.codeLoadingTime ?? 0) +
            (extension.status.activationTimes?.activateCallTime ?? 0);
        result = result.sort((a, b) => {
            if (isUnresponsive(a) || isUnresponsive(b)) {
                return +isUnresponsive(b) - +isUnresponsive(a);
            }
            else if (profileTime(a) || profileTime(b)) {
                return profileTime(b) - profileTime(a);
            }
            else if (activationTime(a) || activationTime(b)) {
                return activationTime(b) - activationTime(a);
            }
            return a.originalIndex - b.originalIndex;
        });
        return result;
    }
    createEditor(parent) {
        parent.classList.add('runtime-extensions-editor');
        const TEMPLATE_ID = 'runtimeExtensionElementTemplate';
        const delegate = new (class {
            getHeight(element) {
                return 70;
            }
            getTemplateId(element) {
                return TEMPLATE_ID;
            }
        })();
        const renderer = {
            templateId: TEMPLATE_ID,
            renderTemplate: (root) => {
                const element = append(root, $('.extension'));
                const iconContainer = append(element, $('.icon-container'));
                const icon = append(iconContainer, $('img.icon'));
                const desc = append(element, $('div.desc'));
                const headerContainer = append(desc, $('.header-container'));
                const header = append(headerContainer, $('.header'));
                const name = append(header, $('div.name'));
                const version = append(header, $('span.version'));
                const msgContainer = append(desc, $('div.msg'));
                const actionbar = new ActionBar(desc);
                actionbar.onDidRun(({ error }) => error && this._notificationService.error(error));
                const timeContainer = append(element, $('.time'));
                const activationTime = append(timeContainer, $('div.activation-time'));
                const profileTime = append(timeContainer, $('div.profile-time'));
                const disposables = [actionbar];
                return {
                    root,
                    element,
                    icon,
                    name,
                    version,
                    actionbar,
                    activationTime,
                    profileTime,
                    msgContainer,
                    disposables,
                    elementDisposables: [],
                };
            },
            renderElement: (element, index, data) => {
                data.elementDisposables = dispose(data.elementDisposables);
                data.root.classList.toggle('odd', index % 2 === 1);
                data.elementDisposables.push(addDisposableListener(data.icon, 'error', () => (data.icon.src = element.marketplaceInfo?.iconUrlFallback || DefaultIconPath), { once: true }));
                data.icon.src = element.marketplaceInfo?.iconUrl || DefaultIconPath;
                if (!data.icon.complete) {
                    data.icon.style.visibility = 'hidden';
                    data.icon.onload = () => (data.icon.style.visibility = 'inherit');
                }
                else {
                    data.icon.style.visibility = 'inherit';
                }
                data.name.textContent = (element.marketplaceInfo?.displayName || element.description.identifier.value).substr(0, 50);
                data.version.textContent = element.description.version;
                const activationTimes = element.status.activationTimes;
                if (activationTimes) {
                    const syncTime = activationTimes.codeLoadingTime + activationTimes.activateCallTime;
                    data.activationTime.textContent = activationTimes.activationReason.startup
                        ? `Startup Activation: ${syncTime}ms`
                        : `Activation: ${syncTime}ms`;
                }
                else {
                    data.activationTime.textContent = `Activating...`;
                }
                data.actionbar.clear();
                const slowExtensionAction = this._createSlowExtensionAction(element);
                if (slowExtensionAction) {
                    data.actionbar.push(slowExtensionAction, { icon: false, label: true });
                }
                if (isNonEmptyArray(element.status.runtimeErrors)) {
                    const reportExtensionIssueAction = this._createReportExtensionIssueAction(element);
                    if (reportExtensionIssueAction) {
                        data.actionbar.push(reportExtensionIssueAction, { icon: false, label: true });
                    }
                }
                let title;
                if (activationTimes) {
                    const activationId = activationTimes.activationReason.extensionId.value;
                    const activationEvent = activationTimes.activationReason.activationEvent;
                    if (activationEvent === '*') {
                        title = nls.localize({
                            key: 'starActivation',
                            comment: ['{0} will be an extension identifier'],
                        }, 'Activated by {0} on start-up', activationId);
                    }
                    else if (/^workspaceContains:/.test(activationEvent)) {
                        const fileNameOrGlob = activationEvent.substr('workspaceContains:'.length);
                        if (fileNameOrGlob.indexOf('*') >= 0 || fileNameOrGlob.indexOf('?') >= 0) {
                            title = nls.localize({
                                key: 'workspaceContainsGlobActivation',
                                comment: ['{0} will be a glob pattern', '{1} will be an extension identifier'],
                            }, 'Activated by {1} because a file matching {0} exists in your workspace', fileNameOrGlob, activationId);
                        }
                        else {
                            title = nls.localize({
                                key: 'workspaceContainsFileActivation',
                                comment: ['{0} will be a file name', '{1} will be an extension identifier'],
                            }, 'Activated by {1} because file {0} exists in your workspace', fileNameOrGlob, activationId);
                        }
                    }
                    else if (/^workspaceContainsTimeout:/.test(activationEvent)) {
                        const glob = activationEvent.substr('workspaceContainsTimeout:'.length);
                        title = nls.localize({
                            key: 'workspaceContainsTimeout',
                            comment: ['{0} will be a glob pattern', '{1} will be an extension identifier'],
                        }, 'Activated by {1} because searching for {0} took too long', glob, activationId);
                    }
                    else if (activationEvent === 'onStartupFinished') {
                        title = nls.localize({
                            key: 'startupFinishedActivation',
                            comment: ['This refers to an extension. {0} will be an activation event.'],
                        }, 'Activated by {0} after start-up finished', activationId);
                    }
                    else if (/^onLanguage:/.test(activationEvent)) {
                        const language = activationEvent.substr('onLanguage:'.length);
                        title = nls.localize('languageActivation', 'Activated by {1} because you opened a {0} file', language, activationId);
                    }
                    else {
                        title = nls.localize({
                            key: 'workspaceGenericActivation',
                            comment: [
                                "{0} will be an activation event, like e.g. 'language:typescript', 'debug', etc.",
                                '{1} will be an extension identifier',
                            ],
                        }, 'Activated by {1} on {0}', activationEvent, activationId);
                    }
                }
                else {
                    title = nls.localize('extensionActivating', 'Extension is activating...');
                }
                data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.activationTime, title));
                clearNode(data.msgContainer);
                if (this._getUnresponsiveProfile(element.description.identifier)) {
                    const el = $('span', undefined, ...renderLabelWithIcons(` $(alert) Unresponsive`));
                    const extensionHostFreezTitle = nls.localize('unresponsive.title', 'Extension has caused the extension host to freeze.');
                    data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), el, extensionHostFreezTitle));
                    data.msgContainer.appendChild(el);
                }
                if (isNonEmptyArray(element.status.runtimeErrors)) {
                    const el = $('span', undefined, ...renderLabelWithIcons(`$(bug) ${nls.localize('errors', '{0} uncaught errors', element.status.runtimeErrors.length)}`));
                    data.msgContainer.appendChild(el);
                }
                if (element.status.messages && element.status.messages.length > 0) {
                    const el = $('span', undefined, ...renderLabelWithIcons(`$(alert) ${element.status.messages[0].message}`));
                    data.msgContainer.appendChild(el);
                }
                let extraLabel = null;
                if (element.status.runningLocation &&
                    element.status.runningLocation.equals(new LocalWebWorkerRunningLocation(0))) {
                    extraLabel = `$(globe) web worker`;
                }
                else if (element.description.extensionLocation.scheme === Schemas.vscodeRemote) {
                    const hostLabel = this._labelService.getHostLabel(Schemas.vscodeRemote, this._environmentService.remoteAuthority);
                    if (hostLabel) {
                        extraLabel = `$(remote) ${hostLabel}`;
                    }
                    else {
                        extraLabel = `$(remote) ${element.description.extensionLocation.authority}`;
                    }
                }
                else if (element.status.runningLocation && element.status.runningLocation.affinity > 0) {
                    extraLabel =
                        element.status.runningLocation instanceof LocalWebWorkerRunningLocation
                            ? `$(globe) web worker ${element.status.runningLocation.affinity + 1}`
                            : `$(server-process) local process ${element.status.runningLocation.affinity + 1}`;
                }
                if (extraLabel) {
                    const el = $('span', undefined, ...renderLabelWithIcons(extraLabel));
                    data.msgContainer.appendChild(el);
                }
                const features = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeatures();
                for (const feature of features) {
                    const accessData = this._extensionFeaturesManagementService.getAccessData(element.description.identifier, feature.id);
                    if (accessData) {
                        const status = accessData?.current?.status;
                        if (status) {
                            data.msgContainer.appendChild($('span', undefined, `${feature.label}: `));
                            data.msgContainer.appendChild($('span', undefined, ...renderLabelWithIcons(`$(${status.severity === Severity.Error ? errorIcon.id : warningIcon.id}) ${status.message}`)));
                        }
                        if (accessData?.accessTimes.length > 0) {
                            const element = $('span', undefined, `${nls.localize('requests count', '{0} Usage: {1} Requests', feature.label, accessData.accessTimes.length)}${accessData.current ? nls.localize('session requests count', ', {0} Requests (Session)', accessData.current.accessTimes.length) : ''}`);
                            if (accessData.current) {
                                const title = nls.localize('requests count title', 'Last request was {0}.', fromNow(accessData.current.lastAccessed, true, true));
                                data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), element, title));
                            }
                            data.msgContainer.appendChild(element);
                        }
                    }
                }
                if (element.profileInfo) {
                    data.profileTime.textContent = `Profile: ${(element.profileInfo.totalTime / 1000).toFixed(2)}ms`;
                }
                else {
                    data.profileTime.textContent = '';
                }
            },
            disposeTemplate: (data) => {
                data.disposables = dispose(data.disposables);
            },
        };
        this._list = this._instantiationService.createInstance((WorkbenchList), 'RuntimeExtensions', parent, delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: editorBackground,
            },
            accessibilityProvider: new (class {
                getWidgetAriaLabel() {
                    return nls.localize('runtimeExtensions', 'Runtime Extensions');
                }
                getAriaLabel(element) {
                    return element.description.name;
                }
            })(),
        });
        this._list.splice(0, this._list.length, this._elements || undefined);
        this._list.onContextMenu((e) => {
            if (!e.element) {
                return;
            }
            const actions = [];
            actions.push(new Action('runtimeExtensionsEditor.action.copyId', nls.localize('copy id', 'Copy id ({0})', e.element.description.identifier.value), undefined, true, () => {
                this._clipboardService.writeText(e.element.description.identifier.value);
            }));
            const reportExtensionIssueAction = this._createReportExtensionIssueAction(e.element);
            if (reportExtensionIssueAction) {
                actions.push(reportExtensionIssueAction);
            }
            actions.push(new Separator());
            if (e.element.marketplaceInfo) {
                actions.push(new Action('runtimeExtensionsEditor.action.disableWorkspace', nls.localize('disable workspace', 'Disable (Workspace)'), undefined, true, () => this._extensionsWorkbenchService.setEnablement(e.element.marketplaceInfo, 10 /* EnablementState.DisabledWorkspace */)));
                actions.push(new Action('runtimeExtensionsEditor.action.disable', nls.localize('disable', 'Disable'), undefined, true, () => this._extensionsWorkbenchService.setEnablement(e.element.marketplaceInfo, 9 /* EnablementState.DisabledGlobally */)));
            }
            actions.push(new Separator());
            const menuActions = this._menuService.getMenuActions(MenuId.ExtensionEditorContextMenu, this.contextKeyService);
            actions.push(...getContextMenuActions(menuActions).secondary);
            this._contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
            });
        });
    }
    layout(dimension) {
        this._list?.layout(dimension.height);
    }
};
AbstractRuntimeExtensionsEditor = AbstractRuntimeExtensionsEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IExtensionService),
    __param(6, INotificationService),
    __param(7, IContextMenuService),
    __param(8, IInstantiationService),
    __param(9, IStorageService),
    __param(10, ILabelService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IClipboardService),
    __param(13, IExtensionFeaturesManagementService),
    __param(14, IHoverService),
    __param(15, IMenuService)
], AbstractRuntimeExtensionsEditor);
export { AbstractRuntimeExtensionsEditor };
export class ShowRuntimeExtensionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showRuntimeExtensions',
            title: nls.localize2('showRuntimeExtensions', 'Show Running Extensions'),
            category: Categories.Developer,
            f1: true,
            menu: {
                id: MenuId.ViewContainerTitle,
                when: ContextKeyExpr.equals('viewContainer', 'workbench.view.extensions'),
                group: '2_enablement',
                order: 3,
            },
        });
    }
    async run(accessor) {
        await accessor.get(IEditorService).openEditor(RuntimeExtensionsInput.instance, { pinned: true });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RSdW50aW1lRXh0ZW5zaW9uc0VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9hYnN0cmFjdFJ1bnRpbWVFeHRlbnNpb25zRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sQ0FBQyxFQUVELHFCQUFxQixFQUNyQixNQUFNLEVBQ04sU0FBUyxHQUNULE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRzFGLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0s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