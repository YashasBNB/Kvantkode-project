/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { randomPath } from '../../../../base/common/extpath.js';
import { URI } from '../../../../base/common/uri.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { MergeEditor } from '../browser/view/mergeEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const MERGE_EDITOR_CATEGORY = localize2('mergeEditor', 'Merge Editor (Dev)');
export class MergeEditorOpenContentsFromJSON extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.openContentsJson',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.openState', 'Open Merge Editor State from JSON'),
            icon: Codicon.layoutCentered,
            f1: true,
        });
    }
    async run(accessor, args) {
        const quickInputService = accessor.get(IQuickInputService);
        const clipboardService = accessor.get(IClipboardService);
        const editorService = accessor.get(IEditorService);
        const languageService = accessor.get(ILanguageService);
        const env = accessor.get(INativeEnvironmentService);
        const fileService = accessor.get(IFileService);
        if (!args) {
            args = {};
        }
        let content;
        if (!args.data) {
            const result = await quickInputService.input({
                prompt: localize('mergeEditor.enterJSON', 'Enter JSON'),
                value: await clipboardService.readText(),
            });
            if (result === undefined) {
                return;
            }
            content =
                result !== ''
                    ? JSON.parse(result)
                    : { base: '', input1: '', input2: '', result: '', languageId: 'plaintext' };
        }
        else {
            content = args.data;
        }
        const targetDir = URI.joinPath(env.tmpDir, randomPath());
        const extension = languageService.getExtensions(content.languageId)[0] || '';
        const baseUri = URI.joinPath(targetDir, `/base${extension}`);
        const input1Uri = URI.joinPath(targetDir, `/input1${extension}`);
        const input2Uri = URI.joinPath(targetDir, `/input2${extension}`);
        const resultUri = URI.joinPath(targetDir, `/result${extension}`);
        const initialResultUri = URI.joinPath(targetDir, `/initialResult${extension}`);
        async function writeFile(uri, content) {
            await fileService.writeFile(uri, VSBuffer.fromString(content));
        }
        const shouldOpenInitial = await promptOpenInitial(quickInputService, args.resultState);
        await Promise.all([
            writeFile(baseUri, content.base),
            writeFile(input1Uri, content.input1),
            writeFile(input2Uri, content.input2),
            writeFile(resultUri, shouldOpenInitial ? content.initialResult || '' : content.result),
            writeFile(initialResultUri, content.initialResult || ''),
        ]);
        const input = {
            base: { resource: baseUri },
            input1: {
                resource: input1Uri,
                label: 'Input 1',
                description: 'Input 1',
                detail: '(from JSON)',
            },
            input2: {
                resource: input2Uri,
                label: 'Input 2',
                description: 'Input 2',
                detail: '(from JSON)',
            },
            result: { resource: resultUri },
        };
        editorService.openEditor(input);
    }
}
async function promptOpenInitial(quickInputService, resultStateOverride) {
    if (resultStateOverride) {
        return resultStateOverride === 'initial';
    }
    const result = await quickInputService.pick([
        { label: 'result', result: false },
        { label: 'initial result', result: true },
    ], { canPickMany: false });
    return result?.result;
}
class MergeEditorAction extends Action2 {
    constructor(desc) {
        super(desc);
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            const vm = activeEditorPane.viewModel.get();
            if (!vm) {
                return;
            }
            this.runWithViewModel(vm, accessor);
        }
    }
}
export class OpenSelectionInTemporaryMergeEditor extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.dev.openSelectionInTemporaryMergeEditor',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.openSelectionInTemporaryMergeEditor', 'Open Selection In Temporary Merge Editor'),
            icon: Codicon.layoutCentered,
            f1: true,
        });
    }
    async runWithViewModel(viewModel, accessor) {
        const rangesInBase = viewModel.selectionInBase.get()?.rangesInBase;
        if (!rangesInBase || rangesInBase.length === 0) {
            return;
        }
        const base = rangesInBase.map((r) => viewModel.model.base.getValueInRange(r)).join('\n');
        const input1 = rangesInBase
            .map((r) => viewModel.inputCodeEditorView1.editor
            .getModel()
            .getValueInRange(viewModel.model.translateBaseRangeToInput(1, r)))
            .join('\n');
        const input2 = rangesInBase
            .map((r) => viewModel.inputCodeEditorView2.editor
            .getModel()
            .getValueInRange(viewModel.model.translateBaseRangeToInput(2, r)))
            .join('\n');
        const result = rangesInBase
            .map((r) => viewModel.resultCodeEditorView.editor
            .getModel()
            .getValueInRange(viewModel.model.translateBaseRangeToResult(r)))
            .join('\n');
        new MergeEditorOpenContentsFromJSON().run(accessor, {
            data: {
                base,
                input1,
                input2,
                result,
                languageId: viewModel.resultCodeEditorView.editor.getModel().getLanguageId(),
            },
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9lbGVjdHJvbi1zYW5kYm94L2RldkNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUc1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsTUFBTSxxQkFBcUIsR0FBcUIsU0FBUyxDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0FBRTlGLE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxPQUFPO0lBQzNEO1FBQ0MsS0FB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