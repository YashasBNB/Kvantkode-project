/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelableAsyncIterable, RunOnceScheduler, } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
var HoverOperationState;
(function (HoverOperationState) {
    HoverOperationState[HoverOperationState["Idle"] = 0] = "Idle";
    HoverOperationState[HoverOperationState["FirstWait"] = 1] = "FirstWait";
    HoverOperationState[HoverOperationState["SecondWait"] = 2] = "SecondWait";
    HoverOperationState[HoverOperationState["WaitingForAsync"] = 3] = "WaitingForAsync";
    HoverOperationState[HoverOperationState["WaitingForAsyncShowingLoading"] = 4] = "WaitingForAsyncShowingLoading";
})(HoverOperationState || (HoverOperationState = {}));
export var HoverStartMode;
(function (HoverStartMode) {
    HoverStartMode[HoverStartMode["Delayed"] = 0] = "Delayed";
    HoverStartMode[HoverStartMode["Immediate"] = 1] = "Immediate";
})(HoverStartMode || (HoverStartMode = {}));
export var HoverStartSource;
(function (HoverStartSource) {
    HoverStartSource[HoverStartSource["Mouse"] = 0] = "Mouse";
    HoverStartSource[HoverStartSource["Click"] = 1] = "Click";
    HoverStartSource[HoverStartSource["Keyboard"] = 2] = "Keyboard";
})(HoverStartSource || (HoverStartSource = {}));
export class HoverResult {
    constructor(value, isComplete, hasLoadingMessage, options) {
        this.value = value;
        this.isComplete = isComplete;
        this.hasLoadingMessage = hasLoadingMessage;
        this.options = options;
    }
}
/**
 * Computing the hover is very fine tuned.
 *
 * Suppose the hover delay is 300ms (the default). Then, when resting the mouse at an anchor:
 * - at 150ms, the async computation is triggered (i.e. semantic hover)
 *   - if async results already come in, they are not rendered yet.
 * - at 300ms, the sync computation is triggered (i.e. decorations, markers)
 *   - if there are sync or async results, they are rendered.
 * - at 900ms, if the async computation hasn't finished, a "Loading..." result is added.
 */
export class HoverOperation extends Disposable {
    constructor(_editor, _computer) {
        super();
        this._editor = _editor;
        this._computer = _computer;
        this._onResult = this._register(new Emitter());
        this.onResult = this._onResult.event;
        this._asyncComputationScheduler = this._register(new Debouncer((options) => this._triggerAsyncComputation(options), 0));
        this._syncComputationScheduler = this._register(new Debouncer((options) => this._triggerSyncComputation(options), 0));
        this._loadingMessageScheduler = this._register(new Debouncer((options) => this._triggerLoadingMessage(options), 0));
        this._state = 0 /* HoverOperationState.Idle */;
        this._asyncIterable = null;
        this._asyncIterableDone = false;
        this._result = [];
    }
    dispose() {
        if (this._asyncIterable) {
            this._asyncIterable.cancel();
            this._asyncIterable = null;
        }
        this._options = undefined;
        super.dispose();
    }
    get _hoverTime() {
        return this._editor.getOption(62 /* EditorOption.hover */).delay;
    }
    get _firstWaitTime() {
        return this._hoverTime / 2;
    }
    get _secondWaitTime() {
        return this._hoverTime - this._firstWaitTime;
    }
    get _loadingMessageTime() {
        return 3 * this._hoverTime;
    }
    _setState(state, options) {
        this._options = options;
        this._state = state;
        this._fireResult(options);
    }
    _triggerAsyncComputation(options) {
        this._setState(2 /* HoverOperationState.SecondWait */, options);
        this._syncComputationScheduler.schedule(options, this._secondWaitTime);
        if (this._computer.computeAsync) {
            this._asyncIterableDone = false;
            this._asyncIterable = createCancelableAsyncIterable((token) => this._computer.computeAsync(options, token));
            (async () => {
                try {
                    for await (const item of this._asyncIterable) {
                        if (item) {
                            this._result.push(item);
                            this._fireResult(options);
                        }
                    }
                    this._asyncIterableDone = true;
                    if (this._state === 3 /* HoverOperationState.WaitingForAsync */ ||
                        this._state === 4 /* HoverOperationState.WaitingForAsyncShowingLoading */) {
                        this._setState(0 /* HoverOperationState.Idle */, options);
                    }
                }
                catch (e) {
                    onUnexpectedError(e);
                }
            })();
        }
        else {
            this._asyncIterableDone = true;
        }
    }
    _triggerSyncComputation(options) {
        if (this._computer.computeSync) {
            this._result = this._result.concat(this._computer.computeSync(options));
        }
        this._setState(this._asyncIterableDone ? 0 /* HoverOperationState.Idle */ : 3 /* HoverOperationState.WaitingForAsync */, options);
    }
    _triggerLoadingMessage(options) {
        if (this._state === 3 /* HoverOperationState.WaitingForAsync */) {
            this._setState(4 /* HoverOperationState.WaitingForAsyncShowingLoading */, options);
        }
    }
    _fireResult(options) {
        if (this._state === 1 /* HoverOperationState.FirstWait */ ||
            this._state === 2 /* HoverOperationState.SecondWait */) {
            // Do not send out results before the hover time
            return;
        }
        const isComplete = this._state === 0 /* HoverOperationState.Idle */;
        const hasLoadingMessage = this._state === 4 /* HoverOperationState.WaitingForAsyncShowingLoading */;
        this._onResult.fire(new HoverResult(this._result.slice(0), isComplete, hasLoadingMessage, options));
    }
    start(mode, options) {
        if (mode === 0 /* HoverStartMode.Delayed */) {
            if (this._state === 0 /* HoverOperationState.Idle */) {
                this._setState(1 /* HoverOperationState.FirstWait */, options);
                this._asyncComputationScheduler.schedule(options, this._firstWaitTime);
                this._loadingMessageScheduler.schedule(options, this._loadingMessageTime);
            }
        }
        else {
            switch (this._state) {
                case 0 /* HoverOperationState.Idle */:
                    this._triggerAsyncComputation(options);
                    this._syncComputationScheduler.cancel();
                    this._triggerSyncComputation(options);
                    break;
                case 2 /* HoverOperationState.SecondWait */:
                    this._syncComputationScheduler.cancel();
                    this._triggerSyncComputation(options);
                    break;
            }
        }
    }
    cancel() {
        this._asyncComputationScheduler.cancel();
        this._syncComputationScheduler.cancel();
        this._loadingMessageScheduler.cancel();
        if (this._asyncIterable) {
            this._asyncIterable.cancel();
            this._asyncIterable = null;
        }
        this._result = [];
        this._options = undefined;
        this._state = 0 /* HoverOperationState.Idle */;
    }
    get options() {
        return this._options;
    }
}
class Debouncer extends Disposable {
    constructor(runner, debounceTimeMs) {
        super();
        this._scheduler = this._register(new RunOnceScheduler(() => runner(this._options), debounceTimeMs));
    }
    schedule(options, debounceTimeMs) {
        this._options = options;
        this._scheduler.schedule(debounceTimeMs);
    }
    cancel() {
        this._scheduler.cancel();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJPcGVyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2hvdmVyT3BlcmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFHTiw2QkFBNkIsRUFDN0IsZ0JBQWdCLEdBQ2hCLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWVqRSxJQUFXLG1CQU1WO0FBTkQsV0FBVyxtQkFBbUI7SUFDN0IsNkRBQUksQ0FBQTtJQUNKLHVFQUFTLENBQUE7SUFDVCx5RUFBVSxDQUFBO0lBQ1YsbUZBQW1CLENBQUE7SUFDbkIsK0dBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQU5VLG1CQUFtQixLQUFuQixtQkFBbUIsUUFNN0I7QUFFRCxNQUFNLENBQU4sSUFBa0IsY0FHakI7QUFIRCxXQUFrQixjQUFjO0lBQy9CLHlEQUFXLENBQUE7SUFDWCw2REFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixjQUFjLEtBQWQsY0FBYyxRQUcvQjtBQUVELE1BQU0sQ0FBTixJQUFrQixnQkFJakI7QUFKRCxXQUFrQixnQkFBZ0I7SUFDakMseURBQVMsQ0FBQTtJQUNULHlEQUFTLENBQUE7SUFDVCwrREFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUppQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBSWpDO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDaUIsS0FBZ0IsRUFDaEIsVUFBbUIsRUFDbkIsaUJBQTBCLEVBQzFCLE9BQWM7UUFIZCxVQUFLLEdBQUwsS0FBSyxDQUFX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