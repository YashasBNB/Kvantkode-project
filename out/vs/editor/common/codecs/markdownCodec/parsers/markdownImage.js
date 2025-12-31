/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MarkdownLink } from '../tokens/markdownLink.js';
import { MarkdownImage } from '../tokens/markdownImage.js';
import { LeftBracket } from '../../simpleCodec/tokens/brackets.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
import { PartialMarkdownLinkCaption, } from './markdownLink.js';
/**
 * The parser responsible for parsing the `markdown image` sequence of characters.
 * E.g., `![alt text](./path/to/image.jpeg)` syntax.
 */
export class PartialMarkdownImage extends ParserBase {
    constructor(token) {
        super([token]);
    }
    /**
     * Get all currently available tokens of the `markdown link` sequence.
     */
    get tokens() {
        const linkTokens = this.markdownLinkParser?.tokens ?? [];
        return [...this.currentTokens, ...linkTokens];
    }
    accept(token) {
        // on the first call we expect a character that begins `markdown link` sequence
        // hence we initiate the markdown link parsing process, otherwise we fail
        if (!this.markdownLinkParser) {
            if (token instanceof LeftBracket) {
                this.markdownLinkParser = new PartialMarkdownLinkCaption(token);
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // handle subsequent tokens next
        const acceptResult = this.markdownLinkParser.accept(token);
        const { result, wasTokenConsumed } = acceptResult;
        if (result === 'success') {
            const { nextParser } = acceptResult;
            // if full markdown link was parsed out, the process completes
            if (nextParser instanceof MarkdownLink) {
                this.isConsumed = true;
                const firstToken = this.currentTokens[0];
                return {
                    result,
                    wasTokenConsumed,
                    nextParser: new MarkdownImage(firstToken.range.startLineNumber, firstToken.range.startColumn, `${firstToken.text}${nextParser.caption}`, nextParser.reference),
                };
            }
            // otherwise save new link parser reference and continue
            this.markdownLinkParser = nextParser;
            return {
                result,
                wasTokenConsumed,
                nextParser: this,
            };
        }
        // return the failure result
        this.isConsumed = true;
        return acceptResult;
    }
}
__decorate([
    assertNotConsumed
], PartialMarkdownImage.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25JbWFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL21hcmtkb3duQ29kZWMvcGFyc2Vycy9tYXJrZG93bkltYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQXNCLE1BQU0saUNBQWlDLENBQUE7QUFDbkcsT0FBTyxFQUdOLDBCQUEwQixHQUMxQixNQUFNLG1CQUFtQixDQUFBO0FBRTFCOzs7R0FHRztBQUNILE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUd6QztJQVVBLFlBQVksS0FBc0I7UUFDakMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUNmLENBQUM7SUFFRDs7T0FFRztJQUNILElBQW9CLE1BQU07UUFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sSUFBSSxFQUFFLENBQUE7UUFFeEQsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLFVBQVUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFHTSxNQUFNLENBQUMsS0FBbUI7UUFDaEMsK0VBQStFO1FBQy9FLHlFQUF5RTtRQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsSUFBSSxLQUFLLFlBQVksV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUUvRCxPQUFPO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtpQkFDdEIsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixnQkFBZ0IsRUFBRSxLQUFLO2FBQ3ZCLENBQUE7UUFDRixDQUFDO1FBRUQsZ0NBQWdDO1FBRWhDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUQsTUFBTSxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLFlBQVksQ0FBQTtRQUVqRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsWUFBWSxDQUFBO1lBRW5DLDhEQUE4RDtZQUM5RCxJQUFJLFVBQVUsWUFBWSxZQUFZLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7Z0JBRXRCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hDLE9BQU87b0JBQ04sTUFBTTtvQkFDTixnQkFBZ0I7b0JBQ2hCLFVBQVUsRUFBRSxJQUFJLGFBQWEsQ0FDNUIsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ2hDLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUM1QixHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUN6QyxVQUFVLENBQUMsU0FBUyxDQUNwQjtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELHdEQUF3RDtZQUN4RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsVUFBVSxDQUFBO1lBQ3BDLE9BQU87Z0JBQ04sTUFBTTtnQkFDTixnQkFBZ0I7Z0JBQ2hCLFVBQVUsRUFBRSxJQUFJO2FBQ2hCLENBQUE7UUFDRixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7Q0FDRDtBQTFETztJQUROLGlCQUFpQjtrREEwRGpCIn0=