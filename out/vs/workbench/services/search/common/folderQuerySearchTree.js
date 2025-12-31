import { TernarySearchTree, UriIterator } from '../../../../base/common/ternarySearchTree.js';
import { ResourceMap } from '../../../../base/common/map.js';
/**
 * A ternary search tree that supports URI keys and query/fragment-aware substring matching, specifically for file search.
 * This is because the traditional TST does not support query and fragments https://github.com/microsoft/vscode/issues/227836
 */
export class FolderQuerySearchTree extends TernarySearchTree {
    constructor(folderQueries, getFolderQueryInfo, ignorePathCasing = () => false) {
        const uriIterator = new UriIterator(ignorePathCasing, () => false);
        super(uriIterator);
        const fqBySameBase = new ResourceMap();
        folderQueries.forEach((fq, i) => {
            const uriWithoutQueryOrFragment = fq.folder.with({ query: '', fragment: '' });
            if (fqBySameBase.has(uriWithoutQueryOrFragment)) {
                fqBySameBase.get(uriWithoutQueryOrFragment).push({ fq, i });
            }
            else {
                fqBySameBase.set(uriWithoutQueryOrFragment, [{ fq, i }]);
            }
        });
        fqBySameBase.forEach((values, key) => {
            const folderQueriesWithQueries = new Map();
            for (const fqBases of values) {
                const folderQueryInfo = getFolderQueryInfo(fqBases.fq, fqBases.i);
                folderQueriesWithQueries.set(this.encodeKey(fqBases.fq.folder), folderQueryInfo);
            }
            super.set(key, folderQueriesWithQueries);
        });
    }
    findQueryFragmentAwareSubstr(key) {
        const baseURIResult = super.findSubstr(key.with({ query: '', fragment: '' }));
        if (!baseURIResult) {
            return undefined;
        }
        const queryAndFragmentKey = this.encodeKey(key);
        return baseURIResult.get(queryAndFragmentKey);
    }
    forEachFolderQueryInfo(fn) {
        return this.forEach((elem) => elem.forEach((mapElem) => fn(mapElem)));
    }
    encodeKey(key) {
        let str = '';
        if (key.query) {
            str += key.query;
        }
        if (key.fragment) {
            str += '#' + key.fragment;
        }
        return str;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyUXVlcnlTZWFyY2hUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vZm9sZGVyUXVlcnlTZWFyY2hUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFNUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHFCQUVYLFNBQVEsaUJBQW9EO0lBQzdELFlBQ0MsYUFBa0MsRUFDbEMsa0JBQW9FLEVBQ3BFLG1CQUEwQyxHQUFHLEVBQUUsQ0FBQyxLQUFLO1FBRXJELE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUVsQixNQUFNLFlBQVksR0FBRyxJQUFJLFdBQVcsRUFBMEMsQ0FBQTtRQUM5RSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9CLE1BQU0seUJBQXlCLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzdFLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pELFlBQVksQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUM3RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3BDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUE7WUFDbkUsS0FBSyxNQUFNLE9BQU8sSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pFLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDakYsQ0FBQztZQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsNEJBQTRCLENBQUMsR0FBUTtRQUNwQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0UsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0MsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELHNCQUFzQixDQUFDLEVBQThDO1FBQ3BFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRU8sU0FBUyxDQUFDLEdBQVE7UUFDekIsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFBO1FBQ1osSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDZixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQTtRQUNqQixDQUFDO1FBQ0QsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbEIsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFBO1FBQzFCLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7Q0FDRCJ9