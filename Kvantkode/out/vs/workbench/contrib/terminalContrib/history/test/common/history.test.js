/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual, ok } from 'assert';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { join } from '../../../../../../base/common/path.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { env } from '../../../../../../base/common/process.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IRemoteAgentService, } from '../../../../../services/remote/common/remoteAgentService.js';
import { TestStorageService } from '../../../../../test/common/workbenchTestServices.js';
import { fetchBashHistory, fetchFishHistory, fetchPwshHistory, fetchZshHistory, sanitizeFishHistoryCmd, TerminalPersistedHistory, } from '../../common/history.js';
function getConfig(limit) {
    return {
        terminal: {
            integrated: {
                shellIntegration: {
                    history: limit,
                },
            },
        },
    };
}
const expectedCommands = [
    'single line command',
    'git commit -m "A wrapped line in pwsh history\n\nSome commit description\n\nFixes #xyz"',
    'git status',
    'two "\nline"',
];
suite('Terminal history', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('TerminalPersistedHistory', () => {
        let history;
        let instantiationService;
        let configurationService;
        setup(() => {
            configurationService = new TestConfigurationService(getConfig(5));
            instantiationService = store.add(new TestInstantiationService());
            instantiationService.set(IConfigurationService, configurationService);
            instantiationService.set(IStorageService, store.add(new TestStorageService()));
            history = store.add(instantiationService.createInstance((TerminalPersistedHistory), 'test'));
        });
        teardown(() => {
            instantiationService.dispose();
        });
        test('should support adding items to the cache and respect LRU', () => {
            history.add('foo', 1);
            deepStrictEqual(Array.from(history.entries), [['foo', 1]]);
            history.add('bar', 2);
            deepStrictEqual(Array.from(history.entries), [
                ['foo', 1],
                ['bar', 2],
            ]);
            history.add('foo', 1);
            deepStrictEqual(Array.from(history.entries), [
                ['bar', 2],
                ['foo', 1],
            ]);
        });
        test('should support removing specific items', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            history.add('4', 4);
            history.add('5', 5);
            strictEqual(Array.from(history.entries).length, 5);
            history.add('6', 6);
            strictEqual(Array.from(history.entries).length, 5);
        });
        test('should limit the number of entries based on config', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            history.add('4', 4);
            history.add('5', 5);
            strictEqual(Array.from(history.entries).length, 5);
            history.add('6', 6);
            strictEqual(Array.from(history.entries).length, 5);
            configurationService.setUserConfiguration('terminal', getConfig(2).terminal);
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
            });
            strictEqual(Array.from(history.entries).length, 2);
            history.add('7', 7);
            strictEqual(Array.from(history.entries).length, 2);
            configurationService.setUserConfiguration('terminal', getConfig(3).terminal);
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
            });
            strictEqual(Array.from(history.entries).length, 2);
            history.add('8', 8);
            strictEqual(Array.from(history.entries).length, 3);
            history.add('9', 9);
            strictEqual(Array.from(history.entries).length, 3);
        });
        test('should reload from storage service after recreation', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            strictEqual(Array.from(history.entries).length, 3);
            const history2 = store.add(instantiationService.createInstance(TerminalPersistedHistory, 'test'));
            strictEqual(Array.from(history2.entries).length, 3);
        });
    });
    suite('fetchBashHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            'single line command',
            'git commit -m "A wrapped line in pwsh history',
            '',
            'Some commit description',
            '',
            'Fixes #xyz"',
            'git status',
            'two "',
            'line"',
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                },
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() {
                    return remoteEnvironment;
                },
                getConnection() {
                    return remoteConnection;
                },
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.bash_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.bash_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.bash_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchBashHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchZshHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            ': 1655252330:0;single line command',
            ': 1655252330:0;git commit -m "A wrapped line in pwsh history\\',
            '\\',
            'Some commit description\\',
            '\\',
            'Fixes #xyz"',
            ': 1655252330:0;git status',
            ': 1655252330:0;two "\\',
            'line"',
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                },
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() {
                    return remoteEnvironment;
                },
                getConnection() {
                    return remoteConnection;
                },
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.bash_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.zsh_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.zsh_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchZshHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchPwshHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            'single line command',
            'git commit -m "A wrapped line in pwsh history`',
            '`',
            'Some commit description`',
            '`',
            'Fixes #xyz"',
            'git status',
            'two "`',
            'line"',
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({
                        scheme: fileScheme,
                        authority: remoteConnection?.remoteAuthority,
                        path: URI.file(filePath).path,
                    });
                    // Sanitize the encoded `/` chars as they don't impact behavior
                    strictEqual(resource.toString().replaceAll('%5C', '/'), expected.toString().replaceAll('%5C', '/'));
                    return { value: VSBuffer.fromString(fileContent) };
                },
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() {
                    return remoteEnvironment;
                },
                getConnection() {
                    return remoteConnection;
                },
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        suite('local', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
                env['HOME'] = '/home/user';
                env['APPDATA'] = 'C:\\AppData';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.zsh_history';
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
                if (originalEnvValues['APPDATA'] === undefined) {
                    delete env['APPDATA'];
                }
                else {
                    env['APPDATA'] = originalEnvValues['APPDATA'];
                }
            });
            test('current OS', async () => {
                if (isWindows) {
                    filePath = join(env['APPDATA'], 'Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt');
                }
                else {
                    filePath = join(env['HOME'], '.local/share/powershell/PSReadline/ConsoleHost_history.txt');
                }
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
        });
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
                if (originalEnvValues['APPDATA'] === undefined) {
                    delete env['APPDATA'];
                }
                else {
                    env['APPDATA'] = originalEnvValues['APPDATA'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                env['APPDATA'] = 'C:\\AppData';
                filePath =
                    'C:\\AppData\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                env['HOME'] = '/home/user';
                filePath = '/home/user/.local/share/powershell/PSReadline/ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                env['HOME'] = '/home/user';
                filePath = '/home/user/.local/share/powershell/PSReadline/ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchFishHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            '- cmd: single line command',
            '  when: 1650000000',
            '- cmd: git commit -m "A wrapped line in pwsh history\\n\\nSome commit description\\n\\nFixes #xyz"',
            '  when: 1650000010',
            '- cmd: git status',
            '  when: 1650000020',
            '- cmd: two "\\nline"',
            '  when: 1650000030',
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                },
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() {
                    return remoteEnvironment;
                },
                getConnection() {
                    return remoteConnection;
                },
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.local/share/fish/fish_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.local/share/fish/fish_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
                });
            });
            suite('local (overriden path)', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { XDG_DATA_HOME: env['XDG_DATA_HOME'] };
                    env['XDG_DATA_HOME'] = '/home/user/data-home';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/data-home/fish/fish_history';
                });
                teardown(() => {
                    if (originalEnvValues['XDG_DATA_HOME'] === undefined) {
                        delete env['XDG_DATA_HOME'];
                    }
                    else {
                        env['XDG_DATA_HOME'] = originalEnvValues['XDG_DATA_HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/data-home/fish/fish_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.local/share/fish/fish_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchFishHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
        });
        suite('remote (overriden path)', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { XDG_DATA_HOME: env['XDG_DATA_HOME'] };
                env['XDG_DATA_HOME'] = '/home/user/data-home';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/data-home/fish/fish_history';
            });
            teardown(() => {
                if (originalEnvValues['XDG_DATA_HOME'] === undefined) {
                    delete env['XDG_DATA_HOME'];
                }
                else {
                    env['XDG_DATA_HOME'] = originalEnvValues['XDG_DATA_HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchFishHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
        });
        suite('sanitizeFishHistoryCmd', () => {
            test('valid new-lines', () => {
                /**
                 * Valid new-lines have odd number of leading backslashes: \n, \\\n, \\\\\n
                 */
                const cases = [
                    '\\n',
                    '\\n at start',
                    'some \\n in the middle',
                    'at the end \\n',
                    '\\\\\\n',
                    '\\\\\\n valid at start',
                    'valid \\\\\\n in the middle',
                    'valid in the end \\\\\\n',
                    '\\\\\\\\\\n',
                    '\\\\\\\\\\n valid at start',
                    'valid \\\\\\\\\\n in the middle',
                    'valid in the end \\\\\\\\\\n',
                    'mixed valid \\r\\n',
                    'mixed valid \\\\\\r\\n',
                    'mixed valid \\r\\\\\\n',
                ];
                for (const x of cases) {
                    ok(sanitizeFishHistoryCmd(x).includes('\n'));
                }
            });
            test('invalid new-lines', () => {
                /**
                 * Invalid new-lines have even number of leading backslashes: \\n, \\\\n, \\\\\\n
                 */
                const cases = [
                    '\\\\n',
                    '\\\\n invalid at start',
                    'invalid \\\\n in the middle',
                    'invalid in the end \\\\n',
                    '\\\\\\\\n',
                    '\\\\\\\\n invalid at start',
                    'invalid \\\\\\\\n in the middle',
                    'invalid in the end \\\\\\\\n',
                    'mixed invalid \\r\\\\n',
                    'mixed invalid \\r\\\\\\\\n',
                    'echo "\\\\n"',
                ];
                for (const x of cases) {
                    ok(!sanitizeFishHistoryCmd(x).includes('\n'));
                }
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvaGlzdG9yeS90ZXN0L2NvbW1vbi9oaXN0b3J5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sMkNBQTJDLENBQUE7QUFDdEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFFM0gsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3RGLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQs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