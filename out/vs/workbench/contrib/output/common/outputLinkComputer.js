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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TGlua0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRwdXQvY29tbW9uL291dHB1dExpbmtDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFLNUQsT0FBTyxFQUNOLHlCQUF5QixHQUV6QixNQUFNLHdFQUF3RSxDQUFBO0FBTS9FLE1BQU0sT0FBTyxrQkFBa0I7SUFNOUIsWUFBWSxZQUE4QjtRQUh6Qiw4QkFBeUIsR0FBRyxJQUFJLHlCQUF5QixFQUFFLENBQUE7UUFDcEUsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFBO1FBRzNELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELG9CQUFvQixDQUFDLGdCQUEwQjtRQUM5QyxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVPLGVBQWUsQ0FBQyxpQkFBMkI7UUFDbEQsa0VBQWtFO1FBQ2xFLGlFQUFpRTtRQUNqRSxrREFBa0Q7UUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUI7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