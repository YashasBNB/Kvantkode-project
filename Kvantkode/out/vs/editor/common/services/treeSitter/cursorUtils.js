export function gotoNextSibling(newCursor, oldCursor) {
    const n = newCursor.gotoNextSibling();
    const o = oldCursor.gotoNextSibling();
    if (n !== o) {
        throw new Error('Trees are out of sync');
    }
    return n && o;
}
export function gotoParent(newCursor, oldCursor) {
    const n = newCursor.gotoParent();
    const o = oldCursor.gotoParent();
    if (n !== o) {
        throw new Error('Trees are out of sync');
    }
    return n && o;
}
export function gotoNthChild(newCursor, oldCursor, index) {
    const n = newCursor.gotoFirstChild();
    const o = oldCursor.gotoFirstChild();
    if (n !== o) {
        throw new Error('Trees are out of sync');
    }
    if (index === 0) {
        return n && o;
    }
    for (let i = 1; i <= index; i++) {
        const nn = newCursor.gotoNextSibling();
        const oo = oldCursor.gotoNextSibling();
        if (nn !== oo) {
            throw new Error('Trees are out of sync');
        }
        if (!nn || !oo) {
            return false;
        }
    }
    return n && o;
}
export function nextSiblingOrParentSibling(newCursor, oldCursor) {
    do {
        if (newCursor.currentNode.nextSibling) {
            return gotoNextSibling(newCursor, oldCursor);
        }
        if (newCursor.currentNode.parent) {
            gotoParent(newCursor, oldCursor);
        }
    } while (newCursor.currentNode.nextSibling || newCursor.currentNode.parent);
    return false;
}
export function getClosestPreviousNodes(cursor, tree) {
    // Go up parents until the end of the parent is before the start of the current.
    const findPrev = tree.walk();
    findPrev.resetTo(cursor);
    const startingNode = cursor.currentNode;
    do {
        if (findPrev.currentNode.previousSibling &&
            findPrev.currentNode.endIndex - findPrev.currentNode.startIndex !== 0) {
            findPrev.gotoPreviousSibling();
        }
        else {
            while (!findPrev.currentNode.previousSibling && findPrev.currentNode.parent) {
                findPrev.gotoParent();
            }
            findPrev.gotoPreviousSibling();
        }
    } while (findPrev.currentNode.endIndex > startingNode.startIndex &&
        (findPrev.currentNode.parent || findPrev.currentNode.previousSibling) &&
        findPrev.currentNode.id !== startingNode.id);
    if (findPrev.currentNode.id !== startingNode.id &&
        findPrev.currentNode.endIndex <= startingNode.startIndex) {
        return findPrev.currentNode;
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdHJlZVNpdHRlci9jdXJzb3JVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxNQUFNLFVBQVUsZUFBZSxDQUFDLFNBQTRCLEVBQUUsU0FBNEI7SUFDekYsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ3JDLE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsU0FBNEIsRUFBRSxTQUE0QjtJQUNwRixNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDaEMsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FDM0IsU0FBNEIsRUFDNUIsU0FBNEIsRUFDNUIsS0FBYTtJQUViLE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUNwQyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7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