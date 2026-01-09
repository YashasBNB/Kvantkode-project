/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, fail, ok, strictEqual } from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { detectAvailableProfiles, } from '../../../../../platform/terminal/node/terminalProfiles.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
/**
 * Assets that two profiles objects are equal, this will treat explicit undefined and unset
 * properties the same. Order of the profiles is ignored.
 */
function profilesEqual(actualProfiles, expectedProfiles) {
    strictEqual(actualProfiles.length, expectedProfiles.length, `Actual: ${actualProfiles.map((e) => e.profileName).join(',')}\nExpected: ${expectedProfiles.map((e) => e.profileName).join(',')}`);
    for (const expected of expectedProfiles) {
        const actual = actualProfiles.find((e) => e.profileName === expected.profileName);
        ok(actual, `Expected profile ${expected.profileName} not found`);
        strictEqual(actual.profileName, expected.profileName);
        strictEqual(actual.path, expected.path);
        deepStrictEqual(actual.args, expected.args);
        strictEqual(actual.isAutoDetected, expected.isAutoDetected);
        strictEqual(actual.overrideName, expected.overrideName);
    }
}
suite('Workbench - TerminalProfiles', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('detectAvailableProfiles', () => {
        if (isWindows) {
            test('should detect Git Bash and provide login args', async () => {
                const fsProvider = createFsProvider(['C:\\Program Files\\Git\\bin\\bash.exe']);
                const config = {
                    profiles: {
                        windows: {
                            'Git Bash': { source: "Git Bash" /* ProfileSource.GitBash */ },
                        },
                        linux: {},
                        osx: {},
                    },
                    useWslProfiles: false,
                };
                const configurationService = new TestConfigurationService({
                    terminal: { integrated: config },
                });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    {
                        profileName: 'Git Bash',
                        path: 'C:\\Program Files\\Git\\bin\\bash.exe',
                        args: ['--login', '-i'],
                        isDefault: true,
                    },
                ];
                profilesEqual(profiles, expected);
            });
            test('should allow source to have args', async () => {
                const pwshSourcePaths = ['C:\\Program Files\\PowerShell\\7\\pwsh.exe'];
                const fsProvider = createFsProvider(pwshSourcePaths);
                const config = {
                    profiles: {
                        windows: {
                            PowerShell: { source: "PowerShell" /* ProfileSource.Pwsh */, args: ['-NoProfile'], overrideName: true },
                        },
                        linux: {},
                        osx: {},
                    },
                    useWslProfiles: false,
                };
                const configurationService = new TestConfigurationService({
                    terminal: { integrated: config },
                });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                const expected = [
                    {
                        profileName: 'PowerShell',
                        path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                        overrideName: true,
                        args: ['-NoProfile'],
                        isDefault: true,
                    },
                ];
                profilesEqual(profiles, expected);
            });
            test('configured args should override default source ones', async () => {
                const fsProvider = createFsProvider(['C:\\Program Files\\Git\\bin\\bash.exe']);
                const config = {
                    profiles: {
                        windows: {
                            'Git Bash': { source: "Git Bash" /* ProfileSource.GitBash */, args: [] },
                        },
                        linux: {},
                        osx: {},
                    },
                    useWslProfiles: false,
                };
                const configurationService = new TestConfigurationService({
                    terminal: { integrated: config },
                });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    {
                        profileName: 'Git Bash',
                        path: 'C:\\Program Files\\Git\\bin\\bash.exe',
                        args: [],
                        isAutoDetected: undefined,
                        overrideName: undefined,
                        isDefault: true,
                    },
                ];
                profilesEqual(profiles, expected);
            });
            suite('pwsh source detection/fallback', () => {
                const pwshSourceConfig = {
                    profiles: {
                        windows: {
                            PowerShell: { source: "PowerShell" /* ProfileSource.Pwsh */ },
                        },
                        linux: {},
                        osx: {},
                    },
                    useWslProfiles: false,
                };
                test('should prefer pwsh 7 to Windows PowerShell', async () => {
                    const pwshSourcePaths = [
                        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                        'C:\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe',
                        'C:\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                    ];
                    const fsProvider = createFsProvider(pwshSourcePaths);
                    const configurationService = new TestConfigurationService({
                        terminal: { integrated: pwshSourceConfig },
                    });
                    const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                    const expected = [
                        {
                            profileName: 'PowerShell',
                            path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                            isDefault: true,
                        },
                    ];
                    profilesEqual(profiles, expected);
                });
                test('should prefer pwsh 7 to pwsh 6', async () => {
                    const pwshSourcePaths = [
                        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                        'C:\\Program Files\\PowerShell\\6\\pwsh.exe',
                        'C:\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe',
                        'C:\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                    ];
                    const fsProvider = createFsProvider(pwshSourcePaths);
                    const configurationService = new TestConfigurationService({
                        terminal: { integrated: pwshSourceConfig },
                    });
                    const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                    const expected = [
                        {
                            profileName: 'PowerShell',
                            path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                            isDefault: true,
                        },
                    ];
                    profilesEqual(profiles, expected);
                });
                test('should fallback to Windows PowerShell', async () => {
                    const pwshSourcePaths = [
                        'C:\\Windows\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe',
                        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                    ];
                    const fsProvider = createFsProvider(pwshSourcePaths);
                    const configurationService = new TestConfigurationService({
                        terminal: { integrated: pwshSourceConfig },
                    });
                    const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                    strictEqual(profiles.length, 1);
                    strictEqual(profiles[0].profileName, 'PowerShell');
                });
            });
        }
        else {
            const absoluteConfig = {
                profiles: {
                    windows: {},
                    osx: {
                        fakeshell1: { path: '/bin/fakeshell1' },
                        fakeshell2: { path: '/bin/fakeshell2' },
                        fakeshell3: { path: '/bin/fakeshell3' },
                    },
                    linux: {
                        fakeshell1: { path: '/bin/fakeshell1' },
                        fakeshell2: { path: '/bin/fakeshell2' },
                        fakeshell3: { path: '/bin/fakeshell3' },
                    },
                },
                useWslProfiles: false,
            };
            const onPathConfig = {
                profiles: {
                    windows: {},
                    osx: {
                        fakeshell1: { path: 'fakeshell1' },
                        fakeshell2: { path: 'fakeshell2' },
                        fakeshell3: { path: 'fakeshell3' },
                    },
                    linux: {
                        fakeshell1: { path: 'fakeshell1' },
                        fakeshell2: { path: 'fakeshell2' },
                        fakeshell3: { path: 'fakeshell3' },
                    },
                },
                useWslProfiles: false,
            };
            test('should detect shells via absolute paths', async () => {
                const fsProvider = createFsProvider(['/bin/fakeshell1', '/bin/fakeshell3']);
                const configurationService = new TestConfigurationService({
                    terminal: { integrated: absoluteConfig },
                });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    { profileName: 'fakeshell1', path: '/bin/fakeshell1', isDefault: true },
                    { profileName: 'fakeshell3', path: '/bin/fakeshell3', isDefault: true },
                ];
                profilesEqual(profiles, expected);
            });
            test('should auto detect shells via /etc/shells', async () => {
                const fsProvider = createFsProvider(['/bin/fakeshell1', '/bin/fakeshell3'], '/bin/fakeshell1\n/bin/fakeshell3');
                const configurationService = new TestConfigurationService({
                    terminal: { integrated: onPathConfig },
                });
                const profiles = await detectAvailableProfiles(undefined, undefined, true, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    { profileName: 'fakeshell1', path: '/bin/fakeshell1', isFromPath: true, isDefault: true },
                    { profileName: 'fakeshell3', path: '/bin/fakeshell3', isFromPath: true, isDefault: true },
                ];
                profilesEqual(profiles, expected);
            });
            test('should validate auto detected shells from /etc/shells exist', async () => {
                // fakeshell3 exists in /etc/shells but not on FS
                const fsProvider = createFsProvider(['/bin/fakeshell1'], '/bin/fakeshell1\n/bin/fakeshell3');
                const configurationService = new TestConfigurationService({
                    terminal: { integrated: onPathConfig },
                });
                const profiles = await detectAvailableProfiles(undefined, undefined, true, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    { profileName: 'fakeshell1', path: '/bin/fakeshell1', isFromPath: true, isDefault: true },
                ];
                profilesEqual(profiles, expected);
            });
        }
    });
    function createFsProvider(expectedPaths, etcShellsContent = '') {
        const provider = {
            async existsFile(path) {
                return expectedPaths.includes(path);
            },
            async readFile(path) {
                if (path !== '/etc/shells') {
                    fail('Unexepected path');
                }
                return Buffer.from(etcShellsContent);
            },
        };
        return provider;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L25vZGUvdGVybWluYWxQcm9maWxlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBTWxFLE9BQU8sRUFDTix1QkFBdUIsR0FFdkIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRzs7O0dBR0c7QUFDSCxTQUFTLGFBQWEsQ0FBQyxjQUFrQyxFQUFFLGdCQUFvQztJQUM5RixXQUFXLENBQ1YsY0FBYyxDQUFDLE1BQU0sRUFDckIsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixXQUFXLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQ2xJLENBQUE7SUFDRCxLQUFLLE1BQU0sUUFBUSxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDekMsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxD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