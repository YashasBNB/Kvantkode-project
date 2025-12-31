/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class AbstractSignService {
    constructor() {
        this.validators = new Map();
    }
    static { this._nextId = 1; }
    async createNewMessage(value) {
        try {
            const validator = await this.getValidator();
            if (validator) {
                const id = String(AbstractSignService._nextId++);
                this.validators.set(id, validator);
                return {
                    id: id,
                    data: validator.createNewMessage(value),
                };
            }
        }
        catch (e) {
            // ignore errors silently
        }
        return { id: '', data: value };
    }
    async validate(message, value) {
        if (!message.id) {
            return true;
        }
        const validator = this.validators.get(message.id);
        if (!validator) {
            return false;
        }
        this.validators.delete(message.id);
        try {
            return validator.validate(value) === 'ok';
        }
        catch (e) {
            // ignore errors silently
            return false;
        }
        finally {
            validator.dispose?.();
        }
    }
    async sign(value) {
        try {
            return await this.signValue(value);
        }
        catch (e) {
            // ignore errors silently
        }
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTaWduU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3NpZ24vY29tbW9uL2Fic3RyYWN0U2lnblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFjaEcsTUFBTSxPQUFnQixtQkFBbUI7SUFBekM7UUFJa0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFBO0lBa0RoRSxDQUFDO2FBbkRlLFlBQU8sR0FBRyxDQUFDLEFBQUosQ0FBSTtJQU1uQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBYTtRQUMxQyxJQUFJLENBQUM7WUFDSixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUMzQyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO2dCQUNoRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ2xDLE9BQU87b0JBQ04sRUFBRSxFQUFFLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7aUJBQ3ZDLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWix5QkFBeUI7UUFDMUIsQ0FBQztRQUNELE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFpQixFQUFFLEtBQWE7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUM7WUFDSixPQUFPLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFBO1FBQzFDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1oseUJBQXlCO1lBQ3pCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDdkIsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWix5QkFBeUI7UUFDMUIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQyJ9