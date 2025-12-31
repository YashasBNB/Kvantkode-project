/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { EditorAction, EditorCommand } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { autoFixCommandId, codeActionCommandId, fixAllCommandId, organizeImportsCommandId, quickFixCommandId, refactorCommandId, sourceActionCommandId, } from './codeAction.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { CodeActionCommandArgs, CodeActionKind, CodeActionTriggerSource, } from '../common/types.js';
import { CodeActionController } from './codeActionController.js';
import { SUPPORTED_CODE_ACTIONS } from './codeActionModel.js';
function contextKeyForSupportedActions(kind) {
    return ContextKeyExpr.regex(SUPPORTED_CODE_ACTIONS.keys()[0], new RegExp('(\\s|^)' + escapeRegExpCharacters(kind.value) + '\\b'));
}
const argsSchema = {
    type: 'object',
    defaultSnippets: [{ body: { kind: '' } }],
    properties: {
        kind: {
            type: 'string',
            description: nls.localize('args.schema.kind', 'Kind of the code action to run.'),
        },
        apply: {
            type: 'string',
            description: nls.localize('args.schema.apply', 'Controls when the returned actions are applied.'),
            default: "ifSingle" /* CodeActionAutoApply.IfSingle */,
            enum: ["first" /* CodeActionAutoApply.First */, "ifSingle" /* CodeActionAutoApply.IfSingle */, "never" /* CodeActionAutoApply.Never */],
            enumDescriptions: [
                nls.localize('args.schema.apply.first', 'Always apply the first returned code action.'),
                nls.localize('args.schema.apply.ifSingle', 'Apply the first returned code action if it is the only one.'),
                nls.localize('args.schema.apply.never', 'Do not apply the returned code actions.'),
            ],
        },
        preferred: {
            type: 'boolean',
            default: false,
            description: nls.localize('args.schema.preferred', 'Controls if only preferred code actions should be returned.'),
        },
    },
};
function triggerCodeActionsForEditorSelection(editor, notAvailableMessage, filter, autoApply, triggerAction = CodeActionTriggerSource.Default) {
    if (editor.hasModel()) {
        const controller = CodeActionController.get(editor);
        controller?.manualTriggerAtCurrentPosition(notAvailableMessage, triggerAction, filter, autoApply);
    }
}
export class QuickFixAction extends EditorAction {
    constructor() {
        super({
            id: quickFixCommandId,
            label: nls.localize2('quickfix.trigger.label', 'Quick Fix...'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('editor.action.quickFix.noneMessage', 'No code actions available'), undefined, undefined, CodeActionTriggerSource.QuickFix);
    }
}
export class CodeActionCommand extends EditorCommand {
    constructor() {
        super({
            id: codeActionCommandId,
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            metadata: {
                description: 'Trigger a code action',
                args: [{ name: 'args', schema: argsSchema }],
            },
        });
    }
    runEditorCommand(_accessor, editor, userArgs) {
        const args = CodeActionCommandArgs.fromUser(userArgs, {
            kind: HierarchicalKind.Empty,
            apply: "ifSingle" /* CodeActionAutoApply.IfSingle */,
        });
        return triggerCodeActionsForEditorSelection(editor, typeof userArgs?.kind === 'string'
            ? args.preferred
                ? nls.localize('editor.action.codeAction.noneMessage.preferred.kind', "No preferred code actions for '{0}' available", userArgs.kind)
                : nls.localize('editor.action.codeAction.noneMessage.kind', "No code actions for '{0}' available", userArgs.kind)
            : args.preferred
                ? nls.localize('editor.action.codeAction.noneMessage.preferred', 'No preferred code actions available')
                : nls.localize('editor.action.codeAction.noneMessage', 'No code actions available'), {
            include: args.kind,
            includeSourceActions: true,
            onlyIncludePreferredActions: args.preferred,
        }, args.apply);
    }
}
export class RefactorAction extends EditorAction {
    constructor() {
        super({
            id: refactorCommandId,
            label: nls.localize2('refactor.label', 'Refactor...'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 2,
                when: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.Refactor)),
            },
            metadata: {
                description: 'Refactor...',
                args: [{ name: 'args', schema: argsSchema }],
            },
        });
    }
    run(_accessor, editor, userArgs) {
        const args = CodeActionCommandArgs.fromUser(userArgs, {
            kind: CodeActionKind.Refactor,
            apply: "never" /* CodeActionAutoApply.Never */,
        });
        return triggerCodeActionsForEditorSelection(editor, typeof userArgs?.kind === 'string'
            ? args.preferred
                ? nls.localize('editor.action.refactor.noneMessage.preferred.kind', "No preferred refactorings for '{0}' available", userArgs.kind)
                : nls.localize('editor.action.refactor.noneMessage.kind', "No refactorings for '{0}' available", userArgs.kind)
            : args.preferred
                ? nls.localize('editor.action.refactor.noneMessage.preferred', 'No preferred refactorings available')
                : nls.localize('editor.action.refactor.noneMessage', 'No refactorings available'), {
            include: CodeActionKind.Refactor.contains(args.kind) ? args.kind : HierarchicalKind.None,
            onlyIncludePreferredActions: args.preferred,
        }, args.apply, CodeActionTriggerSource.Refactor);
    }
}
export class SourceAction extends EditorAction {
    constructor() {
        super({
            id: sourceActionCommandId,
            label: nls.localize2('source.label', 'Source Action...'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            contextMenuOpts: {
                group: '1_modification',
                order: 2.1,
                when: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.Source)),
            },
            metadata: {
                description: 'Source Action...',
                args: [{ name: 'args', schema: argsSchema }],
            },
        });
    }
    run(_accessor, editor, userArgs) {
        const args = CodeActionCommandArgs.fromUser(userArgs, {
            kind: CodeActionKind.Source,
            apply: "never" /* CodeActionAutoApply.Never */,
        });
        return triggerCodeActionsForEditorSelection(editor, typeof userArgs?.kind === 'string'
            ? args.preferred
                ? nls.localize('editor.action.source.noneMessage.preferred.kind', "No preferred source actions for '{0}' available", userArgs.kind)
                : nls.localize('editor.action.source.noneMessage.kind', "No source actions for '{0}' available", userArgs.kind)
            : args.preferred
                ? nls.localize('editor.action.source.noneMessage.preferred', 'No preferred source actions available')
                : nls.localize('editor.action.source.noneMessage', 'No source actions available'), {
            include: CodeActionKind.Source.contains(args.kind) ? args.kind : HierarchicalKind.None,
            includeSourceActions: true,
            onlyIncludePreferredActions: args.preferred,
        }, args.apply, CodeActionTriggerSource.SourceAction);
    }
}
export class OrganizeImportsAction extends EditorAction {
    constructor() {
        super({
            id: organizeImportsCommandId,
            label: nls.localize2('organizeImports.label', 'Organize Imports'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.SourceOrganizeImports)),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 45 /* KeyCode.KeyO */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('organizeImports.description', "Organize imports in the current file. Also called 'Optimize Imports' by some tools"),
            },
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('editor.action.organize.noneMessage', 'No organize imports action available'), { include: CodeActionKind.SourceOrganizeImports, includeSourceActions: true }, "ifSingle" /* CodeActionAutoApply.IfSingle */, CodeActionTriggerSource.OrganizeImports);
    }
}
export class FixAllAction extends EditorAction {
    constructor() {
        super({
            id: fixAllCommandId,
            label: nls.localize2('fixAll.label', 'Fix All'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.SourceFixAll)),
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('fixAll.noneMessage', 'No fix all action available'), { include: CodeActionKind.SourceFixAll, includeSourceActions: true }, "ifSingle" /* CodeActionAutoApply.IfSingle */, CodeActionTriggerSource.FixAll);
    }
}
export class AutoFixAction extends EditorAction {
    constructor() {
        super({
            id: autoFixCommandId,
            label: nls.localize2('autoFix.label', 'Auto Fix...'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.QuickFix)),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 89 /* KeyCode.Period */,
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('editor.action.autoFix.noneMessage', 'No auto fixes available'), {
            include: CodeActionKind.QuickFix,
            onlyIncludePreferredActions: true,
        }, "ifSingle" /* CodeActionAutoApply.IfSingle */, CodeActionTriggerSource.AutoFix);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2NvZGVBY3Rpb25Db21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUc5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixlQUFlLEVBQ2Ysd0JBQXdCLEVBQ3hCLGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIscUJBQXFCLEdBQ3JCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsT0FBTyxFQUVOLHFCQUFxQixFQUVyQixjQUFjLEVBQ2QsdUJBQXVCLEdBQ3ZCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFN0QsU0FBUyw2QkFBNkIsQ0FBQyxJQUFzQjtJQUM1RCxPQUFPLGNBQWMsQ0FBQyxLQUFLLENBQzFCLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUNoQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEdBQUcsc0JBQXNC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