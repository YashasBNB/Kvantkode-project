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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9ub2RlL3Rlcm1pbmFsUHJvZmlsZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQU1sRSxPQUFPLEVBQ04sdUJBQXVCLEdBRXZCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEc7OztHQUdHO0FBQ0gsU0FBUyxhQUFhLENBQUMsY0FBa0MsRUFBRSxnQkFBb0M7SUFDOUYsV0FBVyxDQUNWLGNBQWMsQ0FBQyxNQUFNLEVBQ3JCLGdCQUFnQixDQUFDLE1BQU0sRUFDdkIsV0FBVyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUNsSSxDQUFBO0lBQ0QsS0FBSyxNQUFNLFFBQVEsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFD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