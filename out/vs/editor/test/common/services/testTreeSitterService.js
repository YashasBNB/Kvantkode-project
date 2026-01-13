/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
export class TestTreeSitterParserService {
    constructor() {
        this.onDidUpdateTree = Event.None;
        this.onDidAddLanguage = Event.None;
    }
    getLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    getTreeSync(content, languageId) {
        throw new Error('Method not implemented.');
    }
    async getTextModelTreeSitter(model, parseImmediately) {
        throw new Error('Method not implemented.');
    }
    getTree(content, languageId) {
        throw new Error('Method not implemented.');
    }
    getOrInitLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    waitForLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    getParseResult(textModel) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRyZWVTaXR0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvdGVzdFRyZWVTaXR0ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVF4RCxNQUFNLE9BQU8sMkJBQTJCO0lBQXhDO1FBZ0JDLG9CQUFlLEdBQTJCLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDcEQscUJBQWdCLEdBQXFELEtBQUssQ0FBQyxJQUFJLENBQUE7SUFXaEYsQ0FBQztJQTNCQSxXQUFXLENBQUMsVUFBa0I7UUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxXQUFXLENBQUMsT0FBZSxFQUFFLFVBQWtCO1FBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsS0FBSyxDQUFDLHNCQUFzQixDQUMzQixLQUFpQixFQUNqQixnQkFBMEI7UUFFMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxPQUFPLENBQUMsT0FBZSxFQUFFLFVBQWtCO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBSUQsaUJBQWlCLENBQUMsVUFBa0I7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxlQUFlLENBQUMsVUFBa0I7UUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxjQUFjLENBQUMsU0FBcUI7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRCJ9