/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ByteSize } from '../../files/common/files.js';
import { AbstractMessageLogger, LogLevel } from '../common/log.js';
var SpdLogLevel;
(function (SpdLogLevel) {
    SpdLogLevel[SpdLogLevel["Trace"] = 0] = "Trace";
    SpdLogLevel[SpdLogLevel["Debug"] = 1] = "Debug";
    SpdLogLevel[SpdLogLevel["Info"] = 2] = "Info";
    SpdLogLevel[SpdLogLevel["Warning"] = 3] = "Warning";
    SpdLogLevel[SpdLogLevel["Error"] = 4] = "Error";
    SpdLogLevel[SpdLogLevel["Critical"] = 5] = "Critical";
    SpdLogLevel[SpdLogLevel["Off"] = 6] = "Off";
})(SpdLogLevel || (SpdLogLevel = {}));
async function createSpdLogLogger(name, logfilePath, filesize, filecount, donotUseFormatters) {
    // Do not crash if spdlog cannot be loaded
    try {
        const _spdlog = await import('@vscode/spdlog');
        _spdlog.setFlushOn(SpdLogLevel.Trace);
        const logger = await _spdlog.createAsyncRotatingLogger(name, logfilePath, filesize, filecount);
        if (donotUseFormatters) {
            logger.clearFormatters();
        }
        else {
            logger.setPattern('%Y-%m-%d %H:%M:%S.%e [%l] %v');
        }
        return logger;
    }
    catch (e) {
        console.error(e);
    }
    return null;
}
function log(logger, level, message) {
    switch (level) {
        case LogLevel.Trace:
            logger.trace(message);
            break;
        case LogLevel.Debug:
            logger.debug(message);
            break;
        case LogLevel.Info:
            logger.info(message);
            break;
        case LogLevel.Warning:
            logger.warn(message);
            break;
        case LogLevel.Error:
            logger.error(message);
            break;
        case LogLevel.Off:
            /* do nothing */ break;
        default:
            throw new Error(`Invalid log level ${level}`);
    }
}
function setLogLevel(logger, level) {
    switch (level) {
        case LogLevel.Trace:
            logger.setLevel(SpdLogLevel.Trace);
            break;
        case LogLevel.Debug:
            logger.setLevel(SpdLogLevel.Debug);
            break;
        case LogLevel.Info:
            logger.setLevel(SpdLogLevel.Info);
            break;
        case LogLevel.Warning:
            logger.setLevel(SpdLogLevel.Warning);
            break;
        case LogLevel.Error:
            logger.setLevel(SpdLogLevel.Error);
            break;
        case LogLevel.Off:
            logger.setLevel(SpdLogLevel.Off);
            break;
        default:
            throw new Error(`Invalid log level ${level}`);
    }
}
export class SpdLogLogger extends AbstractMessageLogger {
    constructor(name, filepath, rotating, donotUseFormatters, level) {
        super();
        this.buffer = [];
        this.setLevel(level);
        this._loggerCreationPromise = this._createSpdLogLogger(name, filepath, rotating, donotUseFormatters);
        this._register(this.onDidChangeLogLevel((level) => {
            if (this._logger) {
                setLogLevel(this._logger, level);
            }
        }));
    }
    async _createSpdLogLogger(name, filepath, rotating, donotUseFormatters) {
        const filecount = rotating ? 6 : 1;
        const filesize = (30 / filecount) * ByteSize.MB;
        const logger = await createSpdLogLogger(name, filepath, filesize, filecount, donotUseFormatters);
        if (logger) {
            this._logger = logger;
            setLogLevel(this._logger, this.getLevel());
            for (const { level, message } of this.buffer) {
                log(this._logger, level, message);
            }
            this.buffer = [];
        }
    }
    log(level, message) {
        if (this._logger) {
            log(this._logger, level, message);
        }
        else if (this.getLevel() <= level) {
            this.buffer.push({ level, message });
        }
    }
    flush() {
        if (this._logger) {
            this.flushLogger();
        }
        else {
            this._loggerCreationPromise.then(() => this.flushLogger());
        }
    }
    dispose() {
        if (this._logger) {
            this.disposeLogger();
        }
        else {
            this._loggerCreationPromise.then(() => this.disposeLogger());
        }
        super.dispose();
    }
    flushLogger() {
        if (this._logger) {
            this._logger.flush();
        }
    }
    disposeLogger() {
        if (this._logger) {
            this._logger.drop();
            this._logger = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BkbG9nTG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbG9nL25vZGUvc3BkbG9nTG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQVcsUUFBUSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFM0UsSUFBSyxXQVFKO0FBUkQsV0FBSyxXQUFXO0lBQ2YsK0NBQUssQ0FBQTtJQUNMLCtDQUFLLENBQUE7SUFDTCw2Q0FBSSxDQUFBO0lBQ0osbURBQU8sQ0FBQTtJQUNQLCtDQUFLLENBQUE7SUFDTCxxREFBUSxDQUFBO0lBQ1IsMkNBQUcsQ0FBQTtBQUNKLENBQUMsRUFSSSxXQUFXLEtBQVgsV0FBVyxRQVFmO0FBRUQsS0FBSyxVQUFVLGtCQUFrQixDQUNoQyxJQUFZLEVBQ1osV0FBbUIsRUFDbkIsUUFBZ0IsRUFDaEIsU0FBaUIsRUFDakIsa0JBQTJCO0lBRTNCLDBDQUEwQztJQUMxQyxJQUFJLENBQUM7UUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzlDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzlGLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixNQUFNLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDekIsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNE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