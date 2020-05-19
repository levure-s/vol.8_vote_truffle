pragma solidity >=0.4.22 <0.6.0;

import "./ERC20_token.sol";

contract Vote is VRToken{
    struct Candidate {
        string name;
        address addr;
        string manifesto;
        uint voteCount;
    }
    enum Phase { Init, Regist, Vote, Result }
    Phase public phase = Phase.Init;
    address public owner;
    Candidate[] public candidates;
    Candidate public elected;
    mapping(address=>bool) registerd;
    mapping(address=>bool) voted;
    mapping(address=>bytes32) passhash;
    mapping(address=>bool) members;

    constructor() payable public {
        owner = msg.sender;
    }

    function changePhase(Phase _p) public {
        require(owner == msg.sender, "owner err.");
        require(phase < _p,"phase err.");
        phase = _p;
    }

    function deposit() payable public{
        require(phase == Phase.Regist, "phase err.");
        registMember(msg.sender);
    }

    function registMember(address _addr) public{
        members[_addr] = true;
    }

    function registCandidate(string memory _name, string memory _manifesto, bytes32 _passhex) public {
        require(phase == Phase.Regist, "phase err.");
        require(registerd[msg.sender] == false, "already regist err.");
        require(members[msg.sender] == true, "members err.");
        candidates.push(Candidate({name: _name, addr: msg.sender, manifesto: _manifesto, voteCount: 0}));
        passhash[msg.sender] = keccak256(abi.encode(_passhex));
        registerd[msg.sender] = true;
    }

    function sendToken(address recipient) public {
        transfer(recipient,1);
    }

    function getCandidatesCount() public view returns (uint) {
        return candidates.length;
    }

    function vote(address _addr) public {
        require(phase == Phase.Vote, "phase err.");
        require(balanceOfMe() != 0, "token err.");
        require(voted[msg.sender] == false, "already voted.");
        for(uint i = 0; i < candidates.length; i++) {
            if(candidates[i].addr == _addr) {
                candidates[i].voteCount ++;
                voted[msg.sender] = true;
                sendToken(owner);
                return;
            }
        }
    }

    function countVote() public {
        require(phase == Phase.Result, "phase err.");
        uint winCount = 0;
        for(uint i = 0; i < candidates.length; i++) {
            if(candidates[i].voteCount > winCount) {
                winCount = candidates[i].voteCount;
                elected = candidates[i];
            }
        }
    }

    function getElectedName() public view returns (string memory) {
        return elected.name;
    }

    function checkPoliticalFundsBalance() public view returns(uint) {
        return address(this).balance;
    }

    function withdrawPoliticalFunds() public {
        require(elected.addr == msg.sender, "withdraw only elected err.");
        msg.sender.transfer(address(this).balance);
    }

    function charge() payable public{}
}

