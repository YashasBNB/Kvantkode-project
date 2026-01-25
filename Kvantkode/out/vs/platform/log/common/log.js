/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { isWindows } from '../../../base/common/platform.js';
import { joinPath } from '../../../base/common/resources.js';
import { isNumber, isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { RawContextKey } from '../../contextkey/common/contextkey.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ILogService = createDecorator('logService');
export const ILoggerService = createDecorator('loggerService');
function now() {
    return new Date().toISOString();
}
export function isLogLevel(thing) {
    return isNumber(thing);
}
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Off"] = 0] = "Off";
    LogLevel[LogLevel["Trace"] = 1] = "Trace";
    LogLevel[LogLevel["Debug"] = 2] = "Debug";
    LogLevel[LogLevel["Info"] = 3] = "Info";
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    LogLevel[LogLevel["Error"] = 5] = "Error";
})(LogLevel || (LogLevel = {}));
export const DEFAULT_LOG_LEVEL = LogLevel.Info;
export function canLog(loggerLevel, messageLevel) {
    return loggerLevel !== LogLevel.Off && loggerLevel <= messageLevel;
}
export function log(logger, level, message) {
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
function format(args, verbose = false) {
    let result = '';
    for (let i = 0; i < args.length; i++) {
        let a = args[i];
        if (a instanceof Error) {
            a = toErrorMessage(a, verbose);
        }
        if (typeof a === 'object') {
            try {
                a = JSON.stringify(a);
            }
            catch (e) { }
        }
        result += (i > 0 ? ' ' : '') + a;
    }
    return result;
}
export class AbstractLogger extends Disposable {
    constructor() {
        super(...arguments);
        this.level = DEFAULT_LOG_LEVEL;
        this._onDidChangeLogLevel = this._register(new Emitter());
        this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;
    }
    setLevel(level) {
        if (this.level !== level) {
            this.level = level;
            this._onDidChangeLogLevel.fire(this.level);
        }
    }
    getLevel() {
        return this.level;
    }
    checkLogLevel(level) {
        return canLog(this.level, level);
    }
    canLog(level) {
        if (this._store.isDisposed) {
            return false;
        }
        return this.checkLogLevel(level);
    }
}
export class AbstractMessageLogger extends AbstractLogger {
    constructor(logAlways) {
        super();
        this.logAlways = logAlways;
    }
    checkLogLevel(level) {
        return this.logAlways || super.checkLogLevel(level);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            this.log(LogLevel.Trace, format([message, ...args], true));
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            this.log(LogLevel.Debug, format([message, ...args]));
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            this.log(LogLevel.Info, format([message, ...args]));
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            this.log(LogLevel.Warning, format([message, ...args]));
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (message instanceof Error) {
                const array = Array.prototype.slice.call(arguments);
                array[0] = message.stack;
                this.log(LogLevel.Error, format(array));
            }
            else {
                this.log(LogLevel.Error, format([message, ...args]));
            }
        }
    }
    flush() { }
}
export class ConsoleMainLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.setLevel(logLevel);
        this.useColors = !isWindows;
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            if (this.useColors) {
                console.log(`\x1b[90m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[main ${now()}]`, message, ...args);
            }
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            if (this.useColors) {
                console.log(`\x1b[90m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[main ${now()}]`, message, ...args);
            }
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            if (this.useColors) {
                console.log(`\x1b[90m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[main ${now()}]`, message, ...args);
            }
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            if (this.useColors) {
                console.warn(`\x1b[93m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.warn(`[main ${now()}]`, message, ...args);
            }
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (this.useColors) {
                console.error(`\x1b[91m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.error(`[main ${now()}]`, message, ...args);
            }
        }
    }
    flush() {
        // noop
    }
}
export class ConsoleLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL, useColors = true) {
        super();
        this.useColors = useColors;
        this.setLevel(logLevel);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            if (this.useColors) {
                console.log('%cTRACE', 'color: #888', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            if (this.useColors) {
                console.log('%cDEBUG', 'background: #eee; color: #888', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            if (this.useColors) {
                console.log('%c INFO', 'color: #33f', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            if (this.useColors) {
                console.warn('%c WARN', 'color: #993', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (this.useColors) {
                console.error('%c  ERR', 'color: #f33', message, ...args);
            }
            else {
                console.error(message, ...args);
            }
        }
    }
    flush() {
        // noop
    }
}
export class AdapterLogger extends AbstractLogger {
    constructor(adapter, logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.adapter = adapter;
        this.setLevel(logLevel);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            this.adapter.log(LogLevel.Trace, [this.extractMessage(message), ...args]);
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            this.adapter.log(LogLevel.Debug, [this.extractMessage(message), ...args]);
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            this.adapter.log(LogLevel.Info, [this.extractMessage(message), ...args]);
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            this.adapter.log(LogLevel.Warning, [this.extractMessage(message), ...args]);
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            this.adapter.log(LogLevel.Error, [this.extractMessage(message), ...args]);
        }
    }
    extractMessage(msg) {
        if (typeof msg === 'string') {
            return msg;
        }
        return toErrorMessage(msg, this.canLog(LogLevel.Trace));
    }
    flush() {
        // noop
    }
}
export class MultiplexLogger extends AbstractLogger {
    constructor(loggers) {
        super();
        this.loggers = loggers;
        if (loggers.length) {
            this.setLevel(loggers[0].getLevel());
        }
    }
    setLevel(level) {
        for (const logger of this.loggers) {
            logger.setLevel(level);
        }
        super.setLevel(level);
    }
    trace(message, ...args) {
        for (const logger of this.loggers) {
            logger.trace(message, ...args);
        }
    }
    debug(message, ...args) {
        for (const logger of this.loggers) {
            logger.debug(message, ...args);
        }
    }
    info(message, ...args) {
        for (const logger of this.loggers) {
            logger.info(message, ...args);
        }
    }
    warn(message, ...args) {
        for (const logger of this.loggers) {
            logger.warn(message, ...args);
        }
    }
    error(message, ...args) {
        for (const logger of this.loggers) {
            logger.error(message, ...args);
        }
    }
    flush() {
        for (const logger of this.loggers) {
            logger.flush();
        }
    }
    dispose() {
        for (const logger of this.loggers) {
            logger.dispose();
        }
        super.dispose();
    }
}
export class AbstractLoggerService extends Disposable {
    constructor(logLevel, logsHome, loggerResources) {
        super();
        this.logLevel = logLevel;
        this.logsHome = logsHome;
        this._loggers = new ResourceMap();
        this._onDidChangeLoggers = this._register(new Emitter());
        this.onDidChangeLoggers = this._onDidChangeLoggers.event;
        this._onDidChangeLogLevel = this._register(new Emitter());
        this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        if (loggerResources) {
            for (const loggerResource of loggerResources) {
                this._loggers.set(loggerResource.resource, { logger: undefined, info: loggerResource });
            }
        }
    }
    getLoggerEntry(resourceOrId) {
        if (isString(resourceOrId)) {
            return [...this._loggers.values()].find((logger) => logger.info.id === resourceOrId);
        }
        return this._loggers.get(resourceOrId);
    }
    getLogger(resourceOrId) {
        return this.getLoggerEntry(resourceOrId)?.logger;
    }
    createLogger(idOrResource, options) {
        const resource = this.toResource(idOrResource);
        const id = isString(idOrResource)
            ? idOrResource
            : (options?.id ?? hash(resource.toString()).toString(16));
        let logger = this._loggers.get(resource)?.logger;
        const logLevel = options?.logLevel === 'always' ? LogLevel.Trace : options?.logLevel;
        if (!logger) {
            logger = this.doCreateLogger(resource, logLevel ?? this.getLogLevel(resource) ?? this.logLevel, { ...options, id });
        }
        const loggerEntry = {
            logger,
            info: {
                resource,
                id,
                logLevel,
                name: options?.name,
                hidden: options?.hidden,
                group: options?.group,
                extensionId: options?.extensionId,
                when: options?.when,
            },
        };
        this.registerLogger(loggerEntry.info);
        // TODO: @sandy081 Remove this once registerLogger can take ILogger
        this._loggers.set(resource, loggerEntry);
        return logger;
    }
    toResource(idOrResource) {
        return isString(idOrResource) ? joinPath(this.logsHome, `${idOrResource}.log`) : idOrResource;
    }
    setLogLevel(arg1, arg2) {
        if (URI.isUri(arg1)) {
            const resource = arg1;
            const logLevel = arg2;
            const logger = this._loggers.get(resource);
            if (logger && logLevel !== logger.info.logLevel) {
                logger.info.logLevel = logLevel === this.logLevel ? undefined : logLevel;
                logger.logger?.setLevel(logLevel);
                this._loggers.set(logger.info.resource, logger);
                this._onDidChangeLogLevel.fire([resource, logLevel]);
            }
        }
        else {
            this.logLevel = arg1;
            for (const [resource, logger] of this._loggers.entries()) {
                if (this._loggers.get(resource)?.info.logLevel === undefined) {
                    logger.logger?.setLevel(this.logLevel);
                }
            }
            this._onDidChangeLogLevel.fire(this.logLevel);
        }
    }
    setVisibility(resourceOrId, visibility) {
        const logger = this.getLoggerEntry(resourceOrId);
        if (logger && visibility !== !logger.info.hidden) {
            logger.info.hidden = !visibility;
            this._loggers.set(logger.info.resource, logger);
            this._onDidChangeVisibility.fire([logger.info.resource, visibility]);
        }
    }
    getLogLevel(resource) {
        let logLevel;
        if (resource) {
            logLevel = this._loggers.get(resource)?.info.logLevel;
        }
        return logLevel ?? this.logLevel;
    }
    registerLogger(resource) {
        const existing = this._loggers.get(resource.resource);
        if (existing) {
            if (existing.info.hidden !== resource.hidden) {
                this.setVisibility(resource.resource, !resource.hidden);
            }
        }
        else {
            this._loggers.set(resource.resource, { info: resource, logger: undefined });
            this._onDidChangeLoggers.fire({ added: [resource], removed: [] });
        }
    }
    deregisterLogger(idOrResource) {
        const resource = this.toResource(idOrResource);
        const existing = this._loggers.get(resource);
        if (existing) {
            if (existing.logger) {
                existing.logger.dispose();
            }
            this._loggers.delete(resource);
            this._onDidChangeLoggers.fire({ added: [], removed: [existing.info] });
        }
    }
    *getRegisteredLoggers() {
        for (const entry of this._loggers.values()) {
            yield entry.info;
        }
    }
    getRegisteredLogger(resource) {
        return this._loggers.get(resource)?.info;
    }
    dispose() {
        this._loggers.forEach((logger) => logger.logger?.dispose());
        this._loggers.clear();
        super.dispose();
    }
}
export class NullLogger {
    constructor() {
        this.onDidChangeLogLevel = new Emitter().event;
    }
    setLevel(level) { }
    getLevel() {
        return LogLevel.Info;
    }
    trace(message, ...args) { }
    debug(message, ...args) { }
    info(message, ...args) { }
    warn(message, ...args) { }
    error(message, ...args) { }
    critical(message, ...args) { }
    dispose() { }
    flush() { }
}
export class NullLogService extends NullLogger {
}
export function getLogLevel(environmentService) {
    if (environmentService.verbose) {
        return LogLevel.Trace;
    }
    if (typeof environmentService.logLevel === 'string') {
        const logLevel = parseLogLevel(environmentService.logLevel.toLowerCase());
        if (logLevel !== undefined) {
            return logLevel;
        }
    }
    return DEFAULT_LOG_LEVEL;
}
export function LogLevelToString(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace:
            return 'trace';
        case LogLevel.Debug:
            return 'debug';
        case LogLevel.Info:
            return 'info';
        case LogLevel.Warning:
            return 'warn';
        case LogLevel.Error:
            return 'error';
        case LogLevel.Off:
            return 'off';
    }
}
export function LogLevelToLocalizedString(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace:
            return { original: 'Trace', value: nls.localize('trace', 'Trace') };
        case LogLevel.Debug:
            return { original: 'Debug', value: nls.localize('debug', 'Debug') };
        case LogLevel.Info:
            return { original: 'Info', value: nls.localize('info', 'Info') };
        case LogLevel.Warning:
            return { original: 'Warning', value: nls.localize('warn', 'Warning') };
        case LogLevel.Error:
            return { original: 'Error', value: nls.localize('error', 'Error') };
        case LogLevel.Off:
            return { original: 'Off', value: nls.localize('off', 'Off') };
    }
}
export function parseLogLevel(logLevel) {
    switch (logLevel) {
        case 'trace':
            return LogLevel.Trace;
        case 'debug':
            return LogLevel.Debug;
        case 'info':
            return LogLevel.Info;
        case 'warn':
            return LogLevel.Warning;
        case 'error':
            return LogLevel.Error;
        case 'critical':
            return LogLevel.Error;
        case 'off':
            return LogLevel.Off;
    }
    return undefined;
}
// Contexts
export const CONTEXT_LOG_LEVEL = new RawContextKey('logLevel', LogLevelToString(LogLevel.Info));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sb2cvY29tbW9uL2xvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQVcsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzNFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQWMsWUFBWSxDQUFDLENBQUE7QUFDckUsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZUFBZSxDQUFDLENBQUE7QUFFOUUsU0FBUyxHQUFHO0lBQ1gsT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFBO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLEtBQWM7SUFDeEMsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDdkIsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFZLFFBT1g7QUFQRCxXQUFZLFFBQVE7SUFDbkIscUNBQUcsQ0FBQTtJQUNILHlDQUFLLENBQUE7SUFDTCx5Q0FBSyxDQUFBO0lBQ0wsdUNBQUksQ0FBQTtJQUNKLDZDQUFPLENBQUE7SUFDUCx5Q0FBSyxDQUFBO0FBQ04sQ0FBQyxFQVBXLFFBQVEsS0FBUixRQUFRLFFBT25CO0FBRUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQWEsUUFBUSxDQUFDLElBQUksQ0FBQTtBQW1CeEQsTUFBTSxVQUFVLE1BQU0sQ0FBQyxXQUFxQixFQUFFLFlBQXNCO0lBQ25FLE9BQU8sV0FBVyxLQUFLLFFBQVEsQ0FBQyxHQUFHLElBQUksV0FBVyxJQUFJLFlBQVksQ0FBQTtBQUNuRSxDQUFDO0FBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFlLEVBQUUsS0FBZSxFQUFFLE9BQWU7SUFDcEUsUUFBUSxLQUFLLEVBQUUsQ0FBQztRQUNmLEtBQUssUUFBUSxDQUFDLEtBQUs7WUFDbEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNyQixNQUFLO1FBQ04sS0FBSyxRQUFRLENBQUMsS0FBSztZQUNsQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3JCLE1BQUs7UUFDTixLQUFLLFFBQVEsQ0FBQyxJQUFJO1lBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDcEIsTUFBSztRQUNOLEtBQUssUUFBUSxDQUFDLE9BQU87WUFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwQixNQUFLO1FBQ04sS0FBSyxRQUFRLENBQUMsS0FBSztZQUNsQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3JCLE1BQUs7UUFDTixLQUFLLFFBQVEsQ0FBQyxHQUFHO1lBQ2hCLGdCQUFnQixDQUFDLE1BQUs7UUFDdkI7WUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsSUFBUyxFQUFFLFVBQW1CLEtBQUs7SUFDbEQsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBRWYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFZixJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUUsQ0FBQztZQUN4QixDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUM7Z0JBQ0osQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEIsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQSxDQUFDO1FBQ2YsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUE4SkQsTUFBTSxPQUFnQixjQUFlLFNBQVEsVUFBVTtJQUF2RDs7UUFDUyxVQUFLLEdBQWEsaUJBQWlCLENBQUE7UUFDMUIseUJBQW9CLEdBQXNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVksQ0FBQyxDQUFBO1FBQ3pGLHdCQUFtQixHQUFvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO0lBOEJoRixDQUFDO0lBNUJBLFFBQVEsQ0FBQyxLQUFlO1FBQ3ZCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtZQUNsQixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMzQyxDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVTLGFBQWEsQ0FBQyxLQUFlO1FBQ3RDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVTLE1BQU0sQ0FBQyxLQUFlO1FBQy9CLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM1QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakMsQ0FBQztDQVFEO0FBRUQsTUFBTSxPQUFnQixxQkFBc0IsU0FBUSxjQUFjO0lBQ2pFLFlBQTZCLFNBQW1CO1FBQy9DLEtBQUssRUFBRSxDQUFBO1FBRHFCLGNBQVMsR0FBVCxTQUFTLENBQVU7SUFFaEQsQ0FBQztJQUVrQixhQUFhLENBQUMsS0FBZTtRQUMvQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzNELENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNuQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzVDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLE9BQU8sWUFBWSxLQUFLLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBVSxDQUFBO2dCQUM1RCxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtnQkFDeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3JELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssS0FBVSxDQUFDO0NBR2hCO0FBRUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLGNBQWM7SUFHcEQsWUFBWSxXQUFxQixpQkFBaUI7UUFDakQsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxTQUFTLENBQUE7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNoRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDakQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ2hFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNqRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNuQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDaEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ2pELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUF1QixFQUFFLEdBQUcsSUFBVztRQUMzQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDakUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ2xELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNsRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87SUFDUixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sYUFBYyxTQUFRLGNBQWM7SUFDaEQsWUFDQyxXQUFxQixpQkFBaUIsRUFDckIsWUFBcUIsSUFBSTtRQUUxQyxLQUFLLEVBQUUsQ0FBQTtRQUZVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBRzFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ3hELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsK0JBQStCLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDMUUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDeEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ3pELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQzFELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPO0lBQ1IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGFBQWMsU0FBUSxjQUFjO0lBQ2hELFlBQ2tCLE9BQTJELEVBQzVFLFdBQXFCLGlCQUFpQjtRQUV0QyxLQUFLLEVBQUUsQ0FBQTtRQUhVLFlBQU8sR0FBUCxPQUFPLENBQW9EO1FBSTVFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzFFLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN6RSxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUF1QixFQUFFLEdBQUcsSUFBVztRQUMzQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzVFLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzVDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsR0FBbUI7UUFDekMsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM3QixPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7UUFFRCxPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87SUFDUixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxjQUFjO0lBQ2xELFlBQTZCLE9BQStCO1FBQzNELEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBRTNELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFUSxRQUFRLENBQUMsS0FBZTtRQUNoQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7UUFDRCxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNuQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzVDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2YsQ0FBQztJQUNGLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2pCLENBQUM7UUFDRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNEO0FBSUQsTUFBTSxPQUFnQixxQkFBc0IsU0FBUSxVQUFVO0lBZ0I3RCxZQUNXLFFBQWtCLEVBQ1gsUUFBYSxFQUM5QixlQUEyQztRQUUzQyxLQUFLLEVBQUUsQ0FBQTtRQUpHLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDWCxhQUFRLEdBQVIsUUFBUSxDQUFLO1FBZmQsYUFBUSxHQUFHLElBQUksV0FBVyxFQUFlLENBQUE7UUFFbEQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDM0MsSUFBSSxPQUFPLEVBQTRELENBQ3ZFLENBQUE7UUFDUSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBRXBELHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQThCLENBQUMsQ0FBQTtRQUMvRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRXRELDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWtCLENBQUMsQ0FBQTtRQUNyRSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBUWpFLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsS0FBSyxNQUFNLGNBQWMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUE7WUFDeEYsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLFlBQTBCO1FBQ2hELElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssWUFBWSxDQUFDLENBQUE7UUFDckYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELFNBQVMsQ0FBQyxZQUEwQjtRQUNuQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsTUFBTSxDQUFBO0lBQ2pELENBQUM7SUFFRCxZQUFZLENBQUMsWUFBMEIsRUFBRSxPQUF3QjtRQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUM7WUFDaEMsQ0FBQyxDQUFDLFlBQVk7WUFDZCxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLENBQUE7UUFDaEQsTUFBTSxRQUFRLEdBQUcsT0FBTyxFQUFFLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUE7UUFDcEYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQzNCLFFBQVEsRUFDUixRQUFRLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUN2RCxFQUFFLEdBQUcsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUNsQixDQUFBO1FBQ0YsQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFnQjtZQUNoQyxNQUFNO1lBQ04sSUFBSSxFQUFFO2dCQUNMLFFBQVE7Z0JBQ1IsRUFBRTtnQkFDRixRQUFRO2dCQUNSLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSTtnQkFDbkIsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNO2dCQUN2QixLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUs7Z0JBQ3JCLFdBQVcsRUFBRSxPQUFPLEVBQUUsV0FBVztnQkFDakMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJO2FBQ25CO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JDLG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEMsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRVMsVUFBVSxDQUFDLFlBQTBCO1FBQzlDLE9BQU8sUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLFlBQVksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQTtJQUM5RixDQUFDO0lBSUQsV0FBVyxDQUFDLElBQVMsRUFBRSxJQUFVO1FBQ2hDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQTtZQUNyQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUE7WUFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUMsSUFBSSxNQUFNLElBQUksUUFBUSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtnQkFDeEUsTUFBTSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUMvQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDckQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7WUFDcEIsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUM5RCxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3ZDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDOUMsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsWUFBMEIsRUFBRSxVQUFtQjtRQUM1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2hELElBQUksTUFBTSxJQUFJLFVBQVUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxVQUFVLENBQUE7WUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDL0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDckUsQ0FBQztJQUNGLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBYztRQUN6QixJQUFJLFFBQVEsQ0FBQTtRQUNaLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUN0RCxDQUFDO1FBQ0QsT0FBTyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQXlCO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4RCxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtZQUMzRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsQ0FBQztJQUNGLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxZQUEwQjtRQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzVDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUMxQixDQUFDO1lBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDOUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RSxDQUFDO0lBQ0YsQ0FBQztJQUVELENBQUMsb0JBQW9CO1FBQ3BCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELG1CQUFtQixDQUFDLFFBQWE7UUFDaEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUE7SUFDekMsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDckIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FPRDtBQUVELE1BQU0sT0FBTyxVQUFVO0lBQXZCO1FBQ1Usd0JBQW1CLEdBQW9CLElBQUksT0FBTyxFQUFZLENBQUMsS0FBSyxDQUFBO0lBYTlFLENBQUM7SUFaQSxRQUFRLENBQUMsS0FBZSxJQUFTLENBQUM7SUFDbEMsUUFBUTtRQUNQLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQTtJQUNyQixDQUFDO0lBQ0QsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVcsSUFBUyxDQUFDO0lBQy9DLEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXLElBQVMsQ0FBQztJQUMvQyxJQUFJLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVyxJQUFTLENBQUM7SUFDOUMsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVcsSUFBUyxDQUFDO0lBQzlDLEtBQUssQ0FBQyxPQUF1QixFQUFFLEdBQUcsSUFBVyxJQUFTLENBQUM7SUFDdkQsUUFBUSxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXLElBQVMsQ0FBQztJQUMxRCxPQUFPLEtBQVUsQ0FBQztJQUNsQixLQUFLLEtBQVUsQ0FBQztDQUNoQjtBQUVELE1BQU0sT0FBTyxjQUFlLFNBQVEsVUFBVTtDQUU3QztBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsa0JBQXVDO0lBQ2xFLElBQUksa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEMsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFBO0lBQ3RCLENBQUM7SUFDRCxJQUFJLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JELE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUN6RSxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8saUJBQWlCLENBQUE7QUFDekIsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUNsRCxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUssUUFBUSxDQUFDLEtBQUs7WUFDbEIsT0FBTyxPQUFPLENBQUE7UUFDZixLQUFLLFFBQVEsQ0FBQyxLQUFLO1lBQ2xCLE9BQU8sT0FBTyxDQUFBO1FBQ2YsS0FBSyxRQUFRLENBQUMsSUFBSTtZQUNqQixPQUFPLE1BQU0sQ0FBQTtRQUNkLEtBQUssUUFBUSxDQUFDLE9BQU87WUFDcEIsT0FBTyxNQUFNLENBQUE7UUFDZCxLQUFLLFFBQVEsQ0FBQyxLQUFLO1lBQ2xCLE9BQU8sT0FBTyxDQUFBO1FBQ2YsS0FBSyxRQUFRLENBQUMsR0FBRztZQUNoQixPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLFFBQWtCO0lBQzNELFFBQVEsUUFBUSxFQUFFLENBQUM7UUFDbEIsS0FBSyxRQUFRLENBQUMsS0FBSztZQUNsQixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQTtRQUNwRSxLQUFLLFFBQVEsQ0FBQyxLQUFLO1lBQ2xCLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFBO1FBQ3BFLEtBQUssUUFBUSxDQUFDLElBQUk7WUFDakIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUE7UUFDakUsS0FBSyxRQUFRLENBQUMsT0FBTztZQUNwQixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQTtRQUN2RSxLQUFLLFFBQVEsQ0FBQyxLQUFLO1lBQ2xCLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFBO1FBQ3BFLEtBQUssUUFBUSxDQUFDLEdBQUc7WUFDaEIsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUE7SUFDL0QsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLFFBQWdCO0lBQzdDLFFBQVEsUUFBUSxFQUFFLENBQUM7UUFDbEIsS0FBSyxPQUFPO1lBQ1gsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQ3RCLEtBQUssT0FBTztZQUNYLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUN0QixLQUFLLE1BQU07WUFDVixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUE7UUFDckIsS0FBSyxNQUFNO1lBQ1YsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFBO1FBQ3hCLEtBQUssT0FBTztZQUNYLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUN0QixLQUFLLFVBQVU7WUFDZCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUE7UUFDdEIsS0FBSyxLQUFLO1lBQ1QsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFBO0lBQ3JCLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsV0FBVztBQUNYLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksYUFBYSxDQUNqRCxVQUFVLEVBQ1YsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUMvQixDQUFBIn0=