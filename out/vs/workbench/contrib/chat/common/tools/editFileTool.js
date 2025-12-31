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
import { isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ICodeMapperService } from '../../common/chatCodeMapperService.js';
import { IChatService } from '../../common/chatService.js';
import { ILanguageModelIgnoredFilesService } from '../../common/ignoredFiles.js';
const codeInstructions = `
The user is very smart and can understand how to apply your edits to their files, you just need to provide minimal hints.
Avoid repeating existing code, instead use comments to represent regions of unchanged code. The user prefers that you are as concise as possible. For example:
// ...existing code...
{ changed code }
// ...existing code...
{ changed code }
// ...existing code...

Here is an example of how you should use format an edit to an existing Person class:
class Person {
	// ...existing code...
	age: number;
	// ...existing code...
	getAge() {
		return this.age;
	}
}
`;
export const ExtensionEditToolId = 'vscode_editFile';
export const InternalEditToolId = 'vscode_editFile_internal';
export const EditToolData = {
    id: InternalEditToolId,
    displayName: localize('chat.tools.editFile', 'Edit File'),
    modelDescription: `Edit a file in the workspace. Use this tool once per file that needs to be modified, even if there are multiple changes for a file. Generate the "explanation" property first. ${codeInstructions}`,
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
            code: {
                type: 'string',
                description: 'The code change to apply to the file. ' + codeInstructions,
            },
        },
        required: ['explanation', 'filePath', 'code'],
    },
};
let EditTool = class EditTool {
    constructor(chatService, codeMapperService, workspaceContextService, ignoredFilesService, textFileService, notebookService, editorGroupsService) {
        this.chatService = chatService;
        this.codeMapperService = codeMapperService;
        this.workspaceContextService = workspaceContextService;
        this.ignoredFilesService = ignoredFilesService;
        this.textFileService = textFileService;
        this.notebookService = notebookService;
        this.editorGroupsService = editorGroupsService;
    }
    async invoke(invocation, countTokens, token) {
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        const parameters = invocation.parameters;
        const fileUri = URI.revive(parameters.file); // TODO@roblourens do revive in MainThreadLanguageModelTools
        const uri = CellUri.parse(fileUri)?.notebook || fileUri;
        if (!this.workspaceContextService.isInsideWorkspace(uri) &&
            !this.notebookService.getNotebookTextModel(uri)) {
            const groupsByLastActive = this.editorGroupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const uriIsOpenInSomeEditor = groupsByLastActive.some((group) => {
                return group.editors.some((editor) => {
                    return isEqual(editor.resource, uri);
                });
            });
            if (!uriIsOpenInSomeEditor) {
                throw new Error(`File ${uri.fsPath} can't be edited because it's not inside the current workspace`);
            }
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
            isEdit: true,
        });
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString(parameters.code + '\n````\n'),
        });
        // Signal start.
        if (this.notebookService.hasSupportedNotebooks(uri) &&
            this.notebookService.getNotebookTextModel(uri)) {
            model.acceptResponseProgress(request, {
                kind: 'notebookEdit',
                edits: [],
                uri,
            });
        }
        else {
            model.acceptResponseProgress(request, {
                kind: 'textEdit',
                edits: [],
                uri,
            });
        }
        const editSession = model.editingSession;
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
        if (this.notebookService.hasSupportedNotebooks(uri) &&
            this.notebookService.getNotebookTextModel(uri)) {
            model.acceptResponseProgress(request, { kind: 'notebookEdit', uri, edits: [], done: true });
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
    __param(1, ICodeMapperService),
    __param(2, IWorkspaceContextService),
    __param(3, ILanguageModelIgnoredFilesService),
    __param(4, ITextFileService),
    __param(5, INotebookService),
    __param(6, IEditorGroupsService)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdEZpbGVUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvZWRpdEZpbGVUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRyxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQVdoRixNQUFNLGdCQUFnQixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FrQnhCLENBQUE7QUFFRCxNQUFNLENBQUMsTUFB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