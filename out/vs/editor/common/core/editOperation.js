/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from './range.js';
export class EditOperation {
    static insert(position, text) {
        return {
            range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: text,
            forceMoveMarkers: true,
        };
    }
    static delete(range) {
        return {
            range: range,
            text: null,
        };
    }
    static replace(range, text) {
        return {
            range: range,
            text: text,
        };
    }
    static replaceMove(range, text) {
        return {
            range: range,
            text: text,
            forceMoveMarkers: true,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdE9wZXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL2VkaXRPcGVyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQTtBQXNCMUMsTUFBTSxPQUFPLGFBQWE7SUFDbEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFrQixFQUFFLElBQVk7UUFDcEQsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzVGLElBQUksRUFBRSxJQUFJO1lBQ1YsZ0JBQWdCLEVBQUUsSUFBSTtTQUN0QixDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBWTtRQUNoQyxPQUFPO1lBQ04sS0FBSyxFQUFFLEtBQUs7WUFDWixJQUFJLEVBQUUsSUFBSTtTQUNWLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFZLEVBQUUsSUFBbUI7UUFDdEQsT0FBTztZQUNOLEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7U0FDVixDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBWSxFQUFFLElBQW1CO1FBQzFELE9BQU87WUFDTixLQUFLLEVBQUUsS0FBSztZQUNaLElBQUksRUFBRSxJQUFJO1lBQ1YsZ0JBQWdCLEVBQUUsSUFBSTtTQUN0QixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=