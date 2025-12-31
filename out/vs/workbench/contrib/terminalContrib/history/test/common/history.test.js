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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2hpc3RvcnkvdGVzdC9jb21tb24vaGlzdG9yeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFtQixNQUFNLDJDQUEyQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDM0gsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBRTNILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN0RixPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7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