// @deno-types="npm:@types/lodash"
import _ from "npm:lodash";
import {
    AttributeType,
    AnyModel,
    DataModel,
    ValidatableModel,
    ComputedModel,
    ComputedSetterModel,
    StorageType,
    Data,
    isComputedModel,
    isComputedSetterModel,
    isValidatableModel,
    isValidImportModel
} from "./types.ts"
import * as path from "jsr:@std/path"
const currentFilePath = path.fromFileUrl(import.meta.url)
const currentDir = path.dirname(currentFilePath)
const header = Deno.readTextFileSync(path.join(currentDir, "header.luau"))

function parseUnionType(input: string): string {
    if (_.startsWith(input, "string") && input.length > "string".length) {
        return input
            .substring("string<".length, input.length-1)
            .split(" | ")
            .map(v => `"${v}"`)
            .join(" | ")
    }
    return input
}

function parseHeader(model: Data): string {
    let modelHeader = header
    const keys = _.keys(model.model)
    const isComputed = (v: string) => isComputedModel(model.model[v]) ? true : false
    const dataBlock = _.compact(keys
        .map(v => isComputed(v) ? "" : `    ${v}: ${parseUnionType(model.model[v].type)}`))

    modelHeader = _.replace(modelHeader, "--DATABLOCK", dataBlock.join(",\n"))

    modelHeader = _.replace(modelHeader, "--OPTIONALDATABLOCK", dataBlock.map(v => `${v}?`).join(",\n"))

    modelHeader = _.replace(modelHeader, "--KEYSBLOCK", "export type Keys = " + _.compact(keys
        .map(v => isComputed(v) ? "" : `"${v}"`))
        .join(" | ")
    )

    modelHeader = _.replace(modelHeader, "--DEFAULTBLOCK", _.compact(keys
        .map(v => isComputed(v) ? "" : `    ${v} = ${(model.model[v] as DataModel).default}`))
        .join(",\n")
    )

    return modelHeader
}

function trimHeader(template: string): string {
    let lines = template.split("\n")
    const nextDelete = () => lines.findIndex(v => _.startsWith(v, "--DELETE"))
    const nextEteled = () => lines.findIndex(v => _.startsWith(v, "--ETELED"))
    for (let start = nextDelete(); start >= 0; start = nextDelete()) {
        const end = nextEteled()
        if (end < 0) break
        lines = lines.filter((_, i) => i < start || i > end)
    }
    return lines.join("\n")
}

function processIncludes(forTemplate: string): string {
    let lines = forTemplate.split("\n")
    const preamble = "--INCLUDE:"
    const next = () => _.findIndex(lines, v => _.startsWith(v, preamble))
    for (let i = next(); i !== -1; i = next()) {
        const fname = lines[i].substring(preamble.length).trim()
        const fcontent = processIncludes(trimHeader(Deno.readTextFileSync(path.join(currentDir,fname))))
        lines[i] = fcontent
    }
    return lines.join("\n")
}

function injectStoreName(intoTemplate: string, storeName: string): string {
    return _.replace(intoTemplate, `"STORE_NAME"`, `"${storeName}"`)
}

const serverImmediate = Deno.readTextFileSync(path.join(currentDir, "server_immediate.luau"))
const serverBatched = Deno.readTextFileSync(path.join(currentDir, "server_batched.luau"))
const serverEphemeral = Deno.readTextFileSync(path.join(currentDir, "server_ephemeral.luau"))
const serverGetSet = trimHeader(Deno.readTextFileSync(path.join(currentDir, "server_playergetset.luau")))
const clientPersistent = Deno.readTextFileSync(path.join(currentDir, "client_persistent.luau"))
const clientGetSet = trimHeader(Deno.readTextFileSync(path.join(currentDir, "client_persistentgetset.luau")))
const clientOnly = trimHeader(Deno.readTextFileSync(path.join(currentDir, "client_only.luau")))
const clientOnlyGetSet = trimHeader(Deno.readTextFileSync(path.join(currentDir, "client_onlygetset.luau")))
const computedGet = trimHeader(Deno.readTextFileSync(path.join(currentDir, "computed_get.luau")))
const computedSet = trimHeader(Deno.readTextFileSync(path.join(currentDir, "computed_set.luau")))

function injectGetSet(forTemplate: string, fromGetSetTemplate: string, model: Data): string {
    let funcs: string[] = []
    for (let key in model.model) {
        const m = model.model[key]
        let getset = isComputedModel(m) ? computedGet : fromGetSetTemplate
        if (isComputedSetterModel(m)) {
            getset = [getset, computedSet].join("\n")
        }
        const t = parseUnionType(m.type)
        const Key = _.upperFirst(key)
//      -- MATCHES: "UPPERKEY" "KEY" "TYPE"
        getset = _.replace(getset, /UPPERKEY/g, Key)
        getset = _.replace(getset, /KEY/g, key)
        getset = _.replace(getset, /TYPE/g, t)
        if (isComputedModel(m)) {
            getset = _.replace(getset, /--COMPUTED_GET/g, (m as ComputedModel).computed.get)
        }
        if (isComputedSetterModel(m)) {
            getset = _.replace(getset, /--\[\[PARAMS\]\]/g, m.computed.set.params.join(", "))
            getset = _.replace(getset, /--COMPUTED_SET/g, m.computed.set.logic.map(v => `    ${v}`).join("\n"))
        }
        getset = _.replace(getset, /--VALIDATOR/g, isValidatableModel(m) ? m.validator.map(v => `    ${v}`).join("\n") : "")
        funcs.push(getset)
    }
    let retval =  _.replace(forTemplate, "--GETSET", funcs.join("\n"))
    retval = _.replace(retval, /--ENTIREMODELGETTER/g, 
        _.compact(_.keys(model.model).map(v => 
            isComputedModel(model.model[v]) ? "" : `        ${v} = module.get${_.upperFirst(v)}()`
        )).join(",\n")
    )
    retval = _.replace(retval, /--ENTIREMODELSETTER/g,
        _.compact(_.keys(model.model).map(v => 
            isComputedModel(model.model[v]) ? "" : `    if toValue["${v}"] ~= nil then module.set${_.upperFirst(v)}(toValue["${v}"]) end`
        )).join("\n")
    )
    return retval
}

function removeBlankLines(fromTemplate: string): string {
    let lines = fromTemplate.split("\n")
    let deletable = new Set<number>()
    for (let start = 0; start < lines.length; ++start) {
        if (_.isEmpty(lines[start])) {
            for (let end = start + 1; end < lines.length && _.isEmpty(lines[end]); ++end) {
                deletable.add(end)
                start++
            }
        }
    }
    return lines
        .filter((_, i) => !deletable.has(i))
        .join("\n")
}

const helpText = `
Usage: 
    deno run -R -W generate.ts "<server folder>" "<client folder>" "<data store definition>.ts"
Example:
    deno run -R -W generate.ts "../src/server/models" "../src/server/client" "../stores.ts"

// EXAMPLE DATASTORE

export default {
    playerData: {
        store: "PlayerDataModel",
        type: "Immediate",
        model: {
            isUserModelMessedUp: {
                type: "boolean",
                default: "true",
                description: "Orientation of the player"
            }
        }
    }
}

// Please read types.ts to see how the data store module should be formatted


`
const helpArgs = new Set(["--help", "-h"])
let serverFolder = _.get(Deno.args, "[0]", "--help")
if (helpArgs.has(serverFolder)) {
    console.log(helpText)
    Deno.exit(0)
}
let clientFolder = _.get(Deno.args, "[1]")

const storeName = _.get(Deno.args, "[2]", "./stores.ts")
import(storeName)
    .then(module => {
        const dataTypes = _.get(module, _.keys(module)[0])
        if (!isValidImportModel(dataTypes)) {
            console.error("Data store file not valid")
            console.log(helpText)
            return
        }
        for (let key in dataTypes) {
            const pHeader = parseHeader(dataTypes[key])
            const dType = dataTypes[key]
            let serverCode: string = ""
            let clientCode: string = ""
            const serverTemplates = {
                Immediate: serverImmediate,
                Batched: serverBatched,
                Ephemeral: serverEphemeral
            }
            if (dType.type === "Immediate" || dType.type === "Batched" || dType.type === "Ephemeral") {
        
                serverCode = _.replace(pHeader, "--REST", processIncludes(trimHeader(serverTemplates[dType.type])))
                serverCode = injectStoreName(serverCode, dType.store)
                serverCode = injectGetSet(serverCode, serverGetSet, dType)
                serverCode += `\nreturn table.freeze(module)`
        
                clientCode = _.replace(pHeader, "--REST", processIncludes(trimHeader(clientPersistent)))
                clientCode = injectStoreName(clientCode, dType.store)
                clientCode = injectGetSet(clientCode, clientGetSet, dType)
                clientCode += `\nreturn table.freeze(module)`
            }
            if (dType.type === "ClientOnly") {
                clientCode = _.replace(pHeader, "--REST", trimHeader(clientOnly))
                clientCode = injectStoreName(clientCode, dType.store)
                clientCode = injectGetSet(clientCode, clientOnlyGetSet, dType)
                clientCode += `\nreturn module`
            }
            if (dType.type === "ServerOnly") {
                serverCode = _.replace(pHeader, "--REST", trimHeader(clientOnly))
                serverCode = injectStoreName(serverCode, dType.store)
                serverCode = injectGetSet(serverCode, clientOnlyGetSet, dType)
                serverCode += `\nreturn module`
            }
        
            const makeFile = (dir: string, code: string) => {
                const fileName = path.join(dir, `${_.upperFirst(key)}.luau`)
                try {
                    Deno.mkdirSync(dir, {recursive: true})
                } catch(e) {}
                Deno.writeTextFileSync(fileName, removeBlankLines(code))
            }
            if (!_.isEmpty(serverCode)) {
                makeFile(serverFolder, serverCode)
            }
            if (!_.isEmpty(clientCode)) {
                makeFile(clientFolder, clientCode)
            }
        }
    })


