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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L3Rlc3Qvbm9kZS9lbnZpcm9ubWVudFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRSxPQUFPLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUV4RCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFXLEVBQUUsRUFBRSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFdkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDakMsSUFBSSxFQUFFLElBQUk7WUFDVixLQUFLLEVBQUUsS0FBSztZQUNaLEdBQUcsRUFBRSxTQUFTO1lBQ2QsT0FBTyxFQUFFLFNBQVM7U0FDbEIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUU7WUFDcEQsSUFBSSxFQUFFLElBQUk7WUFDVixL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