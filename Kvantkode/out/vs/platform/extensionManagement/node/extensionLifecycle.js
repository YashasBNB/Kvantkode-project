/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { fork } from 'child_process';
import { Limiter } from '../../../base/common/async.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { join } from '../../../base/common/path.js';
import { Promises } from '../../../base/node/pfs.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
let ExtensionsLifecycle = class ExtensionsLifecycle extends Disposable {
    constructor(userDataProfilesService, logService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.logService = logService;
        this.processesLimiter = new Limiter(5); // Run max 5 processes in parallel
    }
    async postUninstall(extension) {
        const script = this.parseScript(extension, 'uninstall');
        if (script) {
            this.logService.info(extension.identifier.id, extension.manifest.version, `Running post uninstall script`);
            await this.processesLimiter.queue(async () => {
                try {
                    await this.runLifecycleHook(script.script, 'uninstall', script.args, true, extension);
                    this.logService.info(`Finished running post uninstall script`, extension.identifier.id, extension.manifest.version);
                }
                catch (error) {
                    this.logService.error('Failed to run post uninstall script', extension.identifier.id, extension.manifest.version);
                    this.logService.error(error);
                }
            });
        }
        try {
            await Promises.rm(this.getExtensionStoragePath(extension));
        }
        catch (error) {
            this.logService.error('Error while removing extension storage path', extension.identifier.id);
            this.logService.error(error);
        }
    }
    parseScript(extension, type) {
        const scriptKey = `vscode:${type}`;
        if (extension.location.scheme === Schemas.file &&
            extension.manifest &&
            extension.manifest['scripts'] &&
            typeof extension.manifest['scripts'][scriptKey] === 'string') {
            const script = extension.manifest['scripts'][scriptKey].split(' ');
            if (script.length < 2 || script[0] !== 'node' || !script[1]) {
                this.logService.warn(extension.identifier.id, extension.manifest.version, `${scriptKey} should be a node script`);
                return null;
            }
            return { script: join(extension.location.fsPath, script[1]), args: script.slice(2) || [] };
        }
        return null;
    }
    runLifecycleHook(lifecycleHook, lifecycleType, args, timeout, extension) {
        return new Promise((c, e) => {
            const extensionLifecycleProcess = this.start(lifecycleHook, lifecycleType, args, extension);
            let timeoutHandler;
            const onexit = (error) => {
                if (timeoutHandler) {
                    clearTimeout(timeoutHandler);
                    timeoutHandler = null;
                }
                if (error) {
                    e(error);
                }
                else {
                    c(undefined);
                }
            };
            // on error
            extensionLifecycleProcess.on('error', (err) => {
                onexit(toErrorMessage(err) || 'Unknown');
            });
            // on exit
            extensionLifecycleProcess.on('exit', (code, signal) => {
                onexit(code ? `post-${lifecycleType} process exited with code ${code}` : undefined);
            });
            if (timeout) {
                // timeout: kill process after waiting for 5s
                timeoutHandler = setTimeout(() => {
                    timeoutHandler = null;
                    extensionLifecycleProcess.kill();
                    e('timed out');
                }, 5000);
            }
        });
    }
    start(uninstallHook, lifecycleType, args, extension) {
        const opts = {
            silent: true,
            execArgv: undefined,
        };
        const extensionUninstallProcess = fork(uninstallHook, [`--type=extension-post-${lifecycleType}`, ...args], opts);
        extensionUninstallProcess.stdout.setEncoding('utf8');
        extensionUninstallProcess.stderr.setEncoding('utf8');
        const onStdout = Event.fromNodeEventEmitter(extensionUninstallProcess.stdout, 'data');
        const onStderr = Event.fromNodeEventEmitter(extensionUninstallProcess.stderr, 'data');
        // Log output
        this._register(onStdout((data) => this.logService.info(extension.identifier.id, extension.manifest.version, `post-${lifecycleType}`, data)));
        this._register(onStderr((data) => this.logService.error(extension.identifier.id, extension.manifest.version, `post-${lifecycleType}`, data)));
        const onOutput = Event.any(Event.map(onStdout, (o) => ({ data: `%c${o}`, format: [''] }), this._store), Event.map(onStderr, (o) => ({ data: `%c${o}`, format: ['color: red'] }), this._store));
        // Debounce all output, so we can render it in the Chrome console as a group
        const onDebouncedOutput = Event.debounce(onOutput, (r, o) => {
            return r
                ? { data: r.data + o.data, format: [...r.format, ...o.format] }
                : { data: o.data, format: o.format };
        }, 100, undefined, undefined, undefined, this._store);
        // Print out output
        onDebouncedOutput((data) => {
            console.group(extension.identifier.id);
            console.log(data.data, ...data.format);
            console.groupEnd();
        });
        return extensionUninstallProcess;
    }
    getExtensionStoragePath(extension) {
        return join(this.userDataProfilesService.defaultProfile.globalStorageHome.fsPath, extension.identifier.id.toLowerCase());
    }
};
ExtensionsLifecycle = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, ILogService)
], ExtensionsLifecycle);
export { ExtensionsLifecycle };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uTGlmZWN5Y2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBZ0IsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbkYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBR2xELFlBQzJCLHVCQUF5RCxFQUN0RSxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQUgyQiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ3JELGVBQVUsR0FBVixVQUFVLENBQWE7UUFKOUMscUJBQWdCLEdBQWtCLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsa0NBQWtDO0lBTzNG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