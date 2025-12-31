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
import { ThrottledDelayer } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { basename, dirname, joinPath } from '../../../base/common/resources.js';
import { ByteSize, IFileService, whenProviderRegistered, } from '../../files/common/files.js';
import { BufferLogger } from './bufferLog.js';
import { AbstractLoggerService, AbstractMessageLogger, LogLevel, } from './log.js';
const MAX_FILE_SIZE = 5 * ByteSize.MB;
let FileLogger = class FileLogger extends AbstractMessageLogger {
    constructor(resource, level, donotUseFormatters, fileService) {
        super();
        this.resource = resource;
        this.donotUseFormatters = donotUseFormatters;
        this.fileService = fileService;
        this.backupIndex = 1;
        this.buffer = '';
        this.setLevel(level);
        this.flushDelayer = new ThrottledDelayer(100 /* buffer saves over a short time */);
        this.initializePromise = this.initialize();
    }
    async flush() {
        if (!this.buffer) {
            return;
        }
        await this.initializePromise;
        let content = await this.loadContent();
        if (content.length > MAX_FILE_SIZE) {
            await this.fileService.writeFile(this.getBackupResource(), VSBuffer.fromString(content));
            content = '';
        }
        if (this.buffer) {
            content += this.buffer;
            this.buffer = '';
            await this.fileService.writeFile(this.resource, VSBuffer.fromString(content));
        }
    }
    async initialize() {
        try {
            await this.fileService.createFile(this.resource);
        }
        catch (error) {
            if (error.fileOperationResult !== 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
                throw error;
            }
        }
    }
    log(level, message) {
        if (this.donotUseFormatters) {
            this.buffer += message;
        }
        else {
            this.buffer += `${this.getCurrentTimestamp()} [${this.stringifyLogLevel(level)}] ${message}\n`;
        }
        this.flushDelayer.trigger(() => this.flush());
    }
    getCurrentTimestamp() {
        const toTwoDigits = (v) => (v < 10 ? `0${v}` : v);
        const toThreeDigits = (v) => (v < 10 ? `00${v}` : v < 100 ? `0${v}` : v);
        const currentTime = new Date();
        return `${currentTime.getFullYear()}-${toTwoDigits(currentTime.getMonth() + 1)}-${toTwoDigits(currentTime.getDate())} ${toTwoDigits(currentTime.getHours())}:${toTwoDigits(currentTime.getMinutes())}:${toTwoDigits(currentTime.getSeconds())}.${toThreeDigits(currentTime.getMilliseconds())}`;
    }
    getBackupResource() {
        this.backupIndex = this.backupIndex > 5 ? 1 : this.backupIndex;
        return joinPath(dirname(this.resource), `${basename(this.resource)}_${this.backupIndex++}`);
    }
    async loadContent() {
        try {
            const content = await this.fileService.readFile(this.resource);
            return content.value.toString();
        }
        catch (e) {
            return '';
        }
    }
    stringifyLogLevel(level) {
        switch (level) {
            case LogLevel.Debug:
                return 'debug';
            case LogLevel.Error:
                return 'error';
            case LogLevel.Info:
                return 'info';
            case LogLevel.Trace:
                return 'trace';
            case LogLevel.Warning:
                return 'warning';
        }
        return '';
    }
};
FileLogger = __decorate([
    __param(3, IFileService)
], FileLogger);
export class FileLoggerService extends AbstractLoggerService {
    constructor(logLevel, logsHome, fileService) {
        super(logLevel, logsHome);
        this.fileService = fileService;
    }
    doCreateLogger(resource, logLevel, options) {
        const logger = new BufferLogger(logLevel);
        whenProviderRegistered(resource, this.fileService).then(() => (logger.logger = new FileLogger(resource, logger.getLevel(), !!options?.donotUseFormatters, this.fileService)));
        return logger;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUxvZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9jb21tb24vZmlsZUxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFL0UsT0FBTyxFQUNOLFFBQVEsRUFHUixZQUFZLEVBQ1osc0JBQXNCLEdBQ3RCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzdDLE9BQU8sRUFDTixxQkFBcUIsRUFDckIscUJBQXFCLEVBSXJCLFFBQVEsR0FDUixNQUFNLFVBQVUsQ0FBQTtBQUVqQixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQTtBQUVyQyxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEscUJBQXFCO0lBTTdDLFlBQ2tCLFFBQWEsRUFDOUIsS0FBZSxFQUNFLGtCQUEyQixFQUM5QixXQUEwQztRQUV4RCxLQUFLLEVBQUUsQ0FBQTtRQUxVLGFBQVEsR0FBUixRQUFRLENBQUs7UUFFYix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVM7UUFDYixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVBqRCxnQkFBVyxHQUFXLENBQUMsQ0FBQTtRQUN2QixXQUFNLEdBQVcsRUFBRSxDQUFBO1FBUzFCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLGdCQUFnQixDQUFP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