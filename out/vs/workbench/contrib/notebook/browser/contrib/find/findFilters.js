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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZEZpbHRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZmluZC9maW5kRmlsdGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBc0IscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVU3RixNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBVTtJQVFsRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVELElBQUksV0FBVyxDQUFDLEtBQWM7UUFDN0IsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFJRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLGFBQWEsQ0FBQyxLQUFjO1FBQy9CLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQTtZQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBR0QsSUFB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