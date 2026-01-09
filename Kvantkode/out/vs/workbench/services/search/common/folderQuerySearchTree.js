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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyUXVlcnlTZWFyY2hUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9mb2xkZXJRdWVyeVNlYXJjaFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUU1RDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8scUJBRVgsU0FBUSxpQkFBb0Q7SUFDN0QsWUFDQyxhQUFrQyxFQUNsQyxrQkFBb0UsRUFDcEUsbUJBQTBDLEdBQUcsRUFBRSxDQUFDLEtBQUs7UUFFckQsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRWxCLE1BQU0sWUFBWSxHQUFHLElBQUksV0FBVyxFQUEwQyxDQUFBO1FBQzlFLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDL0IsTUFBTSx5QkFBeUIsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDN0UsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQztnQkFDakQsWUFBWSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzdELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDcEMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQTtZQUNuRSxLQUFLLE1BQU0sT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDakUsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUNqRixDQUFDO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxHQUFRO1FBQ3BDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQyxPQUFPLGFBQWEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsRUFBOEM7UUFDcEUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFTyxTQUFTLENBQUMsR0FBUTtRQUN6QixJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDWixJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNmLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQixHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUE7UUFDMUIsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztDQUNEIn0=