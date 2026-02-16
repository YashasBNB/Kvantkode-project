/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { isLogLevel, log, LogLevel } from '../common/log.js';
export class LoggerChannel {
    constructor(loggerService) {
        this.loggerService = loggerService;
        this.loggers = new ResourceMap();
    }
    listen(_, event, windowId) {
        switch (event) {
            case 'onDidChangeLoggers':
                return windowId
                    ? this.loggerService.getOnDidChangeLoggersEvent(windowId)
                    : this.loggerService.onDidChangeLoggers;
            case 'onDidChangeLogLevel':
                return windowId
                    ? this.loggerService.getOnDidChangeLogLevelEvent(windowId)
                    : this.loggerService.onDidChangeLogLevel;
            case 'onDidChangeVisibility':
                return windowId
                    ? this.loggerService.getOnDidChangeVisibilityEvent(windowId)
                    : this.loggerService.onDidChangeVisibility;
        }
        throw new Error(`Event not found: ${event}`);
    }
    async call(_, command, arg) {
        switch (command) {
            case 'createLogger':
                this.createLogger(URI.revive(arg[0]), arg[1], arg[2]);
                return;
            case 'log':
                return this.log(URI.revive(arg[0]), arg[1]);
            case 'consoleLog':
                return this.consoleLog(arg[0], arg[1]);
            case 'setLogLevel':
                return isLogLevel(arg[0])
                    ? this.loggerService.setLogLevel(arg[0])
                    : this.loggerService.setLogLevel(URI.revive(arg[0]), arg[1]);
            case 'setVisibility':
                return this.loggerService.setVisibility(URI.revive(arg[0]), arg[1]);
            case 'registerLogger':
                return this.loggerService.registerLogger({ ...arg[0], resource: URI.revive(arg[0].resource) }, arg[1]);
            case 'deregisterLogger':
                return this.loggerService.deregisterLogger(URI.revive(arg[0]));
        }
        throw new Error(`Call not found: ${command}`);
    }
    createLogger(file, options, windowId) {
        this.loggers.set(file, this.loggerService.createLogger(file, options, windowId));
    }
    consoleLog(level, args) {
        let consoleFn = console.log;
        switch (level) {
            case LogLevel.Error:
                consoleFn = console.error;
                break;
            case LogLevel.Warning:
                consoleFn = console.warn;
                break;
            case LogLevel.Info:
                consoleFn = console.info;
                break;
        }
        consoleFn.call(console, ...args);
    }
    log(file, messages) {
        const logger = this.loggers.get(file);
        if (!logger) {
            throw new Error('Create the logger before logging');
        }
        for (const [level, message] of messages) {
            log(logger, level, message);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sb2cvZWxlY3Ryb24tbWFpbi9sb2dJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBQTJCLFVBQVUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHckYsTUFBTSxPQUFPLGFBQWE7SUFHekIsWUFBNkIsYUFBaUM7UUFBakMsa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBRjdDLFlBQU8sR0FBRyxJQUFJLFdBQVcsRUFBVyxDQUFBO0lBRVksQ0FBQztJQUVsRSxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWEsRUFBRSxRQUFpQjtRQUNsRCxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxvQkFBb0I7Z0JBQ3hCLE9BQU8sUUFBUTtvQkFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUM7b0JBQ3pELENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFBO1lBQ3pDLEtBQUsscUJBQXFCO2dCQUN6QixPQUFPLFFBQVE7b0JBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDO29CQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQTtZQUMxQyxLQUFLLHVCQUF1QjtnQkFDM0IsT0FBTyxRQUFRO29CQUNkLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLDZCQUE2QixD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