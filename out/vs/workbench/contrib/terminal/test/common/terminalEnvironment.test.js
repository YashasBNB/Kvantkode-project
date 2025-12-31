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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9jb21tb24vdGVybWluYWxFbnZpcm9ubWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBRXJELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sd0NBQXdDLENBQUE7QUFDbkYsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHlCQUF5QixFQUN6QixNQUFNLEVBQ04sa0JBQWtCLEVBQ2xCLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsd0JBQXdCLEdBQ3hCLE1BQU0scUNBQXFDLENBQUE7QUFNNUMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUM3Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtZQUMxQyxNQUFNLEdBQUcsR0FBMkIsRUFBRSxDQUFBO1lBQ3RDLDBCQUEwQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ2pELFdB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QUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUs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