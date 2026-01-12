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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJPcGVyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvaG92ZXJPcGVyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLDZCQUE2QixFQUM3QixnQkFBZ0IsR0FDaEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBZWpFLElBQVcsbUJBTVY7QUFORCxXQUFXLG1CQUFtQjtJQUM3Qiw2REFBSSxDQUFBO0lBQ0osdUVBQVMsQ0FBQTtJQUNULHlFQUFVLENBQUE7SUFDVixtRkFBbUIsQ0FBQTtJQUNuQiwrR0FBaUMsQ0FBQTtBQUNsQyxDQUFDLEVBTlUsbUJBQW1CLEtBQW5CLG1CQUFtQixRQU03QjtBQUVELE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDL0IseURBQVcsQ0FBQTtJQUNYLDZEQUFhLENBQUE7QUFDZCxDQUFDLEVBSGlCLGNBQWMsS0FBZCxjQUFjLFFBRy9CO0FBRUQsTUFBTSxDQUFOLElBQWtCLGdCQUlqQjtBQUpELFdBQWtCLGdCQUFnQjtJQUNqQyx5REFBUyxDQUFBO0lBQ1QseURBQVMsQ0FBQTtJQUNULCtEQUFZLENBQUE7QUFDYixDQUFDLEVBSmlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFJakM7QUFFRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixLQUFnQixFQUNoQixVQUFtQixFQUNuQixpQkFBMEIsRUFDMUIsT0FBYztRQUhkLFVBQUssR0FBTCxLQUFLLENBQVc7UUFDaEIsZUFBVSxHQUFWLFVBQVUsQ0FBUztRQUNuQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQVM7UUFDMUIsWUFBTyxHQUFQLE9BQU8sQ0FBTztJQUM1QixDQUFDO0NBQ0o7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLE9BQU8sY0FBK0IsU0FBUSxVQUFVO0lBb0I3RCxZQUNrQixPQUFvQixFQUNwQixTQUF5QztRQUUxRCxLQUFLLEVBQUUsQ0FBQTtRQUhVLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsY0FBUyxHQUFULFNBQVMsQ0FBZ0M7UUFyQjFDLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUErQixDQUFDLENBQUE7UUFDdkUsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFBO1FBRTlCLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzNELElBQUksU0FBUyxDQUFDLENBQUMsT0FBYyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQzVFLENBQUE7UUFDZ0IsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxPQUFjLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDM0UsQ0FBQTtRQUNnQiw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6RCxJQUFJLFNBQVMsQ0FBQyxDQUFDLE9BQWMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUMxRSxDQUFBO1FBRU8sV0FBTSxvQ0FBMkI7UUFDakMsbUJBQWMsR0FBa0QsSUFBSSxDQUFBO1FBQ3BFLHVCQUFrQixHQUFZLEtBQUssQ0FBQTtRQUNuQyxZQUFPLEdBQWMsRUFBRSxDQUFBO0lBUS9CLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDNUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBO1FBQ3pCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQsSUFBWSxVQUFVO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLDZCQUFvQixDQUFDLEtBQUssQ0FBQTtJQUN4RCxDQUFDO0lBRUQsSUFBWSxjQUFjO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQVksZUFBZTtRQUMxQixPQUFPLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBWSxtQkFBbUI7UUFDOUIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUMzQixDQUFDO0lBRU8sU0FBUyxDQUFDLEtBQTBCLEVBQUUsT0FBYztRQUMzRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxPQUFjO1FBQzlDLElBQUksQ0FBQyxTQUFTLHlDQUFpQyxPQUFPLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFdEUsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUE7WUFDL0IsSUFBSSxDQUFDLGNBQWMsR0FBRyw2QkFBNkIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBYSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FDNUMsQ0FFQTtZQUFBLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ1osSUFBSSxDQUFDO29CQUNKLElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxjQUFlLEVBQUUsQ0FBQzt3QkFDL0MsSUFBSSxJQUFJLEVBQUUsQ0FBQzs0QkFDVixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTs0QkFDdkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTt3QkFDMUIsQ0FBQztvQkFDRixDQUFDO29CQUNELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7b0JBRTlCLElBQ0MsSUFBSSxDQUFDLE1BQU0sZ0RBQXdDO3dCQUNuRCxJQUFJLENBQUMsTUFBTSw4REFBc0QsRUFDaEUsQ0FBQzt3QkFDRixJQUFJLENBQUMsU0FBUyxtQ0FBMkIsT0FBTyxDQUFDLENBQUE7b0JBQ2xELENBQUM7Z0JBQ0YsQ0FBQztnQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNaLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNyQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNMLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLE9BQWM7UUFDN0MsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN4RSxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxrQ0FBMEIsQ0FBQyw0Q0FBb0MsRUFDeEYsT0FBTyxDQUNQLENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsT0FBYztRQUM1QyxJQUFJLElBQUksQ0FBQyxNQUFNLGdEQUF3QyxFQUFFLENBQUM7WUFDekQsSUFBSSxDQUFDLFNBQVMsNERBQW9ELE9BQU8sQ0FBQyxDQUFBO1FBQzNFLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVyxDQUFDLE9BQWM7UUFDakMsSUFDQyxJQUFJLENBQUMsTUFBTSwwQ0FBa0M7WUFDN0MsSUFBSSxDQUFDLE1BQU0sMkNBQW1DLEVBQzdDLENBQUM7WUFDRixnREFBZ0Q7WUFDaEQsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxxQ0FBNkIsQ0FBQTtRQUMzRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxNQUFNLDhEQUFzRCxDQUFBO1FBQzNGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQzlFLENBQUE7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLElBQW9CLEVBQUUsT0FBYztRQUNoRCxJQUFJLElBQUksbUNBQTJCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLHFDQUE2QixFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxTQUFTLHdDQUFnQyxPQUFPLENBQUMsQ0FBQTtnQkFDdEQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUN0RSxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUMxRSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckI7b0JBQ0MsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUN0QyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLENBQUE7b0JBQ3ZDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDckMsTUFBSztnQkFDTjtvQkFDQyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLENBQUE7b0JBQ3ZDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDckMsTUFBSztZQUNQLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDeEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO1FBQzNCLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQTtRQUN6QixJQUFJLENBQUMsTUFBTSxtQ0FBMkIsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsSUFBVyxPQUFPO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFNBQWlCLFNBQVEsVUFBVTtJQUt4QyxZQUFZLE1BQWdDLEVBQUUsY0FBc0I7UUFDbkUsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQy9CLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FDbEUsQ0FBQTtJQUNGLENBQUM7SUFFRCxRQUFRLENBQUMsT0FBYyxFQUFFLGNBQXNCO1FBQzlDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0NBQ0QifQ==