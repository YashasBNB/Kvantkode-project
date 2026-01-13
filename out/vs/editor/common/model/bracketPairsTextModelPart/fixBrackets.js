/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LanguageAgnosticBracketTokens } from './bracketPairsTree/brackets.js';
import { lengthAdd, lengthGetColumnCountIfZeroLineCount, lengthZero, } from './bracketPairsTree/length.js';
import { parseDocument } from './bracketPairsTree/parser.js';
import { DenseKeyProvider } from './bracketPairsTree/smallImmutableSet.js';
import { TextBufferTokenizer } from './bracketPairsTree/tokenizer.js';
export function fixBracketsInLine(tokens, languageConfigurationService) {
    const denseKeyProvider = new DenseKeyProvider();
    const bracketTokens = new LanguageAgnosticBracketTokens(denseKeyProvider, (languageId) => languageConfigurationService.getLanguageConfiguration(languageId));
    const tokenizer = new TextBufferTokenizer(new StaticTokenizerSource([tokens]), bracketTokens);
    const node = parseDocument(tokenizer, [], undefined, true);
    let str = '';
    const line = tokens.getLineContent();
    function processNode(node, offset) {
        if (node.kind === 2 /* AstNodeKind.Pair */) {
            processNode(node.openingBracket, offset);
            offset = lengthAdd(offset, node.openingBracket.length);
            if (node.child) {
                processNode(node.child, offset);
                offset = lengthAdd(offset, node.child.length);
            }
            if (node.closingBracket) {
                processNode(node.closingBracket, offset);
                offset = lengthAdd(offset, node.closingBracket.length);
            }
            else {
                const singleLangBracketTokens = bracketTokens.getSingleLanguageBracketTokens(node.openingBracket.languageId);
                const closingTokenText = singleLangBracketTokens.findClosingTokenText(node.openingBracket.bracketIds);
                str += closingTokenText;
            }
        }
        else if (node.kind === 3 /* AstNodeKind.UnexpectedClosingBracket */) {
            // remove the bracket
        }
        else if (node.kind === 0 /* AstNodeKind.Text */ || node.kind === 1 /* AstNodeKind.Bracket */) {
            str += line.substring(lengthGetColumnCountIfZeroLineCount(offset), lengthGetColumnCountIfZeroLineCount(lengthAdd(offset, node.length)));
        }
        else if (node.kind === 4 /* AstNodeKind.List */) {
            for (const child of node.children) {
                processNode(child, offset);
                offset = lengthAdd(offset, child.length);
            }
        }
    }
    processNode(node, lengthZero);
    return str;
}
class StaticTokenizerSource {
    constructor(lines) {
        this.lines = lines;
        this.tokenization = {
            getLineTokens: (lineNumber) => {
                return this.lines[lineNumber - 1];
            },
        };
    }
    getValue() {
        return this.lines.map((l) => l.getLineContent()).join('\n');
    }
    getLineCount() {
        return this.lines.length;
    }
    getLineLength(lineNumber) {
        return this.lines[lineNumber - 1].getLineContent().length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4QnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9maXhCcmFja2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sU0FBUyxFQUNULG1DQUFtQyxFQUNuQyxVQUFVLEdBQ1YsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDMUUsT0FBTyxFQUFvQixtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3ZGLE1BQU0sVUFBVSxpQkFBaUIsQ0FDaEMsTUFBdUIsRUFDdkIsNEJBQTJEO0lBRTNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBVSxDQUFBO0lBQ3ZELE1BQU0sYUFBYSxHQUFHLElBQUksNkJBQTZCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUN4Riw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FDakUsQ0FBQTtJQUNELE1BQU0sU0FBUyxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDN0YsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBRTFELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtJQUNa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