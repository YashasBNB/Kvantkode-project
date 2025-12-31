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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBb0IsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNE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