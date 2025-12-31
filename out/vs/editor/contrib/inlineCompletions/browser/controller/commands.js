/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asyncTransaction, transaction } from '../../../../../base/common/observable.js';
import { splitLines } from '../../../../../base/common/strings.js';
import * as nls from '../../../../../nls.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService, Severity, } from '../../../../../platform/notification/common/notification.js';
import { EditorAction, EditorCommand, } from '../../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { Context as SuggestContext } from '../../../suggest/browser/suggest.js';
import { hideInlineCompletionId, inlineSuggestCommitId, jumpToNextInlineEditId, showNextInlineSuggestionActionId, showPreviousInlineSuggestionActionId, toggleShowCollapsedId, } from './commandIds.js';
import { InlineCompletionContextKeys } from './inlineCompletionContextKeys.js';
import { InlineCompletionsController } from './inlineCompletionsController.js';
export class ShowNextInlineSuggestionAction extends EditorAction {
    static { this.ID = showNextInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowNextInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showNext', 'Show Next Inline Suggestion'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.next();
    }
}
export class ShowPreviousInlineSuggestionAction extends EditorAction {
    static { this.ID = showPreviousInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowPreviousInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showPrevious', 'Show Previous Inline Suggestion'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.previous();
    }
}
export class TriggerInlineSuggestionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.trigger',
            label: nls.localize2('action.inlineSuggest.trigger', 'Trigger Inline Suggestion'),
            precondition: EditorContextKeys.writable,
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await asyncTransaction(async (tx) => {
            /** @description triggerExplicitly from command */
            await controller?.model.get()?.triggerExplicitly(tx);
            controller?.playAccessibilitySignal(tx);
        });
    }
}
export class ExplicitTriggerInlineEditAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.triggerInlineEditExplicit',
            label: nls.localize2('action.inlineSuggest.trigger.explicitInlineEdit', 'Trigger Next Edit Suggestion'),
            precondition: EditorContextKeys.writable,
        });
    }
    async run(accessor, editor) {
        const notificationService = accessor.get(INotificationService);
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.triggerExplicitly(undefined, true);
        if (!controller?.model.get()?.inlineEditAvailable.get()) {
            notificationService.notify({
                severity: Severity.Info,
                message: nls.localize('noInlineEditAvailable', 'No inline edit is available.'),
            });
        }
    }
}
export class TriggerInlineEditAction extends EditorCommand {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.triggerInlineEdit',
            precondition: EditorContextKeys.writable,
        });
    }
    async runEditorCommand(accessor, editor, args) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.trigger(undefined, { onlyFetchInlineEdits: true });
    }
}
export class AcceptNextWordOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextWord',
            label: nls.localize2('action.inlineSuggest.acceptNextWord', 'Accept Next Word Of Inline Suggestion'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            },
            menuOpts: [
                {
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptWord', 'Accept Word'),
                    group: 'primary',
                    order: 2,
                },
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextWord(controller.editor);
    }
}
export class AcceptNextLineOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextLine',
            label: nls.localize2('action.inlineSuggest.acceptNextLine', 'Accept Next Line Of Inline Suggestion'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
            },
            menuOpts: [
                {
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptLine', 'Accept Line'),
                    group: 'secondary',
                    order: 2,
                },
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextLine(controller.editor);
    }
}
export class AcceptInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: inlineSuggestCommitId,
            label: nls.localize2('action.inlineSuggest.accept', 'Accept Inline Suggestion'),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            menuOpts: [
                {
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('accept', 'Accept'),
                    group: 'primary',
                    order: 2,
                },
                {
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('accept', 'Accept'),
                    group: 'primary',
                    order: 2,
                },
            ],
            kbOpts: [
                {
                    primary: 2 /* KeyCode.Tab */,
                    weight: 200,
                    kbExpr: ContextKeyExpr.or(ContextKeyExpr.and(InlineCompletionContextKeys.inlineSuggestionVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize), ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldAcceptInlineEdit)),
                },
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        if (controller) {
            controller.model.get()?.accept(controller.editor);
            controller.editor.focus();
        }
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: inlineSuggestCommitId,
    weight: 202, // greater than jump
    primary: 2 /* KeyCode.Tab */,
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor),
});
export class JumpToNextInlineEdit extends EditorAction {
    constructor() {
        super({
            id: jumpToNextInlineEditId,
            label: nls.localize2('action.inlineSuggest.jump', 'Jump to next inline edit'),
            precondition: InlineCompletionContextKeys.inlineEditVisible,
            menuOpts: [
                {
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('jump', 'Jump'),
                    group: 'primary',
                    order: 1,
                    when: InlineCompletionContextKeys.cursorAtInlineEdit.toNegated(),
                },
            ],
            kbOpts: {
                primary: 2 /* KeyCode.Tab */,
                weight: 201,
                kbExpr: ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldJumpToInlineEdit),
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        if (controller) {
            controller.jump();
        }
    }
}
export class AcceptNextInlineEditPart extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextInlineEditPart',
            label: nls.localize2('action.inlineSuggest.acceptNextInlineEditPart', 'Accept Next Inline Edit Part'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineEditVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineEditVisible),
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextInlineEditPart(controller.editor);
    }
}
export class HideInlineCompletion extends EditorAction {
    static { this.ID = hideInlineCompletionId; }
    constructor() {
        super({
            id: HideInlineCompletion.ID,
            label: nls.localize2('action.inlineSuggest.hide', 'Hide Inline Suggestion'),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 90, // same as hiding the suggest widget
                primary: 9 /* KeyCode.Escape */,
            },
            menuOpts: [
                {
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('reject', 'Reject'),
                    group: 'primary',
                    order: 3,
                },
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        transaction((tx) => {
            controller?.model.get()?.stop('explicitCancel', tx);
        });
        controller?.editor.focus();
    }
}
export class ToggleInlineCompletionShowCollapsed extends EditorAction {
    static { this.ID = toggleShowCollapsedId; }
    constructor() {
        super({
            id: ToggleInlineCompletionShowCollapsed.ID,
            label: nls.localize2('action.inlineSuggest.toggleShowCollapsed', 'Toggle Inline Suggestions Show Collapsed'),
            precondition: ContextKeyExpr.true(),
        });
    }
    async run(accessor, editor) {
        const configurationService = accessor.get(IConfigurationService);
        const showCollapsed = configurationService.getValue('editor.inlineSuggest.edits.showCollapsed');
        configurationService.updateValue('editor.inlineSuggest.edits.showCollapsed', !showCollapsed);
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: HideInlineCompletion.ID,
    weight: -1, // very weak
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor),
});
export class ToggleAlwaysShowInlineSuggestionToolbar extends Action2 {
    static { this.ID = 'editor.action.inlineSuggest.toggleAlwaysShowToolbar'; }
    constructor() {
        super({
            id: ToggleAlwaysShowInlineSuggestionToolbar.ID,
            title: nls.localize('action.inlineSuggest.alwaysShowToolbar', 'Always Show Toolbar'),
            f1: false,
            precondition: undefined,
            menu: [
                {
                    id: MenuId.InlineSuggestionToolbar,
                    group: 'secondary',
                    order: 10,
                },
            ],
            toggled: ContextKeyExpr.equals('config.editor.inlineSuggest.showToolbar', 'always'),
        });
    }
    async run(accessor) {
        const configService = accessor.get(IConfigurationService);
        const currentValue = configService.getValue('editor.inlineSuggest.showToolbar');
        const newValue = currentValue === 'always' ? 'onHover' : 'always';
        configService.updateValue('editor.inlineSuggest.showToolbar', newValue);
    }
}
export class DevExtractReproSample extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.dev.extractRepro',
            label: nls.localize('action.inlineSuggest.dev.extractRepro', 'Developer: Extract Inline Suggest State'),
            alias: 'Developer: Inline Suggest Extract Repro',
            precondition: InlineCompletionContextKeys.inlineEditVisible,
        });
    }
    async run(accessor, editor) {
        const clipboardService = accessor.get(IClipboardService);
        const controller = InlineCompletionsController.get(editor);
        const m = controller?.model.get();
        if (!m) {
            return;
        }
        const repro = m.extractReproSample();
        const inlineCompletionLines = splitLines(JSON.stringify({ inlineCompletion: repro.inlineCompletion }, null, 4));
        const json = inlineCompletionLines.map((l) => '// ' + l).join('\n');
        const reproStr = `${repro.documentValue}\n\n// <json>\n${json}\n// </json>\n`;
        await clipboardService.writeText(reproStr);
        return { reproCase: reproStr };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL2NvbnRyb2xsZXIvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDZEQUE2RCxDQUFBO0FBRXBFLE9BQU8sRUFDTixZQUFZLEVBQ1osYUFBYSxHQUViLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sSUFBSSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHFCQUFxQixFQUNyQixzQkFBc0IsRUFDdEIsZ0NBQWdDLEVBQ2hDLG9DQUFvQyxFQUNwQyxxQkFBcUIsR0FDckIsTUFBTSxpQkFBaUIsQ0FBQTtB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