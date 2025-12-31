/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { autorun } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ICodeMapperService } from '../chatCodeMapperService.js';
import { IChatEditingService } from '../chatEditingService.js';
import { IChatService } from '../chatService.js';
import { ILanguageModelIgnoredFilesService } from '../ignoredFiles.js';
const codeInstructions = `
The user is very smart and can understand how to insert cells to their new Notebook files
`;
export const ExtensionEditToolId = 'vscode_insert_notebook_cells';
export const InternalEditToolId = 'vscode_insert_notebook_cells_internal';
export const EditToolData = {
    id: InternalEditToolId,
    displayName: localize('chat.tools.editFile', 'Edit File'),
    modelDescription: `Insert cells into a new notebook n the workspace. Use this tool once per file that needs to be modified, even if there are multiple changes for a file. Generate the "explanation" property first. ${codeInstructions}`,
    source: { type: 'internal' },
    inputSchema: {
        type: 'object',
        properties: {
            explanation: {
                type: 'string',
                description: 'A short explanation of the edit being made. Can be the same as the explanation you showed to the user.',
            },
            filePath: {
                type: 'string',
                description: 'An absolute path to the file to edit, or the URI of a untitled, not yet named, file, such as `untitled:Untitled-1.',
            },
            cells: {
                type: 'array',
                description: 'The cells to insert to apply to the file. ' + codeInstructions,
            },
        },
        required: ['explanation', 'filePath', 'code'],
    },
};
let EditTool = class EditTool {
    constructor(chatService, chatEditingService, codeMapperService, workspaceContextService, ignoredFilesService, textFileService, notebookService) {
        this.chatService = chatService;
        this.chatEditingService = chatEditingService;
        this.codeMapperService = codeMapperService;
        this.workspaceContextService = workspaceContextService;
        this.ignoredFilesService = ignoredFilesService;
        this.textFileService = textFileService;
        this.notebookService = notebookService;
    }
    async invoke(invocation, countTokens, token) {
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        const parameters = invocation.parameters;
        const uri = URI.revive(parameters.file); // TODO@roblourens do revive in MainThreadLanguageModelTools
        if (!this.workspaceContextService.isInsideWorkspace(uri)) {
            throw new Error(`File ${uri.fsPath} can't be edited because it's not inside the current workspace`);
        }
        if (await this.ignoredFilesService.fileIsIgnored(uri, token)) {
            throw new Error(`File ${uri.fsPath} can't be edited because it is configured to be ignored by Copilot`);
        }
        const model = this.chatService.getSession(invocation.context?.sessionId);
        const request = model.getRequests().at(-1);
        // Undo stops mark groups of response data in the output. Operations, such
        // as text edits, that happen between undo stops are all done or undone together.
        if (request.response?.response.getMarkdown().length) {
            // slightly hacky way to avoid an extra 'no-op' undo stop at the start of responses that are just edits
            model.acceptResponseProgress(request, {
                kind: 'undoStop',
                id: generateUuid(),
            });
        }
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n'),
        });
        model.acceptResponseProgress(request, {
            kind: 'codeblockUri',
            uri,
        });
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString(parameters.code + '\n````\n'),
        });
        const notebookUri = CellUri.parse(uri)?.notebook || uri;
        // Signal start.
        if (this.notebookService.hasSupportedNotebooks(notebookUri) &&
            this.notebookService.getNotebookTextModel(notebookUri)) {
            model.acceptResponseProgress(request, {
                kind: 'notebookEdit',
                edits: [],
                uri: notebookUri,
            });
        }
        else {
            model.acceptResponseProgress(request, {
                kind: 'textEdit',
                edits: [],
                uri,
            });
        }
        const editSession = this.chatEditingService.getEditingSession(model.sessionId);
        if (!editSession) {
            throw new Error('This tool must be called from within an editing session');
        }
        const result = await this.codeMapperService.mapCode({
            codeBlocks: [
                { code: parameters.code, resource: uri, markdownBeforeBlock: parameters.explanation },
            ],
            location: 'tool',
            chatRequestId: invocation.chatRequestId,
        }, {
            textEdit: (target, edits) => {
                model.acceptResponseProgress(request, { kind: 'textEdit', uri: target, edits });
            },
            notebookEdit(target, edits) {
                model.acceptResponseProgress(request, { kind: 'notebookEdit', uri: target, edits });
            },
        }, token);
        // Signal end.
        if (this.notebookService.hasSupportedNotebooks(notebookUri) &&
            this.notebookService.getNotebookTextModel(notebookUri)) {
            model.acceptResponseProgress(request, {
                kind: 'notebookEdit',
                uri: notebookUri,
                edits: [],
                done: true,
            });
        }
        else {
            model.acceptResponseProgress(request, { kind: 'textEdit', uri, edits: [], done: true });
        }
        if (result?.errorMessage) {
            throw new Error(result.errorMessage);
        }
        let dispose;
        await new Promise((resolve) => {
            // The file will not be modified until the first edits start streaming in,
            // so wait until we see that it _was_ modified before waiting for it to be done.
            let wasFileBeingModified = false;
            dispose = autorun((r) => {
                const entries = editSession.entries.read(r);
                const currentFile = entries?.find((e) => e.modifiedURI.toString() === uri.toString());
                if (currentFile) {
                    if (currentFile.isCurrentlyBeingModifiedBy.read(r)) {
                        wasFileBeingModified = true;
                    }
                    else if (wasFileBeingModified) {
                        resolve(true);
                    }
                }
            });
        }).finally(() => {
            dispose.dispose();
        });
        await this.textFileService.save(uri, {
            reason: 2 /* SaveReason.AUTO */,
            skipSaveParticipants: true,
        });
        return {
            content: [{ kind: 'text', value: 'The file was edited successfully' }],
        };
    }
    async prepareToolInvocation(parameters, token) {
        return {
            presentation: 'hidden',
        };
    }
};
EditTool = __decorate([
    __param(0, IChatService),
    __param(1, IChatEditingService),
    __param(2, ICodeMapperService),
    __param(3, IWorkspaceContextService),
    __param(4, ILanguageModelIgnoredFilesService),
    __param(5, ITextFileService),
    __param(6, INotebookService)
], EditTool);
export { EditTool };
export class EditToolInputProcessor {
    processInput(input) {
        if (!input.filePath) {
            // Tool name collision, or input wasn't properly validated upstream
            return input;
        }
        const filePath = input.filePath;
        // Runs in EH, will be mapped
        return {
            file: filePath.startsWith('untitled:') ? URI.parse(filePath) : URI.file(filePath),
            explanation: input.explanation,
            code: input.code,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0Tm90ZWJvb2tDZWxsc1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi90b29scy9pbnNlcnROb3RlYm9va0NlbGxzVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBV3RFLE1BQU0sZ0JBQWdCLEdBQUc7O0NBRXhCLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyw4QkFBOEIsQ0FBQTtBQUNqRSxNQUFNLENB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