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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2VsZWN0cm9uLXNhbmRib3gvZGV2Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFeEQsT0FBTyxFQUFFLE9BQU8sRUFBbUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixNQUFNLHFCQUFxQixHQUFxQixTQUFTLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLENBQUE7QUFFOUYsTUFBTSxPQUFPLCtCQUFnQyxT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