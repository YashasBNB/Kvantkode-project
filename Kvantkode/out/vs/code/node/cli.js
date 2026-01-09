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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL25vZGUvY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0IsS0FBSyxFQUE4QixNQUFNLGVBQWUsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBRTdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDOUUsT0FBTyxFQUF1QixXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBRWhHLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQixPQUFPLEdBQ1AsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDM0YsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixr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