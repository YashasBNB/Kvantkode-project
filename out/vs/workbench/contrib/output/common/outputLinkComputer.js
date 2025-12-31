/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import * as extpath from '../../../../base/common/extpath.js';
import * as resources from '../../../../base/common/resources.js';
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { isWindows } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { WorkerTextModelSyncServer, } from '../../../../editor/common/services/textModelSync/textModelSync.impl.js';
export class OutputLinkComputer {
    constructor(workerServer) {
        this.workerTextModelSyncServer = new WorkerTextModelSyncServer();
        this.patterns = new Map();
        this.workerTextModelSyncServer.bindToServer(workerServer);
    }
    $setWorkspaceFolders(workspaceFolders) {
        this.computePatterns(workspaceFolders);
    }
    computePatterns(_workspaceFolders) {
        // Produce patterns for each workspace root we are configured with
        // This means that we will be able to detect links for paths that
        // contain any of the workspace roots as segments.
        const workspaceFolders = _workspaceFolders
            .sort((resourceStrA, resourceStrB) => resourceStrB.length - resourceStrA.length) // longest paths first (for https://github.com/microsoft/vscode/issues/88121)
            .map((resourceStr) => URI.parse(resourceStr));
        for (const workspaceFolder of workspaceFolders) {
            const patterns = OutputLinkComputer.createPatterns(workspaceFolder);
            this.patterns.set(workspaceFolder, patterns);
        }
    }
    getModel(uri) {
        return this.workerTextModelSyncServer.getModel(uri);
    }
    $computeLinks(uri) {
        const model = this.getModel(uri);
        if (!model) {
            return [];
        }
        const links = [];
        const lines = strings.splitLines(model.getValue());
        // For each workspace root patterns
        for (const [folderUri, folderPatterns] of this.patterns) {
            const resourceCreator = {
                toResource: (folderRelativePath) => {
                    if (typeof folderRelativePath === 'string') {
                        return resources.joinPath(folderUri, folderRelativePath);
                    }
                    return null;
                },
            };
            for (let i = 0, len = lines.length; i < len; i++) {
                links.push(...OutputLinkComputer.detectLinks(lines[i], i + 1, folderPatterns, resourceCreator));
            }
        }
        return links;
    }
    static createPatterns(workspaceFolder) {
        const patterns = [];
        const workspaceFolderPath = workspaceFolder.scheme === Schemas.file ? workspaceFolder.fsPath : workspaceFolder.path;
        const workspaceFolderVariants = [workspaceFolderPath];
        if (isWindows && workspaceFolder.scheme === Schemas.file) {
            workspaceFolderVariants.push(extpath.toSlashes(workspaceFolderPath));
        }
        for (const workspaceFolderVariant of workspaceFolderVariants) {
            const validPathCharacterPattern = '[^\\s\\(\\):<>\'"]';
            const validPathCharacterOrSpacePattern = `(?:${validPathCharacterPattern}| ${validPathCharacterPattern})`;
            const pathPattern = `${validPathCharacterOrSpacePattern}+\\.${validPathCharacterPattern}+`;
            const strictPathPattern = `${validPathCharacterPattern}+`;
            // Example: /workspaces/express/server.js on line 8, column 13
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) +
                `(${pathPattern}) on line ((\\d+)(, column (\\d+))?)`, 'gi'));
            // Example: /workspaces/express/server.js:line 8, column 13
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) +
                `(${pathPattern}):line ((\\d+)(, column (\\d+))?)`, 'gi'));
            // Example: /workspaces/mankala/Features.ts(45): error
            // Example: /workspaces/mankala/Features.ts (45): error
            // Example: /workspaces/mankala/Features.ts(45,18): error
            // Example: /workspaces/mankala/Features.ts (45,18): error
            // Example: /workspaces/mankala/Features Special.ts (45,18): error
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) +
                `(${pathPattern})(\\s?\\((\\d+)(,(\\d+))?)\\)`, 'gi'));
            // Example: at /workspaces/mankala/Game.ts
            // Example: at /workspaces/mankala/Game.ts:336
            // Example: at /workspaces/mankala/Game.ts:336:9
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) +
                `(${strictPathPattern})(:(\\d+))?(:(\\d+))?`, 'gi'));
        }
        return patterns;
    }
    /**
     * Detect links. Made static to allow for tests.
     */
    static detectLinks(line, lineIndex, patterns, resourceCreator) {
        const links = [];
        patterns.forEach((pattern) => {
            pattern.lastIndex = 0; // the holy grail of software development
            let match;
            let offset = 0;
            while ((match = pattern.exec(line)) !== null) {
                // Convert the relative path information to a resource that we can use in links
                const folderRelativePath = strings.rtrim(match[1], '.').replace(/\\/g, '/'); // remove trailing "." that likely indicate end of sentence
                let resourceString;
                try {
                    const resource = resourceCreator.toResource(folderRelativePath);
                    if (resource) {
                        resourceString = resource.toString();
                    }
                }
                catch (error) {
                    continue; // we might find an invalid URI and then we dont want to loose all other links
                }
                // Append line/col information to URI if matching
                if (match[3]) {
                    const lineNumber = match[3];
                    if (match[5]) {
                        const columnNumber = match[5];
                        resourceString = strings.format('{0}#{1},{2}', resourceString, lineNumber, columnNumber);
                    }
                    else {
                        resourceString = strings.format('{0}#{1}', resourceString, lineNumber);
                    }
                }
                const fullMatch = strings.rtrim(match[0], '.'); // remove trailing "." that likely indicate end of sentence
                const index = line.indexOf(fullMatch, offset);
                offset = index + fullMatch.length;
                const linkRange = {
                    startColumn: index + 1,
                    startLineNumber: lineIndex,
                    endColumn: index + 1 + fullMatch.length,
                    endLineNumber: lineIndex,
                };
                if (links.some((link) => Range.areIntersectingOrTouching(link.range, linkRange))) {
                    return; // Do not detect duplicate links
                }
                links.push({
                    range: linkRange,
                    url: resourceString,
                });
            }
        });
        return links;
    }
}
export function create(workerServer) {
    return new OutputLinkComputer(workerServer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TGlua0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L2NvbW1vbi9vdXRwdXRMaW5rQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBSzVELE9BQU8sRUFDTix5QkFBeUIsR0FFekIsTUFBTSx3RUFBd0UsQ0FBQTtBQU0vRSxNQUFNLE9BQU8sa0JBQWtCO0lBTTlCLFlBQVksWUFBOEI7UUFIekIsOEJBQXlCLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFBO1FBQ3BFLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQTtRQUczRCxJQUFJLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxnQkFBMEI7UUFDOUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTyxlQUFlLENBQUMsaUJBQTJCO1FBQ2xELGtFQUFrRTtRQUNsRSxpRUFBaUU7UUFDakUsa0RBQWtEO1FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCO2FBQ3hD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