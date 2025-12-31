/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptVariableWithData } from './promptVariable.js';
import { assert } from '../../../../../../../base/common/assert.js';
/**
 * Name of the variable.
 */
const VARIABLE_NAME = 'file';
/**
 * Object represents a file reference token inside a chatbot prompt.
 */
export class FileReference extends PromptVariableWithData {
    constructor(range, path) {
        super(range, VARIABLE_NAME, path);
        this.path = path;
    }
    /**
     * Create a {@link FileReference} from a {@link PromptVariableWithData} instance.
     * @throws if variable name is not equal to {@link VARIABLE_NAME}.
     */
    static from(variable) {
        assert(variable.name === VARIABLE_NAME, `Variable name must be '${VARIABLE_NAME}', got '${variable.name}'.`);
        return new FileReference(variable.range, variable.data);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (other instanceof FileReference === false) {
            return false;
        }
        return super.equals(other);
    }
    /**
     * Get the range of the `link` part of the token (e.g.,
     * the `/path/to/file.md` part of `#file:/path/to/file.md`).
     */
    get linkRange() {
        return super.dataRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL2ZpbGVSZWZlcmVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBSW5FOztHQUVHO0FBQ0gsTUFBTSxhQUFhLEdBQVcsTUFBTSxDQUFBO0FBRXBDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxzQkFBc0I7SUFDeEQsWUFDQyxLQUFZLEVBQ0ksSUFBWTtRQUU1QixLQUFLLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUZqQixTQUFJLEdBQUosSUFBSSxDQUFRO0lBRzdCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQWdDO1FBQ2xELE1BQU0sQ0FDTCxRQUFRLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFDL0IsMEJBQTBCLGFBQWEsV0FBVyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQ25FLENBQUE7UUFFRCxPQUFPLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFRDs7T0FFRztJQUNhLE1BQU0sQ0FBc0IsS0FBUTtRQUNuRCxJQUFJLEtBQUssWUFBWSxhQUFhLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDOUMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFBO0lBQ3ZCLENBQUM7Q0FDRCJ9