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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL3RleHRSZXNvdXJjZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWxFLE9BQU8sRUFBc0IscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVyRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRixPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDdEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVqRixPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sd0RBQXdELENBQUE7QUFFL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFP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