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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4QnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvZml4QnJhY2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUUsT0FBTyxFQUVOLFNBQVMsRUFDVCxtQ0FBbUMsRUFDbkMsVUFBVSxHQUNWLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzFFLE9BQU8sRUFBb0IsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd2RixNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLE1BQXVCLEVBQ3ZCLDRCQUEyRDtJQUUzRCxNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLEVBQVUsQ0FBQTtJQUN2RCxNQUFNLGFBQWEsR0FBRyxJQUFJLDZCQUE2QixDQUFDLGdCQUFnQixFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDeEYsNEJBQTRCLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLENBQ2pFLENBQUE7SUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLG1CQUFtQixDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQzdGLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUUxRCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUE7SUFDWixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUE7SUFFcEMsU0FBUyxXQUFXLENBQUMsSUFBYSxFQUFFLE1BQWM7UUFDakQsSUFBSSxJQUFJLENBQUMsSUFBSSw2QkFBcUIsRUFBRSxDQUFDO1lBQ3BDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFdEQsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUMvQixNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzlDLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDekIsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ3hDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLDhCQUE4QixDQUMzRSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FDOUIsQ0FBQTtnQkFFRCxNQUFNLGdCQUFnQixHQUFHLHVCQUF1QixDQUFDLG9CQUFvQixDQUNwRSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FDOUIsQ0FBQTtnQkFDRCxHQUFHLElBQUksZ0JBQWdCLENBQUE7WUFDeEIsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLGlEQUF5QyxFQUFFLENBQUM7WUFDL0QscUJBQXFCO1FBQ3RCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLDZCQUFxQixJQUFJLElBQUksQ0FBQyxJQUFJLGdDQUF3QixFQUFFLENBQUM7WUFDaEYsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQ3BCLG1DQUFtQyxDQUFDLE1BQU0sQ0FBQyxFQUMzQyxtQ0FBbUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUNuRSxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksNkJBQXFCLEVBQUUsQ0FBQztZQUMzQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDMUIsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFFN0IsT0FBTyxHQUFHLENBQUE7QUFDWCxDQUFDO0FBRUQsTUFBTSxxQkFBcUI7SUFDMUIsWUFBNkIsS0FBd0I7UUFBeEIsVUFBSyxHQUFMLEtBQUssQ0FBbUI7UUFZckQsaUJBQVksR0FBRztZQUNkLGFBQWEsRUFBRSxDQUFDLFVBQWtCLEVBQW1CLEVBQUU7Z0JBQ3RELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDbEMsQ0FBQztTQUNELENBQUE7SUFoQnVELENBQUM7SUFFekQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBQ0QsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7SUFDekIsQ0FBQztJQUNELGFBQWEsQ0FBQyxVQUFrQjtRQUMvQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sQ0FBQTtJQUMxRCxDQUFDO0NBT0QifQ==