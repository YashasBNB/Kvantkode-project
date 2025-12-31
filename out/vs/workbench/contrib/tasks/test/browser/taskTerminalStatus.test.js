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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1Rlcm1pbmFsU3RhdHVzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy90ZXN0L2Jyb3dzZXIvdGFza1Rlcm1pbmFsU3RhdHVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBS2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixrQkFBa0IsR0FDbEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQUUsVUFBVSxFQUFjLGFBQWEsRUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBRzFGLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxpREFBaUQsQ0FBQTtBQUd4RCxNQUFNLGVBQWU7SUFBckI7UUFDa0Isc0JBQWlCLEdBQXdCLElBQUksT0FBTyxFQUFFLENBQUE7SUFPeEUsQ0FBQztJQU5BLElBQVcsZ0JBQWdCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtJQUNwQyxDQUFDO0lBQ00sa0JBQWtCLENBQUMsS0FBMEI7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFtQixDQUFDLENBQUE7SUFDakQs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