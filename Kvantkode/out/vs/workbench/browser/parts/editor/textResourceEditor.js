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
var TextResourceEditor_1;
import { assertIsDefined } from '../../../../base/common/types.js';
import { isTextEditorViewState } from '../../../common/editor.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
import { TextResourceEditorInput, } from '../../../common/editor/textResourceEditorInput.js';
import { BaseTextEditorModel } from '../../../common/editor/textEditorModel.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { AbstractTextCodeEditor } from './textCodeEditor.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IFileService } from '../../../../platform/files/common/files.js';
/**
 * An editor implementation that is capable of showing the contents of resource inputs. Uses
 * the TextEditor widget to show the contents.
 */
let AbstractTextResourceEditor = class AbstractTextResourceEditor extends AbstractTextCodeEditor {
    constructor(id, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService) {
        super(id, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService);
    }
    async setInput(input, options, context, token) {
        // Set input and resolve
        await super.setInput(input, options, context, token);
        const resolvedModel = await input.resolve();
        // Check for cancellation
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Assert Model instance
        if (!(resolvedModel instanceof BaseTextEditorModel)) {
            throw new Error('Unable to open file as text');
        }
        // Set Editor Model
        const control = assertIsDefined(this.editorControl);
        const textEditorModel = resolvedModel.textEditorModel;
        control.setModel(textEditorModel);
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
        control.updateOptions(this.getReadonlyConfiguration(resolvedModel.isReadonly()));
    }
    /**
     * Reveals the last line of this editor if it has a model set.
     */
    revealLastLine() {
        const control = this.editorControl;
        if (!control) {
            return;
        }
        const model = control.getModel();
        if (model) {
            const lastLine = model.getLineCount();
            control.revealPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) }, 0 /* ScrollType.Smooth */);
        }
    }
    clearInput() {
        super.clearInput();
        // Clear Model
        this.editorControl?.setModel(null);
    }
    tracksEditorViewState(input) {
        // editor view state persistence is only enabled for untitled and resource inputs
        return input instanceof UntitledTextEditorInput || input instanceof TextResourceEditorInput;
    }
};
AbstractTextResourceEditor = __decorate([
    __param(2, ITelemetryService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, ITextResourceConfigurationService),
    __param(6, IThemeService),
    __param(7, IEditorGroupsService),
    __param(8, IEditorService),
    __param(9, IFileService)
], AbstractTextResourceEditor);
export { AbstractTextResourceEditor };
let TextResourceEditor = class TextResourceEditor extends AbstractTextResourceEditor {
    static { TextResourceEditor_1 = this; }
    static { this.ID = 'workbench.editors.textResourceEditor'; }
    constructor(group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, modelService, languageService, fileService) {
        super(TextResourceEditor_1.ID, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService);
        this.modelService = modelService;
        this.languageService = languageService;
    }
    createEditorControl(parent, configuration) {
        super.createEditorControl(parent, configuration);
        // Install a listener for paste to update this editors
        // language if the paste includes a specific language
        const control = this.editorControl;
        if (control) {
            this._register(control.onDidPaste((e) => this.onDidEditorPaste(e, control)));
        }
    }
    onDidEditorPaste(e, codeEditor) {
        if (this.input instanceof UntitledTextEditorInput && this.input.hasLanguageSetExplicitly) {
            return; // do not override language if it was set explicitly
        }
        if (e.range.startLineNumber !== 1 || e.range.startColumn !== 1) {
            return; // document had existing content before the pasted text, don't override.
        }
        if (codeEditor.getOption(96 /* EditorOption.readOnly */)) {
            return; // not for readonly editors
        }
        const textModel = codeEditor.getModel();
        if (!textModel) {
            return; // require a live model
        }
        const pasteIsWholeContents = textModel.getLineCount() === e.range.endLineNumber &&
            textModel.getLineMaxColumn(e.range.endLineNumber) === e.range.endColumn;
        if (!pasteIsWholeContents) {
            return; // document had existing content after the pasted text, don't override.
        }
        const currentLanguageId = textModel.getLanguageId();
        if (currentLanguageId !== PLAINTEXT_LANGUAGE_ID) {
            return; // require current languageId to be unspecific
        }
        let candidateLanguage = undefined;
        // A languageId is provided via the paste event so text was copied using
        // VSCode. As such we trust this languageId and use it if specific
        if (e.languageId) {
            candidateLanguage = { id: e.languageId, source: 'event' };
        }
        // A languageId was not provided, so the data comes from outside VSCode
        // We can still try to guess a good languageId from the first line if
        // the paste changed the first line
        else {
            const guess = this.languageService.guessLanguageIdByFilepathOrFirstLine(textModel.uri, textModel.getLineContent(1).substr(0, 1000 /* ModelConstants.FIRST_LINE_DETECTION_LENGTH_LIMIT */)) ?? undefined;
            if (guess) {
                candidateLanguage = { id: guess, source: 'guess' };
            }
        }
        // Finally apply languageId to model if specified
        if (candidateLanguage && candidateLanguage.id !== PLAINTEXT_LANGUAGE_ID) {
            if (this.input instanceof UntitledTextEditorInput && candidateLanguage.source === 'event') {
                // High confidence, set language id at TextEditorModel level to block future auto-detection
                this.input.setLanguageId(candidateLanguage.id);
            }
            else {
                textModel.setLanguage(this.languageService.createById(candidateLanguage.id));
            }
            const opts = this.modelService.getCreationOptions(textModel.getLanguageId(), textModel.uri, textModel.isForSimpleWidget);
            textModel.detectIndentation(opts.insertSpaces, opts.tabSize);
        }
    }
};
TextResourceEditor = TextResourceEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, ITextResourceConfigurationService),
    __param(5, IThemeService),
    __param(6, IEditorService),
    __param(7, IEditorGroupsService),
    __param(8, IModelService),
    __param(9, ILanguageService),
    __param(10, IFileService)
], TextResourceEditor);
export { TextResourceEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvdGV4dFJlc291cmNlRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbEUsT0FBTyxFQUFzQixxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXJGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSx3REFBd0QsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNF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