/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../base/browser/window.js';
import { relativePath } from '../../../base/common/resources.js';
import { AdapterLogger, DEFAULT_LOG_LEVEL, LogLevel } from '../common/log.js';
/**
 * Only used in browser contexts where the log files are not stored on disk
 * but in IndexedDB. A method to get all logs with their contents so that
 * CI automation can persist them.
 */
export async function getLogs(fileService, environmentService) {
    const result = [];
    await doGetLogs(fileService, result, environmentService.logsHome, environmentService.logsHome);
    return result;
}
async function doGetLogs(fileService, logs, curFolder, logsHome) {
    const stat = await fileService.resolve(curFolder);
    for (const { resource, isDirectory } of stat.children || []) {
        if (isDirectory) {
            await doGetLogs(fileService, logs, resource, logsHome);
        }
        else {
            const contents = (await fileService.readFile(resource)).value.toString();
            if (contents) {
                const path = relativePath(logsHome, resource);
                if (path) {
                    logs.push({ relativePath: path, contents });
                }
            }
        }
    }
}
function logLevelToString(level) {
    switch (level) {
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
    }
    return 'info';
}
/**
 * A logger that is used when VSCode is running in the web with
 * an automation such as playwright. We expect a global codeAutomationLog
 * to be defined that we can use to log to.
 */
export class ConsoleLogInAutomationLogger extends AdapterLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super({ log: (level, args) => this.consoleLog(logLevelToString(level), args) }, logLevel);
    }
    consoleLog(type, args) {
        const automatedWindow = mainWindow;
        if (typeof automatedWindow.codeAutomationLog === 'function') {
            try {
                automatedWindow.codeAutomationLog(type, args);
            }
            catch (err) {
                // see https://github.com/microsoft/vscode-test-web/issues/69
                console.error('Problems writing to codeAutomationLog', err);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sb2cvYnJvd3Nlci9sb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUloRSxPQUFPLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFXLFFBQVEsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBWXRGOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLE9BQU8sQ0FDNUIsV0FBeUIsRUFDekIsa0JBQXVDO0lBRXZDLE1BQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQTtJQUU3QixNQUFNLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUU5RixPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxLQUFLLFVBQVUsU0FBUyxDQUN2QixXQUF5QixFQUN6QixJQUFnQixFQUNoQixTQUFjLEVBQ2QsUUFBYTtJQUViLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUVqRCxLQUFLLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUM3RCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDeEUsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUM3QyxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBQzVDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFlO0lBQ3hDLFFBQVEsS0FBSyxFQUFFLENBQUM7UUFDZixLQUFLLFFBQVEsQ0FBQyxLQUFLO1lBQ2xCLE9BQU8sT0FBTyxDQUFBO1FBQ2YsS0FBSyxRQUFRLENBQUMsS0FBSztZQUNsQixPQUFPLE9BQU8sQ0FBQTtRQUNmLEtBQUssUUFBUSxDQUFDLElBQUk7WUFDakIsT0FBTyxNQUFNLENBQUE7UUFDZCxLQUFLLFFBQVEsQ0FBQyxPQUFPO1lBQ3BCLE9BQU8sTUFBTSxDQUFBO1FBQ2QsS0FBSyxRQUFRLENBQUMsS0FBSztZQUNsQixPQUFPLE9BQU8sQ0FBQTtJQUNoQixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxhQUFhO0lBRzlELFlBQVksV0FBcUIsaUJBQWlCO1FBQ2pELEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBRU8sVUFBVSxDQUFDLElBQVksRUFBRSxJQUFXO1FBQzNDLE1BQU0sZUFBZSxHQUFHLFVBQXlDLENBQUE7UUFDakUsSUFBSSxPQUFPLGVBQWUsQ0FBQyxpQkFBaUIsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUM3RCxJQUFJLENBQUM7Z0JBQ0osZUFBZSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCw2REFBNkQ7Z0JBQzdELE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDNUQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==