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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGxFeGVjdXRpb25JY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NvZGVDZWxsRXhlY3V0aW9uSWNvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXRFLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUVOLDhCQUE4QixFQUM5QixxQkFBcUIsR0FDckIsTUFBTSxrREFBa0QsQ0FBQTtBQU9sRCxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7SUFHN0QsWUFDQyxlQUF3QyxFQUN2QixLQUFxQixFQUNyQixRQUFxQixFQUNOLHNCQUE4RDtRQUU5RixLQUFLLEVBQUUsQ0FBQTtRQUpVLFVBQUssR0FBTCxLQUFLLENBQWdCO1FBQ3JCLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDRSwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQWdDO1FBTnZGLGFBQVEsR0FBRyxLQUFLLENBQUE7UUFVdkIsSUFBSSxDQUFDLE9BQU8s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