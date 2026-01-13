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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25JbWFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbWFya2Rvd25Db2RlYy9wYXJzZXJzL21hcmtkb3duSW1hZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBc0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRyxPQUFPLEVBR04sMEJBQTBCLEdBQzFCLE1BQU0sbUJBQW1CLENBQUE7QUFFMUI7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBR3pDO0lBVUEsWUFBWSxLQUFzQjtRQUNqQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBb0IsTUFBTTtRQUN6QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQTtRQUV4RCxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsVUFBVSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUdNLE1BQU0sQ0FBQyxLQUFtQjtRQUNoQywrRUFBK0U7UUFDL0UseUVBQXlFO1FBQ3pFLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM5QixJQUFJLEtBQUssWUFBWSxXQUFXLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksMEJBQTBCLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBRS9ELE9BQU87b0JBQ04sTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLFVBQVUsRUFBRSxJQUFJO29CQUNoQixnQkFBZ0IsRUFBRSxJQUFJO2lCQUN0QixDQUFBO1lBQ0YsQ0FBQztZQUVELE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLGdCQUFnQixFQUFFLEtBQUs7YUFDdkIsQ0FBQTtRQUNGLENBQUM7UUFFRCxnQ0FBZ0M7UUFFaEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMxRCxNQUFNLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsWUFBWSxDQUFBO1FBRWpELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxZQUFZLENBQUE7WUFFbkMsOERBQThEO1lBQzlELElBQUksVUFBVSxZQUFZLFlBQVksRUFBRSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtnQkFFdEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDeEMsT0FBTztvQkFDTixNQUFNO29CQUNOLGdCQUFnQjtvQkFDaEIsVUFBVSxFQUFFLElBQUksYUFBYSxDQUM1QixVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDaEMsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQzVCLEdBQUcsVUFBVSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQ3pDLFVBQVUsQ0FBQyxTQUFTLENBQ3BCO2lCQUNELENBQUE7WUFDRixDQUFDO1lBRUQsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUE7WUFDcEMsT0FBTztnQkFDTixNQUFNO2dCQUNOLGdCQUFnQjtnQkFDaEIsVUFBVSxFQUFFLElBQUk7YUFDaEIsQ0FBQTtRQUNGLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDdEIsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztDQUNEO0FBMURPO0lBRE4saUJBQWlCO2tEQTBEakIifQ==