/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TerminalInstanceService } from '../../browser/terminalInstanceService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Workbench - TerminalInstanceService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let terminalInstanceService;
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, store);
        terminalInstanceService = store.add(instantiationService.createInstance(TerminalInstanceService));
    });
    suite('convertProfileToShellLaunchConfig', () => {
        test('should return an empty shell launch config when undefined is provided', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig(), {});
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig(undefined), {});
        });
        test('should return the same shell launch config when provided', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({}), {});
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({ executable: '/foo' }), { executable: '/foo' });
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({
                executable: '/foo',
                cwd: '/bar',
                args: ['a', 'b'],
            }), { executable: '/foo', cwd: '/bar', args: ['a', 'b'] });
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({ executable: '/foo' }, '/bar'), { executable: '/foo', cwd: '/bar' });
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({ executable: '/foo', cwd: '/bar' }, '/baz'), { executable: '/foo', cwd: '/baz' });
        });
        test('should convert a provided profile to a shell launch config', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({
                profileName: 'abc',
                path: '/foo',
                isDefault: true,
            }), {
                args: undefined,
                color: undefined,
                cwd: undefined,
                env: undefined,
                executable: '/foo',
                icon: undefined,
                name: undefined,
            });
            const icon = URI.file('/icon');
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({
                profileName: 'abc',
                path: '/foo',
                isDefault: true,
                args: ['a', 'b'],
                color: 'color',
                env: { test: 'TEST' },
                icon,
            }, '/bar'), {
                args: ['a', 'b'],
                color: 'color',
                cwd: '/bar',
                env: { test: 'TEST' },
                executable: '/foo',
                icon,
                name: undefined,
            });
        });
        test('should respect overrideName in profile', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({
                profileName: 'abc',
                path: '/foo',
                isDefault: true,
                overrideName: true,
            }), {
                args: undefined,
                color: undefined,
                cwd: undefined,
                env: undefined,
                executable: '/foo',
                icon: undefined,
                name: 'abc',
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbEluc3RhbmNlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDeEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBR2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpHLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLHVCQUFpRCxDQUFBO0lBRXJELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RSx1QkFBdUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNsQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FDNUQsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxJQUFJLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxFQUFFO1lBQ2xGLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxpQ0FBaUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2hGLGVBQWUs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