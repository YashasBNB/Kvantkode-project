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
import { h } from '../../../../base/browser/dom.js';
import { assertNever } from '../../../../base/common/assert.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { groupBy } from '../../../../base/common/collections.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ActiveEditorContext, ResourceContextKey } from '../../../common/contextkeys.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ChatMode } from '../../chat/common/constants.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { McpContextKeys } from '../common/mcpContextKeys.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService, McpConnectionState, } from '../common/mcpTypes.js';
import { McpAddConfigurationCommand } from './mcpCommandsAddConfiguration.js';
import { McpUrlHandler } from './mcpUrlHandler.js';
// acroynms do not get localized
const category = {
    original: 'MCP',
    value: 'MCP',
};
export class ListMcpServerCommand extends Action2 {
    static { this.id = 'workbench.mcp.listServer'; }
    constructor() {
        super({
            id: ListMcpServerCommand.id,
            title: localize2('mcp.list', 'List Servers'),
            icon: Codicon.server,
            category,
            f1: true,
            menu: {
                when: ContextKeyExpr.and(ContextKeyExpr.or(McpContextKeys.hasUnknownTools, McpContextKeys.hasServersWithErrors), ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent)),
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 0,
            },
        });
    }
    async run(accessor) {
        const mcpService = accessor.get(IMcpService);
        const commandService = accessor.get(ICommandService);
        const quickInput = accessor.get(IQuickInputService);
        const store = new DisposableStore();
        const pick = quickInput.createQuickPick({ useSeparators: true });
        pick.placeholder = localize('mcp.selectServer', 'Select an MCP Server');
        store.add(pick);
        store.add(autorun((reader) => {
            const servers = groupBy(mcpService.servers
                .read(reader)
                .slice()
                .sort((a, b) => (a.collection.presentation?.order || 0) - (b.collection.presentation?.order || 0)), (s) => s.collection.id);
            const firstRun = pick.items.length === 0;
            pick.items = [
                {
                    id: '$add',
                    label: localize('mcp.addServer', 'Add Server'),
                    description: localize('mcp.addServer.description', 'Add a new server configuration'),
                    alwaysShow: true,
                    iconClass: ThemeIcon.asClassName(Codicon.add),
                },
                ...Object.values(servers)
                    .filter((s) => s.length)
                    .flatMap((servers) => [
                    {
                        type: 'separator',
                        label: servers[0].collection.label,
                        id: servers[0].collection.id,
                    },
                    ...servers.map((server) => ({
                        id: server.definition.id,
                        label: server.definition.label,
                        description: McpConnectionState.toString(server.connectionState.read(reader)),
                    })),
                ]),
            ];
            if (firstRun && pick.items.length > 3) {
                pick.activeItems = pick.items.slice(2, 3); // select the first server by default
            }
        }));
        const picked = await new Promise((resolve) => {
            store.add(pick.onDidAccept(() => {
                resolve(pick.activeItems[0]);
            }));
            store.add(pick.onDidHide(() => {
                resolve(undefined);
            }));
            pick.show();
        });
        store.dispose();
        if (!picked) {
            // no-op
        }
        else if (picked.id === '$add') {
            commandService.executeCommand(AddConfigurationAction.ID);
        }
        else {
            commandService.executeCommand(McpServerOptionsCommand.id, picked.id);
        }
    }
}
export class McpServerOptionsCommand extends Action2 {
    static { this.id = 'workbench.mcp.serverOptions'; }
    constructor() {
        super({
            id: McpServerOptionsCommand.id,
            title: localize2('mcp.options', 'Server Options'),
            category,
            f1: false,
        });
    }
    async run(accessor, id) {
        const mcpService = accessor.get(IMcpService);
        const quickInputService = accessor.get(IQuickInputService);
        const mcpRegistry = accessor.get(IMcpRegistry);
        const editorService = accessor.get(IEditorService);
        const server = mcpService.servers.get().find((s) => s.definition.id === id);
        if (!server) {
            return;
        }
        const collection = mcpRegistry.collections.get().find((c) => c.id === server.collection.id);
        const serverDefinition = collection?.serverDefinitions
            .get()
            .find((s) => s.id === server.definition.id);
        const items = [];
        const serverState = server.connectionState.get();
        // Only show start when server is stopped or in error state
        if (McpConnectionState.canBeStarted(serverState.state)) {
            items.push({
                label: localize('mcp.start', 'Start Server'),
                action: 'start',
            });
        }
        else {
            items.push({
                label: localize('mcp.stop', 'Stop Server'),
                action: 'stop',
            });
            items.push({
                label: localize('mcp.restart', 'Restart Server'),
                action: 'restart',
            });
        }
        items.push({
            label: localize('mcp.showOutput', 'Show Output'),
            action: 'showOutput',
        });
        const configTarget = serverDefinition?.presentation?.origin || collection?.presentation?.origin;
        if (configTarget) {
            items.push({
                label: localize('mcp.config', 'Show Configuration'),
                action: 'config',
            });
        }
        const pick = await quickInputService.pick(items, {
            title: server.definition.label,
            placeHolder: localize('mcp.selectAction', 'Select Server Action'),
        });
        if (!pick) {
            return;
        }
        switch (pick.action) {
            case 'start':
                await server.start(true);
                server.showOutput();
                break;
            case 'stop':
                await server.stop();
                break;
            case 'restart':
                await server.stop();
                await server.start(true);
                break;
            case 'showOutput':
                server.showOutput();
                break;
            case 'config':
                editorService.openEditor({
                    resource: URI.isUri(configTarget) ? configTarget : configTarget.uri,
                    options: { selection: URI.isUri(configTarget) ? undefined : configTarget.range },
                });
                break;
            default:
                assertNever(pick.action);
        }
    }
}
let MCPServerActionRendering = class MCPServerActionRendering extends Disposable {
    static { this.ID = 'workbench.contrib.mcp.discovery'; }
    constructor(actionViewItemService, mcpService, instaService, commandService) {
        super();
        let DisplayedState;
        (function (DisplayedState) {
            DisplayedState[DisplayedState["None"] = 0] = "None";
            DisplayedState[DisplayedState["NewTools"] = 1] = "NewTools";
            DisplayedState[DisplayedState["Error"] = 2] = "Error";
            DisplayedState[DisplayedState["Refreshing"] = 3] = "Refreshing";
        })(DisplayedState || (DisplayedState = {}));
        const displayedState = derived((reader) => {
            const servers = mcpService.servers.read(reader);
            const serversPerState = [];
            for (const server of servers) {
                let thisState = 0 /* DisplayedState.None */;
                switch (server.toolsState.read(reader)) {
                    case 0 /* McpServerToolsState.Unknown */:
                        if (server.trusted.read(reader) === false) {
                            thisState = 0 /* DisplayedState.None */;
                        }
                        else {
                            thisState =
                                server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */
                                    ? 2 /* DisplayedState.Error */
                                    : 1 /* DisplayedState.NewTools */;
                        }
                        break;
                    case 2 /* McpServerToolsState.RefreshingFromUnknown */:
                        thisState = 3 /* DisplayedState.Refreshing */;
                        break;
                    default:
                        thisState =
                            server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */
                                ? 2 /* DisplayedState.Error */
                                : 0 /* DisplayedState.None */;
                        break;
                }
                serversPerState[thisState] ??= [];
                serversPerState[thisState].push(server);
            }
            const unknownServerStates = mcpService.lazyCollectionState.read(reader);
            if (unknownServerStates === 1 /* LazyCollectionState.LoadingUnknown */) {
                serversPerState[3 /* DisplayedState.Refreshing */] ??= [];
            }
            else if (unknownServerStates === 0 /* LazyCollectionState.HasUnknown */) {
                serversPerState[1 /* DisplayedState.NewTools */] ??= [];
            }
            const maxState = (serversPerState.length - 1);
            return { state: maxState, servers: serversPerState[maxState] || [] };
        });
        this._store.add(actionViewItemService.register(MenuId.ChatInputAttachmentToolbar, ListMcpServerCommand.id, (action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instaService.createInstance(class extends MenuEntryActionViewItem {
                render(container) {
                    super.render(container);
                    container.classList.add('chat-mcp');
                    const action = h('button.chat-mcp-action', [h('span@icon')]);
                    this._register(autorun((r) => {
                        const { state } = displayedState.read(r);
                        const { root, icon } = action;
                        this.updateTooltip();
                        container.classList.toggle('chat-mcp-has-action', state !== 0 /* DisplayedState.None */);
                        if (!root.parentElement) {
                            container.appendChild(root);
                        }
                        root.ariaLabel = this.getLabelForState(displayedState.read(r));
                        root.className = 'chat-mcp-action';
                        icon.className = '';
                        if (state === 1 /* DisplayedState.NewTools */) {
                            root.classList.add('chat-mcp-action-new');
                            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.refresh));
                        }
                        else if (state === 2 /* DisplayedState.Error */) {
                            root.classList.add('chat-mcp-action-error');
                            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.warning));
                        }
                        else if (state === 3 /* DisplayedState.Refreshing */) {
                            root.classList.add('chat-mcp-action-refreshing');
                            icon.classList.add(...ThemeIcon.asClassNameArray(spinningLoading));
                        }
                        else {
                            root.remove();
                        }
                    }));
                }
                async onClick(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const { state, servers } = displayedState.get();
                    if (state === 1 /* DisplayedState.NewTools */) {
                        servers.forEach((server) => server.start());
                        mcpService.activateCollections();
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        servers.at(-1)?.showOutput();
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        const server = servers.at(-1);
                        if (server) {
                            commandService.executeCommand(McpServerOptionsCommand.id, server.definition.id);
                        }
                    }
                    else {
                        commandService.executeCommand(ListMcpServerCommand.id);
                    }
                }
                getTooltip() {
                    return this.getLabelForState() || super.getTooltip();
                }
                getLabelForState({ state, servers } = displayedState.get()) {
                    if (state === 1 /* DisplayedState.NewTools */) {
                        return localize('mcp.newTools', 'New tools available ({0})', servers.length || 1);
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        return localize('mcp.toolError', 'Error loading {0} tool(s)', servers.length || 1);
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        return localize('mcp.toolRefresh', 'Discovering tools...');
                    }
                    else {
                        return null;
                    }
                }
            }, action, { ...options, keybindingNotRenderedWithLabel: true });
        }, Event.fromObservable(displayedState)));
    }
};
MCPServerActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IMcpService),
    __param(2, IInstantiationService),
    __param(3, ICommandService)
], MCPServerActionRendering);
export { MCPServerActionRendering };
export class ResetMcpTrustCommand extends Action2 {
    static { this.ID = 'workbench.mcp.resetTrust'; }
    constructor() {
        super({
            id: ResetMcpTrustCommand.ID,
            title: localize2('mcp.resetTrust', 'Reset Trust'),
            category,
            f1: true,
            precondition: McpContextKeys.toolsCount.greater(0),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpRegistry);
        mcpService.resetTrust();
    }
}
export class ResetMcpCachedTools extends Action2 {
    static { this.ID = 'workbench.mcp.resetCachedTools'; }
    constructor() {
        super({
            id: ResetMcpCachedTools.ID,
            title: localize2('mcp.resetCachedTools', 'Reset Cached Tools'),
            category,
            f1: true,
            precondition: McpContextKeys.toolsCount.greater(0),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpService);
        mcpService.resetCaches();
    }
}
export class AddConfigurationAction extends Action2 {
    static { this.ID = 'workbench.mcp.addConfiguration'; }
    constructor() {
        super({
            id: AddConfigurationAction.ID,
            title: localize2('mcp.addConfiguration', 'Add Server...'),
            metadata: {
                description: localize2('mcp.addConfiguration.description', 'Installs a new Model Context protocol to the mcp.json settings'),
            },
            category,
            f1: true,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.regex(ResourceContextKey.Path.key, /\.vscode[/\\]mcp\.json$/), ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID)),
            },
        });
    }
    async run(accessor, configUri) {
        return accessor
            .get(IInstantiationService)
            .createInstance(McpAddConfigurationCommand, configUri)
            .run();
    }
}
export class RemoveStoredInput extends Action2 {
    static { this.ID = 'workbench.mcp.removeStoredInput'; }
    constructor() {
        super({
            id: RemoveStoredInput.ID,
            title: localize2('mcp.resetCachedTools', 'Reset Cached Tools'),
            category,
            f1: false,
        });
    }
    run(accessor, scope, id) {
        accessor.get(IMcpRegistry).clearSavedInputs(scope, id);
    }
}
export class EditStoredInput extends Action2 {
    static { this.ID = 'workbench.mcp.editStoredInput'; }
    constructor() {
        super({
            id: EditStoredInput.ID,
            title: localize2('mcp.editStoredInput', 'Edit Stored Input'),
            category,
            f1: false,
        });
    }
    run(accessor, inputId, uri, configSection, target) {
        const workspaceFolder = uri && accessor.get(IWorkspaceContextService).getWorkspaceFolder(uri);
        accessor
            .get(IMcpRegistry)
            .editSavedInput(inputId, workspaceFolder || undefined, configSection, target);
    }
}
export class ShowOutput extends Action2 {
    static { this.ID = 'workbench.mcp.showOutput'; }
    constructor() {
        super({
            id: ShowOutput.ID,
            title: localize2('mcp.command.showOutput', 'Show Output'),
            category,
            f1: false,
        });
    }
    run(accessor, serverId) {
        accessor
            .get(IMcpService)
            .servers.get()
            .find((s) => s.definition.id === serverId)
            ?.showOutput();
    }
}
export class RestartServer extends Action2 {
    static { this.ID = 'workbench.mcp.restartServer'; }
    constructor() {
        super({
            id: RestartServer.ID,
            title: localize2('mcp.command.restartServer', 'Restart Server'),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor
            .get(IMcpService)
            .servers.get()
            .find((s) => s.definition.id === serverId);
        s?.showOutput();
        await s?.stop();
        await s?.start();
    }
}
export class StartServer extends Action2 {
    static { this.ID = 'workbench.mcp.startServer'; }
    constructor() {
        super({
            id: StartServer.ID,
            title: localize2('mcp.command.startServer', 'Start Server'),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor
            .get(IMcpService)
            .servers.get()
            .find((s) => s.definition.id === serverId);
        await s?.start();
    }
}
export class StopServer extends Action2 {
    static { this.ID = 'workbench.mcp.stopServer'; }
    constructor() {
        super({
            id: StopServer.ID,
            title: localize2('mcp.command.stopServer', 'Stop Server'),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor
            .get(IMcpService)
            .servers.get()
            .find((s) => s.definition.id === serverId);
        await s?.stop();
    }
}
export class InstallFromActivation extends Action2 {
    static { this.ID = 'workbench.mcp.installFromActivation'; }
    constructor() {
        super({
            id: InstallFromActivation.ID,
            title: localize2('mcp.command.installFromActivation', 'Install...'),
            category,
            f1: false,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.equals('resourceScheme', McpUrlHandler.scheme),
            },
        });
    }
    async run(accessor, uri) {
        const addConfigHelper = accessor
            .get(IInstantiationService)
            .createInstance(McpAddConfigurationCommand, undefined);
        addConfigHelper.pickForUrlHandler(uri);
    }
}
