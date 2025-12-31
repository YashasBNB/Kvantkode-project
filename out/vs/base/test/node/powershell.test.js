/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as platform from '../../common/platform.js';
import { enumeratePowerShellInstallations, getFirstAvailablePowerShellInstallation, } from '../../node/powershell.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
function checkPath(exePath) {
    // Check to see if the path exists
    let pathCheckResult = false;
    try {
        const stat = fs.statSync(exePath);
        pathCheckResult = stat.isFile();
    }
    catch {
        // fs.exists throws on Windows with SymbolicLinks so we
        // also use lstat to try and see if the file exists.
        try {
            pathCheckResult = fs.statSync(fs.readlinkSync(exePath)).isFile();
        }
        catch { }
    }
    assert.strictEqual(pathCheckResult, true);
}
if (platform.isWindows) {
    suite('PowerShell finder', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        test('Can find first available PowerShell', async () => {
            const pwshExe = await getFirstAvailablePowerShellInstallation();
            const exePath = pwshExe?.exePath;
            assert.notStrictEqual(exePath, null);
            assert.notStrictEqual(pwshExe?.displayName, null);
            checkPath(exePath);
        });
        test('Can enumerate PowerShells', async () => {
            const pwshs = new Array();
            for await (const p of enumeratePowerShellInstallations()) {
                pwshs.push(p);
            }
            const powershellLog = 'Found these PowerShells:\n' + pwshs.map((p) => `${p.displayName}: ${p.exePath}`).join('\n');
            assert.strictEqual(pwshs.length >= 1, true, powershellLog);
            for (const pwsh of pwshs) {
                checkPath(pwsh.exePath);
            }
            // The last one should always be Windows PowerShell.
            assert.strictEqual(pwshs[pwshs.length - 1].displayName, 'Windows PowerShell', powershellLog);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvcG93ZXJzaGVsbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssUUFBUSxNQUFNLDBCQUEwQixDQUFBO0FBQ3BELE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsdUNBQXVDLEdBRXZDLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFNUUsU0FBUyxTQUFTLENBQUMsT0FBZTtJQUNqQyxrQ0FBa0M7SUFDbEMsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFBO0lBQzNCLElBQUksQ0FBQztRQUNKLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakMsZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1IsdURBQXVEO1FBQ3ZELG9EQUFvRDtRQUNwRCxJQUFJLENBQUM7WUFDSixlQUFlLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDakUsQ0FBQztRQUFDLE1BQU0sQ0FBQyxDQUFBLENBQUM7SUFDWCxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDMUMsQ0FBQztBQUVELElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3hCLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsdUNBQXVDLEVBQUUsQ0FBQTtRQUN6QyxJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEQsTUFBTSxPQUFPLEdBQUcsTUFBTSx1Q0FBdUMsRUFBRSxDQUFBO1lBQy9ELE1BQU0sT0FBTyxHQUFHLE9BQU8sRUFBRSxPQUFPLENBQUE7WUFDaEMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRWpELFNBQVMsQ0FBQyxPQUFRLENBQUMsQ0FBQTtRQUNwQixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1QyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBeUIsQ0FBQTtZQUNoRCxJQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxFQUFFLENBQUM7Z0JBQzFELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDZCxDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQ2xCLDRCQUE0QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFFMUQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDMUIsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN4QixDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLG9CQUFvQixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzdGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDIn0=