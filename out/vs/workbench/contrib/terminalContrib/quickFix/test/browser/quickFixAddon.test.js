/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { Event } from '../../../../../../base/common/event.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestCommandService } from '../../../../../../editor/test/browser/editorTestServices.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextMenuService } from '../../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { CommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITerminalQuickFixService } from '../../browser/quickFix.js';
import { getQuickFixesForCommand, TerminalQuickFixAddon } from '../../browser/quickFixAddon.js';
import { freePort, FreePortOutputRegex, gitCreatePr, GitCreatePrOutputRegex, gitFastForwardPull, GitFastForwardPullOutputRegex, GitPushOutputRegex, gitPushSetUpstream, gitSimilar, GitSimilarOutputRegex, gitTwoDashes, GitTwoDashesRegex, pwshGeneralError, PwshGeneralErrorOutputRegex, pwshUnixCommandNotFoundError, PwshUnixCommandNotFoundErrorOutputRegex, } from '../../browser/terminalQuickFixBuiltinActions.js';
import { TestStorageService } from '../../../../../test/common/workbenchTestServices.js';
suite('QuickFixAddon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let quickFixAddon;
    let commandDetection;
    let commandService;
    let openerService;
    let labelService;
    let terminal;
    let instantiationService;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        terminal = store.add(new TerminalCtor({
            allowProposedApi: true,
            cols: 80,
            rows: 30,
        }));
        instantiationService.stub(IStorageService, store.add(new TestStorageService()));
        instantiationService.stub(ITerminalQuickFixService, {
            onDidRegisterProvider: Event.None,
            onDidUnregisterProvider: Event.None,
            onDidRegisterCommandSelector: Event.None,
            extensionQuickFixes: Promise.resolve([]),
        });
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        labelService = instantiationService.stub(ILabelService, {});
        const capabilities = store.add(new TerminalCapabilityStore());
        instantiationService.stub(ILogService, new NullLogService());
        commandDetection = store.add(instantiationService.createInstance(CommandDetectionCapability, terminal));
        capabilities.add(2 /* TerminalCapability.CommandDetection */, commandDetection);
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
        openerService = instantiationService.stub(IOpenerService, {});
        commandService = new TestCommandService(instantiationService);
        quickFixAddon = instantiationService.createInstance(TerminalQuickFixAddon, [], capabilities);
        terminal.loadAddon(quickFixAddon);
    });
    suite('registerCommandFinishedListener & getMatchActions', () => {
        suite('gitSimilarCommand', () => {
            const expectedMap = new Map();
            const command = `git sttatus`;
            let output = `git: 'sttatus' is not a git command. See 'git --help'.

			The most similar command is
			status`;
            const exitCode = 1;
            const actions = [
                {
                    id: 'Git Similar',
                    enabled: true,
                    label: 'Run: git status',
                    tooltip: 'Run: git status',
                    command: 'git status',
                },
            ];
            const outputLines = output.split('\n');
            setup(() => {
                const command = gitSimilar();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitSimilarOutputRegex, exitCode, [
                        `invalid output`,
                    ]), expectedMap, commandService, openerService, labelService), undefined);
                });
                test('command does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(`gt sttatus`, output, GitSimilarOutputRegex, exitCode, outputLines), expectedMap, commandService, openerService, labelService), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitSimilarOutputRegex, exitCode, outputLines), expectedMap, commandService, openerService, labelService), actions);
                });
                test('matching exit status', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitSimilarOutputRegex, 2, outputLines), expectedMap, commandService, openerService, labelService), actions);
                });
            });
            suite('returns match', () => {
                test('returns match', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitSimilarOutputRegex, exitCode, outputLines), expectedMap, commandService, openerService, labelService), actions);
                });
                test('returns multiple match', async () => {
                    output = `git: 'pu' is not a git command. See 'git --help'.
				The most similar commands are
						pull
						push`;
                    const actions = [
                        {
                            id: 'Git Similar',
                            enabled: true,
                            label: 'Run: git pull',
                            tooltip: 'Run: git pull',
                            command: 'git pull',
                        },
                        {
                            id: 'Git Similar',
                            enabled: true,
                            label: 'Run: git push',
                            tooltip: 'Run: git push',
                            command: 'git push',
                        },
                    ];
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand('git pu', output, GitSimilarOutputRegex, exitCode, output.split('\n')), expectedMap, commandService, openerService, labelService), actions);
                });
                test('passes any arguments through', async () => {
                    output = `git: 'checkoutt' is not a git command. See 'git --help'.
				The most similar commands are
						checkout`;
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand('git checkoutt .', output, GitSimilarOutputRegex, exitCode, output.split('\n')), expectedMap, commandService, openerService, labelService), [
                        {
                            id: 'Git Similar',
                            enabled: true,
                            label: 'Run: git checkout .',
                            tooltip: 'Run: git checkout .',
                            command: 'git checkout .',
                        },
                    ]);
                });
            });
        });
        suite('gitTwoDashes', () => {
            const expectedMap = new Map();
            const command = `git add . -all`;
            const output = 'error: did you mean `--all` (with two dashes)?';
            const exitCode = 1;
            const actions = [
                {
                    id: 'Git Two Dashes',
                    enabled: true,
                    label: 'Run: git add . --all',
                    tooltip: 'Run: git add . --all',
                    command: 'git add . --all',
                },
            ];
            setup(() => {
                const command = gitTwoDashes();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitTwoDashesRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
                test('command does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(`gt sttatus`, output, GitTwoDashesRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitTwoDashesRegex, exitCode), expectedMap, commandService, openerService, labelService), actions);
                });
                test('matching exit status', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitTwoDashesRegex, 2), expectedMap, commandService, openerService, labelService), actions);
                });
            });
        });
        suite('gitFastForwardPull', () => {
            const expectedMap = new Map();
            const command = `git checkout vnext`;
            const output = "Already on 'vnext' \n Your branch is behind 'origin/vnext' by 1 commit, and can be fast-forwarded.";
            const exitCode = 0;
            const actions = [
                {
                    id: 'Git Fast Forward Pull',
                    enabled: true,
                    label: 'Run: git pull',
                    tooltip: 'Run: git pull',
                    command: 'git pull',
                },
            ];
            setup(() => {
                const command = gitFastForwardPull();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitFastForwardPullOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
                test('command does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(`gt add`, output, GitFastForwardPullOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
                test('exit code does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitFastForwardPullOutputRegex, 2), expectedMap, commandService, openerService, labelService), undefined);
                });
            });
            suite('returns actions when', () => {
                test('matching exit status, command, ouput', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitFastForwardPullOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), actions);
                });
            });
        });
        if (!isWindows) {
            suite('freePort', () => {
                const expectedMap = new Map();
                const portCommand = `yarn start dev`;
                const output = `yarn run v1.22.17
			warning ../../package.json: No license field
			Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
				at Server.setupListenHandle [as _listen2] (node:net:1315:16)
				at listenInCluster (node:net:1363:12)
				at doListen (node:net:1501:7)
				at processTicksAndRejections (node:internal/process/task_queues:84:21)
			Emitted 'error' event on WebSocketServer instance at:
				at Server.emit (node:events:394:28)
				at emitErrorNT (node:net:1342:8)
				at processTicksAndRejections (node:internal/process/task_queues:83:21) {
			}
			error Command failed with exit code 1.
			info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.`;
                const actionOptions = [
                    {
                        id: 'Free Port',
                        label: 'Free port 3000',
                        run: true,
                        tooltip: 'Free port 3000',
                        enabled: true,
                    },
                ];
                setup(() => {
                    const command = freePort(() => Promise.resolve());
                    expectedMap.set(command.commandLineMatcher.toString(), [command]);
                    quickFixAddon.registerCommandFinishedListener(command);
                });
                suite('returns undefined when', () => {
                    test('output does not match', async () => {
                        strictEqual(await getQuickFixesForCommand([], terminal, createCommand(portCommand, `invalid output`, FreePortOutputRegex), expectedMap, commandService, openerService, labelService), undefined);
                    });
                });
                test('returns actions', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(portCommand, output, FreePortOutputRegex), expectedMap, commandService, openerService, labelService), actionOptions);
                });
            });
        }
        suite('gitPushSetUpstream', () => {
            const expectedMap = new Map();
            const command = `git push`;
            const output = `fatal: The current branch test22 has no upstream branch.
			To push the current branch and set the remote as upstream, use

				git push --set-upstream origin test22`;
            const exitCode = 128;
            const actions = [
                {
                    id: 'Git Push Set Upstream',
                    enabled: true,
                    label: 'Run: git push --set-upstream origin test22',
                    tooltip: 'Run: git push --set-upstream origin test22',
                    command: 'git push --set-upstream origin test22',
                },
            ];
            setup(() => {
                const command = gitPushSetUpstream();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
                test('command does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(`git status`, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), actions);
                });
                test('matching exit status', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, 2), expectedMap, commandService, openerService, labelService), actions);
                });
            });
        });
        suite('gitCreatePr', () => {
            const expectedMap = new Map();
            const command = `git push`;
            const output = `Total 0 (delta 0), reused 0 (delta 0), pack-reused 0
			remote:
			remote: Create a pull request for 'test22' on GitHub by visiting:
			remote:      https://github.com/meganrogge/xterm.js/pull/new/test22
			remote:
			To https://github.com/meganrogge/xterm.js
			 * [new branch]        test22 -> test22
			Branch 'test22' set up to track remote branch 'test22' from 'origin'. `;
            const exitCode = 0;
            const actions = [
                {
                    id: 'Git Create Pr',
                    enabled: true,
                    label: 'Open: https://github.com/meganrogge/xterm.js/pull/new/test22',
                    tooltip: 'Open: https://github.com/meganrogge/xterm.js/pull/new/test22',
                    uri: URI.parse('https://github.com/meganrogge/xterm.js/pull/new/test22'),
                },
            ];
            setup(() => {
                const command = gitCreatePr();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitCreatePrOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
                test('command does not match', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(`git status`, output, GitCreatePrOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
                });
                test('failure exit status', async () => {
                    strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitCreatePrOutputRegex, 2), expectedMap, commandService, openerService, labelService), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitCreatePrOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), actions);
                });
            });
        });
    });
    suite('gitPush - multiple providers', () => {
        const expectedMap = new Map();
        const command = `git push`;
        const output = `fatal: The current branch test22 has no upstream branch.
		To push the current branch and set the remote as upstream, use

			git push --set-upstream origin test22`;
        const exitCode = 128;
        const actions = [
            {
                id: 'Git Push Set Upstream',
                enabled: true,
                label: 'Run: git push --set-upstream origin test22',
                tooltip: 'Run: git push --set-upstream origin test22',
                command: 'git push --set-upstream origin test22',
            },
        ];
        setup(() => {
            const pushCommand = gitPushSetUpstream();
            const prCommand = gitCreatePr();
            quickFixAddon.registerCommandFinishedListener(prCommand);
            expectedMap.set(pushCommand.commandLineMatcher.toString(), [pushCommand, prCommand]);
        });
        suite('returns undefined when', () => {
            test('output does not match', async () => {
                strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
            });
            test('command does not match', async () => {
                strictEqual(await getQuickFixesForCommand([], terminal, createCommand(`git status`, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
            });
        });
        suite('returns actions when', () => {
            test('expected unix exit code', async () => {
                assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), actions);
            });
            test('matching exit status', async () => {
                assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, 2), expectedMap, commandService, openerService, labelService), actions);
            });
        });
    });
    suite('pwsh feedback providers', () => {
        suite('General', () => {
            const expectedMap = new Map();
            const command = `not important`;
            const output = [
                `...`,
                ``,
                `Suggestion [General]:`,
                `  The most similar commands are: python3, python3m, pamon, python3.6, rtmon, echo, pushd, etsn, pwsh, pwconv.`,
                ``,
                `Suggestion [cmd-not-found]:`,
                `  Command 'python' not found, but can be installed with:`,
                `  sudo apt install python3`,
                `  sudo apt install python`,
                `  sudo apt install python-minimal`,
                `  You also have python3 installed, you can run 'python3' instead.'`,
                ``,
            ].join('\n');
            const exitCode = 128;
            const actions = [
                'python3',
                'python3m',
                'pamon',
                'python3.6',
                'rtmon',
                'echo',
                'pushd',
                'etsn',
                'pwsh',
                'pwconv',
            ].map((command) => {
                return {
                    id: 'Pwsh General Error',
                    enabled: true,
                    label: `Run: ${command}`,
                    tooltip: `Run: ${command}`,
                    command: command,
                };
            });
            setup(() => {
                const pushCommand = pwshGeneralError();
                quickFixAddon.registerCommandFinishedListener(pushCommand);
                expectedMap.set(pushCommand.commandLineMatcher.toString(), [pushCommand]);
            });
            test('returns undefined when output does not match', async () => {
                strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, PwshGeneralErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
            });
            test('returns actions when output matches', async () => {
                assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, PwshGeneralErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), actions);
            });
        });
        suite('Unix cmd-not-found', () => {
            const expectedMap = new Map();
            const command = `not important`;
            const output = [
                `...`,
                ``,
                `Suggestion [General]`,
                `  The most similar commands are: python3, python3m, pamon, python3.6, rtmon, echo, pushd, etsn, pwsh, pwconv.`,
                ``,
                `Suggestion [cmd-not-found]:`,
                `  Command 'python' not found, but can be installed with:`,
                `  sudo apt install python3`,
                `  sudo apt install python`,
                `  sudo apt install python-minimal`,
                `  You also have python3 installed, you can run 'python3' instead.'`,
                ``,
            ].join('\n');
            const exitCode = 128;
            const actions = [
                'sudo apt install python3',
                'sudo apt install python',
                'sudo apt install python-minimal',
                'python3',
            ].map((command) => {
                return {
                    id: 'Pwsh Unix Command Not Found Error',
                    enabled: true,
                    label: `Run: ${command}`,
                    tooltip: `Run: ${command}`,
                    command: command,
                };
            });
            setup(() => {
                const pushCommand = pwshUnixCommandNotFoundError();
                quickFixAddon.registerCommandFinishedListener(pushCommand);
                expectedMap.set(pushCommand.commandLineMatcher.toString(), [pushCommand]);
            });
            test('returns undefined when output does not match', async () => {
                strictEqual(await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, PwshUnixCommandNotFoundErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), undefined);
            });
            test('returns actions when output matches', async () => {
                assertMatchOptions(await getQuickFixesForCommand([], terminal, createCommand(command, output, PwshUnixCommandNotFoundErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService), actions);
            });
        });
    });
});
function createCommand(command, output, outputMatcher, exitCode, outputLines) {
    return {
        cwd: '',
        commandStartLineContent: '',
        markProperties: {},
        executedX: undefined,
        startX: undefined,
        command,
        isTrusted: true,
        exitCode,
        getOutput: () => {
            return output;
        },
        getOutputMatch: (_matcher) => {
            if (outputMatcher) {
                const regexMatch = output.match(outputMatcher) ?? undefined;
                if (regexMatch) {
                    return outputLines ? { regexMatch, outputLines } : { regexMatch, outputLines: [] };
                }
            }
            return undefined;
        },
        timestamp: Date.now(),
        hasOutput: () => !!output,
    };
}
function assertMatchOptions(actual, expected) {
    strictEqual(actual?.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
        const expectedItem = expected[i];
        const actualItem = actual[i];
        strictEqual(actualItem.id, expectedItem.id, `ID`);
        strictEqual(actualItem.enabled, expectedItem.enabled, `enabled`);
        strictEqual(actualItem.label, expectedItem.label, `label`);
        strictEqual(actualItem.tooltip, expectedItem.tooltip, `tooltip`);
        if (expectedItem.command) {
            strictEqual(actualItem.command, expectedItem.command);
        }
        if (expectedItem.uri) {
            strictEqual(actualItem.uri.toString(), expectedItem.uri.toString());
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3F1aWNrRml4L3Rlc3QvYnJvd3Nlci9xdWlja0ZpeEFkZG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9E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