/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const editorFeatures = [];
/**
 * Registers an editor feature. Editor features will be instantiated only once, as soon as
 * the first code editor is instantiated.
 */
export function registerEditorFeature(ctor) {
    editorFeatures.push(ctor);
}
export function getEditorFeatures() {
    return editorFeatures.slice(0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZWRpdG9yRmVhdHVyZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFnQmhHLE1BQU0sY0FBYyxHQUF3QixFQUFFLENBQUE7QUFFOUM7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUFvQyxJQUV4RTtJQUNBLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBeUIsQ0FBQyxDQUFBO0FBQy9DLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCO0lBQ2hDLE9BQU8sY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUMvQixDQUFDIn0=