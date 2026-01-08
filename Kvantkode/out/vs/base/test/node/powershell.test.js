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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9wb3dlcnNoZWxsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxRQUFRLE1BQU0sMEJBQTBCLENBQUE7QUFDcEQsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyx1Q0FBdUMsR0FFdkMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxTQUFTLFNBQVMsQ0FBQyxPQUFlO0lBQ2pDLGtDQUFrQztJQUNsQyxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUE7SUFDM0IsSUFBSSxDQUFDO1FBQ0osTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNqQyxlQUFlLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUix1REFBdUQ7UUFDdkQsb0RBQW9EO1FBQ3BELElBQUksQ0FBQztZQUNKLGVBQWUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNqRSxDQUFDO1FBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQztJQUNYLENBQUM7SUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUMxQyxDQUFDO0FBRUQsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDeEIsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMvQix1Q0FBdUMsRUFBRSxDQUFBO1FBQ3pDLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN0RCxNQUFNLE9BQU8sR0FBRyxNQUFNLHVDQUF1QyxFQUFFLENBQUE7WUFDL0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxFQUFFLE9BQU8sQ0FBQTtZQUNoQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNwQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFakQsU0FBUyxDQUFDLE9BQVEsQ0FBQyxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUF5QixDQUFBO1lBQ2hELElBQUksS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNkLENBQUM7WUFFRCxNQUFNLGFBQWEsR0FDbEIsNEJBQTRCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUUxRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUMxQixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3hCLENBQUM7WUFFRCxvREFBb0Q7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDN0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMifQ==