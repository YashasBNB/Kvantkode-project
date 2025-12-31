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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvc2lkZWJhckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFJMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFJakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsMERBQTBEO0FBRTFELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLENBQ2hDLEtBQWdDLEVBQ2hDLE9BQW9ELEVBQ25ELEVBQUU7SUFDSCxJQUFJLENBQUMsS0FBSztRQUFFLE9BQU8sSUFBSSxDQUFBO0lBRXZCLDhDQUE4QztJQUM5QyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFdBQVcsSUFB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