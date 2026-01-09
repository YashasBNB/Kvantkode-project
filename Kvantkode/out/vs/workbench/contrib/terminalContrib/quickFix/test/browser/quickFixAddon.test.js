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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvcXVpY2tGaXgvdGVzdC9icm93c2VyL3F1aWNrRml4QWRkb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRS9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFGLE9BQU8sRUFB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