/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { count } from '../../../../../base/common/strings.js';
import { SimpleCompletionModel, } from '../../../../services/suggest/browser/simpleCompletionModel.js';
import { TerminalCompletionItemKind, } from './terminalCompletionItem.js';
export class TerminalCompletionModel extends SimpleCompletionModel {
    constructor(items, lineContext) {
        super(items, lineContext, compareCompletionsFn);
    }
}
const compareCompletionsFn = (leadingLineContent, a, b) => {
    // Boost always on top inline completions
    if (a.completion.kind === TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop &&
        a.completion.kind !== b.completion.kind) {
        return -1;
    }
    if (b.completion.kind === TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop &&
        a.completion.kind !== b.completion.kind) {
        return 1;
    }
    // Sort by the score
    let score = b.score[0] - a.score[0];
    if (score !== 0) {
        return score;
    }
    // Boost inline completions
    if (a.completion.kind === TerminalCompletionItemKind.InlineSuggestion &&
        a.completion.kind !== b.completion.kind) {
        return -1;
    }
    if (b.completion.kind === TerminalCompletionItemKind.InlineSuggestion &&
        a.completion.kind !== b.completion.kind) {
        return 1;
    }
    // Sort by underscore penalty (eg. `__init__/` should be penalized)
    if (a.underscorePenalty !== b.underscorePenalty) {
        return a.underscorePenalty - b.underscorePenalty;
    }
    // Sort files of the same name by extension
    const isArg = leadingLineContent.includes(' ');
    if (!isArg &&
        a.completion.kind === TerminalCompletionItemKind.File &&
        b.completion.kind === TerminalCompletionItemKind.File) {
        // If the file name excluding the extension is different, just do a regular sort
        if (a.labelLowExcludeFileExt !== b.labelLowExcludeFileExt) {
            return a.labelLowExcludeFileExt.localeCompare(b.labelLowExcludeFileExt, undefined, {
                ignorePunctuation: true,
            });
        }
        // Then by label length ascending (excluding file extension if it's a file)
        score = a.labelLowExcludeFileExt.length - b.labelLowExcludeFileExt.length;
        if (score !== 0) {
            return score;
        }
        // If they're files at the start of the command line, boost extensions depending on the operating system
        score = fileExtScore(b.fileExtLow) - fileExtScore(a.fileExtLow);
        if (score !== 0) {
            return score;
        }
        // Then by file extension length ascending
        score = a.fileExtLow.length - b.fileExtLow.length;
        if (score !== 0) {
            return score;
        }
    }
    // Sort by more detailed completions
    if (a.completion.kind === TerminalCompletionItemKind.Method &&
        b.completion.kind === TerminalCompletionItemKind.Method) {
        if (typeof a.completion.label !== 'string' &&
            a.completion.label.description &&
            typeof b.completion.label !== 'string' &&
            b.completion.label.description) {
            score = 0;
        }
        else if (typeof a.completion.label !== 'string' && a.completion.label.description) {
            score = -2;
        }
        else if (typeof b.completion.label !== 'string' && b.completion.label.description) {
            score = 2;
        }
        score +=
            (b.completion.detail ? 1 : 0) +
                (b.completion.documentation ? 2 : 0) -
                (a.completion.detail ? 1 : 0) -
                (a.completion.documentation ? 2 : 0);
        if (score !== 0) {
            return score;
        }
    }
    // Sort by folder depth (eg. `vscode/` should come before `vscode-.../`)
    if (a.completion.kind === TerminalCompletionItemKind.Folder &&
        b.completion.kind === TerminalCompletionItemKind.Folder) {
        if (a.labelLowNormalizedPath && b.labelLowNormalizedPath) {
            // Directories
            // Count depth of path (number of / or \ occurrences)
            score = count(a.labelLowNormalizedPath, '/') - count(b.labelLowNormalizedPath, '/');
            if (score !== 0) {
                return score;
            }
            // Ensure shorter prefixes appear first
            if (b.labelLowNormalizedPath.startsWith(a.labelLowNormalizedPath)) {
                return -1; // `a` is a prefix of `b`, so `a` should come first
            }
            if (a.labelLowNormalizedPath.startsWith(b.labelLowNormalizedPath)) {
                return 1; // `b` is a prefix of `a`, so `b` should come first
            }
        }
    }
    if (a.completion.kind !== b.completion.kind) {
        // Sort by kind
        if ((a.completion.kind === TerminalCompletionItemKind.Method ||
            a.completion.kind === TerminalCompletionItemKind.Alias) &&
            b.completion.kind !== TerminalCompletionItemKind.Method &&
            b.completion.kind !== TerminalCompletionItemKind.Alias) {
            return -1; // Methods and aliases should come first
        }
        if ((b.completion.kind === TerminalCompletionItemKind.Method ||
            b.completion.kind === TerminalCompletionItemKind.Alias) &&
            a.completion.kind !== TerminalCompletionItemKind.Method &&
            a.completion.kind !== TerminalCompletionItemKind.Alias) {
            return 1; // Methods and aliases should come first
        }
        if ((a.completion.kind === TerminalCompletionItemKind.File ||
            a.completion.kind === TerminalCompletionItemKind.Folder) &&
            b.completion.kind !== TerminalCompletionItemKind.File &&
            b.completion.kind !== TerminalCompletionItemKind.Folder) {
            return 1; // Resources should come last
        }
        if ((b.completion.kind === TerminalCompletionItemKind.File ||
            b.completion.kind === TerminalCompletionItemKind.Folder) &&
            a.completion.kind !== TerminalCompletionItemKind.File &&
            a.completion.kind !== TerminalCompletionItemKind.Folder) {
            return -1; // Resources should come last
        }
    }
    // Sort alphabetically, ignoring punctuation causes dot files to be mixed in rather than
    // all at the top
    return a.labelLow.localeCompare(b.labelLow, undefined, { ignorePunctuation: true });
};
// TODO: This should be based on the process OS, not the local OS
// File score boosts for specific file extensions on Windows. This only applies when the file is the
// _first_ part of the command line.
const fileExtScores = new Map(isWindows
    ? [
        // Windows - .ps1 > .exe > .bat > .cmd. This is the command precedence when running the files
        //           without an extension, tested manually in pwsh v7.4.4
        ['ps1', 0.09],
        ['exe', 0.08],
        ['bat', 0.07],
        ['cmd', 0.07],
        ['msi', 0.06],
        ['com', 0.06],
        // Non-Windows
        ['sh', -0.05],
        ['bash', -0.05],
        ['zsh', -0.05],
        ['fish', -0.05],
        ['csh', -0.06], // C shell
        ['ksh', -0.06], // Korn shell
        // Scripting language files are excluded here as the standard behavior on Windows will just open
        // the file in a text editor, not run the file
    ]
    : [
        // Pwsh
        ['ps1', 0.05],
        // Windows
        ['bat', -0.05],
        ['cmd', -0.05],
        ['exe', -0.05],
        // Non-Windows
        ['sh', 0.05],
        ['bash', 0.05],
        ['zsh', 0.05],
        ['fish', 0.05],
        ['csh', 0.04], // C shell
        ['ksh', 0.04], // Korn shell
        // Scripting languages
        ['py', 0.05], // Python
        ['pl', 0.05], // Perl
    ]);
function fileExtScore(ext) {
    return fileExtScores.get(ext) || 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLDZCQUE2QixDQUFBO0FBRXBDLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxxQkFBNkM7SUFDekYsWUFBWSxLQUErQixFQUFFLFdBQXdCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDaEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBb0IsR0FBRyxDQUM1QixrQkFBMEIsRUFDMUIsQ0FBeUIsRUFDekIsQ0FBeUIsRUFDeEIsRUFBRTtJQUNILHlDQUF5QztJQUN6QyxJQUNDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLDJCQUEyQjtRQUM1RSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFDdEMsQ0FBQztRQUNGLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDVixDQUFDO0lBQ0QsSUFDQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQywyQkFBMkI7UUFDNUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUss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