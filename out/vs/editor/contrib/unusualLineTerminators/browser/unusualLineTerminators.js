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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW51c3VhbExpbmVUZXJtaW5hdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3VudXN1YWxMaW5lVGVybWluYXRvcnMvYnJvd3Nlci91bnVzdWFsTGluZVRlcm1pbmF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBSW5GLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUF1QixjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVwRyxNQUFNLDRCQUE0QixHQUFHLDhCQUE4QixDQUFBO0FBRW5FLFNBQVMsZ0JBQWdCLENBQ3hCLGlCQUFxQyxFQUNyQyxLQUFpQixFQUNqQixLQUFjO0lBRWQsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSw0QkFBNEIsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNuRixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQ3ZCLGlCQUFxQyxFQUNyQyxLQUFpQjtJQUVqQixPQUFPLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtBQUNuRixDQUFDO0FBRU0sSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO2FBQ3RDLE9BQUUsR0FBRywrQ0FBK0MsQUFBbEQsQ0FBa0Q7SUFLM0UsWUFDa0IsT0FBb0IsRUFDckIsY0FBK0MsRUFDM0Msa0JBQXVEO1FBRTNFLEtBQUssRUFBRSxDQUFBO1FBSlUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNKLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUMxQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBTHBFLHdCQUFtQixHQUFZLEtBQUssQ0FBQTtRQVMzQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUywrQ0FBcUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsQ0FBQyxVQUFVLCtDQUFxQyxFQUFFLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLCtDQUFxQyxDQUFBO2dCQUMxRSxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUE7UUFDdkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNqQixtQ0FBbUM7Z0JBQ25DLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUE7UUFDdkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFBO0lBQ3ZDLENBQUM7SUFFTyxLQUFLLENBQUMsK0JBQStCO1FBQzVDLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUM1QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsRUFBRSxDQUFDO1lBQ2pELE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRSxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMxQiwrQkFBK0I7WUFDL0IsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxnQ0FBdUIsRUFBRSxDQUFDO1lBQ25ELDZCQUE2QjtZQUM3QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUM3QixjQUFjO1lBQ2QsS0FBSyxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtZQUNoRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDOUIsc0RBQXNEO1lBQ3RELDBCQUEwQjtZQUMxQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksTUFBMkIsQ0FBQTtRQUMvQixJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO1lBQy9CLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDO2dCQUMxQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwwQkFBMEIsQ0FBQztnQkFDL0UsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3BCLGdDQUFnQyxFQUNoQyxtQ0FBbUMsQ0FDbkM7Z0JBQ0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ25CLCtCQUErQixFQUMvQiw4T0FBOE8sRUFDOU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FDbkI7Z0JBQ0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQzFCLEVBQUUsR0FBRyxFQUFFLDRCQUE0QixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDekUsbUNBQW1DLENBQ25DO2dCQUNELFlBQVksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLFFBQVEsQ0FBQzthQUNyRSxDQUFDLENBQUE7UUFDSCxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsbUJBQW1CLEdBQUcsS0FBSyxDQUFBO1FBQ2pDLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3ZCLCtCQUErQjtZQUMvQixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3RELE9BQU07UUFDUCxDQUFDO1FBRUQsS0FBSyxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtJQUNqRSxDQUFDOztBQTFHVyw4QkFBOEI7SUFReEMsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtCQUFrQixDQUFBO0dBVFIsOEJBQThCLENBMkcxQzs7QUFFRCwwQkFBMEIsQ0FDekIsOEJBQThCLENBQUMsRUFBRSxFQUNqQyw4QkFBOEIsMkRBRTlCLENBQUEifQ==