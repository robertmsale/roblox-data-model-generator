--DELETE
-- defined in header
type Data = {[string]: any}
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local module = {}
local default: Data = {}
--ETELED

-- Overwritten by generator
local store = "STORE_NAME"

function module.getStorageObject(forPlayer: Player): ObjectValue
    local obj = forPlayer:FindFirstChild(store .. "Storage") :: ObjectValue
    if obj == nil then
        obj = Instance.new("ObjectValue")
        obj.Name = store .. "Storage"
        obj.Parent = forPlayer
    end
    return obj
end

function module.getEntireModel(forPlayer: Player): Data 
    local data = {}
    local obj = module.getStorageObject(forPlayer)
    for k in default do
        data[k] = obj:GetAttribute(k)
    end
    return data :: Data
end