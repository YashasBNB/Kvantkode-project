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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dERpZmZFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci90ZXh0RGlmZkVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBTTVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBd0IsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sbUJBQW1CLEVBRW5CLGdCQUFnQixFQUdoQixhQUFhLEVBQ2IscUJBQXFCLEVBQ3JCLHVCQUF1QixHQUN2QixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUVOLGlDQUFpQyxHQUNqQyxNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQVdqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFD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