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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLW5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC1ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQzVCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxLQUFLLENBQUE7QUFDbkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUczQyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUM5QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDOUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUE7QUFFOUMsMEZBQTBGO0FBQzFGLEtBQUssQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFBO0FBRTNCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztJQUM1QyxxRUFBcUU7SUFDckUsc0RBQXNEO0lBQ3RELElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFBO0lBQzlCLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUMxQixxRUFBcUU7UUFDckUsMEVBQTBFO1FBQzFFLHNFQUFzRTtRQUN0RSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN6QixrQkFBa0IsR0FBRyxJQUFJLENBQUE7WUFDekIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FB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