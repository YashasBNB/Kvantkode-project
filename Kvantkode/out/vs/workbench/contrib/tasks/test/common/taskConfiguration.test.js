/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import assert from 'assert';
import Severity from '../../../../../base/common/severity.js';
import * as UUID from '../../../../../base/common/uuid.js';
import * as Types from '../../../../../base/common/types.js';
import * as Platform from '../../../../../base/common/platform.js';
import { ValidationStatus } from '../../../../../base/common/parsers.js';
import { FileLocationKind, ApplyToKind, } from '../../common/problemMatcher.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import * as Tasks from '../../common/tasks.js';
import { parse, TaskConfigSource, ProblemMatcherConverter, UUIDMap, TaskParser, } from '../../common/taskConfiguration.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const workspaceFolder = new WorkspaceFolder({
    uri: URI.file('/workspace/folderOne'),
    name: 'folderOne',
    index: 0,
});
const workspace = new Workspace('id', [workspaceFolder]);
class ProblemReporter {
    constructor() {
        this._validationStatus = new ValidationStatus();
        this.receivedMessage = false;
        this.lastMessage = undefined;
    }
    info(message) {
        this.log(message);
    }
    warn(message) {
        this.log(message);
    }
    error(message) {
        this.log(message);
    }
    fatal(message) {
        this.log(message);
    }
    get status() {
        return this._validationStatus;
    }
    log(message) {
        this.receivedMessage = true;
        this.lastMessage = message;
    }
    clearMessage() {
        this.lastMessage = undefined;
    }
}
class ConfigurationBuilder {
    constructor() {
        this.result = [];
        this.builders = [];
    }
    task(name, command) {
        const builder = new CustomTaskBuilder(this, name, command);
        this.builders.push(builder);
        this.result.push(builder.result);
        return builder;
    }
    done() {
        for (const builder of this.builders) {
            builder.done();
        }
    }
}
class PresentationBuilder {
    constructor(parent) {
        this.parent = parent;
        this.result = {
            echo: false,
            reveal: Tasks.RevealKind.Always,
            revealProblems: Tasks.RevealProblemKind.Never,
            focus: false,
            panel: Tasks.PanelKind.Shared,
            showReuseMessage: true,
            clear: false,
            close: false,
        };
    }
    echo(value) {
        this.result.echo = value;
        return this;
    }
    reveal(value) {
        this.result.reveal = value;
        return this;
    }
    focus(value) {
        this.result.focus = value;
        return this;
    }
    instance(value) {
        this.result.panel = value;
        return this;
    }
    showReuseMessage(value) {
        this.result.showReuseMessage = value;
        return this;
    }
    close(value) {
        this.result.close = value;
        return this;
    }
    done() { }
}
class CommandConfigurationBuilder {
    constructor(parent, command) {
        this.parent = parent;
        this.presentationBuilder = new PresentationBuilder(this);
        this.result = {
            name: command,
            runtime: Tasks.RuntimeType.Process,
            args: [],
            options: {
                cwd: '${workspaceFolder}',
            },
            presentation: this.presentationBuilder.result,
            suppressTaskName: false,
        };
    }
    name(value) {
        this.result.name = value;
        return this;
    }
    runtime(value) {
        this.result.runtime = value;
        return this;
    }
    args(value) {
        this.result.args = value;
        return this;
    }
    options(value) {
        this.result.options = value;
        return this;
    }
    taskSelector(value) {
        this.result.taskSelector = value;
        return this;
    }
    suppressTaskName(value) {
        this.result.suppressTaskName = value;
        return this;
    }
    presentation() {
        return this.presentationBuilder;
    }
    done(taskName) {
        this.result.args = this.result.args.map((arg) => (arg === '$name' ? taskName : arg));
        this.presentationBuilder.done();
    }
}
class CustomTaskBuilder {
    constructor(parent, name, command) {
        this.parent = parent;
        this.commandBuilder = new CommandConfigurationBuilder(this, command);
        this.result = new Tasks.CustomTask(name, {
            kind: Tasks.TaskSourceKind.Workspace,
            label: 'workspace',
            config: {
                workspaceFolder: workspaceFolder,
                element: undefined,
                index: -1,
                file: '.vscode/tasks.json',
            },
        }, name, Tasks.CUSTOMIZED_TASK_TYPE, this.commandBuilder.result, false, { reevaluateOnRerun: true }, {
            identifier: name,
            name: name,
            isBackground: false,
            promptOnClose: true,
            problemMatchers: [],
        });
    }
    identifier(value) {
        this.result.configurationProperties.identifier = value;
        return this;
    }
    group(value) {
        this.result.configurationProperties.group = value;
        return this;
    }
    isBackground(value) {
        this.result.configurationProperties.isBackground = value;
        return this;
    }
    promptOnClose(value) {
        this.result.configurationProperties.promptOnClose = value;
        return this;
    }
    problemMatcher() {
        const builder = new ProblemMatcherBuilder(this);
        this.result.configurationProperties.problemMatchers.push(builder.result);
        return builder;
    }
    command() {
        return this.commandBuilder;
    }
    done() {
        this.commandBuilder.done(this.result.configurationProperties.name);
    }
}
class ProblemMatcherBuilder {
    static { this.DEFAULT_UUID = UUID.generateUuid(); }
    constructor(parent) {
        this.parent = parent;
        this.result = {
            owner: ProblemMatcherBuilder.DEFAULT_UUID,
            applyTo: ApplyToKind.allDocuments,
            severity: undefined,
            fileLocation: FileLocationKind.Relative,
            filePrefix: '${workspaceFolder}',
            pattern: undefined,
        };
    }
    owner(value) {
        this.result.owner = value;
        return this;
    }
    applyTo(value) {
        this.result.applyTo = value;
        return this;
    }
    severity(value) {
        this.result.severity = value;
        return this;
    }
    fileLocation(value) {
        this.result.fileLocation = value;
        return this;
    }
    filePrefix(value) {
        this.result.filePrefix = value;
        return this;
    }
    pattern(regExp) {
        const builder = new PatternBuilder(this, regExp);
        if (!this.result.pattern) {
            this.result.pattern = builder.result;
        }
        return builder;
    }
}
class PatternBuilder {
    constructor(parent, regExp) {
        this.parent = parent;
        this.result = {
            regexp: regExp,
            file: 1,
            message: 0,
            line: 2,
            character: 3,
        };
    }
    file(value) {
        this.result.file = value;
        return this;
    }
    message(value) {
        this.result.message = value;
        return this;
    }
    location(value) {
        this.result.location = value;
        return this;
    }
    line(value) {
        this.result.line = value;
        return this;
    }
    character(value) {
        this.result.character = value;
        return this;
    }
    endLine(value) {
        this.result.endLine = value;
        return this;
    }
    endCharacter(value) {
        this.result.endCharacter = value;
        return this;
    }
    code(value) {
        this.result.code = value;
        return this;
    }
    severity(value) {
        this.result.severity = value;
        return this;
    }
    loop(value) {
        this.result.loop = value;
        return this;
    }
}
class TasksMockContextKeyService extends MockContextKeyService {
    getContext(domNode) {
        return {
            getValue: (_key) => {
                return true;
            },
        };
    }
}
function testDefaultProblemMatcher(external, resolved) {
    const reporter = new ProblemReporter();
    const result = parse(workspaceFolder, workspace, Platform.platform, external, reporter, TaskConfigSource.TasksJson, new TasksMockContextKeyService());
    assert.ok(!reporter.receivedMessage);
    assert.strictEqual(result.custom.length, 1);
    const task = result.custom[0];
    assert.ok(task);
    assert.strictEqual(task.configurationProperties.problemMatchers.length, resolved);
}
function testConfiguration(external, builder) {
    builder.done();
    const reporter = new ProblemReporter();
    const result = parse(workspaceFolder, workspace, Platform.platform, external, reporter, TaskConfigSource.TasksJson, new TasksMockContextKeyService());
    if (reporter.receivedMessage) {
        assert.ok(false, reporter.lastMessage);
    }
    assertConfiguration(result, builder.result);
}
class TaskGroupMap {
    constructor() {
        this._store = Object.create(null);
    }
    add(group, task) {
        let tasks = this._store[group];
        if (!tasks) {
            tasks = [];
            this._store[group] = tasks;
        }
        tasks.push(task);
    }
    static assert(actual, expected) {
        const actualKeys = Object.keys(actual._store);
        const expectedKeys = Object.keys(expected._store);
        if (actualKeys.length === 0 && expectedKeys.length === 0) {
            return;
        }
        assert.strictEqual(actualKeys.length, expectedKeys.length);
        actualKeys.forEach((key) => assert.ok(expected._store[key]));
        expectedKeys.forEach((key) => actual._store[key]);
        actualKeys.forEach((key) => {
            const actualTasks = actual._store[key];
            const expectedTasks = expected._store[key];
            assert.strictEqual(actualTasks.length, expectedTasks.length);
            if (actualTasks.length === 1) {
                assert.strictEqual(actualTasks[0].configurationProperties.name, expectedTasks[0].configurationProperties.name);
                return;
            }
            const expectedTaskMap = Object.create(null);
            expectedTasks.forEach((task) => (expectedTaskMap[task.configurationProperties.name] = true));
            actualTasks.forEach((task) => delete expectedTaskMap[task.configurationProperties.name]);
            assert.strictEqual(Object.keys(expectedTaskMap).length, 0);
        });
    }
}
function assertConfiguration(result, expected) {
    assert.ok(result.validationStatus.isOK());
    const actual = result.custom;
    assert.strictEqual(typeof actual, typeof expected);
    if (!actual) {
        return;
    }
    // We can't compare Ids since the parser uses UUID which are random
    // So create a new map using the name.
    const actualTasks = Object.create(null);
    const actualId2Name = Object.create(null);
    const actualTaskGroups = new TaskGroupMap();
    actual.forEach((task) => {
        assert.ok(!actualTasks[task.configurationProperties.name]);
        actualTasks[task.configurationProperties.name] = task;
        actualId2Name[task._id] = task.configurationProperties.name;
        const taskId = Tasks.TaskGroup.from(task.configurationProperties.group)?._id;
        if (taskId) {
            actualTaskGroups.add(taskId, task);
        }
    });
    const expectedTasks = Object.create(null);
    const expectedTaskGroup = new TaskGroupMap();
    expected.forEach((task) => {
        assert.ok(!expectedTasks[task.configurationProperties.name]);
        expectedTasks[task.configurationProperties.name] = task;
        const taskId = Tasks.TaskGroup.from(task.configurationProperties.group)?._id;
        if (taskId) {
            expectedTaskGroup.add(taskId, task);
        }
    });
    const actualKeys = Object.keys(actualTasks);
    assert.strictEqual(actualKeys.length, expected.length);
    actualKeys.forEach((key) => {
        const actualTask = actualTasks[key];
        const expectedTask = expectedTasks[key];
        assert.ok(expectedTask);
        assertTask(actualTask, expectedTask);
    });
    TaskGroupMap.assert(actualTaskGroups, expectedTaskGroup);
}
function assertTask(actual, expected) {
    assert.ok(actual._id);
    assert.strictEqual(actual.configurationProperties.name, expected.configurationProperties.name, 'name');
    if (!Tasks.InMemoryTask.is(actual) && !Tasks.InMemoryTask.is(expected)) {
        assertCommandConfiguration(actual.command, expected.command);
    }
    assert.strictEqual(actual.configurationProperties.isBackground, expected.configurationProperties.isBackground, 'isBackground');
    assert.strictEqual(typeof actual.configurationProperties.problemMatchers, typeof expected.configurationProperties.problemMatchers);
    assert.strictEqual(actual.configurationProperties.promptOnClose, expected.configurationProperties.promptOnClose, 'promptOnClose');
    assert.strictEqual(typeof actual.configurationProperties.group, typeof expected.configurationProperties.group, `group types unequal`);
    if (actual.configurationProperties.problemMatchers &&
        expected.configurationProperties.problemMatchers) {
        assert.strictEqual(actual.configurationProperties.problemMatchers.length, expected.configurationProperties.problemMatchers.length);
        for (let i = 0; i < actual.configurationProperties.problemMatchers.length; i++) {
            assertProblemMatcher(actual.configurationProperties.problemMatchers[i], expected.configurationProperties.problemMatchers[i]);
        }
    }
    if (actual.configurationProperties.group && expected.configurationProperties.group) {
        if (Types.isString(actual.configurationProperties.group)) {
            assert.strictEqual(actual.configurationProperties.group, expected.configurationProperties.group);
        }
        else {
            assertGroup(actual.configurationProperties.group, expected.configurationProperties.group);
        }
    }
}
function assertCommandConfiguration(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (actual && expected) {
        assertPresentation(actual.presentation, expected.presentation);
        assert.strictEqual(actual.name, expected.name, 'name');
        assert.strictEqual(actual.runtime, expected.runtime, 'runtime type');
        assert.strictEqual(actual.suppressTaskName, expected.suppressTaskName, 'suppressTaskName');
        assert.strictEqual(actual.taskSelector, expected.taskSelector, 'taskSelector');
        assert.deepStrictEqual(actual.args, expected.args, 'args');
        assert.strictEqual(typeof actual.options, typeof expected.options);
        if (actual.options && expected.options) {
            assert.strictEqual(actual.options.cwd, expected.options.cwd, 'cwd');
            assert.strictEqual(typeof actual.options.env, typeof expected.options.env, 'env');
            if (actual.options.env && expected.options.env) {
                assert.deepStrictEqual(actual.options.env, expected.options.env, 'env');
            }
        }
    }
}
function assertGroup(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (actual && expected) {
        assert.strictEqual(actual._id, expected._id, `group ids unequal. actual: ${actual._id} expected ${expected._id}`);
        assert.strictEqual(actual.isDefault, expected.isDefault, `group defaults unequal. actual: ${actual.isDefault} expected ${expected.isDefault}`);
    }
}
function assertPresentation(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (actual && expected) {
        assert.strictEqual(actual.echo, expected.echo);
        assert.strictEqual(actual.reveal, expected.reveal);
    }
}
function assertProblemMatcher(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (typeof actual === 'string' && typeof expected === 'string') {
        assert.strictEqual(actual, expected, 'Problem matcher references are different');
        return;
    }
    if (typeof actual !== 'string' && typeof expected !== 'string') {
        if (expected.owner === ProblemMatcherBuilder.DEFAULT_UUID) {
            assert.ok(UUID.isUUID(actual.owner), 'Owner must be a UUID');
        }
        else {
            assert.strictEqual(actual.owner, expected.owner);
        }
        assert.strictEqual(actual.applyTo, expected.applyTo);
        assert.strictEqual(actual.severity, expected.severity);
        assert.strictEqual(actual.fileLocation, expected.fileLocation);
        assert.strictEqual(actual.filePrefix, expected.filePrefix);
        if (actual.pattern && expected.pattern) {
            assertProblemPatterns(actual.pattern, expected.pattern);
        }
    }
}
function assertProblemPatterns(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (Array.isArray(actual)) {
        const actuals = actual;
        const expecteds = expected;
        assert.strictEqual(actuals.length, expecteds.length);
        for (let i = 0; i < actuals.length; i++) {
            assertProblemPattern(actuals[i], expecteds[i]);
        }
    }
    else {
        assertProblemPattern(actual, expected);
    }
}
function assertProblemPattern(actual, expected) {
    assert.strictEqual(actual.regexp.toString(), expected.regexp.toString());
    assert.strictEqual(actual.file, expected.file);
    assert.strictEqual(actual.message, expected.message);
    if (typeof expected.location !== 'undefined') {
        assert.strictEqual(actual.location, expected.location);
    }
    else {
        assert.strictEqual(actual.line, expected.line);
        assert.strictEqual(actual.character, expected.character);
        assert.strictEqual(actual.endLine, expected.endLine);
        assert.strictEqual(actual.endCharacter, expected.endCharacter);
    }
    assert.strictEqual(actual.code, expected.code);
    assert.strictEqual(actual.severity, expected.severity);
    assert.strictEqual(actual.loop, expected.loop);
}
suite('Tasks version 0.1.0', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('tasks: all default', () => {
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').group(Tasks.TaskGroup.Build).command().suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
        }, builder);
    });
    test('tasks: global isShellCommand', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            isShellCommand: true,
        }, builder);
    });
    test('tasks: global show output silent', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .presentation()
            .reveal(Tasks.RevealKind.Silent);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'silent',
        }, builder);
    });
    test('tasks: global promptOnClose default', () => {
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').group(Tasks.TaskGroup.Build).command().suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            promptOnClose: true,
        }, builder);
    });
    test('tasks: global promptOnClose', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .promptOnClose(false)
            .command()
            .suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            promptOnClose: false,
        }, builder);
    });
    test('tasks: global promptOnClose default watching', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .isBackground(true)
            .promptOnClose(false)
            .command()
            .suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            isWatching: true,
        }, builder);
    });
    test('tasks: global show output never', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .presentation()
            .reveal(Tasks.RevealKind.Never);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'never',
        }, builder);
    });
    test('tasks: global echo Command', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .presentation()
            .echo(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            echoCommand: true,
        }, builder);
    });
    test('tasks: global args', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .args(['--p']);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            args: ['--p'],
        }, builder);
    });
    test('tasks: options - cwd', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .options({
            cwd: 'myPath',
        });
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            options: {
                cwd: 'myPath',
            },
        }, builder);
    });
    test('tasks: options - env', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .options({ cwd: '${workspaceFolder}', env: { key: 'value' } });
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            options: {
                env: {
                    key: 'value',
                },
            },
        }, builder);
    });
    test('tasks: os windows', () => {
        const name = Platform.isWindows ? 'tsc.win' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder.task(name, name).group(Tasks.TaskGroup.Build).command().suppressTaskName(true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            windows: {
                command: 'tsc.win',
            },
        };
        testConfiguration(external, builder);
    });
    test('tasks: os windows & global isShellCommand', () => {
        const name = Platform.isWindows ? 'tsc.win' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder
            .task(name, name)
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            isShellCommand: true,
            windows: {
                command: 'tsc.win',
            },
        };
        testConfiguration(external, builder);
    });
    test('tasks: os mac', () => {
        const name = Platform.isMacintosh ? 'tsc.osx' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder.task(name, name).group(Tasks.TaskGroup.Build).command().suppressTaskName(true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            osx: {
                command: 'tsc.osx',
            },
        };
        testConfiguration(external, builder);
    });
    test('tasks: os linux', () => {
        const name = Platform.isLinux ? 'tsc.linux' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder.task(name, name).group(Tasks.TaskGroup.Build).command().suppressTaskName(true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            linux: {
                command: 'tsc.linux',
            },
        };
        testConfiguration(external, builder);
    });
    test('tasks: overwrite showOutput', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .presentation()
            .reveal(Platform.isWindows ? Tasks.RevealKind.Always : Tasks.RevealKind.Never);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'never',
            windows: {
                showOutput: 'always',
            },
        };
        testConfiguration(external, builder);
    });
    test('tasks: overwrite echo Command', () => {
        const builder = new ConfigurationBuilder();
        builder
            .task('tsc', 'tsc')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .presentation()
            .echo(Platform.isWindows ? false : true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            echoCommand: true,
            windows: {
                echoCommand: false,
            },
        };
        testConfiguration(external, builder);
    });
    test('tasks: global problemMatcher one', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            problemMatcher: '$msCompile',
        };
        testDefaultProblemMatcher(external, 1);
    });
    test('tasks: global problemMatcher two', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            problemMatcher: ['$eslint-compact', '$msCompile'],
        };
        testDefaultProblemMatcher(external, 2);
    });
    test('tasks: task definition', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: build task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    isBuildCommand: true,
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').group(Tasks.TaskGroup.Build).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: default build task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'build',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('build', 'tsc').group(Tasks.TaskGroup.Build).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: test task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    isTestCommand: true,
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').group(Tasks.TaskGroup.Test).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: default test task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'test',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('test', 'tsc').group(Tasks.TaskGroup.Test).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: task with values', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'test',
                    showOutput: 'never',
                    echoCommand: true,
                    args: ['--p'],
                    isWatching: true,
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('test', 'tsc')
            .group(Tasks.TaskGroup.Test)
            .isBackground(true)
            .promptOnClose(false)
            .command()
            .args(['$name', '--p'])
            .presentation()
            .echo(true)
            .reveal(Tasks.RevealKind.Never);
        testConfiguration(external, builder);
    });
    test('tasks: task inherits global values', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'never',
            echoCommand: true,
            tasks: [
                {
                    taskName: 'test',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('test', 'tsc')
            .group(Tasks.TaskGroup.Test)
            .command()
            .args(['$name'])
            .presentation()
            .echo(true)
            .reveal(Tasks.RevealKind.Never);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher default', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: 'abc',
                        },
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').command().args(['$name']).parent.problemMatcher().pattern(/abc/);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher .* regular expression', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: '.*',
                        },
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').command().args(['$name']).parent.problemMatcher().pattern(/.*/);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher owner, applyTo, severity and fileLocation', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        owner: 'myOwner',
                        applyTo: 'closedDocuments',
                        severity: 'warning',
                        fileLocation: 'absolute',
                        pattern: {
                            regexp: 'abc',
                        },
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('taskName', 'tsc')
            .command()
            .args(['$name'])
            .parent.problemMatcher()
            .owner('myOwner')
            .applyTo(ApplyToKind.closedDocuments)
            .severity(Severity.Warning)
            .fileLocation(FileLocationKind.Absolute)
            .filePrefix(undefined)
            .pattern(/abc/);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher fileLocation and filePrefix', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        fileLocation: ['relative', 'myPath'],
                        pattern: {
                            regexp: 'abc',
                        },
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('taskName', 'tsc')
            .command()
            .args(['$name'])
            .parent.problemMatcher()
            .fileLocation(FileLocationKind.Relative)
            .filePrefix('myPath')
            .pattern(/abc/);
        testConfiguration(external, builder);
    });
    test('tasks: problem pattern location', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: 'abc',
                            file: 10,
                            message: 11,
                            location: 12,
                            severity: 13,
                            code: 14,
                        },
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('taskName', 'tsc')
            .command()
            .args(['$name'])
            .parent.problemMatcher()
            .pattern(/abc/)
            .file(10)
            .message(11)
            .location(12)
            .severity(13)
            .code(14);
        testConfiguration(external, builder);
    });
    test('tasks: problem pattern line & column', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: 'abc',
                            file: 10,
                            message: 11,
                            line: 12,
                            column: 13,
                            endLine: 14,
                            endColumn: 15,
                            severity: 16,
                            code: 17,
                        },
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('taskName', 'tsc')
            .command()
            .args(['$name'])
            .parent.problemMatcher()
            .pattern(/abc/)
            .file(10)
            .message(11)
            .line(12)
            .character(13)
            .endLine(14)
            .endCharacter(15)
            .severity(16)
            .code(17);
        testConfiguration(external, builder);
    });
    test('tasks: prompt on close default', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').promptOnClose(true).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: prompt on close watching', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    isWatching: true,
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('taskName', 'tsc')
            .isBackground(true)
            .promptOnClose(false)
            .command()
            .args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: prompt on close set', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    promptOnClose: false,
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').promptOnClose(false).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: task selector set', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            taskSelector: '/t:',
            tasks: [
                {
                    taskName: 'taskName',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').command().taskSelector('/t:').args(['/t:taskName']);
        testConfiguration(external, builder);
    });
    test('tasks: suppress task name set', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            suppressTaskName: false,
            tasks: [
                {
                    taskName: 'taskName',
                    suppressTaskName: true,
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: suppress task name inherit', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            suppressTaskName: true,
            tasks: [
                {
                    taskName: 'taskName',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: two tasks', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskNameOne',
                },
                {
                    taskName: 'taskNameTwo',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().args(['$name']);
        builder.task('taskNameTwo', 'tsc').command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: with command', () => {
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: two tasks with command', () => {
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc',
                },
                {
                    taskName: 'taskNameTwo',
                    command: 'dir',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().suppressTaskName(true);
        builder.task('taskNameTwo', 'dir').command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: with command and args', () => {
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc',
                    isShellCommand: true,
                    args: ['arg'],
                    options: {
                        cwd: 'cwd',
                        env: {
                            env: 'env',
                        },
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('taskNameOne', 'tsc')
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .args(['arg'])
            .options({ cwd: 'cwd', env: { env: 'env' } });
        testConfiguration(external, builder);
    });
    test('tasks: with command os specific', () => {
        const name = Platform.isWindows ? 'tsc.win' : 'tsc';
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc',
                    windows: {
                        command: 'tsc.win',
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', name).command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: with Windows specific args', () => {
        const args = Platform.isWindows ? ['arg1', 'arg2'] : ['arg1'];
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'tsc',
                    command: 'tsc',
                    args: ['arg1'],
                    windows: {
                        args: ['arg2'],
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').command().suppressTaskName(true).args(args);
        testConfiguration(external, builder);
    });
    test('tasks: with Linux specific args', () => {
        const args = Platform.isLinux ? ['arg1', 'arg2'] : ['arg1'];
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'tsc',
                    command: 'tsc',
                    args: ['arg1'],
                    linux: {
                        args: ['arg2'],
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').command().suppressTaskName(true).args(args);
        testConfiguration(external, builder);
    });
    test('tasks: global command and task command properties', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    isShellCommand: true,
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().runtime(Tasks.RuntimeType.Shell).args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: global and tasks args', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            args: ['global'],
            tasks: [
                {
                    taskName: 'taskNameOne',
                    args: ['local'],
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().args(['global', '$name', 'local']);
        testConfiguration(external, builder);
    });
    test('tasks: global and tasks args with task selector', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            args: ['global'],
            taskSelector: '/t:',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    args: ['local'],
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('taskNameOne', 'tsc')
            .command()
            .taskSelector('/t:')
            .args(['global', '/t:taskNameOne', 'local']);
        testConfiguration(external, builder);
    });
});
suite('Tasks version 2.0.0', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test.skip('Build workspace task', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: 'build',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('dir', 'dir')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .presentation()
            .echo(true);
        testConfiguration(external, builder);
    });
    test('Global group none', () => {
        const external = {
            version: '2.0.0',
            command: 'dir',
            type: 'shell',
            group: 'none',
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('dir', 'dir')
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .presentation()
            .echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Global group build', () => {
        const external = {
            version: '2.0.0',
            command: 'dir',
            type: 'shell',
            group: 'build',
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('dir', 'dir')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .presentation()
            .echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Global group default build', () => {
        const external = {
            version: '2.0.0',
            command: 'dir',
            type: 'shell',
            group: { kind: 'build', isDefault: true },
        };
        const builder = new ConfigurationBuilder();
        const taskGroup = Tasks.TaskGroup.Build;
        taskGroup.isDefault = true;
        builder
            .task('dir', 'dir')
            .group(taskGroup)
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .presentation()
            .echo(true);
        testConfiguration(external, builder);
    });
    test('Local group none', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: 'none',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('dir', 'dir')
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .presentation()
            .echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Local group build', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: 'build',
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('dir', 'dir')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .presentation()
            .echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Local group default build', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: { kind: 'build', isDefault: true },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        const taskGroup = Tasks.TaskGroup.Build;
        taskGroup.isDefault = true;
        builder
            .task('dir', 'dir')
            .group(taskGroup)
            .command()
            .suppressTaskName(true)
            .runtime(Tasks.RuntimeType.Shell)
            .presentation()
            .echo(true);
        testConfiguration(external, builder);
    });
    test('Arg overwrite', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    label: 'echo',
                    type: 'shell',
                    command: 'echo',
                    args: ['global'],
                    windows: {
                        args: ['windows'],
                    },
                    linux: {
                        args: ['linux'],
                    },
                    osx: {
                        args: ['osx'],
                    },
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        if (Platform.isWindows) {
            builder
                .task('echo', 'echo')
                .command()
                .suppressTaskName(true)
                .args(['windows'])
                .runtime(Tasks.RuntimeType.Shell)
                .presentation()
                .echo(true);
            testConfiguration(external, builder);
        }
        else if (Platform.isLinux) {
            builder
                .task('echo', 'echo')
                .command()
                .suppressTaskName(true)
                .args(['linux'])
                .runtime(Tasks.RuntimeType.Shell)
                .presentation()
                .echo(true);
            testConfiguration(external, builder);
        }
        else if (Platform.isMacintosh) {
            builder
                .task('echo', 'echo')
                .command()
                .suppressTaskName(true)
                .args(['osx'])
                .runtime(Tasks.RuntimeType.Shell)
                .presentation()
                .echo(true);
            testConfiguration(external, builder);
        }
    });
});
suite('Bugs / regression tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    (Platform.isLinux ? test.skip : test)('Bug 19548', () => {
        const external = {
            version: '0.1.0',
            windows: {
                command: 'powershell',
                options: {
                    cwd: '${workspaceFolder}',
                },
                tasks: [
                    {
                        taskName: 'composeForDebug',
                        suppressTaskName: true,
                        args: [
                            '-ExecutionPolicy',
                            'RemoteSigned',
                            '.\\dockerTask.ps1',
                            '-ComposeForDebug',
                            '-Environment',
                            'debug',
                        ],
                        isBuildCommand: false,
                        showOutput: 'always',
                        echoCommand: true,
                    },
                ],
            },
            osx: {
                command: '/bin/bash',
                options: {
                    cwd: '${workspaceFolder}',
                },
                tasks: [
                    {
                        taskName: 'composeForDebug',
                        suppressTaskName: true,
                        args: ['-c', './dockerTask.sh composeForDebug debug'],
                        isBuildCommand: false,
                        showOutput: 'always',
                    },
                ],
            },
        };
        const builder = new ConfigurationBuilder();
        if (Platform.isWindows) {
            builder
                .task('composeForDebug', 'powershell')
                .command()
                .suppressTaskName(true)
                .args([
                '-ExecutionPolicy',
                'RemoteSigned',
                '.\\dockerTask.ps1',
                '-ComposeForDebug',
                '-Environment',
                'debug',
            ])
                .options({ cwd: '${workspaceFolder}' })
                .presentation()
                .echo(true)
                .reveal(Tasks.RevealKind.Always);
            testConfiguration(external, builder);
        }
        else if (Platform.isMacintosh) {
            builder
                .task('composeForDebug', '/bin/bash')
                .command()
                .suppressTaskName(true)
                .args(['-c', './dockerTask.sh composeForDebug debug'])
                .options({ cwd: '${workspaceFolder}' })
                .presentation()
                .reveal(Tasks.RevealKind.Always);
            testConfiguration(external, builder);
        }
    });
    test('Bug 28489', () => {
        const external = {
            version: '0.1.0',
            command: '',
            isShellCommand: true,
            args: [''],
            showOutput: 'always',
            tasks: [
                {
                    taskName: 'build',
                    command: 'bash',
                    args: ['build.sh'],
                },
            ],
        };
        const builder = new ConfigurationBuilder();
        builder
            .task('build', 'bash')
            .group(Tasks.TaskGroup.Build)
            .command()
            .suppressTaskName(true)
            .args(['build.sh'])
            .runtime(Tasks.RuntimeType.Shell);
        testConfiguration(external, builder);
    });
});
class TestNamedProblemMatcher {
}
class TestParseContext {
}
class TestTaskDefinitionRegistry {
    get(key) {
        return this._task;
    }
    set(task) {
        this._task = task;
    }
}
suite('Task configuration conversions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const globals = {};
    const taskConfigSource = {};
    const TaskDefinitionRegistry = new TestTaskDefinitionRegistry();
    let instantiationService;
    let parseContext;
    let namedProblemMatcher;
    let problemReporter;
    setup(() => {
        instantiationService = new TestInstantiationService();
        namedProblemMatcher = instantiationService.createInstance(TestNamedProblemMatcher);
        namedProblemMatcher.name = 'real';
        namedProblemMatcher.label = 'real label';
        problemReporter = new ProblemReporter();
        parseContext = instantiationService.createInstance(TestParseContext);
        parseContext.problemReporter = problemReporter;
        parseContext.namedProblemMatchers = { real: namedProblemMatcher };
        parseContext.uuidMap = new UUIDMap();
    });
    teardown(() => {
        instantiationService.dispose();
    });
    suite('ProblemMatcherConverter.from', () => {
        test('returns [] and an error for an unknown problem matcher', () => {
            const result = ProblemMatcherConverter.from('$fake', parseContext);
            assert.deepEqual(result.value, []);
            assert.strictEqual(result.errors?.length, 1);
        });
        test('returns config for a known problem matcher', () => {
            const result = ProblemMatcherConverter.from('$real', parseContext);
            assert.strictEqual(result.errors?.length, 0);
            assert.deepEqual(result.value, [{ label: 'real label' }]);
        });
        test('returns config for a known problem matcher including applyTo', () => {
            namedProblemMatcher.applyTo = ApplyToKind.closedDocuments;
            const result = ProblemMatcherConverter.from('$real', parseContext);
            assert.strictEqual(result.errors?.length, 0);
            assert.deepEqual(result.value, [
                { label: 'real label', applyTo: ApplyToKind.closedDocuments },
            ]);
        });
    });
    suite('TaskParser.from', () => {
        suite('CustomTask', () => {
            suite('incomplete config reports an appropriate error for missing', () => {
                test('name', () => {
                    const result = TaskParser.from([{}], globals, parseContext, taskConfigSource);
                    assertTaskParseResult(result, undefined, problemReporter, 'Error: a task must provide a label property');
                });
                test('command', () => {
                    const result = TaskParser.from([{ taskName: 'task' }], globals, parseContext, taskConfigSource);
                    assertTaskParseResult(result, undefined, problemReporter, "Error: the task 'task' doesn't define a command");
                });
            });
            test('returns expected result', () => {
                const expected = [
                    { taskName: 'task', command: 'echo test' },
                    { taskName: 'task 2', command: 'echo test' },
                ];
                const result = TaskParser.from(expected, globals, parseContext, taskConfigSource);
                assertTaskParseResult(result, { custom: expected }, problemReporter, undefined);
            });
        });
        suite('ConfiguredTask', () => {
            test('returns expected result', () => {
                const expected = [
                    { taskName: 'task', command: 'echo test', type: 'any', label: 'task' },
                    { taskName: 'task 2', command: 'echo test', type: 'any', label: 'task 2' },
                ];
                TaskDefinitionRegistry.set({
                    extensionId: 'registered',
                    taskType: 'any',
                    properties: {},
                });
                const result = TaskParser.from(expected, globals, parseContext, taskConfigSource, TaskDefinitionRegistry);
                assertTaskParseResult(result, { configured: expected }, problemReporter, undefined);
            });
        });
    });
});
function assertTaskParseResult(actual, expected, problemReporter, expectedMessage) {
    if (expectedMessage === undefined) {
        assert.strictEqual(problemReporter.lastMessage, undefined);
    }
    else {
        assert.ok(problemReporter.lastMessage?.includes(expectedMessage));
    }
    assert.deepEqual(actual.custom.length, expected?.custom?.length || 0);
    assert.deepEqual(actual.configured.length, expected?.configured?.length || 0);
    let index = 0;
    if (expected?.configured) {
        for (const taskParseResult of expected?.configured) {
            assert.strictEqual(actual.configured[index]._label, taskParseResult.label);
            index++;
        }
    }
    index = 0;
    if (expected?.custom) {
        for (const taskParseResult of expected?.custom) {
            assert.strictEqual(actual.custom[index]._label, taskParseResult.taskName);
            index++;
        }
    }
    problemReporter.clearMessage();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0NvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvdGVzdC9jb21tb24vdGFza0NvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFFMUQsT0FBTyxLQUFLLEtBQUssTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RCxPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixnQkFBZ0IsRUFFaEIsV0FBVyxHQUVYLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLHVEQUF1RCxDQUFBO0FBRW5HLE9BQU8sS0FBSyxLQUFLLE1BQU0sdUJBQXVCLENBQUE7QUFDOUMsT0FBTyxFQUNOLEtBQUssRUFLTCxnQkFBZ0IsRUFFaEIsdUJBQXVCLEVBR3ZCLE9BQU8sRUFDUCxVQUFVLEdBQ1YsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUUvRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFFeEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFF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QixLQUFLLE1BQU0sZUFBZSxJQUFJLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQztZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMxRSxLQUFLLEVBQUUsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0lBQ0QsS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUNULElBQUksUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ3RCLEtBQUssTUFBTSxlQUFlLElBQUksUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pFLEtBQUssRUFBRSxDQUFBO1FBQ1IsQ0FBQztJQUNGLENBQUM7SUFDRCxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUE7QUFDL0IsQ0FBQyJ9