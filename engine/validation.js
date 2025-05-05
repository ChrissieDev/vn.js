/**
 * Mini Schema Validator (inspired by Joi/Zod)
 * No dependencies. Provides basic type and constraint validation.
 */

const Types = {
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    OBJECT: 'object',
    ARRAY: 'array',
    NULL: 'null',
    UNDEFINED: 'undefined',
    ANY: 'any',
    LITERAL: 'literal',
    ENUM: 'enum'
};

function checkType(value, expectedType) {
    const actualType = typeof value;

    switch (expectedType) {
        case Types.STRING:
            return actualType === 'string';
        case Types.NUMBER:
            return actualType === 'number' && Number.isFinite(value);
        case Types.BOOLEAN:
            return actualType === 'boolean';
        case Types.NULL:
            return value === null;
        case Types.ARRAY:
            return Array.isArray(value);
        case Types.OBJECT:
            return value !== null && !Array.isArray(value) && actualType === 'object';
        case Types.UNDEFINED:
            return actualType === 'undefined';
        case Types.ANY:
            return true;
        default:
            console.warn(`Unknown schema type check: ${expectedType}`);
            return false;
    }
}

function formatError(path, message) {
    const pathString = path.length > 0 ? path.join('.') : '<root>';
    return `${pathString}: ${message}`;
}

class SchemaBase {
    constructor(type = Types.ANY) {
        this._type = type;
        this._isRequired = true;
        this._isNullable = false;
        this._constraints = [];
        this._defaultValue = undefined;
        this._hasDefault = false;

        if (type !== Types.ANY && type !== Types.LITERAL && type !== Types.ENUM && type !== Types.NULL) {
            this._addConstraint((val, path, errors) => {
                if (val !== undefined && val !== null) {
                    if (!checkType(val, this._type)) {
                        const receivedType = Array.isArray(val) ? 'array' : typeof val;
                        const pathStr = formatError(path, '').split(':')[0];
                        if (!errors.some(e => e.startsWith(pathStr))) {
                            errors.push(formatError(path, `Expected type '${this._type}' but received ${receivedType}.`));
                        }
                    }
                } else if (val === null && (this._type === Types.OBJECT || this._type === Types.ARRAY)) {
                    const pathStr = formatError(path, '').split(':')[0];
                    if (!errors.some(e => e.startsWith(pathStr))) {
                        errors.push(formatError(path, `Expected type '${this._type}' but received null.`));
                    }
                }
            }, 'type');
        }
    }

    _addConstraint(checkFn, name = 'custom') {
        this._constraints.push({ name, check: checkFn });
    }

    optional() {
        this._isRequired = false;
        return this;
    }

    nullable() {
        this._isNullable = true;
        return this;
    }

    default(value) {
        this._defaultValue = value;
        this._hasDefault = true;
        this._isRequired = false;
        return this;
    }

    validate(value) {
        const errors = [];
        let processedValue = value;

        if (processedValue === undefined && this._hasDefault) {
            processedValue = (typeof this._defaultValue === 'object' && this._defaultValue !== null)
                ? (Array.isArray(this._defaultValue) ? [...this._defaultValue] : { ...this._defaultValue })
                : this._defaultValue;
        }

        this._validateRecursive(processedValue, [], errors);

        if (errors.length > 0) {
            return { success: false, errors: errors };
        } else {
            if (this instanceof ObjectSchema || this instanceof ArraySchema) {
                return this._finalizeData(processedValue, errors);
            }

            return { success: true, data: processedValue };
        }
    }

    _finalizeData(processedValue, errors) {
        if (errors.length > 0) {
            return { success: false, errors: errors };
        } else {
            return { success: true, data: processedValue };
        }
    }

    _validateRecursive(value, path, errors) {
        if (this._isRequired && value === undefined) {
            errors.push(formatError(path, 'Value is required but missing.'));
            return;
        }

        if (value === null) {
            if (this._isNullable || this._type === Types.NULL) {
                if (this._type === Types.NULL) {
                    for (const constraint of this._constraints) {
                        constraint.check(value, path, errors);
                    }
                }
                return;
            } else {
                errors.push(formatError(path, 'Value cannot be null.'));
                return;
            }
        }

        if (!this._isRequired && value === undefined) {
            return;
        }

        for (const constraint of this._constraints) {
            constraint.check(value, path, errors);
        }
    }
}

class StringSchema extends SchemaBase {
    constructor() { super(Types.STRING); }
    min(len, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.STRING) && val.length < len) { errors.push(formatError(path, message || `String length ${val.length} is less than minimum ${len}.`)); } }, 'min'); return this; }
    max(len, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.STRING) && val.length > len) { errors.push(formatError(path, message || `String length ${val.length} is greater than maximum ${len}.`)); } }, 'max'); return this; }
    length(len, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.STRING) && val.length !== len) { errors.push(formatError(path, message || `String length ${val.length} must be exactly ${len}.`)); } }, 'length'); return this; }
    pattern(regex, message) { if (!(regex instanceof RegExp)) throw new Error("pattern requires a RegExp object."); this._addConstraint((val, path, errors) => { if (checkType(val, Types.STRING) && !regex.test(val)) { errors.push(formatError(path, message || `String does not match pattern: ${regex}.`)); } }, 'pattern'); return this; }
}

class NumberSchema extends SchemaBase {
    constructor() { super(Types.NUMBER); }
    min(num, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.NUMBER) && val < num) { errors.push(formatError(path, message || `Number ${val} is less than minimum ${num}.`)); } }, 'min'); return this; }
    max(num, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.NUMBER) && val > num) { errors.push(formatError(path, message || `Number ${val} is greater than maximum ${num}.`)); } }, 'max'); return this; }
    integer(message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.NUMBER) && !Number.isInteger(val)) { errors.push(formatError(path, message || `Number ${val} must be an integer.`)); } }, 'integer'); return this; }
}

class BooleanSchema extends SchemaBase { constructor() { super(Types.BOOLEAN); } }

class NullSchema extends SchemaBase {
    constructor() {
        super(Types.NULL);
        this._constraints = []; this._addConstraint((val, path, errors) => {
            if (val !== null) {
                const receivedType = val === undefined ? 'undefined' : typeof val;
                errors.push(formatError(path, `Expected null but received type ${receivedType}.`));
            }
        }, 'type');
    }
    nullable() {
        console.warn("Calling .nullable() on Schema.null() has no effect.");
        return this;
    }
}

class LiteralSchema extends SchemaBase {
    constructor(literalValue) { super(Types.LITERAL); this._literalValue = literalValue; this._constraints = []; this._addConstraint((val, path, errors) => { if (val !== this._literalValue) { let valStr, litStr; try { valStr = JSON.stringify(val); } catch (e) { valStr = String(val); } try { litStr = JSON.stringify(this._literalValue); } catch (e) { litStr = String(this._literalValue); } errors.push(formatError(path, `Expected literal value ${litStr} but received ${valStr}.`)); } }, 'literal'); }
}

class EnumSchema extends SchemaBase {
    constructor(values) { super(Types.ENUM); if (!Array.isArray(values) || values.length === 0) { throw new Error("Enum requires a non-empty array of values."); } this._enumValues = values; this._constraints = []; this._addConstraint((val, path, errors) => { if (!this._enumValues.includes(val)) { let valStr, enumStr; try { valStr = JSON.stringify(val); } catch (e) { valStr = String(val); } try { enumStr = JSON.stringify(this._enumValues); } catch (e) { enumStr = String(this._enumValues); } errors.push(formatError(path, `Value ${valStr} is not one of the allowed enum values: ${enumStr}.`)); } }, 'enum'); }
}

class ArraySchema extends SchemaBase {
    constructor(itemSchema) {
        super(Types.ARRAY);
        if (!(itemSchema instanceof SchemaBase)) {
            throw new Error("ArraySchema requires a valid Schema instance for its items.");
        }
        this._itemSchema = itemSchema;
    }

    min(len, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.ARRAY) && val.length < len) { errors.push(formatError(path, message || `Array length ${val.length} is less than minimum ${len}.`)); } }, 'min'); return this; }
    max(len, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.ARRAY) && val.length > len) { errors.push(formatError(path, message || `Array length ${val.length} is greater than maximum ${len}.`)); } }, 'max'); return this; }
    length(len, message) { this._addConstraint((val, path, errors) => { if (checkType(val, Types.ARRAY) && val.length !== len) { errors.push(formatError(path, message || `Array length ${val.length} must be exactly ${len}.`)); } }, 'length'); return this; }

    _validateRecursive(value, path, errors) {
        super._validateRecursive(value, path, errors);

        const pathStr = formatError(path, '').split(':')[0];
        if (!errors.some(e => e.startsWith(pathStr)) && Array.isArray(value)) {
            value.forEach((item, index) => {
                const itemPath = [...path, index];
                this._itemSchema._validateRecursive(item, itemPath, errors);
            });
        }
    }

    _finalizeData(processedValue, errors) {
        if (errors.length > 0) {
            return { success: false, errors: errors };
        } else {
            return { success: true, data: processedValue };
        }
    }
}

class ObjectSchema extends SchemaBase {
    constructor(shape) {
        super(Types.OBJECT);
        if (!checkType(shape, Types.OBJECT) || shape instanceof SchemaBase) {
            throw new Error("ObjectSchema requires a shape object mapping keys to Schema instances.");
        }
        for (const key in shape) {
            if (Object.hasOwnProperty.call(shape, key) && !(shape[key] instanceof SchemaBase)) {
                throw new Error(`Invalid schema definition for key "${key}". Expected instance of Schema.`);
            }
        }
        this._shape = shape;
        this._isStrict = false;
    }

    strict(message) {
        this._isStrict = true;
        this._strictMessage = message;
        return this;
    }

    _validateRecursive(value, path, errors) {
        super._validateRecursive(value, path, errors);

        const pathStr = formatError(path, '').split(':')[0];
        if (!errors.some(e => e.startsWith(pathStr)) && checkType(value, Types.OBJECT)) {
            const shapeKeys = Object.keys(this._shape);
            const validatedKeys = new Set(shapeKeys); for (const key of shapeKeys) {
                const propSchema = this._shape[key];
                const propValue = value[key]; const propPath = [...path, key];

                let valueToValidate = propValue;
                if (propValue === undefined && propSchema._hasDefault) {
                    valueToValidate = propSchema._defaultValue;
                }

                propSchema._validateRecursive(valueToValidate, propPath, errors);
            }

            if (this._isStrict) {
                for (const key in value) {
                    if (Object.hasOwnProperty.call(value, key) && !validatedKeys.has(key)) {
                        errors.push(formatError([...path, key], this._strictMessage || `Unexpected property '${key}' found in strict mode.`));
                    }
                }
            }
        }
    }

    validate(value) {
        const errors = [];
        let processedValue = value; if (processedValue === undefined && this._hasDefault) {
            processedValue = (typeof this._defaultValue === 'object' && this._defaultValue !== null)
                ? (Array.isArray(this._defaultValue) ? [...this._defaultValue] : { ...this._defaultValue })
                : this._defaultValue;
        }

        this._validateRecursive(processedValue, [], errors);

        return this._finalizeData(processedValue, errors);
    }

    _finalizeData(originalInput, errors) {
        if (errors.length > 0) {
            return { success: false, errors: errors };
        }

        if (!checkType(originalInput, Types.OBJECT) && !(this._hasDefault && checkType(this._defaultValue, Types.OBJECT))) {
            return { success: true, data: originalInput };
        }

        let resultData = (originalInput === undefined && this._hasDefault)
            ? ((typeof this._defaultValue === 'object' && this._defaultValue !== null)
                ? (Array.isArray(this._defaultValue) ? [...this._defaultValue] : { ...this._defaultValue })
                : this._defaultValue)
            : { ...originalInput };

        if (!checkType(resultData, Types.OBJECT)) {
            if (originalInput === undefined || originalInput === null) {
                return { success: true, data: originalInput };
            }
            console.warn("ObjectSchema._finalizeData inconsistency: input not object but validation passed.");
            return { success: true, data: originalInput };
        }

        for (const key in this._shape) {
            if (Object.hasOwnProperty.call(this._shape, key)) {
                const propSchema = this._shape[key];
                const valueInResult = resultData[key];

                if (valueInResult === undefined && propSchema._hasDefault) {
                    resultData[key] = propSchema._defaultValue;
                }

            }
        }

        if (this._isStrict) {
            const finalStrictData = {};
            for (const key in this._shape) {
                if (Object.hasOwnProperty.call(this._shape, key) && resultData.hasOwnProperty(key)) {
                    finalStrictData[key] = resultData[key];
                } else if (Object.hasOwnProperty.call(this._shape, key) && this._shape[key]._hasDefault) {
                    finalStrictData[key] = this._shape[key]._defaultValue;
                }
            }
            resultData = finalStrictData;
        }

        return { success: true, data: resultData };
    }
}

const Schema = {
    string: () => new StringSchema(),
    number: () => new NumberSchema(),
    boolean: () => new BooleanSchema(),
    object: (shape) => new ObjectSchema(shape),
    array: (itemSchema) => new ArraySchema(itemSchema),
    literal: (value) => new LiteralSchema(value),
    enum: (values) => new EnumSchema(values),
    null: () => new NullSchema(),
    any: () => new SchemaBase(Types.ANY)
};

function runTests() {
    console.log("Running Schema Tests");
    let testsPassed = 0;
    let testsFailed = 0;

    function assert(description, condition, expectedErrors = []) {
        const result = condition(); let pass = false;
        if (!result || typeof result.success !== 'boolean') { console.error(`❌ FAILED: ${description} - Validation did not return expected result object.`); }
        else if (result.success === true && expectedErrors.length === 0) { pass = true; }
        else if (result.success === false && expectedErrors.length > 0) { const actualErrors = result.errors || []; const missingErrors = expectedErrors.filter(e => !actualErrors.includes(e)); const extraErrors = actualErrors.filter(e => !expectedErrors.includes(e)); if (missingErrors.length === 0 && extraErrors.length === 0) { pass = true; } else { console.error(`❌ FAILED: ${description}`); if (missingErrors.length > 0) console.error(`   Missing errors: ${JSON.stringify(missingErrors)}`); if (extraErrors.length > 0) console.error(`   Extra errors: ${JSON.stringify(extraErrors)}`); console.error(`   (Actual: ${JSON.stringify(actualErrors)})`); } }
        else if (result.success === true && expectedErrors.length > 0) { console.error(`❌ FAILED: ${description} - Expected errors ${JSON.stringify(expectedErrors)} but validation succeeded.`); }
        else if (result.success === false && expectedErrors.length === 0) { console.error(`❌ FAILED: ${description} - Expected success but validation failed with errors: ${JSON.stringify(result.errors)}`); }
        else { console.error(`❌ FAILED: ${description} - Unexpected validation result state.`); }
        if (pass) { console.log(`✅ PASSED: ${description}`); testsPassed++; } else { testsFailed++; }
    }
    function assertData(description, condition, expectedData) {
        const result = condition(); let pass = false;
        if (result && result.success === true) { const actualData = JSON.stringify(result.data); const expectData = JSON.stringify(expectedData); if (actualData === expectData) { pass = true; } else { console.error(`❌ FAILED: ${description} - Data mismatch.`); console.error(`   Expected: ${expectData}`); console.error(`   Actual:   ${actualData}`); } }
        else { console.error(`❌ FAILED: ${description} - Validation failed unexpectedly or invalid result.`); if (result && result.errors) console.error(`   Errors: ${JSON.stringify(result.errors)}`); }
        if (pass) { console.log(`✅ PASSED: ${description}`); testsPassed++; } else { testsFailed++; }
    }

    const nameSchema = Schema.string().min(3).max(10);
    assert("String: Valid", () => nameSchema.validate("Alice"));
    assert("String: Too short", () => nameSchema.validate("Al"), ["<root>: String length 2 is less than minimum 3."]);
    assert("String: Too long", () => nameSchema.validate("Bartholomew"), ["<root>: String length 11 is greater than maximum 10."]);
    assert("String: Wrong type (number)", () => nameSchema.validate(123), ["<root>: Expected type 'string' but received number."]);
    assert("String: Required (default)", () => nameSchema.validate(undefined), ["<root>: Value is required but missing."]); assert("String: Optional valid", () => nameSchema.optional().validate("Bob"));
    assert("String: Optional undefined", () => nameSchema.optional().validate(undefined));
    assert("String: Not nullable", () => nameSchema.validate(null), ["<root>: Value cannot be null."]);
    assert("String: Nullable null", () => Schema.string().nullable().validate(null));
    assert("String: Nullable valid string", () => Schema.string().nullable().validate("Valid"));
    assert("String: Nullable undefined", () => Schema.string().nullable().validate(undefined), ["<root>: Value is required but missing."]); assert("String: Optional Nullable undefined", () => Schema.string().optional().nullable().validate(undefined));
    assert("String: Optional Nullable null", () => Schema.string().optional().nullable().validate(null));
    assert("String: Pattern valid", () => Schema.string().pattern(/^\d{3}$/).validate("123"));
    assert("String: Pattern invalid", () => Schema.string().pattern(/^\d{3}$/).validate("abc"), ["<root>: String does not match pattern: /^\\d{3}$/."]);

    const ageSchema = Schema.number().min(0).max(120).integer();
    assert("Number: Valid", () => ageSchema.validate(30));
    assert("Number: Too low", () => ageSchema.validate(-1), ["<root>: Number -1 is less than minimum 0."]);
    assert("Number: Too high", () => ageSchema.validate(121), ["<root>: Number 121 is greater than maximum 120."]);
    assert("Number: Not integer", () => ageSchema.validate(30.5), ["<root>: Number 30.5 must be an integer."]);
    assert("Number: Wrong type (string)", () => ageSchema.validate("40"), ["<root>: Expected type 'number' but received string."]);

    const activeSchema = Schema.boolean();
    assert("Boolean: Valid true", () => activeSchema.validate(true));
    assert("Boolean: Valid false", () => activeSchema.validate(false));
    assert("Boolean: Wrong type (string)", () => activeSchema.validate("true"), ["<root>: Expected type 'boolean' but received string."]);

    const nullSchema = Schema.null();
    assert("Null: Valid", () => nullSchema.validate(null)); assert("Null: Invalid (string)", () => nullSchema.validate("a"), ["<root>: Expected null but received type string."]);
    assert("Null: Invalid (undefined)", () => nullSchema.validate(undefined), ["<root>: Value is required but missing."]); const literalSchema = Schema.literal("admin");
    assert("Literal: Valid", () => literalSchema.validate("admin"));
    assert("Literal: Invalid", () => literalSchema.validate("user"), ["<root>: Expected literal value \"admin\" but received \"user\"."]);
    const literalNumSchema = Schema.literal(10);
    assert("Literal Number: Valid", () => literalNumSchema.validate(10));
    assert("Literal Number: Invalid", () => literalNumSchema.validate(11), ["<root>: Expected literal value 10 but received 11."]);

    const enumSchema = Schema.enum(['admin', 'user', 1]);
    assert("Enum: Valid string", () => enumSchema.validate("user"));
    assert("Enum: Valid number", () => enumSchema.validate(1));
    assert("Enum: Invalid", () => enumSchema.validate("guest"), ["<root>: Value \"guest\" is not one of the allowed enum values: [\"admin\",\"user\",1]."]);

    const tagsSchema = Schema.array(Schema.string().min(2)).min(1).max(3);
    assert("Array: Valid", () => tagsSchema.validate(["tag1", "tag2"]));
    assert("Array: Too few items", () => tagsSchema.validate([]), ["<root>: Array length 0 is less than minimum 1."]);
    assert("Array: Too many items", () => tagsSchema.validate(["a", "b", "c", "d"]), ["<root>: Array length 4 is greater than maximum 3."]);
    assert("Array: Invalid item type", () => tagsSchema.validate(["tag1", 123]), ["1: Expected type 'string' but received number."]); assert("Array: Invalid item constraint", () => tagsSchema.validate(["tag1", "t"]), ["1: String length 1 is less than minimum 2."]); assert("Array: Wrong type (object)", () => tagsSchema.validate({}), ["<root>: Expected type 'array' but received object."]);

    const userSchema = Schema.object({
        name: Schema.string().min(2),
        age: Schema.number().min(0).optional(),
        email: Schema.string(), isActive: Schema.boolean().default(true),
        role: Schema.enum(['admin', 'user']).default('user')
    });

    const validUser = { name: "Alice", email: "a@b.com", age: 30 };
    const validUserDefault = { name: "Bob", email: "b@c.com" }; const invalidUserMissing = { age: 25 }; const invalidUserType = { name: "Charlie", email: 123 }; const invalidUserConstraint = { name: "D", email: "d@e.com" }; assert("Object: Valid", () => userSchema.validate(validUser));
    assertData("Object: Valid with defaults", () => userSchema.validate(validUserDefault), { name: 'Bob', email: 'b@c.com', isActive: true, role: 'user' });
    assert("Object: Missing required", () => userSchema.validate(invalidUserMissing), [
        "name: Value is required but missing.", "email: Value is required but missing."]);
    assert("Object: Invalid type", () => userSchema.validate(invalidUserType), ["email: Expected type 'string' but received number."]);
    assert("Object: Invalid constraint", () => userSchema.validate(invalidUserConstraint), ["name: String length 1 is less than minimum 2."]);
    assert("Object: Wrong root type", () => userSchema.validate("not an object"), ["<root>: Expected type 'object' but received string."]); assert("Object: Wrong root type Recheck", () => userSchema.validate("not an object"), ["<root>: Expected type 'object' but received string."]);

    const nestedStrictSchema = Schema.object({
        id: Schema.string(),
        config: Schema.object({
            retries: Schema.number().min(0).max(5),
            delay: Schema.number().optional()
        }).strict().default({ retries: 3 }),
        tags: Schema.array(Schema.string()).optional()
    }).strict();

    const validNested = { id: "abc", config: { retries: 4, delay: 100 } };
    const validNestedDefaults = { id: "def" };
    const invalidNestedStrictOuter = { id: "ghi", config: { retries: 1 }, extra: true };
    const invalidNestedStrictInner = { id: "jkl", config: { retries: 2, unknown: "bad" } };
    const invalidNestedConstraint = { id: "mno", config: { retries: 10 } };

    assert("Nested/Strict: Valid", () => nestedStrictSchema.validate(validNested));
    assertData("Nested/Strict: Valid with Defaults Data Check", () => nestedStrictSchema.validate(validNestedDefaults), { id: 'def', config: { retries: 3 } });
    assert("Nested/Strict: Extra outer", () => nestedStrictSchema.validate(invalidNestedStrictOuter), ["extra: Unexpected property 'extra' found in strict mode."]);
    assert("Nested/Strict: Extra inner", () => nestedStrictSchema.validate(invalidNestedStrictInner), ["config.unknown: Unexpected property 'unknown' found in strict mode."]);
    assert("Nested/Strict: Constraint fail", () => nestedStrictSchema.validate(invalidNestedConstraint), ["config.retries: Number 10 is greater than maximum 5."]);

    console.log("\nTest Summary");
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log("--------------------");

    return testsFailed === 0;
}

if (typeof window === 'undefined') {
    const success = runTests();
    process.exit(success ? 0 : 1);
} else {
    console.log("Schema loaded. Run runTests() manually in the console.");
}

export default {
    Schema,
    Types,
    runTests
}