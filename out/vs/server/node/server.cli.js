/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as url from 'url';
import * as cp from 'child_process';
import * as http from 'http';
import { cwd } from '../../base/common/process.js';
import { dirname, extname, resolve, join } from '../../base/common/path.js';
import { parseArgs, buildHelpMessage, buildVersionMessage, OPTIONS, } from '../../platform/environment/node/argv.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import { hasStdinWithoutTty, getStdinFilePath, readFromStdin, } from '../../platform/environment/node/stdin.js';
import { DeferredPromise } from '../../base/common/async.js';
import { FileAccess } from '../../base/common/network.js';
const isSupportedForCmd = (optionId) => {
    switch (optionId) {
        case 'user-data-dir':
        case 'extensions-dir':
        case 'export-default-configuration':
        case 'install-source':
        case 'enable-smoke-test-driver':
        case 'extensions-download-dir':
        case 'builtin-extensions-dir':
        case 'telemetry':
            return false;
        default:
            return true;
    }
};
const isSupportedForPipe = (optionId) => {
    switch (optionId) {
        case 'version':
        case 'help':
        case 'folder-uri':
        case 'file-uri':
        case 'add':
        case 'diff':
        case 'merge':
        case 'wait':
        case 'goto':
        case 'reuse-window':
        case 'new-window':
        case 'status':
        case 'install-extension':
        case 'uninstall-extension':
        case 'update-extensions':
        case 'list-extensions':
        case 'force':
        case 'do-not-include-pack-dependencies':
        case 'show-versions':
        case 'category':
        case 'verbose':
        case 'remote':
        case 'locate-shell-integration-path':
            return true;
        default:
            return false;
    }
};
const cliPipe = process.env['VSCODE_IPC_HOOK_CLI'];
const cliCommand = process.env['VSCODE_CLIENT_COMMAND'];
const cliCommandCwd = process.env['VSCODE_CLIENT_COMMAND_CWD'];
const cliRemoteAuthority = process.env['VSCODE_CLI_AUTHORITY'];
const cliStdInFilePath = process.env['VSCODE_STDIN_FILE_PATH'];
export async function main(desc, args) {
    if (!cliPipe && !cliCommand) {
        console.log('Command is only available in WSL or inside a Visual Studio Code terminal.');
        return;
    }
    // take the local options and remove the ones that don't apply
    const options = {
        ...OPTIONS,
        gitCredential: { type: 'string' },
        openExternal: { type: 'boolean' },
    };
    const isSupported = cliCommand ? isSupportedForCmd : isSupportedForPipe;
    for (const optionId in OPTIONS) {
        const optId = optionId;
        if (!isSupported(optId)) {
            delete options[optId];
        }
    }
    if (cliPipe) {
        options['openExternal'] = { type: 'boolean' };
    }
    const errorReporter = {
        onMultipleValues: (id, usedValue) => {
            console.error(`Option '${id}' can only be defined once. Using value ${usedValue}.`);
        },
        onEmptyValue: (id) => {
            console.error(`Ignoring option '${id}': Value must not be empty.`);
        },
        onUnknownOption: (id) => {
            console.error(`Ignoring option '${id}': not supported for ${desc.executableName}.`);
        },
        onDeprecatedOption: (deprecatedOption, message) => {
            console.warn(`Option '${deprecatedOption}' is deprecated: ${message}`);
        },
    };
    const parsedArgs = parseArgs(args, options, errorReporter);
    const mapFileUri = cliRemoteAuthority ? mapFileToRemoteUri : (uri) => uri;
    const verbose = !!parsedArgs['verbose'];
    if (parsedArgs.help) {
        console.log(buildHelpMessage(desc.productName, desc.executableName, desc.version, options));
        return;
    }
    if (parsedArgs.version) {
        console.log(buildVersionMessage(desc.version, desc.commit));
        return;
    }
    if (parsedArgs['locate-shell-integration-path']) {
        let file;
        switch (parsedArgs['locate-shell-integration-path']) {
            // Usage: `[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"`
            case 'bash':
                file = 'shellIntegration-bash.sh';
                break;
            // Usage: `if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }`
            case 'pwsh':
                file = 'shellIntegration.ps1';
                break;
            // Usage: `[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path zsh)"`
            case 'zsh':
                file = 'shellIntegration-rc.zsh';
                break;
            // Usage: `string match -q "$TERM_PROGRAM" "vscode"; and . (code --locate-shell-integration-path fish)`
            case 'fish':
                file = 'shellIntegration.fish';
                break;
            default:
                throw new Error('Error using --locate-shell-integration-path: Invalid shell type');
        }
        console.log(join(getAppRoot(), 'out', 'vs', 'workbench', 'contrib', 'terminal', 'common', 'scripts', file));
        return;
    }
    if (cliPipe) {
        if (parsedArgs['openExternal']) {
            await openInBrowser(parsedArgs['_'], verbose);
            return;
        }
    }
    let remote = parsedArgs.remote;
    if (remote === 'local' || remote === 'false' || remote === '') {
        remote = null; // null represent a local window
    }
    const folderURIs = (parsedArgs['folder-uri'] || []).map(mapFileUri);
    parsedArgs['folder-uri'] = folderURIs;
    const fileURIs = (parsedArgs['file-uri'] || []).map(mapFileUri);
    parsedArgs['file-uri'] = fileURIs;
    const inputPaths = parsedArgs['_'];
    let hasReadStdinArg = false;
    for (const input of inputPaths) {
        if (input === '-') {
            hasReadStdinArg = true;
        }
        else {
            translatePath(input, mapFileUri, folderURIs, fileURIs);
        }
    }
    parsedArgs['_'] = [];
    let readFromStdinPromise;
    let stdinFilePath;
    if (hasReadStdinArg && hasStdinWithoutTty()) {
        try {
            stdinFilePath = cliStdInFilePath;
            if (!stdinFilePath) {
                stdinFilePath = getStdinFilePath();
                const readFromStdinDone = new DeferredPromise();
                await readFromStdin(stdinFilePath, verbose, () => readFromStdinDone.complete()); // throws error if file can not be written
                if (!parsedArgs.wait) {
                    // if `--wait` is not provided, we keep this process alive
                    // for at least as long as the stdin stream is open to
                    // ensure that we read all the data.
                    readFromStdinPromise = readFromStdinDone.p;
                }
            }
            // Make sure to open tmp file
            translatePath(stdinFilePath, mapFileUri, folderURIs, fileURIs);
            // Ignore adding this to history
            parsedArgs['skip-add-to-recently-opened'] = true;
            console.log(`Reading from stdin via: ${stdinFilePath}`);
        }
        catch (e) {
            console.log(`Failed to create file to read via stdin: ${e.toString()}`);
        }
    }
    if (parsedArgs.extensionDevelopmentPath) {
        parsedArgs.extensionDevelopmentPath = parsedArgs.extensionDevelopmentPath.map((p) => mapFileUri(pathToURI(p).href));
    }
    if (parsedArgs.extensionTestsPath) {
        parsedArgs.extensionTestsPath = mapFileUri(pathToURI(parsedArgs['extensionTestsPath']).href);
    }
    const crashReporterDirectory = parsedArgs['crash-reporter-directory'];
    if (crashReporterDirectory !== undefined && !crashReporterDirectory.match(/^([a-zA-Z]:[\\\/])/)) {
        console.log(`The crash reporter directory '${crashReporterDirectory}' must be an absolute Windows path (e.g. c:/crashes)`);
        return;
    }
    if (cliCommand) {
        if (parsedArgs['install-extension'] !== undefined ||
            parsedArgs['uninstall-extension'] !== undefined ||
            parsedArgs['list-extensions'] ||
            parsedArgs['update-extensions']) {
            const cmdLine = [];
            parsedArgs['install-extension']?.forEach((id) => cmdLine.push('--install-extension', id));
            parsedArgs['uninstall-extension']?.forEach((id) => cmdLine.push('--uninstall-extension', id));
            ['list-extensions', 'force', 'show-versions', 'category'].forEach((opt) => {
                const value = parsedArgs[opt];
                if (value !== undefined) {
                    cmdLine.push(`--${opt}=${value}`);
                }
            });
            if (parsedArgs['update-extensions']) {
                cmdLine.push('--update-extensions');
            }
            const childProcess = cp.fork(FileAccess.asFileUri('server-main').fsPath, cmdLine, {
                stdio: 'inherit',
            });
            childProcess.on('error', (err) => console.log(err));
            return;
        }
        const newCommandline = [];
        for (const key in parsedArgs) {
            const val = parsedArgs[key];
            if (typeof val === 'boolean') {
                if (val) {
                    newCommandline.push('--' + key);
                }
            }
            else if (Array.isArray(val)) {
                for (const entry of val) {
                    newCommandline.push(`--${key}=${entry.toString()}`);
                }
            }
            else if (val) {
                newCommandline.push(`--${key}=${val.toString()}`);
            }
        }
        if (remote !== null) {
            newCommandline.push(`--remote=${remote || cliRemoteAuthority}`);
        }
        const ext = extname(cliCommand);
        if (ext === '.bat' || ext === '.cmd') {
            const processCwd = cliCommandCwd || cwd();
            if (verbose) {
                console.log(`Invoking: cmd.exe /C ${cliCommand} ${newCommandline.join(' ')} in ${processCwd}`);
            }
            cp.spawn('cmd.exe', ['/C', cliCommand, ...newCommandline], {
                stdio: 'inherit',
                cwd: processCwd,
            });
        }
        else {
            const cliCwd = dirname(cliCommand);
            const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
            newCommandline.unshift('resources/app/out/cli.js');
            if (verbose) {
                console.log(`Invoking: cd "${cliCwd}" && ELECTRON_RUN_AS_NODE=1 "${cliCommand}" "${newCommandline.join('" "')}"`);
            }
            if (runningInWSL2()) {
                if (verbose) {
                    console.log(`Using pipes for output.`);
                }
                const childProcess = cp.spawn(cliCommand, newCommandline, {
                    cwd: cliCwd,
                    env,
                    stdio: ['inherit', 'pipe', 'pipe'],
                });
                childProcess.stdout.on('data', (data) => process.stdout.write(data));
                childProcess.stderr.on('data', (data) => process.stderr.write(data));
            }
            else {
                cp.spawn(cliCommand, newCommandline, { cwd: cliCwd, env, stdio: 'inherit' });
            }
        }
    }
    else {
        if (parsedArgs.status) {
            await sendToPipe({
                type: 'status',
            }, verbose)
                .then((res) => {
                console.log(res);
            })
                .catch((e) => {
                console.error('Error when requesting status:', e);
            });
            return;
        }
        if (parsedArgs['install-extension'] !== undefined ||
            parsedArgs['uninstall-extension'] !== undefined ||
            parsedArgs['list-extensions'] ||
            parsedArgs['update-extensions']) {
            await sendToPipe({
                type: 'extensionManagement',
                list: parsedArgs['list-extensions']
                    ? { showVersions: parsedArgs['show-versions'], category: parsedArgs['category'] }
                    : undefined,
                install: asExtensionIdOrVSIX(parsedArgs['install-extension']),
                uninstall: asExtensionIdOrVSIX(parsedArgs['uninstall-extension']),
                force: parsedArgs['force'],
            }, verbose)
                .then((res) => {
                console.log(res);
            })
                .catch((e) => {
                console.error('Error when invoking the extension management command:', e);
            });
            return;
        }
        let waitMarkerFilePath = undefined;
        if (parsedArgs['wait']) {
            if (!fileURIs.length) {
                console.log('At least one file must be provided to wait for.');
                return;
            }
            waitMarkerFilePath = createWaitMarkerFileSync(verbose);
        }
        await sendToPipe({
            type: 'open',
            fileURIs,
            folderURIs,
            diffMode: parsedArgs.diff,
            mergeMode: parsedArgs.merge,
            addMode: parsedArgs.add,
            removeMode: parsedArgs.remove,
            gotoLineMode: parsedArgs.goto,
            forceReuseWindow: parsedArgs['reuse-window'],
            forceNewWindow: parsedArgs['new-window'],
            waitMarkerFilePath,
            remoteAuthority: remote,
        }, verbose).catch((e) => {
            console.error('Error when invoking the open command:', e);
        });
        if (waitMarkerFilePath) {
            await waitForFileDeleted(waitMarkerFilePath);
        }
        if (readFromStdinPromise) {
            await readFromStdinPromise;
        }
        if (waitMarkerFilePath && stdinFilePath) {
            try {
                fs.unlinkSync(stdinFilePath);
            }
            catch (e) {
                //ignore
            }
        }
    }
}
function runningInWSL2() {
    if (!!process.env['WSL_DISTRO_NAME']) {
        try {
            return cp.execSync('uname -r', { encoding: 'utf8' }).includes('-microsoft-');
        }
        catch (_e) {
            // Ignore
        }
    }
    return false;
}
async function waitForFileDeleted(path) {
    while (fs.existsSync(path)) {
        await new Promise((res) => setTimeout(res, 1000));
    }
}
async function openInBrowser(args, verbose) {
    const uris = [];
    for (const location of args) {
        try {
            if (/^[a-z-]+:\/\/.+/.test(location)) {
                uris.push(url.parse(location).href);
            }
            else {
                uris.push(pathToURI(location).href);
            }
        }
        catch (e) {
            console.log(`Invalid url: ${location}`);
        }
    }
    if (uris.length) {
        await sendToPipe({
            type: 'openExternal',
            uris,
        }, verbose).catch((e) => {
            console.error('Error when invoking the open external command:', e);
        });
    }
}
function sendToPipe(args, verbose) {
    if (verbose) {
        console.log(JSON.stringify(args, null, '  '));
    }
    return new Promise((resolve, reject) => {
        const message = JSON.stringify(args);
        if (!cliPipe) {
            console.log('Message ' + message);
            resolve('');
            return;
        }
        const opts = {
            socketPath: cliPipe,
            path: '/',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                accept: 'application/json',
            },
        };
        const req = http.request(opts, (res) => {
            if (res.headers['content-type'] !== 'application/json') {
                reject("Error in response: Invalid content type: Expected 'application/json', is: " +
                    res.headers['content-type']);
                return;
            }
            const chunks = [];
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            res.on('error', (err) => fatal('Error in response.', err));
            res.on('end', () => {
                const content = chunks.join('');
                try {
                    const obj = JSON.parse(content);
                    if (res.statusCode === 200) {
                        resolve(obj);
                    }
                    else {
                        reject(obj);
                    }
                }
                catch (e) {
                    reject('Error in response: Unable to parse response as JSON: ' + content);
                }
            });
        });
        req.on('error', (err) => fatal('Error in request.', err));
        req.write(message);
        req.end();
    });
}
function asExtensionIdOrVSIX(inputs) {
    return inputs?.map((input) => (/\.vsix$/i.test(input) ? pathToURI(input).href : input));
}
function fatal(message, err) {
    console.error('Unable to connect to VS Code server: ' + message);
    console.error(err);
    process.exit(1);
}
const preferredCwd = process.env.PWD || cwd(); // prefer process.env.PWD as it does not follow symlinks
function pathToURI(input) {
    input = input.trim();
    input = resolve(preferredCwd, input);
    return url.pathToFileURL(input);
}
function translatePath(input, mapFileUri, folderURIS, fileURIS) {
    const url = pathToURI(input);
    const mappedUri = mapFileUri(url.href);
    try {
        const stat = fs.lstatSync(fs.realpathSync(input));
        if (stat.isFile()) {
            fileURIS.push(mappedUri);
        }
        else if (stat.isDirectory()) {
            folderURIS.push(mappedUri);
        }
        else if (input === '/dev/null') {
            // handle /dev/null passed to us by external tools such as `git difftool`
            fileURIS.push(mappedUri);
        }
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            fileURIS.push(mappedUri);
        }
        else {
            console.log(`Problem accessing file ${input}. Ignoring file`, e);
        }
    }
}
function mapFileToRemoteUri(uri) {
    return uri.replace(/^file:\/\//, 'vscode-remote://' + cliRemoteAuthority);
}
function getAppRoot() {
    return dirname(FileAccess.asFileUri('').fsPath);
}
const [, , productName, version, commit, executableName, ...remainingArgs] = process.argv;
main({ productName, version, commit, executableName }, remainingArgs).then(null, (err) => {
    console.error(err.message || err.stack || err);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmNsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvc2VydmVyLmNsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQTtBQUMxQixPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzNFLE9BQU8sRUFDTixTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixPQUFPLEdBR1AsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVsRixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQixhQUFhLEdBQ2IsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBc0J6RCxNQUFNLGlCQUFpQixHQUFHLENBQUMsUUFBZ0MsRUFBRSxFQUFFO0lBQzlELFFBQVEsUUFBUSxFQUFFLENBQUM7UUFDbEIsS0FBSyxlQUFlLENBQUM7UUFDckIsS0FBSyxnQkFBZ0IsQ0FBQztRQUN0QixLQUFLLDhCQUE4QixDQUFDO1FBQ3BDLEtBQUssZ0JBQWdCLENBQUM7UUFDdEIsS0FBSywwQkFBMEIs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