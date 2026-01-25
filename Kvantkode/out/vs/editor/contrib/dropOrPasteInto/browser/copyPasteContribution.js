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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weVBhc3RlQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9jb3B5UGFzdGVDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHOUUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBQ04sWUFBWSxFQUNaLGFBQWEsRUFHYixvQkFBb0IsRUFDcEIscUJBQXFCLEVBQ3JCLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFDTixtQkFBbUIsRUFFbkIsd0JBQXdCLEVBQ3hCLHFCQUFxQixHQUNyQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsa0NBQWtDLEdBQ2xDLE1BQU0sdUJBQXVCLENBQUE7QUFFOUIsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsdUJBQXVCLENBQUE7QUFFdkQsMEJBQTBCLENBQ3pCLG1CQUFtQixDQUFDLEVBQUUsRUFDdEIsbUJBQW1CLGdEQUVuQixDQUFBLENBQUMsNkVBQTZFO0FBQy9FLHFCQUFxQixDQUFDLDRCQUE0QixDQUFDLENBQUE7QUFFbkQscUJBQXFCLENBQ3BCLElBQUksQ0FBQyxLQUFNLFNBQVEsYUFBYTtJQUMvQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3QkFBd0I7WUFDNUIsWUFBWSxFQUFFLHFCQUFxQjtZQUNuQyxNQUFN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