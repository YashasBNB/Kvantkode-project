/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { emptyProgressRunner, } from '../../../../platform/progress/common/progress.js';
export class EditorProgressIndicator extends Disposable {
    constructor(progressBar, group) {
        super();
        this.progressBar = progressBar;
        this.group = group;
        this.registerListeners();
    }
    registerListeners() {
        // Stop any running progress when the active editor changes or
        // the group becomes empty.
        // In contrast to the composite progress indicator, we do not
        // track active editor progress and replay it later (yet).
        this._register(this.group.onDidModelChange((e) => {
            if (e.kind === 8 /* GroupModelChangeKind.EDITOR_ACTIVE */ ||
                (e.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ && this.group.isEmpty)) {
                this.progressBar.stop().hide();
            }
        }));
    }
    show(infiniteOrTotal, delay) {
        // No editor open: ignore any progress reporting
        if (this.group.isEmpty) {
            return emptyProgressRunner;
        }
        if (infiniteOrTotal === true) {
            return this.doShow(true, delay);
        }
        return this.doShow(infiniteOrTotal, delay);
    }
    doShow(infiniteOrTotal, delay) {
        if (typeof infiniteOrTotal === 'boolean') {
            this.progressBar.infinite().show(delay);
        }
        else {
            this.progressBar.total(infiniteOrTotal).show(delay);
        }
        return {
            total: (total) => {
                this.progressBar.total(total);
            },
            worked: (worked) => {
                if (this.progressBar.hasTotal()) {
                    this.progressBar.worked(worked);
                }
                else {
                    this.progressBar.infinite().show();
                }
            },
            done: () => {
                this.progressBar.stop().hide();
            },
        };
    }
    async showWhile(promise, delay) {
        // No editor open: ignore any progress reporting
        if (this.group.isEmpty) {
            try {
                await promise;
            }
            catch (error) {
                // ignore
            }
        }
        return this.doShowWhile(promise, delay);
    }
    async doShowWhile(promise, delay) {
        try {
            this.progressBar.infinite().show(delay);
            await promise;
        }
        catch (error) {
            // ignore
        }
        finally {
            this.progressBar.stop().hide();
        }
    }
}
var ProgressIndicatorState;
(function (ProgressIndicatorState) {
    let Type;
    (function (Type) {
        Type[Type["None"] = 0] = "None";
        Type[Type["Done"] = 1] = "Done";
        Type[Type["Infinite"] = 2] = "Infinite";
        Type[Type["While"] = 3] = "While";
        Type[Type["Work"] = 4] = "Work";
    })(Type = ProgressIndicatorState.Type || (ProgressIndicatorState.Type = {}));
    ProgressIndicatorState.None = { type: 0 /* Type.None */ };
    ProgressIndicatorState.Done = { type: 1 /* Type.Done */ };
    ProgressIndicatorState.Infinite = { type: 2 /* Type.Infinite */ };
    class While {
        constructor(whilePromise, whileStart, whileDelay) {
            this.whilePromise = whilePromise;
            this.whileStart = whileStart;
            this.whileDelay = whileDelay;
            this.type = 3 /* Type.While */;
        }
    }
    ProgressIndicatorState.While = While;
    class Work {
        constructor(total, worked) {
            this.total = total;
            this.worked = worked;
            this.type = 4 /* Type.Work */;
        }
    }
    ProgressIndicatorState.Work = Work;
})(ProgressIndicatorState || (ProgressIndicatorState = {}));
export class ScopedProgressIndicator extends Disposable {
    constructor(progressBar, scope) {
        super();
        this.progressBar = progressBar;
        this.scope = scope;
        this.progressState = ProgressIndicatorState.None;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.scope.onDidChangeActive(() => {
            if (this.scope.isActive) {
                this.onDidScopeActivate();
            }
            else {
                this.onDidScopeDeactivate();
            }
        }));
    }
    onDidScopeActivate() {
        // Return early if progress state indicates that progress is done
        if (this.progressState.type === ProgressIndicatorState.Done.type) {
            return;
        }
        // Replay Infinite Progress from Promise
        if (this.progressState.type === 3 /* ProgressIndicatorState.Type.While */) {
            let delay;
            if (this.progressState.whileDelay > 0) {
                const remainingDelay = this.progressState.whileDelay - (Date.now() - this.progressState.whileStart);
                if (remainingDelay > 0) {
                    delay = remainingDelay;
                }
            }
            this.doShowWhile(delay);
        }
        // Replay Infinite Progress
        else if (this.progressState.type === 2 /* ProgressIndicatorState.Type.Infinite */) {
            this.progressBar.infinite().show();
        }
        // Replay Finite Progress (Total & Worked)
        else if (this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */) {
            if (this.progressState.total) {
                this.progressBar.total(this.progressState.total).show();
            }
            if (this.progressState.worked) {
                this.progressBar.worked(this.progressState.worked).show();
            }
        }
    }
    onDidScopeDeactivate() {
        this.progressBar.stop().hide();
    }
    show(infiniteOrTotal, delay) {
        // Sort out Arguments
        if (typeof infiniteOrTotal === 'boolean') {
            this.progressState = ProgressIndicatorState.Infinite;
        }
        else {
            this.progressState = new ProgressIndicatorState.Work(infiniteOrTotal, undefined);
        }
        // Active: Show Progress
        if (this.scope.isActive) {
            // Infinite: Start Progressbar and Show after Delay
            if (this.progressState.type === 2 /* ProgressIndicatorState.Type.Infinite */) {
                this.progressBar.infinite().show(delay);
            }
            // Finite: Start Progressbar and Show after Delay
            else if (this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */ &&
                typeof this.progressState.total === 'number') {
                this.progressBar.total(this.progressState.total).show(delay);
            }
        }
        return {
            total: (total) => {
                this.progressState = new ProgressIndicatorState.Work(total, this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */
                    ? this.progressState.worked
                    : undefined);
                if (this.scope.isActive) {
                    this.progressBar.total(total);
                }
            },
            worked: (worked) => {
                // Verify first that we are either not active or the progressbar has a total set
                if (!this.scope.isActive || this.progressBar.hasTotal()) {
                    this.progressState = new ProgressIndicatorState.Work(this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */
                        ? this.progressState.total
                        : undefined, this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */ &&
                        typeof this.progressState.worked === 'number'
                        ? this.progressState.worked + worked
                        : worked);
                    if (this.scope.isActive) {
                        this.progressBar.worked(worked);
                    }
                }
                // Otherwise the progress bar does not support worked(), we fallback to infinite() progress
                else {
                    this.progressState = ProgressIndicatorState.Infinite;
                    this.progressBar.infinite().show();
                }
            },
            done: () => {
                this.progressState = ProgressIndicatorState.Done;
                if (this.scope.isActive) {
                    this.progressBar.stop().hide();
                }
            },
        };
    }
    async showWhile(promise, delay) {
        // Join with existing running promise to ensure progress is accurate
        if (this.progressState.type === 3 /* ProgressIndicatorState.Type.While */) {
            promise = Promise.allSettled([promise, this.progressState.whilePromise]);
        }
        // Keep Promise in State
        this.progressState = new ProgressIndicatorState.While(promise, delay || 0, Date.now());
        try {
            this.doShowWhile(delay);
            await promise;
        }
        catch (error) {
            // ignore
        }
        finally {
            // If this is not the last promise in the list of joined promises, skip this
            if (this.progressState.type !== 3 /* ProgressIndicatorState.Type.While */ ||
                this.progressState.whilePromise === promise) {
                // The while promise is either null or equal the promise we last hooked on
                this.progressState = ProgressIndicatorState.None;
                if (this.scope.isActive) {
                    this.progressBar.stop().hide();
                }
            }
        }
    }
    doShowWhile(delay) {
        // Show Progress when active
        if (this.scope.isActive) {
            this.progressBar.infinite().show(delay);
        }
    }
}
export class AbstractProgressScope extends Disposable {
    get isActive() {
        return this._isActive;
    }
    constructor(scopeId, _isActive) {
        super();
        this.scopeId = scopeId;
        this._isActive = _isActive;
        this._onDidChangeActive = this._register(new Emitter());
        this.onDidChangeActive = this._onDidChangeActive.event;
    }
    onScopeOpened(scopeId) {
        if (scopeId === this.scopeId) {
            if (!this._isActive) {
                this._isActive = true;
                this._onDidChangeActive.fire();
            }
        }
    }
    onScopeClosed(scopeId) {
        if (scopeId === this.scopeId) {
            if (this._isActive) {
                this._isActive = false;
                this._onDidChangeActive.fire();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NJbmRpY2F0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJvZ3Jlc3MvYnJvd3Nlci9wcm9ncmVzc0luZGljYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFHTixtQkFBbUIsR0FDbkIsTUFBTSxrREFBa0QsQ0FBQTtBQUl6RCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQUN0RCxZQUNrQixXQUF3QixFQUN4QixLQUF1QjtRQUV4QyxLQUFLLEVBQUUsQ0FBQTtRQUhVLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hCLFVBQUssR0FBTCxLQUFLLENBQWtCO1FBSXhDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsOERBQThEO1FBQzlELDJCQUEyQjtRQUMzQiw2REFBNkQ7UUFDN0QsMERBQTBEO1FBQzFELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2pDLElBQ0MsQ0FBQyxDQUFDLElBQUksK0NBQXVDO2dCQUM3QyxDQUFDLENBQUMsQ0FBQyxJQUFJLDhDQUFzQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQ25FLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUMvQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFJRCxJQUFJLENBQUMs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