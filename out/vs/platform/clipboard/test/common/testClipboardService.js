/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TestClipboardService {
    constructor() {
        this.text = undefined;
        this.findText = undefined;
        this.resources = undefined;
    }
    readImage() {
        throw new Error('Method not implemented.');
    }
    async writeText(text, type) {
        this.text = text;
    }
    async readText(type) {
        return this.text ?? '';
    }
    async readFindText() {
        return this.findText ?? '';
    }
    async writeFindText(text) {
        this.findText = text;
    }
    async writeResources(resources) {
        this.resources = resources;
    }
    async readResources() {
        return this.resources ?? [];
    }
    async hasResources() {
        return Array.isArray(this.resources) && this.resources.length > 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENsaXBib2FyZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jbGlwYm9hcmQvdGVzdC9jb21tb24vdGVzdENsaXBib2FyZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxPQUFPLG9CQUFvQjtJQUFqQztRQU9TLFNBQUksR0FBdUIsU0FBUyxDQUFBO1FBVXBDLGFBQVEsR0FBdUIsU0FBUyxDQUFBO1FBVXhDLGNBQVMsR0FBc0IsU0FBUyxDQUFBO0lBYWpELENBQUM7SUF2Q0EsU0FBUztRQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBTUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFZLEVBQUUsSUFBYTtRQUMxQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFhO1FBQzNCLE9BQU8sSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUlELEtBQUssQ0FBQyxZQUFZO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBWTtRQUMvQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtJQUNyQixDQUFDO0lBSUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFnQjtRQUNwQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWE7UUFDbEIsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVk7UUFDakIsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDbEUsQ0FBQztDQUNEIn0=