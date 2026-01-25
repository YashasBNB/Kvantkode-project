/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { OPTIONS, parseArgs } from '../../node/argv.js';
import { getUserDataPath } from '../../node/userDataPath.js';
import product from '../../../product/common/product.js';
suite('User data path', () => {
    test('getUserDataPath - default', () => {
        const path = getUserDataPath(parseArgs(process.argv, OPTIONS), product.nameShort);
        assert.ok(path.length > 0);
    });
    test('getUserDataPath - portable mode', () => {
        const origPortable = process.env['VSCODE_PORTABLE'];
        try {
            const portableDir = 'portable-dir';
            process.env['VSCODE_PORTABLE'] = portableDir;
            const path = getUserDataPath(parseArgs(process.argv, OPTIONS), product.nameShort);
            assert.ok(path.includes(portableDir));
        }
        finally {
            if (typeof origPortable === 'string') {
                process.env['VSCODE_PORTABLE'] = origPortable;
            }
            else {
                delete process.env['VSCODE_PORTABLE'];
            }
        }
    });
    test('getUserDataPath - --user-data-dir', () => {
        const cliUserDataDir = 'cli-data-dir';
        const args = parseArgs(process.argv, OPTIONS);
        args['user-data-dir'] = cliUserDataDir;
        const path = getUserDataPath(args, product.nameShort);
        assert.ok(path.includes(cliUserDataDir));
    });
    test('getUserDataPath - VSCODE_APPDATA', () => {
        const origAppData = process.env['VSCODE_APPDATA'];
        try {
            const appDataDir = 'appdata-dir';
            process.env['VSCODE_APPDATA'] = appDataDir;
            const path = getUserDataPath(parseArgs(process.argv, OPTIONS), product.nameShort);
            assert.ok(path.includes(appDataDir));
        }
        finally {
            if (typeof origAppData === 'string') {
                process.env['VSCODE_APPDATA'] = origAppData;
            }
            else {
                delete process.env['VSCODE_APPDATA'];
            }
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQYXRoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L3Rlc3Qvbm9kZS91c2VyRGF0YVBhdGgudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFeEQsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1QixJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzNCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDO1lBQ0osTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFBO1lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxXQUFXLENBQUE7WUFFNUMsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNqRixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUN0QyxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsWUFBWSxDQUFBO1lBQzlDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUM5QyxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUE7UUFDckMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLGNBQWMsQ0FBQTtRQUV0QyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7UUFDN0MsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQztZQUNKLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQTtZQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsVUFBVSxDQUFBO1lBRTFDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDakYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDckMsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtZQUM1QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==