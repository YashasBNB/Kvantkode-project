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
var TunnelPanel_1;
import './media/tunnelView.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, RawContextKey, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ICommandService, CommandsRegistry, } from '../../../../platform/commands/common/commands.js';
import { Event } from '../../../../base/common/event.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { Disposable, toDisposable, dispose, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { IMenuService, MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { createActionViewItem, getFlatActionBarActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IRemoteExplorerService, TunnelType, TUNNEL_VIEW_ID, TunnelEditId, } from '../../../services/remote/common/remoteExplorerService.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { URI } from '../../../../base/common/uri.js';
import { isAllInterfaces, isLocalhost, ITunnelService, TunnelPrivacyId, TunnelProtocol, } from '../../../../platform/tunnel/common/tunnel.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { copyAddressIcon, forwardedPortWithoutProcessIcon, forwardedPortWithProcessIcon, forwardPortIcon, labelPortIcon, openBrowserIcon, openPreviewIcon, portsViewIcon, privatePortIcon, stopForwardIcon, } from './remoteIcons.js';
import { IExternalUriOpenerService } from '../../externalUriOpener/common/externalUriOpenerService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { STATUS_BAR_REMOTE_ITEM_BACKGROUND } from '../../../common/theme.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { defaultButtonStyles, defaultInputBoxStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { TunnelCloseReason, TunnelSource, forwardedPortsViewEnabled, makeAddress, mapHasAddressLocalhostOrAllInterfaces, parseAddress, } from '../../../services/remote/common/tunnelModel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
export const openPreviewEnabledContext = new RawContextKey('openPreviewEnabled', false);
class TunnelTreeVirtualDelegate {
    constructor(remoteExplorerService) {
        this.remoteExplorerService = remoteExplorerService;
        this.headerRowHeight = 22;
    }
    getHeight(row) {
        return row.tunnelType === TunnelType.Add &&
            !this.remoteExplorerService.getEditableData(undefined)
            ? 30
            : 22;
    }
}
let TunnelViewModel = class TunnelViewModel {
    constructor(remoteExplorerService, tunnelService) {
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this._candidates = new Map();
        this.input = {
            label: nls.localize('remote.tunnelsView.addPort', 'Add Port'),
            icon: undefined,
            tunnelType: TunnelType.Add,
            hasRunningProcess: false,
            remoteHost: '',
            remotePort: 0,
            processDescription: '',
            tooltipPostfix: '',
            iconTooltip: '',
            portTooltip: '',
            processTooltip: '',
            originTooltip: '',
            privacyTooltip: '',
            source: { source: TunnelSource.User, description: '' },
            protocol: TunnelProtocol.Http,
            privacy: {
                id: TunnelPrivacyId.Private,
                themeIcon: privatePortIcon.id,
                label: nls.localize('tunnelPrivacy.private', 'Private'),
            },
            strip: () => undefined,
        };
        this.model = remoteExplorerService.tunnelModel;
        this.onForwardedPortsChanged = Event.any(this.model.onForwardPort, this.model.onClosePort, this.model.onPortName, this.model.onCandidatesChanged);
    }
    get all() {
        const result = [];
        this._candidates = new Map();
        this.model.candidates.forEach((candidate) => {
            this._candidates.set(makeAddress(candidate.host, candidate.port), candidate);
        });
        if (this.model.forwarded.size > 0 || this.remoteExplorerService.getEditableData(undefined)) {
            result.push(...this.forwarded);
        }
        if (this.model.detected.size > 0) {
            result.push(...this.detected);
        }
        result.push(this.input);
        return result;
    }
    addProcessInfoFromCandidate(tunnelItem) {
        const key = makeAddress(tunnelItem.remoteHost, tunnelItem.remotePort);
        if (this._candidates.has(key)) {
            tunnelItem.processDescription = this._candidates.get(key).detail;
        }
    }
    get forwarded() {
        const forwarded = Array.from(this.model.forwarded.values())
            .map((tunnel) => {
            const tunnelItem = TunnelItem.createFromTunnel(this.remoteExplorerService, this.tunnelService, tunnel);
            this.addProcessInfoFromCandidate(tunnelItem);
            return tunnelItem;
        })
            .sort((a, b) => {
            if (a.remotePort === b.remotePort) {
                return a.remoteHost < b.remoteHost ? -1 : 1;
            }
            else {
                return a.remotePort < b.remotePort ? -1 : 1;
            }
        });
        return forwarded;
    }
    get detected() {
        return Array.from(this.model.detected.values()).map((tunnel) => {
            const tunnelItem = TunnelItem.createFromTunnel(this.remoteExplorerService, this.tunnelService, tunnel, TunnelType.Detected, false);
            this.addProcessInfoFromCandidate(tunnelItem);
            return tunnelItem;
        });
    }
    isEmpty() {
        return (this.detected.length === 0 &&
            (this.forwarded.length === 0 ||
                (this.forwarded.length === 1 &&
                    this.forwarded[0].tunnelType === TunnelType.Add &&
                    !this.remoteExplorerService.getEditableData(undefined))));
    }
};
TunnelViewModel = __decorate([
    __param(0, IRemoteExplorerService),
    __param(1, ITunnelService)
], TunnelViewModel);
export { TunnelViewModel };
function emptyCell(item) {
    return { label: '', tunnel: item, editId: TunnelEditId.None, tooltip: '' };
}
class IconColumn {
    constructor() {
        this.label = '';
        this.tooltip = '';
        this.weight = 1;
        this.minimumWidth = 40;
        this.maximumWidth = 40;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const icon = row.processDescription
            ? forwardedPortWithProcessIcon
            : forwardedPortWithoutProcessIcon;
        let tooltip = '';
        if (row instanceof TunnelItem) {
            tooltip = `${row.iconTooltip} ${row.tooltipPostfix}`;
        }
        return {
            label: '',
            icon,
            tunnel: row,
            editId: TunnelEditId.None,
            tooltip,
        };
    }
}
class PortColumn {
    constructor() {
        this.label = nls.localize('tunnel.portColumn.label', 'Port');
        this.tooltip = nls.localize('tunnel.portColumn.tooltip', 'The label and remote port number of the forwarded port.');
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        const isAdd = row.tunnelType === TunnelType.Add;
        const label = row.label;
        let tooltip = '';
        if (row instanceof TunnelItem && !isAdd) {
            tooltip = `${row.portTooltip} ${row.tooltipPostfix}`;
        }
        else {
            tooltip = label;
        }
        return {
            label,
            tunnel: row,
            menuId: MenuId.TunnelPortInline,
            editId: row.tunnelType === TunnelType.Add ? TunnelEditId.New : TunnelEditId.Label,
            tooltip,
        };
    }
}
class LocalAddressColumn {
    constructor() {
        this.label = nls.localize('tunnel.addressColumn.label', 'Forwarded Address');
        this.tooltip = nls.localize('tunnel.addressColumn.tooltip', 'The address that the forwarded port is available at.');
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.localAddress ?? '';
        let tooltip = label;
        if (row instanceof TunnelItem) {
            tooltip = row.tooltipPostfix;
        }
        return {
            label,
            menuId: MenuId.TunnelLocalAddressInline,
            tunnel: row,
            editId: TunnelEditId.LocalPort,
            tooltip,
            markdownTooltip: label ? LocalAddressColumn.getHoverText(label) : undefined,
        };
    }
    static getHoverText(localAddress) {
        return function (configurationService) {
            const editorConf = configurationService.getValue('editor');
            let clickLabel = '';
            if (editorConf.multiCursorModifier === 'ctrlCmd') {
                if (isMacintosh) {
                    clickLabel = nls.localize('portsLink.followLinkAlt.mac', 'option + click');
                }
                else {
                    clickLabel = nls.localize('portsLink.followLinkAlt', 'alt + click');
                }
            }
            else {
                if (isMacintosh) {
                    clickLabel = nls.localize('portsLink.followLinkCmd', 'cmd + click');
                }
                else {
                    clickLabel = nls.localize('portsLink.followLinkCtrl', 'ctrl + click');
                }
            }
            const markdown = new MarkdownString('', true);
            const uri = localAddress.startsWith('http') ? localAddress : `http://${localAddress}`;
            return markdown.appendLink(uri, 'Follow link').appendMarkdown(` (${clickLabel})`);
        };
    }
}
class RunningProcessColumn {
    constructor() {
        this.label = nls.localize('tunnel.processColumn.label', 'Running Process');
        this.tooltip = nls.localize('tunnel.processColumn.tooltip', 'The command line of the process that is using the port.');
        this.weight = 2;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.processDescription ?? '';
        return {
            label,
            tunnel: row,
            editId: TunnelEditId.None,
            tooltip: row instanceof TunnelItem ? row.processTooltip : '',
        };
    }
}
class OriginColumn {
    constructor() {
        this.label = nls.localize('tunnel.originColumn.label', 'Origin');
        this.tooltip = nls.localize('tunnel.originColumn.tooltip', 'The source that a forwarded port originates from. Can be an extension, user forwarded, statically forwarded, or automatically forwarded.');
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.source.description;
        const tooltip = `${row instanceof TunnelItem ? row.originTooltip : ''}. ${row instanceof TunnelItem ? row.tooltipPostfix : ''}`;
        return {
            label,
            menuId: MenuId.TunnelOriginInline,
            tunnel: row,
            editId: TunnelEditId.None,
            tooltip,
        };
    }
}
class PrivacyColumn {
    constructor() {
        this.label = nls.localize('tunnel.privacyColumn.label', 'Visibility');
        this.tooltip = nls.localize('tunnel.privacyColumn.tooltip', 'The availability of the forwarded port.');
        this.weight = 1;
        this.templateId = 'actionbar';
    }
    project(row) {
        if (row.tunnelType === TunnelType.Add) {
            return emptyCell(row);
        }
        const label = row.privacy?.label;
        let tooltip = '';
        if (row instanceof TunnelItem) {
            tooltip = `${row.privacy.label} ${row.tooltipPostfix}`;
        }
        return {
            label,
            tunnel: row,
            icon: { id: row.privacy.themeIcon },
            editId: TunnelEditId.None,
            tooltip,
        };
    }
}
let ActionBarRenderer = class ActionBarRenderer extends Disposable {
    constructor(instantiationService, contextKeyService, menuService, contextViewService, remoteExplorerService, commandService, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.contextViewService = contextViewService;
        this.remoteExplorerService = remoteExplorerService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.templateId = 'actionbar';
        this._hoverDelegate = getDefaultHoverDelegate('mouse');
    }
    set actionRunner(actionRunner) {
        this._actionRunner = actionRunner;
    }
    renderTemplate(container) {
        const cell = dom.append(container, dom.$('.ports-view-actionbar-cell'));
        const icon = dom.append(cell, dom.$('.ports-view-actionbar-cell-icon'));
        const label = new IconLabel(cell, {
            supportHighlights: true,
            hoverDelegate: this._hoverDelegate,
        });
        const actionsContainer = dom.append(cell, dom.$('.actions'));
        const actionBar = new ActionBar(actionsContainer, {
            actionViewItemProvider: createActionViewItem.bind(undefined, this.instantiationService),
            hoverDelegate: this._hoverDelegate,
        });
        return { label, icon, actionBar, container: cell, elementDisposable: Disposable.None };
    }
    renderElement(element, index, templateData) {
        // reset
        templateData.actionBar.clear();
        templateData.icon.className = 'ports-view-actionbar-cell-icon';
        templateData.icon.style.display = 'none';
        templateData.label.setLabel('');
        templateData.label.element.style.display = 'none';
        templateData.container.style.height = '22px';
        if (templateData.button) {
            templateData.button.element.style.display = 'none';
            templateData.button.dispose();
        }
        templateData.container.style.paddingLeft = '0px';
        templateData.elementDisposable.dispose();
        let editableData;
        if (element.editId === TunnelEditId.New &&
            (editableData = this.remoteExplorerService.getEditableData(undefined))) {
            this.renderInputBox(templateData.container, editableData);
        }
        else {
            editableData = this.remoteExplorerService.getEditableData(element.tunnel, element.editId);
            if (editableData) {
                this.renderInputBox(templateData.container, editableData);
            }
            else if (element.tunnel.tunnelType === TunnelType.Add &&
                element.menuId === MenuId.TunnelPortInline) {
                this.renderButton(element, templateData);
            }
            else {
                this.renderActionBarItem(element, templateData);
            }
        }
    }
    renderButton(element, templateData) {
        templateData.container.style.paddingLeft = '7px';
        templateData.container.style.height = '28px';
        templateData.button = this._register(new Button(templateData.container, defaultButtonStyles));
        templateData.button.label = element.label;
        templateData.button.element.title = element.tooltip;
        this._register(templateData.button.onDidClick(() => {
            this.commandService.executeCommand(ForwardPortAction.INLINE_ID);
        }));
    }
    tunnelContext(tunnel) {
        let context;
        if (tunnel instanceof TunnelItem) {
            context = tunnel.strip();
        }
        if (!context) {
            context = {
                tunnelType: tunnel.tunnelType,
                remoteHost: tunnel.remoteHost,
                remotePort: tunnel.remotePort,
                localAddress: tunnel.localAddress,
                protocol: tunnel.protocol,
                localUri: tunnel.localUri,
                localPort: tunnel.localPort,
                name: tunnel.name,
                closeable: tunnel.closeable,
                source: tunnel.source,
                privacy: tunnel.privacy,
                processDescription: tunnel.processDescription,
                label: tunnel.label,
            };
        }
        return context;
    }
    renderActionBarItem(element, templateData) {
        templateData.label.element.style.display = 'flex';
        templateData.label.setLabel(element.label, undefined, {
            title: element.markdownTooltip
                ? {
                    markdown: element.markdownTooltip(this.configurationService),
                    markdownNotSupportedFallback: element.tooltip,
                }
                : element.tooltip,
            extraClasses: element.menuId === MenuId.TunnelLocalAddressInline
                ? ['ports-view-actionbar-cell-localaddress']
                : undefined,
        });
        templateData.actionBar.context = this.tunnelContext(element.tunnel);
        templateData.container.style.paddingLeft = '10px';
        const context = [
            ['view', TUNNEL_VIEW_ID],
            [TunnelTypeContextKey.key, element.tunnel.tunnelType],
            [TunnelCloseableContextKey.key, element.tunnel.closeable],
            [TunnelPrivacyContextKey.key, element.tunnel.privacy.id],
            [TunnelProtocolContextKey.key, element.tunnel.protocol],
        ];
        const contextKeyService = this.contextKeyService.createOverlay(context);
        const disposableStore = new DisposableStore();
        templateData.elementDisposable = disposableStore;
        if (element.menuId) {
            const menu = disposableStore.add(this.menuService.createMenu(element.menuId, contextKeyService));
            let actions = getFlatActionBarActions(menu.getActions({ shouldForwardArgs: true }));
            if (actions) {
                const labelActions = actions.filter((action) => action.id.toLowerCase().indexOf('label') >= 0);
                if (labelActions.length > 1) {
                    labelActions.sort((a, b) => a.label.length - b.label.length);
                    labelActions.pop();
                    actions = actions.filter((action) => labelActions.indexOf(action) < 0);
                }
                templateData.actionBar.push(actions, { icon: true, label: false });
                if (this._actionRunner) {
                    templateData.actionBar.actionRunner = this._actionRunner;
                }
            }
        }
        if (element.icon) {
            templateData.icon.className = `ports-view-actionbar-cell-icon ${ThemeIcon.asClassName(element.icon)}`;
            templateData.icon.title = element.tooltip;
            templateData.icon.style.display = 'inline';
        }
    }
    renderInputBox(container, editableData) {
        // Required for FireFox. The blur event doesn't fire on FireFox when you just mash the "+" button to forward a port.
        if (this.inputDone) {
            this.inputDone(false, false);
            this.inputDone = undefined;
        }
        container.style.paddingLeft = '5px';
        const value = editableData.startingValue || '';
        const inputBox = new InputBox(container, this.contextViewService, {
            ariaLabel: nls.localize('remote.tunnelsView.input', 'Press Enter to confirm or Escape to cancel.'),
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Error ? 3 /* MessageType.ERROR */ : 1 /* MessageType.INFO */,
                    };
                },
            },
            placeholder: editableData.placeholder || '',
            inputBoxStyles: defaultInputBoxStyles,
        });
        inputBox.value = value;
        inputBox.focus();
        inputBox.select({
            start: 0,
            end: editableData.startingValue ? editableData.startingValue.length : 0,
        });
        const done = createSingleCallFunction(async (success, finishEditing) => {
            dispose(toDispose);
            if (this.inputDone) {
                this.inputDone = undefined;
            }
            inputBox.element.style.display = 'none';
            const inputValue = inputBox.value;
            if (finishEditing) {
                return editableData.onFinish(inputValue, success);
            }
        });
        this.inputDone = done;
        const toDispose = [
            inputBox,
            dom.addStandardDisposableListener(inputBox.inputElement, dom.EventType.KEY_DOWN, async (e) => {
                if (e.equals(3 /* KeyCode.Enter */)) {
                    e.stopPropagation();
                    if (inputBox.validate() !== 3 /* MessageType.ERROR */) {
                        return done(true, true);
                    }
                    else {
                        return done(false, true);
                    }
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return done(false, true);
                }
            }),
            dom.addDisposableListener(inputBox.inputElement, dom.EventType.BLUR, () => {
                return done(inputBox.validate() !== 3 /* MessageType.ERROR */, true);
            }),
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposable.dispose();
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
        templateData.actionBar.dispose();
        templateData.elementDisposable.dispose();
        templateData.button?.dispose();
    }
};
ActionBarRenderer = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IMenuService),
    __param(3, IContextViewService),
    __param(4, IRemoteExplorerService),
    __param(5, ICommandService),
    __param(6, IConfigurationService)
], ActionBarRenderer);
class TunnelItem {
    static createFromTunnel(remoteExplorerService, tunnelService, tunnel, type = TunnelType.Forwarded, closeable) {
        return new TunnelItem(type, tunnel.remoteHost, tunnel.remotePort, tunnel.source, !!tunnel.hasRunningProcess, tunnel.protocol, tunnel.localUri, tunnel.localAddress, tunnel.localPort, closeable === undefined ? tunnel.closeable : closeable, tunnel.name, tunnel.runningProcess, tunnel.pid, tunnel.privacy, remoteExplorerService, tunnelService);
    }
    /**
     * Removes all non-serializable properties from the tunnel
     * @returns A new TunnelItem without any services
     */
    strip() {
        return new TunnelItem(this.tunnelType, this.remoteHost, this.remotePort, this.source, this.hasRunningProcess, this.protocol, this.localUri, this.localAddress, this.localPort, this.closeable, this.name, this.runningProcess, this.pid, this._privacy);
    }
    constructor(tunnelType, remoteHost, remotePort, source, hasRunningProcess, protocol, localUri, localAddress, localPort, closeable, name, runningProcess, pid, _privacy, remoteExplorerService, tunnelService) {
        this.tunnelType = tunnelType;
        this.remoteHost = remoteHost;
        this.remotePort = remotePort;
        this.source = source;
        this.hasRunningProcess = hasRunningProcess;
        this.protocol = protocol;
        this.localUri = localUri;
        this.localAddress = localAddress;
        this.localPort = localPort;
        this.closeable = closeable;
        this.name = name;
        this.runningProcess = runningProcess;
        this.pid = pid;
        this._privacy = _privacy;
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
    }
    get label() {
        if (this.tunnelType === TunnelType.Add && this.name) {
            return this.name;
        }
        const portNumberLabel = isLocalhost(this.remoteHost) || isAllInterfaces(this.remoteHost)
            ? `${this.remotePort}`
            : `${this.remoteHost}:${this.remotePort}`;
        if (this.name) {
            return `${this.name} (${portNumberLabel})`;
        }
        else {
            return portNumberLabel;
        }
    }
    set processDescription(description) {
        this.runningProcess = description;
    }
    get processDescription() {
        let description = '';
        if (this.runningProcess) {
            if (this.pid && this.remoteExplorerService?.namedProcesses.has(this.pid)) {
                // This is a known process. Give it a friendly name.
                description = this.remoteExplorerService.namedProcesses.get(this.pid);
            }
            else {
                description = this.runningProcess.replace(/\0/g, ' ').trim();
            }
            if (this.pid) {
                description += ` (${this.pid})`;
            }
        }
        else if (this.hasRunningProcess) {
            description = nls.localize('tunnelView.runningProcess.inacessable', 'Process information unavailable');
        }
        return description;
    }
    get tooltipPostfix() {
        let information;
        if (this.localAddress) {
            information = nls.localize('remote.tunnel.tooltipForwarded', 'Remote port {0}:{1} forwarded to local address {2}. ', this.remoteHost, this.remotePort, this.localAddress);
        }
        else {
            information = nls.localize('remote.tunnel.tooltipCandidate', 'Remote port {0}:{1} not forwarded. ', this.remoteHost, this.remotePort);
        }
        return information;
    }
    get iconTooltip() {
        const isAdd = this.tunnelType === TunnelType.Add;
        if (!isAdd) {
            return `${this.processDescription
                ? nls.localize('tunnel.iconColumn.running', 'Port has running process.')
                : nls.localize('tunnel.iconColumn.notRunning', 'No running process.')}`;
        }
        else {
            return this.label;
        }
    }
    get portTooltip() {
        const isAdd = this.tunnelType === TunnelType.Add;
        if (!isAdd) {
            return `${this.name ? nls.localize('remote.tunnel.tooltipName', 'Port labeled {0}. ', this.name) : ''}`;
        }
        else {
            return '';
        }
    }
    get processTooltip() {
        return this.processDescription ?? '';
    }
    get originTooltip() {
        return this.source.description;
    }
    get privacy() {
        if (this.tunnelService?.privacyOptions) {
            return (this.tunnelService?.privacyOptions.find((element) => element.id === this._privacy) ?? {
                id: '',
                themeIcon: Codicon.question.id,
                label: nls.localize('tunnelPrivacy.unknown', 'Unknown'),
            });
        }
        else {
            return {
                id: TunnelPrivacyId.Private,
                themeIcon: privatePortIcon.id,
                label: nls.localize('tunnelPrivacy.private', 'Private'),
            };
        }
    }
}
const TunnelTypeContextKey = new RawContextKey('tunnelType', TunnelType.Add, true);
const TunnelCloseableContextKey = new RawContextKey('tunnelCloseable', false, true);
const TunnelPrivacyContextKey = new RawContextKey('tunnelPrivacy', undefined, true);
const TunnelPrivacyEnabledContextKey = new RawContextKey('tunnelPrivacyEnabled', false, true);
const TunnelProtocolContextKey = new RawContextKey('tunnelProtocol', TunnelProtocol.Http, true);
const TunnelViewFocusContextKey = new RawContextKey('tunnelViewFocus', false, nls.localize('tunnel.focusContext', 'Whether the Ports view has focus.'));
const TunnelViewSelectionKeyName = 'tunnelViewSelection';
// host:port
const TunnelViewSelectionContextKey = new RawContextKey(TunnelViewSelectionKeyName, undefined, true);
const TunnelViewMultiSelectionKeyName = 'tunnelViewMultiSelection';
// host:port[]
const TunnelViewMultiSelectionContextKey = new RawContextKey(TunnelViewMultiSelectionKeyName, undefined, true);
const PortChangableContextKey = new RawContextKey('portChangable', false, true);
const ProtocolChangeableContextKey = new RawContextKey('protocolChangable', true, true);
let TunnelPanel = class TunnelPanel extends ViewPane {
    static { TunnelPanel_1 = this; }
    static { this.ID = TUNNEL_VIEW_ID; }
    static { this.TITLE = nls.localize2('remote.tunnel', 'Ports'); }
    constructor(viewModel, options, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, menuService, themeService, remoteExplorerService, hoverService, tunnelService, contextViewService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.viewModel = viewModel;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.menuService = menuService;
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this.contextViewService = contextViewService;
        this.tableDisposables = this._register(new DisposableStore());
        this.isEditing = false;
        // TODO: Should this be removed?
        //@ts-expect-error
        this.titleActions = [];
        this.lastFocus = [];
        this.height = 0;
        this.width = 0;
        this.tunnelTypeContext = TunnelTypeContextKey.bindTo(contextKeyService);
        this.tunnelCloseableContext = TunnelCloseableContextKey.bindTo(contextKeyService);
        this.tunnelPrivacyContext = TunnelPrivacyContextKey.bindTo(contextKeyService);
        this.tunnelPrivacyEnabledContext = TunnelPrivacyEnabledContextKey.bindTo(contextKeyService);
        this.tunnelPrivacyEnabledContext.set(tunnelService.canChangePrivacy);
        this.protocolChangableContextKey = ProtocolChangeableContextKey.bindTo(contextKeyService);
        this.protocolChangableContextKey.set(tunnelService.canChangeProtocol);
        this.tunnelProtocolContext = TunnelProtocolContextKey.bindTo(contextKeyService);
        this.tunnelViewFocusContext = TunnelViewFocusContextKey.bindTo(contextKeyService);
        this.tunnelViewSelectionContext = TunnelViewSelectionContextKey.bindTo(contextKeyService);
        this.tunnelViewMultiSelectionContext =
            TunnelViewMultiSelectionContextKey.bindTo(contextKeyService);
        this.portChangableContextKey = PortChangableContextKey.bindTo(contextKeyService);
        const overlayContextKeyService = this.contextKeyService.createOverlay([
            ['view', TunnelPanel_1.ID],
        ]);
        const titleMenu = this._register(this.menuService.createMenu(MenuId.TunnelTitle, overlayContextKeyService));
        const updateActions = () => {
            this.titleActions = getFlatActionBarActions(titleMenu.getActions());
            this.updateActions();
        };
        this._register(titleMenu.onDidChange(updateActions));
        updateActions();
        this._register(toDisposable(() => {
            this.titleActions = [];
        }));
        this.registerPrivacyActions();
        this._register(Event.once(this.tunnelService.onAddedTunnelProvider)(() => {
            let updated = false;
            if (this.tunnelPrivacyEnabledContext.get() === false) {
                this.tunnelPrivacyEnabledContext.set(tunnelService.canChangePrivacy);
                updated = true;
            }
            if (this.protocolChangableContextKey.get() === true) {
                this.protocolChangableContextKey.set(tunnelService.canChangeProtocol);
                updated = true;
            }
            if (updated) {
                updateActions();
                this.registerPrivacyActions();
                this.createTable();
                this.table?.layout(this.height, this.width);
            }
        }));
    }
    registerPrivacyActions() {
        for (const privacyOption of this.tunnelService.privacyOptions) {
            const optionId = `remote.tunnel.privacy${privacyOption.id}`;
            CommandsRegistry.registerCommand(optionId, ChangeTunnelPrivacyAction.handler(privacyOption.id));
            MenuRegistry.appendMenuItem(MenuId.TunnelPrivacy, {
                order: 0,
                command: {
                    id: optionId,
                    title: privacyOption.label,
                    toggled: TunnelPrivacyContextKey.isEqualTo(privacyOption.id),
                },
            });
        }
    }
    get portCount() {
        return (this.remoteExplorerService.tunnelModel.forwarded.size +
            this.remoteExplorerService.tunnelModel.detected.size);
    }
    createTable() {
        if (!this.panelContainer) {
            return;
        }
        this.tableDisposables.clear();
        dom.clearNode(this.panelContainer);
        const widgetContainer = dom.append(this.panelContainer, dom.$('.customview-tree'));
        widgetContainer.classList.add('ports-view');
        widgetContainer.classList.add('file-icon-themable-tree', 'show-file-icons');
        const actionBarRenderer = new ActionBarRenderer(this.instantiationService, this.contextKeyService, this.menuService, this.contextViewService, this.remoteExplorerService, this.commandService, this.configurationService);
        const columns = [
            new IconColumn(),
            new PortColumn(),
            new LocalAddressColumn(),
            new RunningProcessColumn(),
        ];
        if (this.tunnelService.canChangePrivacy) {
            columns.push(new PrivacyColumn());
        }
        columns.push(new OriginColumn());
        this.table = this.instantiationService.createInstance(WorkbenchTable, 'RemoteTunnels', widgetContainer, new TunnelTreeVirtualDelegate(this.remoteExplorerService), columns, [actionBarRenderer], {
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (item) => {
                    return item.label;
                },
            },
            multipleSelectionSupport: true,
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    if (item instanceof TunnelItem) {
                        return `${item.tooltipPostfix} ${item.portTooltip} ${item.iconTooltip} ${item.processTooltip} ${item.originTooltip} ${this.tunnelService.canChangePrivacy ? item.privacy.label : ''}`;
                    }
                    else {
                        return item.label;
                    }
                },
                getWidgetAriaLabel: () => nls.localize('tunnelView', 'Tunnel View'),
            },
            openOnSingleClick: true,
        });
        const actionRunner = this.tableDisposables.add(new ActionRunner());
        actionBarRenderer.actionRunner = actionRunner;
        this.tableDisposables.add(this.table);
        this.tableDisposables.add(this.table.onContextMenu((e) => this.onContextMenu(e, actionRunner)));
        this.tableDisposables.add(this.table.onMouseDblClick((e) => this.onMouseDblClick(e)));
        this.tableDisposables.add(this.table.onDidChangeFocus((e) => this.onFocusChanged(e)));
        this.tableDisposables.add(this.table.onDidChangeSelection((e) => this.onSelectionChanged(e)));
        this.tableDisposables.add(this.table.onDidFocus(() => this.tunnelViewFocusContext.set(true)));
        this.tableDisposables.add(this.table.onDidBlur(() => this.tunnelViewFocusContext.set(false)));
        const rerender = () => this.table?.splice(0, Number.POSITIVE_INFINITY, this.viewModel.all);
        rerender();
        let lastPortCount = this.portCount;
        this.tableDisposables.add(Event.debounce(this.viewModel.onForwardedPortsChanged, (_last, e) => e, 50)(() => {
            const newPortCount = this.portCount;
            if ((lastPortCount === 0 || newPortCount === 0) && lastPortCount !== newPortCount) {
                this._onDidChangeViewWelcomeState.fire();
            }
            lastPortCount = newPortCount;
            rerender();
        }));
        this.tableDisposables.add(this.table.onMouseClick((e) => {
            if (this.hasOpenLinkModifier(e.browserEvent) && this.table) {
                const selection = this.table.getSelectedElements();
                if (selection.length === 0 || (selection.length === 1 && selection[0] === e.element)) {
                    this.commandService.executeCommand(OpenPortInBrowserAction.ID, e.element);
                }
            }
        }));
        this.tableDisposables.add(this.table.onDidOpen((e) => {
            if (!e.element || e.element.tunnelType !== TunnelType.Forwarded) {
                return;
            }
            if (e.browserEvent?.type === 'dblclick') {
                this.commandService.executeCommand(LabelTunnelAction.ID);
            }
        }));
        this.tableDisposables.add(this.remoteExplorerService.onDidChangeEditable((e) => {
            this.isEditing = !!this.remoteExplorerService.getEditableData(e?.tunnel, e?.editId);
            this._onDidChangeViewWelcomeState.fire();
            if (!this.isEditing) {
                widgetContainer.classList.remove('highlight');
            }
            rerender();
            if (this.isEditing) {
                widgetContainer.classList.add('highlight');
                if (!e) {
                    // When we are in editing mode for a new forward, rather than updating an existing one we need to reveal the input box since it might be out of view.
                    this.table?.reveal(this.table.indexOf(this.viewModel.input));
                }
            }
            else {
                if (e && e.tunnel.tunnelType !== TunnelType.Add) {
                    this.table?.setFocus(this.lastFocus);
                }
                this.focus();
            }
        }));
    }
    renderBody(container) {
        super.renderBody(container);
        this.panelContainer = dom.append(container, dom.$('.tree-explorer-viewlet-tree-view'));
        this.createTable();
    }
    shouldShowWelcome() {
        return this.viewModel.isEmpty() && !this.isEditing;
    }
    focus() {
        super.focus();
        this.table?.domFocus();
    }
    onFocusChanged(event) {
        if (event.indexes.length > 0 && event.elements.length > 0) {
            this.lastFocus = [...event.indexes];
        }
        const elements = event.elements;
        const item = elements && elements.length ? elements[0] : undefined;
        if (item) {
            this.tunnelViewSelectionContext.set(makeAddress(item.remoteHost, item.remotePort));
            this.tunnelTypeContext.set(item.tunnelType);
            this.tunnelCloseableContext.set(!!item.closeable);
            this.tunnelPrivacyContext.set(item.privacy.id);
            this.tunnelProtocolContext.set(item.protocol === TunnelProtocol.Https ? TunnelProtocol.Https : TunnelProtocol.Https);
            this.portChangableContextKey.set(!!item.localPort);
        }
        else {
            this.tunnelTypeContext.reset();
            this.tunnelViewSelectionContext.reset();
            this.tunnelCloseableContext.reset();
            this.tunnelPrivacyContext.reset();
            this.tunnelProtocolContext.reset();
            this.portChangableContextKey.reset();
        }
    }
    hasOpenLinkModifier(e) {
        const editorConf = this.configurationService.getValue('editor');
        let modifierKey = false;
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            modifierKey = e.altKey;
        }
        else {
            if (isMacintosh) {
                modifierKey = e.metaKey;
            }
            else {
                modifierKey = e.ctrlKey;
            }
        }
        return modifierKey;
    }
    onSelectionChanged(event) {
        const elements = event.elements;
        if (elements.length > 1) {
            this.tunnelViewMultiSelectionContext.set(elements.map((element) => makeAddress(element.remoteHost, element.remotePort)));
        }
        else {
            this.tunnelViewMultiSelectionContext.set(undefined);
        }
    }
    onContextMenu(event, actionRunner) {
        if (event.element !== undefined && !(event.element instanceof TunnelItem)) {
            return;
        }
        event.browserEvent.preventDefault();
        event.browserEvent.stopPropagation();
        const node = event.element;
        if (node) {
            this.table?.setFocus([this.table.indexOf(node)]);
            this.tunnelTypeContext.set(node.tunnelType);
            this.tunnelCloseableContext.set(!!node.closeable);
            this.tunnelPrivacyContext.set(node.privacy.id);
            this.tunnelProtocolContext.set(node.protocol);
            this.portChangableContextKey.set(!!node.localPort);
        }
        else {
            this.tunnelTypeContext.set(TunnelType.Add);
            this.tunnelCloseableContext.set(false);
            this.tunnelPrivacyContext.set(undefined);
            this.tunnelProtocolContext.set(undefined);
            this.portChangableContextKey.set(false);
        }
        this.contextMenuService.showContextMenu({
            menuId: MenuId.TunnelContext,
            menuActionOptions: { shouldForwardArgs: true },
            contextKeyService: this.table?.contextKeyService,
            getAnchor: () => event.anchor,
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
                    this.table?.domFocus();
                }
            },
            getActionsContext: () => node?.strip(),
            actionRunner,
        });
    }
    onMouseDblClick(e) {
        if (!e.element) {
            this.commandService.executeCommand(ForwardPortAction.INLINE_ID);
        }
    }
    layoutBody(height, width) {
        this.height = height;
        this.width = width;
        super.layoutBody(height, width);
        this.table?.layout(height, width);
    }
};
TunnelPanel = TunnelPanel_1 = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IContextKeyService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IViewDescriptorService),
    __param(8, IOpenerService),
    __param(9, IQuickInputService),
    __param(10, ICommandService),
    __param(11, IMenuService),
    __param(12, IThemeService),
    __param(13, IRemoteExplorerService),
    __param(14, IHoverService),
    __param(15, ITunnelService),
    __param(16, IContextViewService)
], TunnelPanel);
export { TunnelPanel };
export class TunnelPanelDescriptor {
    constructor(viewModel, environmentService) {
        this.id = TunnelPanel.ID;
        this.name = TunnelPanel.TITLE;
        this.canToggleVisibility = true;
        this.hideByDefault = false;
        // group is not actually used for views that are not extension contributed. Use order instead.
        this.group = 'details@0';
        // -500 comes from the remote explorer viewOrderDelegate
        this.order = -500;
        this.canMoveView = true;
        this.containerIcon = portsViewIcon;
        this.ctorDescriptor = new SyncDescriptor(TunnelPanel, [viewModel]);
        this.remoteAuthority = environmentService.remoteAuthority
            ? environmentService.remoteAuthority.split('+')[0]
            : undefined;
    }
}
function isITunnelItem(item) {
    return item && item.tunnelType && item.remoteHost && item.source;
}
var LabelTunnelAction;
(function (LabelTunnelAction) {
    LabelTunnelAction.ID = 'remote.tunnel.label';
    LabelTunnelAction.LABEL = nls.localize('remote.tunnel.label', 'Set Port Label');
    LabelTunnelAction.COMMAND_ID_KEYWORD = 'label';
    function handler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            let tunnelContext;
            if (isITunnelItem(arg)) {
                tunnelContext = arg;
            }
            else {
                const context = accessor
                    .get(IContextKeyService)
                    .getContextKeyValue(TunnelViewSelectionKeyName);
                const tunnel = context
                    ? remoteExplorerService.tunnelModel.forwarded.get(context)
                    : undefined;
                if (tunnel) {
                    const tunnelService = accessor.get(ITunnelService);
                    tunnelContext = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, tunnel);
                }
            }
            if (tunnelContext) {
                const tunnelItem = tunnelContext;
                return new Promise((resolve) => {
                    const startingValue = tunnelItem.name ? tunnelItem.name : `${tunnelItem.remotePort}`;
                    remoteExplorerService.setEditable(tunnelItem, TunnelEditId.Label, {
                        onFinish: async (value, success) => {
                            value = value.trim();
                            remoteExplorerService.setEditable(tunnelItem, TunnelEditId.Label, null);
                            const changed = success && value !== startingValue;
                            if (changed) {
                                await remoteExplorerService.tunnelModel.name(tunnelItem.remoteHost, tunnelItem.remotePort, value);
                            }
                            resolve(changed ? { port: tunnelItem.remotePort, label: value } : undefined);
                        },
                        validationMessage: () => null,
                        placeholder: nls.localize('remote.tunnelsView.labelPlaceholder', 'Port label'),
                        startingValue,
                    });
                });
            }
            return undefined;
        };
    }
    LabelTunnelAction.handler = handler;
})(LabelTunnelAction || (LabelTunnelAction = {}));
const invalidPortString = nls.localize('remote.tunnelsView.portNumberValid', 'Forwarded port should be a number or a host:port.');
const maxPortNumber = 65536;
const invalidPortNumberString = nls.localize('remote.tunnelsView.portNumberToHigh', 'Port number must be \u2265 0 and < {0}.', maxPortNumber);
const requiresSudoString = nls.localize('remote.tunnelView.inlineElevationMessage', 'May Require Sudo');
const alreadyForwarded = nls.localize('remote.tunnelView.alreadyForwarded', 'Port is already forwarded');
export var ForwardPortAction;
(function (ForwardPortAction) {
    ForwardPortAction.INLINE_ID = 'remote.tunnel.forwardInline';
    ForwardPortAction.COMMANDPALETTE_ID = 'remote.tunnel.forwardCommandPalette';
    ForwardPortAction.LABEL = nls.localize2('remote.tunnel.forward', 'Forward a Port');
    ForwardPortAction.TREEITEM_LABEL = nls.localize('remote.tunnel.forwardItem', 'Forward Port');
    const forwardPrompt = nls.localize('remote.tunnel.forwardPrompt', 'Port number or address (eg. 3000 or 10.10.10.10:2000).');
    function validateInput(remoteExplorerService, tunnelService, value, canElevate) {
        const parsed = parseAddress(value);
        if (!parsed) {
            return { content: invalidPortString, severity: Severity.Error };
        }
        else if (parsed.port >= maxPortNumber) {
            return { content: invalidPortNumberString, severity: Severity.Error };
        }
        else if (canElevate && tunnelService.isPortPrivileged(parsed.port)) {
            return { content: requiresSudoString, severity: Severity.Info };
        }
        else if (mapHasAddressLocalhostOrAllInterfaces(remoteExplorerService.tunnelModel.forwarded, parsed.host, parsed.port)) {
            return { content: alreadyForwarded, severity: Severity.Error };
        }
        return null;
    }
    function error(notificationService, tunnelOrError, host, port) {
        if (!tunnelOrError) {
            notificationService.warn(nls.localize('remote.tunnel.forwardError', 'Unable to forward {0}:{1}. The host may not be available or that remote port may already be forwarded', host, port));
        }
        else if (typeof tunnelOrError === 'string') {
            notificationService.warn(nls.localize('remote.tunnel.forwardErrorProvided', 'Unable to forward {0}:{1}. {2}', host, port, tunnelOrError));
        }
    }
    function inlineHandler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const notificationService = accessor.get(INotificationService);
            const tunnelService = accessor.get(ITunnelService);
            remoteExplorerService.setEditable(undefined, TunnelEditId.New, {
                onFinish: async (value, success) => {
                    remoteExplorerService.setEditable(undefined, TunnelEditId.New, null);
                    let parsed;
                    if (success && (parsed = parseAddress(value))) {
                        remoteExplorerService
                            .forward({
                            remote: { host: parsed.host, port: parsed.port },
                            elevateIfNeeded: true,
                        })
                            .then((tunnelOrError) => error(notificationService, tunnelOrError, parsed.host, parsed.port));
                    }
                },
                validationMessage: (value) => validateInput(remoteExplorerService, tunnelService, value, tunnelService.canElevate),
                placeholder: forwardPrompt,
            });
        };
    }
    ForwardPortAction.inlineHandler = inlineHandler;
    function commandPaletteHandler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const notificationService = accessor.get(INotificationService);
            const viewsService = accessor.get(IViewsService);
            const quickInputService = accessor.get(IQuickInputService);
            const tunnelService = accessor.get(ITunnelService);
            await viewsService.openView(TunnelPanel.ID, true);
            const value = await quickInputService.input({
                prompt: forwardPrompt,
                validateInput: (value) => Promise.resolve(validateInput(remoteExplorerService, tunnelService, value, tunnelService.canElevate)),
            });
            let parsed;
            if (value && (parsed = parseAddress(value))) {
                remoteExplorerService
                    .forward({
                    remote: { host: parsed.host, port: parsed.port },
                    elevateIfNeeded: true,
                })
                    .then((tunnel) => error(notificationService, tunnel, parsed.host, parsed.port));
            }
        };
    }
    ForwardPortAction.commandPaletteHandler = commandPaletteHandler;
})(ForwardPortAction || (ForwardPortAction = {}));
function makeTunnelPicks(tunnels, remoteExplorerService, tunnelService) {
    const picks = tunnels.map((forwarded) => {
        const item = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, forwarded);
        return {
            label: item.label,
            description: item.processDescription,
            tunnel: item,
        };
    });
    if (picks.length === 0) {
        picks.push({
            label: nls.localize('remote.tunnel.closeNoPorts', 'No ports currently forwarded. Try running the {0} command', ForwardPortAction.LABEL.value),
        });
    }
    return picks;
}
var ClosePortAction;
(function (ClosePortAction) {
    ClosePortAction.INLINE_ID = 'remote.tunnel.closeInline';
    ClosePortAction.COMMANDPALETTE_ID = 'remote.tunnel.closeCommandPalette';
    ClosePortAction.LABEL = nls.localize2('remote.tunnel.close', 'Stop Forwarding Port');
    function inlineHandler() {
        return async (accessor, arg) => {
            const contextKeyService = accessor.get(IContextKeyService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            let ports = [];
            const multiSelectContext = contextKeyService.getContextKeyValue(TunnelViewMultiSelectionKeyName);
            if (multiSelectContext) {
                multiSelectContext.forEach((context) => {
                    const tunnel = remoteExplorerService.tunnelModel.forwarded.get(context);
                    if (tunnel) {
                        ports?.push(tunnel);
                    }
                });
            }
            else if (isITunnelItem(arg)) {
                ports = [arg];
            }
            else {
                const context = contextKeyService.getContextKeyValue(TunnelViewSelectionKeyName);
                const tunnel = context
                    ? remoteExplorerService.tunnelModel.forwarded.get(context)
                    : undefined;
                if (tunnel) {
                    ports = [tunnel];
                }
            }
            if (!ports || ports.length === 0) {
                return;
            }
            return Promise.all(ports.map((port) => remoteExplorerService.close({ host: port.remoteHost, port: port.remotePort }, TunnelCloseReason.User)));
        };
    }
    ClosePortAction.inlineHandler = inlineHandler;
    function commandPaletteHandler() {
        return async (accessor) => {
            const quickInputService = accessor.get(IQuickInputService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const tunnelService = accessor.get(ITunnelService);
            const commandService = accessor.get(ICommandService);
            const picks = makeTunnelPicks(Array.from(remoteExplorerService.tunnelModel.forwarded.values()).filter((tunnel) => tunnel.closeable), remoteExplorerService, tunnelService);
            const result = await quickInputService.pick(picks, {
                placeHolder: nls.localize('remote.tunnel.closePlaceholder', 'Choose a port to stop forwarding'),
            });
            if (result && result.tunnel) {
                await remoteExplorerService.close({ host: result.tunnel.remoteHost, port: result.tunnel.remotePort }, TunnelCloseReason.User);
            }
            else if (result) {
                await commandService.executeCommand(ForwardPortAction.COMMANDPALETTE_ID);
            }
        };
    }
    ClosePortAction.commandPaletteHandler = commandPaletteHandler;
})(ClosePortAction || (ClosePortAction = {}));
export var OpenPortInBrowserAction;
(function (OpenPortInBrowserAction) {
    OpenPortInBrowserAction.ID = 'remote.tunnel.open';
    OpenPortInBrowserAction.LABEL = nls.localize('remote.tunnel.open', 'Open in Browser');
    function handler() {
        return async (accessor, arg) => {
            let key;
            if (isITunnelItem(arg)) {
                key = makeAddress(arg.remoteHost, arg.remotePort);
            }
            else if (arg.tunnelRemoteHost && arg.tunnelRemotePort) {
                key = makeAddress(arg.tunnelRemoteHost, arg.tunnelRemotePort);
            }
            if (key) {
                const model = accessor.get(IRemoteExplorerService).tunnelModel;
                const openerService = accessor.get(IOpenerService);
                return run(model, openerService, key);
            }
        };
    }
    OpenPortInBrowserAction.handler = handler;
    function run(model, openerService, key) {
        const tunnel = model.forwarded.get(key) || model.detected.get(key);
        if (tunnel) {
            return openerService.open(tunnel.localUri, { allowContributedOpeners: false });
        }
        return Promise.resolve();
    }
    OpenPortInBrowserAction.run = run;
})(OpenPortInBrowserAction || (OpenPortInBrowserAction = {}));
export var OpenPortInPreviewAction;
(function (OpenPortInPreviewAction) {
    OpenPortInPreviewAction.ID = 'remote.tunnel.openPreview';
    OpenPortInPreviewAction.LABEL = nls.localize('remote.tunnel.openPreview', 'Preview in Editor');
    function handler() {
        return async (accessor, arg) => {
            let key;
            if (isITunnelItem(arg)) {
                key = makeAddress(arg.remoteHost, arg.remotePort);
            }
            else if (arg.tunnelRemoteHost && arg.tunnelRemotePort) {
                key = makeAddress(arg.tunnelRemoteHost, arg.tunnelRemotePort);
            }
            if (key) {
                const model = accessor.get(IRemoteExplorerService).tunnelModel;
                const openerService = accessor.get(IOpenerService);
                const externalOpenerService = accessor.get(IExternalUriOpenerService);
                return run(model, openerService, externalOpenerService, key);
            }
        };
    }
    OpenPortInPreviewAction.handler = handler;
    async function run(model, openerService, externalOpenerService, key) {
        const tunnel = model.forwarded.get(key) || model.detected.get(key);
        if (tunnel) {
            const remoteHost = tunnel.remoteHost.includes(':')
                ? `[${tunnel.remoteHost}]`
                : tunnel.remoteHost;
            const sourceUri = URI.parse(`http://${remoteHost}:${tunnel.remotePort}`);
            const opener = await externalOpenerService.getOpener(tunnel.localUri, { sourceUri }, CancellationToken.None);
            if (opener) {
                return opener.openExternalUri(tunnel.localUri, { sourceUri }, CancellationToken.None);
            }
            return openerService.open(tunnel.localUri);
        }
        return Promise.resolve();
    }
    OpenPortInPreviewAction.run = run;
})(OpenPortInPreviewAction || (OpenPortInPreviewAction = {}));
var OpenPortInBrowserCommandPaletteAction;
(function (OpenPortInBrowserCommandPaletteAction) {
    OpenPortInBrowserCommandPaletteAction.ID = 'remote.tunnel.openCommandPalette';
    OpenPortInBrowserCommandPaletteAction.LABEL = nls.localize('remote.tunnel.openCommandPalette', 'Open Port in Browser');
    function handler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const tunnelService = accessor.get(ITunnelService);
            const model = remoteExplorerService.tunnelModel;
            const quickPickService = accessor.get(IQuickInputService);
            const openerService = accessor.get(IOpenerService);
            const commandService = accessor.get(ICommandService);
            const options = [...model.forwarded, ...model.detected].map((value) => {
                const tunnelItem = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, value[1]);
                return {
                    label: tunnelItem.label,
                    description: tunnelItem.processDescription,
                    tunnel: tunnelItem,
                };
            });
            if (options.length === 0) {
                options.push({
                    label: nls.localize('remote.tunnel.openCommandPaletteNone', 'No ports currently forwarded. Open the Ports view to get started.'),
                });
            }
            else {
                options.push({
                    label: nls.localize('remote.tunnel.openCommandPaletteView', 'Open the Ports view...'),
                });
            }
            const picked = await quickPickService.pick(options, {
                placeHolder: nls.localize('remote.tunnel.openCommandPalettePick', 'Choose the port to open'),
            });
            if (picked && picked.tunnel) {
                return OpenPortInBrowserAction.run(model, openerService, makeAddress(picked.tunnel.remoteHost, picked.tunnel.remotePort));
            }
            else if (picked) {
                return commandService.executeCommand(`${TUNNEL_VIEW_ID}.focus`);
            }
        };
    }
    OpenPortInBrowserCommandPaletteAction.handler = handler;
})(OpenPortInBrowserCommandPaletteAction || (OpenPortInBrowserCommandPaletteAction = {}));
var CopyAddressAction;
(function (CopyAddressAction) {
    CopyAddressAction.INLINE_ID = 'remote.tunnel.copyAddressInline';
    CopyAddressAction.COMMANDPALETTE_ID = 'remote.tunnel.copyAddressCommandPalette';
    CopyAddressAction.INLINE_LABEL = nls.localize('remote.tunnel.copyAddressInline', 'Copy Local Address');
    CopyAddressAction.COMMANDPALETTE_LABEL = nls.localize('remote.tunnel.copyAddressCommandPalette', 'Copy Forwarded Port Address');
    async function copyAddress(remoteExplorerService, clipboardService, tunnelItem) {
        const address = remoteExplorerService.tunnelModel.address(tunnelItem.remoteHost, tunnelItem.remotePort);
        if (address) {
            await clipboardService.writeText(address.toString());
        }
    }
    function inlineHandler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            let tunnelItem;
            if (isITunnelItem(arg)) {
                tunnelItem = arg;
            }
            else {
                const context = accessor
                    .get(IContextKeyService)
                    .getContextKeyValue(TunnelViewSelectionKeyName);
                tunnelItem = context ? remoteExplorerService.tunnelModel.forwarded.get(context) : undefined;
            }
            if (tunnelItem) {
                return copyAddress(remoteExplorerService, accessor.get(IClipboardService), tunnelItem);
            }
        };
    }
    CopyAddressAction.inlineHandler = inlineHandler;
    function commandPaletteHandler() {
        return async (accessor, arg) => {
            const quickInputService = accessor.get(IQuickInputService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const tunnelService = accessor.get(ITunnelService);
            const commandService = accessor.get(ICommandService);
            const clipboardService = accessor.get(IClipboardService);
            const tunnels = Array.from(remoteExplorerService.tunnelModel.forwarded.values()).concat(Array.from(remoteExplorerService.tunnelModel.detected.values()));
            const result = await quickInputService.pick(makeTunnelPicks(tunnels, remoteExplorerService, tunnelService), {
                placeHolder: nls.localize('remote.tunnel.copyAddressPlaceholdter', 'Choose a forwarded port'),
            });
            if (result && result.tunnel) {
                await copyAddress(remoteExplorerService, clipboardService, result.tunnel);
            }
            else if (result) {
                await commandService.executeCommand(ForwardPortAction.COMMANDPALETTE_ID);
            }
        };
    }
    CopyAddressAction.commandPaletteHandler = commandPaletteHandler;
})(CopyAddressAction || (CopyAddressAction = {}));
var ChangeLocalPortAction;
(function (ChangeLocalPortAction) {
    ChangeLocalPortAction.ID = 'remote.tunnel.changeLocalPort';
    ChangeLocalPortAction.LABEL = nls.localize('remote.tunnel.changeLocalPort', 'Change Local Address Port');
    function validateInput(tunnelService, value, canElevate) {
        if (!value.match(/^[0-9]+$/)) {
            return {
                content: nls.localize('remote.tunnelsView.portShouldBeNumber', 'Local port should be a number.'),
                severity: Severity.Error,
            };
        }
        else if (Number(value) >= maxPortNumber) {
            return { content: invalidPortNumberString, severity: Severity.Error };
        }
        else if (canElevate && tunnelService.isPortPrivileged(Number(value))) {
            return { content: requiresSudoString, severity: Severity.Info };
        }
        return null;
    }
    function handler() {
        return async (accessor, arg) => {
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const notificationService = accessor.get(INotificationService);
            const tunnelService = accessor.get(ITunnelService);
            let tunnelContext;
            if (isITunnelItem(arg)) {
                tunnelContext = arg;
            }
            else {
                const context = accessor
                    .get(IContextKeyService)
                    .getContextKeyValue(TunnelViewSelectionKeyName);
                const tunnel = context
                    ? remoteExplorerService.tunnelModel.forwarded.get(context)
                    : undefined;
                if (tunnel) {
                    const tunnelService = accessor.get(ITunnelService);
                    tunnelContext = TunnelItem.createFromTunnel(remoteExplorerService, tunnelService, tunnel);
                }
            }
            if (tunnelContext) {
                const tunnelItem = tunnelContext;
                remoteExplorerService.setEditable(tunnelItem, TunnelEditId.LocalPort, {
                    onFinish: async (value, success) => {
                        remoteExplorerService.setEditable(tunnelItem, TunnelEditId.LocalPort, null);
                        if (success) {
                            await remoteExplorerService.close({ host: tunnelItem.remoteHost, port: tunnelItem.remotePort }, TunnelCloseReason.Other);
                            const numberValue = Number(value);
                            const newForward = await remoteExplorerService.forward({
                                remote: { host: tunnelItem.remoteHost, port: tunnelItem.remotePort },
                                local: numberValue,
                                name: tunnelItem.name,
                                elevateIfNeeded: true,
                                source: tunnelItem.source,
                            });
                            if (newForward &&
                                typeof newForward !== 'string' &&
                                newForward.tunnelLocalPort !== numberValue) {
                                notificationService.warn(nls.localize('remote.tunnel.changeLocalPortNumber', 'The local port {0} is not available. Port number {1} has been used instead', value, newForward.tunnelLocalPort ?? newForward.localAddress));
                            }
                        }
                    },
                    validationMessage: (value) => validateInput(tunnelService, value, tunnelService.canElevate),
                    placeholder: nls.localize('remote.tunnelsView.changePort', 'New local port'),
                });
            }
        };
    }
    ChangeLocalPortAction.handler = handler;
})(ChangeLocalPortAction || (ChangeLocalPortAction = {}));
var ChangeTunnelPrivacyAction;
(function (ChangeTunnelPrivacyAction) {
    function handler(privacyId) {
        return async (accessor, arg) => {
            if (isITunnelItem(arg)) {
                const remoteExplorerService = accessor.get(IRemoteExplorerService);
                await remoteExplorerService.close({ host: arg.remoteHost, port: arg.remotePort }, TunnelCloseReason.Other);
                return remoteExplorerService.forward({
                    remote: { host: arg.remoteHost, port: arg.remotePort },
                    local: arg.localPort,
                    name: arg.name,
                    elevateIfNeeded: true,
                    privacy: privacyId,
                    source: arg.source,
                });
            }
            return undefined;
        };
    }
    ChangeTunnelPrivacyAction.handler = handler;
})(ChangeTunnelPrivacyAction || (ChangeTunnelPrivacyAction = {}));
var SetTunnelProtocolAction;
(function (SetTunnelProtocolAction) {
    SetTunnelProtocolAction.ID_HTTP = 'remote.tunnel.setProtocolHttp';
    SetTunnelProtocolAction.ID_HTTPS = 'remote.tunnel.setProtocolHttps';
    SetTunnelProtocolAction.LABEL_HTTP = nls.localize('remote.tunnel.protocolHttp', 'HTTP');
    SetTunnelProtocolAction.LABEL_HTTPS = nls.localize('remote.tunnel.protocolHttps', 'HTTPS');
    async function handler(arg, protocol, remoteExplorerService, environmentService) {
        if (isITunnelItem(arg)) {
            const attributes = {
                protocol,
            };
            const target = environmentService.remoteAuthority
                ? 4 /* ConfigurationTarget.USER_REMOTE */
                : 3 /* ConfigurationTarget.USER_LOCAL */;
            return remoteExplorerService.tunnelModel.configPortsAttributes.addAttributes(arg.remotePort, attributes, target);
        }
    }
    function handlerHttp() {
        return async (accessor, arg) => {
            return handler(arg, TunnelProtocol.Http, accessor.get(IRemoteExplorerService), accessor.get(IWorkbenchEnvironmentService));
        };
    }
    SetTunnelProtocolAction.handlerHttp = handlerHttp;
    function handlerHttps() {
        return async (accessor, arg) => {
            return handler(arg, TunnelProtocol.Https, accessor.get(IRemoteExplorerService), accessor.get(IWorkbenchEnvironmentService));
        };
    }
    SetTunnelProtocolAction.handlerHttps = handlerHttps;
})(SetTunnelProtocolAction || (SetTunnelProtocolAction = {}));
const tunnelViewCommandsWeightBonus = 10; // give our commands a little bit more weight over other default list/tree commands
const isForwardedExpr = TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded);
const isForwardedOrDetectedExpr = ContextKeyExpr.or(isForwardedExpr, TunnelTypeContextKey.isEqualTo(TunnelType.Detected));
const isNotMultiSelectionExpr = TunnelViewMultiSelectionContextKey.isEqualTo(undefined);
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: LabelTunnelAction.ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + tunnelViewCommandsWeightBonus,
    when: ContextKeyExpr.and(TunnelViewFocusContextKey, isForwardedExpr, isNotMultiSelectionExpr),
    primary: 60 /* KeyCode.F2 */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
    },
    handler: LabelTunnelAction.handler(),
});
CommandsRegistry.registerCommand(ForwardPortAction.INLINE_ID, ForwardPortAction.inlineHandler());
CommandsRegistry.registerCommand(ForwardPortAction.COMMANDPALETTE_ID, ForwardPortAction.commandPaletteHandler());
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: ClosePortAction.INLINE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + tunnelViewCommandsWeightBonus,
    when: ContextKeyExpr.and(TunnelCloseableContextKey, TunnelViewFocusContextKey),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
        secondary: [20 /* KeyCode.Delete */],
    },
    handler: ClosePortAction.inlineHandler(),
});
CommandsRegistry.registerCommand(ClosePortAction.COMMANDPALETTE_ID, ClosePortAction.commandPaletteHandler());
CommandsRegistry.registerCommand(OpenPortInBrowserAction.ID, OpenPortInBrowserAction.handler());
CommandsRegistry.registerCommand(OpenPortInPreviewAction.ID, OpenPortInPreviewAction.handler());
CommandsRegistry.registerCommand(OpenPortInBrowserCommandPaletteAction.ID, OpenPortInBrowserCommandPaletteAction.handler());
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CopyAddressAction.INLINE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + tunnelViewCommandsWeightBonus,
    when: ContextKeyExpr.and(TunnelViewFocusContextKey, isForwardedOrDetectedExpr, isNotMultiSelectionExpr),
    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
    handler: CopyAddressAction.inlineHandler(),
});
CommandsRegistry.registerCommand(CopyAddressAction.COMMANDPALETTE_ID, CopyAddressAction.commandPaletteHandler());
CommandsRegistry.registerCommand(ChangeLocalPortAction.ID, ChangeLocalPortAction.handler());
CommandsRegistry.registerCommand(SetTunnelProtocolAction.ID_HTTP, SetTunnelProtocolAction.handlerHttp());
CommandsRegistry.registerCommand(SetTunnelProtocolAction.ID_HTTPS, SetTunnelProtocolAction.handlerHttps());
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ClosePortAction.COMMANDPALETTE_ID,
        title: ClosePortAction.LABEL,
    },
    when: forwardedPortsViewEnabled,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ForwardPortAction.COMMANDPALETTE_ID,
        title: ForwardPortAction.LABEL,
    },
    when: forwardedPortsViewEnabled,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CopyAddressAction.COMMANDPALETTE_ID,
        title: CopyAddressAction.COMMANDPALETTE_LABEL,
    },
    when: forwardedPortsViewEnabled,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: OpenPortInBrowserCommandPaletteAction.ID,
        title: OpenPortInBrowserCommandPaletteAction.LABEL,
    },
    when: forwardedPortsViewEnabled,
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '._open',
    order: 0,
    command: {
        id: OpenPortInBrowserAction.ID,
        title: OpenPortInBrowserAction.LABEL,
    },
    when: ContextKeyExpr.and(isForwardedOrDetectedExpr, isNotMultiSelectionExpr),
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '._open',
    order: 1,
    command: {
        id: OpenPortInPreviewAction.ID,
        title: OpenPortInPreviewAction.LABEL,
    },
    when: ContextKeyExpr.and(isForwardedOrDetectedExpr, isNotMultiSelectionExpr),
});
// The group 0_manage is used by extensions, so try not to change it
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '0_manage',
    order: 1,
    command: {
        id: LabelTunnelAction.ID,
        title: LabelTunnelAction.LABEL,
        icon: labelPortIcon,
    },
    when: ContextKeyExpr.and(isForwardedExpr, isNotMultiSelectionExpr),
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '2_localaddress',
    order: 0,
    command: {
        id: CopyAddressAction.INLINE_ID,
        title: CopyAddressAction.INLINE_LABEL,
    },
    when: ContextKeyExpr.and(isForwardedOrDetectedExpr, isNotMultiSelectionExpr),
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '2_localaddress',
    order: 1,
    command: {
        id: ChangeLocalPortAction.ID,
        title: ChangeLocalPortAction.LABEL,
    },
    when: ContextKeyExpr.and(isForwardedExpr, PortChangableContextKey, isNotMultiSelectionExpr),
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '2_localaddress',
    order: 2,
    submenu: MenuId.TunnelPrivacy,
    title: nls.localize('tunnelContext.privacyMenu', 'Port Visibility'),
    when: ContextKeyExpr.and(isForwardedExpr, TunnelPrivacyEnabledContextKey),
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '2_localaddress',
    order: 3,
    submenu: MenuId.TunnelProtocol,
    title: nls.localize('tunnelContext.protocolMenu', 'Change Port Protocol'),
    when: ContextKeyExpr.and(isForwardedExpr, isNotMultiSelectionExpr, ProtocolChangeableContextKey),
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '3_forward',
    order: 0,
    command: {
        id: ClosePortAction.INLINE_ID,
        title: ClosePortAction.LABEL,
    },
    when: TunnelCloseableContextKey,
});
MenuRegistry.appendMenuItem(MenuId.TunnelContext, {
    group: '3_forward',
    order: 1,
    command: {
        id: ForwardPortAction.INLINE_ID,
        title: ForwardPortAction.LABEL,
    },
});
MenuRegistry.appendMenuItem(MenuId.TunnelProtocol, {
    order: 0,
    command: {
        id: SetTunnelProtocolAction.ID_HTTP,
        title: SetTunnelProtocolAction.LABEL_HTTP,
        toggled: TunnelProtocolContextKey.isEqualTo(TunnelProtocol.Http),
    },
});
MenuRegistry.appendMenuItem(MenuId.TunnelProtocol, {
    order: 1,
    command: {
        id: SetTunnelProtocolAction.ID_HTTPS,
        title: SetTunnelProtocolAction.LABEL_HTTPS,
        toggled: TunnelProtocolContextKey.isEqualTo(TunnelProtocol.Https),
    },
});
MenuRegistry.appendMenuItem(MenuId.TunnelPortInline, {
    group: '0_manage',
    order: 0,
    command: {
        id: ForwardPortAction.INLINE_ID,
        title: ForwardPortAction.TREEITEM_LABEL,
        icon: forwardPortIcon,
    },
    when: TunnelTypeContextKey.isEqualTo(TunnelType.Candidate),
});
MenuRegistry.appendMenuItem(MenuId.TunnelPortInline, {
    group: '0_manage',
    order: 4,
    command: {
        id: LabelTunnelAction.ID,
        title: LabelTunnelAction.LABEL,
        icon: labelPortIcon,
    },
    when: isForwardedExpr,
});
MenuRegistry.appendMenuItem(MenuId.TunnelPortInline, {
    group: '0_manage',
    order: 5,
    command: {
        id: ClosePortAction.INLINE_ID,
        title: ClosePortAction.LABEL,
        icon: stopForwardIcon,
    },
    when: TunnelCloseableContextKey,
});
MenuRegistry.appendMenuItem(MenuId.TunnelLocalAddressInline, {
    order: -1,
    command: {
        id: CopyAddressAction.INLINE_ID,
        title: CopyAddressAction.INLINE_LABEL,
        icon: copyAddressIcon,
    },
    when: isForwardedOrDetectedExpr,
});
MenuRegistry.appendMenuItem(MenuId.TunnelLocalAddressInline, {
    order: 0,
    command: {
        id: OpenPortInBrowserAction.ID,
        title: OpenPortInBrowserAction.LABEL,
        icon: openBrowserIcon,
    },
    when: isForwardedOrDetectedExpr,
});
MenuRegistry.appendMenuItem(MenuId.TunnelLocalAddressInline, {
    order: 1,
    command: {
        id: OpenPortInPreviewAction.ID,
        title: OpenPortInPreviewAction.LABEL,
        icon: openPreviewIcon,
    },
    when: isForwardedOrDetectedExpr,
});
registerColor('ports.iconRunningProcessForeground', STATUS_BAR_REMOTE_ITEM_BACKGROUND, nls.localize('portWithRunningProcess.foreground', 'The color of the icon for a port that has an associated running process.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3R1bm5lbFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBa0Msc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsR0FDbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sa0JBQWtCLEVBRWxCLGFBQWEsRUFDYixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFDTixrQkFBa0IsR0FHbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sZUFBZSxFQUVmLGdCQUFnQixHQUNoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFP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