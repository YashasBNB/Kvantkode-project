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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L25vZGUvdGVybWluYWxFbnZpcm9ubWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLG1EQUFtRDtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDdEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUczRCxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHFCQUFxQixHQUVyQixNQUFNLG1DQUFtQyxDQUFBO0FBRTFDLE1BQU0scUJBQXFCLEdBQTRCO0lBQ3RELGdCQUFnQixFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7SUFDckUsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixtQkFBbUIsRUFBRSxLQUFLO0lBQzFCLDhCQUE4QixFQUFFLFNBQVM7SUFDekMsZUFBZSxFQUFFLFNBQVM7Q0FDMUIsQ0FBQTtBQUNELE1BQU0sc0JBQXNCLEdBQTRCO0lBQ3ZELGdCQUFnQixFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7SUFDdEUsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixtQkFBbUIsRUFBRSxLQUFLO0lBQzFCLDhCQUE4QixFQUFFLFNBQVM7SUFDekMsZUFBZSxFQUFFLFNBQVM7Q0FDMUIsQ0FBQTtBQUNELE1BQU0sb0JBQW9CLEdBQTRCO0lBQ3JELGdCQUFnQixFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7SUFDckUsbUJBQW1CLEVBQUUsS0FBSztJQUMxQixtQkFBbUIsRUFBRSxLQUFLO0lBQzFCLDhCQUE4QixFQUFFLFNBQVM7SUFDekMsZUFBZSxFQUFFLFNBQVM7Q0FDMUIsQ0FBQTtBQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtBQUNsRSxNQUFNLFFBQVEsR0FDYixPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU87SUFDM0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO0FBQ2pCLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7QUFDdkMsTUFBTSxjQUFjLEdBQUcsRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFxQixDQUFBO0FBQ3ZFLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFBO0FBRTdCLFNBQVMsOEJBQThCLENBQ3RDLE1BQW9ELEVBQ3BELFFBQTBDO0lBRTFDLElBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDO1FBQ3RCLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBQ0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUNsQyxDQUFDO0FBRUQsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO0lBQ2xELHVDQUF1QyxFQUFFLENBQUE7SUFDekMsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUMxQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1lBQy9CLHlFQUF5RTtZQUN6RSxDQUFDO1lBQUEsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ3BELDBEQUEwRCxFQUMxRCxLQUFLLElBQUksRUFBRTtnQkFDVixFQUFFLENBQ0QsQ0FBQyxDQUFDLE1BQU0sNEJBQTRCLENBQ25DLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLEVBQ3pFLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osQ0FBQyxDQUNGLENBQUE7Z0JBQ0QsRUFBRSxDQUNELE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLEVBQzFFLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osQ0FDRCxDQUFBO1lBQ0YsQ0FBQyxDQUNELENBQUE7WUFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDcEQsRUFBRSxDQUNELENBQUMsQ0FBQyxNQUFNLDRCQUE0QixDQUNuQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLEVBQy9ELG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osQ0FBQyxDQUNGLENBQUE7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBR0Q7UUFBQSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3BFLE1BQU0sV0FBVyxHQUNoQixPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU87Z0JBQzNCLENBQUMsQ0FBQyxZQUFZLFFBQVEsNEZBQTRGO2dCQUNsSCxDQUFDLENBQUMsTUFBTSxRQUFRLHlFQUF5RSxDQUFBO1lBQzNGLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7Z0JBQ2xDLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBbUM7b0JBQzdFLE9BQU8sRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDO29CQUM3QyxRQUFRLEVBQUU7d0JBQ1QsZ0JBQWdCLEVBQUUsR0FBRztxQkFDckI7aUJBQ0QsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDckMsOEJBQThCLENBQzdCLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQ2pDLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxxQkFBcUIsQ0FDckIsQ0FBQTtvQkFDRCw4QkFBOEIsQ0FDN0IsTUFBTSw0QkFBNEIsQ0FDakMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDeEMscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO2dCQUNGLENBQUMsQ0FBQyxDQUFBO2dCQUNGLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO29CQUMxQixJQUFJLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxJQUFJLEVBQUU7d0JBQzNDLDhCQUE4QixDQUM3QixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFDMUMscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO3dCQUNELDhCQUE4QixDQUM3QixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFDMUMscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO3dCQUNELDhCQUE4QixDQUM3QixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFDdkMscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO3dCQUNELDhCQUE4QixDQUM3QixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFDdkMscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO29CQUNGLENBQUMsQ0FBQyxDQUFBO29CQUNGLElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLElBQUksRUFBRTt3QkFDNUMsOEJBQThCLENBQzdCLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQ3hDLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxxQkFBcUIsQ0FDckIsQ0FBQTt3QkFDRCw4QkFBOEIsQ0FDN0IsTUFBTSw0QkFBNEIsQ0FDakMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDeEMscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO3dCQUNELDhCQUE4QixDQUM3QixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUNyQyxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLEVBQ0QscUJBQXFCLENBQ3JCLENBQUE7d0JBQ0QsOEJBQThCLENBQzdCLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQ3JDLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxxQkFBcUIsQ0FDckIsQ0FBQTtvQkFDRixDQUFDLENBQUMsQ0FBQTtnQkFDSCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUFBO1lBQ0YsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFtQztvQkFDN0UsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDO29CQUNuRCxRQUFRLEVBQUU7d0JBQ1QsZ0JBQWdCLEVBQUUsR0FBRztxQkFDckI7aUJBQ0QsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDeEQsOEJBQThCLENBQzdCLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFDaEQscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO2dCQUNGLENBQUMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQzlCLDhCQUE4QixDQUM3QixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUNuQyxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLEVBQ0QscUJBQXFCLENBQ3JCLENBQUE7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtZQUNGLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDckQsV0FBVyxDQUNWLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUNyQyxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLEVBQ0QsU0FBUyxDQUNULENBQUE7b0JBQ0QsV0FBVyxDQUNWLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQ25DLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxTQUFTLENBQ1QsQ0FBQTtvQkFDRCxXQUFXLENBQ1YsTUFBTSw0QkFBNEIsQ0FDakMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDeEMsc0JBQXNCLEVBQ3RCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELFNBQVMsQ0FDVCxDQUFBO2dCQUNGLENBQUMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDOUMsV0FBVyxDQUNWLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQ3RELHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxTQUFTLENBQ1QsQ0FBQTtnQkFDRixDQUFDLENBQUMsQ0FBQTtnQkFDRixJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ3ZELFdBQVcsQ0FDVixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUNuQyxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLEVBQ0QsU0FBUyxDQUNULENBQUE7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ2xDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNqQixLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO29CQUNsQyxNQUFNLFFBQVEsR0FBRyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUE7b0JBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksTUFBTSxDQUFDLE9BQU8sUUFBUSxhQUFhLENBQUMsQ0FBQTtvQkFDNUQsTUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUE7b0JBQzFDLE1BQU0sYUFBYSxHQUFHO3dCQUNyQixJQUFJLE1BQU0sQ0FBQyxRQUFRLFFBQVEsd0JBQXdCLENBQUM7d0JBQ3BELElBQUksTUFBTSxDQUFDLFFBQVEsUUFBUSwyQkFBMkIsQ0FBQzt3QkFDdkQsSUFBSSxNQUFNLENBQUMsUUFBUSxRQUFRLHlCQUF5QixDQUFDO3dCQUNyRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLFFBQVEseUJBQXlCLENBQUM7cUJBQ3JELENBQUE7b0JBQ0QsTUFBTSxlQUFlLEdBQUc7d0JBQ3ZCLHFGQUFxRjt3QkFDckYsMEZBQTBGO3dCQUMxRixzRkFBc0Y7d0JBQ3RGLHdGQUF3RjtxQkFDeEYsQ0FBQTtvQkFDRCxTQUFTLGVBQWUsQ0FDdkIsTUFBd0MsRUFDeEMsYUFBYSxHQUFHLE9BQU8sRUFBRTt3QkFFekIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTt3QkFDcEQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7d0JBQ25ELFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO3dCQUM1RCxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO3dCQUNwRCxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7d0JBQzFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDdEQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUN0RCxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQ3RELEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDdEQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUMxRCxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQzFELEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDMUQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUMzRCxDQUFDO29CQUNELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLElBQUksRUFBRTt3QkFDckMsTUFBTSxPQUFPLEdBQUcsTUFBTSw0QkFBNEIsQ0FDakQsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFDL0IscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixDQUFBO3dCQUNELGVBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTt3QkFDekMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFBO3dCQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLDRCQUE0QixDQUNqRCxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUN0QyxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLENBQUE7d0JBQ0QsZUFBZSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO3dCQUN6QyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ3pCLENBQUMsQ0FBQyxDQUFBO29CQUNGLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7d0JBQzFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLEVBQUU7NEJBQzdCLE1BQU0sTUFBTSxHQUFHLE1BQU0sNEJBQTRCLENBQ2hELEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUNuQyxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLENBQUE7NEJBQ0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBOzRCQUN6QyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7d0JBQ3hCLENBQUMsQ0FBQyxDQUFBO29CQUNILENBQUMsQ0FBQyxDQUFBO29CQUNGLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7d0JBQ3BDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTs0QkFDckQsV0FBVyxDQUNWLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUNuQyxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLEVBQ0QsU0FBUyxDQUNULENBQUE7NEJBQ0QsV0FBVyxDQUNWLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQ3RDLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxTQUFTLENBQ1QsQ0FBQTt3QkFDRixDQUFDLENBQUMsQ0FBQTt3QkFDRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxJQUFJLEVBQUU7NEJBQzlDLFdBQVcsQ0FDVixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQzVDLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxTQUFTLENBQ1QsQ0FBQTt3QkFDRixDQUFDLENBQUMsQ0FBQTtvQkFDSCxDQUFDLENBQUMsQ0FBQTtvQkFDRixLQUFLLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO3dCQUM1RCxJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7NEJBQ3RDLE1BQU0sT0FBTyxHQUFHLE1BQU0sNEJBQTRCLENBQ2pELEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQy9CLHFCQUFxQixFQUNyQixFQUFFLEdBQUcsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxFQUNqRCxVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixDQUFBOzRCQUNELGVBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTs0QkFDekMsZUFBZSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQTt3QkFDeEMsQ0FBQyxDQUFDLENBQUE7d0JBQ0YsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssSUFBSSxFQUFFOzRCQUNqQyxNQUFNLE9BQU8sR0FBRyxNQUFNLDRCQUE0QixDQUNqRCxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUMvQixxQkFBcUIsRUFDckIsU0FBUyxFQUNULFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLENBQUE7NEJBQ0QsZUFBZSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBOzRCQUN6QyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUE7d0JBQ3pCLENBQUMsQ0FBQyxDQUFBO29CQUNILENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQUE7WUFDRixLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtnQkFDbEIsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtvQkFDbEMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEtBQUssSUFBSSxFQUFFO3dCQUNuRCxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQW1DOzRCQUM3RSxPQUFPLEVBQUU7Z0NBQ1IsYUFBYTtnQ0FDYixHQUFHLFFBQVEsNEVBQTRFOzZCQUN2Rjs0QkFDRCxRQUFRLEVBQUU7Z0NBQ1QsZ0JBQWdCLEVBQUUsR0FBRzs2QkFDckI7eUJBQ0QsQ0FBQyxDQUFBO3dCQUNGLDhCQUE4QixDQUM3QixNQUFNLDRCQUE0QixDQUNqQyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUNoQyxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLEVBQ0QscUJBQXFCLENBQ3JCLENBQUE7d0JBQ0QsOEJBQThCLENBQzdCLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQ2hDLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxxQkFBcUIsQ0FDckIsQ0FBQTt3QkFDRCw4QkFBOEIsQ0FDN0IsTUFBTSw0QkFBNEIsQ0FDakMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDdkMscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELHFCQUFxQixDQUNyQixDQUFBO29CQUNGLENBQUMsQ0FBQyxDQUFBO29CQUNGLEtBQUssQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7d0JBQy9ELE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBbUM7NEJBQzdFLE9BQU8sRUFBRTtnQ0FDUixhQUFhO2dDQUNiLEdBQUcsUUFBUSw0RUFBNEU7NkJBQ3ZGOzRCQUNELFFBQVEsRUFBRTtnQ0FDVCxnQkFBZ0IsRUFBRSxHQUFHO2dDQUNyQixrQkFBa0IsRUFBRSxHQUFHOzZCQUN2Qjt5QkFDRCxDQUFDLENBQUE7d0JBQ0YsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLElBQUksRUFBRTs0QkFDN0IsOEJBQThCLENBQzdCLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUNwQyxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixjQUFjLEVBQ2QsSUFBSSxDQUNKLEVBQ0QscUJBQXFCLENBQ3JCLENBQUE7d0JBQ0YsQ0FBQyxDQUFDLENBQUE7b0JBQ0gsQ0FBQyxDQUFDLENBQUE7b0JBQ0YsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTt3QkFDcEMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFOzRCQUNyRCxXQUFXLENBQ1YsTUFBTSw0QkFBNEIsQ0FDakMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQ3BDLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGNBQWMsRUFDZCxJQUFJLENBQ0osRUFDRCxTQUFTLENBQ1QsQ0FBQTs0QkFDRCxXQUFXLENBQ1YsTUFBTSw0QkFBNEIsQ0FDakMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDdkMsc0JBQXNCLEVBQ3RCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELFNBQVMsQ0FDVCxDQUFBO3dCQUNGLENBQUMsQ0FBQyxDQUFBO3dCQUNGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTs0QkFDMUMsV0FBVyxDQUNWLE1BQU0sNEJBQTRCLENBQ2pDLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFDMUMsc0JBQXNCLEVBQ3RCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsY0FBYyxFQUNkLElBQUksQ0FDSixFQUNELFNBQVMsQ0FDVCxDQUFBO3dCQUNGLENBQUMsQ0FBQyxDQUFBO29CQUNILENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9