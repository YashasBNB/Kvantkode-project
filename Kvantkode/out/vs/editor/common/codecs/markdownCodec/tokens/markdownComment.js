/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { assert } from '../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown comment` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownComment extends MarkdownToken {
    constructor(range, text) {
        assert(text.startsWith('<!--'), `The comment must start with '<!--', got '${text.substring(0, 10)}'.`);
        super(range);
        this.text = text;
    }
    /**
     * Whether the comment has an end comment marker `-->`.
     */
    get hasEndMarker() {
        return this.text.endsWith('-->');
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.sameRange(other.range)) {
            return false;
        }
        if (!(other instanceof MarkdownComment)) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-comment("${this.text}")${this.range}`;
    }
}
