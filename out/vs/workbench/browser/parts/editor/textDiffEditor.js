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
var TextDiffEditor_1;
import { localize } from '../../../../nls.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isObject, assertIsDefined } from '../../../../base/common/types.js';
import { AbstractTextEditor } from './textEditor.js';
import { TEXT_DIFF_EDITOR_ID, EditorExtensions, isEditorInput, isTextEditorViewState, createTooLargeFileError, } from '../../../common/editor.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { TextDiffEditorModel } from '../../../common/editor/textDiffEditorModel.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService, } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { isEqual } from '../../../../base/common/resources.js';
import { multibyteAwareBtoa } from '../../../../base/browser/dom.js';
import { ByteSize, IFileService, TooLargeFileOperationError, } from '../../../../platform/files/common/files.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { DiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
/**
 * The text editor that leverages the diff text editor for the editing experience.
 */
let TextDiffEditor = class TextDiffEditor extends AbstractTextEditor {
    static { TextDiffEditor_1 = this; }
    static { this.ID = TEXT_DIFF_EDITOR_ID; }
    get scopedContextKeyService() {
        if (!this.diffEditorControl) {
            return undefined;
        }
        const originalEditor = this.diffEditorControl.getOriginalEditor();
        const modifiedEditor = this.diffEditorControl.getModifiedEditor();
        return (originalEditor.hasTextFocus() ? originalEditor : modifiedEditor).invokeWithinContext((accessor) => accessor.get(IContextKeyService));
    }
    constructor(group, telemetryService, instantiationService, storageService, configurationService, editorService, themeService, editorGroupService, fileService, preferencesService) {
        super(TextDiffEditor_1.ID, group, telemetryService, instantiationService, storageService, configurationService, themeService, editorService, editorGroupService, fileService);
        this.preferencesService = preferencesService;
        this.diffEditorControl = undefined;
        this.inputLifecycleStopWatch = undefined;
        this._previousViewModel = null;
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('textDiffEditor', 'Text Diff Editor');
    }
    createEditorControl(parent, configuration) {
        this.diffEditorControl = this._register(this.instantiationService.createInstance(DiffEditorWidget, parent, configuration, {}));
    }
    updateEditorControlOptions(options) {
        this.diffEditorControl?.updateOptions(options);
    }
    getMainControl() {
        return this.diffEditorControl?.getModifiedEditor();
    }
    async setInput(input, options, context, token) {
        if (this._previousViewModel) {
            this._previousViewModel.dispose();
            this._previousViewModel = null;
        }
        // Cleanup previous things associated with the input
        this.inputLifecycleStopWatch = undefined;
        // Set input and resolve
        await super.setInput(input, options, context, token);
        try {
            const resolvedModel = await input.resolve();
            // Check for cancellation
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Fallback to open as binary if not text
            if (!(resolvedModel instanceof TextDiffEditorModel)) {
                this.openAsBinary(input, options);
                return undefined;
            }
            // Set Editor Model
            const control = assertIsDefined(this.diffEditorControl);
            const resolvedDiffEditorModel = resolvedModel;
            const vm = resolvedDiffEditorModel.textDiffEditorModel
                ? control.createViewModel(resolvedDiffEditorModel.textDiffEditorModel)
                : null;
            this._previousViewModel = vm;
            await vm?.waitForDiff();
            control.setModel(vm);
            // Restore view state (unless provided by options)
            let hasPreviousViewState = false;
            if (!isTextEditorViewState(options?.viewState)) {
                hasPreviousViewState = this.restoreTextDiffEditorViewState(input, options, context, control);
            }
            // Apply options to editor if any
            let optionsGotApplied = false;
            if (options) {
                optionsGotApplied = applyTextEditorOptions(options, control, 1 /* ScrollType.Immediate */);
            }
            if (!optionsGotApplied && !hasPreviousViewState) {
                control.revealFirstDiff();
            }
            // Since the resolved model provides information about being readonly
            // or not, we apply it here to the editor even though the editor input
            // was already asked for being readonly or not. The rationale is that
            // a resolved model might have more specific information about being
            // readonly or not that the input did not have.
            control.updateOptions({
                ...this.getReadonlyConfiguration(resolvedDiffEditorModel.modifiedModel?.isReadonly()),
                originalEditable: !resolvedDiffEditorModel.originalModel?.isReadonly(),
            });
            control.handleInitialized();
            // Start to measure input lifecycle
            this.inputLifecycleStopWatch = new StopWatch(false);
        }
        catch (error) {
            await this.handleSetInputError(error, input, options);
        }
    }
    async handleSetInputError(error, input, options) {
        // Handle case where content appears to be binary
        if (this.isFileBinaryError(error)) {
            return this.openAsBinary(input, options);
        }
        // Handle case where a file is too large to open without confirmation
        if (error.fileOperationResult === 7 /* FileOperationResult.FILE_TOO_LARGE */) {
            let message;
            if (error instanceof TooLargeFileOperationError) {
                message = localize('fileTooLargeForHeapErrorWithSize', 'At least one file is not displayed in the text compare editor because it is very large ({0}).', ByteSize.formatSize(error.size));
            }
            else {
                message = localize('fileTooLargeForHeapErrorWithoutSize', 'At least one file is not displayed in the text compare editor because it is very large.');
            }
            throw createTooLargeFileError(this.group, input, options, message, this.preferencesService);
        }
        // Otherwise make sure the error bubbles up
        throw error;
    }
    restoreTextDiffEditorViewState(editor, options, context, control) {
        const editorViewState = this.loadEditorViewState(editor, context);
        if (editorViewState) {
            if (options?.selection && editorViewState.modified) {
                editorViewState.modified.cursorState = []; // prevent duplicate selections via options
            }
            control.restoreViewState(editorViewState);
            if (options?.revealIfVisible) {
                control.revealFirstDiff();
            }
            return true;
        }
        return false;
    }
    openAsBinary(input, options) {
        const original = input.original;
        const modified = input.modified;
        const binaryDiffInput = this.instantiationService.createInstance(DiffEditorInput, input.getName(), input.getDescription(), original, modified, true);
        // Forward binary flag to input if supported
        const fileEditorFactory = Registry.as(EditorExtensions.EditorFactory).getFileEditorFactory();
        if (fileEditorFactory.isFileEditor(original)) {
            original.setForceOpenAsBinary();
        }
        if (fileEditorFactory.isFileEditor(modified)) {
            modified.setForceOpenAsBinary();
        }
        // Replace this editor with the binary one
        this.group.replaceEditors([
            {
                editor: input,
                replacement: binaryDiffInput,
                options: {
                    ...options,
                    // Make sure to not steal away the currently active group
                    // because we are triggering another openEditor() call
                    // and do not control the initial intent that resulted
                    // in us now opening as binary.
                    activation: EditorActivation.PRESERVE,
                    pinned: this.group.isPinned(input),
                    sticky: this.group.isSticky(input),
                },
            },
        ]);
    }
    setOptions(options) {
        super.setOptions(options);
        if (options) {
            applyTextEditorOptions(options, assertIsDefined(this.diffEditorControl), 0 /* ScrollType.Smooth */);
        }
    }
    shouldHandleConfigurationChangeEvent(e, resource) {
        if (super.shouldHandleConfigurationChangeEvent(e, resource)) {
            return true;
        }
        return (e.affectsConfiguration(resource, 'diffEditor') ||
            e.affectsConfiguration(resource, 'accessibility.verbosity.diffEditor'));
    }
    computeConfiguration(configuration) {
        const editorConfiguration = super.computeConfiguration(configuration);
        // Handle diff editor specially by merging in diffEditor configuration
        if (isObject(configuration.diffEditor)) {
            const diffEditorConfiguration = deepClone(configuration.diffEditor);
            // User settings defines `diffEditor.codeLens`, but here we rename that to `diffEditor.diffCodeLens` to avoid collisions with `editor.codeLens`.
            diffEditorConfiguration.diffCodeLens = diffEditorConfiguration.codeLens;
            delete diffEditorConfiguration.codeLens;
            // User settings defines `diffEditor.wordWrap`, but here we rename that to `diffEditor.diffWordWrap` to avoid collisions with `editor.wordWrap`.
            diffEditorConfiguration.diffWordWrap = (diffEditorConfiguration.wordWrap);
            delete diffEditorConfiguration.wordWrap;
            Object.assign(editorConfiguration, diffEditorConfiguration);
        }
        const verbose = configuration.accessibility?.verbosity?.diffEditor ?? false;
        editorConfiguration.accessibilityVerbose = verbose;
        return editorConfiguration;
    }
    getConfigurationOverrides(configuration) {
        return {
            ...super.getConfigurationOverrides(configuration),
            ...this.getReadonlyConfiguration(this.input?.isReadonly()),
            originalEditable: this.input instanceof DiffEditorInput && !this.input.original.isReadonly(),
            lineDecorationsWidth: '2ch',
        };
    }
    updateReadonly(input) {
        if (input instanceof DiffEditorInput) {
            this.diffEditorControl?.updateOptions({
                ...this.getReadonlyConfiguration(input.isReadonly()),
                originalEditable: !input.original.isReadonly(),
            });
        }
        else {
            super.updateReadonly(input);
        }
    }
    isFileBinaryError(error) {
        if (Array.isArray(error)) {
            const errors = error;
            return errors.some((error) => this.isFileBinaryError(error));
        }
        return (error.textFileOperationResult ===
            0 /* TextFileOperationResult.FILE_IS_BINARY */);
    }
    clearInput() {
        if (this._previousViewModel) {
            this._previousViewModel.dispose();
            this._previousViewModel = null;
        }
        super.clearInput();
        // Log input lifecycle telemetry
        const inputLifecycleElapsed = this.inputLifecycleStopWatch?.elapsed();
        this.inputLifecycleStopWatch = undefined;
        if (typeof inputLifecycleElapsed === 'number') {
            this.logInputLifecycleTelemetry(inputLifecycleElapsed, this.getControl()?.getModel()?.modified?.getLanguageId());
        }
        // Clear Model
        this.diffEditorControl?.setModel(null);
    }
    logInputLifecycleTelemetry(duration, languageId) {
        let collapseUnchangedRegions = false;
        if (this.diffEditorControl instanceof DiffEditorWidget) {
            collapseUnchangedRegions = this.diffEditorControl.collapseUnchangedRegions;
        }
        this.telemetryService.publicLog2('diffEditor.editorVisibleTime', {
            editorVisibleTimeMs: duration,
            languageId: languageId ?? '',
            collapseUnchangedRegions,
        });
    }
    getControl() {
        return this.diffEditorControl;
    }
    focus() {
        super.focus();
        this.diffEditorControl?.focus();
    }
    hasFocus() {
        return this.diffEditorControl?.hasTextFocus() || super.hasFocus();
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        if (visible) {
            this.diffEditorControl?.onVisible();
        }
        else {
            this.diffEditorControl?.onHide();
        }
    }
    layout(dimension) {
        this.diffEditorControl?.layout(dimension);
    }
    setBoundarySashes(sashes) {
        this.diffEditorControl?.setBoundarySashes(sashes);
    }
    tracksEditorViewState(input) {
        return input instanceof DiffEditorInput;
    }
    computeEditorViewState(resource) {
        if (!this.diffEditorControl) {
            return undefined;
        }
        const model = this.diffEditorControl.getModel();
        if (!model || !model.modified || !model.original) {
            return undefined; // view state always needs a model
        }
        const modelUri = this.toEditorViewStateResource(model);
        if (!modelUri) {
            return undefined; // model URI is needed to make sure we save the view state correctly
        }
        if (!isEqual(modelUri, resource)) {
            return undefined; // prevent saving view state for a model that is not the expected one
        }
        return this.diffEditorControl.saveViewState() ?? undefined;
    }
    toEditorViewStateResource(modelOrInput) {
        let original;
        let modified;
        if (modelOrInput instanceof DiffEditorInput) {
            original = modelOrInput.original.resource;
            modified = modelOrInput.modified.resource;
        }
        else if (!isEditorInput(modelOrInput)) {
            original = modelOrInput.original.uri;
            modified = modelOrInput.modified.uri;
        }
        if (!original || !modified) {
            return undefined;
        }
        // create a URI that is the Base64 concatenation of original + modified resource
        return URI.from({
            scheme: 'diff',
            path: `${multibyteAwareBtoa(original.toString())}${multibyteAwareBtoa(modified.toString())}`,
        });
    }
};
TextDiffEditor = TextDiffEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, ITextResourceConfigurationService),
    __param(5, IEditorService),
    __param(6, IThemeService),
    __param(7, IEditorGroupsService),
    __param(8, IFileService),
    __param(9, IPreferencesService)
], TextDiffEditor);
export { TextDiffEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dERpZmZFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvdGV4dERpZmZFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU01RSxPQUFPLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0saUJBQWlCLENBQUE7QUFDMUUsT0FBTyxFQUNOLG1CQUFtQixFQUVuQixnQkFBZ0IsRUFHaEIsYUFBYSxFQUNiLHFCQUFxQixFQUNyQix1QkFBdUIsR0FDdkIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFFTixpQ0FBaUMsR0FDakMsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFXakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9B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