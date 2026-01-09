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
import * as nls from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { StartStopProblemCollector } from '../common/problemCollectors.js';
import { TaskEventKind, } from '../common/tasks.js';
import { ITaskService } from '../common/taskService.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
const TASK_TERMINAL_STATUS_ID = 'task_terminal_status';
export const ACTIVE_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: spinningLoading,
    severity: Severity.Info,
    tooltip: nls.localize('taskTerminalStatus.active', 'Task is running'),
};
export const SUCCEEDED_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.check,
    severity: Severity.Info,
    tooltip: nls.localize('taskTerminalStatus.succeeded', 'Task succeeded'),
};
const SUCCEEDED_INACTIVE_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.check,
    severity: Severity.Info,
    tooltip: nls.localize('taskTerminalStatus.succeededInactive', 'Task succeeded and waiting...'),
};
export const FAILED_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.error,
    severity: Severity.Error,
    tooltip: nls.localize('taskTerminalStatus.errors', 'Task has errors'),
};
const FAILED_INACTIVE_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.error,
    severity: Severity.Error,
    tooltip: nls.localize('taskTerminalStatus.errorsInactive', 'Task has errors and is waiting...'),
};
const WARNING_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.warning,
    severity: Severity.Warning,
    tooltip: nls.localize('taskTerminalStatus.warnings', 'Task has warnings'),
};
const WARNING_INACTIVE_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.warning,
    severity: Severity.Warning,
    tooltip: nls.localize('taskTerminalStatus.warningsInactive', 'Task has warnings and is waiting...'),
};
const INFO_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.info,
    severity: Severity.Info,
    tooltip: nls.localize('taskTerminalStatus.infos', 'Task has infos'),
};
const INFO_INACTIVE_TASK_STATUS = {
    id: TASK_TERMINAL_STATUS_ID,
    icon: Codicon.info,
    severity: Severity.Info,
    tooltip: nls.localize('taskTerminalStatus.infosInactive', 'Task has infos and is waiting...'),
};
let TaskTerminalStatus = class TaskTerminalStatus extends Disposable {
    constructor(taskService, _accessibilitySignalService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this.terminalMap = new Map();
        this._register(taskService.onDidStateChange((event) => {
            switch (event.kind) {
                case TaskEventKind.ProcessStarted:
                case TaskEventKind.Active:
                    this.eventActive(event);
                    break;
                case TaskEventKind.Inactive:
                    this.eventInactive(event);
                    break;
                case TaskEventKind.ProcessEnded:
                    this.eventEnd(event);
                    break;
            }
        }));
        this._register(toDisposable(() => {
            for (const terminalData of this.terminalMap.values()) {
                terminalData.disposeListener?.dispose();
            }
            this.terminalMap.clear();
        }));
    }
    addTerminal(task, terminal, problemMatcher) {
        const status = { id: TASK_TERMINAL_STATUS_ID, severity: Severity.Info };
        terminal.statusList.add(status);
        this._register(problemMatcher.onDidFindFirstMatch(() => {
            this._marker = terminal.registerMarker();
            if (this._marker) {
                this._register(this._marker);
            }
        }));
        this._register(problemMatcher.onDidFindErrors(() => {
            if (this._marker) {
                terminal.addBufferMarker({
                    marker: this._marker,
                    hoverMessage: nls.localize('task.watchFirstError', 'Beginning of detected errors for this run'),
                    disableCommandStorage: true,
                });
            }
        }));
        this._register(problemMatcher.onDidRequestInvalidateLastMarker(() => {
            this._marker?.dispose();
            this._marker = undefined;
        }));
        this.terminalMap.set(terminal.instanceId, {
            terminal,
            task,
            status,
            problemMatcher,
            taskRunEnded: false,
        });
    }
    terminalFromEvent(event) {
        if (!('terminalId' in event) || !event.terminalId) {
            return undefined;
        }
        return this.terminalMap.get(event.terminalId);
    }
    eventEnd(event) {
        const terminalData = this.terminalFromEvent(event);
        if (!terminalData) {
            return;
        }
        terminalData.taskRunEnded = true;
        terminalData.terminal.statusList.remove(terminalData.status);
        if (event.exitCode === 0 &&
            (!terminalData.problemMatcher.maxMarkerSeverity ||
                terminalData.problemMatcher.maxMarkerSeverity < MarkerSeverity.Warning)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskCompleted);
            if (terminalData.task.configurationProperties.isBackground) {
                for (const status of terminalData.terminal.statusList.statuses) {
                    terminalData.terminal.statusList.remove(status);
                }
            }
            else {
                terminalData.terminal.statusList.add(SUCCEEDED_TASK_STATUS);
            }
        }
        else if (event.exitCode ||
            (terminalData.problemMatcher.maxMarkerSeverity !== undefined &&
                terminalData.problemMatcher.maxMarkerSeverity >= MarkerSeverity.Warning)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskFailed);
            terminalData.terminal.statusList.add(FAILED_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Warning) {
            terminalData.terminal.statusList.add(WARNING_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Info) {
            terminalData.terminal.statusList.add(INFO_TASK_STATUS);
        }
    }
    eventInactive(event) {
        const terminalData = this.terminalFromEvent(event);
        if (!terminalData || !terminalData.problemMatcher || terminalData.taskRunEnded) {
            return;
        }
        terminalData.terminal.statusList.remove(terminalData.status);
        if (terminalData.problemMatcher.numberOfMatches === 0) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskCompleted);
            terminalData.terminal.statusList.add(SUCCEEDED_INACTIVE_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Error) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskFailed);
            terminalData.terminal.statusList.add(FAILED_INACTIVE_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Warning) {
            terminalData.terminal.statusList.add(WARNING_INACTIVE_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Info) {
            terminalData.terminal.statusList.add(INFO_INACTIVE_TASK_STATUS);
        }
    }
    eventActive(event) {
        const terminalData = this.terminalFromEvent(event);
        if (!terminalData) {
            return;
        }
        if (!terminalData.disposeListener) {
            terminalData.disposeListener = this._register(new MutableDisposable());
            terminalData.disposeListener.value = terminalData.terminal.onDisposed(() => {
                if (!event.terminalId) {
                    return;
                }
                this.terminalMap.delete(event.terminalId);
                terminalData.disposeListener?.dispose();
            });
        }
        terminalData.taskRunEnded = false;
        terminalData.terminal.statusList.remove(terminalData.status);
        // We don't want to show an infinite status for a background task that doesn't have a problem matcher.
        if (terminalData.problemMatcher instanceof StartStopProblemCollector ||
            terminalData.problemMatcher?.problemMatchers.length > 0 ||
            event.runType === "singleRun" /* TaskRunType.SingleRun */) {
            terminalData.terminal.statusList.add(ACTIVE_TASK_STATUS);
        }
    }
};
TaskTerminalStatus = __decorate([
    __param(0, ITaskService),
    __param(1, IAccessibilitySignalService)
], TaskTerminalStatus);
export { TaskTerminalStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1Rlcm1pbmFsU3RhdHVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3Rhc2tUZXJtaW5hbFN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sVUFBVSxFQUVWLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQTRCLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEcsT0FBTyxFQUlOLGFBQWEsR0FFYixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQVEsTUFBTSwwQkFBMEIsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRW5GLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sZ0ZBQWdGLENBQUE7QUFZdkYsTUFBTSx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FBQTtBQUN0RCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBb0I7SUFDbEQsRUFBRSxFQUFFLHVCQUF1QjtJQUMzQixJQUFJLEVBQUUsZUFBZTtJQUNyQixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7SUFDdkIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsaUJBQWlC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