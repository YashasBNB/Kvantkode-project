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
var TextFileEditor_1;
import { localize } from '../../../../../nls.js';
import { mark } from '../../../../../base/common/performance.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
import { IPathService } from '../../../../services/path/common/pathService.js';
import { toAction } from '../../../../../base/common/actions.js';
import { VIEWLET_ID, TEXT_FILE_EDITOR_ID, BINARY_TEXT_FILE_MODE } from '../../common/files.js';
import { ITextFileService, } from '../../../../services/textfile/common/textfiles.js';
import { AbstractTextCodeEditor } from '../../../../browser/parts/editor/textCodeEditor.js';
import { isTextEditorViewState, DEFAULT_EDITOR_ASSOCIATION, createEditorOpenError, createTooLargeFileError, } from '../../../../common/editor.js';
import { applyTextEditorOptions } from '../../../../common/editor/editorOptions.js';
import { BinaryEditorModel } from '../../../../common/editor/binaryEditorModel.js';
import { FileEditorInput } from './fileEditorInput.js';
import { FileOperationError, IFileService, ByteSize, TooLargeFileOperationError, } from '../../../../../platform/files/common/files.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorActivation, } from '../../../../../platform/editor/common/editor.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExplorerService } from '../files.js';
import { IPaneCompositePartService } from '../../../../services/panecomposite/browser/panecomposite.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
/**
 * An implementation of editor for file system resources.
 */
let TextFileEditor = class TextFileEditor extends AbstractTextCodeEditor {
    static { TextFileEditor_1 = this; }
    static { this.ID = TEXT_FILE_EDITOR_ID; }
    constructor(group, telemetryService, fileService, paneCompositeService, instantiationService, contextService, storageService, textResourceConfigurationService, editorService, themeService, editorGroupService, textFileService, explorerService, uriIdentityService, pathService, configurationService, preferencesService, hostService, filesConfigurationService) {
        super(TextFileEditor_1.ID, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService);
        this.paneCompositeService = paneCompositeService;
        this.contextService = contextService;
        this.textFileService = textFileService;
        this.explorerService = explorerService;
        this.uriIdentityService = uriIdentityService;
        this.pathService = pathService;
        this.configurationService = configurationService;
        this.preferencesService = preferencesService;
        this.hostService = hostService;
        this.filesConfigurationService = filesConfigurationService;
        // Clear view state for deleted files
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
        // Move view state for moved files
        this._register(this.fileService.onDidRunOperation((e) => this.onDidRunOperation(e)));
    }
    onDidFilesChange(e) {
        for (const resource of e.rawDeleted) {
            this.clearEditorViewState(resource);
        }
    }
    onDidRunOperation(e) {
        if (e.operation === 2 /* FileOperation.MOVE */ && e.target) {
            this.moveEditorViewState(e.resource, e.target.resource, this.uriIdentityService.extUri);
        }
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('textFileEditor', 'Text File Editor');
    }
    get input() {
        return this._input;
    }
    async setInput(input, options, context, token) {
        mark('code/willSetInputToTextFileEditor');
        // Set input and resolve
        await super.setInput(input, options, context, token);
        try {
            const resolvedModel = await input.resolve(options);
            // Check for cancellation
            if (token.isCancellationRequested) {
                return;
            }
            // There is a special case where the text editor has to handle binary
            // file editor input: if a binary file has been resolved and cached
            // before, it maybe an actual instance of BinaryEditorModel. In this
            // case our text editor has to open this model using the binary editor.
            // We return early in this case.
            if (resolvedModel instanceof BinaryEditorModel) {
                return this.openAsBinary(input, options);
            }
            const textFileModel = resolvedModel;
            // Editor
            const control = assertIsDefined(this.editorControl);
            control.setModel(textFileModel.textEditorModel);
            // Restore view state (unless provided by options)
            if (!isTextEditorViewState(options?.viewState)) {
                const editorViewState = this.loadEditorViewState(input, context);
                if (editorViewState) {
                    if (options?.selection) {
                        editorViewState.cursorState = []; // prevent duplicate selections via options
                    }
                    control.restoreViewState(editorViewState);
                }
            }
            // Apply options to editor if any
            if (options) {
                applyTextEditorOptions(options, control, 1 /* ScrollType.Immediate */);
            }
            // Since the resolved model provides information about being readonly
            // or not, we apply it here to the editor even though the editor input
            // was already asked for being readonly or not. The rationale is that
            // a resolved model might have more specific information about being
            // readonly or not that the input did not have.
            control.updateOptions(this.getReadonlyConfiguration(textFileModel.isReadonly()));
            if (control.handleInitialized) {
                control.handleInitialized();
            }
        }
        catch (error) {
            await this.handleSetInputError(error, input, options);
        }
        mark('code/didSetInputToTextFileEditor');
    }
    async handleSetInputError(error, input, options) {
        // Handle case where content appears to be binary
        if (error.textFileOperationResult ===
            0 /* TextFileOperationResult.FILE_IS_BINARY */) {
            return this.openAsBinary(input, options);
        }
        // Handle case where we were asked to open a folder
        if (error.fileOperationResult === 0 /* FileOperationResult.FILE_IS_DIRECTORY */) {
            const actions = [];
            actions.push(toAction({
                id: 'workbench.files.action.openFolder',
                label: localize('openFolder', 'Open Folder'),
                run: async () => {
                    return this.hostService.openWindow([{ folderUri: input.resource }], {
                        forceNewWindow: true,
                    });
                },
            }));
            if (this.contextService.isInsideWorkspace(input.preferredResource)) {
                actions.push(toAction({
                    id: 'workbench.files.action.reveal',
                    label: localize('reveal', 'Reveal Folder'),
                    run: async () => {
                        await this.paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */, true);
                        return this.explorerService.select(input.preferredResource, true);
                    },
                }));
            }
            throw createEditorOpenError(localize('fileIsDirectory', 'The file is not displayed in the text editor because it is a directory.'), actions, { forceMessage: true });
        }
        // Handle case where a file is too large to open without confirmation
        if (error.fileOperationResult === 7 /* FileOperationResult.FILE_TOO_LARGE */) {
            let message;
            if (error instanceof TooLargeFileOperationError) {
                message = localize('fileTooLargeForHeapErrorWithSize', 'The file is not displayed in the text editor because it is very large ({0}).', ByteSize.formatSize(error.size));
            }
            else {
                message = localize('fileTooLargeForHeapErrorWithoutSize', 'The file is not displayed in the text editor because it is very large.');
            }
            throw createTooLargeFileError(this.group, input, options, message, this.preferencesService);
        }
        // Offer to create a file from the error if we have a file not found and the name is valid and not readonly
        if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */ &&
            !this.filesConfigurationService.isReadonly(input.preferredResource) &&
            (await this.pathService.hasValidBasename(input.preferredResource))) {
            const fileNotFoundError = createEditorOpenError(new FileOperationError(localize('unavailableResourceErrorEditorText', 'The editor could not be opened because the file was not found.'), 1 /* FileOperationResult.FILE_NOT_FOUND */), [
                toAction({
                    id: 'workbench.files.action.createMissingFile',
                    label: localize('createFile', 'Create File'),
                    run: async () => {
                        await this.textFileService.create([{ resource: input.preferredResource }]);
                        return this.editorService.openEditor({
                            resource: input.preferredResource,
                            options: {
                                pinned: true, // new file gets pinned by default
                            },
                        });
                    },
                }),
            ], {
                // Support the flow of directly pressing `Enter` on the dialog to
                // create the file on the go. This is nice when for example following
                // a link to a file that does not exist to scaffold it quickly.
                allowDialog: true,
            });
            throw fileNotFoundError;
        }
        // Otherwise make sure the error bubbles up
        throw error;
    }
    openAsBinary(input, options) {
        const defaultBinaryEditor = this.configurationService.getValue('workbench.editor.defaultBinaryEditor');
        const editorOptions = {
            ...options,
            // Make sure to not steal away the currently active group
            // because we are triggering another openEditor() call
            // and do not control the initial intent that resulted
            // in us now opening as binary.
            activation: EditorActivation.PRESERVE,
        };
        // Check configuration and determine whether we open the binary
        // file input in a different editor or going through the same
        // editor.
        // Going through the same editor is debt, and a better solution
        // would be to introduce a real editor for the binary case
        // and avoid enforcing binary or text on the file editor input.
        if (defaultBinaryEditor &&
            defaultBinaryEditor !== '' &&
            defaultBinaryEditor !== DEFAULT_EDITOR_ASSOCIATION.id) {
            this.doOpenAsBinaryInDifferentEditor(this.group, defaultBinaryEditor, input, editorOptions);
        }
        else {
            this.doOpenAsBinaryInSameEditor(this.group, defaultBinaryEditor, input, editorOptions);
        }
    }
    doOpenAsBinaryInDifferentEditor(group, editorId, editor, editorOptions) {
        this.editorService.replaceEditors([
            {
                editor,
                replacement: {
                    resource: editor.resource,
                    options: { ...editorOptions, override: editorId },
                },
            },
        ], group);
    }
    doOpenAsBinaryInSameEditor(group, editorId, editor, editorOptions) {
        // Open binary as text
        if (editorId === DEFAULT_EDITOR_ASSOCIATION.id) {
            editor.setForceOpenAsText();
            editor.setPreferredLanguageId(BINARY_TEXT_FILE_MODE); // https://github.com/microsoft/vscode/issues/131076
            editorOptions = { ...editorOptions, forceReload: true }; // Same pane and same input, must force reload to clear cached state
        }
        // Open as binary
        else {
            editor.setForceOpenAsBinary();
        }
        group.openEditor(editor, editorOptions);
    }
    clearInput() {
        super.clearInput();
        // Clear Model
        this.editorControl?.setModel(null);
    }
    createEditorControl(parent, initialOptions) {
        mark('code/willCreateTextFileEditorControl');
        super.createEditorControl(parent, initialOptions);
        mark('code/didCreateTextFileEditorControl');
    }
    tracksEditorViewState(input) {
        return input instanceof FileEditorInput;
    }
    tracksDisposedEditorViewState() {
        return true; // track view state even for disposed editors
    }
};
TextFileEditor = TextFileEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IFileService),
    __param(3, IPaneCompositePartService),
    __param(4, IInstantiationService),
    __param(5, IWorkspaceContextService),
    __param(6, IStorageService),
    __param(7, ITextResourceConfigurationService),
    __param(8, IEditorService),
    __param(9, IThemeService),
    __param(10, IEditorGroupsService),
    __param(11, ITextFileService),
    __param(12, IExplorerService),
    __param(13, IUriIdentityService),
    __param(14, IPathService),
    __param(15, IConfigurationService),
    __param(16, IPreferencesService),
    __param(17, IHostService),
    __param(18, IFilesConfigurationService)
], TextFileEditor);
export { TextFileEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZWRpdG9ycy90ZXh0RmlsZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzlFLE9BQU8sRUFBVyxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDOUYsT0FBTyxFQUNOLGdCQUFnQixHQUdoQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzNGLE9BQU8sRUFFTixxQkFBcUIsRUFDckIsMEJBQTBCLEVBQzFCLHFCQUFxQixFQUVyQix1QkFBdUIsR0FDdkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUNOLGtCQUFrQixFQUdsQixZQUFZLEVBR1osUUFBUSxFQUNSLDBCQUEwQixHQUMxQixNQUFNLCtDQUErQyxDQUFBO0FB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