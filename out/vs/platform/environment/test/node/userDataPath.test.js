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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQYXRoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC90ZXN0L25vZGUvdXNlckRhdGFQYXRoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRXhELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQTtZQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsV0FBVyxDQUFBO1lBRTVDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDakYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDdEMsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLFlBQVksQ0FBQTtZQUM5QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFBO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxjQUFjLENBQUE7UUFFdEMsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1FBQzdDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUE7WUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLFVBQVUsQ0FBQTtZQUUxQyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2pGLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxXQUFXLENBQUE7WUFDNUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=