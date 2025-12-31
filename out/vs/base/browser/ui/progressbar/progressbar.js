/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hide, show } from '../../dom.js';
import { getProgressAcccessibilitySignalScheduler } from './progressAccessibilitySignal.js';
import { RunOnceScheduler } from '../../../common/async.js';
import { Disposable, MutableDisposable } from '../../../common/lifecycle.js';
import { isNumber } from '../../../common/types.js';
import './progressbar.css';
const CSS_DONE = 'done';
const CSS_ACTIVE = 'active';
const CSS_INFINITE = 'infinite';
const CSS_INFINITE_LONG_RUNNING = 'infinite-long-running';
const CSS_DISCRETE = 'discrete';
export const unthemedProgressBarOptions = {
    progressBarBackground: undefined,
};
/**
 * A progress bar with support for infinite or discrete progress.
 */
export class ProgressBar extends Disposable {
    /**
     * After a certain time of showing the progress bar, switch
     * to long-running mode and throttle animations to reduce
     * the pressure on the GPU process.
     *
     * https://github.com/microsoft/vscode/issues/97900
     * https://github.com/microsoft/vscode/issues/138396
     */
    static { this.LONG_RUNNING_INFINITE_THRESHOLD = 10000; }
    static { this.PROGRESS_SIGNAL_DEFAULT_DELAY = 3000; }
    constructor(container, options) {
        super();
        this.progressSignal = this._register(new MutableDisposable());
        this.workedVal = 0;
        this.showDelayedScheduler = this._register(new RunOnceScheduler(() => show(this.element), 0));
        this.longRunningScheduler = this._register(new RunOnceScheduler(() => this.infiniteLongRunning(), ProgressBar.LONG_RUNNING_INFINITE_THRESHOLD));
        this.create(container, options);
    }
    create(container, options) {
        this.element = document.createElement('div');
        this.element.classList.add('monaco-progress-container');
        this.element.setAttribute('role', 'progressbar');
        this.element.setAttribute('aria-valuemin', '0');
        container.appendChild(this.element);
        this.bit = document.createElement('div');
        this.bit.classList.add('progress-bit');
        this.bit.style.backgroundColor = options?.progressBarBackground || '#0E70C0';
        this.element.appendChild(this.bit);
    }
    off() {
        this.bit.style.width = 'inherit';
        this.bit.style.opacity = '1';
        this.element.classList.remove(CSS_ACTIVE, CSS_INFINITE, CSS_INFINITE_LONG_RUNNING, CSS_DISCRETE);
        this.workedVal = 0;
        this.totalWork = undefined;
        this.longRunningScheduler.cancel();
        this.progressSignal.clear();
    }
    /**
     * Indicates to the progress bar that all work is done.
     */
    done() {
        return this.doDone(true);
    }
    /**
     * Stops the progressbar from showing any progress instantly without fading out.
     */
    stop() {
        return this.doDone(false);
    }
    doDone(delayed) {
        this.element.classList.add(CSS_DONE);
        // discrete: let it grow to 100% width and hide afterwards
        if (!this.element.classList.contains(CSS_INFINITE)) {
            this.bit.style.width = 'inherit';
            if (delayed) {
                setTimeout(() => this.off(), 200);
            }
            else {
                this.off();
            }
        }
        // infinite: let it fade out and hide afterwards
        else {
            this.bit.style.opacity = '0';
            if (delayed) {
                setTimeout(() => this.off(), 200);
            }
            else {
                this.off();
            }
        }
        return this;
    }
    /**
     * Use this mode to indicate progress that has no total number of work units.
     */
    infinite() {
        this.bit.style.width = '2%';
        this.bit.style.opacity = '1';
        this.element.classList.remove(CSS_DISCRETE, CSS_DONE, CSS_INFINITE_LONG_RUNNING);
        this.element.classList.add(CSS_ACTIVE, CSS_INFINITE);
        this.longRunningScheduler.schedule();
        return this;
    }
    infiniteLongRunning() {
        this.element.classList.add(CSS_INFINITE_LONG_RUNNING);
    }
    /**
     * Tells the progress bar the total number of work. Use in combination with workedVal() to let
     * the progress bar show the actual progress based on the work that is done.
     */
    total(value) {
        this.workedVal = 0;
        this.totalWork = value;
        this.element.setAttribute('aria-valuemax', value.toString());
        return this;
    }
    /**
     * Finds out if this progress bar is configured with total work
     */
    hasTotal() {
        return isNumber(this.totalWork);
    }
    /**
     * Tells the progress bar that an increment of work has been completed.
     */
    worked(value) {
        value = Math.max(1, Number(value));
        return this.doSetWorked(this.workedVal + value);
    }
    /**
     * Tells the progress bar the total amount of work that has been completed.
     */
    setWorked(value) {
        value = Math.max(1, Number(value));
        return this.doSetWorked(value);
    }
    doSetWorked(value) {
        const totalWork = this.totalWork || 100;
        this.workedVal = value;
        this.workedVal = Math.min(totalWork, this.workedVal);
        this.element.classList.remove(CSS_INFINITE, CSS_INFINITE_LONG_RUNNING, CSS_DONE);
        this.element.classList.add(CSS_ACTIVE, CSS_DISCRETE);
        this.element.setAttribute('aria-valuenow', value.toString());
        this.bit.style.width = 100 * (this.workedVal / totalWork) + '%';
        return this;
    }
    getContainer() {
        return this.element;
    }
    show(delay) {
        this.showDelayedScheduler.cancel();
        this.progressSignal.value = getProgressAcccessibilitySignalScheduler(ProgressBar.PROGRESS_SIGNAL_DEFAULT_DELAY);
        if (typeof delay === 'number') {
            this.showDelayedScheduler.schedule(delay);
        }
        else {
            show(this.element);
        }
    }
    hide() {
        hide(this.element);
        this.showDelayedScheduler.cancel();
        this.progressSignal.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NiYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvcHJvZ3Jlc3NiYXIvcHJvZ3Jlc3NiYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDekMsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLG1CQUFtQixDQUFBO0FBRTFCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQTtBQUN2QixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUE7QUFDM0IsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFBO0FBQy9CLE1BQU0seUJBQXlCLEdBQUcsdUJBQXVCLENBQUE7QUFDekQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFBO0FBUS9CLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUF3QjtJQUM5RCxxQkFBcUIsRUFBRSxTQUFTO0NBQ2hDLENBQUE7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsVUFBVTtJQUMxQzs7Ozs7OztPQU9HO2FBQ3FCLG9DQUErQixHQUFHLEtBQUssQUFBUixDQUFRO2FBRXZDLGtDQUE2QixHQUFHLElBQUksQUFBUCxDQUFPO0lBVTVELFlBQVksU0FBc0IsRUFBRSxPQUE2QjtRQUNoRSxLQUFLLEVBQUUsQ0FBQTtRQUhTLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlC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