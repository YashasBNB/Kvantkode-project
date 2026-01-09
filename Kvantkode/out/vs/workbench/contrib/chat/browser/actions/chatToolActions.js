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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0VG9vbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU3RixPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBYyxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFDTiwwQkFBMEIsR0FHMUIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBcUJoRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxrQ0FBa0MsQ0FBQTtBQUVoRixNQUFNLHNCQUF1QixTQUFRLE9BQU87SUFDM0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsOEJBQThCO1lBQ2xDLEtBQUssRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQztZQUN6QyxFQUFFLEVBQUUsS0FBSztZQUNULFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLFVBQVUsRUFBRTtnQkFDWCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsZUFBZSxDQUFDLGFBQWEsRUFDN0IsZUFBZSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FDM0M7Z0JBQ0QsT0FBTyxFQUFFLGlEQUE4QjtnQkFDdkMsb0NBQW9DO2dCQUNwQyxNQUFNLEVBQUUsOENBQW9DLENBQUM7YUFDN0M7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzdDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixDQUFBO1FBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNuRSxDQUFDLElBQUksRUFBK0IsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUMxRixDQUFBO1FBQ0QsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO1lBQy9CLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUVELGlGQUFpRjtRQUNqRixNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUE7SUFDckIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLE9BQU87YUFDN0IsT0FBRSxHQUFHLG1DQUFtQyxDQUFBO0lBRXhEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGlCQUFpQixDQUFDLEVBQUU7WUFDeEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7WUFDM0MsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ25CLEVBQUUsRUFBRSxLQUFLO1lBQ1QsUUFBUSxFQUFFLGFBQWE7WUFDdkIsWUFBWSxFQUFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDaEUsSUFBSSxFQUFFO2dCQUNMLElBQUksRUFBRSxlQUFlLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO2dCQUN4RCxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtnQkFDckMsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGVBQWUsQ0FBQyxXQUFXLEVBQzNCLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FDbEQ7Z0JBQ0QsT0FBTyxFQUFFLG1EQUE2Qix5QkFBZ0I7Z0JBQ3RELE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDekQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM1QyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDN0QsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDeEQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDeEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUUzRSxJQUFJLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNoRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFFYixTQUFTLG1CQUFtQixDQUFDLEdBQVE7Z0JBQ3BDLE9BQU8sR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSyxHQUF5QixDQUFDLE1BQU0sQ0FBQTtZQUMzRSxDQUFDO1lBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLElBQUksbUJBQW1CLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7WUFDeEIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFBO1FBQ3JELEtBQUssTUFBTSxNQUFNLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQy9DLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUN2QyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFXLGFBSVY7UUFKRCxXQUFXLGFBQWE7WUFDdkIsMkRBQVMsQ0FBQTtZQUNULCtDQUFHLENBQUE7WUFDSCxtREFBSyxDQUFBO1FBQ04sQ0FBQyxFQUpVLGFBQWEsS0FBYixhQUFhLFFBSXZCO1FBWUQsTUFBTSxVQUFVLEdBQVk7WUFDM0IsSUFBSSxFQUFFLE1BQU07WUFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQztZQUNqRCxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQzdDLFFBQVEsRUFBRSxLQUFLO1lBQ2YsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO1NBQ25FLENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBWTtZQUMzQixJQUFJLEVBQUUsTUFBTTtZQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLHNCQUFzQixDQUFDO1lBQ3ZELFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDN0MsUUFBUSxFQUFFLEtBQUs7WUFDZixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDO1NBQzVFLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBWTtZQUN4QixJQUFJLEVBQUUsTUFBTTtZQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLG1CQUFtQixDQUFDO1lBQzlDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDN0MsUUFBUSxFQUFFLEtBQUs7WUFDZixHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUU7b0JBQ2xFLFdBQVcsRUFBRSxLQUFLO29CQUNsQixLQUFLLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQztpQkFDL0MsQ0FBQyxDQUFBO2dCQUNGLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQTtZQUNaLENBQUM7U0FDRCxDQUFBO1FBRUQsTUFBTSxhQUFhLEdBQWU7WUFDakMsSUFBSSxFQUFFLE1BQU07WUFDWixRQUFRLEVBQUUsRUFBRTtZQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsYUFBYSxDQUFDO1lBQ3BELE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDNUIsT0FBTyw2QkFBcUI7WUFDNUIsTUFBTSxFQUFFLElBQUk7U0FDWixDQUFBO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFBO1FBRWpELEtBQUssTUFBTSxJQUFJLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QixTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksTUFBa0IsQ0FBQTtZQUV0QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUNoQyxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNoQixTQUFRO2dCQUNULENBQUM7Z0JBQ0QsTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSTtvQkFDcEQsSUFBSSxFQUFFLE1BQU07b0JBQ1osS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUM7b0JBQzNFLE1BQU0sRUFBRSxRQUFRLENBQ2YsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssRUFDMUIsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FDNUQ7b0JBQ0QsT0FBTywyQkFBbUI7b0JBQzFCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsTUFBTSxFQUFFLEtBQUs7b0JBQ2IsUUFBUSxFQUFFLEVBQUU7aUJBQ1osQ0FBQTtnQkFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ2pELENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDN0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUE7Z0JBQzNDLE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUN0RCxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FDekQsQ0FBQTtnQkFDRCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ1YsU0FBUTtnQkFDVCxDQUFDO2dCQUVELE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJO29CQUNuRSxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsR0FBRyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsSUFBSTtvQkFDbEMsT0FBTyxpQ0FBeUI7b0JBQ2hDLE1BQU0sRUFBRSxLQUFLO29CQUNiLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsUUFBUSxFQUFFLEVBQUU7aUJBQ1osQ0FBQTtnQkFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDbkUsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLEdBQUcsYUFBYSxDQUFBO1lBQ3ZCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3pCLENBQUM7WUFFRCxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFekMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ3BCLElBQUk7Z0JBQ0osTUFBTSxFQUFFLE1BQU07Z0JBQ2QsSUFBSSxFQUFFLE1BQU07Z0JBQ1osS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXO2dCQUN2QixXQUFXLEVBQUUsSUFBSSxDQUFDLGVBQWU7Z0JBQ2pDLE1BQU07Z0JBQ04sUUFBUSxFQUFFLElBQUk7YUFDZCxDQUFDLENBQUE7WUFFRixJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDO1FBRUQsU0FBUyxZQUFZLENBQUMsR0FBUTtZQUM3QixPQUFPLE9BQU8sQ0FBRSxHQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFDRCxTQUFTLFVBQVUsQ0FBQyxHQUFRO1lBQzNCLE9BQU8sT0FBTyxDQUFFLEdBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUNELFNBQVMsU0FBUyxDQUFDLEdBQVE7WUFDMUIsT0FBTyxPQUFPLENBQUUsR0FBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRW5DLE1BQU0sS0FBSyxHQUFxQyxFQUFFLENBQUE7UUFFbEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDN0YsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixJQUFJLEVBQUUsV0FBVztnQkFDakIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNO2FBQ3BCLENBQUMsQ0FBQTtZQUVGLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQVMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNGLE1BQU0sQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7UUFDaEMsTUFBTSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUVoQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsTUFBTSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7WUFDNUIsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDbkMsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFRCxJQUFJLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFDekMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBRXZCLE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRTtZQUNwQixXQUFXLEdBQUcsSUFBSSxDQUFBO1lBQ2xCLElBQUksQ0FBQztnQkFDSixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQ3RGLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNsQyxNQUFNLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQTtnQkFFNUIsTUFBTSxjQUFjLEdBQXFCLEVBQUUsQ0FBQTtnQkFDM0MsTUFBTSxZQUFZLEdBQWdCLEVBQUUsQ0FBQTtnQkFDcEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDMUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDMUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDeEIsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7d0JBQ2pDLENBQUM7NkJBQU0sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQzs0QkFDbkQsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQzdCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNyRSxDQUFDO29CQUFTLENBQUM7Z0JBQ1YsV0FBVyxHQUFHLEtBQUssQ0FBQTtZQUNwQixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsT0FBTyxFQUFFLENBQUE7UUFDVCxNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNwQixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFYixLQUFLLENBQUMsR0FBRyxDQUNSLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQzdDLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUM3QyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtnQkFDYixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2IsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1lBRTlFLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO2dCQUVsQixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4QiwrQkFBK0I7b0JBQy9CLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN0QyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQTtvQkFDdkIsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzdCLGlDQUFpQztvQkFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO2dCQUMxQixDQUFDO1lBQ0YsQ0FBQztZQUVELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO2dCQUVuQixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4QixpQ0FBaUM7b0JBQ2pDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN0QyxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtvQkFDeEIsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDckYsb0NBQW9DO29CQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsS0FBSyxDQUFDLEdBQUcsQ0FDUixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUMxQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLGdCQUFnQixDQUFDLFVBQVUsQ0FDMUIsb0JBQW9CLEVBQ3BCO1lBQ0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU07WUFDM0QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQy9DLENBQ0QsQ0FBQTtRQUNELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDOztBQUdGLE1BQU0sVUFBVSx1QkFBdUI7SUFDdEMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDdkMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFDbkMsQ0FBQyJ9