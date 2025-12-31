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
var UntitledTextEditorModel_1;
import { BaseTextEditorModel } from '../../../common/editor/textEditorModel.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Emitter } from '../../../../base/common/event.js';
import { IWorkingCopyBackupService } from '../../workingCopy/common/workingCopyBackup.js';
import { ITextResourceConfigurationService, } from '../../../../editor/common/services/textResourceConfiguration.js';
import { createTextBufferFactory, createTextBufferFactoryFromStream, } from '../../../../editor/common/model/textModel.js';
import { IWorkingCopyService } from '../../workingCopy/common/workingCopyService.js';
import { NO_TYPE_ID, } from '../../workingCopy/common/workingCopy.js';
import { ITextFileService, } from '../../textfile/common/textfiles.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ensureValidWordDefinition } from '../../../../editor/common/core/wordHelper.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { getCharContainingOffset } from '../../../../base/common/strings.js';
import { UTF8 } from '../../textfile/common/encoding.js';
import { bufferToReadable, bufferToStream, VSBuffer, } from '../../../../base/common/buffer.js';
import { ILanguageDetectionService } from '../../languageDetection/common/languageDetectionWorkerService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
let UntitledTextEditorModel = class UntitledTextEditorModel extends BaseTextEditorModel {
    static { UntitledTextEditorModel_1 = this; }
    static { this.FIRST_LINE_NAME_MAX_LENGTH = 40; }
    static { this.FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH = this.FIRST_LINE_NAME_MAX_LENGTH * 10; }
    // Support the special '${activeEditorLanguage}' language by
    // looking up the language id from the editor that is active
    // before the untitled editor opens. This special id is only
    // used for the initial language and can be changed after the
    // fact (either manually or through auto-detection).
    static { this.ACTIVE_EDITOR_LANGUAGE_ID = '${activeEditorLanguage}'; }
    get name() {
        // Take name from first line if present and only if
        // we have no associated file path. In that case we
        // prefer the file name as title.
        if (this.configuredLabelFormat === 'content' &&
            !this.hasAssociatedFilePath &&
            this.cachedModelFirstLineWords) {
            return this.cachedModelFirstLineWords;
        }
        // Otherwise fallback to resource
        return this.labelService.getUriBasenameLabel(this.resource);
    }
    //#endregion
    constructor(resource, hasAssociatedFilePath, initialValue, preferredLanguageId, preferredEncoding, languageService, modelService, workingCopyBackupService, textResourceConfigurationService, workingCopyService, textFileService, labelService, editorService, languageDetectionService, accessibilityService) {
        super(modelService, languageService, languageDetectionService, accessibilityService);
        this.resource = resource;
        this.hasAssociatedFilePath = hasAssociatedFilePath;
        this.initialValue = initialValue;
        this.preferredLanguageId = preferredLanguageId;
        this.preferredEncoding = preferredEncoding;
        this.workingCopyBackupService = workingCopyBackupService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.workingCopyService = workingCopyService;
        this.textFileService = textFileService;
        this.labelService = labelService;
        this.editorService = editorService;
        //#region Events
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidChangeName = this._register(new Emitter());
        this.onDidChangeName = this._onDidChangeName.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeEncoding = this._register(new Emitter());
        this.onDidChangeEncoding = this._onDidChangeEncoding.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidRevert = this._register(new Emitter());
        this.onDidRevert = this._onDidRevert.event;
        //#endregion
        this.typeId = NO_TYPE_ID; // IMPORTANT: never change this to not break existing assumptions (e.g. backups)
        this.capabilities = 2 /* WorkingCopyCapabilities.Untitled */;
        //#region Name
        this.configuredLabelFormat = 'content';
        this.cachedModelFirstLineWords = undefined;
        //#endregion
        //#region Resolve
        this.ignoreDirtyOnModelContentChange = false;
        this.dirty = this.hasAssociatedFilePath || !!this.initialValue;
        // Make known to working copy service
        this._register(this.workingCopyService.registerWorkingCopy(this));
        // This is typically controlled by the setting `files.defaultLanguage`.
        // If that setting is set, we should not detect the language.
        if (preferredLanguageId) {
            this.setLanguageId(preferredLanguageId);
        }
        // Fetch config
        this.onConfigurationChange(undefined, false);
        this.registerListeners();
    }
    registerListeners() {
        // Config Changes
        this._register(this.textResourceConfigurationService.onDidChangeConfiguration((e) => this.onConfigurationChange(e, true)));
    }
    onConfigurationChange(e, fromEvent) {
        // Encoding
        if (!e || e.affectsConfiguration(this.resource, 'files.encoding')) {
            const configuredEncoding = this.textResourceConfigurationService.getValue(this.resource, 'files.encoding');
            if (this.configuredEncoding !== configuredEncoding &&
                typeof configuredEncoding === 'string') {
                this.configuredEncoding = configuredEncoding;
                if (fromEvent && !this.preferredEncoding) {
                    this._onDidChangeEncoding.fire(); // do not fire event if we have a preferred encoding set
                }
            }
        }
        // Label Format
        if (!e || e.affectsConfiguration(this.resource, 'workbench.editor.untitled.labelFormat')) {
            const configuredLabelFormat = this.textResourceConfigurationService.getValue(this.resource, 'workbench.editor.untitled.labelFormat');
            if (this.configuredLabelFormat !== configuredLabelFormat &&
                (configuredLabelFormat === 'content' || configuredLabelFormat === 'name')) {
                this.configuredLabelFormat = configuredLabelFormat;
                if (fromEvent) {
                    this._onDidChangeName.fire();
                }
            }
        }
    }
    //#region Language
    setLanguageId(languageId, source) {
        const actualLanguage = languageId === UntitledTextEditorModel_1.ACTIVE_EDITOR_LANGUAGE_ID
            ? this.editorService.activeTextEditorLanguageId
            : languageId;
        this.preferredLanguageId = actualLanguage;
        if (actualLanguage) {
            super.setLanguageId(actualLanguage, source);
        }
    }
    getLanguageId() {
        if (this.textEditorModel) {
            return this.textEditorModel.getLanguageId();
        }
        return this.preferredLanguageId;
    }
    getEncoding() {
        return this.preferredEncoding || this.configuredEncoding;
    }
    async setEncoding(encoding) {
        const oldEncoding = this.getEncoding();
        this.preferredEncoding = encoding;
        // Emit if it changed
        if (oldEncoding !== this.preferredEncoding) {
            this._onDidChangeEncoding.fire();
        }
    }
    isDirty() {
        return this.dirty;
    }
    isModified() {
        return this.isDirty();
    }
    setDirty(dirty) {
        if (this.dirty === dirty) {
            return;
        }
        this.dirty = dirty;
        this._onDidChangeDirty.fire();
    }
    //#endregion
    //#region Save / Revert / Backup
    async save(options) {
        const target = await this.textFileService.save(this.resource, options);
        // Emit as event
        if (target) {
            this._onDidSave.fire({ reason: options?.reason, source: options?.source });
        }
        return !!target;
    }
    async revert() {
        // Reset contents to be empty
        this.ignoreDirtyOnModelContentChange = true;
        try {
            this.updateTextEditorModel(createTextBufferFactory(''));
        }
        finally {
            this.ignoreDirtyOnModelContentChange = false;
        }
        // No longer dirty
        this.setDirty(false);
        // Emit as event
        this._onDidRevert.fire();
    }
    async backup(token) {
        let content = undefined;
        // Make sure to check whether this model has been resolved
        // or not and fallback to the initial value - if any - to
        // prevent backing up an unresolved model and loosing the
        // initial value.
        if (this.isResolved()) {
            // Fill in content the same way we would do when saving the file
            // via the text file service encoding support (hardcode UTF-8)
            content = await this.textFileService.getEncodedReadable(this.resource, this.createSnapshot() ?? undefined, { encoding: UTF8 });
        }
        else if (typeof this.initialValue === 'string') {
            content = bufferToReadable(VSBuffer.fromString(this.initialValue));
        }
        return { content };
    }
    async resolve() {
        // Create text editor model if not yet done
        let createdUntitledModel = false;
        let hasBackup = false;
        if (!this.textEditorModel) {
            let untitledContents;
            // Check for backups or use initial value or empty
            const backup = await this.workingCopyBackupService.resolve(this);
            if (backup) {
                untitledContents = backup.value;
                hasBackup = true;
            }
            else {
                untitledContents = bufferToStream(VSBuffer.fromString(this.initialValue || ''));
            }
            // Determine untitled contents based on backup
            // or initial value. We must use text file service
            // to create the text factory to respect encodings
            // accordingly.
            const untitledContentsFactory = await createTextBufferFactoryFromStream(await this.textFileService.getDecodedStream(this.resource, untitledContents, {
                encoding: UTF8,
            }));
            this.createTextEditorModel(untitledContentsFactory, this.resource, this.preferredLanguageId);
            createdUntitledModel = true;
        }
        // Otherwise: the untitled model already exists and we must assume
        // that the value of the model was changed by the user. As such we
        // do not update the contents, only the language if configured.
        else {
            this.updateTextEditorModel(undefined, this.preferredLanguageId);
        }
        // Listen to text model events
        const textEditorModel = assertIsDefined(this.textEditorModel);
        this.installModelListeners(textEditorModel);
        // Only adjust name and dirty state etc. if we
        // actually created the untitled model
        if (createdUntitledModel) {
            // Name
            if (hasBackup || this.initialValue) {
                this.updateNameFromFirstLine(textEditorModel);
            }
            // Untitled associated to file path are dirty right away as well as untitled with content
            this.setDirty(this.hasAssociatedFilePath || !!hasBackup || !!this.initialValue);
            // If we have initial contents, make sure to emit this
            // as the appropiate events to the outside.
            if (hasBackup || this.initialValue) {
                this._onDidChangeContent.fire();
            }
        }
        return super.resolve();
    }
    installModelListeners(model) {
        this._register(model.onDidChangeContent((e) => this.onModelContentChanged(model, e)));
        this._register(model.onDidChangeLanguage(() => this.onConfigurationChange(undefined, true))); // language change can have impact on config
        super.installModelListeners(model);
    }
    onModelContentChanged(textEditorModel, e) {
        if (!this.ignoreDirtyOnModelContentChange) {
            // mark the untitled text editor as non-dirty once its content becomes empty and we do
            // not have an associated path set. we never want dirty indicator in that case.
            if (!this.hasAssociatedFilePath &&
                textEditorModel.getLineCount() === 1 &&
                textEditorModel.getLineLength(1) === 0) {
                this.setDirty(false);
            }
            // turn dirty otherwise
            else {
                this.setDirty(true);
            }
        }
        // Check for name change if first line changed in the range of 0-FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH columns
        if (e.changes.some((change) => (change.range.startLineNumber === 1 || change.range.endLineNumber === 1) &&
            change.range.startColumn <= UntitledTextEditorModel_1.FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH)) {
            this.updateNameFromFirstLine(textEditorModel);
        }
        // Emit as general content change event
        this._onDidChangeContent.fire();
        // Detect language from content
        this.autoDetectLanguage();
    }
    updateNameFromFirstLine(textEditorModel) {
        if (this.hasAssociatedFilePath) {
            return; // not in case of an associated file path
        }
        // Determine the first words of the model following these rules:
        // - cannot be only whitespace (so we trim())
        // - cannot be only non-alphanumeric characters (so we run word definition regex over it)
        // - cannot be longer than FIRST_LINE_MAX_TITLE_LENGTH
        // - normalize multiple whitespaces to a single whitespace
        let modelFirstWordsCandidate = undefined;
        let firstLineText = textEditorModel
            .getValueInRange({
            startLineNumber: 1,
            endLineNumber: 1,
            startColumn: 1,
            endColumn: UntitledTextEditorModel_1.FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH + 1, // first cap at FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH
        })
            .trim()
            .replace(/\s+/g, ' ') // normalize whitespaces
            .replace(/\u202E/g, ''); // drop Right-to-Left Override character (#190133)
        firstLineText = firstLineText.substr(0, getCharContainingOffset(
        // finally cap at FIRST_LINE_NAME_MAX_LENGTH (grapheme aware #111235)
        firstLineText, UntitledTextEditorModel_1.FIRST_LINE_NAME_MAX_LENGTH)[0]);
        if (firstLineText && ensureValidWordDefinition().exec(firstLineText)) {
            modelFirstWordsCandidate = firstLineText;
        }
        if (modelFirstWordsCandidate !== this.cachedModelFirstLineWords) {
            this.cachedModelFirstLineWords = modelFirstWordsCandidate;
            this._onDidChangeName.fire();
        }
    }
    //#endregion
    isReadonly() {
        return false;
    }
};
UntitledTextEditorModel = UntitledTextEditorModel_1 = __decorate([
    __param(5, ILanguageService),
    __param(6, IModelService),
    __param(7, IWorkingCopyBackupService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IWorkingCopyService),
    __param(10, ITextFileService),
    __param(11, ILabelService),
    __param(12, IEditorService),
    __param(13, ILanguageDetectionService),
    __param(14, IAccessibilityService)
], UntitledTextEditorModel);
export { UntitledTextEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdW50aXRsZWQvY29tbW9uL3VudGl0bGVkVGV4dEVkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3pGLE9BQU8sRUFFTixpQ0FBaUMsR0FDakMsTUFBTSxpRUFBaUUsQ0FBQTtBQUV4RSxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLGlDQUFpQyxHQUNqQyxNQUFNLDhDQUE4QyxDQUFBO0FBRXJELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BGLE9BQU8sRUFJTixVQUFVLEdBRVYsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBR04sZ0JBQWdCLEdBQ2hCLE1BQU0sb0NBQW9DLENBQUE7QUFFM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1B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