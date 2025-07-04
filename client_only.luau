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

function module.getEntireModel(): Data
    return data
end

function module.setEntireModel(toValue: OptionalData)
--ENTIREMODELSETTER
end

--GETSET

