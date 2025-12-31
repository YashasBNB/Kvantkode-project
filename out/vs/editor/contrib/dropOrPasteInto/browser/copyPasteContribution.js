/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import * as nls from '../../../../nls.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { CopyPasteController, changePasteTypeCommandId, pasteWidgetVisibleCtx, } from './copyPasteController.js';
import { DefaultPasteProvidersFeature, DefaultTextPasteOrDropEditProvider, } from './defaultProviders.js';
export const pasteAsCommandId = 'editor.action.pasteAs';
registerEditorContribution(CopyPasteController.ID, CopyPasteController, 0 /* EditorContributionInstantiation.Eager */); // eager because it listens to events on the container dom node of the editor
registerEditorFeature(DefaultPasteProvidersFeature);
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: changePasteTypeCommandId,
            precondition: pasteWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        return CopyPasteController.get(editor)?.changePasteType();
    }
})());
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.hidePasteWidget',
            precondition: pasteWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        CopyPasteController.get(editor)?.clearWidgets();
    }
})());
registerEditorAction(class PasteAsAction extends EditorAction {
    static { this.argsSchema = {
        oneOf: [
            {
                type: 'object',
                required: ['kind'],
                properties: {
                    kind: {
                        type: 'string',
                        description: nls.localize('pasteAs.kind', 'The kind of the paste edit to try pasting with.\nIf there are multiple edits for this kind, the editor will show a picker. If there are no edits of this kind, the editor will show an error message.'),
                    },
                },
            },
            {
                type: 'object',
                required: ['preferences'],
                properties: {
                    preferences: {
                        type: 'array',
                        description: nls.localize('pasteAs.preferences', 'List of preferred paste edit kind to try applying.\nThe first edit matching the preferences will be applied.'),
                        items: { type: 'string' },
                    },
                },
            },
        ],
    }; }
    constructor() {
        super({
            id: pasteAsCommandId,
            label: nls.localize2('pasteAs', 'Paste As...'),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: 'Paste as',
                args: [
                    {
                        name: 'args',
                        schema: PasteAsAction.argsSchema,
                    },
                ],
            },
        });
    }
    run(_accessor, editor, args) {
        let preference;
        if (args) {
            if ('kind' in args) {
                preference = { only: new HierarchicalKind(args.kind) };
            }
            else if ('preferences' in args) {
                preference = { preferences: args.preferences.map((kind) => new HierarchicalKind(kind)) };
            }
        }
        return CopyPasteController.get(editor)?.pasteAs(preference);
    }
});
registerEditorAction(class extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.pasteAsText',
            label: nls.localize2('pasteAsText', 'Paste as Text'),
            precondition: EditorContextKeys.writable,
        });
    }
    run(_accessor, editor) {
        return CopyPasteController.get(editor)?.pasteAs({
            providerId: DefaultTextPasteOrDropEditProvider.id,
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weVBhc3RlQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZHJvcE9yUGFzdGVJbnRvL2Jyb3dzZXIvY29weVBhc3RlQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRzlFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFHekMsT0FBTyxFQUNOLFlBQVksRUFDWixhQUFhLEVBR2Isb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sbUJBQW1CLEVBRW5CLHdCQUF3QixFQUN4QixxQkFBcUIsR0FDckIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLGtDQUFrQyxHQUNsQyxNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLHVCQUF1QixDQUFBO0FBRXZELDBCQUEwQixDQUN6QixtQkFBbUIsQ0FBQyxFQUFFLEVBQ3RCLG1CQUFtQixnREFFbkIsQ0FBQSxDQUFDLDZFQUE2RTtBQUMvRSxxQkFBcUIsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO0FBRW5ELHFCQUFxQixDQUNwQixJQUFJLENBQUMsS0FBTSxTQUFRLGFBQWE7SUFDL0I7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsd0JBQXdCO1lBQzVCLFlBQVksRUFBRSxxQkFBcUI7WUFDbkMsTUFBTSxFQUFF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