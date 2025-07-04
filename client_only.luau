--DELETE
-- defined in header
type Data = {[string]: any}
type OptionalData = {[string]: any}
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local module = {}
local default: Data = {}
--ETELED

local HttpService = game:GetService("HttpService")
local data = default

type Prioritizable = {priority: number}
local function prioritizer(a: Prioritizable, b: Prioritizable): boolean
    return a.priority > b.priority
end

function module.getEntireModel(): Data
    return data
end

function module.setEntireModel(toValue: OptionalData)
--ENTIREMODELSETTER
end

--GETSET

