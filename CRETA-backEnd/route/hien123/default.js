/*************** Not configure **************/
const user = 'hien123';
var main = require('../../main.js');
var app = main.app;
var io = main.io;
var express = main.express;
main.updateViews('views/' + user);
var mysql = require('mysql');
var db
var mqtt = require('mqtt')
var tcp, ws
var error = require(main.PWD + '/route/black/errorLog.js');
var tCtrl = [], tScanInterval;
var check = [];
var devStatus = {};
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var events = require('events');
var eEmit = new events.EventEmitter()
var _ = require('lodash');
var ruleList = 'sRules';
var history = 'sHistory';
var listDev = 'listDevice';
/********************************************/

/* ROUTE UPDATE WITH MAIN SERVER */
var configureRoute = function () {
    app.post('/hien123/setRules', urlencodedParser, function (req, res) {
        var data = req.body.data
        var OKAY = function () {
            res.send('{"status":"OK"}')
        }
        var ERROR = function () {
            res.send('{"status":"ERROR"}')
        }
        data = JSON.parse(data)
        console.log("setRules:"+ data)
        uptCtrl();
        setRules(data, OKAY, ERROR);
    })

    app.post('/hien123/getHistory', urlencodedParser, function (req, res) {
        var data = req.body.data;
        data = JSON.parse(data)
        console.log("History: "+data)
        var history = function (info) {
            var list = info;
            res.send({DATA:list})
        }
        json = getHistory(data, history)
    })

    app.post('/hien123/getRules', urlencodedParser, function (req, res) {
        var data = req.body.data
        var data = JSON.parse(data)
        var rules = function (info) {
            var list = info
            res.send({DATA:list});
        }
        json = getRules(data, rules)
    })

    app.get('/hien123/tuan', urlencodedParser, function (req, res) {
        console.log('content: ' + req.query.p)
        res.send('hello em')
    })

}

var configureDB_MQTT = function () {

    var x = 0;
    var devArr = [];
    tcp = mqtt.connect('tcp://cretacam.ddns.net', { port: 1889 })
    ws = mqtt.connect('ws://cretacam.ddns.net', { port: 1883 });
    tcp.on('connect', function (connack) {
        console.log('MQTT-TCP CONNECTED!')
        tcp.subscribe('topicTest');
        x++;
    });
    ws.on('connect', function (connack) {
        console.log('MQTT-WS CONNECTED!')
        x++;
    });
    db = mysql.createConnection({
        host: "192.168.1.198",
        user: "creta",
        password: "yoursolution",
        database: "mydb"
    });
    db.connect(function (err) {
        if (err) throw (err);
        x++;
    });

    function conCheck() {
        if (x == 3) {
            db.query("SELECT SN FROM " + listDev, function (err, results) {
                if (err) throw (err);
                for (var i = 0; i < results.length; i++) {
                    var sn = results[i].SN;
                    devArr.push(sn)
                    tcp.subscribe(devArr[i] + '/slave');
                    ws.subscribe(devArr[i] + '/master')
                }
            })
            clearInterval(interval)
        }
    }
    var interval = setInterval(conCheck, 50)

    tcp.on('message', function (topic, msg) {
        // console.log("TCP: " + msg.toString())
        if (topic.toString() == 'topicTest') {
            db.query("SELECT * FROM " + listDev + " WHERE SN = " + mysql.escape(msg), function (err, results) {
                if (err) throw (err);
                if (results[0] == null) {
                    values = [
                        [msg]
                    ]
                    db.query("INSERT INTO " + listDev + " (SN) VALUES ?", [values], function (err, results) {
                        if (err) throw (err);
                    })
                    tcp.subscribe(msg + '/slave')
                    ws.subscribe(msg + '/master')
                }
            })
        } else {
            var json = JSON.parse(msg)
            //Update History
            var date = new Date();
            var values = [
                [date, json.USER, msg.toString()]
            ]
            db.query("INSERT INTO " + history + " (TIME,SN,COMMAND) VALUES ?", [values], function (err, results) {
                if (err) throw (err);
            })

            //Send Info to App
            var wsTopic = 'ESP' + topic.split('CSR')[1]
            var id = wsTopic.split('/slave')[0]
            var A = json.ADDR.split("")
            var fu, ad, da

            switch (json.FUNC) {
                case "001": fu = "Ctrl"
                    break;
                case "002": fu = "Data"
                    break;
                case "003": fu = "Error"
                    break;
                default: fu = ""
            }

            // switch (A[0]+A[1]) {
            //     case "01":
            //         ad = "1"
            //         switch (msg.DATA) {
            //             case "1":
            //                 da = "On"
            //                 break;
            //             case "0":
            //                 da = "Off"
            //                 break;
            //             default:
            //                 break;
            //         }
            //         break;
            //     case "02":
            //         ad = "2"
            //         break;
            //     case "03":
            //         ad = "3"
            //         break;
            //     case "04":
            //         ad = "4"
            //         switch (msg.DATA) {
            //             case "1":
            //                 da = "HIGH"
            //                 break;
            //             case "0":
            //                 da = "LOW"
            //                 break;
            //             default:
            //                 break;
            //         }
            //         break;
            //     default:
            //         ad = ""
            //         break;
            // }

            json.ADDR == "0101" ? ad = "1" :
                json.ADDR == "0102" ? ad = "2" :
                    json.ADDR == "0201" ? ad = "4" :
                        json.ADDR == "0401" ? ad = "3" :
                            ad = ""

            if (A[0] + A[1] == "01") {
                json.DATA == '1' ? da = "On" :
                    json.DATA == '0' ? da = "Off" :
                        da = ""
            } else if (A[0] + A[1] == "04") {
                json.DATA == '1' ? da = "Upper" :
                    json.DATA == '0' ? da = "Lower" :
                        da = ""
            } else {
                da = json.DATA
            }

            var js = { ID: id, FUNC: fu, ADDR: ad, DATA: da }
            js = JSON.stringify(js)
            ws.publish(wsTopic, js)
        }
    })
    ws.on('message', function (topic, msg) {

        // console.log("WS: " + msg.toString())
        msg = JSON.parse(msg)
        var tcpTopic = "CSR" + topic.split("ESP")[1]
        var user = tcpTopic.split("/master")[0]

        var fu, ad, da

        switch (msg.FUNC) {
            case "Ctrl": fu = "001"
                break;
            case "Data": fu = "002"
                break;
            case "Error": fu = "003"
                break;
            default: fu = ""
        }

        msg.ADDR == "1" ? ad = "0101" :
            msg.ADDR == "2" ? ad = "0102" :
                msg.ADDR == "3" ? ad = "0201" :
                    msg.ADDR == "4" ? ad = "0401" :
                        ad = ""

        if (msg.DATA == "On" || msg.DATA == "HIGH") {
            da = "1"
        } else if (msg.DATA == "Off" || msg.DATA == "LOW") {
            da = "0"
        } else {
            da = msg.DATA
        }

        var js = { USER: user, FUNC: fu, ADDR: ad, DATA: da }
        js = JSON.stringify(js)
        tcp.publish(tcpTopic, js);
    });
}

var i = 0;
var configureSocket = function () {
    io.on('connection', function (socket) {

        var infoRules = function (data) {
            socket.emit('iR', data)
        }

        socket.on('manager', function (frame) {
            var func = frame.func;
            var data = frame.data; asdfasd
            var json;

            if (func == 'sR') {       // Func: setRules
                console.log('setRules')
                setRules(data)
            }
            else if (func == 'gR') {  // Func: getRules
                console.log('getRules')
                json = getRules(data, infoRules)
            }
            else if (func == 'dR') {  // Func: deleteRules
                console.log('deleteRules')
                deleteRules(data)
            }
            else if (func == 'cD') {
                console.log('ctrlDev')
                ctrlDev(data)
            }
        })

        //Whenever someone disconnects this piece of code executed
        socket.on('disconnect', function () {
            // error.errorlog('hien','A user disconnected');
        });

    });
}

/* IF YOU WANT DEVEL ANOTHER ROUTE-STATIC FILE */
var configurePublic = function () {
    //   app.use('/static/' + user, express.static(main.PWD + '/public/' + user));
}

//Time control
var timeControl = function () {
    uptCtrl();
    // uptCheck();
    setInterval(uptCtrl, 1800000)
    setInterval(tScan, 500)
}

//Set Rules;
function setRules(data, OKAY, ERROR) {
    db.query('DELETE FROM ' + ruleList + ' WHERE ADDR = '+mysql.escape(data.ADDR), function (err, result) {
        if (err) throw (err)
    })
    var mac = "CSR"+data.MACID;
    var acc = data.ACC;
    var addr = data.ADDR;
    var begin = JSON.stringify(data.BEGIN);
    var mode = JSON.stringify(data.MODE);
    var state = data.STATE;
    var time = JSON.stringify(data.TIME)
    var du = JSON.stringify(data.DU)
    var values = [
        [mac, acc, addr, begin, mode, state, time, du]
    ]
    var addRules = function (val) {
        console.log('adding Rules')
        db.query('INSERT INTO ' + ruleList + ' (MACID,ACC,ADDR,BEGIN,MODE,STATE,TIME,DU) VALUES ?', [val], function (err, result) {
            if (err) {
                ERROR();
                throw (err)
            };
            OKAY();
            uptCtrl();
        })
    }
    db.query('SELECT * FROM ' + ruleList + ' WHERE MACID = ' + mysql.escape(data.MACID), function (err, results) {
        if (err) throw (err)
        var findValue = -1
        findValue = _.findIndex(results, function (value) {
            return value.MACID == data.MACID
                && value.ACC == data.ACC
                && value.ADDR == data.ADDR
                && value.BEGIN == data.BEGIN
                && value.MODE == data.MODE
                && value.STATE == data.STATE
                && value.TIME == data.TIME
                && value.DU == data.DU
        })
        if (findValue == -1) {
            addRules(values);
        } else {
            ERROR();
        }
    })
}

// Get Rules
function getRules(data, callback) {
    var list = [];
    data.MACID = "CSR"+data.MACID
    console.log("getRules: "+data.MACID)
    db.query("SELECT * FROM " + ruleList + " WHERE MACID =" + mysql.escape(data.MACID), function (err, results) {
        for (var i = 0; i < results.length; i++) {
            var info = results[i];
            var json = {}
            for (var j in info) {
                json[j] = info[j]
            }
            list.push(json);
        }
        callback(list);            
    })
}

// Get History
function getHistory(data, callback) {
    var list = [];
    db.query("SELECT * FROM " + history + " WHERE SN =" + mysql.escape(data.MACID), function (err, results) {
        for (var i = 0; i < results.length; i++) {
            var info = results[i];
            var json = { TIME: info.TIME, MACID: info.SN, COMMAND: info.COMMAND };
            list.push(json);
        }
        callback(list);
    })

}

//Delete rules
function deleteRules(data) {
    var sn = data.sn
    var json = timing(data)
    var timeSet = json.timeSet
    db.query("SELECT * FROM " + ruleList + " WHERE sn =" + mysql.escape(data.sn), function (err, results) {
        if (err) { error.errorlog('hien', err) }
    })
    for (var i = 0; i < arr[sn].length; i++) {
        if (arr[sn][i].timeSet == timeSet) {
            arr[sn].splice(i, 1);
        }
    }
}

//UPDATE TIME CONTROL ARRAY
function uptCtrl() {
    tCtrl = []
    db.query('SELECT * FROM ' + ruleList, function (err, results) { //Query timeRules
        if (err) throw (err)
        var i
        for (i = 0; i < results.length; i++) {
            var re = results[i]
            var BEG = JSON.parse(re.BEGIN)
            var MOD = JSON.parse(re.MODE)
            var TI = JSON.parse(re.TIME)
            var DU = JSON.parse(re.DU)
            var ru = {
                MACID: re.MACID, ACC: re.ACC, ADDR: re.ADDR, MODE: MOD.KIND, bDAY: "", bTIME: "",
                STATE: re.STATE, eTIME: "", REP: ""
            }

            // "X" DAYS MODE
            if (MOD.KIND == '1') {
                ru.bDAY = new Date(BEG.YEAR, BEG.MONTH - 1, BEG.DATE)
                ru.bDAY = ru.bDAY.getTime()
                ru.bTIME = (parseInt(TI.HOUR) * 60 + parseInt(TI.MINUTES)) * 60000
                ru.eTIME = ru.bTIME + (parseInt(DU.HOUR) * 60 + parseInt(DU.MINUTES)) * 60000
                ru.REP = parseInt(MOD.DATA) * 24 * 60 * 60 * 1000
            }
            tCtrl.push(ru)
        }
        console.log(tCtrl)
    })
}

//TIME SCAN
function tScan() {

    var date = new Date();
    var today = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate())
    today = today.getTime()
    var now = (date.getHours() * 60 + date.getMinutes()) * 60000
    for (var i = 0; i < tCtrl.length; i++) {
        var ru = tCtrl[i]
        var js = { USER: ru.MACID, FUNC: "001", ADDR: "01" + zero(ru.ADDR), DATA: ru.STATE }
        var topic = js.USER + "/master"
        switch (ru.STATE) {
            case "100":
                js.DATA = "1"
                break;
        }
        //Check Mode
        switch (ru.MODE) {
            case "1":
                if ((today - ru.bDAY) % ru.REP == 0 || ru.REP == 0) {
                    tCompare();
                }
                break;
            case "2":

                break;
        }
        
        // Time compare
        function tCompare() {
            if (now < ru.bTIME) {
                check[i] = 0;
            }
            if (now >= ru.bTIME && now < ru.eTIME && check[i] != 1) {
                console.log("TI_CONTROL 1: " + topic, JSON.stringify(js))
                tcp.publish(topic, JSON.stringify(js))
                check[i] = 1
            }
            if (now >= ru.eTIME && check[i] != 2) {
                if (js.DATA == '1') {
                    js.DATA = '0'
                } else { js.DATA = '1' }
                console.log("TI_CONTROL 2: " + topic, JSON.stringify(js))
                tcp.publish(topic, JSON.stringify(js))
                check[i] = 2
            }
        }
    }
}

// Zero-int
function zero(i) {
    if (i.toString().length == 1) {
        str = '0' + i.toString();
    } else {
        str = i.toString()
    }
    return str;
}

exports.start = function () {
    configurePublic();
    configureRoute();
    configureSocket();
    configureDB_MQTT();
    timeControl();
}
