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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFvQixRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDdEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWxGLE9BQU8sRUFB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