// @deno-types="npm:@types/lodash"
import _ from "npm:lodash";

export type AttributeType = "string" | "number" | "boolean" | "UDim" | "UDim2" | "BrickColor" | "Color3" | "Vector2" | "Vector3" | "CFrame" | "NumberSequence" | "ColorSequence" | "NumberRange" | "Rect" | "Font"
const attributeTypeSet = new Set(["string", "number", "boolean", "UDim", "UDim2", "BrickColor", "Color3", "Vector2", "Vector3", "CFrame", "NumberSequence", "ColorSequence", "NumberRange", "Rect", "Font"])
function isProperAttributeType(v: any): v is AttributeType {
    return typeof(v) === "string" && (
        attributeTypeSet.has(v) || (
            _.startsWith("string<") && 
            _.endsWith(">") && 
            v.substring("string<".length, v.length-1).split(" | ").length > 0
        )
    )
}
export type AnyModel = {
    type: AttributeType,
    description: string
}
export type Model = AnyModel & {
    default: string
}
export type ValidatableModel = Model & {
    validator: string[]
}
export type ComputedModel = AnyModel & {
    computed: {
        get: string,
        set?: {
            params: string[],
            logic: string[]
        }
    }
}
export type ComputedSetterModel = AnyModel & {
    computed: {
        get: string,
        set: {
            params: string[],
            logic: string[]
        }
    }
}
export function isAnyModel(m: unknown): m is AnyModel {
    return isProperAttributeType(_.get(m, "type")) && _.isString(_.get(m, "description"))
}
export function isDataModel(m: unknown): m is Model {
    return isAnyModel(m) && _.isString(_.get(m, "default"))
}
export function isComputedModel(m: unknown): m is ComputedModel {
    return isAnyModel(m) && _.isString(_.get(m, "computed.get"))
}
export function isComputedSetterModel(m: unknown): m is ComputedSetterModel {
    if (!isComputedModel(m)) return false
    let params = _.get(m.computed, "set.params")
    let logic = _.get(m.computed, "set.logic")
    return _.isArray(params) && _.every(params, _.isString) &&
        _.isArray(logic) && logic.length > 0 && _.every(logic, _.isString)
}
export function isValidatableModel(m: unknown): m is ValidatableModel {
    const validator = _.get(m, "validator")
    return isAnyModel(m) && _.isArray(validator) && _.every(validator, _.isString)
}
export type StorageType = "Immediate" | "Batched" | "Ephemeral" | "ClientOnly" | "ServerOnly"
const storageTypeSet = new Set<string>(["Immediate", "Batched", "Ephemeral", "ClientOnly", "ServerOnly"])
export type Data = {
    store: string,
    type: StorageType,
    model: {[key: string]: Model | ComputedModel | ValidatableModel | ComputedSetterModel},
}

export type ImportModel = {[key: string]: Data}
export function isValidImportModel(m: unknown): m is ImportModel {
    if (!_.isPlainObject(m)) {
        console.error("Model is not a plain object")
        return false
    }
    const mm = m as ImportModel
    return _.every(
        _.keys(mm).map(key => _.get(mm, key) as Data),
        (v: Data) => {
            if (!_.isString(_.get(v, "store"))) {
                console.error("store name is missing from model")
                return false
            }
            if (!storageTypeSet.has(_.get(v, "type", "ABSOLUTELYWILLNEVERBETRUE"))){
                console.error("imported model is not a valid type or type is missing")
                return false
            }
            const model = _.get(v, "model") as {[key: string]: unknown}
            if (!_.isPlainObject(model)) {
                console.error("data model missing from imported type")
                return false
            }
            const checker = _.every(_.keys(model).map(v => model[v]), v => isDataModel(v) || isComputedSetterModel(v) || isComputedModel(v))
            if (!checker) {
                console.error("One of the models in the imported type does not fit the interface")
            }
            return checker
        }
    )
}