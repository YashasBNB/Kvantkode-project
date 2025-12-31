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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVwbE5vdGVib29rL2Jyb3dzZXIvcmVwbEVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUVuRyxPQUFPLEVBQWdCLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRyxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDdkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBFQUEwRSxD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