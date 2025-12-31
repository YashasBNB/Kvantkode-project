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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlRmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL2lnbm9yZUZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUV2RCxNQUFNLE9BQU8sVUFBVTtJQUd0QixZQUNDLFFBQWdCLEVBQ0MsUUFBZ0IsRUFDaEIsTUFBbUI7UUFEbkIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBRXBDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDNUMsTUFBTSxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQTtRQUN2RSxDQUFDO1FBQ0QsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUMzQyxRQUFRLElBQUksR0FBRyxDQUFBO1FBQ2hCLENBQUM7UUFDRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2hGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxjQUFjLENBQUMsUUFBZ0I7UUFDOUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoRixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILHlCQUF5QixDQUFDLElBQVksRUFBRSxLQUFjO1FBQ3JELElBQUksSUFBSSxDQUFD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