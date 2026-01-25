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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2pzb25FZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBOEIsU0FBUyxFQUFXLE1BQU0sV0FBVyxDQUFBO0FBQzlGLE9BQU8sRUFBUSxNQUFNLEVBQXFCLEtBQUssRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTNFLE1BQU0sVUFBVSxjQUFjLENBQzdCLElBQVksRUFDWixJQUFjLEVBQ2QsaUJBQW9DO0lBRXBDLE9BQU8sV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUE7QUFDN0QsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQzFCLElBQVksRUFDWixZQUFzQixFQUN0QixLQUFVLEVBQ1YsaUJBQW9DLEVBQ3BDLGlCQUFvRDtJQUVwRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDakMsTUFBTSxNQUFNLEdBQWlCLEVBQUUsQ0FBQTtJQUMvQixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3BDLElBQUksTUFBTSxHQUFxQixTQUFTLENBQUE7SUFFeEMsSUFBSSxXQUFXLEdBQXdCLFNBQVMsQ0FBQTtJQUNoRCxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDeEIsV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUN4QixNQUFNLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLElBQUksTUFBTSxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDakQsSUFB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