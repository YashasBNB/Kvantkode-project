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
var ReplEditorInput_1;
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IInteractiveHistoryService } from '../../interactive/browser/interactiveHistoryService.js';
import { CellKind, NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { NotebookEditorInput, } from '../../notebook/common/notebookEditorInput.js';
import { INotebookEditorModelResolverService } from '../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const replTabIcon = registerIcon('repl-editor-label-icon', Codicon.debugLineByLine, localize('replEditorLabelIcon', 'Icon of the REPL editor label.'));
let ReplEditorInput = class ReplEditorInput extends NotebookEditorInput {
    static { ReplEditorInput_1 = this; }
    static { this.ID = 'workbench.editorinputs.replEditorInput'; }
    constructor(resource, label, _notebookService, _notebookModelResolverService, _fileDialogService, labelService, fileService, filesConfigurationService, extensionService, editorService, textResourceConfigurationService, customEditorLabelService, historyService, _textModelService, configurationService) {
        super(resource, undefined, 'jupyter-notebook', {}, _notebookService, _notebookModelResolverService, _fileDialogService, labelService, fileService, filesConfigurationService, extensionService, editorService, textResourceConfigurationService, customEditorLabelService);
        this.historyService = historyService;
        this._textModelService = _textModelService;
        this.isDisposing = false;
        this.isScratchpad =
            resource.scheme === 'untitled' &&
                configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true;
        this.label = label ?? this.createEditorLabel(resource);
    }
    getIcon() {
        return replTabIcon;
    }
    createEditorLabel(resource) {
        if (!resource) {
            return 'REPL';
        }
        if (resource.scheme === 'untitled') {
            const match = new RegExp('Untitled-(\\d+)\.').exec(resource.path);
            if (match?.length === 2) {
                return `REPL - ${match[1]}`;
            }
        }
        const filename = resource.path.split('/').pop();
        return filename ? `REPL - ${filename}` : 'REPL';
    }
    get typeId() {
        return ReplEditorInput_1.ID;
    }
    get editorId() {
        return 'repl';
    }
    getName() {
        return this.label;
    }
    get editorInputs() {
        return [this];
    }
    get capabilities() {
        const capabilities = super.capabilities;
        const scratchPad = this.isScratchpad ? 512 /* EditorInputCapabilities.Scratchpad */ : 0;
        return capabilities | 2 /* EditorInputCapabilities.Readonly */ | scratchPad;
    }
    async resolve() {
        const model = await super.resolve();
        if (model) {
            this.ensureInputBoxCell(model.notebook);
        }
        return model;
    }
    ensureInputBoxCell(notebook) {
        const lastCell = notebook.cells[notebook.cells.length - 1];
        if (!lastCell ||
            lastCell.cellKind === CellKind.Markup ||
            lastCell.outputs.length > 0 ||
            lastCell.internalMetadata.executionOrder !== undefined) {
            notebook.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: notebook.cells.length,
                    count: 0,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            mime: undefined,
                            outputs: [],
                            source: '',
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, false);
        }
    }
    async resolveInput(notebook) {
        if (this.inputModelRef) {
            return this.inputModelRef.object.textEditorModel;
        }
        const lastCell = notebook.cells[notebook.cells.length - 1];
        if (!lastCell) {
            throw new Error('The REPL editor requires at least one cell for the input box.');
        }
        this.inputModelRef = await this._textModelService.createModelReference(lastCell.uri);
        return this.inputModelRef.object.textEditorModel;
    }
    dispose() {
        if (!this.isDisposing) {
            this.isDisposing = true;
            this.editorModelReference?.object.revert({ soft: true });
            this.inputModelRef?.dispose();
            super.dispose();
        }
    }
};
ReplEditorInput = ReplEditorInput_1 = __decorate([
    __param(2, INotebookService),
    __param(3, INotebookEditorModelResolverService),
    __param(4, IFileDialogService),
    __param(5, ILabelService),
    __param(6, IFileService),
    __param(7, IFilesConfigurationService),
    __param(8, IExtensionService),
    __param(9, IEditorService),
    __param(10, ITextResourceConfigurationService),
    __param(11, ICustomEditorLabelService),
    __param(12, IInteractiveHistoryService),
    __param(13, ITextModelService),
    __param(14, IConfigurationService)
], ReplEditorInput);
export { ReplEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZXBsTm90ZWJvb2svYnJvd3Nlci9yZXBsRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRW5HLE9BQU8sRUFBZ0IsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pHLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLDBC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