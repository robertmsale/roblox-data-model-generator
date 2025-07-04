--DELETE
-- included upstream
local module = {}
function module.getStorageObject(forPlayer: Player) return Instance.new("ObjectValue") end
local KEY = ""
type TYPE = any
--ETELED

function module.getUPPERKEY(forPlayer: Player): TYPE
    return module.getStorageObject(forPlayer):GetAttribute("KEY") :: TYPE
end
function module.setUPPERKEY(forPlayer: Player, toValue: TYPE)
--VALIDATOR
    module.getStorageObject(forPlayer):SetAttribute("KEY", toValue)
end