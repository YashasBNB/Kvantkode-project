/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ACTIVE_TASK_STATUS, FAILED_TASK_STATUS, SUCCEEDED_TASK_STATUS, TaskTerminalStatus, } from '../../browser/taskTerminalStatus.js';
import { CommonTask, TaskEventKind } from '../../common/tasks.js';
import { TerminalStatusList, } from '../../../terminal/browser/terminalStatusList.js';
class TestTaskService {
    constructor() {
        this._onDidStateChange = new Emitter();
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    triggerStateChange(event) {
        this._onDidStateChange.fire(event);
    }
}
class TestaccessibilitySignalService {
    async playSignal(cue) {
        return;
    }
}
class TestTerminal extends Disposable {
    constructor() {
        super();
        this.statusList = this._register(new TerminalStatusList(new TestConfigurationService()));
    }
    dispose() {
        super.dispose();
    }
}
class TestTask extends CommonTask {
    constructor() {
        super('test', undefined, undefined, {}, {}, { kind: '', label: '' });
    }
    getFolderId() {
        throw new Error('Method not implemented.');
    }
    fromObject(object) {
        throw new Error('Method not implemented.');
    }
}
class TestProblemCollector extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidFindFirstMatch = new Emitter();
        this.onDidFindFirstMatch = this._onDidFindFirstMatch.event;
        this._onDidFindErrors = new Emitter();
        this.onDidFindErrors = this._onDidFindErrors.event;
        this._onDidRequestInvalidateLastMarker = new Emitter();
        this.onDidRequestInvalidateLastMarker = this._onDidRequestInvalidateLastMarker.event;
    }
}
suite('Task Terminal Status', () => {
    let instantiationService;
    let taskService;
    let taskTerminalStatus;
    let testTerminal;
    let testTask;
    let problemCollector;
    let accessibilitySignalService;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        taskService = new TestTaskService();
        accessibilitySignalService = new TestaccessibilitySignalService();
        taskTerminalStatus = store.add(new TaskTerminalStatus(taskService, accessibilitySignalService));
        testTerminal = store.add(instantiationService.createInstance(TestTerminal));
        testTask = instantiationService.createInstance(TestTask);
        problemCollector = store.add(instantiationService.createInstance(TestProblemCollector));
    });
    test('Should add failed status when there is an exit code on task end', async () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessStarted });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.End });
        await poll(async () => Promise.resolve(), () => testTerminal?.statusList.primary?.id === FAILED_TASK_STATUS.id, 'terminal status should be updated');
    });
    test('Should add active status when a non-background task is run for a second time in the same terminal', () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessStarted });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({
            kind: TaskEventKind.ProcessStarted,
            runType: "singleRun" /* TaskRunType.SingleRun */,
        });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
    });
    test('Should drop status when a background task exits', async () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({
            kind: TaskEventKind.ProcessStarted,
            runType: "background" /* TaskRunType.Background */,
        });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessEnded, exitCode: 0 });
        await poll(async () => Promise.resolve(), () => testTerminal?.statusList.statuses?.includes(SUCCEEDED_TASK_STATUS) === false, 'terminal should have dropped status');
    });
    test('Should add succeeded status when a non-background task exits', () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({
            kind: TaskEventKind.ProcessStarted,
            runType: "singleRun" /* TaskRunType.SingleRun */,
        });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessEnded, exitCode: 0 });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
    });
});
function assertStatus(actual, expected) {
    ok(actual.statuses.length === 1, '# of statuses');
    ok(actual.primary?.id === expected.id, 'ID');
    ok(actual.primary?.severity === expected.severity, 'Severity');
}
async function poll(fn, acceptFn, timeoutMessage, retryCount = 200, retryInterval = 10) {
    let trial = 1;
    let lastError = '';
    while (true) {
        if (trial > retryCount) {
            throw new Error(`Timeout: ${timeoutMessage} after ${(retryCount * retryInterval) / 1000} seconds.\r${lastError}`);
        }
        let result;
        try {
            result = await fn();
            if (acceptFn(result)) {
                return result;
            }
            else {
                lastError = 'Did not pass accept function';
            }
        }
        catch (e) {
            lastError = Array.isArray(e.stack) ? e.stack.join('\n') : e.stack;
        }
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
        trial++;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1Rlcm1pbmFsU3RhdHVzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL3Rlc3QvYnJvd3Nlci90YXNrVGVybWluYWxTdGF0dXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFLbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLGtCQUFrQixHQUNsQixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFBRSxVQUFVLEVBQWMsYUFBYSxFQUFlLE1BQU0sdUJBQXVCLENBQUE7QUFHMUYsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLGlEQUFpRCxDQUFBO0FBR3hELE1BQU0sZUFBZTtJQUFyQjtRQUNrQixzQkFBaUIsR0FBd0IsSUFBSSxPQUFPLEVBQUUsQ0FBQTtJQU94RSxDQUFDO0lBTkEsSUFBVyxnQkFBZ0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO0lBQ3BDLENBQUM7SUFDTSxrQkFBa0IsQ0FBQyxLQUEwQjtRQUNuRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQW1CLENBQUMsQ0FBQTtJ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