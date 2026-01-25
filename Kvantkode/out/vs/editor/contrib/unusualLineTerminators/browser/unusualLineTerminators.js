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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/resources.js';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import * as nls from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
const ignoreUnusualLineTerminators = 'ignoreUnusualLineTerminators';
function writeIgnoreState(codeEditorService, model, state) {
    codeEditorService.setModelProperty(model.uri, ignoreUnusualLineTerminators, state);
}
function readIgnoreState(codeEditorService, model) {
    return codeEditorService.getModelProperty(model.uri, ignoreUnusualLineTerminators);
}
let UnusualLineTerminatorsDetector = class UnusualLineTerminatorsDetector extends Disposable {
    static { this.ID = 'editor.contrib.unusualLineTerminatorsDetector'; }
    constructor(_editor, _dialogService, _codeEditorService) {
        super();
        this._editor = _editor;
        this._dialogService = _dialogService;
        this._codeEditorService = _codeEditorService;
        this._isPresentingDialog = false;
        this._config = this._editor.getOption(131 /* EditorOption.unusualLineTerminators */);
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(131 /* EditorOption.unusualLineTerminators */)) {
                this._config = this._editor.getOption(131 /* EditorOption.unusualLineTerminators */);
                this._checkForUnusualLineTerminators();
            }
        }));
        this._register(this._editor.onDidChangeModel(() => {
            this._checkForUnusualLineTerminators();
        }));
        this._register(this._editor.onDidChangeModelContent((e) => {
            if (e.isUndoing) {
                // skip checking in case of undoing
                return;
            }
            this._checkForUnusualLineTerminators();
        }));
        this._checkForUnusualLineTerminators();
    }
    async _checkForUnusualLineTerminators() {
        if (this._config === 'off') {
            return;
        }
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        if (!model.mightContainUnusualLineTerminators()) {
            return;
        }
        const ignoreState = readIgnoreState(this._codeEditorService, model);
        if (ignoreState === true) {
            // this model should be ignored
            return;
        }
        if (this._editor.getOption(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return;
        }
        if (this._config === 'auto') {
            // just do it!
            model.removeUnusualLineTerminators(this._editor.getSelections());
            return;
        }
        if (this._isPresentingDialog) {
            // we're currently showing the dialog, which is async.
            // avoid spamming the user
            return;
        }
        let result;
        try {
            this._isPresentingDialog = true;
            result = await this._dialogService.confirm({
                title: nls.localize('unusualLineTerminators.title', 'Unusual Line Terminators'),
                message: nls.localize('unusualLineTerminators.message', 'Detected unusual line terminators'),
                detail: nls.localize('unusualLineTerminators.detail', "The file '{0}' contains one or more unusual line terminator characters, like Line Separator (LS) or Paragraph Separator (PS).\n\nIt is recommended to remove them from the file. This can be configured via `editor.unusualLineTerminators`.", basename(model.uri)),
                primaryButton: nls.localize({ key: 'unusualLineTerminators.fix', comment: ['&& denotes a mnemonic'] }, '&&Remove Unusual Line Terminators'),
                cancelButton: nls.localize('unusualLineTerminators.ignore', 'Ignore'),
            });
        }
        finally {
            this._isPresentingDialog = false;
        }
        if (!result.confirmed) {
            // this model should be ignored
            writeIgnoreState(this._codeEditorService, model, true);
            return;
        }
        model.removeUnusualLineTerminators(this._editor.getSelections());
    }
};
UnusualLineTerminatorsDetector = __decorate([
    __param(1, IDialogService),
    __param(2, ICodeEditorService)
], UnusualLineTerminatorsDetector);
export { UnusualLineTerminatorsDetector };
registerEditorContribution(UnusualLineTerminatorsDetector.ID, UnusualLineTerminatorsDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW51c3VhbExpbmVUZXJtaW5hdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvdW51c3VhbExpbmVUZXJtaW5hdG9ycy9icm93c2VyL3VudXN1YWxMaW5lVGVybWluYXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRCxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFJbkYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQXVCLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXBHLE1BQU0sNEJBQTRCLEdBQUcsOEJBQThCLENBQUE7QUFFbkUsU0FBUyxnQkFBZ0IsQ0FDeEIsaUJBQXFDLEVBQ3JDLEtBQWlCLEVBQ2pCLEtBQWM7SUFFZCxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ25GLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FDdkIsaUJBQXFDLEVBQ3JDLEtBQWlCO0lBRWpCLE9BQU8saUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO0FBQ25GLENBQUM7QUFFTSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7YUFDdEMsT0FBRSxHQUFHLCtDQUErQyxBQUFsRCxDQUFrRDtJQUszRSxZQUNrQixP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