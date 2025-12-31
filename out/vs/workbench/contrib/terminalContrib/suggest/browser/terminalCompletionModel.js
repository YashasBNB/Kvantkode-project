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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3Rlcm1pbmFsQ29tcGxldGlvbk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwQyxNQUFNLE9BQU8sdUJBQXdCLFNBQVEscUJBQTZDO0lBQ3pGLFlBQVksS0FBK0IsRUFBRSxXQUF3QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQ2hELENBQUM7Q0FDRDtBQUVELE1BQU0sb0JBQW9CLEdBQUcsQ0FDNUIsa0JBQTBCLEVBQzFCLENBQXlCLEVBQ3pCLENBQXlCLEVBQ3hCLEVBQUU7SUFDSCx5Q0FBeUM7SUFDekMsSUFDQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQywyQkFBMkI7UUFDNUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQ3RDLENBQUM7UUFDRixPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ1YsQ0FBQztJQUNELElBQ0MsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsMkJBQTJCO1FBQzVFLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMs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