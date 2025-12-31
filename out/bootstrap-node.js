/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
// increase number of stack frames(from 10, https://github.com/v8/v8/wiki/Stack-Trace-API)
Error.stackTraceLimit = 100;
if (!process.env['VSCODE_HANDLES_SIGPIPE']) {
    // Workaround for Electron not installing a handler to ignore SIGPIPE
    // (https://github.com/electron/electron/issues/13254)
    let didLogAboutSIGPIPE = false;
    process.on('SIGPIPE', () => {
        // See https://github.com/microsoft/vscode-remote-release/issues/6543
        // In certain situations, the console itself can be in a broken pipe state
        // so logging SIGPIPE to the console will cause an infinite async loop
        if (!didLogAboutSIGPIPE) {
            didLogAboutSIGPIPE = true;
            console.error(new Error(`Unexpected SIGPIPE`));
        }
    });
}
// Setup current working directory in all our node & electron processes
// - Windows: call `process.chdir()` to always set application folder as cwd
// -  all OS: store the `process.cwd()` inside `VSCODE_CWD` for consistent lookups
function setupCurrentWorkingDirectory() {
    try {
        // Store the `process.cwd()` inside `VSCODE_CWD`
        // for consistent lookups, but make sure to only
        // do this once unless defined already from e.g.
        // a parent process.
        if (typeof process.env['VSCODE_CWD'] !== 'string') {
            process.env['VSCODE_CWD'] = process.cwd();
        }
        // Windows: always set application folder as current working dir
        if (process.platform === 'win32') {
            process.chdir(path.dirname(process.execPath));
        }
    }
    catch (err) {
        console.error(err);
    }
}
setupCurrentWorkingDirectory();
/**
 * Add support for redirecting the loading of node modules
 *
 * Note: only applies when running out of sources.
 */
export function devInjectNodeModuleLookupPath(injectPath) {
    if (!process.env['VSCODE_DEV']) {
        return; // only applies running out of sources
    }
    if (!injectPath) {
        throw new Error('Missing injectPath');
    }
    // register a loader hook
    const Module = require('node:module');
    Module.register('./bootstrap-import.js', { parentURL: import.meta.url, data: injectPath });
}
export function removeGlobalNodeJsModuleLookupPaths() {
    if (typeof process?.versions?.electron === 'string') {
        return; // Electron disables global search paths in https://github.com/electron/electron/blob/3186c2f0efa92d275dc3d57b5a14a60ed3846b0e/shell/common/node_bindings.cc#L653
    }
    const Module = require('module');
    const globalPaths = Module.globalPaths;
    const originalResolveLookupPaths = Module._resolveLookupPaths;
    Module._resolveLookupPaths = function (moduleName, parent) {
        const paths = originalResolveLookupPaths(moduleName, parent);
        if (Array.isArray(paths)) {
            let commonSuffixLength = 0;
            while (commonSuffixLength < paths.length &&
                paths[paths.length - 1 - commonSuffixLength] ===
                    globalPaths[globalPaths.length - 1 - commonSuffixLength]) {
                commonSuffixLength++;
            }
            return paths.slice(0, paths.length - commonSuffixLength);
        }
        return paths;
    };
    const originalNodeModulePaths = Module._nodeModulePaths;
    Module._nodeModulePaths = function (from) {
        let paths = originalNodeModulePaths(from);
        if (!isWindows) {
            return paths;
        }
        // On Windows, remove drive(s) and users' home directory from search paths,
        // UNLESS 'from' is explicitly set to one of those.
        const isDrive = (p) => p.length >= 3 && p.endsWith(':\\');
        if (!isDrive(from)) {
            paths = paths.filter((p) => !isDrive(path.dirname(p)));
        }
        if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
            const userDir = path.dirname(path.join(process.env.HOMEDRIVE, process.env.HOMEPATH));
            const isUsersDir = (p) => path.relative(p, userDir).length === 0;
            // Check if 'from' is the same as 'userDir'
            if (!isUsersDir(from)) {
                paths = paths.filter((p) => !isUsersDir(path.dirname(p)));
            }
        }
        return paths;
    };
}
/**
 * Helper to enable portable mode.
 */
export function configurePortable(product) {
    const appRoot = path.dirname(__dirname);
    function getApplicationPath() {
        if (process.env['VSCODE_DEV']) {
            return appRoot;
        }
        if (process.platform === 'darwin') {
            return path.dirname(path.dirname(path.dirname(appRoot)));
        }
        return path.dirname(path.dirname(appRoot));
    }
    function getPortableDataPath() {
        if (process.env['VSCODE_PORTABLE']) {
            return process.env['VSCODE_PORTABLE'];
        }
        if (process.platform === 'win32' || process.platform === 'linux') {
            return path.join(getApplicationPath(), 'data');
        }
        const portableDataName = product.portable || `${product.applicationName}-portable-data`;
        return path.join(path.dirname(getApplicationPath()), portableDataName);
    }
    const portableDataPath = getPortableDataPath();
    const isPortable = !('target' in product) && fs.existsSync(portableDataPath);
    const portableTempPath = path.join(portableDataPath, 'tmp');
    const isTempPortable = isPortable && fs.existsSync(portableTempPath);
    if (isPortable) {
        process.env['VSCODE_PORTABLE'] = portableDataPath;
    }
    else {
        delete process.env['VSCODE_PORTABLE'];
    }
    if (isTempPortable) {
        if (process.platform === 'win32') {
            process.env['TMP'] = portableTempPath;
            process.env['TEMP'] = portableTempPath;
        }
        else {
            process.env['TMPDIR'] = portableTempPath;
        }
    }
    return {
        portableDataPath,
        isPortable,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLW5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJib290c3RyYXAtbm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUM1QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFBO0FBQ25DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHM0MsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDOUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQzlELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFBO0FBRTlDLDBGQUEwRjtBQUMxRixLQUFLLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQTtBQUUzQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUM7SUFDNUMscUVBQXFFO0lBQ3JFLHNEQUFzRDtJQUN0RCxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtJQUM5QixPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDMUIscUVBQXFFO1FBQ3JFLDBFQUEwRTtRQUMxRSxzRUFBc0U7UUFDdEUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDekIsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1lBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCx1RUFBdUU7QUFDdkUsNEVBQTRFO0FBQzVFLGtGQUFrRjtBQUNsRixTQUFTLDRCQUE0QjtJQUNwQyxJQUFJLENBQUM7UUFDSixnREFBZ0Q7UUFDaEQsZ0RBQWdEO1FBQ2hELGdEQUFnRDtRQUNoRCxvQkFBb0I7UUFDcEIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUMsQ0FBQztRQUVELGdFQUFnRTtRQUNoRSxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbkIsQ0FBQztBQUNGLENBQUM7QUFFRCw0QkFBNEIsRUFBRSxDQUFBO0FBRTlCOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsVUFBa0I7SUFDL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUNoQyxPQUFNLENBQUMsc0NBQXNDO0lBQzlDLENBQUM7SUFFRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFRCx5QkFBeUI7SUFDekIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3JDLE1BQU0sQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7QUFDM0YsQ0FBQztBQUVELE1BQU0sVUFBVSxtQ0FBbUM7SUFDbEQsSUFBSSxPQUFPLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JELE9BQU0sQ0FBQyxpS0FBaUs7SUFDekssQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNoQyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFBO0lBRXRDLE1BQU0sMEJBQTBCLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFBO0lBRTdELE1BQU0sQ0FBQyxtQkFBbUIsR0FBRyxVQUFVLFVBQWtCLEVBQUUsTUFBVztRQUNyRSxNQUFNLEtBQUssR0FBRywwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUE7WUFDMUIsT0FDQyxrQkFBa0IsR0FBRyxLQUFLLENBQUMsTUFBTTtnQkFDakMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLGtCQUFrQixDQUFDO29CQUMzQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsRUFDeEQsQ0FBQztnQkFDRixrQkFBa0IsRUFBRSxDQUFBO1lBQ3JCLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDLENBQUE7SUFFRCxNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQTtJQUN2RCxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxJQUFZO1FBQy9DLElBQUksS0FBSyxHQUFhLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCwyRUFBMkU7UUFDM0UsbURBQW1EO1FBQ25ELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWpFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwQixLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBRXBGLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO1lBRXhFLDJDQUEyQztZQUMzQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQyxDQUFBO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLE9BQXVDO0lBSXhFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7SUFFdkMsU0FBUyxrQkFBa0I7UUFDMUIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxTQUFTLG1CQUFtQjtRQUMzQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDbEUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFFBQVEsSUFBSSxHQUFHLE9BQU8sQ0FBQyxlQUFlLGdCQUFnQixDQUFBO1FBQ3ZGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFRCxNQUFNLGdCQUFnQixHQUFHLG1CQUFtQixFQUFFLENBQUE7SUFDOUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDNUUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzNELE1BQU0sY0FBYyxHQUFHLFVBQVUsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFFcEUsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsZ0JBQWdCLENBQUE7SUFDbEQsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQixJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQTtZQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFBO1FBQ3ZDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQTtRQUN6QyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixnQkFBZ0I7UUFDaEIsVUFBVTtLQUNWLENBQUE7QUFDRixDQUFDIn0=