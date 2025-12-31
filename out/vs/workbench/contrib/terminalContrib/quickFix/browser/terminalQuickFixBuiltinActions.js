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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0ZpeEJ1aWx0aW5BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3F1aWNrRml4L2Jyb3dzZXIvdGVybWluYWxRdWlja0ZpeEJ1aWx0aW5BY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUtOLG9CQUFvQixHQUNwQixNQUFNLGVBQWUsQ0FBQTtBQUV0QixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUE7QUFDeEMsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsMkJBQTJCLENBQUE7QUFDeEUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsWUFBWSxDQUFBO0FBQ25ELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLG9EQUFvRCxDQUFBO0FBQ3JGLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLHVDQUF1QyxDQUFBO0FBQzVFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUMvQixpS0FBaUssQ0FBQTtBQUNsSyxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxzREFBc0QsQ0FBQTtBQUN4RixtR0FBbUc7QUFDbkcsOEVBQThFO0FBQzlFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxpRUFBaUUsQ0FBQTtBQUNsRSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyx5QkFBeUIsQ0FBQTtBQUNwRSxNQUFNLENBQUMsTUFBTSx1Q0FBdUMsR0FBRywrQkFBK0IsQ0FBQTtBQUV0RixNQUFNLENBQU4sSUFBa0IsY0FFakI7QUFGRCxXQUFrQixj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