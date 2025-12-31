/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { MergeEditor } from '../view/mergeEditor.js';
import { ctxIsMergeEditor } from '../../common/mergeEditor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
const MERGE_EDITOR_CATEGORY = localize2('mergeEditor', 'Merge Editor (Dev)');
export class MergeEditorCopyContentsToJSON extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.copyContentsJson',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.copyState', 'Copy Merge Editor State as JSON'),
            icon: Codicon.layoutCentered,
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        const clipboardService = accessor.get(IClipboardService);
        const notificationService = accessor.get(INotificationService);
        if (!(activeEditorPane instanceof MergeEditor)) {
            notificationService.info({
                name: localize('mergeEditor.name', 'Merge Editor'),
                message: localize('mergeEditor.noActiveMergeEditor', 'No active merge editor'),
            });
            return;
        }
        const model = activeEditorPane.model;
        if (!model) {
            return;
        }
        const contents = {
            languageId: model.resultTextModel.getLanguageId(),
            base: model.base.getValue(),
            input1: model.input1.textModel.getValue(),
            input2: model.input2.textModel.getValue(),
            result: model.resultTextModel.getValue(),
            initialResult: model.getInitialResultValue(),
        };
        const jsonStr = JSON.stringify(contents, undefined, 4);
        clipboardService.writeText(jsonStr);
        notificationService.info({
            name: localize('mergeEditor.name', 'Merge Editor'),
            message: localize('mergeEditor.successfullyCopiedMergeEditorContents', 'Successfully copied merge editor state'),
        });
    }
}
export class MergeEditorSaveContentsToFolder extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.saveContentsToFolder',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.saveContentsToFolder', 'Save Merge Editor State to Folder'),
            icon: Codicon.layoutCentered,
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    async run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        const notificationService = accessor.get(INotificationService);
        const dialogService = accessor.get(IFileDialogService);
        const fileService = accessor.get(IFileService);
        const languageService = accessor.get(ILanguageService);
        if (!(activeEditorPane instanceof MergeEditor)) {
            notificationService.info({
                name: localize('mergeEditor.name', 'Merge Editor'),
                message: localize('mergeEditor.noActiveMergeEditor', 'No active merge editor'),
            });
            return;
        }
        const model = activeEditorPane.model;
        if (!model) {
            return;
        }
        const result = await dialogService.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: localize('mergeEditor.selectFolderToSaveTo', 'Select folder to save to'),
        });
        if (!result) {
            return;
        }
        const targetDir = result[0];
        const extension = languageService.getExtensions(model.resultTextModel.getLanguageId())[0] || '';
        async function write(fileName, source) {
            await fileService.writeFile(URI.joinPath(targetDir, fileName + extension), VSBuffer.fromString(source), {});
        }
        await Promise.all([
            write('base', model.base.getValue()),
            write('input1', model.input1.textModel.getValue()),
            write('input2', model.input2.textModel.getValue()),
            write('result', model.resultTextModel.getValue()),
            write('initialResult', model.getInitialResultValue()),
        ]);
        notificationService.info({
            name: localize('mergeEditor.name', 'Merge Editor'),
            message: localize('mergeEditor.successfullySavedMergeEditorContentsToFolder', 'Successfully saved merge editor state to folder'),
        });
    }
}
export class MergeEditorLoadContentsFromFolder extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.loadContentsFromFolder',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.loadContentsFromFolder', 'Load Merge Editor State from Folder'),
            icon: Codicon.layoutCentered,
            f1: true,
        });
    }
    async run(accessor, args) {
        const dialogService = accessor.get(IFileDialogService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const quickInputService = accessor.get(IQuickInputService);
        if (!args) {
            args = {};
        }
        let targetDir;
        if (!args.folderUri) {
            const result = await dialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: localize('mergeEditor.selectFolderToSaveTo', 'Select folder to save to'),
            });
            if (!result) {
                return;
            }
            targetDir = result[0];
        }
        else {
            targetDir = args.folderUri;
        }
        const targetDirInfo = await fileService.resolve(targetDir);
        function findFile(name) {
            return targetDirInfo.children.find((c) => c.name.startsWith(name))?.resource;
        }
        const shouldOpenInitial = await promptOpenInitial(quickInputService, args.resultState);
        const baseUri = findFile('base');
        const input1Uri = findFile('input1');
        const input2Uri = findFile('input2');
        const resultUri = findFile(shouldOpenInitial ? 'initialResult' : 'result');
        const input = {
            base: { resource: baseUri },
            input1: {
                resource: input1Uri,
                label: 'Input 1',
                description: 'Input 1',
                detail: '(from file)',
            },
            input2: {
                resource: input2Uri,
                label: 'Input 2',
                description: 'Input 2',
                detail: '(from file)',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL2NvbW1hbmRzL2RldkNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGdCQUFnQixFQUF1QixNQUFNLDZCQUE2QixDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixNQUFNLHFCQUFxQixHQUFxQixTQUFTLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLENBQUE7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