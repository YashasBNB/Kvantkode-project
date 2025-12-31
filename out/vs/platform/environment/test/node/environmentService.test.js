/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { parseExtensionHostDebugPort } from '../../common/environmentService.js';
import { OPTIONS, parseArgs } from '../../node/argv.js';
import { NativeEnvironmentService } from '../../node/environmentService.js';
import product from '../../../product/common/product.js';
suite('EnvironmentService', () => {
    test('parseExtensionHostPort when built', () => {
        const parse = (a) => parseExtensionHostDebugPort(parseArgs(a, OPTIONS), true);
        assert.deepStrictEqual(parse([]), {
            port: null,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugPluginHost']), {
            port: null,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugPluginHost=1234']), {
            port: 1234,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugBrkPluginHost']), {
            port: null,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugBrkPluginHost=5678']), {
            port: 5678,
            break: true,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugPluginHost=1234', '--debugBrkPluginHost=5678', '--debugId=7']), { port: 5678, break: true, env: undefined, debugId: '7' });
        assert.deepStrictEqual(parse(['--inspect-extensions']), {
            port: null,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-extensions=1234']), {
            port: 1234,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-brk-extensions']), {
            port: null,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-brk-extensions=5678']), {
            port: 5678,
            break: true,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-extensions=1234', '--inspect-brk-extensions=5678', '--debugId=7']), { port: 5678, break: true, env: undefined, debugId: '7' });
        assert.deepStrictEqual(parse([
            '--inspect-extensions=1234',
            '--inspect-brk-extensions=5678',
            '--extensionEnvironment={"COOL":"1"}',
        ]), { port: 5678, break: true, env: { COOL: '1' }, debugId: undefined });
    });
    test('parseExtensionHostPort when unbuilt', () => {
        const parse = (a) => parseExtensionHostDebugPort(parseArgs(a, OPTIONS), false);
        assert.deepStrictEqual(parse([]), {
            port: 5870,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugPluginHost']), {
            port: 5870,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugPluginHost=1234']), {
            port: 1234,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugBrkPluginHost']), {
            port: 5870,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugBrkPluginHost=5678']), {
            port: 5678,
            break: true,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--debugPluginHost=1234', '--debugBrkPluginHost=5678', '--debugId=7']), { port: 5678, break: true, env: undefined, debugId: '7' });
        assert.deepStrictEqual(parse(['--inspect-extensions']), {
            port: 5870,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-extensions=1234']), {
            port: 1234,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-brk-extensions']), {
            port: 5870,
            break: false,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-brk-extensions=5678']), {
            port: 5678,
            break: true,
            env: undefined,
            debugId: undefined,
        });
        assert.deepStrictEqual(parse(['--inspect-extensions=1234', '--inspect-brk-extensions=5678', '--debugId=7']), { port: 5678, break: true, env: undefined, debugId: '7' });
    });
    // https://github.com/microsoft/vscode/issues/78440
    test('careful with boolean file names', function () {
        let actual = parseArgs(['-r', 'arg.txt'], OPTIONS);
        assert(actual['reuse-window']);
        assert.deepStrictEqual(actual._, ['arg.txt']);
        actual = parseArgs(['-r', 'true.txt'], OPTIONS);
        assert(actual['reuse-window']);
        assert.deepStrictEqual(actual._, ['true.txt']);
    });
    test('userDataDir', () => {
        const service1 = new NativeEnvironmentService(parseArgs(process.argv, OPTIONS), {
            _serviceBrand: undefined,
            ...product,
        });
        assert.ok(service1.userDataPath.length > 0);
        const args = parseArgs(process.argv, OPTIONS);
        args['user-data-dir'] = '/userDataDir/folder';
        const service2 = new NativeEnvironmentService(args, { _serviceBrand: undefined, ...product });
        assert.notStrictEqual(service1.userDataPath, service2.userDataPath);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC90ZXN0L25vZGUvZW52aXJvbm1lbnRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDdkQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0UsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFeEQsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBVyxFQUFFLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXZGLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2pDLElBQUksRUFBRSxJQUFJO1lBQ1YsS0FBSyxFQUFFLEtBQUs7WUFDWixHQUFHLEVBQUUsU0FBUztZQUNkLE9BQU8sRUFBRSxTQUFTO1NBQ2xCLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFO1lBQ3BELElBQUksRUFBRSxJQUFJO1lBQ1YsS0FBSyxF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