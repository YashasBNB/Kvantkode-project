/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from './dom.js';
export function renderText(text, options = {}) {
    const element = createElement(options);
    element.textContent = text;
    return element;
}
export function renderFormattedText(formattedText, options = {}) {
    const element = createElement(options);
    _renderFormattedText(element, parseFormattedText(formattedText, !!options.renderCodeSegments), options.actionHandler, options.renderCodeSegments);
    return element;
}
export function createElement(options) {
    const tagName = options.inline ? 'span' : 'div';
    const element = document.createElement(tagName);
    if (options.className) {
        element.className = options.className;
    }
    return element;
}
class StringStream {
    constructor(source) {
        this.source = source;
        this.index = 0;
    }
    eos() {
        return this.index >= this.source.length;
    }
    next() {
        const next = this.peek();
        this.advance();
        return next;
    }
    peek() {
        return this.source[this.index];
    }
    advance() {
        this.index++;
    }
}
var FormatType;
(function (FormatType) {
    FormatType[FormatType["Invalid"] = 0] = "Invalid";
    FormatType[FormatType["Root"] = 1] = "Root";
    FormatType[FormatType["Text"] = 2] = "Text";
    FormatType[FormatType["Bold"] = 3] = "Bold";
    FormatType[FormatType["Italics"] = 4] = "Italics";
    FormatType[FormatType["Action"] = 5] = "Action";
    FormatType[FormatType["ActionClose"] = 6] = "ActionClose";
    FormatType[FormatType["Code"] = 7] = "Code";
    FormatType[FormatType["NewLine"] = 8] = "NewLine";
})(FormatType || (FormatType = {}));
function _renderFormattedText(element, treeNode, actionHandler, renderCodeSegments) {
    let child;
    if (treeNode.type === 2 /* FormatType.Text */) {
        child = document.createTextNode(treeNode.content || '');
    }
    else if (treeNode.type === 3 /* FormatType.Bold */) {
        child = document.createElement('b');
    }
    else if (treeNode.type === 4 /* FormatType.Italics */) {
        child = document.createElement('i');
    }
    else if (treeNode.type === 7 /* FormatType.Code */ && renderCodeSegments) {
        child = document.createElement('code');
    }
    else if (treeNode.type === 5 /* FormatType.Action */ && actionHandler) {
        const a = document.createElement('a');
        actionHandler.disposables.add(DOM.addStandardDisposableListener(a, 'click', (event) => {
            actionHandler.callback(String(treeNode.index), event);
        }));
        child = a;
    }
    else if (treeNode.type === 8 /* FormatType.NewLine */) {
        child = document.createElement('br');
    }
    else if (treeNode.type === 1 /* FormatType.Root */) {
        child = element;
    }
    if (child && element !== child) {
        element.appendChild(child);
    }
    if (child && Array.isArray(treeNode.children)) {
        treeNode.children.forEach((nodeChild) => {
            _renderFormattedText(child, nodeChild, actionHandler, renderCodeSegments);
        });
    }
}
function parseFormattedText(content, parseCodeSegments) {
    const root = {
        type: 1 /* FormatType.Root */,
        children: [],
    };
    let actionViewItemIndex = 0;
    let current = root;
    const stack = [];
    const stream = new StringStream(content);
    while (!stream.eos()) {
        let next = stream.next();
        const isEscapedFormatType = next === '\\' && formatTagType(stream.peek(), parseCodeSegments) !== 0 /* FormatType.Invalid */;
        if (isEscapedFormatType) {
            next = stream.next(); // unread the backslash if it escapes a format tag type
        }
        if (!isEscapedFormatType && isFormatTag(next, parseCodeSegments) && next === stream.peek()) {
            stream.advance();
            if (current.type === 2 /* FormatType.Text */) {
                current = stack.pop();
            }
            const type = formatTagType(next, parseCodeSegments);
            if (current.type === type ||
                (current.type === 5 /* FormatType.Action */ && type === 6 /* FormatType.ActionClose */)) {
                current = stack.pop();
            }
            else {
                const newCurrent = {
                    type: type,
                    children: [],
                };
                if (type === 5 /* FormatType.Action */) {
                    newCurrent.index = actionViewItemIndex;
                    actionViewItemIndex++;
                }
                current.children.push(newCurrent);
                stack.push(current);
                current = newCurrent;
            }
        }
        else if (next === '\n') {
            if (current.type === 2 /* FormatType.Text */) {
                current = stack.pop();
            }
            current.children.push({
                type: 8 /* FormatType.NewLine */,
            });
        }
        else {
            if (current.type !== 2 /* FormatType.Text */) {
                const textCurrent = {
                    type: 2 /* FormatType.Text */,
                    content: next,
                };
                current.children.push(textCurrent);
                stack.push(current);
                current = textCurrent;
            }
            else {
                current.content += next;
            }
        }
    }
    if (current.type === 2 /* FormatType.Text */) {
        current = stack.pop();
    }
    if (stack.length) {
        // incorrectly formatted string literal
    }
    return root;
}
function isFormatTag(char, supportCodeSegments) {
    return formatTagType(char, supportCodeSegments) !== 0 /* FormatType.Invalid */;
}
function formatTagType(char, supportCodeSegments) {
    switch (char) {
        case '*':
            return 3 /* FormatType.Bold */;
        case '_':
            return 4 /* FormatType.Italics */;
        case '[':
            return 5 /* FormatType.Action */;
        case ']':
            return 6 /* FormatType.ActionClose */;
        case '`':
            return supportCodeSegments ? 7 /* FormatType.Code */ : 0 /* FormatType.Invalid */;
        default:
            return 0 /* FormatType.Invalid */;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVkVGV4dFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2Zvcm1hdHRlZFRleHRSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQWlCL0IsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFZLEVBQUUsVUFBc0MsRUFBRTtJQUNoRixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDdEMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7SUFDMUIsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxhQUFxQixFQUNyQixVQUFzQyxFQUFFO0lBRXhDLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN0QyxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEVBQy9ELE9BQU8sQ0FBQyxhQUFhLEVBQ3JCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FDMUIsQ0FBQTtJQUNELE9BQU8sT0FBTyxDQUFBO0FBQ2YsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsT0FBbUM7SUFDaEUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDL0MsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMvQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN2QixPQUFPLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FB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