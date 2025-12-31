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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2VkaXRvcnMvdGV4dEZpbGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM5RSxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzlGLE9BQU8sRUFDTixnQkFBZ0IsR0FHaEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRixPQUFPLEVBRU4scUJBQXFCLEVBQ3JCLDBCQUEwQixFQUMxQixxQkFBcUIsRUFFckIsdUJBQXVCLEdBQ3ZCLE1BQU0sOEJBQThCLENBQUE7QUFFckMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsWUFBWSxFQUdaLFFBQVEsRUFDUiwwQkFBMEIsR0FDMUIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxP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