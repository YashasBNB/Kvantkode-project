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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbG9nL2VsZWN0cm9uLW1haW4vbG9nSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUEyQixVQUFVLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBR3JGLE1BQU0sT0FBTyxhQUFhO0lBR3pCLFlBQTZCLGFBQWlDO1FBQWpDLGtCQUFhLEdBQWIsYUFBYSxDQUFvQjtRQUY3QyxZQUFPLEdBQUcsSUFBSSxXQUFXLEVBQVcsQ0FBQTtJQUVZLENBQUM7SUFFbEUsTUFBTSxDQUFDLENBQVUsRUFBRSxLQUFhLEVBQUUsUUFBaUI7UUFDbEQsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssb0JBQW9CO2dCQUN4QixPQUFPLFFBQVE7b0JBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDO29CQUN6RCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQTtZQUN6QyxLQUFLLHFCQUFxQjtnQkFDekIsT0FBTyxRQUFRO29CQUNkLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQztvQkFDMUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUE7WUFDMUMsS0FBSyx1QkFBdUI7Z0JBQzNCLE9BQU8sUUFBUTtvQkFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUM7b0JBQzVELENB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