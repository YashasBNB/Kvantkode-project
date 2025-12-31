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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9ub2RlL2V4dGVuc2lvbkxpZmVjeWNsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWdCLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFcEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRW5GLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUdsRCxZQUMyQix1QkFBeUQsRUFDdEUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFIMkIsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSjlDLHFCQUFnQixHQUFrQixJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLGtDQUFrQztJQU8zRixDQUFDO0lBRUQsS0FBSyxDQUFDLGFB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