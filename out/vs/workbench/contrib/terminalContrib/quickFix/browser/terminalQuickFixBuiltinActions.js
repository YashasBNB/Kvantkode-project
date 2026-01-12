/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { TerminalQuickFixType, } from './quickFix.js';
export const GitCommandLineRegex = /git/;
export const GitFastForwardPullOutputRegex = /and can be fast-forwarded/;
export const GitPushCommandLineRegex = /git\s+push/;
export const GitTwoDashesRegex = /error: did you mean `--(.+)` \(with two dashes\)\?/;
export const GitSimilarOutputRegex = /(?:(most similar commands? (is|are)))/;
export const FreePortOutputRegex = /(?:address already in use (?:0\.0\.0\.0|127\.0\.0\.1|localhost|::):|Unable to bind [^ ]*:|can't listen on port |listen EADDRINUSE [^ ]*:)(?<portNumber>\d{4,5})/;
export const GitPushOutputRegex = /git push --set-upstream origin (?<branchName>[^\s]+)/;
// The previous line starts with "Create a pull request for \'([^\s]+)\' on GitHub by visiting:\s*"
// it's safe to assume it's a github pull request if the URL includes `/pull/`
export const GitCreatePrOutputRegex = /remote:\s*(?<link>https:\/\/github\.com\/.+\/.+\/pull\/new\/.+)/;
export const PwshGeneralErrorOutputRegex = /Suggestion \[General\]:/;
export const PwshUnixCommandNotFoundErrorOutputRegex = /Suggestion \[cmd-not-found\]:/;
export var QuickFixSource;
(function (QuickFixSource) {
    QuickFixSource["Builtin"] = "builtin";
})(QuickFixSource || (QuickFixSource = {}));
export function gitSimilar() {
    return {
        id: 'Git Similar',
        type: 'internal',
        commandLineMatcher: GitCommandLineRegex,
        outputMatcher: {
            lineMatcher: GitSimilarOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 10,
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const regexMatch = matchResult.outputMatch?.regexMatch[0];
            if (!regexMatch || !matchResult.outputMatch) {
                return;
            }
            const actions = [];
            const startIndex = matchResult.outputMatch.outputLines.findIndex((l) => l.includes(regexMatch)) + 1;
            const results = matchResult.outputMatch.outputLines.map((r) => r.trim());
            for (let i = startIndex; i < results.length; i++) {
                const fixedCommand = results[i];
                if (fixedCommand) {
                    actions.push({
                        id: 'Git Similar',
                        type: TerminalQuickFixType.TerminalCommand,
                        terminalCommand: matchResult.commandLine.replace(/git\s+[^\s]+/, () => `git ${fixedCommand}`),
                        shouldExecute: true,
                        source: "builtin" /* QuickFixSource.Builtin */,
                    });
                }
            }
            return actions;
        },
    };
}
export function gitFastForwardPull() {
    return {
        id: 'Git Fast Forward Pull',
        type: 'internal',
        commandLineMatcher: GitCommandLineRegex,
        outputMatcher: {
            lineMatcher: GitFastForwardPullOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 8,
        },
        commandExitResult: 'success',
        getQuickFixes: (matchResult) => {
            return {
                type: TerminalQuickFixType.TerminalCommand,
                id: 'Git Fast Forward Pull',
                terminalCommand: `git pull`,
                shouldExecute: true,
                source: "builtin" /* QuickFixSource.Builtin */,
            };
        },
    };
}
export function gitTwoDashes() {
    return {
        id: 'Git Two Dashes',
        type: 'internal',
        commandLineMatcher: GitCommandLineRegex,
        outputMatcher: {
            lineMatcher: GitTwoDashesRegex,
            anchor: 'bottom',
            offset: 0,
            length: 2,
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const problemArg = matchResult?.outputMatch?.regexMatch?.[1];
            if (!problemArg) {
                return;
            }
            return {
                type: TerminalQuickFixType.TerminalCommand,
                id: 'Git Two Dashes',
                terminalCommand: matchResult.commandLine.replace(` -${problemArg}`, () => ` --${problemArg}`),
                shouldExecute: true,
                source: "builtin" /* QuickFixSource.Builtin */,
            };
        },
    };
}
export function freePort(runCallback) {
    return {
        id: 'Free Port',
        type: 'internal',
        commandLineMatcher: /.+/,
        outputMatcher: {
            lineMatcher: FreePortOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 30,
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const port = matchResult?.outputMatch?.regexMatch?.groups?.portNumber;
            if (!port) {
                return;
            }
            const label = localize('terminal.freePort', 'Free port {0}', port);
            return {
                type: TerminalQuickFixType.Port,
                class: undefined,
                tooltip: label,
                id: 'Free Port',
                label,
                enabled: true,
                source: "builtin" /* QuickFixSource.Builtin */,
                run: () => runCallback(port, matchResult.commandLine),
            };
        },
    };
}
export function gitPushSetUpstream() {
    return {
        id: 'Git Push Set Upstream',
        type: 'internal',
        commandLineMatcher: GitPushCommandLineRegex,
        /**
            Example output on Windows:
            8: PS C:\Users\merogge\repos\xterm.js> git push
            7: fatal: The current branch sdjfskdjfdslkjf has no upstream branch.
            6: To push the current branch and set the remote as upstream, use
            5:
            4:	git push --set-upstream origin sdjfskdjfdslkjf
            3:
            2: To have this happen automatically for branches without a tracking
            1: upstream, see 'push.autoSetupRemote' in 'git help config'.
            0:

            Example output on macOS:
            5: meganrogge@Megans-MacBook-Pro xterm.js % git push
            4: fatal: The current branch merogge/asjdkfsjdkfsdjf has no upstream branch.
            3: To push the current branch and set the remote as upstream, use
            2:
            1:	git push --set-upstream origin merogge/asjdkfsjdkfsdjf
            0:
         */
        outputMatcher: {
            lineMatcher: GitPushOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 8,
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const matches = matchResult.outputMatch;
            const commandToRun = 'git push --set-upstream origin ${group:branchName}';
            if (!matches) {
                return;
            }
            const groups = matches.regexMatch.groups;
            if (!groups) {
                return;
            }
            const actions = [];
            let fixedCommand = commandToRun;
            for (const [key, value] of Object.entries(groups)) {
                const varToResolve = '${group:' + `${key}` + '}';
                if (!commandToRun.includes(varToResolve)) {
                    return [];
                }
                fixedCommand = fixedCommand.replaceAll(varToResolve, () => value);
            }
            if (fixedCommand) {
                actions.push({
                    type: TerminalQuickFixType.TerminalCommand,
                    id: 'Git Push Set Upstream',
                    terminalCommand: fixedCommand,
                    shouldExecute: true,
                    source: "builtin" /* QuickFixSource.Builtin */,
                });
                return actions;
            }
            return;
        },
    };
}
export function gitCreatePr() {
    return {
        id: 'Git Create Pr',
        type: 'internal',
        commandLineMatcher: GitPushCommandLineRegex,
        // Example output:
        // ...
        // 10: remote:
        // 9:  remote: Create a pull request for 'my_branch' on GitHub by visiting:
        // 8:  remote:      https://github.com/microsoft/vscode/pull/new/my_branch
        // 7:  remote:
        // 6:  remote: GitHub found x vulnerabilities on microsoft/vscode's default branch (...). To find out more, visit:
        // 5:  remote:      https://github.com/microsoft/vscode/security/dependabot
        // 4:  remote:
        // 3:  To https://github.com/microsoft/vscode
        // 2:  * [new branch]              my_branch -> my_branch
        // 1:  Branch 'my_branch' set up to track remote branch 'my_branch' from 'origin'.
        // 0:
        outputMatcher: {
            lineMatcher: GitCreatePrOutputRegex,
            anchor: 'bottom',
            offset: 4,
            // ~6 should only be needed here for security alerts, but the git provider can customize
            // the text, so use 12 to be safe.
            length: 12,
        },
        commandExitResult: 'success',
        getQuickFixes: (matchResult) => {
            const link = matchResult?.outputMatch?.regexMatch?.groups?.link?.trimEnd();
            if (!link) {
                return;
            }
            const label = localize('terminal.createPR', 'Create PR {0}', link);
            return {
                id: 'Git Create Pr',
                label,
                enabled: true,
                type: TerminalQuickFixType.Opener,
                uri: URI.parse(link),
                source: "builtin" /* QuickFixSource.Builtin */,
            };
        },
    };
}
export function pwshGeneralError() {
    return {
        id: 'Pwsh General Error',
        type: 'internal',
        commandLineMatcher: /.+/,
        outputMatcher: {
            lineMatcher: PwshGeneralErrorOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 10,
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const lines = matchResult.outputMatch?.regexMatch.input?.split('\n');
            if (!lines) {
                return;
            }
            // Find the start
            let i = 0;
            let inFeedbackProvider = false;
            for (; i < lines.length; i++) {
                if (lines[i].match(PwshGeneralErrorOutputRegex)) {
                    inFeedbackProvider = true;
                    break;
                }
            }
            if (!inFeedbackProvider) {
                return;
            }
            const suggestions = lines[i + 1]
                .match(/The most similar commands are: (?<values>.+)./)
                ?.groups?.values?.split(', ');
            if (!suggestions) {
                return;
            }
            const result = [];
            for (const suggestion of suggestions) {
                result.push({
                    id: 'Pwsh General Error',
                    type: TerminalQuickFixType.TerminalCommand,
                    terminalCommand: suggestion,
                    source: "builtin" /* QuickFixSource.Builtin */,
                });
            }
            return result;
        },
    };
}
export function pwshUnixCommandNotFoundError() {
    return {
        id: 'Unix Command Not Found',
        type: 'internal',
        commandLineMatcher: /.+/,
        outputMatcher: {
            lineMatcher: PwshUnixCommandNotFoundErrorOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 10,
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const lines = matchResult.outputMatch?.regexMatch.input?.split('\n');
            if (!lines) {
                return;
            }
            // Find the start
            let i = 0;
            let inFeedbackProvider = false;
            for (; i < lines.length; i++) {
                if (lines[i].match(PwshUnixCommandNotFoundErrorOutputRegex)) {
                    inFeedbackProvider = true;
                    break;
                }
            }
            if (!inFeedbackProvider) {
                return;
            }
            // Always remove the first element as it's the "Suggestion [cmd-not-found]"" line
            const result = [];
            let inSuggestions = false;
            for (; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.length === 0) {
                    break;
                }
                const installCommand = line.match(/You also have .+ installed, you can run '(?<command>.+)' instead./)?.groups?.command;
                if (installCommand) {
                    result.push({
                        id: 'Pwsh Unix Command Not Found Error',
                        type: TerminalQuickFixType.TerminalCommand,
                        terminalCommand: installCommand,
                        source: "builtin" /* QuickFixSource.Builtin */,
                    });
                    inSuggestions = false;
                    continue;
                }
                if (line.match(/Command '.+' not found, but can be installed with:/)) {
                    inSuggestions = true;
                    continue;
                }
                if (inSuggestions) {
                    result.push({
                        id: 'Pwsh Unix Command Not Found Error',
                        type: TerminalQuickFixType.TerminalCommand,
                        terminalCommand: line.trim(),
                        source: "builtin" /* QuickFixSource.Builtin */,
                    });
                }
            }
            return result;
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0ZpeEJ1aWx0aW5BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvcXVpY2tGaXgvYnJvd3Nlci90ZXJtaW5hbFF1aWNrRml4QnVpbHRpbkFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBS04sb0JBQW9CLEdBQ3BCLE1BQU0sZUFBZSxDQUFBO0FBRXRCLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtBQUN4QyxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRywyQkFBMkIsQ0FBQTtBQUN4RSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxZQUFZLENBQUE7QUFDbkQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsb0RBQW9ELENBQUE7QUFDckYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsdUNBQXVDLENBQUE7QUFDNUUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQy9CLGlLQUFpSyxDQUFBO0FBQ2xLLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLHNEQUFzRCxDQUFBO0FBQ3hGLG1HQUFtRztBQUNuRyw4RUFBOEU7QUFDOUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGlFQUFpRSxDQUFBO0FBQ2xFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLHlCQUF5QixDQUFBO0FBQ3BFLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLCtCQUErQixDQUFBO0FBRXRGLE1BQU0sQ0FBTixJQUFrQixjQUVqQjtBQUZELFdBQWtCLGNBQWM7SUFDL0IscUNBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUZpQixjQUFjLEtBQWQsY0FBYyxRQUUvQjtBQUVELE1BQU0sVUFBVSxVQUFVO0lBQ3pCLE9BQU87UUFDTixFQUFFLEVBQUUsYUFBYTtRQUNqQixJQUFJLEVBQUUsVUFBVTtRQUNoQixrQkFBa0IsRUFBRSxtQkFBbUI7UUFDdkMsYUFBYSxFQUFFO1lBQ2QsV0FBVyxFQUFFLHFCQUFxQjtZQUNsQyxNQUFNLEVBQUUsUUFBUTtZQUNoQixNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxFQUFFO1NBQ1Y7UUFDRCxpQkFBaUIsRUFBRSxPQUFPO1FBQzFCLGFBQWEsRUFBRSxDQUFDLFdBQXdDLEVBQUUsRUFBRTtZQUMzRCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6RCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM3QyxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sT0FBTyxHQUFxQyxFQUFFLENBQUE7WUFDcEQsTUFBTSxVQUFVLEdBQ2YsV0FBVyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2pGLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDeEUsS0FBSyxJQUFJLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDbEQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUMvQixJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNaLEVBQUUsRUFBRSxhQUFhO3dCQUNqQixJQUFJLEVBQUUsb0JBQW9CLENBQUMsZUFBZTt3QkFDMUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUMvQyxjQUFjLEVBQ2QsR0FBRyxFQUFFLENBQUMsT0FBTyxZQUFZLEVBQUUsQ0FDM0I7d0JBQ0QsYUFBYSxFQUFFLElBQUk7d0JBQ25CLE1BQU0sd0NBQXdCO3FCQUM5QixDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0I7SUFDakMsT0FBTztRQUNOLEVBQUUsRUFBRSx1QkFBdUI7UUFDM0IsSUFBSSxFQUFFLFVBQVU7UUFDaEIsa0JBQWtCLEVBQUUsbUJBQW1CO1FBQ3ZDLGFBQWEsRUFBRTtZQUNkLFdBQVcsRUFBRSw2QkFBNkI7WUFDMUMsTUFBTSxFQUFFLFFBQVE7WUFDaEIsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUUsQ0FBQztTQUNUO1FBQ0QsaUJBQWlCLEVBQUUsU0FBUztRQUM1QixhQUFhLEVBQUUsQ0FBQyxXQUF3QyxFQUFFLEVBQUU7WUFDM0QsT0FBTztnQkFDTixJQUFJLEVBQUUsb0JBQW9CLENBQUMsZUFBZTtnQkFDMUMsRUFBRSxFQUFFLHVCQUF1QjtnQkFDM0IsZUFBZSxFQUFFLFVBQVU7Z0JBQzNCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixNQUFNLHdDQUF3QjthQUM5QixDQUFBO1FBQ0YsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVk7SUFDM0IsT0FBTztRQUNOLEVBQUUsRUFBRSxnQkFBZ0I7UUFDcEIsSUFBSSxFQUFFLFVBQVU7UUFDaEIsa0JBQWtCLEVBQUUsbUJBQW1CO1FBQ3ZDLGFBQWEsRUFBRTtZQUNkLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsTUFBTSxFQUFFLFFBQVE7WUFDaEIsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUUsQ0FBQztTQUNUO1FBQ0QsaUJBQWlCLEVBQUUsT0FBTztRQUMxQixhQUFhLEVBQUUsQ0FBQyxXQUF3QyxFQUFFLEVBQUU7WUFDM0QsTUFBTSxVQUFVLEdBQUcsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLE9BQU07WUFDUCxDQUFDO1lBQ0QsT0FBTztnQkFDTixJQUFJLEVBQUUsb0JBQW9CLENBQUMsZUFBZTtnQkFDMUMsRUFBRSxFQUFFLGdCQUFnQjtnQkFDcEIsZUFBZSxFQUFFLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUMvQyxLQUFLLFVBQVUsRUFBRSxFQUNqQixHQUFHLEVBQUUsQ0FBQyxNQUFNLFVBQVUsRUFBRSxDQUN4QjtnQkFDRCxhQUFhLEVBQUUsSUFBSTtnQkFDbkIsTUFBTSx3Q0FBd0I7YUFDOUIsQ0FBQTtRQUNGLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUNELE1BQU0sVUFBVSxRQUFRLENBQ3ZCLFdBQWlFO0lBRWpFLE9BQU87UUFDTixFQUFFLEVBQUUsV0FBVztRQUNmLElBQUksRUFBRSxVQUFVO1FBQ2hCLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsYUFBYSxFQUFFO1lBQ2QsV0FBVyxFQUFFLG1CQUFtQjtZQUNoQyxNQUFNLEVBQUUsUUFBUTtZQUNoQixNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxFQUFFO1NBQ1Y7UUFDRCxpQkFBaUIsRUFBRSxPQUFPO1FBQzFCLGFBQWEsRUFBRSxDQUFDLFdBQXdDLEVBQUUsRUFBRTtZQUMzRCxNQUFNLElBQUksR0FBRyxXQUFXLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFBO1lBQ3JFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbEUsT0FBTztnQkFDTixJQUFJLEVBQUUsb0JBQW9CLENBQUMsSUFBSTtnQkFDL0IsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEVBQUUsRUFBRSxXQUFXO2dCQUNmLEtBQUs7Z0JBQ0wsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsTUFBTSx3Q0FBd0I7Z0JBQzlCLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxXQUFXLENBQUM7YUFDckQsQ0FBQTtRQUNGLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0I7SUFDakMsT0FBTztRQUNOLEVBQUUsRUFBRSx1QkFBdUI7UUFDM0IsSUFBSSxFQUFFLFVBQVU7UUFDaEIsa0JBQWtCLEVBQUUsdUJBQXVCO1FBQzNDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O1dBbUJHO1FBQ0gsYUFBYSxFQUFFO1lBQ2QsV0FBVyxFQUFFLGtCQUFrQjtZQUMvQixNQUFNLEVBQUUsUUFBUTtZQUNoQixNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxDQUFDO1NBQ1Q7UUFDRCxpQkFBaUIsRUFBRSxPQUFPO1FBQzFCLGFBQWEsRUFBRSxDQUFDLFdBQXdDLEVBQUUsRUFBRTtZQUMzRCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFBO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLG9EQUFvRCxDQUFBO1lBQ3pFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFBO1lBQ3hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDYixPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sT0FBTyxHQUFxQyxFQUFFLENBQUE7WUFDcEQsSUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFBO1lBQy9CLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELE1BQU0sWUFBWSxHQUFHLFVBQVUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQTtnQkFDaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsT0FBTyxFQUFFLENBQUE7Z0JBQ1YsQ0FBQztnQkFDRCxZQUFZLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbEUsQ0FBQztZQUNELElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1osSUFBSSxFQUFFLG9CQUFvQixDQUFDLGVBQWU7b0JBQzFDLEVBQUUsRUFBRSx1QkFBdUI7b0JBQzNCLGVBQWUsRUFBRSxZQUFZO29CQUM3QixhQUFhLEVBQUUsSUFBSTtvQkFDbkIsTUFBTSx3Q0FBd0I7aUJBQzlCLENBQUMsQ0FBQTtnQkFDRixPQUFPLE9BQU8sQ0FBQTtZQUNmLENBQUM7WUFDRCxPQUFNO1FBQ1AsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVc7SUFDMUIsT0FBTztRQUNOLEVBQUUsRUFBRSxlQUFlO1FBQ25CLElBQUksRUFBRSxVQUFVO1FBQ2hCLGtCQUFrQixFQUFFLHVCQUF1QjtRQUMzQyxrQkFBa0I7UUFDbEIsTUFBTTtRQUNOLGNBQWM7UUFDZCwyRUFBMkU7UUFDM0UsMEVBQTBFO1FBQzFFLGNBQWM7UUFDZCxrSEFBa0g7UUFDbEgsMkVBQTJFO1FBQzNFLGNBQWM7UUFDZCw2Q0FBNkM7UUFDN0MseURBQXlEO1FBQ3pELGtGQUFrRjtRQUNsRixLQUFLO1FBQ0wsYUFBYSxFQUFFO1lBQ2QsV0FBVyxFQUFFLHNCQUFzQjtZQUNuQyxNQUFNLEVBQUUsUUFBUTtZQUNoQixNQUFNLEVBQUUsQ0FBQztZQUNULHdGQUF3RjtZQUN4RixrQ0FBa0M7WUFDbEMsTUFBTSxFQUFFLEVBQUU7U0FDVjtRQUNELGlCQUFpQixFQUFFLFNBQVM7UUFDNUIsYUFBYSxFQUFFLENBQUMsV0FBd0MsRUFBRSxFQUFFO1lBQzNELE1BQU0sSUFBSSxHQUFHLFdBQVcsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDMUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNsRSxPQUFPO2dCQUNOLEVBQUUsRUFBRSxlQUFlO2dCQUNuQixLQUFLO2dCQUNMLE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxNQUFNO2dCQUNqQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ3BCLE1BQU0sd0NBQXdCO2FBQzlCLENBQUE7UUFDRixDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCO0lBQy9CLE9BQU87UUFDTixFQUFFLEVBQUUsb0JBQW9CO1FBQ3hCLElBQUksRUFBRSxVQUFVO1FBQ2hCLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsYUFBYSxFQUFFO1lBQ2QsV0FBVyxFQUFFLDJCQUEyQjtZQUN4QyxNQUFNLEVBQUUsUUFBUTtZQUNoQixNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxFQUFFO1NBQ1Y7UUFDRCxpQkFBaUIsRUFBRSxPQUFPO1FBQzFCLGFBQWEsRUFBRSxDQUFDLFdBQXdDLEVBQUUsRUFBRTtZQUMzRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3BFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFNO1lBQ1AsQ0FBQztZQUVELGlCQUFpQjtZQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDVCxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtZQUM5QixPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlCLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUM7b0JBQ2pELGtCQUFrQixHQUFHLElBQUksQ0FBQTtvQkFDekIsTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN6QixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUM5QixLQUFLLENBQUMsK0NBQStDLENBQUM7Z0JBQ3ZELEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDOUIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNsQixPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sTUFBTSxHQUE2QyxFQUFFLENBQUE7WUFDM0QsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDWCxFQUFFLEVBQUUsb0JBQW9CO29CQUN4QixJQUFJLEVBQUUsb0JBQW9CLENBQUMsZUFBZTtvQkFDMUMsZUFBZSxFQUFFLFVBQVU7b0JBQzNCLE1BQU0sd0NBQXdCO2lCQUM5QixDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLE9BQU87UUFDTixFQUFFLEVBQUUsd0JBQXdCO1FBQzVCLElBQUksRUFBRSxVQUFVO1FBQ2hCLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsYUFBYSxFQUFFO1lBQ2QsV0FBVyxFQUFFLHVDQUF1QztZQUNwRCxNQUFNLEVBQUUsUUFBUTtZQUNoQixNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxFQUFFO1NBQ1Y7UUFDRCxpQkFBaUIsRUFBRSxPQUFPO1FBQzFCLGFBQWEsRUFBRSxDQUFDLFdBQXdDLEVBQUUsRUFBRTtZQUMzRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3BFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFNO1lBQ1AsQ0FBQztZQUVELGlCQUFpQjtZQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDVCxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtZQUM5QixPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlCLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxFQUFFLENBQUM7b0JBQzdELGtCQUFrQixHQUFHLElBQUksQ0FBQTtvQkFDekIsTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN6QixPQUFNO1lBQ1AsQ0FBQztZQUVELGlGQUFpRjtZQUNqRixNQUFNLE1BQU0sR0FBNkMsRUFBRSxDQUFBO1lBQzNELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQTtZQUN6QixPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDNUIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN2QixNQUFLO2dCQUNOLENBQUM7Z0JBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDaEMsbUVBQW1FLENBQ25FLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQTtnQkFDbEIsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQzt3QkFDWCxFQUFFLEVBQUUsbUNBQW1DO3dCQUN2QyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsZUFBZTt3QkFDMUMsZUFBZSxFQUFFLGNBQWM7d0JBQy9CLE1BQU0sd0NBQXdCO3FCQUM5QixDQUFDLENBQUE7b0JBQ0YsYUFBYSxHQUFHLEtBQUssQ0FBQTtvQkFDckIsU0FBUTtnQkFDVCxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxFQUFFLENBQUM7b0JBQ3RFLGFBQWEsR0FBRyxJQUFJLENBQUE7b0JBQ3BCLFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDO3dCQUNYLEVBQUUsRUFBRSxtQ0FBbUM7d0JBQ3ZDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxlQUFlO3dCQUMxQyxlQUFlLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRTt3QkFDNUIsTUFBTSx3Q0FBd0I7cUJBQzlCLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDIn0=