/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NKeyMap } from '../../../../base/common/map.js';
export class DecorationStyleCache {
    constructor() {
        this._nextId = 1;
        this._cacheById = new Map();
        this._cacheByStyle = new NKeyMap();
    }
    getOrCreateEntry(color, bold, opacity) {
        if (color === undefined && bold === undefined && opacity === undefined) {
            return 0;
        }
        const result = this._cacheByStyle.get(color ?? 0, bold ? 1 : 0, opacity === undefined ? '' : opacity.toFixed(2));
        if (result) {
            return result.id;
        }
        const id = this._nextId++;
        const entry = {
            id,
            color,
            bold,
            opacity,
        };
        this._cacheById.set(id, entry);
        this._cacheByStyle.set(entry, color ?? 0, bold ? 1 : 0, opacity === undefined ? '' : opacity.toFixed(2));
        return id;
    }
    getStyleSet(id) {
        if (id === 0) {
            return undefined;
        }
        return this._cacheById.get(id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblN0eWxlQ2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9jc3MvZGVjb3JhdGlvblN0eWxlQ2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBd0J4RCxNQUFNLE9BQU8sb0JBQW9CO0lBQWpDO1FBQ1MsWUFBTyxHQUFHLENBQUMsQ0FBQTtRQUVGLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQTtRQUMxRCxrQkFBYSxHQUFHLElBQUksT0FBTyxFQUd6QyxDQUFBO0lBeUNKLENBQUM7SUF2Q0EsZ0JBQWdCLENBQ2YsS0FBeUIsRUFDekIsSUFBeUIsRUFDekIsT0FBMkI7UUFFM0IsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxTQUFTLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hFLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUNwQyxLQUFLLElBQUksQ0FBQyxFQUNWLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ1osT0FBTyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUMvQyxDQUFBO1FBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3pCLE1BQU0sS0FBSyxHQUFHO1lBQ2IsRUFBRTtZQUNGLEtBQUs7WUFDTCxJQUFJO1lBQ0osT0FBTztTQUNQLENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQ3JCLEtBQUssRUFDTCxLQUFLLElBQUksQ0FBQyxFQUNWLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ1osT0FBTyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUMvQyxDQUFBO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsV0FBVyxDQUFDLEVBQVU7UUFDckIsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDZCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMvQixDQUFDO0NBQ0QifQ==