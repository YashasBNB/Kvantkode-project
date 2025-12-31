/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as os from 'os';
import * as cp from 'child_process';
import * as path from 'path';
let hasWSLFeaturePromise;
export async function hasWSLFeatureInstalled(refresh = false) {
    if (hasWSLFeaturePromise === undefined || refresh) {
        hasWSLFeaturePromise = testWSLFeatureInstalled();
    }
    return hasWSLFeaturePromise;
}
async function testWSLFeatureInstalled() {
    const windowsBuildNumber = getWindowsBuildNumber();
    if (windowsBuildNumber === undefined) {
        return false;
    }
    if (windowsBuildNumber >= 22000) {
        const wslExePath = getWSLExecutablePath();
        if (wslExePath) {
            return new Promise((s) => {
                try {
                    cp.execFile(wslExePath, ['--status'], (err) => s(!err));
                }
                catch (e) {
                    s(false);
                }
            });
        }
    }
    else {
        const dllPath = getLxssManagerDllPath();
        if (dllPath) {
            try {
                if ((await fs.promises.stat(dllPath)).isFile()) {
                    return true;
                }
            }
            catch (e) { }
        }
    }
    return false;
}
function getWindowsBuildNumber() {
    const osVersion = /(\d+)\.(\d+)\.(\d+)/g.exec(os.release());
    if (osVersion) {
        return parseInt(osVersion[3]);
    }
    return undefined;
}
function getSystem32Path(subPath) {
    const systemRoot = process.env['SystemRoot'];
    if (systemRoot) {
        const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
        return path.join(systemRoot, is32ProcessOn64Windows ? 'Sysnative' : 'System32', subPath);
    }
    return undefined;
}
function getWSLExecutablePath() {
    return getSystem32Path('wsl.exe');
}
/**
 * In builds < 22000 this dll inidcates that WSL is installed
 */
function getLxssManagerDllPath() {
    return getSystem32Path('lxss\\LxssManager.dll');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3NsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL25vZGUvd3NsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ25DLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBRTVCLElBQUksb0JBQWtELENBQUE7QUFFdEQsTUFBTSxDQUFDLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxPQUFPLEdBQUcsS0FBSztJQUMzRCxJQUFJLG9CQUFvQixLQUFLLFNBQVMsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNuRCxvQkFBb0IsR0FBRyx1QkFBdUIsRUFBRSxDQUFBO0lBQ2pELENBQUM7SUFDRCxPQUFPLG9CQUFvQixDQUFBO0FBQzVCLENBQUM7QUFFRCxLQUFLLFVBQVUsdUJBQXVCO0lBQ3JDLE1BQU0sa0JBQWtCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQTtJQUNsRCxJQUFJLGtCQUFrQixLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3RDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELElBQUksa0JBQWtCLElBQUksS0FBSyxFQUFFLENBQUM7UUFDakMsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQTtRQUN6QyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxPQUFPLENBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDakMsSUFBSSxDQUFDO29CQUNKLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hELENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxPQUFPLEdBQUcscUJBQXFCLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztvQkFDaEQsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUEsQ0FBQztRQUNmLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsU0FBUyxxQkFBcUI7SUFDN0IsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQzNELElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixPQUFPLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLE9BQWU7SUFDdkMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM1QyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNuRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELFNBQVMsb0JBQW9CO0lBQzVCLE9BQU8sZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQ2xDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMscUJBQXFCO0lBQzdCLE9BQU8sZUFBZSxDQUFDLHVCQUF1QixDQUFDLENBQUE7QUFDaEQsQ0FBQyJ9