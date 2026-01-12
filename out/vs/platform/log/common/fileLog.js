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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUxvZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbG9nL2NvbW1vbi9maWxlTG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUvRSxPQUFPLEVBQ04sUUFBUSxFQUdSLFlBQVksRUFDWixzQkFBc0IsR0FDdEIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDN0MsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixxQkFBcUIsRUFJckIsUUFBUSxHQUNSLE1BQU0sVUFBVSxDQUFBO0FBRWpCLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFBO0FBRXJDLElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVcsU0FBUSxxQkFBcUI7SUFNN0MsWUFDa0IsUUFBYSxFQUM5QixLQUFlLEVBQ0Usa0JBQTJCLEVBQzlCLFdBQTBDO1FBRXhELEtBQUssRUFBRSxDQUFBO1FBTFUsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUViLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBUztRQUNiLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBUGpELGdCQUFXLEdBQVcsQ0FBQyxDQUFBO1FBQ3ZCLFdBQU0sR0FBVyxFQUFFLENBQUE7UUFTMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQU8sR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUE7UUFDeEYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUMzQyxDQUFDO0lBRVEsS0FBSyxDQUFDLEtBQUs7UUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQzVCLElBQUksT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3RDLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxhQUFhLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUN4RixPQUFPLEdBQUcsRUFBRSxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO1lBQ2hCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDOUUsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN2QixJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUNzQixLQUFNLENBQUMsbUJBQW1CLG9EQUE0QyxFQUMxRixDQUFDO2dCQUNGLE1BQU0sS0FBSyxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRVMsR0FBRyxDQUFDLEtBQWUsRUFBRSxPQUFlO1FBQzdDLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUE7UUFDdkIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEtBQUssSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLE9BQU8sSUFBSSxDQUFBO1FBQy9GLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7UUFDOUIsT0FBTyxHQUFHLFdBQVcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksV0FBVyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQTtJQUNoUyxDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUM5RCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzVGLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVztRQUN4QixJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM5RCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQUMsS0FBZTtRQUN4QyxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxRQUFRLENBQUMsS0FBSztnQkFDbEIsT0FBTyxPQUFPLENBQUE7WUFDZixLQUFLLFFBQVEsQ0FBQyxLQUFLO2dCQUNsQixPQUFPLE9BQU8sQ0FBQTtZQUNmLEtBQUssUUFBUSxDQUFDLElBQUk7Z0JBQ2pCLE9BQU8sTUFBTSxDQUFBO1lBQ2QsS0FBSyxRQUFRLENBQUMsS0FBSztnQkFDbEIsT0FBTyxPQUFPLENBQUE7WUFDZixLQUFLLFFBQVEsQ0FBQyxPQUFPO2dCQUNwQixPQUFPLFNBQVMsQ0FBQTtRQUNsQixDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0NBQ0QsQ0FBQTtBQTVGSyxVQUFVO0lBVWIsV0FBQSxZQUFZLENBQUE7R0FWVCxVQUFVLENBNEZmO0FBRUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLHFCQUFxQjtJQUMzRCxZQUNDLFFBQWtCLEVBQ2xCLFFBQWEsRUFDSSxXQUF5QjtRQUUxQyxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRlIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7SUFHM0MsQ0FBQztJQUVTLGNBQWMsQ0FBQyxRQUFhLEVBQUUsUUFBa0IsRUFBRSxPQUF3QjtRQUNuRixNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6QyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FDdEQsR0FBRyxFQUFFLENBQ0osQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksVUFBVSxDQUM5QixRQUFRLEVBQ1IsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUNqQixDQUFDLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUM3QixJQUFJLENBQUMsV0FBVyxDQUNoQixDQUFDLENBQ0gsQ0FBQTtRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztDQUNEIn0=