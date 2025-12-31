/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { diffSets } from '../../../../../base/common/collections.js';
import { Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { AddConfigurationAction } from '../../../mcp/browser/mcpCommands.js';
import { IMcpService, McpConnectionState } from '../../../mcp/common/mcpTypes.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { ChatMode } from '../../common/constants.js';
import { ILanguageModelToolsService, } from '../../common/languageModelToolsService.js';
import { IChatWidgetService } from '../chat.js';
import { CHAT_CATEGORY } from './chatActions.js';
export const AcceptToolConfirmationActionId = 'workbench.action.chat.acceptTool';
class AcceptToolConfirmation extends Action2 {
    constructor() {
        super({
            id: AcceptToolConfirmationActionId,
            title: localize2('chat.accept', 'Accept'),
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasToolConfirmation),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                // Override chatEditor.action.accept
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            },
        });
    }
    run(accessor, ...args) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        const lastItem = widget?.viewModel?.getItems().at(-1);
        if (!isResponseVM(lastItem)) {
            return;
        }
        const unconfirmedToolInvocation = lastItem.model.response.value.find((item) => item.kind === 'toolInvocation' && !item.isConfirmed);
        if (unconfirmedToolInvocation) {
            unconfirmedToolInvocation.confirmed.complete(true);
        }
        // Return focus to the chat input, in case it was in the tool confirmation editor
        widget?.focusInput();
    }
}
export class AttachToolsAction extends Action2 {
    static { this.id = 'workbench.action.chat.attachTools'; }
    constructor() {
        super({
            id: AttachToolsAction.id,
            title: localize('label', 'Select Tools...'),
            icon: Codicon.tools,
            f1: false,
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent),
            menu: {
                when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent),
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 1,
            },
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 90 /* KeyCode.Slash */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor, ...args) {
        const quickPickService = accessor.get(IQuickInputService);
        const mcpService = accessor.get(IMcpService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        const extensionService = accessor.get(IExtensionService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const telemetryService = accessor.get(ITelemetryService);
        const commandService = accessor.get(ICommandService);
        const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            function isChatActionContext(obj) {
                return obj && typeof obj === 'object' && obj.widget;
            }
            const context = args[0];
            if (isChatActionContext(context)) {
                widget = context.widget;
            }
        }
        if (!widget) {
            return;
        }
        const mcpServerByTool = new Map();
        for (const server of mcpService.servers.get()) {
            for (const tool of server.tools.get()) {
                mcpServerByTool.set(tool.id, server);
            }
        }
        let BucketOrdinal;
        (function (BucketOrdinal) {
            BucketOrdinal[BucketOrdinal["Extension"] = 0] = "Extension";
            BucketOrdinal[BucketOrdinal["Mcp"] = 1] = "Mcp";
            BucketOrdinal[BucketOrdinal["Other"] = 2] = "Other";
        })(BucketOrdinal || (BucketOrdinal = {}));
        const addMcpPick = {
            type: 'item',
            label: localize('addServer', 'Add MCP Server...'),
            iconClass: ThemeIcon.asClassName(Codicon.add),
            pickable: false,
            run: () => commandService.executeCommand(AddConfigurationAction.ID),
        };
        const addExpPick = {
            type: 'item',
            label: localize('addExtension', 'Install Extension...'),
            iconClass: ThemeIcon.asClassName(Codicon.add),
            pickable: false,
            run: () => extensionWorkbenchService.openSearch('@tag:language-model-tools'),
        };
        const addPick = {
            type: 'item',
            label: localize('addAny', 'Add More Tools...'),
            iconClass: ThemeIcon.asClassName(Codicon.add),
            pickable: false,
            run: async () => {
                const pick = await quickPickService.pick([addMcpPick, addExpPick], {
                    canPickMany: false,
                    title: localize('noTools', 'Add tools to chat'),
                });
                pick?.run();
            },
        };
        const defaultBucket = {
            type: 'item',
            children: [],
            label: localize('defaultBucketLabel', 'Other Tools'),
            source: { type: 'internal' },
            ordinal: 2 /* BucketOrdinal.Other */,
            picked: true,
        };
        const nowSelectedTools = new Set(widget.input.selectedToolsModel.tools.get());
        const toolBuckets = new Map();
        for (const tool of toolsService.getTools()) {
            if (!tool.supportsToolPicker) {
                continue;
            }
            let bucket;
            if (tool.source.type === 'mcp') {
                const mcpServer = mcpServerByTool.get(tool.id);
                if (!mcpServer) {
                    continue;
                }
                bucket = toolBuckets.get(mcpServer.definition.id) ?? {
                    type: 'item',
                    label: localize('mcplabel', 'MCP Server: {0}', mcpServer?.definition.label),
                    status: localize('mcpstatus', 'From {0} ({1})', mcpServer.collection.label, McpConnectionState.toString(mcpServer.connectionState.get())),
                    ordinal: 1 /* BucketOrdinal.Mcp */,
                    source: tool.source,
                    picked: false,
                    children: [],
                };
                toolBuckets.set(mcpServer.definition.id, bucket);
            }
            else if (tool.source.type === 'extension') {
                const extensionId = tool.source.extensionId;
                const ext = extensionService.extensions.find((value) => ExtensionIdentifier.equals(value.identifier, extensionId));
                if (!ext) {
                    continue;
                }
                bucket = toolBuckets.get(ExtensionIdentifier.toKey(extensionId)) ?? {
                    type: 'item',
                    label: ext.displayName ?? ext.name,
                    ordinal: 0 /* BucketOrdinal.Extension */,
                    picked: false,
                    source: tool.source,
                    children: [],
                };
                toolBuckets.set(ExtensionIdentifier.toKey(ext.identifier), bucket);
            }
            else if (tool.source.type === 'internal') {
                bucket = defaultBucket;
            }
            else {
                assertNever(tool.source);
            }
            const picked = nowSelectedTools.has(tool);
            bucket.children.push({
                tool,
                parent: bucket,
                type: 'item',
                label: tool.displayName,
                description: tool.userDescription,
                picked,
                indented: true,
            });
            if (picked) {
                bucket.picked = true;
            }
        }
        function isBucketPick(obj) {
            return Boolean(obj.children);
        }
        function isToolPick(obj) {
            return Boolean(obj.tool);
        }
        function isAddPick(obj) {
            return Boolean(obj.run);
        }
        const store = new DisposableStore();
        const picks = [];
        for (const bucket of Array.from(toolBuckets.values()).sort((a, b) => a.ordinal - b.ordinal)) {
            picks.push({
                type: 'separator',
                label: bucket.status,
            });
            picks.push(bucket);
            picks.push(...bucket.children);
        }
        const picker = store.add(quickPickService.createQuickPick({ useSeparators: true }));
        picker.placeholder = localize('placeholder', 'Select tools that are available to chat');
        picker.canSelectMany = true;
        picker.keepScrollPosition = true;
        picker.matchOnDescription = true;
        if (picks.length === 0) {
            picker.placeholder = localize('noTools', 'Add tools to chat');
            picker.canSelectMany = false;
            picks.push(addMcpPick, addExpPick);
        }
        else {
            picks.push({ type: 'separator' }, addPick);
        }
        let lastSelectedItems = new Set();
        let ignoreEvent = false;
        const _update = () => {
            ignoreEvent = true;
            try {
                const items = picks.filter((p) => p.type === 'item' && Boolean(p.picked));
                lastSelectedItems = new Set(items);
                picker.selectedItems = items;
                const disableBuckets = [];
                const disableTools = [];
                for (const item of picks) {
                    if (item.type === 'item' && !item.picked) {
                        if (isBucketPick(item)) {
                            disableBuckets.push(item.source);
                        }
                        else if (isToolPick(item) && item.parent.picked) {
                            disableTools.push(item.tool);
                        }
                    }
                }
                widget.input.selectedToolsModel.update(disableBuckets, disableTools);
            }
            finally {
                ignoreEvent = false;
            }
        };
        _update();
        picker.items = picks;
        picker.show();
        store.add(picker.onDidChangeSelection((selectedPicks) => {
            if (ignoreEvent) {
                return;
            }
            const addPick = selectedPicks.find(isAddPick);
            if (addPick) {
                addPick.run();
                picker.hide();
                return;
            }
            const { added, removed } = diffSets(lastSelectedItems, new Set(selectedPicks));
            for (const item of added) {
                item.picked = true;
                if (isBucketPick(item)) {
                    // add server -> add back tools
                    for (const toolPick of item.children) {
                        toolPick.picked = true;
                    }
                }
                else if (isToolPick(item)) {
                    // add server when tool is picked
                    item.parent.picked = true;
                }
            }
            for (const item of removed) {
                item.picked = false;
                if (isBucketPick(item)) {
                    // removed server -> remove tools
                    for (const toolPick of item.children) {
                        toolPick.picked = false;
                    }
                }
                else if (isToolPick(item) && item.parent.children.every((child) => !child.picked)) {
                    // remove LAST tool -> remove server
                    item.parent.picked = false;
                }
            }
            _update();
        }));
        store.add(picker.onDidAccept(() => {
            picker.activeItems.find(isAddPick)?.run();
        }));
        await Promise.race([Event.toPromise(Event.any(picker.onDidAccept, picker.onDidHide))]);
        telemetryService.publicLog2('chat/selectedTools', {
            enabled: widget.input.selectedToolsModel.tools.get().length,
            total: Iterable.length(toolsService.getTools()),
        });
        store.dispose();
    }
}
export function registerChatToolActions() {
    registerAction2(AcceptToolConfirmation);
    registerAction2(AttachToolsAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdFRvb2xBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFN0YsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FB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