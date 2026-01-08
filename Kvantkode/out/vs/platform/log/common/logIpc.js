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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sb2cvY29tbW9uL2xvZ0lwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFDTixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLGFBQWEsRUFNYixVQUFVLEdBRVYsTUFBTSxVQUFVLENBQUE7QUFDakIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzlELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxxQkFBcUI7SUFDN0QsWUFDa0IsUUFBNEIsRUFDN0MsUUFBa0IsRUFDbEIsUUFBYSxFQUNiLE9BQTBCLEVBQ1QsT0FBaUI7UUFFbEMsS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFOakIsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7UUFJNUIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtRQUdsQyxJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxNQUFNLENBQ2IscUJBQXFCLEVBQ3JCLFFBQVEsQ0FDUixDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDVCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNyQixLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUMs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