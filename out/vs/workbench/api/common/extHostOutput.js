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
import { MainContext, } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { AbstractMessageLogger, ILoggerService, ILogService, log, parseLogLevel, } from '../../../platform/log/common/log.js';
import { OutputChannelUpdateMode } from '../../services/output/common/output.js';
import { IExtHostConsumerFileSystem } from './extHostFileSystemConsumer.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { toLocalISOString } from '../../../base/common/date.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { isString } from '../../../base/common/types.js';
import { FileSystemProviderErrorCode, toFileSystemProviderErrorCode, } from '../../../platform/files/common/files.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
class ExtHostOutputChannel extends AbstractMessageLogger {
    constructor(id, name, logger, proxy, extension) {
        super();
        this.id = id;
        this.name = name;
        this.logger = logger;
        this.proxy = proxy;
        this.extension = extension;
        this.offset = 0;
        this.visible = false;
        this.setLevel(logger.getLevel());
        this._register(logger.onDidChangeLogLevel((level) => this.setLevel(level)));
        this._register(toDisposable(() => this.proxy.$dispose(this.id)));
    }
    get logLevel() {
        return this.getLevel();
    }
    appendLine(value) {
        this.append(value + '\n');
    }
    append(value) {
        this.info(value);
    }
    clear() {
        const till = this.offset;
        this.logger.flush();
        this.proxy.$update(this.id, OutputChannelUpdateMode.Clear, till);
    }
    replace(value) {
        const till = this.offset;
        this.info(value);
        this.proxy.$update(this.id, OutputChannelUpdateMode.Replace, till);
        if (this.visible) {
            this.logger.flush();
        }
    }
    show(columnOrPreserveFocus, preserveFocus) {
        this.logger.flush();
        this.proxy.$reveal(this.id, !!(typeof columnOrPreserveFocus === 'boolean' ? columnOrPreserveFocus : preserveFocus));
    }
    hide() {
        this.proxy.$close(this.id);
    }
    log(level, message) {
        this.offset += VSBuffer.fromString(message).byteLength;
        log(this.logger, level, message);
        if (this.visible) {
            this.logger.flush();
            this.proxy.$update(this.id, OutputChannelUpdateMode.Append);
        }
    }
}
class ExtHostLogOutputChannel extends ExtHostOutputChannel {
    appendLine(value) {
        this.append(value);
    }
}
let ExtHostOutputService = class ExtHostOutputService {
    constructor(extHostRpc, initData, extHostFileSystem, extHostFileSystemInfo, loggerService, logService) {
        this.initData = initData;
        this.extHostFileSystem = extHostFileSystem;
        this.extHostFileSystemInfo = extHostFileSystemInfo;
        this.loggerService = loggerService;
        this.logService = logService;
        this.extensionLogDirectoryPromise = new Map();
        this.namePool = 1;
        this.channels = new Map();
        this.visibleChannelId = null;
        this.proxy = extHostRpc.getProxy(MainContext.MainThreadOutputService);
        this.outputsLocation = this.extHostFileSystemInfo.extUri.joinPath(initData.logsLocation, `output_logging_${toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '')}`);
    }
    $setVisibleChannel(visibleChannelId) {
        this.visibleChannelId = visibleChannelId;
        for (const [id, channel] of this.channels) {
            channel.visible = id === this.visibleChannelId;
        }
    }
    createOutputChannel(name, options, extension) {
        name = name.trim();
        if (!name) {
            throw new Error('illegal argument `name`. must not be falsy');
        }
        const log = typeof options === 'object' && options.log;
        const languageId = isString(options) ? options : undefined;
        if (isString(languageId) && !languageId.trim()) {
            throw new Error('illegal argument `languageId`. must not be empty');
        }
        let logLevel;
        const logLevelValue = this.initData.environment.extensionLogLevel?.find(([identifier]) => ExtensionIdentifier.equals(extension.identifier, identifier))?.[1];
        if (logLevelValue) {
            logLevel = parseLogLevel(logLevelValue);
        }
        const channelDisposables = new DisposableStore();
        const extHostOutputChannel = log
            ? this.doCreateLogOutputChannel(name, logLevel, extension, channelDisposables)
            : this.doCreateOutputChannel(name, languageId, extension, channelDisposables);
        extHostOutputChannel.then((channel) => {
            this.channels.set(channel.id, channel);
            channel.visible = channel.id === this.visibleChannelId;
            channelDisposables.add(toDisposable(() => this.channels.delete(channel.id)));
        });
        return log
            ? this.createExtHostLogOutputChannel(name, logLevel ?? this.logService.getLevel(), extHostOutputChannel, channelDisposables)
            : this.createExtHostOutputChannel(name, extHostOutputChannel, channelDisposables);
    }
    async doCreateOutputChannel(name, languageId, extension, channelDisposables) {
        if (!this.outputDirectoryPromise) {
            this.outputDirectoryPromise = this.extHostFileSystem.value
                .createDirectory(this.outputsLocation)
                .then(() => this.outputsLocation);
        }
        const outputDir = await this.outputDirectoryPromise;
        const file = this.extHostFileSystemInfo.extUri.joinPath(outputDir, `${this.namePool++}-${name.replace(/[\\/:\*\?"<>\|]/g, '')}.log`);
        const logger = channelDisposables.add(this.loggerService.createLogger(file, {
            logLevel: 'always',
            donotRotate: true,
            donotUseFormatters: true,
            hidden: true,
        }));
        const id = await this.proxy.$register(name, file, languageId, extension.identifier.value);
        channelDisposables.add(toDisposable(() => this.loggerService.deregisterLogger(file)));
        return new ExtHostOutputChannel(id, name, logger, this.proxy, extension);
    }
    async doCreateLogOutputChannel(name, logLevel, extension, channelDisposables) {
        const extensionLogDir = await this.createExtensionLogDirectory(extension);
        const fileName = name.replace(/[\\/:\*\?"<>\|]/g, '');
        const file = this.extHostFileSystemInfo.extUri.joinPath(extensionLogDir, `${fileName}.log`);
        const id = `${extension.identifier.value}.${fileName}`;
        const logger = channelDisposables.add(this.loggerService.createLogger(file, {
            id,
            name,
            logLevel,
            extensionId: extension.identifier.value,
        }));
        channelDisposables.add(toDisposable(() => this.loggerService.deregisterLogger(file)));
        return new ExtHostLogOutputChannel(id, name, logger, this.proxy, extension);
    }
    createExtensionLogDirectory(extension) {
        let extensionLogDirectoryPromise = this.extensionLogDirectoryPromise.get(extension.identifier.value);
        if (!extensionLogDirectoryPromise) {
            const extensionLogDirectory = this.extHostFileSystemInfo.extUri.joinPath(this.initData.logsLocation, extension.identifier.value);
            this.extensionLogDirectoryPromise.set(extension.identifier.value, (extensionLogDirectoryPromise = (async () => {
                try {
                    await this.extHostFileSystem.value.createDirectory(extensionLogDirectory);
                }
                catch (err) {
                    if (toFileSystemProviderErrorCode(err) !== FileSystemProviderErrorCode.FileExists) {
                        throw err;
                    }
                }
                return extensionLogDirectory;
            })()));
        }
        return extensionLogDirectoryPromise;
    }
    createExtHostOutputChannel(name, channelPromise, channelDisposables) {
        const validate = () => {
            if (channelDisposables.isDisposed) {
                throw new Error('Channel has been closed');
            }
        };
        channelPromise.then((channel) => channelDisposables.add(channel));
        return {
            get name() {
                return name;
            },
            append(value) {
                validate();
                channelPromise.then((channel) => channel.append(value));
            },
            appendLine(value) {
                validate();
                channelPromise.then((channel) => channel.appendLine(value));
            },
            clear() {
                validate();
                channelPromise.then((channel) => channel.clear());
            },
            replace(value) {
                validate();
                channelPromise.then((channel) => channel.replace(value));
            },
            show(columnOrPreserveFocus, preserveFocus) {
                validate();
                channelPromise.then((channel) => channel.show(columnOrPreserveFocus, preserveFocus));
            },
            hide() {
                validate();
                channelPromise.then((channel) => channel.hide());
            },
            dispose() {
                channelDisposables.dispose();
            },
        };
    }
    createExtHostLogOutputChannel(name, logLevel, channelPromise, channelDisposables) {
        const validate = () => {
            if (channelDisposables.isDisposed) {
                throw new Error('Channel has been closed');
            }
        };
        const onDidChangeLogLevel = channelDisposables.add(new Emitter());
        function setLogLevel(newLogLevel) {
            logLevel = newLogLevel;
            onDidChangeLogLevel.fire(newLogLevel);
        }
        channelPromise.then((channel) => {
            if (channel.logLevel !== logLevel) {
                setLogLevel(channel.logLevel);
            }
            channelDisposables.add(channel.onDidChangeLogLevel((e) => setLogLevel(e)));
        });
        return {
            ...this.createExtHostOutputChannel(name, channelPromise, channelDisposables),
            get logLevel() {
                return logLevel;
            },
            onDidChangeLogLevel: onDidChangeLogLevel.event,
            trace(value, ...args) {
                validate();
                channelPromise.then((channel) => channel.trace(value, ...args));
            },
            debug(value, ...args) {
                validate();
                channelPromise.then((channel) => channel.debug(value, ...args));
            },
            info(value, ...args) {
                validate();
                channelPromise.then((channel) => channel.info(value, ...args));
            },
            warn(value, ...args) {
                validate();
                channelPromise.then((channel) => channel.warn(value, ...args));
            },
            error(value, ...args) {
                validate();
                channelPromise.then((channel) => channel.error(value, ...args));
            },
        };
    }
};
ExtHostOutputService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostConsumerFileSystem),
    __param(3, IExtHostFileSystemInfo),
    __param(4, ILoggerService),
    __param(5, ILogService)
], ExtHostOutputService);
export { ExtHostOutputService };
export const IExtHostOutputService = createDecorator('IExtHostOutputService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RPdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFdBQVcsR0FHWCxNQUFNLHVCQUF1QixDQUFBO0FBRzlCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUNOLHFCQUFxQixFQUVyQixjQUFjLEVBQ2QsV0FBVyxFQUNYLEdBQUcsRUFFSCxhQUFhLEdBQ2IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsNkJBQTZCLEdBQzdCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVB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