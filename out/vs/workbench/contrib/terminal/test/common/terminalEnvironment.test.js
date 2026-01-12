/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI as Uri } from '../../../../../base/common/uri.js';
import { addTerminalEnvironmentKeys, createTerminalEnvironment, getCwd, getLangEnvVariable, mergeEnvironments, preparePathForShell, shouldSetLangEnvVariable, } from '../../common/terminalEnvironment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Workbench - TerminalEnvironment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('addTerminalEnvironmentKeys', () => {
        test('should set expected variables', () => {
            const env = {};
            addTerminalEnvironmentKeys(env, '1.2.3', 'en', 'on');
            strictEqual(env['TERM_PROGRAM'], 'vscode');
            strictEqual(env['TERM_PROGRAM_VERSION'], '1.2.3');
            strictEqual(env['COLORTERM'], 'truecolor');
            strictEqual(env['LANG'], 'en_US.UTF-8');
        });
        test('should use language variant for LANG that is provided in locale', () => {
            const env = {};
            addTerminalEnvironmentKeys(env, '1.2.3', 'en-au', 'on');
            strictEqual(env['LANG'], 'en_AU.UTF-8', 'LANG is equal to the requested locale with UTF-8');
        });
        test('should fallback to en_US when no locale is provided', () => {
            const env2 = { FOO: 'bar' };
            addTerminalEnvironmentKeys(env2, '1.2.3', undefined, 'on');
            strictEqual(env2['LANG'], 'en_US.UTF-8', 'LANG is equal to en_US.UTF-8 as fallback.'); // More info on issue #14586
        });
        test('should fallback to en_US when an invalid locale is provided', () => {
            const env3 = { LANG: 'replace' };
            addTerminalEnvironmentKeys(env3, '1.2.3', undefined, 'on');
            strictEqual(env3['LANG'], 'en_US.UTF-8', 'LANG is set to the fallback LANG');
        });
        test('should override existing LANG', () => {
            const env4 = { LANG: 'en_AU.UTF-8' };
            addTerminalEnvironmentKeys(env4, '1.2.3', undefined, 'on');
            strictEqual(env4['LANG'], 'en_US.UTF-8', "LANG is equal to the parent environment's LANG");
        });
    });
    suite('shouldSetLangEnvVariable', () => {
        test('auto', () => {
            strictEqual(shouldSetLangEnvVariable({}, 'auto'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US' }, 'auto'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf' }, 'auto'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf8' }, 'auto'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.UTF-8' }, 'auto'), false);
        });
        test('off', () => {
            strictEqual(shouldSetLangEnvVariable({}, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US' }, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf' }, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf8' }, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.UTF-8' }, 'off'), false);
        });
        test('on', () => {
            strictEqual(shouldSetLangEnvVariable({}, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US' }, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf' }, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf8' }, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.UTF-8' }, 'on'), true);
        });
    });
    suite('getLangEnvVariable', () => {
        test('should fallback to en_US when no locale is provided', () => {
            strictEqual(getLangEnvVariable(undefined), 'en_US.UTF-8');
            strictEqual(getLangEnvVariable(''), 'en_US.UTF-8');
        });
        test("should fallback to default language variants when variant isn't provided", () => {
            strictEqual(getLangEnvVariable('af'), 'af_ZA.UTF-8');
            strictEqual(getLangEnvVariable('am'), 'am_ET.UTF-8');
            strictEqual(getLangEnvVariable('be'), 'be_BY.UTF-8');
            strictEqual(getLangEnvVariable('bg'), 'bg_BG.UTF-8');
            strictEqual(getLangEnvVariable('ca'), 'ca_ES.UTF-8');
            strictEqual(getLangEnvVariable('cs'), 'cs_CZ.UTF-8');
            strictEqual(getLangEnvVariable('da'), 'da_DK.UTF-8');
            strictEqual(getLangEnvVariable('de'), 'de_DE.UTF-8');
            strictEqual(getLangEnvVariable('el'), 'el_GR.UTF-8');
            strictEqual(getLangEnvVariable('en'), 'en_US.UTF-8');
            strictEqual(getLangEnvVariable('es'), 'es_ES.UTF-8');
            strictEqual(getLangEnvVariable('et'), 'et_EE.UTF-8');
            strictEqual(getLangEnvVariable('eu'), 'eu_ES.UTF-8');
            strictEqual(getLangEnvVariable('fi'), 'fi_FI.UTF-8');
            strictEqual(getLangEnvVariable('fr'), 'fr_FR.UTF-8');
            strictEqual(getLangEnvVariable('he'), 'he_IL.UTF-8');
            strictEqual(getLangEnvVariable('hr'), 'hr_HR.UTF-8');
            strictEqual(getLangEnvVariable('hu'), 'hu_HU.UTF-8');
            strictEqual(getLangEnvVariable('hy'), 'hy_AM.UTF-8');
            strictEqual(getLangEnvVariable('is'), 'is_IS.UTF-8');
            strictEqual(getLangEnvVariable('it'), 'it_IT.UTF-8');
            strictEqual(getLangEnvVariable('ja'), 'ja_JP.UTF-8');
            strictEqual(getLangEnvVariable('kk'), 'kk_KZ.UTF-8');
            strictEqual(getLangEnvVariable('ko'), 'ko_KR.UTF-8');
            strictEqual(getLangEnvVariable('lt'), 'lt_LT.UTF-8');
            strictEqual(getLangEnvVariable('nl'), 'nl_NL.UTF-8');
            strictEqual(getLangEnvVariable('no'), 'no_NO.UTF-8');
            strictEqual(getLangEnvVariable('pl'), 'pl_PL.UTF-8');
            strictEqual(getLangEnvVariable('pt'), 'pt_BR.UTF-8');
            strictEqual(getLangEnvVariable('ro'), 'ro_RO.UTF-8');
            strictEqual(getLangEnvVariable('ru'), 'ru_RU.UTF-8');
            strictEqual(getLangEnvVariable('sk'), 'sk_SK.UTF-8');
            strictEqual(getLangEnvVariable('sl'), 'sl_SI.UTF-8');
            strictEqual(getLangEnvVariable('sr'), 'sr_YU.UTF-8');
            strictEqual(getLangEnvVariable('sv'), 'sv_SE.UTF-8');
            strictEqual(getLangEnvVariable('tr'), 'tr_TR.UTF-8');
            strictEqual(getLangEnvVariable('uk'), 'uk_UA.UTF-8');
            strictEqual(getLangEnvVariable('zh'), 'zh_CN.UTF-8');
        });
        test('should set language variant based on full locale', () => {
            strictEqual(getLangEnvVariable('en-AU'), 'en_AU.UTF-8');
            strictEqual(getLangEnvVariable('en-au'), 'en_AU.UTF-8');
            strictEqual(getLangEnvVariable('fa-ke'), 'fa_KE.UTF-8');
        });
    });
    suite('mergeEnvironments', () => {
        test('should add keys', () => {
            const parent = {
                a: 'b',
            };
            const other = {
                c: 'd',
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                a: 'b',
                c: 'd',
            });
        });
        (!isWindows ? test.skip : test)('should add keys ignoring case on Windows', () => {
            const parent = {
                a: 'b',
            };
            const other = {
                A: 'c',
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                a: 'c',
            });
        });
        test('null values should delete keys from the parent env', () => {
            const parent = {
                a: 'b',
                c: 'd',
            };
            const other = {
                a: null,
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                c: 'd',
            });
        });
        (!isWindows ? test.skip : test)('null values should delete keys from the parent env ignoring case on Windows', () => {
            const parent = {
                a: 'b',
                c: 'd',
            };
            const other = {
                A: null,
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                c: 'd',
            });
        });
    });
    suite('getCwd', () => {
        // This helper checks the paths in a cross-platform friendly manner
        function assertPathsMatch(a, b) {
            strictEqual(Uri.file(a).fsPath, Uri.file(b).fsPath);
        }
        test('should default to userHome for an empty workspace', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, undefined), '/userHome/');
        });
        test('should use to the workspace if it exists', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/foo'), undefined), '/foo');
        });
        test('should use an absolute custom cwd as is', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, '/foo'), '/foo');
        });
        test('should normalize a relative custom cwd against the workspace path', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/bar'), 'foo'), '/bar/foo');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/bar'), './foo'), '/bar/foo');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/bar'), '../foo'), '/foo');
        });
        test("should fall back for relative a custom cwd that doesn't have a workspace", async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, 'foo'), '/userHome/');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, './foo'), '/userHome/');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, '../foo'), '/userHome/');
        });
        test('should ignore custom cwd when told to ignore', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [], ignoreConfigurationCwd: true }, '/userHome/', undefined, Uri.file('/bar'), '/foo'), '/bar');
        });
    });
    suite('preparePathForShell', () => {
        const wslPathBackend = {
            getWslPath: async (original, direction) => {
                if (direction === 'unix-to-win') {
                    const match = original.match(/^\/mnt\/(?<drive>[a-zA-Z])\/(?<path>.+)$/);
                    const groups = match?.groups;
                    if (!groups) {
                        return original;
                    }
                    return `${groups.drive}:\\${groups.path.replace(/\//g, '\\')}`;
                }
                const match = original.match(/(?<drive>[a-zA-Z]):\\(?<path>.+)/);
                const groups = match?.groups;
                if (!groups) {
                    return original;
                }
                return `/mnt/${groups.drive.toLowerCase()}/${groups.path.replace(/\\/g, '/')}`;
            },
        };
        suite('Windows frontend, Windows backend', () => {
            test('Command Prompt', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell("c:\\foo\\bar'baz", 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `c:\\foo\\bar'baz`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `"c:\\foo\\bar$(echo evil)baz"`);
            });
            test('PowerShell', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell("c:\\foo\\bar'baz", 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `& 'c:\\foo\\bar''baz'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `& 'c:\\foo\\bar$(echo evil)baz'`);
            });
            test('Git Bash', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `'c:/foo/bar'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `'c:/foo/bar(echo evil)baz'`);
            });
            test('WSL', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "wsl" /* WindowsShellType.Wsl */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), '/mnt/c/foo/bar');
            });
        });
        suite('Windows frontend, Linux backend', () => {
            test('Bash', async () => {
                strictEqual(await preparePathForShell('/foo/bar', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, true), `'/foo/bar'`);
                strictEqual(await preparePathForShell("/foo/bar'baz", 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, true), `'/foo/barbaz'`);
                strictEqual(await preparePathForShell('/foo/bar$(echo evil)baz', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, true), `'/foo/bar(echo evil)baz'`);
            });
        });
        suite('Linux frontend, Windows backend', () => {
            test('Command Prompt', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell("c:\\foo\\bar'baz", 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `c:\\foo\\bar'baz`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `"c:\\foo\\bar$(echo evil)baz"`);
            });
            test('PowerShell', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell("c:\\foo\\bar'baz", 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `& 'c:\\foo\\bar''baz'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `& 'c:\\foo\\bar$(echo evil)baz'`);
            });
            test('Git Bash', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `'c:/foo/bar'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `'c:/foo/bar(echo evil)baz'`);
            });
            test('WSL', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "wsl" /* WindowsShellType.Wsl */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), '/mnt/c/foo/bar');
            });
        });
        suite('Linux frontend, Linux backend', () => {
            test('Bash', async () => {
                strictEqual(await preparePathForShell('/foo/bar', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, false), `'/foo/bar'`);
                strictEqual(await preparePathForShell("/foo/bar'baz", 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, false), `'/foo/barbaz'`);
                strictEqual(await preparePathForShell('/foo/bar$(echo evil)baz', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, false), `'/foo/bar(echo evil)baz'`);
            });
        });
    });
    suite('createTerminalEnvironment', () => {
        const commonVariables = {
            COLORTERM: 'truecolor',
            TERM_PROGRAM: 'vscode',
        };
        test('should retain variables equal to the empty string', async () => {
            deepStrictEqual(await createTerminalEnvironment({}, undefined, undefined, undefined, 'off', {
                foo: 'bar',
                empty: '',
            }), { foo: 'bar', empty: '', ...commonVariables });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2NvbW1vbi90ZXJtaW5hbEVudmlyb25tZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFFckQsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIseUJBQXlCLEVBQ3pCLE1BQU0sRUFDTixrQkFBa0IsRUFDbEIsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUNuQix3QkFBd0IsR0FDeEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQU01QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQzdDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzFDLE1BQU0sR0FBRyxHQUEyQixFQUFFLENBQUE7WUFDdEMsMEJBQTBCLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUMxQyxXQUFXLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFD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QVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMs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