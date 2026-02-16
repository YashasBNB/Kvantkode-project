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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NJbmRpY2F0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcm9ncmVzcy9icm93c2VyL3Byb2dyZXNzSW5kaWNhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUdOLG1CQUFtQixHQUNuQixNQUFNLGtEQUFrRCxDQUFBO0FBSXpELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFVO0lBQ3RELFlBQ2tCLFdBQXdCLEVBQ3hCLEtBQXVCO1FBRXhDLEtBQUssRUFBRSxDQUFBO1FBSFUsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFJeEMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4Qiw4REFBOEQ7UUFDOUQsMkJBQTJCO1FBQzNCLDZEQUE2RDtRQUM3RCwwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDakMsSUFDQyxDQUFDLENBQUMsSUFBSSwrQ0FBdUM7Z0JBQzdDLENBQUMsQ0FBQyxDQUFDLElBQUksOENBQXNDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFDbkUsQ0FBQztnQkFDRixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lB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