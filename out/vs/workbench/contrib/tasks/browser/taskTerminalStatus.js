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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1Rlcm1pbmFsU3RhdHVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90YXNrVGVybWluYWxTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUNOLFVBQVUsRUFFVixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUE0Qix5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BHLE9BQU8sRUFJTixhQUFhLEdBRWIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsWUFBWSxFQUFRLE1BQU0sMEJBQTBCLENBQUE7QUFFN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVuRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLGdGQUFnRixDQUFBO0FBWXZGLE1BQU0sdUJBQXVCLEdBQUcsc0JBQXNCLENBQUE7QUFDdEQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQW9CO0lBQ2xELEVBQUUsRUFBRSx1QkFBdUI7SUFDM0IsSUFBSSxFQUFFLGVBQWU7SUFDckIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO0lBQ3ZCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlCQUFpQixDQUFDO0NBQ3JFLENBQUE7QUFDRCxN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