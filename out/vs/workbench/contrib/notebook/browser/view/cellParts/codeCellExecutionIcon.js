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
import * as DOM from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { errorStateIcon, executingStateIcon, pendingStateIcon, successStateIcon, } from '../../notebookIcons.js';
import { NotebookCellExecutionState, } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
let CollapsedCodeCellExecutionIcon = class CollapsedCodeCellExecutionIcon extends Disposable {
    constructor(_notebookEditor, _cell, _element, _executionStateService) {
        super();
        this._cell = _cell;
        this._element = _element;
        this._executionStateService = _executionStateService;
        this._visible = false;
        this._update();
        this._register(this._executionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell && e.affectsCell(this._cell.uri)) {
                this._update();
            }
        }));
        this._register(this._cell.model.onDidChangeInternalMetadata(() => this._update()));
    }
    setVisibility(visible) {
        this._visible = visible;
        this._update();
    }
    _update() {
        if (!this._visible) {
            return;
        }
        const runState = this._executionStateService.getCellExecution(this._cell.uri);
        const item = this._getItemForState(runState, this._cell.model.internalMetadata);
        if (item) {
            this._element.style.display = '';
            DOM.reset(this._element, ...renderLabelWithIcons(item.text));
            this._element.title = item.tooltip ?? '';
        }
        else {
            this._element.style.display = 'none';
            DOM.reset(this._element);
        }
    }
    _getItemForState(runState, internalMetadata) {
        const state = runState?.state;
        const { lastRunSuccess } = internalMetadata;
        if (!state && lastRunSuccess) {
            return {
                text: `$(${successStateIcon.id})`,
                tooltip: localize('notebook.cell.status.success', 'Success'),
            };
        }
        else if (!state && lastRunSuccess === false) {
            return {
                text: `$(${errorStateIcon.id})`,
                tooltip: localize('notebook.cell.status.failure', 'Failure'),
            };
        }
        else if (state === NotebookCellExecutionState.Pending ||
            state === NotebookCellExecutionState.Unconfirmed) {
            return {
                text: `$(${pendingStateIcon.id})`,
                tooltip: localize('notebook.cell.status.pending', 'Pending'),
            };
        }
        else if (state === NotebookCellExecutionState.Executing) {
            const icon = ThemeIcon.modify(executingStateIcon, 'spin');
            return {
                text: `$(${icon.id})`,
                tooltip: localize('notebook.cell.status.executing', 'Executing'),
            };
        }
        return;
    }
};
CollapsedCodeCellExecutionIcon = __decorate([
    __param(3, INotebookExecutionStateService)
], CollapsedCodeCellExecutionIcon);
export { CollapsedCodeCellExecutionIcon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGxFeGVjdXRpb25JY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jb2RlQ2VsbEV4ZWN1dGlvbkljb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV0RSxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFFTiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBQ3JCLE1BQU0sa0RBQWtELENBQUE7QUFPbEQsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO0lBRzdELFlBQ0MsZUFBd0MsRUFDdkIsS0FBcUIsRUFDckIsUUFBcUIsRUFDTixzQkFBOEQ7UUFFOUYsS0FBSyxFQUFFLENBQUE7UUFKVSxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNyQixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ0UsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFnQztRQU52RixhQUFRLEdBQUcsS0FBSyxDQUFBO1FBVXZCLElBQUksQ0FBQyxPQUFPLEVBQUUs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