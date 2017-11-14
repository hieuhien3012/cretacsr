/*************** Not configure **************/
const user = 'hien';
var main = require('../../main.js');
var app = main.app; 
var io = main.io;
var express = main.express; 
main.updateViews('views/'+user);
var mysql = require('mysql');
var db
var mqtt = require('mqtt')
var client
var error = require(main.PWD + '/route/black/errorLog.js');
var arr = [];
/********************************************/

/* ROUTE UPDATE WITH MAIN SERVER */
var configureRoute = function(){
    app.get('/hien/login', function (req, res) {
        res.render( "login");
    })

    app.get('/hien/manager',function(req,res){
        res.render( "manager" )
    })

    app.get('/hien/new_user',function(req,res){
        res.render( "new_user" )
    })
    
    app.get('/hien/table',function(req,res){
        res.render( "table" )
    })

    app.get('/hien/ruleSet',function(req,res){
        res.render("ruleSet")
    })
}

var configureDB_MQTT = function(){

    db = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "yoursolution",
      database: "mydb"
    });
    db.connect(function(err) {
        if (err) {error.errorlog('hien','Database not connect')};
        // error.errorlog('hien','Database: Connected')
        // db.query('SELECT sn FROM device',function(err,results){
        //     for (var i = 0; results[i] != undefined; i++) {
        //         client.subscribe('device/'+results[i].sn);
        //     }
        // });
    });

    client = mqtt.connect('tcp://iot.eclipse.org')
    client.on('connect', function (connack){
            // error.errorlog('hien','MQTT: Connected!')
            client.on('message',function(topic,message){
                error.errorlog('hien','MQTT topic: '+topic)
                error.errorlog('hien','MQTT message: ' +message.toString())
            });
        });
}

var configureSocket = function(){
    // try{
    //     setInterval(autoControl,1000);
    // } catch(err){error.errorlog( '[Control] '+err)}
    io.on('connection', function(socket){
        // error.errorlog('hien','A user connected');

        //Insert a new customer
        socket.on('insert',function(data){
            error.errorlog('hien','[Insert data] '+data)

            var values1 = [
                [data.id,data.name,data.device,data.date,data.phone,data.addr]
            ]
            db.query("INSERT INTO test (id,name,device,date,phone,addr) VALUES ?",[values1],function(err,results){
                if(err) throw err;
            })

            var values2 = [
                [data.device]
            ]
            db.query("INSERT INTO devtest (device) VALUES ?",[values2],function(err,results){
                if(err) throw err;
            })
        })

        //Search for a Customer's Info
        socket.on('search',function(data){
            var i
            db.query("SELECT device FROM " + mysql.escape(data.db) + " WHERE id =" + mysql.escape(data.id),function(err,results){
                if (err) throw err;
                for(i=0;results[i] != undefined;i++){
                    client.publish('server/' + results[i].device, '{"user":"admin","func":"6","addr":"2","year":"0","mon":"0","day":"0","hour":"0","min":"0","data":"100"}')
                    client.publish('server/' + results[i].device, '{"user":"admin","func":"1","addr":"2","year":"0","mon":"0","day":"0","hour":"0","min":"0","data":"100"}')	
                }
            });
            socket.emit('subscribing',{id:data,count:i})
        });

        socket.on('checkListUsing', function(data){
            db.query('SELECT * FROM customer WHERE id = '+mysql.escape(data.user),function(err,results){
                for (var i = 0; results[i] != undefined; i++) {
                    socket.emit('listUsing',{name:results[i].name,sn:results[i].sn,user:results[i].user,ipwan:results[i].ipwan,iplan:results[i].iplan,status:results[i].status,connection:results[i].connection,keep:results[i].keep})
                }
            })
        })

        //Set Rules
        socket.on('ruleSet',function(data){
            console.log('data ',data)
            error.errorlog('hien','[Data] ',data.toString())
            var device = data.device
            var sensor = data.sensor
            var timeSet = data.timeSet;
            var senSet = data.senSet;

            var values = [[JSON.stringify({device:device,sensor:sensor,timeSet:timeSet,senSet:senSet})]];
            db.query('INSERT INTO array (info) VALUES ?',[values],function(err,results){
                if(err) {error.errorlog('hien','[ruleSet 2] '+err)}; 
            })

            if(sensor == ""){
                arrPush(data);
            }
        })

        socket.on('control',function(data){
            client.publish('server/'+data.device,'{"user":"admin","func":"2","addr":"'+data.relay+'","year":"0","mon":"0","day":"0","hour":"0","min":"0","data":"'+data.data+'"}')
        });

        // Get/Delete Rules
        socket.on('getRule',function(data){
            db.query("SELECT * FROM array",function(err,results){
                for (var i = 0; i < results.length; i++) {
                    info = JSON.parse(results[i].info)
                    if (info.device == data) {
                        socket.emit('rules',{info:info,count:i})
                    }
                }
            })
        })

        socket.on('deleteRule',function(data){
                var i = parseInt(data.count)
                arr.splice(i,1);
                db.query("DELETE FROM array WHERE info = "+mysql.escape(data.info),function(err,results){
                    if (err) {error.errorlog('hien',err)}
                })
        })

        socket.on('array',function(data){
            socket.emit('button',arr)
        })

        var i =0
        setInterval(function(){
            socket.emit('button',i)
            i++
        },1000)
        //Whenever someone disconnects this piece of code executed
        socket.on('disconnect', function () {
            // error.errorlog('hien','A user disconnected');
        });
      
    });
}

var autoControl = function(){
    var b = [];
    db.query('SELECT * FROM array',function(err,results){
        if(err){error.errorlog('hien','[Query arr] ' +err)}
        for (var i = 0; i < results.length; i++) {
            var data = JSON.parse(results[i].info)
            if(data.sensor == ""){
                arrPush(data)
            }
        }
        error.errorlog('hien','[Arr push] '+arr);
    })

    setInterval(function(){
        var date = new Date();
        for (var i = 0; i < arr.length; i++) {
            json = JSON.parse(arr[i])
            device = json.device
            sensor = json.sensor
            if (device != null && sensor == "" ) {
                timeSet = json.timeSet.split('-')
                senSet = json.senSet.split('-')
                begin = parseInt(timeSet[0],10)*60 + parseInt(timeSet[1])
                end = parseInt(timeSet[2],10)*60 + parseInt(timeSet[3])
                sysTime = date.getHours()*60+date.getMinutes()
                val = timeSet[4]
                if(sysTime >= begin && sysTime < end){
                    if(b[i] != '1'){
                        var val = JSON.parse(arr[i]).timeSet.split('-')[4]
                        var data = {user:"App",func:"2",addr:"1",year:"0",mon:"0",day:"0",hour:"0",min:"0",data:'300'}
                        data = JSON.stringify(data)
                        client.publish('server/' + device, data)
                        b[i] = '1';
                    }
                }else if(sysTime>=end){
                    if (b[i] != '0'){
                        var val = JSON.parse(arr[i]).timeSet.split('-')[4]
                        if (val == '100'){
                            val = '0';
                        }else{
                            val = '100'
                        }
                        var data = {user:"App",func:"2",addr:"1",year:"0",mon:"0",day:"0",hour:"0",min:"0",data:'900'}
                        data = JSON.stringify(data)
                        client.publish('server/' + device, data)
                        b[i] = '0'
                    }
                }else{
                    b[i]='0'
                }
            }
        }
    },1000);
}



/* IF YOU WANT DEVEL ANOTHER ROUTE-STATIC FILE */
var configurePublic = function(){
 //   app.use('/static/' + user, express.static(main.PWD + '/public/' + user));
}

// Zero-int
function zero(i){
    var str;
    if(i.toString().length == 1){
        str = '0'+ i.toString();
    }else{
        str = i.toString()
    }
    return str;
}

// Push array
function arrPush(js){
    var timeSet = js.timeSet.split('-')
    var time = parseInt(timeSet[0],'10')*60 + parseInt(timeSet[1])+parseInt(timeSet[3])
    var hh = zero(Math.floor(time/60));
    var mm = zero(time%60)
    val = timeSet[2]
    timeS = timeSet[0]+'-'+timeSet[1]+'-'+ hh.toString() +'-'+ mm.toString() +'-'+val
    json = {device:js.device,sensor:js.sensor,timeSet:timeS,senSet:js.senSet};
    arr.push(JSON.stringify(json));
    error.errorlog('hien','[Arr push] '+arr);

}

exports.start = function(){
    configurePublic();
    configureRoute();
    configureSocket();
    configureDB_MQTT();
    autoControl();
}