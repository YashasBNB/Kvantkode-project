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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmNsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3NlcnZlci5jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFDMUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbkMsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sU0FBUyxFQUNULGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsT0FBTyxHQUdQLE1BQU0seUNBQXlDLENBQUE7QUFFaEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbEYsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsYUFBYSxHQUNiLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQXNCekQsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLFFBQWdDLEVBQUUsRUFBRTtJQUM5RCxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUssZUFBZSxDQUFDO1FBQ3JCLEtBQUssZ0JBQWdCLENBQUM7UUFDdEIsS0FBSyw4QkFBOEIsQ0FBQztRQUNwQyxLQUFLLGdCQUFnQixDQUFDO1FBQ3RCLEtBQUssMEJBQTBCLENBQUM7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