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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RSdW50aW1lRXh0ZW5zaW9uc0VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2Fic3RyYWN0UnVudGltZUV4dGVuc2lvbnNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixDQUFDLEVBRUQscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixTQUFTLEdBQ1QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFHMUYsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDdkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUs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