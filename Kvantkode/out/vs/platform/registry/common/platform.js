/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as Assert from '../../../base/common/assert.js';
import * as Types from '../../../base/common/types.js';
class RegistryImpl {
    constructor() {
        this.data = new Map();
    }
    add(id, data) {
        Assert.ok(Types.isString(id));
        Assert.ok(Types.isObject(data));
        Assert.ok(!this.data.has(id), 'There is already an extension with this id');
        this.data.set(id, data);
    }
    knows(id) {
        return this.data.has(id);
    }
    as(id) {
        return this.data.get(id) || null;
    }
}
export const Registry = new RegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlZ2lzdHJ5L2NvbW1vbi9wbGF0Zm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxLQUFLLE1BQU0sK0JBQStCLENBQUE7QUF3QnRELE1BQU0sWUFBWTtJQUFsQjtRQUNrQixTQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQTtJQWlCL0MsQ0FBQztJQWZPLEdBQUcsQ0FBQyxFQUFVLEVBQUUsSUFBUztRQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsNENBQTRDLENBQUMsQ0FBQTtRQUUzRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVNLEtBQUssQ0FBQyxFQUFVO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVNLEVBQUUsQ0FBQyxFQUFVO1FBQ25CLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFBO0lBQ2pDLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBYyxJQUFJLFlBQVksRUFBRSxDQUFBIn0=