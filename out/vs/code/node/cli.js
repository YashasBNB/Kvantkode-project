/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { spawn } from 'child_process';
import { chmodSync, existsSync, readFileSync, statSync, truncateSync, unlinkSync } from 'fs';
import { homedir, release, tmpdir } from 'os';
import { Event } from '../../base/common/event.js';
import { isAbsolute, resolve, join, dirname } from '../../base/common/path.js';
import { isMacintosh, isWindows } from '../../base/common/platform.js';
import { randomPort } from '../../base/common/ports.js';
import { whenDeleted, writeFileSync } from '../../base/node/pfs.js';
import { findFreePort } from '../../base/node/ports.js';
import { watchFileContents } from '../../platform/files/node/watcher/nodejs/nodejsWatcherLib.js';
import { buildHelpMessage, buildVersionMessage, NATIVE_CLI_COMMANDS, OPTIONS, } from '../../platform/environment/node/argv.js';
import { addArg, parseCLIProcessArgv } from '../../platform/environment/node/argvHelper.js';
import { getStdinFilePath, hasStdinWithoutTty, readFromStdin, stdinDataListener, } from '../../platform/environment/node/stdin.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import product from '../../platform/product/common/product.js';
import { CancellationTokenSource } from '../../base/common/cancellation.js';
import { isUNC, randomPath } from '../../base/common/extpath.js';
import { Utils } from '../../platform/profiling/common/profiling.js';
import { FileAccess } from '../../base/common/network.js';
import { cwd } from '../../base/common/process.js';
import { addUNCHostToAllowlist } from '../../base/node/unc.js';
import { URI } from '../../base/common/uri.js';
import { DeferredPromise } from '../../base/common/async.js';
function shouldSpawnCliProcess(argv) {
    return (!!argv['install-source'] ||
        !!argv['list-extensions'] ||
        !!argv['install-extension'] ||
        !!argv['uninstall-extension'] ||
        !!argv['update-extensions'] ||
        !!argv['locate-extension'] ||
        !!argv['add-mcp'] ||
        !!argv['telemetry']);
}
export async function main(argv) {
    let args;
    try {
        args = parseCLIProcessArgv(argv);
    }
    catch (err) {
        console.error(err.message);
        return;
    }
    for (const subcommand of NATIVE_CLI_COMMANDS) {
        if (args[subcommand]) {
            if (!product.tunnelApplicationName) {
                console.error(`'${subcommand}' command not supported in ${product.applicationName}`);
                return;
            }
            const env = {
                ...process.env,
            };
            // bootstrap-esm.js determines the electron environment based
            // on the following variable. For the server we need to unset
            // it to prevent importing any electron specific modules.
            // Refs https://github.com/microsoft/vscode/issues/221883
            delete env['ELECTRON_RUN_AS_NODE'];
            const tunnelArgs = argv.slice(argv.indexOf(subcommand) + 1); // all arguments behind `tunnel`
            return new Promise((resolve, reject) => {
                let tunnelProcess;
                const stdio = ['ignore', 'pipe', 'pipe'];
                if (process.env['VSCODE_DEV']) {
                    tunnelProcess = spawn('cargo', ['run', '--', subcommand, ...tunnelArgs], {
                        cwd: join(getAppRoot(), 'cli'),
                        stdio,
                        env,
                    });
                }
                else {
                    const appPath = process.platform === 'darwin'
                        ? // ./Contents/MacOS/Electron => ./Contents/Resources/app/bin/code-tunnel-insiders
                            join(dirname(dirname(process.execPath)), 'Resources', 'app')
                        : dirname(process.execPath);
                    const tunnelCommand = join(appPath, 'bin', `${product.tunnelApplicationName}${isWindows ? '.exe' : ''}`);
                    tunnelProcess = spawn(tunnelCommand, [subcommand, ...tunnelArgs], {
                        cwd: cwd(),
                        stdio,
                        env,
                    });
                }
                tunnelProcess.stdout.pipe(process.stdout);
                tunnelProcess.stderr.pipe(process.stderr);
                tunnelProcess.on('exit', resolve);
                tunnelProcess.on('error', reject);
            });
        }
    }
    // Help
    if (args.help) {
        const executable = `${product.applicationName}${isWindows ? '.exe' : ''}`;
        console.log(buildHelpMessage(product.nameLong, executable, product.version, OPTIONS));
    }
    // Version Info
    else if (args.version) {
        console.log(buildVersionMessage(product.version, product.commit));
    }
    // Shell integration
    else if (args['locate-shell-integration-path']) {
        let file;
        switch (args['locate-shell-integration-path']) {
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
    }
    // Extensions Management
    else if (shouldSpawnCliProcess(args)) {
        // We do not bundle `cliProcessMain.js` into this file because
        // it is rather large and only needed for very few CLI operations.
        // This has the downside that we need to know if we run OSS or
        // built, because our location on disk is different if built.
        let cliProcessMain;
        if (process.env['VSCODE_DEV']) {
            cliProcessMain = './cliProcessMain.js';
        }
        else {
            cliProcessMain = './vs/code/node/cliProcessMain.js';
        }
        const cli = await import(cliProcessMain);
        await cli.main(args);
        return;
    }
    // Write File
    else if (args['file-write']) {
        const argsFile = args._[0];
        if (!argsFile ||
            !isAbsolute(argsFile) ||
            !existsSync(argsFile) ||
            !statSync(argsFile).isFile()) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        let source;
        let target;
        try {
            const argsContents = JSON.parse(readFileSync(argsFile, 'utf8'));
            source = argsContents.source;
            target = argsContents.target;
        }
        catch (error) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        // Windows: set the paths as allowed UNC paths given
        // they are explicitly provided by the user as arguments
        if (isWindows) {
            for (const path of [source, target]) {
                if (typeof path === 'string' && isUNC(path)) {
                    addUNCHostToAllowlist(URI.file(path).authority);
                }
            }
        }
        // Validate
        if (!source ||
            !target ||
            source === target || // make sure source and target are provided and are not the same
            !isAbsolute(source) ||
            !isAbsolute(target) || // make sure both source and target are absolute paths
            !existsSync(source) ||
            !statSync(source).isFile() || // make sure source exists as file
            !existsSync(target) ||
            !statSync(target).isFile() // make sure target exists as file
        ) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        try {
            // Check for readonly status and chmod if so if we are told so
            let targetMode = 0;
            let restoreMode = false;
            if (!!args['file-chmod']) {
                targetMode = statSync(target).mode;
                if (!((targetMode & 0o200) /* File mode indicating writable by owner */)) {
                    chmodSync(target, targetMode | 0o200);
                    restoreMode = true;
                }
            }
            // Write source to target
            const data = readFileSync(source);
            if (isWindows) {
                // On Windows we use a different strategy of saving the file
                // by first truncating the file and then writing with r+ mode.
                // This helps to save hidden files on Windows
                // (see https://github.com/microsoft/vscode/issues/931) and
                // prevent removing alternate data streams
                // (see https://github.com/microsoft/vscode/issues/6363)
                truncateSync(target, 0);
                writeFileSync(target, data, { flag: 'r+' });
            }
            else {
                writeFileSync(target, data);
            }
            // Restore previous mode as needed
            if (restoreMode) {
                chmodSync(target, targetMode);
            }
        }
        catch (error) {
            error.message = `Error using --file-write: ${error.message}`;
            throw error;
        }
    }
    // Just Code
    else {
        const env = {
            ...process.env,
            ELECTRON_NO_ATTACH_CONSOLE: '1',
        };
        delete env['ELECTRON_RUN_AS_NODE'];
        const processCallbacks = [];
        if (args.verbose) {
            env['ELECTRON_ENABLE_LOGGING'] = '1';
        }
        if (args.verbose || args.status) {
            processCallbacks.push(async (child) => {
                child.stdout?.on('data', (data) => console.log(data.toString('utf8').trim()));
                child.stderr?.on('data', (data) => console.log(data.toString('utf8').trim()));
                await Event.toPromise(Event.fromNodeEventEmitter(child, 'exit'));
            });
        }
        const hasReadStdinArg = args._.some((arg) => arg === '-');
        if (hasReadStdinArg) {
            // remove the "-" argument when we read from stdin
            args._ = args._.filter((a) => a !== '-');
            argv = argv.filter((a) => a !== '-');
        }
        let stdinFilePath;
        if (hasStdinWithoutTty()) {
            // Read from stdin: we require a single "-" argument to be passed in order to start reading from
            // stdin. We do this because there is no reliable way to find out if data is piped to stdin. Just
            // checking for stdin being connected to a TTY is not enough (https://github.com/microsoft/vscode/issues/40351)
            if (hasReadStdinArg) {
                stdinFilePath = getStdinFilePath();
                try {
                    const readFromStdinDone = new DeferredPromise();
                    await readFromStdin(stdinFilePath, !!args.verbose, () => readFromStdinDone.complete());
                    if (!args.wait) {
                        // if `--wait` is not provided, we keep this process alive
                        // for at least as long as the stdin stream is open to
                        // ensure that we read all the data.
                        // the downside is that the Code CLI process will then not
                        // terminate until stdin is closed, but users can always
                        // pass `--wait` to prevent that from happening (this is
                        // actually what we enforced until v1.85.x but then was
                        // changed to not enforce it anymore).
                        // a solution in the future would possibly be to exit, when
                        // the Code process exits. this would require some careful
                        // solution though in case Code is already running and this
                        // is a second instance telling the first instance what to
                        // open.
                        processCallbacks.push(() => readFromStdinDone.p);
                    }
                    // Make sure to open tmp file as editor but ignore it in the "recently open" list
                    addArg(argv, stdinFilePath);
                    addArg(argv, '--skip-add-to-recently-opened');
                    console.log(`Reading from stdin via: ${stdinFilePath}`);
                }
                catch (e) {
                    console.log(`Failed to create file to read via stdin: ${e.toString()}`);
                    stdinFilePath = undefined;
                }
            }
            else {
                // If the user pipes data via stdin but forgot to add the "-" argument, help by printing a message
                // if we detect that data flows into via stdin after a certain timeout.
                processCallbacks.push((_) => stdinDataListener(1000).then((dataReceived) => {
                    if (dataReceived) {
                        if (isWindows) {
                            console.log(`Run with '${product.applicationName} -' to read output from another program (e.g. 'echo Hello World | ${product.applicationName} -').`);
                        }
                        else {
                            console.log(`Run with '${product.applicationName} -' to read from stdin (e.g. 'ps aux | grep code | ${product.applicationName} -').`);
                        }
                    }
                }));
            }
        }
        const isMacOSBigSurOrNewer = isMacintosh && release() > '20.0.0';
        // If we are started with --wait create a random temporary file
        // and pass it over to the starting instance. We can use this file
        // to wait for it to be deleted to monitor that the edited file
        // is closed and then exit the waiting process.
        let waitMarkerFilePath;
        if (args.wait) {
            waitMarkerFilePath = createWaitMarkerFileSync(args.verbose);
            if (waitMarkerFilePath) {
                addArg(argv, '--waitMarkerFilePath', waitMarkerFilePath);
            }
            // When running with --wait, we want to continue running CLI process
            // until either:
            // - the wait marker file has been deleted (e.g. when closing the editor)
            // - the launched process terminates (e.g. due to a crash)
            processCallbacks.push(async (child) => {
                let childExitPromise;
                if (isMacOSBigSurOrNewer) {
                    // On Big Sur, we resolve the following promise only when the child,
                    // i.e. the open command, exited with a signal or error. Otherwise, we
                    // wait for the marker file to be deleted or for the child to error.
                    childExitPromise = new Promise((resolve) => {
                        // Only resolve this promise if the child (i.e. open) exited with an error
                        child.on('exit', (code, signal) => {
                            if (code !== 0 || signal) {
                                resolve();
                            }
                        });
                    });
                }
                else {
                    // On other platforms, we listen for exit in case the child exits before the
                    // marker file is deleted.
                    childExitPromise = Event.toPromise(Event.fromNodeEventEmitter(child, 'exit'));
                }
                try {
                    await Promise.race([
                        whenDeleted(waitMarkerFilePath),
                        Event.toPromise(Event.fromNodeEventEmitter(child, 'error')),
                        childExitPromise,
                    ]);
                }
                finally {
                    if (stdinFilePath) {
                        unlinkSync(stdinFilePath); // Make sure to delete the tmp stdin file if we have any
                    }
                }
            });
        }
        // If we have been started with `--prof-startup` we need to find free ports to profile
        // the main process, the renderer, and the extension host. We also disable v8 cached data
        // to get better profile traces. Last, we listen on stdout for a signal that tells us to
        // stop profiling.
        if (args['prof-startup']) {
            const profileHost = '127.0.0.1';
            const portMain = await findFreePort(randomPort(), 10, 3000);
            const portRenderer = await findFreePort(portMain + 1, 10, 3000);
            const portExthost = await findFreePort(portRenderer + 1, 10, 3000);
            // fail the operation when one of the ports couldn't be acquired.
            if (portMain * portRenderer * portExthost === 0) {
                throw new Error('Failed to find free ports for profiler. Make sure to shutdown all instances of the editor first.');
            }
            const filenamePrefix = randomPath(homedir(), 'prof');
            addArg(argv, `--inspect-brk=${profileHost}:${portMain}`);
            addArg(argv, `--remote-debugging-port=${profileHost}:${portRenderer}`);
            addArg(argv, `--inspect-brk-extensions=${profileHost}:${portExthost}`);
            addArg(argv, `--prof-startup-prefix`, filenamePrefix);
            addArg(argv, `--no-cached-data`);
            writeFileSync(filenamePrefix, argv.slice(-6).join('|'));
            processCallbacks.push(async (_child) => {
                class Profiler {
                    static async start(name, filenamePrefix, opts) {
                        const profiler = await import('v8-inspect-profiler');
                        let session;
                        try {
                            session = await profiler.startProfiling({ ...opts, host: profileHost });
                        }
                        catch (err) {
                            console.error(`FAILED to start profiling for '${name}' on port '${opts.port}'`);
                        }
                        return {
                            async stop() {
                                if (!session) {
                                    return;
                                }
                                let suffix = '';
                                const result = await session.stop();
                                if (!process.env['VSCODE_DEV']) {
                                    // when running from a not-development-build we remove
                                    // absolute filenames because we don't want to reveal anything
                                    // about users. We also append the `.txt` suffix to make it
                                    // easier to attach these files to GH issues
                                    result.profile = Utils.rewriteAbsolutePaths(result.profile, 'piiRemoved');
                                    suffix = '.txt';
                                }
                                writeFileSync(`${filenamePrefix}.${name}.cpuprofile${suffix}`, JSON.stringify(result.profile, undefined, 4));
                            },
                        };
                    }
                }
                try {
                    // load and start profiler
                    const mainProfileRequest = Profiler.start('main', filenamePrefix, { port: portMain });
                    const extHostProfileRequest = Profiler.start('extHost', filenamePrefix, {
                        port: portExthost,
                        tries: 300,
                    });
                    const rendererProfileRequest = Profiler.start('renderer', filenamePrefix, {
                        port: portRenderer,
                        tries: 200,
                        target: function (targets) {
                            return targets.filter((target) => {
                                if (!target.webSocketDebuggerUrl) {
                                    return false;
                                }
                                if (target.type === 'page') {
                                    return (target.url.indexOf('workbench/workbench.html') > 0 ||
                                        target.url.indexOf('workbench/workbench-dev.html') > 0);
                                }
                                else {
                                    return true;
                                }
                            })[0];
                        },
                    });
                    const main = await mainProfileRequest;
                    const extHost = await extHostProfileRequest;
                    const renderer = await rendererProfileRequest;
                    // wait for the renderer to delete the marker file
                    await whenDeleted(filenamePrefix);
                    // stop profiling
                    await main.stop();
                    await renderer.stop();
                    await extHost.stop();
                    // re-create the marker file to signal that profiling is done
                    writeFileSync(filenamePrefix, '');
                }
                catch (e) {
                    console.error('Failed to profile startup. Make sure to quit Code first.');
                }
            });
        }
        const options = {
            detached: true,
            env,
        };
        if (!args.verbose) {
            options['stdio'] = 'ignore';
        }
        let child;
        if (!isMacOSBigSurOrNewer) {
            if (!args.verbose && args.status) {
                options['stdio'] = ['ignore', 'pipe', 'ignore']; // restore ability to see output when --status is used
            }
            // We spawn process.execPath directly
            child = spawn(process.execPath, argv.slice(2), options);
        }
        else {
            // On Big Sur, we spawn using the open command to obtain behavior
            // similar to if the app was launched from the dock
            // https://github.com/microsoft/vscode/issues/102975
            // The following args are for the open command itself, rather than for VS Code:
            // -n creates a new instance.
            //    Without -n, the open command re-opens the existing instance as-is.
            // -g starts the new instance in the background.
            //    Later, Electron brings the instance to the foreground.
            //    This way, Mac does not automatically try to foreground the new instance, which causes
            //    focusing issues when the new instance only sends data to a previous instance and then closes.
            const spawnArgs = ['-n', '-g'];
            // -a opens the given application.
            spawnArgs.push('-a', process.execPath); // -a: opens a specific application
            if (args.verbose || args.status) {
                spawnArgs.push('--wait-apps'); // `open --wait-apps`: blocks until the launched app is closed (even if they were already running)
                // The open command only allows for redirecting stderr and stdout to files,
                // so we make it redirect those to temp files, and then use a logger to
                // redirect the file output to the console
                for (const outputType of args.verbose ? ['stdout', 'stderr'] : ['stdout']) {
                    // Tmp file to target output to
                    const tmpName = randomPath(tmpdir(), `code-${outputType}`);
                    writeFileSync(tmpName, '');
                    spawnArgs.push(`--${outputType}`, tmpName);
                    // Listener to redirect content to stdout/stderr
                    processCallbacks.push(async (child) => {
                        try {
                            const stream = outputType === 'stdout' ? process.stdout : process.stderr;
                            const cts = new CancellationTokenSource();
                            child.on('close', () => {
                                // We must dispose the token to stop watching,
                                // but the watcher might still be reading data.
                                setTimeout(() => cts.dispose(true), 200);
                            });
                            await watchFileContents(tmpName, (chunk) => stream.write(chunk), () => {
                                /* ignore */
                            }, cts.token);
                        }
                        finally {
                            unlinkSync(tmpName);
                        }
                    });
                }
            }
            for (const e in env) {
                // Ignore the _ env var, because the open command
                // ignores it anyway.
                // Pass the rest of the env vars in to fix
                // https://github.com/microsoft/vscode/issues/134696.
                if (e !== '_') {
                    spawnArgs.push('--env');
                    spawnArgs.push(`${e}=${env[e]}`);
                }
            }
            spawnArgs.push('--args', ...argv.slice(2)); // pass on our arguments
            if (env['VSCODE_DEV']) {
                // If we're in development mode, replace the . arg with the
                // vscode source arg. Because the OSS app isn't bundled,
                // it needs the full vscode source arg to launch properly.
                const curdir = '.';
                const launchDirIndex = spawnArgs.indexOf(curdir);
                if (launchDirIndex !== -1) {
                    spawnArgs[launchDirIndex] = resolve(curdir);
                }
            }
            // We already passed over the env variables
            // using the --env flags, so we can leave them out here.
            // Also, we don't need to pass env._, which is different from argv._
            child = spawn('open', spawnArgs, { ...options, env: {} });
        }
        return Promise.all(processCallbacks.map((callback) => callback(child)));
    }
}
function getAppRoot() {
    return dirname(FileAccess.asFileUri('').fsPath);
}
function eventuallyExit(code) {
    setTimeout(() => process.exit(code), 0);
}
main(process.argv)
    .then(() => eventuallyExit(0))
    .then(null, (err) => {
    console.error(err.message || err.stack || err);
    eventuallyExit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9ub2RlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWdCLEtBQUssRUFBOEIsTUFBTSxlQUFlLENBQUE7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUU3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzlFLE9BQU8sRUFBdUIsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUVoRyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsT0FBTyxHQUNQLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzNGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsa0JBQWtCLEVBQ2xCLGFBQWEsRUFDYixp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