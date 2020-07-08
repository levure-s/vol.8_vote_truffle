// vote.js
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
app.use("/", express.static(__dirname + '/'));
app.get('/', (req, res) => { res.redirect("/"); });

const info = require("./deployed_info.js")

const web3 = new (require("web3"));
web3.setProvider(new web3.providers.HttpProvider("http://localhost:8545"));

// const conm = require('./vote_abi_bin.js');

// vote class
class votejs {

    // start
    async startVoteSystem() {
        var result = await this.initGanacheForTest();
        if(result == false) return;
        // await this.execDeploy();
        await this.connectSocket();

        http.listen(3000, () => {
            console.log('listen 3000');
        });
    }

    // initAccount (Special Process for Ganache) 
    async initGanacheForTest() {
        // Param for TEST
        this.accounts = await web3.eth.getAccounts();
        this.OWNER_ADDR = this.accounts[0];
        this.MAX_REGIST = 9;
        this.DEPOSIT_ETHER = 900 / 100;
        this.OUT_OF_ETHER = 98 / 100;
        this.registIndex = 1;
        this.Members = [];
        this.obj = await new web3.eth.Contract(info.Vote_abi,info.Vote_address);
        this.numVoters = 0;

        // adjust balance for TEST 
        // var balance1 = await web3.eth.getBalance(this.accounts[1]);
        // if(balance1 < 1000000000000000000) { // funds too low.
        //     console.log("startVoteSystem: ERR. please restart 'Ganache' and reTry.");
        //     return false;
        // }
        // var senderrflg = false;
        // for(var i = 0; i < this.accounts.length; i++) {
        //     var eth = web3.utils.toWei(this.OUT_OF_ETHER.toString(), 'ether');
        //     await web3.eth.sendTransaction({from:this.accounts[i], to:this.OWNER_ADDR, value:eth})
        //         .catch(() => { senderrflg = true; });
        //     this.Members[i] = this.accounts[i]
        // }
        // if(senderrflg) {
        //     console.log("startVoteSystem: send ERR. please restart 'Ganache' and reTry.");
        //     return false;
        // }
        return true;
    }

    // exec deploy
    // async execDeploy() {
    //     const Vote = new web3.eth.Contract(conm.abi);
    //     Vote.options.from = this.OWNER_ADDR;
    //     // var eth = web3.utils.toWei(this.DEPOSIT_ETHER.toString(), 'ether');
    //     this.obj = await Vote.deploy({data:conm.bin, arguments:[]}).send({gas:'5000000'});
    //     this.phase = 0;
    //     console.log("Contract deployed.");
    // }

    // connect socket.io
    async connectSocket() {
        // for Client
        io.sockets.on('connection', (socket) => {
            if(this.phase != 0) {
                this.noticeReloadError(socket);
                return;
            }
            console.log("connected " + socket.id);

            // on call_regist
            // socket.on('call_regist', (msg) => {
            //     this.execRegist(socket, JSON.parse(msg));
            // });

            // on call_vote
            socket.on('call_vote', (msg) => {
                this.execVote(socket, JSON.parse(msg));
            });

            // on call_withdraw
            socket.on('call_withdraw', (addr) => {
                this.execWithDraw(socket, addr);
            });

            // on call_info
            socket.on('call_info', () => {
                this.execGetContractInfo(socket);
            });

            // on call_votelist
            socket.on('call_votelist', () => {
                this.execGetVoteList();
            });

            // on call_ping
            socket.on('call_ping', () => {
                //console.log("ping!");
            });

            socket.on('call_tbalance', (addr) => {
                this.execGetTbalance(socket,addr);
            });

            socket.on("sendToken", (msg) => {
                this.sendToken(socket, JSON.parse(msg).from,JSON.parse(msg).to);
            });

            // set pong
            setInterval(() => {
                socket.emit('notice_pong');
            }, 10000);
        });

        // for Admin
        io.of('/admin').on('connection', (socket) => {
            console.log("admin connected " + socket.id);

            // socket.on('set_members',() =>{
            //     for(var i = 0; i < this.accounts.length; i++){
            //         this.obj.methods.registMember(this.Members[i]).send({from:this.OWNER_ADDR,, gas:'5000000'})
            //     }
            //     console.log("set members");
            // });

            // on admincall_change_phase
            socket.on('admin_change_phase', (msg) => {
                this.execChangePhase(socket, msg);
            });

            // on admin_count_vote
            socket.on('admin_count_vote', () => {
                this.execCountVote(socket);
            });

            // on admin_call_info
            socket.on('admin_call_info', () => {
                this.execGetContractInfo(socket);
            });

            socket.on('charge', (msg) => {
                this.charge(socket, msg);
            });

            socket.on("sendToken", (msg) => {
                this.sendToken(socket,this.OWNER_ADDR,msg);
                this.numVoters ++;
            });

        });
    }

    // notice reload error
    noticeReloadError(sock) {
        //console.log("connection error.");
        var j = { phase:'9', cAddr:'', cBalance:'0' };
        sock.emit('notice_info', JSON.stringify(j));
    }

    // exec vote
    execVote(sock, j) {
        // var passhex = web3.utils.toHex(j.password);
        var res = this.obj.methods.vote(j.voteaddr).send({from:j.myaddr, gas:'5000000'})
            .then((result) => {
                console.log("execVote: OK " + j.myaddr + "->" + j.voteaddr);
                sock.emit('notice_voted', j.voteaddr);
            }).catch((err) => {
                console.log("execVote: vote err " + err);
                sock.emit('notice_voted', "null");
            });
    }

    // exec withdraw
    execWithDraw(sock, addr) {
        this.obj.methods.withdrawPoliticalFunds().send({from:addr, gas:'5000000'})
            .then((result) => {
                console.log("execWithDraw: OK " + addr);
                sock.emit('notice_withdrawed', 'OK');
                io.sockets.emit('notice_withdrawed', 'OTHER');
            }).catch(() => {
                console.log("execWithDraw: NG " + addr);
                sock.emit('notice_withdrawed', 'NG');
            });
    }

    // exec get contract info
    async execGetContractInfo(sock) {
        this.phase = await this.obj.methods.phase().call();
        var cAddr = this.obj.options.address;
        var cBalance = await this.obj.methods.checkPoliticalFundsBalance().call();
        var cBalanceEther = web3.utils.fromWei(cBalance, 'ether');
        var j = {
            phase: this.phase,
            cAddr: cAddr,
            cBalance: cBalanceEther
        };
        sock.emit('notice_info', JSON.stringify(j));
    }

    // exec get vote list
    async execGetVoteList(sock) {
        var j = [];
        var cnt = await this.obj.methods.getCandidatesCount().call();
        var some = 0
        for(var i = 0; i < cnt; i++) {
            var obj = await this.obj.methods.candidates(i).call();
            var balance = await web3.eth.getBalance(obj.addr);
            var balanceEther = web3.utils.fromWei(balance, 'ether');
            j[i] = {
                addr: obj.addr,
                name: obj.name,
                manifesto: obj.manifesto,
                count: obj.voteCount,
                balance: balanceEther
            };
            some += parseInt(j[i].count,10)
        } 
        var turnout = some * 100  / this.numVoters
        io.sockets.emit('notice_votelist', JSON.stringify(j));
        io.of('/admin').emit('notice_turnout', parseInt(turnout,10));
    }

    // exec change phase
    async execChangePhase(sock, num) {
        var ret1 = await this.obj.methods.phase().call();
        if(num == ret1) return;

        await this.obj.methods.changePhase(num).send({from:this.OWNER_ADDR, gas:'5000000'})
            .catch(() => {
                console.log("execChangePhase: unknown err");
                return;
            });
        var ret2 = await this.obj.methods.phase().call();
        console.log("execChangePhase: OK " + ret1 + "->" + ret2);
        io.sockets.emit('notice_change_phase', ret2);
        sock.emit('notice_change_phase', ret2);
    }

    // exec count vote
    async execCountVote() {
        this.obj.methods.countVote().send({from:this.OWNER_ADDR, gas: '5000000'})
            .catch(() => {
                console.log("execCountVote: unknown err");
            });
        console.log("execCountVote: OK");
    }

    async execGetTbalance(sock,addr){
        var tbalance = await this.obj.methods.balanceOf(addr).call();
        sock.emit('notice_tbalance', tbalance);
    }

    async charge(sock,num){
        var eth = web3.utils.toWei(num.toString(), 'ether');
        await this.obj.methods.charge().send({from:this.OWNER_ADDR,value:eth, gas:'5000000'});
        console.log("charge" + num.toString() + "Ether");
        this.execGetContractInfo(sock)
    }

    async sendToken(sock,from,to){
        await this.obj.methods.sendToken(to).send({from:from, gas: '5000000'});
        console.log("sendToken: OK");
        sock.emit('notice_sendToken', to);
        io.sockets.emit('notice_transfer_token');
    }

}
var v = new votejs();
v.startVoteSystem();

