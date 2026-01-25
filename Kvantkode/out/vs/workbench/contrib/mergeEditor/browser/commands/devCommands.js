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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvY29tbWFuZHMvZGV2Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQXVCLE1BQU0sNkJBQTZCLENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLE1BQU0scUJBQXFCLEdBQXFCLFNBQVMsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLENBQUMs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