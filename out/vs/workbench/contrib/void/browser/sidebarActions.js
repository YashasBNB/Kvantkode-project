/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { VOID_VIEW_CONTAINER_ID, VOID_VIEW_ID } from './sidebarPane.js';
import { IMetricsService } from '../common/metricsService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { VOID_TOGGLE_SETTINGS_ACTION_ID } from './voidSettingsPane.js';
import { VOID_CTRL_L_ACTION_ID } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IChatThreadService } from './chatThreadService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
// ---------- Register commands and keybindings ----------
export const roundRangeToLines = (range, options) => {
    if (!range)
        return null;
    // treat as no selection if selection is empty
    if (range.endColumn === range.startColumn && range.endLineNumber === range.startLineNumber) {
        if (options.emptySelectionBehavior === 'null')
            return null;
        else if (options.emptySelectionBehavior === 'line')
            return {
                startLineNumber: range.startLineNumber,
                startColumn: 1,
                endLineNumber: range.startLineNumber,
                endColumn: 1,
            };
    }
    // IRange is 1-indexed
    const endLine = range.endColumn === 1 ? range.endLineNumber - 1 : range.endLineNumber; // e.g. if the user triple clicks, it selects column=0, line=line -> column=0, line=line+1
    const newRange = {
        startLineNumber: range.startLineNumber,
        startColumn: 1,
        endLineNumber: endLine,
        endColumn: Number.MAX_SAFE_INTEGER,
    };
    return newRange;
};
// const getContentInRange = (model: ITextModel, range: IRange | null) => {
// 	if (!range)
// 		return null
// 	const content = model.getValueInRange(range)
// 	const trimmedContent = content
// 		.replace(/^\s*\n/g, '') // trim pure whitespace lines from start
// 		.replace(/\n\s*$/g, '') // trim pure whitespace lines from end
// 	return trimmedContent
// }
const VOID_OPEN_SIDEBAR_ACTION_ID = 'void.sidebar.open';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_OPEN_SIDEBAR_ACTION_ID,
            title: localize2('voidOpenSidebar', 'KvantKode: Open Sidebar'),
            f1: true,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const chatThreadsService = accessor.get(IChatThreadService);
        viewsService.openViewContainer(VOID_VIEW_CONTAINER_ID);
        await chatThreadsService.focusCurrentChat();
    }
});
// cmd L
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_CTRL_L_ACTION_ID,
            f1: true,
            title: localize2('voidCmdL', 'KvantKode: Add Selection to Chat'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        // Get services
        const commandService = accessor.get(ICommandService);
        const viewsService = accessor.get(IViewsService);
        const metricsService = accessor.get(IMetricsService);
        const editorService = accessor.get(ICodeEditorService);
        const chatThreadService = accessor.get(IChatThreadService);
        metricsService.capture('Ctrl+L', {});
        // capture selection and model before opening the chat panel
        const editor = editorService.getActiveCodeEditor();
        const model = editor?.getModel();
        if (!model)
            return;
        const selectionRange = roundRangeToLines(editor?.getSelection(), {
            emptySelectionBehavior: 'null',
        });
        // open panel
        const wasAlreadyOpen = viewsService.isViewContainerVisible(VOID_VIEW_CONTAINER_ID);
        if (!wasAlreadyOpen) {
            await commandService.executeCommand(VOID_OPEN_SIDEBAR_ACTION_ID);
        }
        // Add selection to chat
        // add line selection
        if (selectionRange) {
            editor?.setSelection({
                startLineNumber: selectionRange.startLineNumber,
                endLineNumber: selectionRange.endLineNumber,
                startColumn: 1,
                endColumn: Number.MAX_SAFE_INTEGER,
            });
            chatThreadService.addNewStagingSelection({
                type: 'CodeSelection',
                uri: model.uri,
                language: model.getLanguageId(),
                range: [selectionRange.startLineNumber, selectionRange.endLineNumber],
                state: { wasAddedAsCurrentFile: false },
            });
        }
        // add file
        else {
            chatThreadService.addNewStagingSelection({
                type: 'File',
                uri: model.uri,
                language: model.getLanguageId(),
                state: { wasAddedAsCurrentFile: false },
            });
        }
        await chatThreadService.focusCurrentChat();
    }
});
// New chat keybind + menu button
const VOID_CMD_SHIFT_L_ACTION_ID = 'void.cmdShiftL';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_CMD_SHIFT_L_ACTION_ID,
            title: 'New Chat',
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
            icon: { id: 'add' },
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', VOID_VIEW_ID),
                },
            ],
        });
    }
    async run(accessor) {
        const metricsService = accessor.get(IMetricsService);
        const chatThreadsService = accessor.get(IChatThreadService);
        const editorService = accessor.get(ICodeEditorService);
        metricsService.capture('Chat Navigation', { type: 'Start New Chat' });
        // get current selections and value to transfer
        const oldThreadId = chatThreadsService.state.currentThreadId;
        const oldThread = chatThreadsService.state.allThreads[oldThreadId];
        const oldUI = await oldThread?.state.mountedInfo?.whenMounted;
        const oldSelns = oldThread?.state.stagingSelections;
        const oldVal = oldUI?.textAreaRef?.current?.value;
        // open and focus new thread
        chatThreadsService.openNewThread();
        await chatThreadsService.focusCurrentChat();
        // set new thread values
        const newThreadId = chatThreadsService.state.currentThreadId;
        const newThread = chatThreadsService.state.allThreads[newThreadId];
        const newUI = await newThread?.state.mountedInfo?.whenMounted;
        chatThreadsService.setCurrentThreadState({ stagingSelections: oldSelns });
        if (newUI?.textAreaRef?.current && oldVal)
            newUI.textAreaRef.current.value = oldVal;
        // if has selection, add it
        const editor = editorService.getActiveCodeEditor();
        const model = editor?.getModel();
        if (!model)
            return;
        const selectionRange = roundRangeToLines(editor?.getSelection(), {
            emptySelectionBehavior: 'null',
        });
        if (!selectionRange)
            return;
        editor?.setSelection({
            startLineNumber: selectionRange.startLineNumber,
            endLineNumber: selectionRange.endLineNumber,
            startColumn: 1,
            endColumn: Number.MAX_SAFE_INTEGER,
        });
        chatThreadsService.addNewStagingSelection({
            type: 'CodeSelection',
            uri: model.uri,
            language: model.getLanguageId(),
            range: [selectionRange.startLineNumber, selectionRange.endLineNumber],
            state: { wasAddedAsCurrentFile: false },
        });
    }
});
// History menu button
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'void.historyAction',
            title: 'View Past Chats',
            icon: { id: 'history' },
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', VOID_VIEW_ID),
                },
            ],
        });
    }
    async run(accessor) {
        // do not do anything if there are no messages (without this it clears all of the user's selections if the button is pressed)
        // TODO the history button should be disabled in this case so we can remove this logic
        const thread = accessor.get(IChatThreadService).getCurrentThread();
        if (thread.messages.length === 0) {
            return;
        }
        const metricsService = accessor.get(IMetricsService);
        const commandService = accessor.get(ICommandService);
        metricsService.capture('Chat Navigation', { type: 'History' });
        commandService.executeCommand(VOID_CMD_SHIFT_L_ACTION_ID);
    }
});
// Settings gear
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'void.settingsAction',
            title: `KvantKode's Settings`,
            icon: { id: 'settings-gear' },
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', VOID_VIEW_ID),
                },
            ],
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand(VOID_TOGGLE_SETTINGS_ACTION_ID);
    }
});
// export class TabSwitchListener extends Disposable {
// 	constructor(
// 		onSwitchTab: () => void,
// 		@ICodeEditorService private readonly _editorService: ICodeEditorService,
// 	) {
// 		super()
// 		// when editor switches tabs (models)
// 		const addTabSwitchListeners = (editor: ICodeEditor) => {
// 			this._register(editor.onDidChangeModel(e => {
// 				if (e.newModelUrl?.scheme !== 'file') return
// 				onSwitchTab()
// 			}))
// 		}
// 		const initializeEditor = (editor: ICodeEditor) => {
// 			addTabSwitchListeners(editor)
// 		}
// 		// initialize current editors + any new editors
// 		for (let editor of this._editorService.listCodeEditors()) initializeEditor(editor)
// 		this._register(this._editorService.onCodeEditorAdd(editor => { initializeEditor(editor) }))
// 	}
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9zaWRlYmFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUkxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUlqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFN0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSwwREFBMEQ7QUFFMUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsQ0FDaEMsS0FBZ0MsRUFDaEMsT0FBb0QsRUFDbkQsRUFBRTtJQUNILElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxJQUFJLENBQUE7SUFFdkIsOENBQThDO0lBQzlDLElBQUksS0FBSyxDQUFDLFNBQVMs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