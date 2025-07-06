// @deno-types="npm:@types/lodash"
import _ from "npm:lodash";

export type AttributeType = "string" | "number" | "boolean" | "UDim" | "UDim2" | "BrickColor" | "Color3" | "Vector2" | "Vector3" | "CFrame" | "NumberSequence" | "ColorSequence" | "NumberRange" | "Rect" | "Font"
const attributeTypeSet = new Set(["string", "number", "boolean", "UDim", "UDim2", "BrickColor", "Color3", "Vector2", "Vector3", "CFrame", "NumberSequence", "ColorSequence", "NumberRange", "Rect", "Font"])
function isProperAttributeType(v: unknown): v is AttributeType {
    return typeof(v) === "string" && (
        attributeTypeSet.has(v) || (
            _.startsWith(v, "string<") && 
            _.endsWith(v, ">") && 
            v.substring("string<".length, v.length-1).split(" | ").length > 0
        )
    )
}
export type AnyModel = {
    type: string,
    description: string
}
export type DataModel = AnyModel & {
    default: string
}
export type ValidatableModel = DataModel & {
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
type Attributable = {
    type: AttributeType
}
export type AttributableDataModel = DataModel & Attributable
export type AttributableValidatableModel = ValidatableModel & Attributable
export type AttributableComputedModel = ComputedModel & Attributable
export type AttributableComputedSetterModel = ComputedSetterModel & Attributable

function isAttributable(m: unknown): m is Attributable {
    const t = _.get(m, "type")
    return isProperAttributeType(t)
}

export function isAnyModel(m: unknown): m is AnyModel {
    return _.isString(_.get(m, "type")) && _.isString(_.get(m, "description"))
}
export function isDataModel(m: unknown): m is DataModel {
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
    return isDataModel(m) && _.isArray(validator) && _.every(validator, _.isString)
}
export function isAttributableDataModel(m: unknown): m is AttributableDataModel {
    return isDataModel(m) && isAttributable(m)
}
export function isAttributableComputedModel(m: unknown): m is AttributableComputedModel {
    return isComputedModel(m) && isAttributable(m)
}
export function isAttributableComputedSetterModel(m: unknown): m is AttributableComputedSetterModel {
    return isComputedSetterModel(m) && isAttributable(m)
}
export type StorageType = "Immediate" | "Batched" | "Ephemeral" | "ClientOnly" | "ServerOnly"
const persistentSet = new Set<string>(["Immediate", "Batched", "Ephemeral"])
const boundariedSet = new Set<string>(["ClientOnly", "ServerOnly"])
const storageTypeSet = persistentSet.union(boundariedSet)

type SomeAnyModel = DataModel | ComputedModel | ValidatableModel | ComputedSetterModel
type SomeAttributableModel = AttributableDataModel | AttributableComputedModel | AttributableValidatableModel | AttributableComputedSetterModel
type SomeModel = SomeAnyModel | SomeAttributableModel

export type Data = {
    store: string,
    type: StorageType,
    model: {[key: string]: SomeModel},
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
            const store = _.get(v, "store")
            let retval = true
            if (!_.isString(store)) {
                console.error("store name is missing from model or is not a string")
                retval = false
            }
            if (!storageTypeSet.has(_.get(v, "type", "ABSOLUTELYWILLNEVERBETRUE"))){
                console.error("imported model is not a valid type or type is missing")
                retval = false
            }
            const model = _.get(v, "model") as {[key: string]: unknown}
            if (!_.isPlainObject(model)) {
                console.error("data model missing from imported type")
                return false
            }
            for (let modelKey of _.keys(model)) {
                const property = model[modelKey]
                let classification = ""
                if (isDataModel(property)) classification = "DataModel"
                if (isComputedSetterModel(property)) classification = "ComputedSetterModel"
                else if (isComputedModel(property)) classification = "ComputedModel"
                if (classification === "") {
                    console.error(`ERROR: Property ${modelKey} for model ${store} not formatted properly`)
                    retval = false
                }
                if (persistentSet.has(_.get(v, "type"))) {
                    if (!isAttributable(property)) {
                        console.error(`ERROR: Property ${modelKey} for model ${store}, type must be Attributable (i.e. a type that can be used with Instance:SetAttribute()) because the store is persistent`)
                        retval = false
                    }
                }
            }
            return retval
        }
    )
}

