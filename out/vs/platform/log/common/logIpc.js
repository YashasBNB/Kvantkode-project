/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { Event } from '../../../base/common/event.js';
import { AbstractLoggerService, AbstractMessageLogger, AdapterLogger, isLogLevel, } from './log.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export class LoggerChannelClient extends AbstractLoggerService {
    constructor(windowId, logLevel, logsHome, loggers, channel) {
        super(logLevel, logsHome, loggers);
        this.windowId = windowId;
        this.channel = channel;
        this._register(channel.listen('onDidChangeLogLevel', windowId)((arg) => {
            if (isLogLevel(arg)) {
                super.setLogLevel(arg);
            }
            else {
                super.setLogLevel(URI.revive(arg[0]), arg[1]);
            }
        }));
        this._register(channel.listen('onDidChangeVisibility', windowId)(([resource, visibility]) => super.setVisibility(URI.revive(resource), visibility)));
        this._register(channel.listen('onDidChangeLoggers', windowId)(({ added, removed }) => {
            for (const loggerResource of added) {
                super.registerLogger({ ...loggerResource, resource: URI.revive(loggerResource.resource) });
            }
            for (const loggerResource of removed) {
                super.deregisterLogger(loggerResource.resource);
            }
        }));
    }
    createConsoleMainLogger() {
        return new AdapterLogger({
            log: (level, args) => {
                this.channel.call('consoleLog', [level, args]);
            },
        });
    }
    registerLogger(logger) {
        super.registerLogger(logger);
        this.channel.call('registerLogger', [logger, this.windowId]);
    }
    deregisterLogger(resource) {
        super.deregisterLogger(resource);
        this.channel.call('deregisterLogger', [resource, this.windowId]);
    }
    setLogLevel(arg1, arg2) {
        super.setLogLevel(arg1, arg2);
        this.channel.call('setLogLevel', [arg1, arg2]);
    }
    setVisibility(resourceOrId, visibility) {
        super.setVisibility(resourceOrId, visibility);
        this.channel.call('setVisibility', [this.toResource(resourceOrId), visibility]);
    }
    doCreateLogger(file, logLevel, options) {
        return new Logger(this.channel, file, logLevel, options, this.windowId);
    }
    static setLogLevel(channel, arg1, arg2) {
        return channel.call('setLogLevel', [arg1, arg2]);
    }
}
class Logger extends AbstractMessageLogger {
    constructor(channel, file, logLevel, loggerOptions, windowId) {
        super(loggerOptions?.logLevel === 'always');
        this.channel = channel;
        this.file = file;
        this.isLoggerCreated = false;
        this.buffer = [];
        this.setLevel(logLevel);
        this.channel.call('createLogger', [file, loggerOptions, windowId]).then(() => {
            this.doLog(this.buffer);
            this.isLoggerCreated = true;
        });
    }
    log(level, message) {
        const messages = [[level, message]];
        if (this.isLoggerCreated) {
            this.doLog(messages);
        }
        else {
            this.buffer.push(...messages);
        }
    }
    doLog(messages) {
        this.channel.call('log', [this.file, messages]);
    }
}
export class LoggerChannel {
    constructor(loggerService, getUriTransformer) {
        this.loggerService = loggerService;
        this.getUriTransformer = getUriTransformer;
    }
    listen(context, event) {
        const uriTransformer = this.getUriTransformer(context);
        switch (event) {
            case 'onDidChangeLoggers':
                return Event.map(this.loggerService.onDidChangeLoggers, (e) => ({
                    added: [...e.added].map((logger) => this.transformLogger(logger, uriTransformer)),
                    removed: [...e.removed].map((logger) => this.transformLogger(logger, uriTransformer)),
                }));
            case 'onDidChangeVisibility':
                return Event.map(this.loggerService.onDidChangeVisibility, (e) => [uriTransformer.transformOutgoingURI(e[0]), e[1]]);
            case 'onDidChangeLogLevel':
                return Event.map(this.loggerService.onDidChangeLogLevel, (e) => (isLogLevel(e) ? e : [uriTransformer.transformOutgoingURI(e[0]), e[1]]));
        }
        throw new Error(`Event not found: ${event}`);
    }
    async call(context, command, arg) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'setLogLevel':
                return isLogLevel(arg[0])
                    ? this.loggerService.setLogLevel(arg[0])
                    : this.loggerService.setLogLevel(URI.revive(uriTransformer.transformIncoming(arg[0][0])), arg[0][1]);
            case 'getRegisteredLoggers':
                return Promise.resolve([...this.loggerService.getRegisteredLoggers()].map((logger) => this.transformLogger(logger, uriTransformer)));
        }
        throw new Error(`Call not found: ${command}`);
    }
    transformLogger(logger, transformer) {
        return {
            ...logger,
            resource: transformer.transformOutgoingURI(logger.resource),
        };
    }
}
export class RemoteLoggerChannelClient extends Disposable {
    constructor(loggerService, channel) {
        super();
        channel.call('setLogLevel', [loggerService.getLogLevel()]);
        this._register(loggerService.onDidChangeLogLevel((arg) => channel.call('setLogLevel', [arg])));
        channel.call('getRegisteredLoggers').then((loggers) => {
            for (const loggerResource of loggers) {
                loggerService.registerLogger({
                    ...loggerResource,
                    resource: URI.revive(loggerResource.resource),
                });
            }
        });
        this._register(channel.listen('onDidChangeVisibility')(([resource, visibility]) => loggerService.setVisibility(URI.revive(resource), visibility)));
        this._register(channel.listen('onDidChangeLoggers')(({ added, removed }) => {
            for (const loggerResource of added) {
                loggerService.registerLogger({
                    ...loggerResource,
                    resource: URI.revive(loggerResource.resource),
                });
            }
            for (const loggerResource of removed) {
                loggerService.deregisterLogger(loggerResource.resource);
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbG9nL2NvbW1vbi9sb2dJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLHFCQUFxQixFQUNyQixhQUFhLEVBTWIsVUFBVSxHQUVWLE1BQU0sVUFBVSxDQUFBO0FBQ2pCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc5RCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEscUJBQXFCO0lBQzdELFlBQ2tCLFFBQTRCLEVBQzdDLFFBQWtCLEVBQ2xCLFFBQWEsRUFDYixPQUEwQixFQUNULE9BQWlCO1FBRWxDLEtBQUssQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBTmpCLGFBQVEsR0FBUixRQUFRLENBQW9CO1FBSTVCLFlBQU8sR0FBUCxPQUFPLENBQVU7UUFHbEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixPQUFPLENBQUMsTUFBTSxDQUNiLHFCQUFxQixFQUNyQixRQUFRLENBQ1IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ1QsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN2QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlDLENBQUM7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