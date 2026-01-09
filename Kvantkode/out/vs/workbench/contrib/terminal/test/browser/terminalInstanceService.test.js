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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsSW5zdGFuY2VTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHbEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakcsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksdUJBQWlELENBQUE7SUFFckQsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVFLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ2xDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUM1RCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLElBQUksQ0FBQyx1RUFBdUUsRUFBRSxHQUFHLEVBQUU7WUFDbEYsZUFBZSxDQUFDLHVCQUF1QixDQUFDLGlDQUFpQyxFQUFFLEVBQUUsRUFB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