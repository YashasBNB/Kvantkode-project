/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
export class IgnoreFile {
    constructor(contents, location, parent) {
        this.location = location;
        this.parent = parent;
        if (location[location.length - 1] === '\\') {
            throw Error('Unexpected path format, do not use trailing backslashes');
        }
        if (location[location.length - 1] !== '/') {
            location += '/';
        }
        this.isPathIgnored = this.parseIgnoreFile(contents, this.location, this.parent);
    }
    /**
     * Updates the contents of the ignorefile. Preservering the location and parent
     * @param contents The new contents of the gitignore file
     */
    updateContents(contents) {
        this.isPathIgnored = this.parseIgnoreFile(contents, this.location, this.parent);
    }
    /**
     * Returns true if a path in a traversable directory has not been ignored.
     *
     * Note: For performance reasons this does not check if the parent directories have been ignored,
     * so it should always be used in tandem with `shouldTraverseDir` when walking a directory.
     *
     * In cases where a path must be tested in isolation, `isArbitraryPathIncluded` should be used.
     */
    isPathIncludedInTraversal(path, isDir) {
        if (path[0] !== '/' || path[path.length - 1] === '/') {
            throw Error('Unexpected path format, expectred to begin with slash and end without. got:' + path);
        }
        const ignored = this.isPathIgnored(path, isDir);
        return !ignored;
    }
    /**
     * Returns true if an arbitrary path has not been ignored.
     * This is an expensive operation and should only be used ouside of traversals.
     */
    isArbitraryPathIgnored(path, isDir) {
        if (path[0] !== '/' || path[path.length - 1] === '/') {
            throw Error('Unexpected path format, expectred to begin with slash and end without. got:' + path);
        }
        const segments = path.split('/').filter((x) => x);
        let ignored = false;
        let walkingPath = '';
        for (let i = 0; i < segments.length; i++) {
            const isLast = i === segments.length - 1;
            const segment = segments[i];
            walkingPath = walkingPath + '/' + segment;
            if (!this.isPathIncludedInTraversal(walkingPath, isLast ? isDir : true)) {
                ignored = true;
                break;
            }
        }
        return ignored;
    }
    gitignoreLinesToExpression(lines, dirPath, trimForExclusions) {
        const includeLines = lines.map((line) => this.gitignoreLineToGlob(line, dirPath));
        const includeExpression = Object.create(null);
        for (const line of includeLines) {
            includeExpression[line] = true;
        }
        return glob.parse(includeExpression, { trimForExclusions });
    }
    parseIgnoreFile(ignoreContents, dirPath, parent) {
        const contentLines = ignoreContents
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && line[0] !== '#');
        // Pull out all the lines that end with `/`, those only apply to directories
        const fileLines = contentLines.filter((line) => !line.endsWith('/'));
        const fileIgnoreLines = fileLines.filter((line) => !line.includes('!'));
        const isFileIgnored = this.gitignoreLinesToExpression(fileIgnoreLines, dirPath, true);
        // TODO: Slight hack... this naieve approach may reintroduce too many files in cases of weirdly complex .gitignores
        const fileIncludeLines = fileLines
            .filter((line) => line.includes('!'))
            .map((line) => line.replace(/!/g, ''));
        const isFileIncluded = this.gitignoreLinesToExpression(fileIncludeLines, dirPath, false);
        // When checking if a dir is ignored we can use all lines
        const dirIgnoreLines = contentLines.filter((line) => !line.includes('!'));
        const isDirIgnored = this.gitignoreLinesToExpression(dirIgnoreLines, dirPath, true);
        // Same hack.
        const dirIncludeLines = contentLines
            .filter((line) => line.includes('!'))
            .map((line) => line.replace(/!/g, ''));
        const isDirIncluded = this.gitignoreLinesToExpression(dirIncludeLines, dirPath, false);
        const isPathIgnored = (path, isDir) => {
            if (!path.startsWith(dirPath)) {
                return false;
            }
            if (isDir && isDirIgnored(path) && !isDirIncluded(path)) {
                return true;
            }
            if (isFileIgnored(path) && !isFileIncluded(path)) {
                return true;
            }
            if (parent) {
                return parent.isPathIgnored(path, isDir);
            }
            return false;
        };
        return isPathIgnored;
    }
    gitignoreLineToGlob(line, dirPath) {
        const firstSep = line.indexOf('/');
        if (firstSep === -1 || firstSep === line.length - 1) {
            line = '**/' + line;
        }
        else {
            if (firstSep === 0) {
                if (dirPath.slice(-1) === '/') {
                    line = line.slice(1);
                }
            }
            else {
                if (dirPath.slice(-1) !== '/') {
                    line = '/' + line;
                }
            }
            line = dirPath + line;
        }
        return line;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlRmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vaWdub3JlRmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBRXZELE1BQU0sT0FBTyxVQUFVO0lBR3RCLFlBQ0MsUUFBZ0IsRUFDQyxRQUFnQixFQUNoQixNQUFtQjtRQURuQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFdBQU0sR0FBTixNQUFNLENBQWE7UUFFcEMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM1QyxNQUFNLEtBQUssQ0FBQyx5REFBeUQsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7UUFDRCxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzNDLFFBQVEsSUFBSSxHQUFHLENBQUE7UUFDaEIsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEYsQ0FBQztJQUVEOzs7T0FHRztJQUNILGNBQWMsQ0FBQyxRQUFnQjtRQUM5QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2hGLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gseUJBQXlCLENBQUMsSUFBWSxFQUFFLEtBQWM7UUFDckQsSUFBSSxJQUFJ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