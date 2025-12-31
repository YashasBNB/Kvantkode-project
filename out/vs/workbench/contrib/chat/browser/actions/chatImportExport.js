/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isExportableSessionData } from '../../common/chatModel.js';
import { IChatService } from '../../common/chatService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
const defaultFileName = 'chat.json';
const filters = [{ name: localize('chat.file.label', 'Chat Session'), extensions: ['json'] }];
export function registerChatExportActions() {
    registerAction2(class ExportChatAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.export',
                category: CHAT_CATEGORY,
                title: localize2('chat.export.label', 'Export Chat...'),
                precondition: ChatContextKeys.enabled,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            const fileDialogService = accessor.get(IFileDialogService);
            const fileService = accessor.get(IFileService);
            const chatService = accessor.get(IChatService);
            const widget = widgetService.lastFocusedWidget;
            if (!widget || !widget.viewModel) {
                return;
            }
            const defaultUri = joinPath(await fileDialogService.defaultFilePath(), defaultFileName);
            const result = await fileDialogService.showSaveDialog({
                defaultUri,
                filters,
            });
            if (!result) {
                return;
            }
            const model = chatService.getSession(widget.viewModel.sessionId);
            if (!model) {
                return;
            }
            // Using toJSON on the model
            const content = VSBuffer.fromString(JSON.stringify(model.toExport(), undefined, 2));
            await fileService.writeFile(result, content);
        }
    });
    registerAction2(class ImportChatAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.import',
                title: localize2('chat.import.label', 'Import Chat...'),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const fileDialogService = accessor.get(IFileDialogService);
            const fileService = accessor.get(IFileService);
            const editorService = accessor.get(IEditorService);
            const defaultUri = joinPath(await fileDialogService.defaultFilePath(), defaultFileName);
            const result = await fileDialogService.showOpenDialog({
                defaultUri,
                canSelectFiles: true,
                filters,
            });
            if (!result) {
                return;
            }
            const content = await fileService.readFile(result[0]);
            try {
                const data = JSON.parse(content.value.toString());
                if (!isExportableSessionData(data)) {
                    throw new Error('Invalid chat session data');
                }
                const options = { target: { data }, pinned: true };
                await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options });
            }
            catch (err) {
                throw err;
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEltcG9ydEV4cG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRJbXBvcnRFeHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQTtBQUNuQyxNQUFNLE9BQU8sR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENB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