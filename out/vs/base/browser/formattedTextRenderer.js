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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVkVGV4dFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZm9ybWF0dGVkVGV4dFJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBaUIvQixNQUFNLFVBQVUsVUFBVSxDQUFDLElBQVksRUFBRSxVQUFzQyxFQUFFO0lBQ2hGLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN0QyxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtJQUMxQixPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLGFBQXFCLEVBQ3JCLFVBQXNDLEVBQUU7SUFFeEMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3RDLG9CQUFvQixDQUNuQixPQUFPLEVBQ1Asa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFDL0QsT0FBTyxDQUFDLGFBQWEsRUFDckIsT0FBTyxDQUFDLGtCQUFrQixDQUMxQixDQUFBO0lBQ0QsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxPQUFtQztJQUNoRSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtJQUMvQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQy9DLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8s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