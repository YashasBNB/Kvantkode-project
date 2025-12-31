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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQ2hhbmdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9ub3RlYm9va0NlbGxDaGFuZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBd0RoRyxNQUFNLFVBQVUsWUFBWSxDQUFDLE9BQXdCO0lBQ3BELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN2QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzlCLHNGQUFzRjtRQUN0RixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxRQUFRLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixLQUFLLFFBQVE7Z0JBQ1osT0FBTyxLQUFLLEdBQUcsQ0FBQyxDQUFBLENBQUMsNERBQTREO1lBQzlFLEtBQUssUUFBUTtnQkFDWixPQUFPLEtBQUssR0FBRyxDQUFDLENBQUEsQ0FBQyx3REFBd0Q7WUFDMUUsS0FBSyxVQUFVO2dCQUNkLE9BQU8sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFBO1lBQ25DO2dCQUNDLE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQztJQUNGLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUFDLE9BQXdCO0lBQ3ZELE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNqQyxvREFBb0Q7UUFDcEQsSUFDQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDO1lBQ2pELENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsRUFDaEQsQ0FBQztZQUNGLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUE7UUFDakQsQ0FBQztRQUVELDRDQUE0QztRQUM1QyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFBO1FBQ2pELENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBRUQsSUFDQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDO1lBQzVDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsRUFDM0MsQ0FBQztZQUNGLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELE1BQU0sTUFBTSxHQUNYLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtZQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRO2dCQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtnQkFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQTtRQUN4QixNQUFNLE1BQU0sR0FDWCxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7WUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUTtnQkFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7Z0JBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUE7UUFFeEIsT0FBTyxNQUFNLEdBQUcsTUFBTSxDQUFBO0lBQ3ZCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9