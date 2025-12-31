/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../platform/update/common/update.config.contribution.js';
import { app, dialog } from 'electron';
import { unlinkSync, promises } from 'fs';
import { URI } from '../../base/common/uri.js';
import { coalesce, distinct } from '../../base/common/arrays.js';
import { Promises } from '../../base/common/async.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { ExpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { isValidBasename, parseLineAndColumnAware, sanitizeFilePath, } from '../../base/common/extpath.js';
import { Event } from '../../base/common/event.js';
import { getPathLabel } from '../../base/common/labels.js';
import { Schemas } from '../../base/common/network.js';
import { basename, resolve } from '../../base/common/path.js';
import { mark } from '../../base/common/performance.js';
import { isMacintosh, isWindows, OS } from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { rtrim, trim } from '../../base/common/strings.js';
import { Promises as FSPromises } from '../../base/node/pfs.js';
import { ProxyChannel } from '../../base/parts/ipc/common/ipc.js';
import { connect as nodeIPCConnect, serve as nodeIPCServe, XDG_RUNTIME_DIR, } from '../../base/parts/ipc/node/ipc.net.js';
import { CodeApplication } from './app.js';
import { localize } from '../../nls.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { DiagnosticsService } from '../../platform/diagnostics/node/diagnosticsService.js';
import { EnvironmentMainService, IEnvironmentMainService, } from '../../platform/environment/electron-main/environmentMainService.js';
import { addArg, parseMainProcessArgv } from '../../platform/environment/node/argvHelper.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILifecycleMainService, LifecycleMainService, } from '../../platform/lifecycle/electron-main/lifecycleMainService.js';
import { BufferLogger } from '../../platform/log/common/bufferLog.js';
import { ConsoleMainLogger, getLogLevel, ILoggerService, ILogService, } from '../../platform/log/common/log.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IProtocolMainService } from '../../platform/protocol/electron-main/protocol.js';
import { ProtocolMainService } from '../../platform/protocol/electron-main/protocolMainService.js';
import { ITunnelService } from '../../platform/tunnel/common/tunnel.js';
import { TunnelService } from '../../platform/tunnel/node/tunnelService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/electron-utility/requestService.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { SignService } from '../../platform/sign/node/signService.js';
import { IStateReadService, IStateService } from '../../platform/state/node/state.js';
import { NullTelemetryService } from '../../platform/telemetry/common/telemetryUtils.js';
import { IThemeMainService, ThemeMainService, } from '../../platform/theme/electron-main/themeMainService.js';
import { IUserDataProfilesMainService, UserDataProfilesMainService, } from '../../platform/userDataProfile/electron-main/userDataProfile.js';
import { IPolicyService, NullPolicyService } from '../../platform/policy/common/policy.js';
import { NativePolicyService } from '../../platform/policy/node/nativePolicyService.js';
import { FilePolicyService } from '../../platform/policy/common/filePolicyService.js';
import { DisposableStore } from '../../base/common/lifecycle.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { ILoggerMainService, LoggerMainService, } from '../../platform/log/electron-main/loggerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { massageMessageBoxOptions } from '../../platform/dialogs/common/dialogs.js';
import { StateService } from '../../platform/state/node/stateService.js';
import { FileUserDataProvider } from '../../platform/userData/common/fileUserDataProvider.js';
import { addUNCHostToAllowlist, getUNCHost } from '../../base/node/unc.js';
/**
 * The main VS Code entry point.
 *
 * Note: This class can exist more than once for example when VS Code is already
 * running and a second instance is started from the command line. It will always
 * try to communicate with an existing instance to prevent that 2 VS Code instances
 * are running at the same time.
 */
class CodeMain {
    main() {
        try {
            this.startup();
        }
        catch (error) {
            console.error(error.message);
            app.exit(1);
        }
    }
    async startup() {
        // Set the error handler early enough so that we are not getting the
        // default electron error dialog popping up
        setUnexpectedErrorHandler((err) => console.error(err));
        // Create services
        const [instantiationService, instanceEnvironment, environmentMainService, configurationService, stateMainService, bufferLogger, productService, userDataProfilesMainService,] = this.createServices();
        try {
            // Init services
            try {
                await this.initServices(environmentMainService, userDataProfilesMainService, configurationService, stateMainService, productService);
            }
            catch (error) {
                // Show a dialog for errors that can be resolved by the user
                this.handleStartupDataDirError(environmentMainService, productService, error);
                throw error;
            }
            // Startup
            await instantiationService.invokeFunction(async (accessor) => {
                const logService = accessor.get(ILogService);
                const lifecycleMainService = accessor.get(ILifecycleMainService);
                const fileService = accessor.get(IFileService);
                const loggerService = accessor.get(ILoggerService);
                // Create the main IPC server by trying to be the server
                // If this throws an error it means we are not the first
                // instance of VS Code running and so we would quit.
                const mainProcessNodeIpcServer = await this.claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, true);
                // Write a lockfile to indicate an instance is running
                // (https://github.com/microsoft/vscode/issues/127861#issuecomment-877417451)
                FSPromises.writeFile(environmentMainService.mainLockfile, String(process.pid)).catch((err) => {
                    logService.warn(`app#startup(): Error writing main lockfile: ${err.stack}`);
                });
                // Delay creation of spdlog for perf reasons (https://github.com/microsoft/vscode/issues/72906)
                bufferLogger.logger = loggerService.createLogger('main', {
                    name: localize('mainLog', 'Main'),
                });
                // Lifecycle
                Event.once(lifecycleMainService.onWillShutdown)((evt) => {
                    fileService.dispose();
                    configurationService.dispose();
                    evt.join('instanceLockfile', promises.unlink(environmentMainService.mainLockfile).catch(() => {
                        /* ignored */
                    }));
                });
                return instantiationService
                    .createInstance(CodeApplication, mainProcessNodeIpcServer, instanceEnvironment)
                    .startup();
            });
        }
        catch (error) {
            instantiationService.invokeFunction(this.quit, error);
        }
    }
    createServices() {
        const services = new ServiceCollection();
        const disposables = new DisposableStore();
        process.once('exit', () => disposables.dispose());
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Environment
        const environmentMainService = new EnvironmentMainService(this.resolveArgs(), productService);
        const instanceEnvironment = this.patchEnvironment(environmentMainService); // Patch `process.env` with the instance's environment
        services.set(IEnvironmentMainService, environmentMainService);
        // Logger
        const loggerService = new LoggerMainService(getLogLevel(environmentMainService), environmentMainService.logsHome);
        services.set(ILoggerMainService, loggerService);
        // Log: We need to buffer the spdlog logs until we are sure
        // we are the only instance running, otherwise we'll have concurrent
        // log file access on Windows (https://github.com/microsoft/vscode/issues/41218)
        const bufferLogger = new BufferLogger(loggerService.getLogLevel());
        const logService = disposables.add(new LogService(bufferLogger, [new ConsoleMainLogger(loggerService.getLogLevel())]));
        services.set(ILogService, logService);
        // Files
        const fileService = new FileService(logService);
        services.set(IFileService, fileService);
        const diskFileSystemProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // State
        const stateService = new StateService(1 /* SaveStrategy.DELAYED */, environmentMainService, logService, fileService);
        services.set(IStateReadService, stateService);
        services.set(IStateService, stateService);
        // User Data Profiles
        const userDataProfilesMainService = new UserDataProfilesMainService(stateService, uriIdentityService, environmentMainService, fileService, logService);
        services.set(IUserDataProfilesMainService, userDataProfilesMainService);
        // Use FileUserDataProvider for user data to
        // enable atomic read / write operations.
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, userDataProfilesMainService, uriIdentityService, logService));
        // Policy
        let policyService;
        if (isWindows && productService.win32RegValueName) {
            policyService = disposables.add(new NativePolicyService(logService, productService.win32RegValueName));
        }
        else if (isMacintosh && productService.darwinBundleIdentifier) {
            policyService = disposables.add(new NativePolicyService(logService, productService.darwinBundleIdentifier));
        }
        else if (environmentMainService.policyFile) {
            policyService = disposables.add(new FilePolicyService(environmentMainService.policyFile, fileService, logService));
        }
        else {
            policyService = new NullPolicyService();
        }
        services.set(IPolicyService, policyService);
        // Configuration
        const configurationService = new ConfigurationService(userDataProfilesMainService.defaultProfile.settingsResource, fileService, policyService, logService);
        services.set(IConfigurationService, configurationService);
        // Lifecycle
        services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService, undefined, false));
        // Request
        services.set(IRequestService, new SyncDescriptor(RequestService, undefined, true));
        // Themes
        services.set(IThemeMainService, new SyncDescriptor(ThemeMainService));
        // Signing
        services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));
        // Tunnel
        services.set(ITunnelService, new SyncDescriptor(TunnelService));
        // Protocol (instantiated early and not using sync descriptor for security reasons)
        services.set(IProtocolMainService, new ProtocolMainService(environmentMainService, userDataProfilesMainService, logService));
        return [
            new InstantiationService(services, true),
            instanceEnvironment,
            environmentMainService,
            configurationService,
            stateService,
            bufferLogger,
            productService,
            userDataProfilesMainService,
        ];
    }
    patchEnvironment(environmentMainService) {
        const instanceEnvironment = {
            VSCODE_IPC_HOOK: environmentMainService.mainIPCHandle,
        };
        ['VSCODE_NLS_CONFIG', 'VSCODE_PORTABLE'].forEach((key) => {
            const value = process.env[key];
            if (typeof value === 'string') {
                instanceEnvironment[key] = value;
            }
        });
        Object.assign(process.env, instanceEnvironment);
        return instanceEnvironment;
    }
    async initServices(environmentMainService, userDataProfilesMainService, configurationService, stateService, productService) {
        await Promises.settled([
            // Environment service (paths)
            Promise.all([
                this.allowWindowsUNCPath(environmentMainService.extensionsPath), // enable extension paths on UNC drives...
                environmentMainService.codeCachePath, // ...other user-data-derived paths should already be enlisted from `main.js`
                environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath,
                userDataProfilesMainService.defaultProfile.globalStorageHome.with({
                    scheme: Schemas.file,
                }).fsPath,
                environmentMainService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath,
                environmentMainService.localHistoryHome.with({ scheme: Schemas.file }).fsPath,
                environmentMainService.backupHome,
            ].map((path) => (path ? promises.mkdir(path, { recursive: true }) : undefined))),
            // State service
            stateService.init(),
            // Configuration service
            configurationService.initialize(),
        ]);
        // Initialize user data profiles after initializing the state
        userDataProfilesMainService.init();
    }
    allowWindowsUNCPath(path) {
        if (isWindows) {
            const host = getUNCHost(path);
            if (host) {
                addUNCHostToAllowlist(host);
            }
        }
        return path;
    }
    async claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, retry) {
        // Try to setup a server for running. If that succeeds it means
        // we are the first instance to startup. Otherwise it is likely
        // that another instance is already running.
        let mainProcessNodeIpcServer;
        try {
            mark('code/willStartMainServer');
            mainProcessNodeIpcServer = await nodeIPCServe(environmentMainService.mainIPCHandle);
            mark('code/didStartMainServer');
            Event.once(lifecycleMainService.onWillShutdown)(() => mainProcessNodeIpcServer.dispose());
        }
        catch (error) {
            // Handle unexpected errors (the only expected error is EADDRINUSE that
            // indicates another instance of VS Code is running)
            if (error.code !== 'EADDRINUSE') {
                // Show a dialog for errors that can be resolved by the user
                this.handleStartupDataDirError(environmentMainService, productService, error);
                // Any other runtime error is just printed to the console
                throw error;
            }
            // there's a running instance, let's connect to it
            let client;
            try {
                client = await nodeIPCConnect(environmentMainService.mainIPCHandle, 'main');
            }
            catch (error) {
                // Handle unexpected connection errors by showing a dialog to the user
                if (!retry || isWindows || error.code !== 'ECONNREFUSED') {
                    if (error.code === 'EPERM') {
                        this.showStartupWarningDialog(localize('secondInstanceAdmin', 'Another instance of {0} is already running as administrator.', productService.nameShort), localize('secondInstanceAdminDetail', 'Please close the other instance and try again.'), productService);
                    }
                    throw error;
                }
                // it happens on Linux and OS X that the pipe is left behind
                // let's delete it, since we can't connect to it and then
                // retry the whole thing
                try {
                    unlinkSync(environmentMainService.mainIPCHandle);
                }
                catch (error) {
                    logService.warn('Could not delete obsolete instance handle', error);
                    throw error;
                }
                return this.claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, false);
            }
            // Tests from CLI require to be the only instance currently
            if (environmentMainService.extensionTestsLocationURI &&
                !environmentMainService.debugExtensionHost.break) {
                const msg = `Running extension tests from the command line is currently only supported if no other instance of ${productService.nameShort} is running.`;
                logService.error(msg);
                client.dispose();
                throw new Error(msg);
            }
            // Show a warning dialog after some timeout if it takes long to talk to the other instance
            // Skip this if we are running with --wait where it is expected that we wait for a while.
            // Also skip when gathering diagnostics (--status) which can take a longer time.
            let startupWarningDialogHandle = undefined;
            if (!environmentMainService.args.wait && !environmentMainService.args.status) {
                startupWarningDialogHandle = setTimeout(() => {
                    this.showStartupWarningDialog(localize('secondInstanceNoResponse', 'Another instance of {0} is running but not responding', productService.nameShort), localize('secondInstanceNoResponseDetail', 'Please close all other instances and try again.'), productService);
                }, 10000);
            }
            const otherInstanceLaunchMainService = ProxyChannel.toService(client.getChannel('launch'), { disableMarshalling: true });
            const otherInstanceDiagnosticsMainService = ProxyChannel.toService(client.getChannel('diagnostics'), { disableMarshalling: true });
            // Process Info
            if (environmentMainService.args.status) {
                return instantiationService.invokeFunction(async () => {
                    const diagnosticsService = new DiagnosticsService(NullTelemetryService, productService);
                    const mainDiagnostics = await otherInstanceDiagnosticsMainService.getMainDiagnostics();
                    const remoteDiagnostics = await otherInstanceDiagnosticsMainService.getRemoteDiagnostics({
                        includeProcesses: true,
                        includeWorkspaceMetadata: true,
                    });
                    const diagnostics = await diagnosticsService.getDiagnostics(mainDiagnostics, remoteDiagnostics);
                    console.log(diagnostics);
                    throw new ExpectedError();
                });
            }
            // Windows: allow to set foreground
            if (isWindows) {
                await this.windowsAllowSetForegroundWindow(otherInstanceLaunchMainService, logService);
            }
            // Send environment over...
            logService.trace('Sending env to running instance...');
            await otherInstanceLaunchMainService.start(environmentMainService.args, process.env);
            // Cleanup
            client.dispose();
            // Now that we started, make sure the warning dialog is prevented
            if (startupWarningDialogHandle) {
                clearTimeout(startupWarningDialogHandle);
            }
            throw new ExpectedError('Sent env to running instance. Terminating...');
        }
        // Print --status usage info
        if (environmentMainService.args.status) {
            console.log(localize('statusWarning', 'Warning: The --status argument can only be used if {0} is already running. Please run it again after {0} has started.', productService.nameShort));
            throw new ExpectedError('Terminating...');
        }
        // Set the VSCODE_PID variable here when we are sure we are the first
        // instance to startup. Otherwise we would wrongly overwrite the PID
        process.env['VSCODE_PID'] = String(process.pid);
        return mainProcessNodeIpcServer;
    }
    handleStartupDataDirError(environmentMainService, productService, error) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            const directories = coalesce([
                environmentMainService.userDataPath,
                environmentMainService.extensionsPath,
                XDG_RUNTIME_DIR,
            ]).map((folder) => getPathLabel(URI.file(folder), { os: OS, tildify: environmentMainService }));
            this.showStartupWarningDialog(localize('startupDataDirError', 'Unable to write program user data.'), localize('startupUserDataAndExtensionsDirErrorDetail', '{0}\n\nPlease make sure the following directories are writeable:\n\n{1}', toErrorMessage(error), directories.join('\n')), productService);
        }
    }
    showStartupWarningDialog(message, detail, productService) {
        // use sync variant here because we likely exit after this method
        // due to startup issues and otherwise the dialog seems to disappear
        // https://github.com/microsoft/vscode/issues/104493
        dialog.showMessageBoxSync(massageMessageBoxOptions({
            type: 'warning',
            buttons: [localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, '&&Close')],
            message,
            detail,
        }, productService).options);
    }
    async windowsAllowSetForegroundWindow(launchMainService, logService) {
        if (isWindows) {
            const processId = await launchMainService.getMainProcessId();
            logService.trace('Sending some foreground love to the running instance:', processId);
            try {
                ;
                (await import('windows-foreground-love')).allowSetForegroundWindow(processId);
            }
            catch (error) {
                logService.error(error);
            }
        }
    }
    quit(accessor, reason) {
        const logService = accessor.get(ILogService);
        const lifecycleMainService = accessor.get(ILifecycleMainService);
        let exitCode = 0;
        if (reason) {
            if (reason.isExpected) {
                if (reason.message) {
                    logService.trace(reason.message);
                }
            }
            else {
                exitCode = 1; // signal error to the outside
                if (reason.stack) {
                    logService.error(reason.stack);
                }
                else {
                    logService.error(`Startup error: ${reason.toString()}`);
                }
            }
        }
        lifecycleMainService.kill(exitCode);
    }
    //#region Command line arguments utilities
    resolveArgs() {
        // Parse arguments
        const args = this.validatePaths(parseMainProcessArgv(process.argv));
        // If we are started with --wait create a random temporary file
        // and pass it over to the starting instance. We can use this file
        // to wait for it to be deleted to monitor that the edited file
        // is closed and then exit the waiting process.
        //
        // Note: we are not doing this if the wait marker has been already
        // added as argument. This can happen if VS Code was started from CLI.
        if (args.wait && !args.waitMarkerFilePath) {
            const waitMarkerFilePath = createWaitMarkerFileSync(args.verbose);
            if (waitMarkerFilePath) {
                addArg(process.argv, '--waitMarkerFilePath', waitMarkerFilePath);
                args.waitMarkerFilePath = waitMarkerFilePath;
            }
        }
        return args;
    }
    validatePaths(args) {
        // Track URLs if they're going to be used
        if (args['open-url']) {
            args._urls = args._;
            args._ = [];
        }
        // Normalize paths and watch out for goto line mode
        if (!args['remote']) {
            const paths = this.doValidatePaths(args._, args.goto);
            args._ = paths;
        }
        return args;
    }
    doValidatePaths(args, gotoLineMode) {
        const currentWorkingDir = cwd();
        const result = args.map((arg) => {
            let pathCandidate = String(arg);
            let parsedPath = undefined;
            if (gotoLineMode) {
                parsedPath = parseLineAndColumnAware(pathCandidate);
                pathCandidate = parsedPath.path;
            }
            if (pathCandidate) {
                pathCandidate = this.preparePath(currentWorkingDir, pathCandidate);
            }
            const sanitizedFilePath = sanitizeFilePath(pathCandidate, currentWorkingDir);
            const filePathBasename = basename(sanitizedFilePath);
            if (filePathBasename /* can be empty if code is opened on root */ &&
                !isValidBasename(filePathBasename)) {
                return null; // do not allow invalid file names
            }
            if (gotoLineMode && parsedPath) {
                parsedPath.path = sanitizedFilePath;
                return this.toPath(parsedPath);
            }
            return sanitizedFilePath;
        });
        const caseInsensitive = isWindows || isMacintosh;
        const distinctPaths = distinct(result, (path) => path && caseInsensitive ? path.toLowerCase() : path || '');
        return coalesce(distinctPaths);
    }
    preparePath(cwd, path) {
        // Trim trailing quotes
        if (isWindows) {
            path = rtrim(path, '"'); // https://github.com/microsoft/vscode/issues/1498
        }
        // Trim whitespaces
        path = trim(trim(path, ' '), '\t');
        if (isWindows) {
            // Resolve the path against cwd if it is relative
            path = resolve(cwd, path);
            // Trim trailing '.' chars on Windows to prevent invalid file names
            path = rtrim(path, '.');
        }
        return path;
    }
    toPath(pathWithLineAndCol) {
        const segments = [pathWithLineAndCol.path];
        if (typeof pathWithLineAndCol.line === 'number') {
            segments.push(String(pathWithLineAndCol.line));
        }
        if (typeof pathWithLineAndCol.column === 'number') {
            segments.push(String(pathWithLineAndCol.column));
        }
        return segments.join(':');
    }
}
// Main Startup
const code = new CodeMain();
code.main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tbWFpbi9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDdEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDekMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEYsT0FBTyxFQUVOLGVBQWUsRUFDZix1QkFBdUIsRUFDdkIsZ0JBQWdCLEdBQ2hCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUF1QixXQUFXLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9GLE9B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