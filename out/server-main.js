/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './bootstrap-server.js'; // this MUST come before other imports as it changes global state
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import * as readline from 'readline';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import { devInjectNodeModuleLookupPath, removeGlobalNodeJsModuleLookupPaths, } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { product } from './bootstrap-meta.js';
import * as perf from './vs/base/common/performance.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
perf.mark('code/server/start');
globalThis.vscodeServerStartTime = performance.now();
// Do a quick parse to determine if a server or the cli needs to be started
const parsedArgs = minimist(process.argv.slice(2), {
    boolean: [
        'start-server',
        'list-extensions',
        'print-ip-address',
        'help',
        'version',
        'accept-server-license-terms',
        'update-extensions',
    ],
    string: [
        'install-extension',
        'install-builtin-extension',
        'uninstall-extension',
        'locate-extension',
        'socket-path',
        'host',
        'port',
        'compatibility',
    ],
    alias: { help: 'h', version: 'v' },
});
['host', 'port', 'accept-server-license-terms'].forEach((e) => {
    if (!parsedArgs[e]) {
        const envValue = process.env[`VSCODE_SERVER_${e.toUpperCase().replace('-', '_')}`];
        if (envValue) {
            parsedArgs[e] = envValue;
        }
    }
});
const extensionLookupArgs = ['list-extensions', 'locate-extension'];
const extensionInstallArgs = [
    'install-extension',
    'install-builtin-extension',
    'uninstall-extension',
    'update-extensions',
];
const shouldSpawnCli = parsedArgs.help ||
    parsedArgs.version ||
    extensionLookupArgs.some((a) => !!parsedArgs[a]) ||
    (extensionInstallArgs.some((a) => !!parsedArgs[a]) && !parsedArgs['start-server']);
const nlsConfiguration = await resolveNLSConfiguration({
    userLocale: 'en',
    osLocale: 'en',
    commit: product.commit,
    userDataPath: '',
    nlsMetadataPath: __dirname,
});
if (shouldSpawnCli) {
    loadCode(nlsConfiguration).then((mod) => {
        mod.spawnCli();
    });
}
else {
    let _remoteExtensionHostAgentServer = null;
    let _remoteExtensionHostAgentServerPromise = null;
    const getRemoteExtensionHostAgentServer = () => {
        if (!_remoteExtensionHostAgentServerPromise) {
            _remoteExtensionHostAgentServerPromise = loadCode(nlsConfiguration).then(async (mod) => {
                const server = await mod.createServer(address);
                _remoteExtensionHostAgentServer = server;
                return server;
            });
        }
        return _remoteExtensionHostAgentServerPromise;
    };
    if (Array.isArray(product.serverLicense) && product.serverLicense.length) {
        console.log(product.serverLicense.join('\n'));
        if (product.serverLicensePrompt && parsedArgs['accept-server-license-terms'] !== true) {
            if (hasStdinWithoutTty()) {
                console.log('To accept the license terms, start the server with --accept-server-license-terms');
                process.exit(1);
            }
            try {
                const accept = await prompt(product.serverLicensePrompt);
                if (!accept) {
                    process.exit(1);
                }
            }
            catch (e) {
                console.log(e);
                process.exit(1);
            }
        }
    }
    let firstRequest = true;
    let firstWebSocket = true;
    let address = null;
    const server = http.createServer(async (req, res) => {
        if (firstRequest) {
            firstRequest = false;
            perf.mark('code/server/firstRequest');
        }
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        return remoteExtensionHostAgentServer.handleRequest(req, res);
    });
    server.on('upgrade', async (req, socket) => {
        if (firstWebSocket) {
            firstWebSocket = false;
            perf.mark('code/server/firstWebSocket');
        }
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        // @ts-ignore
        return remoteExtensionHostAgentServer.handleUpgrade(req, socket);
    });
    server.on('error', async (err) => {
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        return remoteExtensionHostAgentServer.handleServerError(err);
    });
    const host = sanitizeStringArg(parsedArgs['host']) ||
        (parsedArgs['compatibility'] !== '1.63' ? 'localhost' : undefined);
    const nodeListenOptions = parsedArgs['socket-path']
        ? { path: sanitizeStringArg(parsedArgs['socket-path']) }
        : { host, port: await parsePort(host, sanitizeStringArg(parsedArgs['port'])) };
    server.listen(nodeListenOptions, async () => {
        let output = Array.isArray(product.serverGreeting) && product.serverGreeting.length
            ? `\n\n${product.serverGreeting.join('\n')}\n\n`
            : ``;
        if (typeof nodeListenOptions.port === 'number' && parsedArgs['print-ip-address']) {
            const ifaces = os.networkInterfaces();
            Object.keys(ifaces).forEach(function (ifname) {
                ifaces[ifname]?.forEach(function (iface) {
                    if (!iface.internal && iface.family === 'IPv4') {
                        output += `IP Address: ${iface.address}\n`;
                    }
                });
            });
        }
        address = server.address();
        if (address === null) {
            throw new Error('Unexpected server address');
        }
        output += `Server bound to ${typeof address === 'string' ? address : `${address.address}:${address.port} (${address.family})`}\n`;
        // Do not change this line. VS Code looks for this in the output.
        output += `Extension host agent listening on ${typeof address === 'string' ? address : address.port}\n`;
        console.log(output);
        perf.mark('code/server/started');
        globalThis.vscodeServerListenTime = performance.now();
        await getRemoteExtensionHostAgentServer();
    });
    process.on('exit', () => {
        server.close();
        if (_remoteExtensionHostAgentServer) {
            _remoteExtensionHostAgentServer.dispose();
        }
    });
}
function sanitizeStringArg(val) {
    if (Array.isArray(val)) {
        // if an argument is passed multiple times, minimist creates an array
        val = val.pop(); // take the last item
    }
    return typeof val === 'string' ? val : undefined;
}
/**
 * If `--port` is specified and describes a single port, connect to that port.
 *
 * If `--port`describes a port range
 * then find a free port in that range. Throw error if no
 * free port available in range.
 *
 * In absence of specified ports, connect to port 8000.
 */
async function parsePort(host, strPort) {
    if (strPort) {
        let range;
        if (strPort.match(/^\d+$/)) {
            return parseInt(strPort, 10);
        }
        else if ((range = parseRange(strPort))) {
            const port = await findFreePort(host, range.start, range.end);
            if (port !== undefined) {
                return port;
            }
            // Remote-SSH extension relies on this exact port error message, treat as an API
            console.warn(`--port: Could not find free port in range: ${range.start} - ${range.end} (inclusive).`);
            process.exit(1);
        }
        else {
            console.warn(`--port "${strPort}" is not a valid number or range. Ranges must be in the form 'from-to' with 'from' an integer larger than 0 and not larger than 'end'.`);
            process.exit(1);
        }
    }
    return 8000;
}
function parseRange(strRange) {
    const match = strRange.match(/^(\d+)-(\d+)$/);
    if (match) {
        const start = parseInt(match[1], 10), end = parseInt(match[2], 10);
        if (start > 0 && start <= end && end <= 65535) {
            return { start, end };
        }
    }
    return undefined;
}
/**
 * Starting at the `start` port, look for a free port incrementing
 * by 1 until `end` inclusive. If no free port is found, undefined is returned.
 */
async function findFreePort(host, start, end) {
    const testPort = (port) => {
        return new Promise((resolve) => {
            const server = http.createServer();
            server
                .listen(port, host, () => {
                server.close();
                resolve(true);
            })
                .on('error', () => {
                resolve(false);
            });
        });
    };
    for (let port = start; port <= end; port++) {
        if (await testPort(port)) {
            return port;
        }
    }
    return undefined;
}
async function loadCode(nlsConfiguration) {
    // required for `bootstrap-esm` to pick up NLS messages
    process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfiguration);
    // See https://github.com/microsoft/vscode-remote-release/issues/6543
    // We would normally install a SIGPIPE listener in bootstrap-node.js
    // But in certain situations, the console itself can be in a broken pipe state
    // so logging SIGPIPE to the console will cause an infinite async loop
    process.env['VSCODE_HANDLES_SIGPIPE'] = 'true';
    if (process.env['VSCODE_DEV']) {
        // When running out of sources, we need to load node modules from remote/node_modules,
        // which are compiled against nodejs, not electron
        process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] =
            process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] ||
                path.join(__dirname, '..', 'remote', 'node_modules');
        devInjectNodeModuleLookupPath(process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']);
    }
    else {
        delete process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'];
    }
    // Remove global paths from the node module lookup (node.js only)
    removeGlobalNodeJsModuleLookupPaths();
    // Bootstrap ESM
    await bootstrapESM();
    // Load Server
    return import('./vs/server/node/server.main.js');
}
function hasStdinWithoutTty() {
    try {
        return !process.stdin.isTTY; // Via https://twitter.com/MylesBorins/status/782009479382626304
    }
    catch (error) {
        // Windows workaround for https://github.com/nodejs/node/issues/11656
    }
    return false;
}
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve, reject) => {
        rl.question(question + ' ', async function (data) {
            rl.close();
            const str = data.toString().trim().toLowerCase();
            if (str === '' || str === 'y' || str === 'yes') {
                resolve(true);
            }
            else if (str === 'n' || str === 'no') {
                resolve(false);
            }
            else {
                process.stdout.write('\nInvalid Response. Answer either yes (y, yes) or no (n, no)\n');
                resolve(await prompt(question));
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLW1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJzZXJ2ZXItbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHVCQUF1QixDQUFBLENBQUMsaUVBQWlFO0FBQ2hHLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQzVCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBRTVCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDeEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEtBQUssQ0FBQTtBQUNuQyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQ0FBbUMsR0FDbkMsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDakQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzdDLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFJdkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRTlELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FDN0I7QUFBQyxVQUFrQixDQUFDLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUU5RCwyRUFBMkU7QUFDM0UsTUFBTSxVQUFV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