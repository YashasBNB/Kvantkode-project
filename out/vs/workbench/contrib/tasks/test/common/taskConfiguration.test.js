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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0NvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL3Rlc3QvY29tbW9uL3Rhc2tDb25maWd1cmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBRTFELE9BQU8sS0FBSyxLQUFLLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sZ0JBQWdCLEVBRWhCLFdBQVcsR0FFWCxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxlQUFlLEVBQWMsTUFBTSx1REFBdUQsQ0FBQTtBQUVuRyxPQUFPLEtBQUssS0FBSyxNQUFNLHVCQUF1QixDQUFBO0FBQzlDLE9BQU8sRUFDTixLQUFLLEVBS0wsZ0JBQWdCLEVBRWhCLHVCQUF1QixFQUd2QixPQUFPLEVBQ1AsVUFBVSxHQUNWLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFL0csT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBRXhILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxH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QUFRLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDMUUsS0FBSyxFQUFFLENBQUE7UUFDUixDQUFDO0lBQ0YsQ0FBQztJQUNELEtBQUssR0FBRyxDQUFDLENBQUE7SUFDVCxJQUFJLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUN0QixLQUFLLE1BQU0sZUFBZSxJQUFJLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN6RSxLQUFLLEVBQUUsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0lBQ0QsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFBO0FBQy9CLENBQUMifQ==