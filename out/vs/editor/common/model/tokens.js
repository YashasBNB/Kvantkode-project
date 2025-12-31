/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { LineRange } from '../core/lineRange.js';
/**
 * @internal
 */
export class AttachedViews {
    constructor() {
        this._onDidChangeVisibleRanges = new Emitter();
        this.onDidChangeVisibleRanges = this._onDidChangeVisibleRanges.event;
        this._views = new Set();
    }
    attachView() {
        const view = new AttachedViewImpl((state) => {
            this._onDidChangeVisibleRanges.fire({ view, state });
        });
        this._views.add(view);
        return view;
    }
    detachView(view) {
        this._views.delete(view);
        this._onDidChangeVisibleRanges.fire({ view, state: undefined });
    }
}
class AttachedViewImpl {
    constructor(handleStateChange) {
        this.handleStateChange = handleStateChange;
    }
    setVisibleLines(visibleLines, stabilized) {
        const visibleLineRanges = visibleLines.map((line) => new LineRange(line.startLineNumber, line.endLineNumber + 1));
        this.handleStateChange({ visibleLineRanges, stabilized });
    }
}
export class AttachedViewHandler extends Disposable {
    get lineRanges() {
        return this._lineRanges;
    }
    constructor(_refreshTokens) {
        super();
        this._refreshTokens = _refreshTokens;
        this.runner = this._register(new RunOnceScheduler(() => this.update(), 50));
        this._computedLineRanges = [];
        this._lineRanges = [];
    }
    update() {
        if (equals(this._computedLineRanges, this._lineRanges, (a, b) => a.equals(b))) {
            return;
        }
        this._computedLineRanges = this._lineRanges;
        this._refreshTokens();
    }
    handleStateChange(state) {
        this._lineRanges = state.visibleLineRanges;
        if (state.stabilized) {
            this.runner.cancel();
            this.update();
        }
        else {
            this.runner.schedule();
        }
    }
}
export class AbstractTokens extends Disposable {
    get backgroundTokenizationState() {
        return this._backgroundTokenizationState;
    }
    constructor(_languageIdCodec, _textModel, getLanguageId) {
        super();
        this._languageIdCodec = _languageIdCodec;
        this._textModel = _textModel;
        this.getLanguageId = getLanguageId;
        this._onDidChangeTokens = this._register(new Emitter());
        /** @internal, should not be exposed by the text model! */
        this.onDidChangeTokens = this._onDidChangeTokens.event;
    }
    tokenizeIfCheap(lineNumber) {
        if (this.isCheapToTokenize(lineNumber)) {
            this.forceTokenization(lineNumber);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90b2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBU2hEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFBMUI7UUFDa0IsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBR3BELENBQUE7UUFDWSw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO1FBRTlELFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQTtJQWN0RCxDQUFDO0lBWk8sVUFBVTtRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLGdCQUFnQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3JELENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sVUFBVSxDQUFDLElBQW1CO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQXdCLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMs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