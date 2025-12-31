/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findNodeAtLocation, parseTree } from './json.js';
import { format, isEOL } from './jsonFormatter.js';
export function removeProperty(text, path, formattingOptions) {
    return setProperty(text, path, undefined, formattingOptions);
}
export function setProperty(text, originalPath, value, formattingOptions, getInsertionIndex) {
    const path = originalPath.slice();
    const errors = [];
    const root = parseTree(text, errors);
    let parent = undefined;
    let lastSegment = undefined;
    while (path.length > 0) {
        lastSegment = path.pop();
        parent = findNodeAtLocation(root, path);
        if (parent === undefined && value !== undefined) {
            if (typeof lastSegment === 'string') {
                value = { [lastSegment]: value };
            }
            else {
                value = [value];
            }
        }
        else {
            break;
        }
    }
    if (!parent) {
        // empty document
        if (value === undefined) {
            // delete
            return []; // property does not exist, nothing to do
        }
        return withFormatting(text, {
            offset: root ? root.offset : 0,
            length: root ? root.length : 0,
            content: JSON.stringify(value),
        }, formattingOptions);
    }
    else if (parent.type === 'object' &&
        typeof lastSegment === 'string' &&
        Array.isArray(parent.children)) {
        const existing = findNodeAtLocation(parent, [lastSegment]);
        if (existing !== undefined) {
            if (value === undefined) {
                // delete
                if (!existing.parent) {
                    throw new Error('Malformed AST');
                }
                const propertyIndex = parent.children.indexOf(existing.parent);
                let removeBegin;
                let removeEnd = existing.parent.offset + existing.parent.length;
                if (propertyIndex > 0) {
                    // remove the comma of the previous node
                    const previous = parent.children[propertyIndex - 1];
                    removeBegin = previous.offset + previous.length;
                }
                else {
                    removeBegin = parent.offset + 1;
                    if (parent.children.length > 1) {
                        // remove the comma of the next node
                        const next = parent.children[1];
                        removeEnd = next.offset;
                    }
                }
                return withFormatting(text, { offset: removeBegin, length: removeEnd - removeBegin, content: '' }, formattingOptions);
            }
            else {
                // set value of existing property
                return withFormatting(text, { offset: existing.offset, length: existing.length, content: JSON.stringify(value) }, formattingOptions);
            }
        }
        else {
            if (value === undefined) {
                // delete
                return []; // property does not exist, nothing to do
            }
            const newProperty = `${JSON.stringify(lastSegment)}: ${JSON.stringify(value)}`;
            const index = getInsertionIndex
                ? getInsertionIndex(parent.children.map((p) => p.children[0].value))
                : parent.children.length;
            let edit;
            if (index > 0) {
                const previous = parent.children[index - 1];
                edit = { offset: previous.offset + previous.length, length: 0, content: ',' + newProperty };
            }
            else if (parent.children.length === 0) {
                edit = { offset: parent.offset + 1, length: 0, content: newProperty };
            }
            else {
                edit = { offset: parent.offset + 1, length: 0, content: newProperty + ',' };
            }
            return withFormatting(text, edit, formattingOptions);
        }
    }
    else if (parent.type === 'array' &&
        typeof lastSegment === 'number' &&
        Array.isArray(parent.children)) {
        if (value !== undefined) {
            // Insert
            const newProperty = `${JSON.stringify(value)}`;
            let edit;
            if (parent.children.length === 0 || lastSegment === 0) {
                edit = {
                    offset: parent.offset + 1,
                    length: 0,
                    content: parent.children.length === 0 ? newProperty : newProperty + ',',
                };
            }
            else {
                const index = lastSegment === -1 || lastSegment > parent.children.length
                    ? parent.children.length
                    : lastSegment;
                const previous = parent.children[index - 1];
                edit = { offset: previous.offset + previous.length, length: 0, content: ',' + newProperty };
            }
            return withFormatting(text, edit, formattingOptions);
        }
        else {
            //Removal
            const removalIndex = lastSegment;
            const toRemove = parent.children[removalIndex];
            let edit;
            if (parent.children.length === 1) {
                // only item
                edit = { offset: parent.offset + 1, length: parent.length - 2, content: '' };
            }
            else if (parent.children.length - 1 === removalIndex) {
                // last item
                const previous = parent.children[removalIndex - 1];
                const offset = previous.offset + previous.length;
                const parentEndOffset = parent.offset + parent.length;
                edit = { offset, length: parentEndOffset - 2 - offset, content: '' };
            }
            else {
                edit = {
                    offset: toRemove.offset,
                    length: parent.children[removalIndex + 1].offset - toRemove.offset,
                    content: '',
                };
            }
            return withFormatting(text, edit, formattingOptions);
        }
    }
    else {
        throw new Error(`Can not add ${typeof lastSegment !== 'number' ? 'index' : 'property'} to parent of type ${parent.type}`);
    }
}
export function withFormatting(text, edit, formattingOptions) {
    // apply the edit
    let newText = applyEdit(text, edit);
    // format the new text
    let begin = edit.offset;
    let end = edit.offset + edit.content.length;
    if (edit.length === 0 || edit.content.length === 0) {
        // insert or remove
        while (begin > 0 && !isEOL(newText, begin - 1)) {
            begin--;
        }
        while (end < newText.length && !isEOL(newText, end)) {
            end++;
        }
    }
    const edits = format(newText, { offset: begin, length: end - begin }, formattingOptions);
    // apply the formatting edits and track the begin and end offsets of the changes
    for (let i = edits.length - 1; i >= 0; i--) {
        const curr = edits[i];
        newText = applyEdit(newText, curr);
        begin = Math.min(begin, curr.offset);
        end = Math.max(end, curr.offset + curr.length);
        end += curr.content.length - curr.length;
    }
    // create a single edit with all changes
    const editLength = text.length - (newText.length - end) - begin;
    return [{ offset: begin, length: editLength, content: newText.substring(begin, end) }];
}
export function applyEdit(text, edit) {
    return text.substring(0, edit.offset) + edit.content + text.substring(edit.offset + edit.length);
}
export function applyEdits(text, edits) {
    const sortedEdits = edits.slice(0).sort((a, b) => {
        const diff = a.offset - b.offset;
        if (diff === 0) {
            return a.length - b.length;
        }
        return diff;
    });
    let lastModifiedOffset = text.length;
    for (let i = sortedEdits.length - 1; i >= 0; i--) {
        const e = sortedEdits[i];
        if (e.offset + e.length <= lastModifiedOffset) {
            text = applyEdit(text, e);
        }
        else {
            throw new Error('Overlapping edit');
        }
        lastModifiedOffset = e.offset;
    }
    return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9qc29uRWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQThCLFNBQVMsRUFBVyxNQUFNLFdBQVcsQ0FBQTtBQUM5RixPQUFPLEVBQVEsTUFBTSxFQUFxQixLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUUzRSxNQUFNLFVBQVUsY0FBYyxDQUM3QixJQUFZLEVBQ1osSUFBYyxFQUNkLGlCQUFvQztJQUVwQyxPQUFPLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0FBQzdELENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUMxQixJQUFZLEVBQ1osWUFBc0IsRUFDdEIsS0FBVSxFQUNWLGlCQUFvQyxFQUNwQyxpQkFBb0Q7SUFFcEQsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2pDLE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUE7SUFDL0IsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNwQyxJQUFJLE1BQU0sR0FBcUIsU0FBUyxDQUFBO0lBRXhDLElBQUksV0FBVyxHQUF3QixTQUFTLENBQUE7SUFDaEQsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3hCLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDeEIsTUFBTSxHQUFHLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2QyxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pELElBQUksT0FB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