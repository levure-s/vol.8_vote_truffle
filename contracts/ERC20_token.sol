pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract VRToken is ERC20 {
    string public symbol;
    string public  name;

    constructor() public {
        symbol = "VRT";
        name = "Voting Rright Token";
        _mint(msg.sender, 5000);
        
        
    }

    function balanceOfMe() public view returns (uint) {
        return balanceOf(msg.sender);
    }
}