/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { NotebookFindScopeType } from '../../../common/notebookCommon.js';
export class NotebookFindFilters extends Disposable {
    get markupInput() {
        return this._markupInput;
    }
    set markupInput(value) {
        if (this._markupInput !== value) {
            this._markupInput = value;
            this._onDidChange.fire({ markupInput: value });
        }
    }
    get markupPreview() {
        return this._markupPreview;
    }
    set markupPreview(value) {
        if (this._markupPreview !== value) {
            this._markupPreview = value;
            this._onDidChange.fire({ markupPreview: value });
        }
    }
    get codeInput() {
        return this._codeInput;
    }
    set codeInput(value) {
        if (this._codeInput !== value) {
            this._codeInput = value;
            this._onDidChange.fire({ codeInput: value });
        }
    }
    get codeOutput() {
        return this._codeOutput;
    }
    set codeOutput(value) {
        if (this._codeOutput !== value) {
            this._codeOutput = value;
            this._onDidChange.fire({ codeOutput: value });
        }
    }
    get findScope() {
        return this._findScope;
    }
    set findScope(value) {
        if (this._findScope !== value) {
            this._findScope = value;
            this._onDidChange.fire({ findScope: true });
        }
    }
    constructor(markupInput, markupPreview, codeInput, codeOutput, findScope) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._markupInput = true;
        this._markupPreview = true;
        this._codeInput = true;
        this._codeOutput = true;
        this._findScope = { findScopeType: NotebookFindScopeType.None };
        this._markupInput = markupInput;
        this._markupPreview = markupPreview;
        this._codeInput = codeInput;
        this._codeOutput = codeOutput;
        this._findScope = findScope;
        this._initialMarkupInput = markupInput;
        this._initialMarkupPreview = markupPreview;
        this._initialCodeInput = codeInput;
        this._initialCodeOutput = codeOutput;
    }
    isModified() {
        // do not include findInSelection or either selectedRanges in the check. This will incorrectly mark the filter icon as modified
        return (this._markupInput !== this._initialMarkupInput ||
            this._markupPreview !== this._initialMarkupPreview ||
            this._codeInput !== this._initialCodeInput ||
            this._codeOutput !== this._initialCodeOutput);
    }
    update(v) {
        this._markupInput = v.markupInput;
        this._markupPreview = v.markupPreview;
        this._codeInput = v.codeInput;
        this._codeOutput = v.codeOutput;
        this._findScope = v.findScope;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZEZpbHRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9maW5kL2ZpbmRGaWx0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFzQixxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBVTdGLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBUWxELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBSSxXQUFXLENBQUMsS0FBYztRQUM3QixJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUE7WUFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUlELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksYUFBYSxDQUFDLEtBQWM7UUFDL0IsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFBO1lBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFH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