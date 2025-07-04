--DELETE
-- defined in header
type Data = {[string]: any}
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local module = {}
local default: Data = {}
--ETELED
local lp = game:GetService("Players").LocalPlayer

-- Overwritten by generator
local store = "STORE_NAME"

module.STORAGE_OBJECT = lp:WaitForChild(store .. "Storage")

function module.getEntireModel(): Data 
    local data = {}
    for k in default do
        data[k] = module.STORAGE_OBJECT:GetAttribute(k)
    end
    return data :: Data
end

local StorageEvents = ReplicatedStorage:WaitForChild("StorageEvents") :: Folder

module.EVENT = StorageEvents:WaitForChild(store .. "Event")

--GETSET

