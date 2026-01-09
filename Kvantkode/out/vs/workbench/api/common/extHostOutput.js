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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE91dHB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sV0FBVyxHQUdYLE1BQU0sdUJBQXVCLENBQUE7QUFHOUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04scUJBQXFCLEVBRXJCLGNBQWMsRUFDZCxXQUFXLEVBQ1gsR0FBRyxFQUVILGFBQWEsR0FDYixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUNOLDJCQUEyQixFQUMzQiw2QkFBNkIsR0FDN0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7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