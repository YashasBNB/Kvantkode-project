/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-test-async-suite */
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { homedir, userInfo } from 'os';
import { isWindows } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { getShellIntegrationInjection, getWindowsBuildNumber, } from '../../node/terminalEnvironment.js';
const enabledProcessOptions = {
    shellIntegration: { enabled: true, suggestEnabled: false, nonce: '' },
    windowsEnableConpty: true,
    windowsUseConptyDll: false,
    environmentVariableCollections: undefined,
    workspaceFolder: undefined,
};
const disabledProcessOptions = {
    shellIntegration: { enabled: false, suggestEnabled: false, nonce: '' },
    windowsEnableConpty: true,
    windowsUseConptyDll: false,
    environmentVariableCollections: undefined,
    workspaceFolder: undefined,
};
const winptyProcessOptions = {
    shellIntegration: { enabled: true, suggestEnabled: false, nonce: '' },
    windowsEnableConpty: false,
    windowsUseConptyDll: false,
    environmentVariableCollections: undefined,
    workspaceFolder: undefined,
};
const pwshExe = process.platform === 'win32' ? 'pwsh.exe' : 'pwsh';
const repoRoot = process.platform === 'win32'
    ? process.cwd()[0].toLowerCase() + process.cwd().substring(1)
    : process.cwd();
const logService = new NullLogService();
const productService = { applicationName: 'vscode' };
const defaultEnvironment = {};
function deepStrictEqualIgnoreStableVar(actual, expected) {
    if (actual?.envMixin) {
        delete actual.envMixin['VSCODE_STABLE'];
    }
    deepStrictEqual(actual, expected);
}
suite('platform - terminalEnvironment', async () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getShellIntegrationInjection', () => {
        suite('should not enable', () => {
            // This test is only expected to work on Windows 10 build 18309 and above
            ;
            (getWindowsBuildNumber() < 18309 ? test.skip : test)('when isFeatureTerminal or when no executable is provided', async () => {
                ok(!(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: true }, enabledProcessOptions, defaultEnvironment, logService, productService, true)));
                ok(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: false }, enabledProcessOptions, defaultEnvironment, logService, productService, true));
            });
            if (isWindows) {
                test('when on windows with conpty false', async () => {
                    ok(!(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l'], isFeatureTerminal: false }, winptyProcessOptions, defaultEnvironment, logService, productService, true)));
                });
            }
        });
        (getWindowsBuildNumber() < 18309 ? suite.skip : suite)('pwsh', () => {
            const expectedPs1 = process.platform === 'win32'
                ? `try { . "${repoRoot}\\out\\vs\\workbench\\contrib\\terminal\\common\\scripts\\shellIntegration.ps1" } catch {}`
                : `. "${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.ps1"`;
            suite('should override args', () => {
                const enabledExpectedResult = Object.freeze({
                    newArgs: ['-noexit', '-command', expectedPs1],
                    envMixin: {
                        VSCODE_INJECTION: '1',
                    },
                });
                test('when undefined, []', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
                suite('when no logo', () => {
                    test('array - case insensitive', async () => {
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NOLOGO'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-nol'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NOL'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                    test('string - case insensitive', async () => {
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NoLogo' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NOLOGO' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-nol' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NOL' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                });
            });
            suite('should incorporate login arg', () => {
                const enabledExpectedResult = Object.freeze({
                    newArgs: ['-l', '-noexit', '-command', expectedPs1],
                    envMixin: {
                        VSCODE_INJECTION: '1',
                    },
                });
                test('when array contains no logo and login', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
                test('when string', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
            });
            suite('should not modify args', () => {
                test('when shell integration is disabled', async () => {
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                });
                test('when using unrecognized arg', async () => {
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo', '-i'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                });
                test('when using unrecognized arg (string)', async () => {
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: '-i' }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                });
            });
        });
        if (process.platform !== 'win32') {
            suite('zsh', () => {
                suite('should override args', () => {
                    const username = userInfo().username;
                    const expectedDir = new RegExp(`.+\/${username}-vscode-zsh`);
                    const customZdotdir = '/custom/zsh/dotdir';
                    const expectedDests = [
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zshrc`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zprofile`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zshenv`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zlogin`),
                    ];
                    const expectedSources = [
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-rc.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-profile.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-env.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-login.zsh/,
                    ];
                    function assertIsEnabled(result, globalZdotdir = homedir()) {
                        strictEqual(Object.keys(result.envMixin).length, 3);
                        ok(result.envMixin['ZDOTDIR']?.match(expectedDir));
                        strictEqual(result.envMixin['USER_ZDOTDIR'], globalZdotdir);
                        ok(result.envMixin['VSCODE_INJECTION']?.match('1'));
                        strictEqual(result.filesToCopy?.length, 4);
                        ok(result.filesToCopy[0].dest.match(expectedDests[0]));
                        ok(result.filesToCopy[1].dest.match(expectedDests[1]));
                        ok(result.filesToCopy[2].dest.match(expectedDests[2]));
                        ok(result.filesToCopy[3].dest.match(expectedDests[3]));
                        ok(result.filesToCopy[0].source.match(expectedSources[0]));
                        ok(result.filesToCopy[1].source.match(expectedSources[1]));
                        ok(result.filesToCopy[2].source.match(expectedSources[2]));
                        ok(result.filesToCopy[3].source.match(expectedSources[3]));
                    }
                    test('when undefined, []', async () => {
                        const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                        deepStrictEqual(result1?.newArgs, ['-i']);
                        assertIsEnabled(result1);
                        const result2 = await getShellIntegrationInjection({ executable: 'zsh', args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                        deepStrictEqual(result2?.newArgs, ['-i']);
                        assertIsEnabled(result2);
                    });
                    suite('should incorporate login arg', () => {
                        test('when array', async () => {
                            const result = await getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                            deepStrictEqual(result?.newArgs, ['-il']);
                            assertIsEnabled(result);
                        });
                    });
                    suite('should not modify args', () => {
                        test('when shell integration is disabled', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                            strictEqual(await getShellIntegrationInjection({ executable: 'zsh', args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                        test('when using unrecognized arg', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'zsh', args: ['-l', '-fake'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                    });
                    suite('should incorporate global ZDOTDIR env variable', () => {
                        test('when custom ZDOTDIR', async () => {
                            const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, { ...defaultEnvironment, ZDOTDIR: customZdotdir }, logService, productService, true);
                            deepStrictEqual(result1?.newArgs, ['-i']);
                            assertIsEnabled(result1, customZdotdir);
                        });
                        test('when undefined', async () => {
                            const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, undefined, logService, productService, true);
                            deepStrictEqual(result1?.newArgs, ['-i']);
                            assertIsEnabled(result1);
                        });
                    });
                });
            });
            suite('bash', () => {
                suite('should override args', () => {
                    test('when undefined, [], empty string', async () => {
                        const enabledExpectedResult = Object.freeze({
                            newArgs: [
                                '--init-file',
                                `${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh`,
                            ],
                            envMixin: {
                                VSCODE_INJECTION: '1',
                            },
                        });
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: '' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                    suite('should set login env variable and not modify args', () => {
                        const enabledExpectedResult = Object.freeze({
                            newArgs: [
                                '--init-file',
                                `${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh`,
                            ],
                            envMixin: {
                                VSCODE_INJECTION: '1',
                                VSCODE_SHELL_LOGIN: '1',
                            },
                        });
                        test('when array', async () => {
                            deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        });
                    });
                    suite('should not modify args', () => {
                        test('when shell integration is disabled', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                            strictEqual(await getShellIntegrationInjection({ executable: 'bash', args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                        test('when custom array entry', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'bash', args: ['-l', '-i'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                    });
                });
            });
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9ub2RlL3Rlcm1pbmFsRW52aXJvbm1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxtREFBbUQ7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFHM0QsT0FBTyxFQUNOLDRCQUE0QixFQUM1QixxQkFBcUIsR0FFckIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxQyxNQUFNLHFCQUFxQixHQUE0QjtJQUN0RCxnQkFBZ0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO0lBQ3JFLG1CQUFtQixFQUFFLElBQUk7SUFDekIsbUJBQW1CLEVBQUUsS0FBSztJQUMxQiw4QkFBOEIsRUFBRSxTQUFTO0lBQ3pDLGVBQWUsRUFBRSxTQUFTO0NBQzFCLENBQUE7QUFDRCxNQUFNLHNCQUFzQixHQUE0QjtJQUN2RCxnQkFBZ0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO0lBQ3RFLG1CQUFtQixFQUFFLElBQUk7SUFDekIsbUJBQW1CLEVBQUUsS0FBSztJQUMx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