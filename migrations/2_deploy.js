const fs = require('fs');
var VRToken = artifacts.require("VRToken");
var Vote = artifacts.require("Vote");


module.exports = function(deployer, network, accounts) {
    var obj_VRToken
    var obj_Vote;
    deployer.deploy(VRToken).then((instance) => {
        obj_VRToken = instance;
        return deployer.deploy(Vote);
    }).then((instance) => {
        obj_Vote = instance;
        obj_Vote.phase = 0; 
        return obj_Vote.phase;
    }).then(() => {
        const outputfilename1 = "./deployed_info.js";
        var msg = "module.exports ={\r\n"; 
        msg += "deployed_network : '"+ network + "',\r\n";
        msg += "deploy_account : '" + accounts[0] + "',\r\n";
        msg += "VRToken_address : '" + obj_VRToken.address + "',\r\n"; 
        msg += "VRToken_abi : " + JSON.stringify(obj_VRToken.abi) + ",\r\n";
        msg += "Vote_address : '" + obj_Vote.address + "',\r\n"; 
        msg += "Vote_abi : " + JSON.stringify(obj_Vote.abi) + "\r\n";
        msg += "}"
        fs.writeFileSync(outputfilename1, msg);
    });
}
