/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function countChanges(changes) {
    return changes.reduce((count, change) => {
        const diff = change.diff.get();
        // When we accept some of the cell insert/delete the items might still be in the list.
        if (diff.identical) {
            return count;
        }
        switch (change.type) {
            case 'delete':
                return count + 1; // We want to see 1 deleted entry in the pill for navigation
            case 'insert':
                return count + 1; // We want to see 1 new entry in the pill for navigation
            case 'modified':
                return count + diff.changes.length;
            default:
                return count;
        }
    }, 0);
}
export function sortCellChanges(changes) {
    return [...changes].sort((a, b) => {
        // For unchanged and modified, use modifiedCellIndex
        if ((a.type === 'unchanged' || a.type === 'modified') &&
            (b.type === 'unchanged' || b.type === 'modified')) {
            return a.modifiedCellIndex - b.modifiedCellIndex;
        }
        // For delete entries, use originalCellIndex
        if (a.type === 'delete' && b.type === 'delete') {
            return a.originalCellIndex - b.originalCellIndex;
        }
        // For insert entries, use modifiedCellIndex
        if (a.type === 'insert' && b.type === 'insert') {
            return a.modifiedCellIndex - b.modifiedCellIndex;
        }
        if (a.type === 'delete' && b.type === 'insert') {
            return -1;
        }
        if (a.type === 'insert' && b.type === 'delete') {
            return 1;
        }
        if ((a.type === 'delete' && b.type !== 'insert') ||
            (a.type !== 'insert' && b.type === 'delete')) {
            return a.originalCellIndex - b.originalCellIndex;
        }
        // Mixed types: compare based on available indices
        const aIndex = a.type === 'delete'
            ? a.originalCellIndex
            : a.type === 'insert'
                ? a.modifiedCellIndex
                : a.modifiedCellIndex;
        const bIndex = b.type === 'delete'
            ? b.originalCellIndex
            : b.type === 'insert'
                ? b.modifiedCellIndex
                : b.modifiedCellIndex;
        return aIndex - bIndex;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQ2hhbmdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL25vdGVib29rQ2VsbENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUF3RGhHLE1BQU0sVUFBVSxZQUFZLENBQUMsT0FBd0I7SUFDcEQsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDOUIsc0ZBQXNGO1FBQ3RGLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JCLEtBQUssUUFBUTtnQkFDWixPQUFPLEtBQUssR0FBRyxDQUFDLENBQUEsQ0FBQyw0REFBNEQ7WUFDOUUsS0FBSyxRQUFRO2dCQUNaLE9BQU8sS0FBSyxHQUFHLENBQUMsQ0FBQSxDQUFDLHdEQUF3RDtZQUMxRSxLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7WUFDbkM7Z0JBQ0MsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDO0lBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBd0I7SUFDdkQsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2pDLG9EQUFvRDtRQUNwRCxJQUNDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUM7WUFDakQsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxFQUNoRCxDQUFDO1lBQ0YsT0FBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFBO1FBQ2pELENBQUM7UUFFRCw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hELE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUE7UUFDakQsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ1YsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFFRCxJQUNDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUM7WUFDNUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxFQUMzQyxDQUFDO1lBQ0YsT0FBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFBO1FBQ2pELENBQUM7UUFFRCxrREFBa0Q7UUFDbEQsTUFBTSxNQUFNLEdBQ1gsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRO1lBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCO1lBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVE7Z0JBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCO2dCQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFBO1FBQ3hCLE1BQU0sTUFBTSxHQUNYLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtZQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRO2dCQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtnQkFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQTtRQUV4QixPQUFPLE1BQU0sR0FBRyxNQUFNLENBQUE7SUFDdkIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDIn0=